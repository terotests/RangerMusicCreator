// SPDX-License-Identifier: MIT
// The page runner shared by the style pages (ragtime, big band, space age,
// synthwave): transport, program cards, section faders, the stage, SAVE WAV
// and the URL. Each page passes a config: its band, composer and stage.

import { Orchestra, SampleBank } from './symphony/orchestra.js';
import { encodeWav, download } from './recorder.js';
import { randomSeed } from './rng.js';

const $ = (id) => document.getElementById(id);

export function runPage(CONFIG) {
  const params = new URLSearchParams(location.search);
  const pieceParam = params.get(CONFIG.pieceParam);
  const state = {
    style: CONFIG.styles[params.get('style')] ? params.get('style') : CONFIG.defaultStyle,
    piece: CONFIG.pieceBy[pieceParam] ? pieceParam : null,
    seed: Number(params.get('seed')) || randomSeed(),
    tempo: 1,
    intensity: 0.6,
    auto: true,
    band: 'auto',
    swing: null,
    hallSize: CONFIG.hallSize ?? 0.25,
    hallMix: CONFIG.hallMix ?? 0.35,
    volume: 0.9,
    sections: Object.fromEntries(CONFIG.sections.map(([k]) => [k, { level: 1, muted: false }])),
  };
  // Extra choices a page may offer next to the style (the Pop Machine's riff
  // and chord loop): each has its own tab of cards, an AUTO card and a URL parameter.
  for (const o of CONFIG.options || []) {
    const v = params.get(o.param);
    state[o.key] = o.items.some((it) => it.id === v) ? v : 'auto';
  }

  const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
  const bank = new SampleBank();
  const orch = new Orchestra(ctx, bank, { band: CONFIG.band });
  const stage = new CONFIG.Stage($('stage'));
  orch.onNote((ev, t, dur) => stage.note(ev, t, dur));

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

  async function makeSource(fresh = false) {
    const common = { seed: state.seed, intensity: state.intensity, auto: state.auto, tempo: state.tempo, avail: avail(), loop: !fresh };
    return CONFIG.makeSource(state, common);
  }

  function syncSource() {
    if (!source) return;
    source.tempo = state.tempo;
    source.intensity = state.intensity;
    source.auto = state.auto;
    source.avail = avail();
    if ('band' in source) source.band = state.band;
    if ('swing' in source) source.swing = state.swing;
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
        const jitter = CONFIG.tight?.has(ev.i) ? 0 : ev.i === 'pno' || ev.i === 'hh' || ev.i === 'ride' ? (Math.random() - 0.5) * 0.006 : (Math.random() - 0.5) * (CONFIG.jitter ?? 0.014);
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
    // Styles and pieces with a `tab` go to that tab (the Space Age page's
    // APOLLO), after its styles; the rest to STYLES and CLASSICS.
    const tabOf = (x, def) => (x.tab && $('tab-' + x.tab)) || $(def);
    for (const el of document.querySelectorAll('.cards')) el.innerHTML = '';
    for (const id of CONFIG.styleIds) {
      const s = CONFIG.styles[id];
      const box = tabOf(s, 'tab-styles');
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
    for (const o of CONFIG.options || []) {
      const ob = $('tab-' + o.tab);
      if (!ob) continue;
      for (const it of [{ id: 'auto', name: o.autoName || 'AUTO', desc: o.autoDesc || 'The machine chooses.' }, ...o.items]) {
        const b = document.createElement('button');
        b.className = 'card' + (state[o.key] === it.id ? ' on' : '');
        b.innerHTML = `<b>${it.name}</b>${it.nick ? `<i class="nick">${it.nick}</i>` : ''}<small>${it.desc}</small>${it.tag ? `<div class="pd">${it.tag}</div>` : ''}`;
        b.onclick = () => {
          state[o.key] = it.id;
          restart();
        };
        ob.appendChild(b);
      }
    }
    for (const p of CONFIG.pieces) {
      const pb = tabOf(p, 'tab-pieces');
      if (!pb) continue;
      const b = document.createElement('button');
      b.className = 'card' + (state.piece === p.id ? ' on' : '');
      b.innerHTML = `<b>${p.name}</b>${p.mission ? `<i class="nick">${p.mission}</i>` : ''}<small>${p.desc}</small><div class="pd">${p.tag || `Public domain · ${p.pd}`}</div>`;
      b.onclick = () => {
        state.piece = p.id;
        restart();
      };
      pb.appendChild(b);
    }
  }

  function programName() {
    if (CONFIG.programName) return CONFIG.programName(state);
    if (state.piece) return CONFIG.pieceBy[state.piece].name;
    return `${CONFIG.styles[state.style].name} No. ${state.seed % 1000}`;
  }

  function showProgramName() {
    $('now-name').textContent = programName();
    if (!playing) $('now-meta').textContent = 'Press PLAY';
  }

  function updateUrl() {
    const q = new URLSearchParams();
    if (state.piece) q.set(CONFIG.pieceParam, state.piece);
    else {
      q.set('style', state.style);
      q.set('seed', String(state.seed));
      for (const o of CONFIG.options || []) if (state[o.key] !== 'auto') q.set(o.param, state[o.key]);
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
      const bits = CONFIG.metaBits ? CONFIG.metaBits(i, label) : [label];
      if (i.chord) bits.push(i.chord);
      if (i.key) bits.push(`KEY ${i.key}`);
      bits.push(`${Math.round(60 / q.spb)} BPM`);
      bits.push(`BAR ${i.bar}`);
      $('now-meta').textContent = bits.join(' · ');
      CONFIG.onInfo?.(i, stage);
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
      // Schedule the bars a few seconds ahead of the render, not all at once:
      // a graph holding every note of the song renders far slower.
      const starts = [];
      let t = 0.1;
      for (const bar of bars) {
        starts.push(t);
        t += (bar.beats * 60) / bar.bpm;
      }
      let next = 0;
      const scheduleUntil = (until) => {
        while (next < bars.length && starts[next] < until) {
          const bar = bars[next];
          const spb = 60 / bar.bpm;
          for (const ev of bar.events) o.play(ev, starts[next] + ev.b * spb, spb);
          next++;
        }
      };
      const STEP = 2;
      scheduleUntil(STEP * 2);
      for (let at = STEP; at < total + 4 - 0.1; at += STEP) {
        off.suspend(Math.round((at * rate) / 128) * (128 / rate)).then(() => {
          scheduleUntil(at + STEP * 2);
          off.resume();
        });
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
        document.querySelectorAll('.tabs button').forEach((x) => ($('tab-' + x.dataset.tab).hidden = x !== b));
      }),
    );
    const openTab = state.piece ? CONFIG.pieceBy[state.piece].tab || 'pieces' : CONFIG.styles[state.style].tab;
    if (openTab) document.querySelector(`[data-tab="${openTab}"]`)?.dispatchEvent(new Event('click'));

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
      toast(CONFIG.climaxToast);
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
        sources: CONFIG.sources,
        core: CONFIG.core,
        onProgress: (n, total) => {
          $('load-fill').style.width = `${Math.round((n / total) * 100)}%`;
          $('load-text').textContent = `${n} / ${total} samples`;
          if (n === total) $('loading').classList.add('done');
        },
      })
      .then(() => $('loading').classList.add('done'))
      .catch((err) => {
        $('load-text').textContent = 'Could not load the samples: ' + err.message;
      });

    // A hook for tests and the MCP bridge.
    window.jazz = window.page = { kind: CONFIG.kind, state, play, stop, restart, renderWav, bank, orch, get source() { return source; }, ctx, makeSource };
  }

  init();
}
