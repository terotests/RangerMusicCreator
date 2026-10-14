// SPDX-License-Identifier: MIT
// Wires the desk to the engine, the composer and the player.

import { Engine } from './engine.js';
import { Composer } from './composer.js';
import { Player } from './player.js';
import { STYLES, STYLE_BY_ID, LAYERS } from './styles.js';
import { AMBIENCES } from './ambient.js';
import { Screen, SKINS } from './screen.js';
import { Recorder, download, encodeWav } from './recorder.js';
import { Tape, fmtTime } from './tape.js';
import { TapeView } from './tapeview.js';
import { VOICE_CHOICES, VOICE_LABEL } from './instruments.js';
import { connectBridge } from './bridge.js';
import { exportMidi, parseMidi, melodyTheme } from './midi.js';
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
  echo: false,
  verb: true,
  solo: new Set(),
  mute: new Set(),
  touched: {},
  targets: {},
  lastSerial: -1,
  faded: false,
  skin: 'ice',
};

const CH_LABEL = { kick: 'KICK', snare: 'SNARE', hats: 'HATS', bass: 'BASS', keys: 'CHORDS', pad: 'PAD', lead: 'LEAD', arp: 'ARP', amb: 'AMBIENCE' };
const CHANNELS = [...LAYERS, 'amb'];
const DRUMS = ['kick', 'snare', 'hats'];
const PART_HELP = {
  kick: 'the bass drum', snare: 'snare, clap or rim, plus fills', hats: 'hi-hats, shakers and cymbals', bass: 'the bassline',
  keys: 'the chords (comping)', pad: 'long held chords', lead: 'the melody', arp: 'the arpeggio', amb: 'the ambience pads above',
};

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
  el.innerHTML = `<div class="led-row" data-help="Lights when ${CH_LABEL[ch]} is sounding, red if it clips."><i class="led"></i><span>SIG/PEAK</span></div><div class="k" data-help="SEND: how much of ${CH_LABEL[ch]} goes to the echo and reverb. Turn clockwise for more."></div><span class="cap">SEND</span>`;
  $('#strips').appendChild(el);
  const channel = player.channels[ch];
  const send = knob(el.querySelector('.k'), { value: 0.3, onChange: (v) => channel.setSend(v), format: (v) => `send ${Math.round(v * 100)}%` });
  const solo = key(el, { label: 'SOLO', color: 'amber', help: `SOLO: hear only ${CH_LABEL[ch]} (and other soloed channels).`, onClick: () => toggleSet(state.solo, ch, solo) });
  const mute = key(el, { label: 'MUTE', color: 'red', help: `MUTE: silence ${CH_LABEL[ch]}.`, onClick: () => toggleSet(state.mute, ch, mute) });
  el.insertAdjacentHTML('beforeend', '<div class="divider"></div><div class="f"></div>');
  const f = fader(el.querySelector('.f'), {
    value: 0.7,
    onChange: (v) => channel.setLevel(v),
    onTouch: () => (state.touched[ch] = performance.now()),
  });
  el.querySelector('.f').dataset.help = `Fader: the volume of ${CH_LABEL[ch]}. It moves by itself while AUTO MIXING is lit; touch it and it is yours for 20 s.`;
  el.insertAdjacentHTML('beforeend', `<div class="name" data-help="Channel ${CHANNELS.indexOf(ch) + 1}: ${PART_HELP[ch]}. A dimmed name means the composer has this part resting in the current section.">${CH_LABEL[ch]}</div>`);
  let inst = null;
  if (ch !== 'amb') {
    inst = document.createElement('button');
    inst.className = 'inst';
    inst.dataset.help = `Instrument of ${CH_LABEL[ch]}: click for the next sound, shift-click for the previous. AUTO lets the style choose.`;
    inst.addEventListener('click', (e) => cycleInstrument(ch, e.shiftKey ? -1 : 1));
    el.appendChild(inst);
  }
  const row = document.createElement('div');
  row.className = 'strip-row';
  el.appendChild(row);
  const reroll = key(row, {
    tag: '♻ NEW',
    size: 'sm',
    help: ch === 'amb' ? 'NEW: pick a different ambience.' : `NEW: the composer writes a new ${CH_LABEL[ch].toLowerCase()} part (${PART_HELP[ch]}).`,
    onClick: () => {
      if (ch === 'amb') randomAmbience();
      else composer.reroll(ch);
      reroll.flash();
    },
  });
  let hold = null;
  if (ch !== 'amb') {
    hold = key(row, {
      tag: 'HOLD',
      size: 'sm',
      color: 'green',
      help: `HOLD: keep this ${CH_LABEL[ch].toLowerCase()} part as it is; the composer will not rewrite it (♻ still can).`,
      onClick: () => setHold(ch, !composer.hold.has(ch)),
    });
  }
  strips[ch] = { el, send, f, led: el.querySelector('.led'), solo, mute, channel, inst, hold };
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

function setHold(ch, on) {
  composer.setHold(ch, on);
  syncHolds();
  screen.log(on ? `HOLD ${CH_LABEL[ch]}` : `${CH_LABEL[ch]} FREE`);
}

function syncHolds() {
  for (const ch of LAYERS) strips[ch].hold.on(composer.hold.has(ch));
}

// ---- instruments ---------------------------------------------------------------

function instrumentChoices(ch) {
  return DRUMS.includes(ch) ? STYLES.map((s) => s.id) : VOICE_CHOICES[ch];
}

function instrumentLabel(ch, id) {
  if (DRUMS.includes(ch)) return `${STYLE_BY_ID[id].name} ${ch.toUpperCase()}`;
  return VOICE_LABEL[id] || id;
}

function setInstrument(ch, id) {
  const table = DRUMS.includes(ch) ? player.kit : player.voice;
  if (id == null || id === 'auto') delete table[ch];
  else if (instrumentChoices(ch).includes(id)) table[ch] = id;
  else throw new Error(`unknown instrument ${id} for ${ch}; choose from ${instrumentChoices(ch).join(', ')}`);
  syncInstruments();
  return currentInstrument(ch);
}

function currentInstrument(ch) {
  const table = DRUMS.includes(ch) ? player.kit : player.voice;
  if (table[ch]) return { id: table[ch], label: instrumentLabel(ch, table[ch]), auto: false };
  const id = DRUMS.includes(ch) ? composer.style.id : composer.style[ch].voice;
  return { id, label: instrumentLabel(ch, id), auto: true };
}

function cycleInstrument(ch, dir) {
  const list = ['auto', ...instrumentChoices(ch)];
  const table = DRUMS.includes(ch) ? player.kit : player.voice;
  const i = list.indexOf(table[ch] || 'auto');
  const next = list[(i + dir + list.length) % list.length];
  setInstrument(ch, next);
  screen.log(`${CH_LABEL[ch]} → ${currentInstrument(ch).label}${next === 'auto' ? ' (AUTO)' : ''}`);
}

function syncInstruments() {
  for (const ch of LAYERS) {
    const cur = currentInstrument(ch);
    const b = strips[ch].inst;
    b.textContent = cur.auto ? `AUTO·${cur.label}` : cur.label;
    b.classList.toggle('auto', cur.auto);
  }
}

// ---- ambience --------------------------------------------------------------

const pads = AMBIENCES.map((a, i) => {
  const b = document.createElement('button');
  b.className = 'pad';
  b.style.setProperty('--c', a.color);
  b.innerHTML = `${i + 1}<span>${a.name}</span>`;
  b.setAttribute('aria-label', `Ambience ${a.name}`);
  b.dataset.help = `Ambience ${i + 1}: ${a.name.toLowerCase()}. Click to add or remove it (goes to the AMBIENCE channel).`;
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

$('#amb-level').dataset.help = 'LEVEL: volume of the ambience (same as the AMBIENCE fader).';
knob($('#amb-level'), { value: 0.75, onChange: (v) => strips.amb.f.set(v), format: (v) => `ambience ${Math.round(v * 100)}%` });
const ambAuto = key($('.amb-side'), {
  tag: 'AUTO',
  color: 'green',
  help: 'AUTO: each style picks its own ambience. Touching a pad switches this off.',
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
const autoMixKey = key(fxKeys, { num: 1, label: 'AUTO<br>MIXING', color: 'green', help: 'AUTO MIXING: the faders ride themselves to suit each section, like an engineer would.', onClick: () => { state.autoMix = !state.autoMix; autoMixKey.on(state.autoMix); } });
const echoKey = key(fxKeys, { num: 2, label: 'ECHO', color: 'green', help: 'ECHO: turns the echo (delay) on. Off by default; channel SEND knobs and the ECHO knob set how much.', onClick: () => { state.echo = !state.echo; echoKey.on(state.echo); applyReturns(); } });
const verbKey = key(fxKeys, { num: 3, label: 'REVERB', color: 'green', help: 'REVERB: the room around the sound. Channel SEND knobs and the REVERB knob set how much.', onClick: () => { state.verb = !state.verb; verbKey.on(state.verb); applyReturns(); } });
const tapeKey = key(fxKeys, {
  num: 4,
  label: 'TAPE<br>WOBBLE',
  color: 'green',
  help: 'TAPE WOBBLE: old-cassette pitch wobble on everything. Lo-fi and Dub turn it on by themselves.',
  onClick: () => {
    player.autoTape = false;
    engine.setTape(!engine.tape);
    tapeKey.on(engine.tape);
  },
});
autoMixKey.on(true);
echoKey.on(false);
verbKey.on(true);

const fxKnobs = $('#fx-knobs');
function fxKnob(label, opts) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  wrap.dataset.help = label.help;
  wrap.innerHTML = `<div class="led-row"><i class="led sig"></i><span>${label.led}</span></div><div class="k"></div><span class="cap">${label.cap}</span>`;
  fxKnobs.appendChild(wrap);
  return knob(wrap.querySelector('.k'), opts);
}
const echoLevel = fxKnob({ led: 'RETURN', cap: 'ECHO', help: 'ECHO knob: overall echo level (needs ECHO on). Turn clockwise for more.' }, { value: 0.7, onChange: applyReturns, format: (v) => `echo ${Math.round(v * 100)}%` });
const verbLevel = fxKnob({ led: 'RETURN', cap: 'REVERB', help: 'REVERB knob: overall reverb level.' }, { value: 0.8, onChange: applyReturns, format: (v) => `reverb ${Math.round(v * 100)}%` });
const surprise = fxKnob({ led: 'CHAOS', cap: 'SURPRISE', help: 'SURPRISE: how often the composer changes things on you (key, groove, melody, tempo).' }, { value: 0.5, onChange: (v) => (composer.surprise = v), format: (v) => `surprise ${Math.round(v * 100)}%` });
const tempo = fxKnob({ led: 'BPM', cap: 'TEMPO', help: 'TEMPO: beats per minute. Each style starts at its own tempo.' }, { value: composer.bpm, min: 50, max: 180, def: composer.bpm, onChange: (v) => (composer.bpm = Math.round(v)), format: (v) => `${Math.round(v)} BPM` });

function applyReturns() {
  const t = engine.now;
  player.echoOn = state.echo;
  engine.echoReturn.gain.setTargetAtTime(state.echo ? echoLevel.get() : 0, t, 0.05);
  engine.verbReturn.gain.setTargetAtTime(state.verb ? verbLevel.get() * 1.1 : 0, t, 0.05);
}
applyReturns();

// ---- side ------------------------------------------------------------------------

const side = $('#side');
const helpKey = key(side, { label: 'HELP', help: 'HELP: how the desk works.', onClick: () => ($('#help').hidden = false) });
helpKey.el.dataset.glyph = '?';
key(side, {
  label: 'SKIN',
  help: 'SKIN: screen colours ice, lime, ember (from EVG Player).',
  onClick: () => {
    const names = Object.keys(SKINS);
    state.skin = names[(names.indexOf(state.skin) + 1) % names.length];
    screen.skin = SKINS[state.skin];
    toast(`Skin: ${state.skin}`);
  },
});
const masterWrap = document.createElement('div');
masterWrap.className = 'ctl';
masterWrap.dataset.help = 'VOLUME: listening volume.';
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
  help: 'OUTPUT FADE: fade everything out over 3 seconds, press again to fade back in.',
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
const loopKey = key(perf, {
  label: 'LOOP',
  color: 'green',
  help: 'LOOP: repeat the last 4 bars exactly as they played, until you press it again. For catching a good moment.',
  onClick: () => setLoop(player.loop ? 0 : 4),
});
const freezeKey = key(perf, { label: 'FREEZE', color: 'blue', help: 'FREEZE: stay in this section (it keeps playing its variations) instead of moving on.', onClick: () => { composer.freeze = !composer.freeze; freezeKey.on(composer.freeze); } });
const throwKey = key(perf, {
  label: 'ECHO<br>THROW',
  color: 'amber',
  help: 'ECHO THROW: a dub-style burst of echo on snare, chords and melody (works even with ECHO off).',
  onClick: () => {
    const t = engine.now + 0.02;
    const beat = 60 / composer.bpm;
    if (!state.echo) {
      const g = engine.echoReturn.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(echoLevel.get(), t);
      g.setValueAtTime(echoLevel.get(), t + beat * 4);
      g.linearRampToValueAtTime(0, t + beat * 6);
    }
    for (const ch of ['snare', 'keys', 'lead', 'arp']) player.channels[ch].throwEcho(t, beat);
    engine.echoSpin(t, beat * 2);
    throwKey.flash(400);
    screen.log('ECHO THROW (YOU)');
  },
});
const filterKey = key(perf, {
  label: 'FILTER<br>SWEEP',
  color: 'amber',
  help: 'FILTER SWEEP: closes a low-pass filter over two bars and opens it again.',
  onClick: () => {
    engine.sweep(engine.now + 0.02, (60 / composer.bpm) * 8, 'lowpass');
    filterKey.flash(600);
    screen.log('FILTER SWEEP (YOU)');
  },
});
const halfKey = key(perf, { label: 'HALF-<br>TIME', color: 'blue', help: 'HALF-TIME: drums at half speed, everything else as is.', onClick: () => { composer.halftime = !composer.halftime; halfKey.on(composer.halftime); } });

const songRow = $('#song .keys');
key(songRow, { label: 'NEW<br>SONG', color: 'white', help: 'NEW SONG: a new random seed in the same style.', onClick: () => newSong(composer.style.id) });
const recKey = key(songRow, { label: 'REC', color: 'red', help: 'REC: press to start, press again to save everything in between as a WAV file (any length).', onClick: toggleRec });
key(songRow, { label: 'LINK', color: 'white', help: 'LINK: copy a link that starts this seed and style.', onClick: copyLink });
key(songRow, {
  label: 'SURPRISE<br>ME',
  color: 'white',
  help: 'SURPRISE ME: a random style and a new seed.',
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
    help: `Style ${i + 1}: ${s.name}, ${s.mood}. Changes on the next bar.`,
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
const breakKey = key(tr.querySelector('.tr-top'), { label: 'BREAK', color: 'blue', help: 'BREAK: go to a breakdown (drums out) on the next bar.', onClick: () => { composer.queue('break'); breakKey.on(true); } });
const buildKey = key(tr.querySelector('.tr-top'), { label: 'BUILD', color: 'blue', help: 'BUILD: a build-up (snare roll, rising filter) that leads to a drop.', onClick: () => { composer.queue('build'); buildKey.on(true); } });
const journeyKey = key(tr.querySelector('.tr-top'), { label: 'JOURNEY', color: 'green', help: 'JOURNEY: wander to a new style by itself every few sections.', onClick: () => { player.journey = !player.journey; journeyKey.on(player.journey); } });
const nextKey = key(tr.querySelector('.tr-big'), { tag: 'NEXT', size: 'big cut', help: 'NEXT: jump to the next section on the next bar.', onClick: () => { composer.queue('next'); nextKey.flash(300); } });
const playKey = key(tr.querySelector('.tr-big'), { tag: 'PLAY', size: 'big play', color: 'green', help: 'PLAY / PAUSE (space).', onClick: () => (player.playing ? pause() : play()) });
nextKey.el.dataset.glyph = '⏭';
playKey.el.dataset.glyph = '▶';

function setLoop(bars) {
  const n = player.setLoop(bars);
  loopKey.on(n > 0);
  screen.log(n ? `LOOP ${n} BAR${n > 1 ? 'S' : ''}` : 'LOOP OFF');
  return n;
}

async function play() {
  stopPreview();
  tape.armed = true;
  await player.start();
  playKey.on(true);
  playKey.el.dataset.glyph = '❚❚';
  syncStyleKeys();
}

function pause() {
  player.stop();
  tape.armed = false;
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
  syncInstruments();
});

player.on('plan', ({ time, info, snapshot }) => {
  if (snapshot && !info.looping) {
    tape.mark(time, { kind: 'section', section: info.section, style: info.styleName, key: info.key, bpm: info.bpm, snapshot });
  }
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
  syncHolds();
  lockKey.on(composer.themeLock);
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
  if (cur && cur.serial !== state.lastSerial) {
    state.lastSerial = cur.serial;
    played.push({ frame: tape.total, events: cur.events, info: cur.info });
    if (played.length > 4000) played.shift();
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
  screen.draw(player.playing || !!preview, rec);
  if (preview) tapeView.head = preview.from + (engine.now - preview.start) * tape.rate;
  tapeView.draw();
  updateTapeReadout();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep the ambience going (and the scheduler honest) when the tab is in the background.
setInterval(() => !player.playing && player.tick(), 100);

// ---- keyboard, help, layout -------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (e.target.closest('button') && (k === ' ' || k === 'enter')) return;
  if (k === ' ') {
    e.preventDefault();
    player.playing ? pause() : play();
  } else if (k >= '1' && k <= '8') pickStyle(STYLES[Number(k) - 1].id);
  else if (k === 'n') nextKey.el.click();
  else if (k === 'l') loopKey.el.click();
  else if (k === 'm') bookmark();
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
  let s = Math.min((w - 24) / 1600, (h - 24) / 1250);
  if (s < 0.6) s = (w - 16) / 1600;
  // On a phone the desk would be too small to touch: keep it usable and let it scroll sideways.
  s = Math.max(0.5, Math.min(s, 1.35));
  board.style.transform = `scale(${s})`;
  board.style.left = `${Math.max(8, (w - 1600 * s) / 2)}px`;
  // A transformed element keeps its layout size, so a spacer gives the stage the scaled size to scroll.
  stage.style.height = `${1250 * s + 36}px`;
  board.style.marginRight = `${1600 * s - 1600}px`;
  board.style.marginBottom = `${1250 * s - 1250}px`;
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

// ---- session tape ---------------------------------------------------------------------

const tape = new Tape(engine, 10);
tape.init().catch((e) => console.warn('Session tape unavailable:', e));
let preview = null;
let selection = null;
const tapeView = new TapeView($('#tape'), tape, (sel) => {
  selection = sel;
  stopPreview();
});

const tapeKeys = $('#tape-keys');
key(tapeKeys, { label: 'LISTEN', color: 'green', help: 'LISTEN: pause the live music and play the selected stretch (or the last 30 s) from the tape. PLAY returns to live.', onClick: () => (preview ? stopPreview() : listen()) });
key(tapeKeys, { label: 'GO BACK', color: 'amber', help: 'GO BACK: the composer returns to the selected section and plays on from there, exactly as it went, until you change something.', onClick: () => goBack() });
key(tapeKeys, { label: 'SAVE WAV', color: 'white', help: 'SAVE WAV: export the selected stretch (or the whole tape) as a WAV file.', onClick: () => saveTape() });
const markKey = key(tapeKeys, { label: '★ MARK', color: 'amber', help: 'MARK: bookmark this moment on the tape (key M).', onClick: () => bookmark() });

function rangeOrLast(seconds) {
  if (selection && selection.to > selection.from) return selection;
  return { from: Math.max(tape.firstFrame, tape.total - seconds * tape.rate), to: tape.total };
}

function listen(range = rangeOrLast(30)) {
  if (!tape.total) return toast('Nothing on the tape yet');
  if (player.playing) pause();
  stopPreview();
  const buf = tape.slice(range.from, range.to);
  const src = engine.ctx.createBufferSource();
  src.buffer = buf;
  src.connect(engine.ctx.destination);
  src.connect(engine.analyser);
  engine.ctx.resume();
  src.start();
  preview = { src, from: range.from, to: range.to, start: engine.now };
  src.onended = () => {
    if (preview && preview.src === src) stopPreview();
  };
  screen.log(`LISTENING ${fmtTime(range.from / tape.rate)}–${fmtTime(range.to / tape.rate)}`);
  return { from: range.from / tape.rate, to: range.to / tape.rate };
}

function stopPreview() {
  if (!preview) return;
  const p = preview;
  preview = null;
  tapeView.head = null;
  try {
    p.src.stop();
  } catch {}
  p.src.disconnect();
}

function goBack(markerId) {
  let m = markerId != null ? tape.marker(markerId) : null;
  if (markerId != null && !m) throw new Error(`no marker ${markerId}`);
  // A bookmark goes back to the start of the section it sits in.
  if (m && !m.snapshot) m = tape.sectionAt(m.frame)?.marker;
  if (!m) {
    const at = selection ? selection.from : null;
    const sec = at != null ? tape.sectionAt(at + 1) : null;
    m = sec?.marker;
  }
  if (!m || !m.snapshot) {
    toast('Select a section on the tape first');
    throw new Error('no section selected');
  }
  player.setLoop(0);
  loopKey.on(false);
  composer.freeze = false;
  freezeKey.on(false);
  composer.restore(m.snapshot);
  player.styleId = null;
  seed = composer.seed;
  screen.seed = seed;
  screen.log(`BACK TO ${m.section.toUpperCase()} @ ${fmtTime(m.frame / tape.rate)}`);
  if (!player.playing) play();
  return { section: m.section, style: m.style, at: m.frame / tape.rate };
}

function tapeWav(range) {
  return encodeWav(tape.slice(range.from, range.to));
}

function saveTape(range = selection && selection.to > selection.from ? selection : { from: tape.firstFrame, to: tape.total }) {
  if (!tape.total) return toast('Nothing on the tape yet');
  const name = `ranger-${composer.style.id}-${seed}-${fmtTime(range.from / tape.rate).replace(':', 'm')}s.wav`;
  download(tapeWav(range), name);
  toast(`Saved ${name}`);
}

function bookmark() {
  if (!tape.total) return null;
  const m = tape.bookmark(`★ ${fmtTime(tape.seconds)}`);
  markKey.flash(300);
  screen.log(`BOOKMARK ${fmtTime(tape.seconds)}`);
  return m;
}

function updateTapeReadout() {
  let text = `TAPE ${fmtTime(tape.seconds)}`;
  if (tape.firstFrame > 0) text += ` (from ${fmtTime(tape.firstFrame / tape.rate)})`;
  if (selection) {
    const len = (selection.to - selection.from) / tape.rate;
    text += ` · SEL ${fmtTime(selection.from / tape.rate)} +${fmtTime(len)}`;
    if (selection.marker) text += ` ${selection.marker.section.toUpperCase()}`;
  }
  if (preview) text = `▶ LISTENING · ${text}`;
  $('#tape-read').textContent = text;
}

// ---- theme memory ------------------------------------------------------------------------

const played = []; // every bar as it was heard, with its place on the tape (for MIDI export)
const memory = [null, null, null, null];
let activeSlot = -1;
const memEl = $('#memory');
key(memEl, {
  label: 'STORE',
  color: 'amber',
  help: 'STORE: keep what is playing (the loop, or the last 4 bars) in the first free memory slot as a theme.',
  onClick: () => storeTheme(),
});
const slotEls = memory.map((_, i) => {
  const b = document.createElement('button');
  b.className = 'slot';
  b.dataset.help = `Memory ${i + 1}: click to make this theme the base of the song (variations only), shift-click to clear.`;
  b.addEventListener('click', (e) => (e.shiftKey ? clearSlot(i) : recallTheme(i)));
  memEl.appendChild(b);
  return b;
});
const lockKey = key(memEl, {
  label: 'THEME<br>LOCK',
  color: 'green',
  help: 'THEME LOCK: the composer keeps the chords, bassline and melody and only varies them (drums, fills, arrangement).',
  onClick: () => {
    composer.themeLock = !composer.themeLock;
    lockKey.on(composer.themeLock);
    screen.log(composer.themeLock ? 'THEME LOCK ON' : 'THEME LOCK OFF');
  },
});

function syncSlots() {
  memory.forEach((m, i) => {
    const el = slotEls[i];
    el.classList.toggle('full', !!m);
    el.classList.toggle('active', i === activeSlot && composer.themeLock);
    el.innerHTML = m ? `<b>M${i + 1} · ${m.name}</b><span>${m.detail}</span>` : `<b>M${i + 1}</b><span>empty</span>`;
  });
}
syncSlots();

function storeTheme(slot) {
  const i = slot != null ? slot : memory.findIndex((m) => !m) >= 0 ? memory.findIndex((m) => !m) : 0;
  const bars = player.loop ? player.loop.bars : player.history.slice(-4);
  if (!bars.length) {
    toast('Play something first');
    throw new Error('nothing has played yet');
  }
  const info = bars[bars.length - 1].info;
  memory[i] = {
    name: `${info.section.toUpperCase()} ${info.styleName}`,
    detail: `${info.key} · ${info.bpm} BPM${composer.motifName ? ' · ' + composer.motifName : ''}`,
    material: composer.material(),
    bars: bars.map((b) => ({ events: b.events, info: b.info })),
    voice: { ...player.voice },
    kit: { ...player.kit },
  };
  syncSlots();
  screen.log(`STORED IN M${i + 1}`);
  return { slot: i + 1, name: memory[i].name };
}

function recallTheme(i) {
  const m = memory[i];
  if (!m) throw new Error(`memory slot ${i + 1} is empty`);
  player.setLoop(0);
  loopKey.on(false);
  composer.useMaterial(m.material, true);
  player.voice = { ...m.voice };
  player.kit = { ...m.kit };
  player.styleId = null;
  activeSlot = i;
  syncSlots();
  syncInstruments();
  lockKey.on(true);
  screen.log(`THEME M${i + 1}: ${m.name}`);
  if (!player.playing) play();
  return { slot: i + 1, name: m.name };
}

function clearSlot(i) {
  memory[i] = null;
  if (activeSlot === i) activeSlot = -1;
  syncSlots();
}

// ---- set and MIDI files ------------------------------------------------------------------

const filesEl = $('#files');
key(filesEl, { label: 'SAVE<br>SET', color: 'white', help: 'SAVE SET: save the whole session (song state, mix, instruments, theme memory) as a small file you can load later.', onClick: () => downloadText(JSON.stringify(saveSet()), `ranger-set-${composer.style.id}-${seed}.json`) });
key(filesEl, { label: 'LOAD<br>SET', color: 'white', help: 'LOAD SET: open a saved set and carry on from where it was.', onClick: () => $('#load-set').click() });
key(filesEl, { label: 'MIDI<br>OUT', color: 'white', help: 'MIDI OUT: the selected stretch of the tape (or all of it) as a MIDI file, one track per part, for any DAW.', onClick: () => downloadMidi() });
key(filesEl, { label: 'MIDI<br>IN', color: 'white', help: 'MIDI IN: open a MIDI file; its melody becomes the theme of the song (mapped to the current key and style).', onClick: () => $('#load-midi').click() });

$('#load-set').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    loadSet(JSON.parse(await f.text()));
    toast(`Loaded ${f.name}`);
  } catch (err) {
    toast(`Could not load: ${err.message}`);
  }
});
$('#load-midi').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const th = importMidi(await f.arrayBuffer(), f.name.replace(/\.midi?$/i, ''));
    toast(`Theme from ${f.name}: ${th.notes} notes`);
  } catch (err) {
    toast(`Could not read MIDI: ${err.message}`);
  }
});

function downloadText(text, name) {
  download(new Blob([text], { type: 'application/json' }), name);
}

function saveSet() {
  return {
    app: 'ranger-music-creator',
    version: 1,
    saved: new Date().toISOString(),
    seed,
    style: composer.style.id,
    composer: { ...composer.snapshot(), surprise: composer.surprise, hold: [...composer.hold], themeLock: composer.themeLock, extraThemes: composer.extraThemes },
    mixer: Object.fromEntries(CHANNELS.map((ch) => [ch, { level: strips[ch].f.get(), send: strips[ch].send.get(), mute: state.mute.has(ch), solo: state.solo.has(ch) }])),
    master: strips.main.f.get(),
    voice: player.voice,
    kit: player.kit,
    controls: status().controls,
    ambience: AMBIENCES.filter((a, i) => player.ambient.isOn(i)).map((a) => a.id),
    memory: memory.map((m) => m && { ...m, bars: undefined }),
    activeSlot,
  };
}

function loadSet(set) {
  if (set.app !== 'ranger-music-creator') throw new Error('not a Ranger set file');
  seed = set.seed;
  const c = set.composer;
  composer = new Composer({ seed, style: set.style, surprise: c.surprise ?? 0.5 });
  composer.restore(c);
  composer.hold = new Set(c.hold || []);
  composer.themeLock = !!c.themeLock;
  composer.extraThemes = c.extraThemes || [];
  player.composer = composer;
  player.styleId = null;
  player.setLoop(0);
  loopKey.on(false);
  player.voice = set.voice || {};
  player.kit = set.kit || {};
  screen.seed = seed;
  const { auto_ambience, ...controls } = set.controls || {};
  api.set(controls);
  for (const [ch, m] of Object.entries(set.mixer || {})) {
    if (!strips[ch]) continue;
    state.touched[ch] = performance.now();
    strips[ch].f.set(m.level);
    strips[ch].send.set(m.send);
    if (state.mute.has(ch) !== m.mute) strips[ch].mute.el.click();
    if (state.solo.has(ch) !== m.solo) strips[ch].solo.el.click();
  }
  if (set.master != null) strips.main.f.set(set.master);
  if (auto_ambience) api.ambience({ auto: true });
  else api.ambience({ sounds: set.ambience || [] });
  for (let i = 0; i < 4; i++) memory[i] = set.memory?.[i] || null;
  activeSlot = set.activeSlot ?? -1;
  syncSlots();
  syncHolds();
  syncInstruments();
  surprise.set(composer.surprise, true);
  screen.log(`SET LOADED · SEED ${seed}`);
  return status();
}

function midiBars(range) {
  const bars = range ? played.filter((b) => b.frame >= range.from - tape.rate * 0.2 && b.frame < range.to) : played;
  if (!bars.length) throw new Error('nothing played in that range yet');
  return bars;
}

function midiBytes(range = selection && selection.to > selection.from ? selection : null) {
  return exportMidi(midiBars(range), `Ranger ${composer.style.name} ${seed}`);
}

function downloadMidi() {
  try {
    download(new Blob([midiBytes()], { type: 'audio/midi' }), `ranger-${composer.style.id}-${seed}.mid`);
  } catch (err) {
    toast(err.message);
  }
}

function importMidi(buffer, fallbackName) {
  const th = melodyTheme(parseMidi(buffer), fallbackName);
  composer.importTheme(th);
  composer.say(`MIDI THEME: ${th.name}`);
  if (!player.playing) play();
  return { name: th.name, notes: th.notes.filter((n) => n[0] != null).length };
}

// ---- help line ---------------------------------------------------------------------------

const info = $('#info');
const defaultInfo = info.textContent;
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest('[data-help]');
  info.textContent = el ? el.dataset.help : defaultInfo;
});

// ---- control API: window.ranger, and the local MCP bridge ----------------------------------

const KNOBS = { surprise, tempo, echo: echoLevel, reverb: verbLevel, volume: vol };
const TOGGLES = {
  echo_on: [() => state.echo, () => echoKey.el.click()],
  reverb_on: [() => state.verb, () => verbKey.el.click()],
  auto_mix: [() => state.autoMix, () => autoMixKey.el.click()],
  tape_wobble: [() => engine.tape, () => tapeKey.el.click()],
  journey: [() => player.journey, () => journeyKey.el.click()],
  freeze: [() => composer.freeze, () => freezeKey.el.click()],
  half_time: [() => composer.halftime, () => halfKey.el.click()],
  auto_ambience: [() => state.autoAmb, () => ambAuto.el.click()],
};

function status() {
  const info = player.current()?.info || screen.info;
  return {
    audio: engine.ctx.state,
    playing: player.playing,
    listening_to_tape: !!preview,
    style: composer.style.id,
    styles: STYLES.map((s) => s.id),
    seed,
    bpm: composer.bpm,
    key: composer.keyName,
    section: info ? { type: info.section, bar: info.barInSection + 1, of: info.sectionBars, next: info.next, energy: +info.energy.toFixed(2), playing_parts: info.layers, chord: info.chord } : null,
    loop_bars: player.loop ? player.loop.bars.length : 0,
    controls: {
      ...Object.fromEntries(Object.entries(KNOBS).map(([k, v]) => [k, +v.get().toFixed(2)])),
      ...Object.fromEntries(Object.entries(TOGGLES).map(([k, [get]]) => [k, !!get()])),
    },
    channels: Object.fromEntries(
      CHANNELS.map((ch) => [ch, { level: +strips[ch].f.get().toFixed(2), send: +strips[ch].send.get().toFixed(2), mute: state.mute.has(ch), solo: state.solo.has(ch), instrument: ch === 'amb' ? null : currentInstrument(ch) }]),
    ),
    ambience: AMBIENCES.filter((a, i) => player.ambient.isOn(i)).map((a) => a.id),
    tape_seconds: +tape.seconds.toFixed(1),
    recording: recorder.recording,
    recent_events: screen.events.map((e) => e.msg),
  };
}

const api = {
  status,
  async play({ style, seed: s } = {}) {
    if (s != null) {
      seed = Number(s);
      composer = new Composer({ seed, style: style || composer.style.id, surprise: composer.surprise });
      player.composer = composer;
      player.styleId = null;
      screen.seed = seed;
    } else if (style) {
      if (!STYLE_BY_ID[style]) throw new Error(`unknown style ${style}`);
      if (player.playing) composer.setStyle(style);
      else composer.setStyleNow(style);
    }
    await play();
    if (engine.ctx.state !== 'running') throw new Error('The browser is blocking audio until someone clicks the page once. Click anywhere on the desk, then try again.');
    return status();
  },
  pause() {
    pause();
    stopPreview();
    return status();
  },
  setStyle({ style }) {
    pickStyle(style);
    return { style, changes: 'on the next bar' };
  },
  queue({ section }) {
    const ok = ['next', 'intro', 'verse', 'build', 'drop', 'break', 'bridge'];
    if (!ok.includes(section)) throw new Error(`section must be one of ${ok.join(', ')}`);
    composer.queue(section);
    return { queued: section };
  },
  set(controls = {}) {
    for (const [k, v] of Object.entries(controls)) {
      if (KNOBS[k]) KNOBS[k].set(Number(v));
      else if (TOGGLES[k]) {
        const [get, toggle] = TOGGLES[k];
        if (!!get() !== !!v) toggle();
      } else throw new Error(`unknown control ${k}; known: ${[...Object.keys(KNOBS), ...Object.keys(TOGGLES)].join(', ')}`);
    }
    return status().controls;
  },
  channel({ channel, level, send, mute, solo, instrument }) {
    const st = strips[channel];
    if (!st || channel === 'main') throw new Error(`channel must be one of ${CHANNELS.join(', ')}`);
    if (level != null) {
      state.touched[channel] = performance.now();
      st.f.set(Number(level));
    }
    if (send != null) st.send.set(Number(send));
    if (mute != null && state.mute.has(channel) !== !!mute) st.mute.el.click();
    if (solo != null && state.solo.has(channel) !== !!solo) st.solo.el.click();
    if (instrument != null) setInstrument(channel, instrument);
    return status().channels[channel];
  },
  instruments() {
    return Object.fromEntries(LAYERS.map((ch) => [ch, { current: currentInstrument(ch), choices: ['auto', ...instrumentChoices(ch)].map((id) => ({ id, label: id === 'auto' ? 'AUTO' : instrumentLabel(ch, id) })) }]));
  },
  newPart({ part }) {
    if (part === 'amb') randomAmbience();
    else if (LAYERS.includes(part)) composer.reroll(part);
    else throw new Error(`part must be one of ${CHANNELS.join(', ')}`);
    return { rewritten: part };
  },
  ambience({ sounds, auto }) {
    if (auto) {
      if (!state.autoAmb) ambAuto.el.click();
    } else {
      const ids = sounds || [];
      const bad = ids.filter((id) => !AMBIENCES.some((a) => a.id === id));
      if (bad.length) throw new Error(`unknown ambience ${bad.join(', ')}; choose from ${AMBIENCES.map((a) => a.id).join(', ')}`);
      state.autoAmb = false;
      ambAuto.on(false);
      player.ambient.setOnly(ids);
      syncPads();
    }
    return status().ambience;
  },
  loop({ bars }) {
    return { loop_bars: setLoop(Number(bars) || 0) };
  },
  echoThrow() {
    throwKey.el.click();
    return { ok: true };
  },
  filterSweep() {
    filterKey.el.click();
    return { ok: true };
  },
  newSong({ style, seed: s } = {}) {
    if (s != null) return api.play({ style, seed: s });
    newSong(style || composer.style.id);
    return status();
  },
  bookmark() {
    const m = bookmark();
    return m ? { id: m.id, at: m.frame / tape.rate } : { error: 'nothing on the tape yet' };
  },
  markers() {
    return tape.markers.map((m) => ({ id: m.id, kind: m.kind, at: +(m.frame / tape.rate).toFixed(2), section: m.section, style: m.style, key: m.key, bpm: m.bpm, label: m.label }));
  },
  goBack({ marker }) {
    return goBack(marker);
  },
  // Range by marker ids (a section runs to the next section) or seconds.
  range({ from_marker, to_marker, from_seconds, to_seconds, last_seconds } = {}) {
    const r = tape.rate;
    let from = tape.firstFrame;
    let to = tape.total;
    if (last_seconds != null) from = to - last_seconds * r;
    if (from_seconds != null) from = from_seconds * r;
    if (to_seconds != null) to = to_seconds * r;
    if (from_marker != null) {
      const m = tape.marker(from_marker);
      if (!m) throw new Error(`no marker ${from_marker}`);
      from = m.frame;
      if (to_marker == null && to_seconds == null && m.kind === 'section') to = tape.sectionAt(m.frame + 1).to;
    }
    if (to_marker != null) {
      const m = tape.marker(to_marker);
      if (!m) throw new Error(`no marker ${to_marker}`);
      to = m.kind === 'section' ? tape.sectionAt(m.frame + 1).to : m.frame;
    }
    from = Math.max(tape.firstFrame, from);
    to = Math.min(tape.total, to);
    if (to <= from) throw new Error('empty range (is anything on the tape yet?)');
    return { from, to };
  },
  listen(args = {}) {
    return listen(api.range(args.last_seconds == null && args.from_marker == null && args.from_seconds == null ? { last_seconds: 30, ...args } : args));
  },
  async exportWav(args = {}) {
    const range = api.range(args);
    const blob = tapeWav(range);
    const b64 = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.readAsDataURL(blob);
    });
    return { seconds: +((range.to - range.from) / tape.rate).toFixed(2), style: composer.style.id, seed, wav_base64: b64 };
  },
  hold({ part, on }) {
    if (!LAYERS.includes(part)) throw new Error(`part must be one of ${LAYERS.join(', ')}`);
    setHold(part, on !== false);
    return { held: [...composer.hold] };
  },
  storeTheme({ slot } = {}) {
    return storeTheme(slot != null ? Number(slot) - 1 : undefined);
  },
  recallTheme({ slot }) {
    return recallTheme(Number(slot) - 1);
  },
  memory() {
    return memory.map((m, i) => (m ? { slot: i + 1, name: m.name, detail: m.detail, active: i === activeSlot && composer.themeLock } : { slot: i + 1, empty: true }));
  },
  themeLock({ on }) {
    if (composer.themeLock !== !!on) lockKey.el.click();
    return { theme_lock: composer.themeLock };
  },
  saveSet() {
    return saveSet();
  },
  loadSet({ set }) {
    return loadSet(typeof set === 'string' ? JSON.parse(set) : set);
  },
  exportMidi(args = {}) {
    const has = ['from_marker', 'to_marker', 'from_seconds', 'to_seconds', 'last_seconds'].some((k) => args[k] != null);
    const bytes = exportMidi(midiBars(has ? api.range(args) : null), `Ranger ${composer.style.name} ${seed}`);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return { style: composer.style.id, seed, midi_base64: btoa(bin) };
  },
  importMidi({ midi_base64, name }) {
    const bin = atob(midi_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return importMidi(bytes.buffer, name || 'MIDI THEME');
  },
};

window.ranger = {
  ...api,
  next: () => composer.queue('next'),
  get composer() {
    return composer;
  },
  engine,
  player,
  tape,
};

connectBridge(api, (connected) => {
  if (connected) screen.log('MCP CONNECTED');
});
syncInstruments();
