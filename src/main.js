// SPDX-License-Identifier: MIT
// Wires the desk to the engine, the composer and the player.

import { Engine } from './engine.js';
import { Composer } from './composer.js';
import { Player } from './player.js';
import { STYLES, STYLE_BY_ID, LAYERS } from './styles.js';
import { AMBIENCES } from './ambient.js';
import { Screen, SKINS } from './screen.js';
import { Recorder, download } from './recorder.js';
import { knob, fader, key } from './controls.js';
import { randomSeed } from './rng.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || randomSeed();
const startStyle = STYLE_BY_ID[params.get('style')] ? params.get('style') : 'lofi';

const engine = new Engine();
let composer = new Composer({ seed, style: startStyle, surprise: 0.5 });
const player = new Player(engine, composer);
const recorder = new Recorder(engine);
const screen = new Screen($('#screen'), engine);
screen.seed = seed;

const state = {
  autoMix: true,
  autoAmb: true,
  echo: true,
  verb: true,
  solo: new Set(),
  mute: new Set(),
  touched: {},
  targets: {},
  lastBar: -1,
  faded: false,
  skin: 'ice',
};

const CH_LABEL = { kick: 'KICK', snare: 'SNARE', hats: 'HATS', bass: 'BASS', keys: 'CHORDS', pad: 'PAD', lead: 'LEAD', arp: 'ARP', amb: 'AMBIENCE' };
const CHANNELS = [...LAYERS, 'amb'];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---- mixer strips ---------------------------------------------------------

const strips = {};
for (const ch of CHANNELS) {
  const el = document.createElement('div');
  el.className = 'strip';
  el.innerHTML = '<div class="led-row"><i class="led"></i><span>SIG/PEAK</span></div><div class="k"></div><span class="cap">SEND</span>';
  $('#strips').appendChild(el);
  const channel = player.channels[ch];
  const send = knob(el.querySelector('.k'), { value: 0.3, onChange: (v) => channel.setSend(v), format: (v) => `send ${Math.round(v * 100)}%` });
  const reroll = key(el, {
    tag: 'NEW',
    title: ch === 'amb' ? 'Pick new ambience' : `Write a new ${CH_LABEL[ch].toLowerCase()} part`,
    onClick: () => {
      if (ch === 'amb') randomAmbience();
      else composer.reroll(ch);
      reroll.flash();
    },
  });
  const solo = key(el, { label: 'SOLO', color: 'amber', onClick: () => toggleSet(state.solo, ch, solo) });
  const mute = key(el, { label: 'MUTE', color: 'red', onClick: () => toggleSet(state.mute, ch, mute) });
  el.insertAdjacentHTML('beforeend', '<div class="divider"></div><div class="f"></div>');
  const f = fader(el.querySelector('.f'), {
    value: 0.7,
    onChange: (v) => channel.setLevel(v),
    onTouch: () => (state.touched[ch] = performance.now()),
  });
  el.insertAdjacentHTML('beforeend', `<div class="name">${CH_LABEL[ch]}</div>`);
  strips[ch] = { el, send, f, led: el.querySelector('.led'), solo, mute, channel };
}

// Main strip
{
  const el = document.createElement('div');
  el.className = 'strip main';
  const seg = (n, cls) => Array.from({ length: n }, () => `<i class="${cls}"></i>`).join('');
  const ladder = seg(9, 'g') + seg(3, 'a') + seg(2, 'r');
  el.innerHTML = `<div class="led-row"><i class="led" id="main-led"></i><span>SIG/PEAK</span></div>
    <div class="main-meters"><div class="ladder" id="mL">${ladder}</div><div class="scale"><span>-50</span><span>-30</span><span>-20</span><span>-6</span><span>0</span></div><div class="ladder" id="mR">${ladder}</div></div>
    <div class="led-row" style="gap:22px"><span>L</span><span>R</span></div>
    <div class="divider"></div><div class="f"></div><div class="name">MAIN</div>`;
  $('#strips').appendChild(el);
  strips.main = {
    f: fader(el.querySelector('.f'), { value: 0.75, onChange: (v) => engine.master.gain.setTargetAtTime(0.9 * Math.pow(10, ((v - 0.75) * 48) / 20) * (v > 0.001), engine.now, 0.02) }),
    ladL: [...el.querySelectorAll('#mL i')],
    ladR: [...el.querySelectorAll('#mR i')],
    led: el.querySelector('#main-led'),
  };
}

function toggleSet(set, ch, k) {
  if (set.has(ch)) set.delete(ch);
  else set.add(ch);
  k.on(set.has(ch));
  applyAudible();
}

function applyAudible() {
  for (const ch of CHANNELS) {
    const audible = !state.mute.has(ch) && (state.solo.size === 0 || state.solo.has(ch));
    strips[ch].channel.setAudible(audible);
  }
}

// ---- ambience --------------------------------------------------------------

const pads = AMBIENCES.map((a, i) => {
  const b = document.createElement('button');
  b.className = 'pad';
  b.style.setProperty('--c', a.color);
  b.innerHTML = `${i + 1}<span>${a.name}</span>`;
  b.setAttribute('aria-label', `Ambience ${a.name}`);
  b.addEventListener('click', () => {
    engine.ctx.resume();
    state.autoAmb = false;
    ambAuto.on(false);
    b.classList.toggle('on', player.ambient.toggle(i));
  });
  $('#pads').appendChild(b);
  return b;
});

function syncPads() {
  pads.forEach((p, i) => p.classList.toggle('on', player.ambient.isOn(i)));
}

function randomAmbience() {
  const ids = AMBIENCES.map((a) => a.id).sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
  state.autoAmb = false;
  ambAuto.on(false);
  player.ambient.setOnly(ids);
  syncPads();
}

knob($('#amb-level'), { value: 0.75, onChange: (v) => strips.amb.f.set(v), format: (v) => `ambience ${Math.round(v * 100)}%` });
const ambAuto = key($('.amb-side'), {
  tag: 'AUTO',
  color: 'green',
  title: 'Let each style choose its ambience',
  onClick: () => {
    state.autoAmb = !state.autoAmb;
    ambAuto.on(state.autoAmb);
    if (state.autoAmb) {
      player.ambient.setOnly(composer.style.ambience);
      syncPads();
    }
  },
});
ambAuto.on(true);
$('#amb-auto').remove();

// ---- audio effect -------------------------------------------------------------

const fxKeys = $('#fx-keys');
const autoMixKey = key(fxKeys, { num: 1, label: 'AUTO<br>MIXING', color: 'green', onClick: () => { state.autoMix = !state.autoMix; autoMixKey.on(state.autoMix); } });
const echoKey = key(fxKeys, { num: 2, label: 'ECHO', color: 'green', onClick: () => { state.echo = !state.echo; echoKey.on(state.echo); applyReturns(); } });
const verbKey = key(fxKeys, { num: 3, label: 'REVERB', color: 'green', onClick: () => { state.verb = !state.verb; verbKey.on(state.verb); applyReturns(); } });
const tapeKey = key(fxKeys, {
  num: 4,
  label: 'TAPE<br>WOBBLE',
  color: 'green',
  onClick: () => {
    player.autoTape = false;
    engine.setTape(!engine.tape);
    tapeKey.on(engine.tape);
  },
});
autoMixKey.on(true);
echoKey.on(true);
verbKey.on(true);

const fxKnobs = $('#fx-knobs');
function fxKnob(label, opts) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  wrap.innerHTML = `<div class="led-row"><i class="led sig"></i><span>${label.led}</span></div><div class="k"></div><span class="cap">${label.cap}</span>`;
  fxKnobs.appendChild(wrap);
  return knob(wrap.querySelector('.k'), opts);
}
const echoLevel = fxKnob({ led: 'RETURN', cap: 'ECHO' }, { value: 0.7, onChange: applyReturns, format: (v) => `echo ${Math.round(v * 100)}%` });
const verbLevel = fxKnob({ led: 'RETURN', cap: 'REVERB' }, { value: 0.8, onChange: applyReturns, format: (v) => `reverb ${Math.round(v * 100)}%` });
const surprise = fxKnob({ led: 'CHAOS', cap: 'SURPRISE' }, { value: 0.5, onChange: (v) => (composer.surprise = v), format: (v) => `surprise ${Math.round(v * 100)}%` });
const tempo = fxKnob({ led: 'BPM', cap: 'TEMPO' }, { value: composer.bpm, min: 50, max: 180, def: composer.bpm, onChange: (v) => (composer.bpm = Math.round(v)), format: (v) => `${Math.round(v)} BPM` });

function applyReturns() {
  const t = engine.now;
  engine.echoReturn.gain.setTargetAtTime(state.echo ? echoLevel.get() : 0, t, 0.05);
  engine.verbReturn.gain.setTargetAtTime(state.verb ? verbLevel.get() * 1.1 : 0, t, 0.05);
}
applyReturns();

// ---- side ------------------------------------------------------------------------

const side = $('#side');
const helpKey = key(side, { label: 'HELP', onClick: () => ($('#help').hidden = false) });
helpKey.el.dataset.glyph = '?';
key(side, {
  label: 'SKIN',
  title: 'Screen colours: ice, lime, ember',
  onClick: () => {
    const names = Object.keys(SKINS);
    state.skin = names[(names.indexOf(state.skin) + 1) % names.length];
    screen.skin = SKINS[state.skin];
    toast(`Skin: ${state.skin}`);
  },
});
const masterWrap = document.createElement('div');
masterWrap.className = 'ctl';
masterWrap.innerHTML = '<div class="k"></div><span class="cap">VOLUME</span>';
side.appendChild(masterWrap);
const vol = knob(masterWrap.querySelector('.k'), { value: 0.8, onChange: (v) => (engine.fade.gain.value = state.faded ? 0 : v * 1.15), format: (v) => `volume ${Math.round(v * 100)}%` });
masterWrap.querySelector('.k').classList.add('big');
engine.fade.gain.value = vol.get() * 1.15;
const fadeBox = document.createElement('div');
fadeBox.className = 'fadebox';
side.appendChild(fadeBox);
const fadeKey = key(fadeBox, {
  label: 'OUTPUT<br>FADE',
  size: 'xl',
  color: 'white',
  onClick: () => {
    state.faded = !state.faded;
    engine.fadeTo(state.faded ? 0 : vol.get() * 1.15, 3);
    fadeKey.on(state.faded);
  },
});

// ---- perform / song ------------------------------------------------------------

const perf = $('#perform .keys');
const freezeKey = key(perf, { label: 'FREEZE', color: 'blue', title: 'Loop the current section', onClick: () => { composer.freeze = !composer.freeze; freezeKey.on(composer.freeze); } });
const throwKey = key(perf, {
  label: 'ECHO<br>THROW',
  color: 'amber',
  onClick: () => {
    const t = engine.now + 0.02;
    const beat = 60 / composer.bpm;
    for (const ch of ['snare', 'keys', 'lead', 'arp']) player.channels[ch].throwEcho(t, beat);
    engine.echoSpin(t, beat * 2);
    throwKey.flash(400);
    screen.log('ECHO THROW (YOU)');
  },
});
const filterKey = key(perf, {
  label: 'FILTER<br>SWEEP',
  color: 'amber',
  onClick: () => {
    engine.sweep(engine.now + 0.02, (60 / composer.bpm) * 8, 'lowpass');
    filterKey.flash(600);
    screen.log('FILTER SWEEP (YOU)');
  },
});
const halfKey = key(perf, { label: 'HALF-<br>TIME', color: 'blue', onClick: () => { composer.halftime = !composer.halftime; halfKey.on(composer.halftime); } });

const songRow = $('#song .keys');
key(songRow, { label: 'NEW<br>SONG', color: 'white', onClick: () => newSong(composer.style.id) });
const recKey = key(songRow, { label: 'REC', color: 'red', title: 'Record to a WAV file', onClick: toggleRec });
key(songRow, { label: 'LINK', color: 'white', title: 'Copy a link to this seed and style', onClick: copyLink });
key(songRow, {
  label: 'SURPRISE<br>ME',
  color: 'white',
  onClick: () => newSong(STYLES[Math.floor(Math.random() * STYLES.length)].id),
});

function newSong(styleId) {
  seed = randomSeed();
  const s = composer.surprise;
  composer = new Composer({ seed, style: styleId, surprise: s });
  player.composer = composer;
  player.styleId = null;
  screen.seed = seed;
  screen.log(`NEW SONG · SEED ${seed}`);
  freezeKey.on(false);
  halfKey.on(false);
  if (!player.playing) play();
}

async function toggleRec() {
  if (!recorder.recording) {
    if (!player.playing) await play();
    recorder.start();
    recKey.on(true);
    toast('Recording… press REC again to save a WAV');
  } else {
    recKey.on(false);
    toast('Saving WAV…');
    const { blob, ext } = await recorder.stop();
    download(blob, `ranger-${composer.style.id}-${seed}.${ext}`);
  }
}

function copyLink() {
  const u = new URL(location.href);
  u.search = '';
  u.searchParams.set('seed', seed);
  u.searchParams.set('style', composer.style.id);
  const text = u.toString();
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
    () => toast('Link copied'),
    () => prompt('Copy this link', text),
  );
}

// ---- style switcher and transition -----------------------------------------------

const styleKeys = STYLES.map((s, i) =>
  key($('#styles'), {
    num: i + 1,
    label: s.name,
    size: 'sw',
    title: s.mood,
    onClick: () => pickStyle(s.id),
  }),
);

function pickStyle(id) {
  if (!player.playing) {
    if (id !== composer.style.id) composer.setStyleNow(id);
    play();
  } else composer.setStyle(id);
  syncStyleKeys();
}

function syncStyleKeys() {
  STYLES.forEach((s, i) => {
    styleKeys[i].on(s.id === composer.style.id);
    styleKeys[i].el.classList.toggle('next', s.id === composer.pendingStyle);
  });
}

const tr = $('#transition');
const breakKey = key(tr.querySelector('.tr-top'), { label: 'BREAK', color: 'blue', onClick: () => { composer.queue('break'); breakKey.on(true); } });
const buildKey = key(tr.querySelector('.tr-top'), { label: 'BUILD', color: 'blue', onClick: () => { composer.queue('build'); buildKey.on(true); } });
const journeyKey = key(tr.querySelector('.tr-top'), { label: 'JOURNEY', color: 'green', title: 'Wander between styles', onClick: () => { player.journey = !player.journey; journeyKey.on(player.journey); } });
const nextKey = key(tr.querySelector('.tr-big'), { tag: 'NEXT', size: 'big cut', onClick: () => { composer.queue('next'); nextKey.flash(300); } });
const playKey = key(tr.querySelector('.tr-big'), { tag: 'PLAY', size: 'big play', color: 'green', onClick: () => (player.playing ? pause() : play()) });
nextKey.el.dataset.glyph = '⏭';
playKey.el.dataset.glyph = '▶';

async function play() {
  await player.start();
  playKey.on(true);
  playKey.el.dataset.glyph = '❚❚';
  syncStyleKeys();
}

function pause() {
  player.stop();
  playKey.on(false);
  playKey.el.dataset.glyph = '▶';
}

// ---- reacting to the music ---------------------------------------------------------

player.on('style', (style) => {
  syncStyleKeys();
  screen.log(`STYLE ${style.name} · ${composer.keyName} · ${composer.bpm} BPM`);
  for (const ch of CHANNELS) {
    strips[ch].send.set(style.sends[ch] ?? 0.2);
    state.targets[ch] = style.mix[ch] ?? 0.65;
    if (!state.autoMix && strips[ch].f.get() === 0.7) strips[ch].f.set(state.targets[ch]);
  }
  if (state.autoAmb) {
    player.ambient.setOnly(style.ambience);
    syncPads();
  }
  tapeKey.on(engine.tape);
});

function onBar(info) {
  screen.info = { ...info, mood: composer.style.mood };
  for (const m of info.messages) screen.log(m);
  const layers = new Set(info.layers);
  for (const ch of LAYERS) strips[ch].el.classList.toggle('dead', !layers.has(ch));
  if (info.barInSection === 0) {
    const style = composer.style;
    for (const ch of CHANNELS) {
      let t = style.mix[ch] ?? 0.65;
      if (info.section === 'drop') t += ch === 'lead' || ch === 'kick' ? 0.03 : ch === 'pad' || ch === 'amb' ? -0.04 : 0;
      if (info.section === 'break' || info.section === 'intro') t += ch === 'pad' || ch === 'amb' || ch === 'keys' ? 0.05 : 0;
      t += (Math.random() - 0.5) * 0.05;
      state.targets[ch] = Math.max(0.3, Math.min(0.9, t));
    }
    if (info.section !== 'break') breakKey.on(false);
    if (info.section !== 'build') buildKey.on(false);
  }
  if (composer.queued === null) {
    if (info.section === 'break') breakKey.on(false);
    if (info.section === 'build') buildKey.on(false);
  }
  tempo.set(info.bpm, true);
  syncStyleKeys();
}

// ---- sequencer view ----------------------------------------------------------------------

const LANE_COLOR = { kick: '#ff5470', snare: '#ffb83d', hats: '#e6c23a', bass: '#3d7bff', keys: '#3ddc84', pad: '#26c6da', lead: '#ff5ad1', arp: '#9b5cff' };
const lanes = {};
for (const ch of LAYERS) {
  $('#seq').insertAdjacentHTML('beforeend', `<span class="lane-name">${CH_LABEL[ch]}</span><div class="lane" style="--c:${LANE_COLOR[ch]}">${'<i></i>'.repeat(16)}</div>`);
  lanes[ch] = [...$('#seq').lastElementChild.children];
}
let headStep = -1;
function showPattern(events) {
  for (const ch of LAYERS) lanes[ch].forEach((c) => {
    c.classList.remove('hit');
    c.style.opacity = '';
  });
  for (const e of events) {
    if (e.fx || !lanes[e.ch]) continue;
    const cell = lanes[e.ch][e.step];
    cell.classList.add('hit');
    cell.style.opacity = String(Math.max(Number(cell.style.opacity) || 0, 0.35 + 0.65 * Math.min(1, e.vel)));
  }
}
function moveHead(step) {
  if (step === headStep) return;
  for (const ch of LAYERS) {
    if (headStep >= 0) lanes[ch][headStep].classList.remove('head');
    if (step >= 0) lanes[ch][step].classList.add('head');
  }
  headStep = step;
}

// ---- render loop ------------------------------------------------------------------------

const DB = [-50, -40, -35, -30, -25, -20, -16, -12, -9, -6, -4, -2, -1, 0];
function ladder(lights, peak) {
  const db = 20 * Math.log10(peak + 1e-6);
  lights.forEach((l, i) => l.classList.toggle('on', db >= DB[i]));
}

function frame() {
  const cur = player.current();
  if (cur && cur.info.bar !== state.lastBar) {
    state.lastBar = cur.info.bar;
    onBar(cur.info);
    showPattern(cur.events);
  }
  moveHead(cur && player.playing ? Math.min(15, Math.floor((engine.now - cur.time) / cur.stepDur)) : -1);
  const now = performance.now();
  for (const ch of CHANNELS) {
    const s = strips[ch];
    const m = s.channel.meter();
    s.led.className = 'led' + (m.peak > 0.95 ? ' peak' : m.rms > 0.002 ? ' sig' : '');
    s.f.meter(Math.min(1, m.rms * 4.5));
    if (state.autoMix && state.targets[ch] != null && now - (state.touched[ch] || -1e9) > 20000) {
      const v = s.f.get();
      const d = state.targets[ch] - v;
      if (Math.abs(d) > 0.002) s.f.set(v + d * 0.04);
    }
  }
  const [l, r] = engine.masterMeter();
  ladder(strips.main.ladL, l);
  ladder(strips.main.ladR, r);
  strips.main.led.className = 'led' + (Math.max(l, r) > 0.98 ? ' peak' : Math.max(l, r) > 0.003 ? ' sig' : '');
  let rec = null;
  if (recorder.recording) {
    const s = Math.floor((now - recorder.started) / 1000);
    rec = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  screen.draw(player.playing, rec);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep the ambience going (and the scheduler honest) when the tab is in the background.
setInterval(() => !player.playing && player.tick(), 100);

// ---- keyboard, help, layout -------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ') {
    e.preventDefault();
    player.playing ? pause() : play();
  } else if (k >= '1' && k <= '8') pickStyle(STYLES[Number(k) - 1].id);
  else if (k === 'n') nextKey.el.click();
  else if (k === 'f') freezeKey.el.click();
  else if (k === 'e') throwKey.el.click();
  else if (k === 'b') breakKey.el.click();
  else if (k === 'r') newSong(composer.style.id);
  else if (k === 'escape') $('#help').hidden = true;
});
$('#help').addEventListener('click', (e) => {
  if (e.target.id === 'help' || e.target.classList.contains('help-close')) $('#help').hidden = true;
});

function fit() {
  const board = $('#board');
  const stage = $('#stage');
  const w = window.innerWidth;
  const h = window.innerHeight;
  let s = Math.min((w - 24) / 1600, (h - 24) / 1000);
  if (s < 0.6) s = (w - 16) / 1600;
  // On a phone the desk would be too small to touch: keep it usable and let it scroll sideways.
  s = Math.max(0.5, Math.min(s, 1.35));
  board.style.transform = `scale(${s})`;
  board.style.left = `${Math.max(8, (w - 1600 * s) / 2)}px`;
  // A transformed element keeps its layout size, so a spacer gives the stage the scaled size to scroll.
  stage.style.height = `${1000 * s + 36}px`;
  board.style.marginRight = `${1600 * s - 1600}px`;
  board.style.marginBottom = `${1000 * s - 1000}px`;
  for (const ch of [...CHANNELS, 'main']) strips[ch].f.redraw();
}
window.addEventListener('resize', fit);
fit();

// Initial mix for the starting style, before anything plays.
for (const ch of CHANNELS) {
  strips[ch].send.set(composer.style.sends[ch] ?? 0.2);
  strips[ch].f.set(composer.style.mix[ch] ?? 0.65);
}
syncStyleKeys();

// For games and tinkering: window.ranger.play({ style: 'chip', seed: 123 })
window.ranger = {
  play: async ({ style, seed: s } = {}) => {
    if (s != null) {
      seed = s;
      composer = new Composer({ seed, style: style || composer.style.id, surprise: composer.surprise });
      player.composer = composer;
      player.styleId = null;
      screen.seed = seed;
    } else if (style) composer.setStyleNow(style);
    await play();
  },
  pause,
  next: () => composer.queue('next'),
  get composer() {
    return composer;
  },
  engine,
  player,
};
