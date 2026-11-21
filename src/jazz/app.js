// SPDX-License-Identifier: MIT
// Wires a jazz page (ragtime.html or bigband.html, picked by <body data-band>)
// to its composer, the sampled band and the stage.
// URLs: ragtime.html?style=stomp&seed=12, ragtime.html?piece=maple,
//       bigband.html?style=jump&seed=5, bigband.html?tune=saints

import { Orchestra, SampleBank } from '../symphony/orchestra.js';
import { encodeWav, download } from '../recorder.js';
import { randomSeed } from '../rng.js';
import { RAG_BAND, RAG_SECTIONS, RAG_SECTION_OF, BIGBAND_BAND, BB_SECTIONS, BB_SECTION_OF, SOURCES } from './band.js';
import { RagComposer, RAG_STYLES, RAG_STYLE_IDS } from './ragtime.js';
import { BigBandComposer, BB_STYLES, BB_STYLE_IDS, BB_TUNES, BB_TUNE_BY_ID } from './bigband.js';
import { RAGS, RAG_BY_ID, loadRag } from './scores.js';
import { RagStage, BandStage } from './stage.js';

const $ = (id) => document.getElementById(id);
const KIND = document.body.dataset.band === 'bigband' ? 'bigband' : 'ragtime';

const CONFIG = {
  ragtime: {
    title: 'Ranger Ragtime',
    file: 'ranger-ragtime',
    band: RAG_BAND,
    sections: RAG_SECTIONS,
    sectionOf: RAG_SECTION_OF,
    styles: RAG_STYLES,
    styleIds: RAG_STYLE_IDS,
    pieces: RAGS.map((r) => ({ ...r, desc: r.source })),
    pieceBy: RAG_BY_ID,
    defaultStyle: 'classic',
    Stage: RagStage,
    labels: { intro: 'INTRODUCTION', A: 'FIRST STRAIN', B: 'SECOND STRAIN', C: 'TRIO', end: 'ENDING', rest: '…', strain: 'STRAIN', repeat: 'STRAIN · REPEAT' },
    core: ['piano', 'tp_vib', 'tp_sus', 'cl_sus', 'tb_vib', 'tu_sus', 'sn', 'bd'],
  },
  bigband: {
    title: 'Ranger Big Band',
    file: 'ranger-big-band',
    band: BIGBAND_BAND,
    sections: BB_SECTIONS,
    sectionOf: BB_SECTION_OF,
    styles: BB_STYLES,
    styleIds: BB_STYLE_IDS,
    pieces: BB_TUNES.map((t) => ({ ...t, desc: t.source })),
    pieceBy: BB_TUNE_BY_ID,
    defaultStyle: 'swing',
    Stage: BandStage,
    labels: {},
    core: ['cl_sus', 'tp_sus', 'tb_sus', 'cb_pizz', 'ride', 'piano'],
  },
}[KIND];

const params = new URLSearchParams(location.search);
const pieceParam = params.get(KIND === 'ragtime' ? 'piece' : 'tune');
const state = {
  style: CONFIG.styles[params.get('style')] ? params.get('style') : CONFIG.defaultStyle,
  piece: CONFIG.pieceBy[pieceParam] ? pieceParam : null,
  seed: Number(params.get('seed')) || randomSeed(),
  tempo: 1,
  intensity: 0.6,
  auto: true,
  band: 'auto',
  swing: null,
  hallSize: 0.25,
  hallMix: 0.35,
  volume: 0.9,
  sections: Object.fromEntries(CONFIG.sections.map(([k]) => [k, { level: 1, muted: false }])),
};

const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
const bank = new SampleBank();
const orch = new Orchestra(ctx, bank, { band: CONFIG.band });
const stage = new CONFIG.Stage($('stage'));
orch.onNote((ev, t, dur) => stage.note(ev, t, dur));

const rags = new Map(); // parsed public-domain rags by id
let source = null;
let playing = false;
let timer = null;
let nextTime = 0;
let infoQueue = [];
let shown = null;
let beatClock = { t: 0, spb: 0.5 };

function avail() {
  return Object.fromEntries(CONFIG.sections.map(([k]) => [k, !state.sections[k].muted && state.sections[k].level > 0.01]));
}

async function ragFor(id) {
  if (!rags.has(id)) rags.set(id, await loadRag(id));
  return rags.get(id);
}

async function makeSource(fresh = false) {
  const common = { seed: state.seed, intensity: state.intensity, auto: state.auto, tempo: state.tempo, avail: avail(), loop: !fresh };
  if (KIND === 'ragtime') {
    const score = state.piece ? await ragFor(state.piece) : null;
    return new RagComposer({ ...common, style: state.style, score, band: state.band });
  }
  const t = state.piece ? BB_TUNE_BY_ID[state.piece] : null;
  const rag = t?.rag ? await ragFor(t.rag) : null;
  return new BigBandComposer({ ...common, style: state.style, tune: state.piece, rag, swing: state.swing });
}

function syncSource() {
  if (!source) return;
  source.tempo = state.tempo;
  source.intensity = state.intensity;
  source.auto = state.auto;
  source.avail = avail();
  if ('band' in source) source.band = state.band;
  if (KIND === 'bigband') source.swing = state.swing;
}

// ---- transport ---------------------------------------------------------------

function tick() {
  const ahead = ctx.currentTime + 0.35;
  while (playing && source && nextTime < ahead) {
    const bar = source.nextBar();
    if (!bar) {
      const endAt = nextTime + 3;
      setTimeout(() => stop(false), Math.max(0, (endAt - ctx.currentTime) * 1000));
      playing = false;
      break;
    }
    const spb = 60 / bar.bpm;
    for (const ev of bar.events) {
      const jitter = ev.i === 'pno' || ev.i === 'hh' || ev.i === 'ride' ? (Math.random() - 0.5) * 0.006 : (Math.random() - 0.5) * 0.014;
      orch.play(ev, nextTime + ev.b * spb + jitter, spb);
    }
    infoQueue.push({ t: nextTime, spb, info: bar.info, beats: bar.beats });
    nextTime += bar.beats * spb;
  }
}

async function play() {
  await ctx.resume();
  if (!source) source = await makeSource();
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
  if (fade) orch.stopAll(0.8);
  source = null;
  infoQueue = [];
  $('play').textContent = '▶ PLAY';
  $('play').classList.remove('on');
}

function restart() {
  const was = playing;
  if (was) {
    playing = false;
    clearInterval(timer);
    orch.stopAll(0.3);
    setTimeout(async () => {
      source = await makeSource();
      play();
    }, 350);
  } else source = null;
  updateUrl();
  renderCards();
  showProgramName();
}

// ---- UI ----------------------------------------------------------------------

function renderCards() {
  const box = $('tab-styles');
  box.innerHTML = '';
  for (const id of CONFIG.styleIds) {
    const s = CONFIG.styles[id];
    const b = document.createElement('button');
    b.className = 'card' + (!state.piece && state.style === id ? ' on' : '');
    b.innerHTML = `<b>${s.name}</b><small>${s.desc}</small>`;
    b.onclick = () => {
      state.style = id;
      state.piece = null;
      restart();
    };
    box.appendChild(b);
  }
  const pb = $('tab-pieces');
  pb.innerHTML = '';
  for (const p of CONFIG.pieces) {
    const b = document.createElement('button');
    b.className = 'card' + (state.piece === p.id ? ' on' : '');
    b.innerHTML = `<b>${p.name}</b><small>${p.desc}</small><div class="pd">Public domain · ${p.pd}</div>`;
    b.onclick = () => {
      state.piece = p.id;
      restart();
    };
    pb.appendChild(b);
  }
}

function programName() {
  if (state.piece) return CONFIG.pieceBy[state.piece].name;
  return `${CONFIG.styles[state.style].name} No. ${state.seed % 1000}`;
}

function showProgramName() {
  $('now-name').textContent = programName();
  if (!playing) $('now-meta').textContent = 'Press PLAY';
}

function updateUrl() {
  const q = new URLSearchParams();
  if (state.piece) q.set(KIND === 'ragtime' ? 'piece' : 'tune', state.piece);
  else {
    q.set('style', state.style);
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
  if (!el) return;
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
  for (const [k, label] of CONFIG.sections) {
    const d = document.createElement('div');
    d.className = 'sec';
    d.innerHTML = `<span>${label}</span><button title="Mute">M</button><input type="range" min="0" max="1.3" step="0.01" value="1" aria-label="${label} level" /><div class="meter"><i></i></div>`;
    d.dataset.help = `${label}: level of the section. M mutes it.`;
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
    const label = i.label || CONFIG.labels[i.section] || String(i.section).toUpperCase();
    const bits = [i.repeat && KIND === 'ragtime' && !CONFIG.labels[i.section]?.includes('REPEAT') ? `${label} · AGAIN` : label];
    if (i.band === false && KIND === 'ragtime') bits.push('SOLO PIANO');
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
  for (const [k] of CONFIG.sections) {
    let a = 0;
    for (const p in stage.act) if (CONFIG.sectionOf[p] === k) a = Math.max(a, stage.act[p]);
    state.sections[k].el.querySelector('.meter i').style.width = `${Math.round(a * 100)}%`;
  }
  requestAnimationFrame(frame);
}

// ---- SAVE WAV: render offline -------------------------------------------------

async function renderWav() {
  if (!bank.ready) return toast('Wait until all samples are loaded.');
  const btn = $('save');
  btn.disabled = true;
  btn.textContent = 'RENDERING…';
  try {
    const src = await makeSource(true);
    const bars = [];
    let total = 0;
    for (let guard = 0; guard < 600 && total < 480; guard++) {
      const bar = src.nextBar();
      if (!bar) break;
      if (bar.info.section === 'rest' && bars.length) break;
      bars.push(bar);
      total += (bar.beats * 60) / bar.bpm;
    }
    const rate = 44100;
    const off = new OfflineAudioContext(2, Math.ceil((total + 4) * rate), rate);
    const o = new Orchestra(off, bank, { band: CONFIG.band });
    o.setHall(state.hallSize, state.hallMix);
    o.setVolume(state.volume);
    for (const [k] of CONFIG.sections) o.setSection(k, state.sections[k].muted ? 0 : state.sections[k].level);
    let t = 0.1;
    for (const bar of bars) {
      const spb = 60 / bar.bpm;
      for (const ev of bar.events) o.play(ev, t + ev.b * spb, spb);
      t += bar.beats * spb;
    }
    const buf = await off.startRendering();
    const name = programName().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    download(encodeWav(buf), `${CONFIG.file}-${name}.wav`);
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
      for (const t of ['styles', 'pieces']) $('tab-' + t).hidden = t !== b.dataset.tab;
    }),
  );
  if (state.piece) document.querySelector('[data-tab="pieces"]').dispatchEvent(new Event('click'));

  $('play').onclick = () => (playing ? stop() : play());
  $('new').onclick = () => {
    state.seed = randomSeed();
    state.piece = null;
    restart();
  };
  $('next').onclick = () => source?.next?.();
  $('climax').onclick = async () => {
    if (!source) source = await makeSource();
    source.climax();
    if (!playing) play();
    toast(KIND === 'ragtime' ? 'The big finish!' : 'Shout chorus!');
  };
  $('ending').onclick = () => {
    if (source?.end) {
      source.end();
      toast('Playing the ending.');
    } else stop();
  };
  bindRange('tempo', (v) => `${Math.round(v * 100)}%`, (v) => ((state.tempo = v), syncSource()));
  bindRange('intensity', (v) => `${Math.round(v * 100)}`, (v) => ((state.intensity = v), syncSource()));
  bindRange('swing', (v) => (v <= 0.5 ? 'STYLE' : `${Math.round(v * 100)}%`), (v) => ((state.swing = v <= 0.5 ? null : v), syncSource()));
  $('auto').addEventListener('change', (e) => ((state.auto = e.target.checked), syncSource()));
  const bandSel = $('band-mode');
  if (bandSel) bandSel.addEventListener('change', (e) => ((state.band = e.target.value), syncSource()));
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
  $('info-btn').onclick = () => ($('info').hidden = false);
  $('info').addEventListener('click', (e) => {
    if (e.target.id === 'info' || e.target.classList.contains('info-close')) $('info').hidden = true;
  });
  document.addEventListener('mouseover', (e) => {
    const h = e.target.closest('[data-help]');
    if (h) $('help-line').textContent = h.dataset.help;
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox')) return;
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
      sources: SOURCES,
      core: CONFIG.core,
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
  window.jazz = { kind: KIND, state, play, stop, restart, renderWav, bank, orch, get source() { return source; }, ctx, makeSource };
}

init();
