// SPDX-License-Identifier: MIT
// Ranger Symphony: wires the composer, the orchestra and the stage to the page.
// URL: symphony.html?mood=flyby&seed=123, symphony.html?piece=danube or
// symphony.html?work=bach-air&arr=piano

import { SymphonyComposer, MOODS, MOOD_IDS, CLASSICS } from './composer.js';
import { CLASSIC_BY_ID } from './classics.js';
import { Orchestra, SampleBank, SYMPHONY_SOURCES } from './orchestra.js';
import { COMPOSERS, ARRANGEMENTS, WORKS, WORK_BY_ID, arrangeWork, scoreUrl } from './repertoire.js';
import { MidiScore } from './score.js';
import { Stage } from './stage.js';
import { encodeWav, download } from '../recorder.js';
import { randomSeed } from '../rng.js';

const $ = (id) => document.getElementById(id);
const SECTIONS = [
  ['strings', 'STRINGS'],
  ['winds', 'WOODWINDS'],
  ['brass', 'BRASS'],
  ['perc', 'PERCUSSION'],
  ['harp', 'HARP & BELLS'],
  ['piano', 'PIANO'],
];
const SECTION_LABEL = { intro: 'INTRODUCTION', A1: 'THEME', A2: 'THEME · FULL STRINGS', B: 'BRIDGE', A3: 'CLIMAX', coda: 'FINALE', rest: '…', score: 'SCORE' };

const params = new URLSearchParams(location.search);
const startWork = WORK_BY_ID[params.get('work')] || null;
// The old classics (arranged phrase by phrase) sit under a composer too.
const CLASSIC_COMPOSER = { ode: 'beethoven' };
const state = {
  work: startWork ? startWork.id : null,
  arr: startWork && startWork.arr.includes(params.get('arr')) ? params.get('arr') : startWork ? startWork.arr[0] : null,
  composer: startWork ? startWork.composer : CLASSIC_BY_ID[params.get('piece')] ? CLASSIC_COMPOSER[params.get('piece')] || 'more' : 'bach',
  mood: MOODS[params.get('mood')] ? params.get('mood') : 'flyby',
  piece: CLASSIC_BY_ID[params.get('piece')] ? params.get('piece') : null,
  seed: Number(params.get('seed')) || randomSeed(),
  tempo: 1,
  intensity: 0.6,
  auto: true,
  hallSize: 0.55,
  hallMix: 0.5,
  volume: 0.9,
  sections: Object.fromEntries(SECTIONS.map(([k]) => [k, { level: 1, muted: false }])),
  midi: null, // { buffer, name }
};

const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
const bank = new SampleBank();
const orch = new Orchestra(ctx, bank);
const stage = new Stage($('stage'));
orch.onNote((ev, t, dur) => stage.note(ev, t, dur));

let source = null; // composer or MIDI score
const scoreCache = new Map(); // work id -> MIDI bytes

async function fetchScore(work) {
  if (!scoreCache.has(work.id)) scoreCache.set(work.id, await (await fetch(scoreUrl(work))).arrayBuffer());
  return scoreCache.get(work.id);
}
let playing = false;
let timer = null;
let nextTime = 0;
let infoQueue = [];
let shown = null;
let beatClock = { t: 0, spb: 0.5 };

function avail() {
  return Object.fromEntries(SECTIONS.map(([k]) => [k, !state.sections[k].muted && state.sections[k].level > 0.01]));
}

function makeSource(fresh = false) {
  if (state.work && scoreCache.has(state.work)) {
    const w = WORK_BY_ID[state.work];
    const s = new MidiScore(scoreCache.get(w.id), w.name, { arrange: (score) => arrangeWork(score, w, state.arr), bpm: w.bpm, title: w.name, label: ARRANGEMENTS[state.arr].name });
    s.tempo = state.tempo;
    s.intensity = state.intensity;
    return s;
  }
  if (state.midi) {
    const s = new MidiScore(state.midi.buffer, state.midi.name);
    s.tempo = state.tempo;
    s.intensity = state.intensity;
    return s;
  }
  return new SymphonyComposer({
    seed: state.seed,
    mood: state.mood,
    piece: state.piece,
    intensity: state.intensity,
    auto: state.auto,
    tempo: state.tempo,
    avail: avail(),
    loop: !fresh,
  });
}

function syncSource() {
  if (!source) return;
  source.tempo = state.tempo;
  source.intensity = state.intensity;
  source.auto = state.auto;
  source.avail = avail();
}

// ---- transport ---------------------------------------------------------------

function tick() {
  const ahead = ctx.currentTime + 0.35;
  while (playing && nextTime < ahead) {
    const bar = source.nextBar();
    if (!bar) {
      const endAt = nextTime + 3;
      setTimeout(() => stop(false), Math.max(0, (endAt - ctx.currentTime) * 1000));
      playing = false;
      break;
    }
    const spb = 60 / bar.bpm;
    for (const ev of bar.events) {
      const jitter = ev.i === 'timp' || ev.i === 'harp' ? 0 : (Math.random() - 0.5) * 0.012;
      orch.play(ev, nextTime + ev.b * spb + jitter, spb);
    }
    infoQueue.push({ t: nextTime, spb, info: bar.info, beats: bar.beats });
    nextTime += bar.beats * spb;
  }
}

async function play() {
  await ctx.resume();
  if (state.work && !scoreCache.has(state.work)) await fetchScore(WORK_BY_ID[state.work]);
  if (!source) source = makeSource();
  syncSource();
  playing = true;
  nextTime = ctx.currentTime + 0.15;
  clearInterval(timer);
  timer = setInterval(tick, 25);
  tick();
  $('play').textContent = '■ STOP';
  $('play').classList.add('on');
}

function stop(fade = true) {
  playing = false;
  clearInterval(timer);
  if (fade) orch.stopAll(1.2);
  source = null;
  infoQueue = [];
  $('play').textContent = '▶ PLAY';
  $('play').classList.remove('on');
}

// Switch program: restart with the new one if playing.
function restart() {
  const was = playing;
  if (was) {
    playing = false;
    clearInterval(timer);
    orch.stopAll(0.4);
    setTimeout(() => {
      source = makeSource();
      play();
    }, 450);
  } else source = null;
  updateUrl();
  renderCards();
  showProgramName();
}

// ---- UI ----------------------------------------------------------------------

function renderCards() {
  const scenes = $('tab-scenes');
  scenes.innerHTML = '';
  for (const id of MOOD_IDS) {
    const m = MOODS[id];
    const b = document.createElement('button');
    b.className = 'card' + (!state.piece && !state.work && !state.midi && state.mood === id ? ' on' : '');
    b.innerHTML = `<b>${m.name}</b><small>${m.desc}</small>`;
    b.onclick = () => {
      state.mood = id;
      state.piece = null;
      state.work = null;
      state.midi = null;
      restart();
    };
    scenes.appendChild(b);
  }
  const cl = $('tab-classics');
  cl.innerHTML = '';
  const chips = document.createElement('div');
  chips.className = 'composers';
  for (const c of COMPOSERS) {
    const b = document.createElement('button');
    b.className = 'chip' + (state.composer === c.id ? ' on' : '');
    b.textContent = c.name;
    b.dataset.help = `${c.full} (${c.life})`;
    b.onclick = () => {
      state.composer = c.id;
      renderCards();
    };
    chips.appendChild(b);
  }
  cl.appendChild(chips);
  const comp = COMPOSERS.find((c) => c.id === state.composer);
  const head = document.createElement('div');
  head.className = 'composer-head';
  head.innerHTML = `<b>${comp.full}</b> <small>${comp.life}</small>`;
  cl.appendChild(head);
  for (const w of WORKS.filter((x) => x.composer === state.composer)) {
    const on = state.work === w.id && !state.midi;
    const b = document.createElement('div');
    b.className = 'card work' + (on ? ' on' : '');
    b.tabIndex = 0;
    b.innerHTML = `<b>${w.name}</b><small>${w.source}</small><div class="arrs"></div><div class="pd">Public domain · score: Mutopia Project${w.edition === 'public domain' ? '' : ` (${w.edition})`}</div>`;
    const pick = (arr) => {
      state.work = w.id;
      state.arr = arr;
      state.piece = null;
      state.midi = null;
      fetchScore(w).then(restart, (err) => toast('Could not load the score: ' + err.message));
    };
    for (const a of w.arr) {
      const ab = document.createElement('button');
      ab.className = 'arr' + (on && state.arr === a ? ' on' : '');
      ab.textContent = ARRANGEMENTS[a].name;
      ab.dataset.help = ARRANGEMENTS[a].desc + (a === w.arr[0] ? ' As the composer wrote it.' : '');
      ab.onclick = (e) => {
        e.stopPropagation();
        pick(a);
      };
      b.querySelector('.arrs').appendChild(ab);
    }
    b.onclick = () => pick(on ? state.arr : w.arr[0]);
    b.onkeydown = (e) => e.key === 'Enter' && b.onclick();
    cl.appendChild(b);
  }
  for (const p of CLASSICS.filter((x) => (CLASSIC_COMPOSER[x.id] || 'more') === state.composer)) {
    const b = document.createElement('button');
    b.className = 'card' + (state.piece === p.id && !state.midi && !state.work ? ' on' : '');
    b.innerHTML = `<b>${p.name}</b><small>${p.source}</small><div class="arrs"><span class="arr fixed">ORCHESTRA · CINEMATIC</span></div><div class="pd">Public domain · ${p.pd}</div>`;
    b.onclick = () => {
      state.piece = p.id;
      state.work = null;
      state.midi = null;
      restart();
    };
    cl.appendChild(b);
  }
}

function programName() {
  if (state.midi) return state.midi.name;
  if (state.work) return `${WORK_BY_ID[state.work].name} · ${ARRANGEMENTS[state.arr].name}`;
  if (state.piece) return CLASSIC_BY_ID[state.piece].name;
  return `${MOODS[state.mood].name} · THEME ${state.seed % 1000}`;
}

function showProgramName() {
  const name = programName();
  $('now-name').textContent = name;
  if (!playing) $('now-meta').textContent = 'Press PLAY';
}

function updateUrl() {
  const q = new URLSearchParams();
  if (state.work) q.set('work', state.work), q.set('arr', state.arr);
  else if (state.piece) q.set('piece', state.piece);
  else {
    q.set('mood', state.mood);
    q.set('seed', String(state.seed));
  }
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function bindRange(id, fmt, onChange) {
  const el = $(id);
  const out = $(id + '-out');
  const upd = () => {
    const v = Number(el.value);
    if (out) out.textContent = fmt(v);
    onChange(v);
  };
  el.addEventListener('input', upd);
  upd();
}

function buildSections() {
  const box = $('sections');
  for (const [k, label] of SECTIONS) {
    const d = document.createElement('div');
    d.className = 'sec';
    d.innerHTML = `<span>${label}</span><button title="Mute">M</button><input type="range" min="0" max="1.3" step="0.01" value="1" aria-label="${label} level" /><div class="meter"><i></i></div>`;
    d.dataset.help = `${label}: level of the section. M mutes it; the melody then moves to another section.`;
    const s = state.sections[k];
    d.querySelector('input').addEventListener('input', (e) => {
      s.level = Number(e.target.value);
      applySection(k);
    });
    d.querySelector('button').addEventListener('click', () => {
      s.muted = !s.muted;
      d.classList.toggle('muted', s.muted);
      applySection(k);
    });
    box.appendChild(d);
    s.el = d;
  }
}

function applySection(k) {
  const s = state.sections[k];
  orch.setSection(k, s.muted ? 0 : s.level);
  syncSource();
}

function frame() {
  const now = ctx.currentTime;
  while (infoQueue.length && infoQueue[0].t <= now) {
    const q = infoQueue.shift();
    shown = q;
    beatClock = { t: q.t, spb: q.spb };
    const i = q.info;
    $('now-name').textContent = i.name;
    const bits = [SECTION_LABEL[i.section] || i.section.toUpperCase()];
    if (i.chord) bits.push(i.chord);
    if (i.key) bits.push(`KEY ${i.key}`);
    bits.push(`${Math.round(60 / q.spb)} BPM`);
    bits.push(`BAR ${i.bar}`);
    $('now-meta').textContent = bits.join(' · ');
  }
  const buf = new Float32Array(orch.analyser.fftSize);
  orch.analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let j = 0; j < buf.length; j += 4) sum += buf[j] * buf[j];
  const rms = Math.sqrt(sum / (buf.length / 4));
  const phase = playing || shown ? ((now - beatClock.t) / beatClock.spb) % 1 : 0;
  stage.tick(now, rms, phase);
  for (const [k] of SECTIONS) {
    let a = 0;
    for (const p in stage.act) if (sectionOf(p) === k) a = Math.max(a, stage.act[p]);
    state.sections[k].el.querySelector('.meter i').style.width = `${Math.round(a * 100)}%`;
  }
  requestAnimationFrame(frame);
}

const SEC_OF = { pno: 'piano', vln1: 'strings', vln2: 'strings', vla: 'strings', vc: 'strings', cb: 'strings', hn: 'brass', tp: 'brass', tb: 'brass', tu: 'brass', fl: 'winds', ob: 'winds', cl: 'winds', bn: 'winds', harp: 'harp', glock: 'harp' };
const sectionOf = (p) => SEC_OF[p] || 'perc';

// ---- SAVE WAV: render offline -------------------------------------------------

// limit: optional length in seconds (for scripts that render excerpts).
async function renderWav(limit = null) {
  if (!bank.ready) return toast('Wait until all samples are loaded.');
  const btn = $('save');
  btn.disabled = true;
  btn.textContent = 'RENDERING…';
  try {
    if (state.work) await fetchScore(WORK_BY_ID[state.work]);
    const src = makeSource(true);
    const bars = [];
    let total = 0;
    // A whole work is saved to its end (up to 15 minutes); a scene saves one cycle of its theme.
    const maxBars = state.work || state.midi ? 4000 : 400;
    const maxSecs = typeof limit === 'number' ? limit : state.work || state.midi ? 900 : 420;
    for (let guard = 0; guard < maxBars && total < maxSecs; guard++) {
      const bar = src.nextBar();
      if (!bar) break;
      if (bar.info.section === 'rest' && bars.length) break;
      bars.push(bar);
      total += (bar.beats * 60) / bar.bpm;
    }
    const rate = 44100;
    const len = Math.ceil((total + 5) * rate);
    const off = new OfflineAudioContext(2, len, rate);
    const o = new Orchestra(off, bank);
    o.setHall(state.hallSize, state.hallMix);
    o.setVolume(state.volume);
    for (const [k] of SECTIONS) o.setSection(k, state.sections[k].muted ? 0 : state.sections[k].level);
    let t = 0.1;
    for (const bar of bars) {
      const spb = 60 / bar.bpm;
      for (const ev of bar.events) o.play(ev, t + ev.b * spb, spb);
      t += bar.beats * spb;
    }
    const buf = await off.startRendering();
    const name = (state.work ? `${state.work} ${state.arr}` : state.midi ? state.midi.name : state.piece ? CLASSIC_BY_ID[state.piece].name : `${MOODS[state.mood].name} ${state.seed}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    download(encodeWav(buf), `ranger-symphony-${name}.wav`);
    toast(`Saved ${Math.round(total)} s of music.`);
  } catch (err) {
    console.error(err);
    toast('Rendering failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'SAVE WAV';
  }
}

// ---- wiring --------------------------------------------------------------------

function init() {
  renderCards();
  buildSections();
  showProgramName();
  updateUrl();

  document.querySelectorAll('.tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
      for (const t of ['scenes', 'classics', 'score']) $('tab-' + t).hidden = t !== b.dataset.tab;
    }),
  );
  if (state.piece || state.work) document.querySelector('[data-tab="classics"]').dispatchEvent(new Event('click'));

  $('play').onclick = () => (playing ? stop() : play());
  $('new').onclick = () => {
    state.seed = randomSeed();
    if (state.piece || state.midi || state.work) {
      state.piece = null;
      state.work = null;
      state.midi = null;
    }
    restart();
  };
  $('next').onclick = () => source?.next?.();
  $('climax').onclick = () => {
    if (!source?.climax) return;
    source.climax();
    if (!playing) play();
    toast('To the climax!');
  };
  $('ending').onclick = () => {
    if (source?.end) {
      source.end();
      toast('Playing the ending.');
    } else stop();
  };
  bindRange('tempo', (v) => `${Math.round(v * 100)}%`, (v) => ((state.tempo = v), syncSource()));
  bindRange('intensity', (v) => `${Math.round(v * 100)}`, (v) => ((state.intensity = v), syncSource()));
  $('auto').addEventListener('change', (e) => ((state.auto = e.target.checked), syncSource()));
  bindRange('hall-size', (v) => `${(1.2 + v * 3.6).toFixed(1)} s`, (v) => ((state.hallSize = v), orch.setHall(state.hallSize, state.hallMix)));
  bindRange('hall-mix', (v) => `${Math.round(v * 100)}`, (v) => ((state.hallMix = v), orch.setHall(state.hallSize, state.hallMix)));
  bindRange('volume', (v) => `${Math.round(v * 100)}`, (v) => ((state.volume = v), orch.setVolume(v)));
  $('save').onclick = renderWav;
  $('link').onclick = async () => {
    updateUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied.');
    } catch {
      toast(location.href);
    }
  };
  $('load-score').onclick = () => $('score-file').click();
  $('score-file').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const buffer = await f.arrayBuffer();
      const s = new MidiScore(buffer, f.name.replace(/\.midi?$/i, ''));
      state.midi = { buffer, name: s.name };
      state.piece = null;
      state.work = null;
      $('parts').innerHTML = s.parts.map((p) => `<li>${escapeHtml(p.name)} → <b>${p.player}</b> (${p.notes})</li>`).join('');
      restart();
      toast(`${s.parts.length} parts loaded.`);
    } catch (err) {
      toast('Could not read the MIDI file: ' + err.message);
    }
    e.target.value = '';
  };
  $('info-btn').onclick = () => ($('info').hidden = false);
  $('info').addEventListener('click', (e) => {
    if (e.target.id === 'info' || e.target.classList.contains('info-close')) $('info').hidden = true;
  });
  document.addEventListener('mouseover', (e) => {
    const h = e.target.closest('[data-help]');
    if (h) $('help-line').textContent = h.dataset.help;
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (e.code === 'Space') {
      e.preventDefault();
      $('play').click();
    } else if (e.key === 'n' || e.key === 'N') $('new').click();
    else if (e.key === 'ArrowRight') $('next').click();
    else if (e.key === 'c' || e.key === 'C') $('climax').click();
    else if (e.key === 'e' || e.key === 'E') $('ending').click();
  });
  requestAnimationFrame(frame);

  bank
    .load(ctx, {
      sources: SYMPHONY_SOURCES,
      onProgress: (n, total) => {
        $('load-fill').style.width = `${Math.round((n / total) * 100)}%`;
        $('load-text').textContent = `${n} / ${total} samples`;
        if (n === total) $('loading').classList.add('done');
      },
    })
    .catch((err) => {
      $('load-text').textContent = 'Could not load the samples: ' + err.message;
    });

  // A hook for tests and the MCP bridge.
  window.symphony = { state, play, stop, restart, renderWav, bank, orch, get source() { return source; }, ctx, fetchScore, WORK_BY_ID };
  if (state.work) fetchScore(WORK_BY_ID[state.work]).catch(() => {});
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

init();
