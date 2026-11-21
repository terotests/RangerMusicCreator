// SPDX-License-Identifier: MIT
// The Pop Machine band for the Orchestra engine (src/symphony/orchestra.js):
// every sound is synthesized at play time, from a harpsichord and a 1970s
// staccato synth to power-chord guitar, supersaws and a pumping pad. No samples.

import * as V from '../retro/voices.js';
import { playNote, hat as hatDrum, driveCurve } from '../instruments.js';
import { mtof } from '../theory.js';

// The Orchestra's synth-voice form: (ctx, out, ev, t, dur, active). A silent
// source that ends with the sound lets STOP fade and forget the voice.
function voice(make, tail = 0.8) {
  return (ctx, out, ev, t, dur, active) => {
    const g = ctx.createGain();
    g.connect(out);
    make(ctx, g, ev, t, dur);
    const keep = ctx.createConstantSource();
    keep.offset.value = 0;
    keep.connect(g);
    keep.start(t);
    keep.stop(t + dur + tail);
    const node = { src: keep, g };
    active.add(node);
    keep.onended = () => {
      active.delete(node);
      keep.disconnect();
      setTimeout(() => g.disconnect(), 200);
    };
  };
}

const preset = (name, tail = 1) => voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, name), tail);

// Power-chord guitar: root, fifth and octave from detuned saws, driven hard,
// then a speaker-like band-pass. 'stac' is palm-muted.
const guitar = voice((ctx, out, ev, t, dur) => {
  const muted = ev.a === 'stac';
  const end = t + Math.max(0.05, dur);
  const stop = end + 0.4;
  const pre = ctx.createGain();
  pre.gain.value = 0.22;
  for (const [iv, g] of [[0, 1], [7, 0.8], [12, 0.5]]) {
    for (const dt of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(ev.m + iv);
      o.detune.value = dt;
      const og = ctx.createGain();
      og.gain.value = g * 0.5;
      o.connect(og).connect(pre);
      o.start(t);
      o.stop(stop);
    }
  }
  const ws = ctx.createWaveShaper();
  ws.curve = driveCurve(ctx, 0.85);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(muted ? 1100 : 3600, t);
  if (!muted) lp.frequency.setTargetAtTime(2400, t + 0.05, 0.4);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 90;
  const amp = ctx.createGain();
  const peak = 0.16 * ev.v;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.004);
  amp.gain.setTargetAtTime(peak * (muted ? 0.15 : 0.7), t + 0.01, muted ? 0.05 : 0.8);
  amp.gain.setTargetAtTime(0, end, 0.04);
  pre.connect(ws).connect(lp).connect(hp).connect(amp).connect(out);
}, 0.5);

// Hi-hat: six square waves at inharmonic ratios (the classic drum-machine
// metal) through a band-pass and a high-pass, with a little noise for air.
// Closed hats are short and snappy; harder hits are brighter and ring a
// touch longer, soft ones are dark and tight, so the groove has dynamics.
const HAT_HZ = [205.3, 304.4, 369.6, 522.7, 540, 800];
const metalHat = voice((ctx, out, ev, t) => {
  const open = ev.a === 'open';
  const v = Math.max(0.05, Math.min(1, ev.v));
  const decay = open ? 0.18 + 0.12 * v : 0.018 + 0.04 * v * v;
  const stop = t + decay * 4 + 0.02;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 7800 + 3200 * v;
  bp.Q.value = 1.1;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6500 + 1500 * v;
  const amp = ctx.createGain();
  const peak = 0.5 * Math.pow(v, 1.5);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.0008);
  amp.gain.exponentialRampToValueAtTime(Math.max(1e-4, peak * 0.25), t + decay);
  amp.gain.exponentialRampToValueAtTime(1e-4, t + decay * 4);
  const mix = ctx.createGain();
  mix.gain.value = 0.16;
  for (const hz of HAT_HZ) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = hz * 1.7;
    o.connect(mix);
    o.start(t);
    o.stop(stop);
  }
  const air = ctx.createBufferSource();
  const len = Math.ceil(ctx.sampleRate * (decay * 4 + 0.02));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  air.buffer = buf;
  const airG = ctx.createGain();
  airG.gain.value = 0.18;
  air.connect(airG).connect(hp);
  mix.connect(bp).connect(hp).connect(amp).connect(out);
  air.start(t);
  air.stop(stop);
}, 0.5);

// Snare: a tuned drum head (two sines that drop in pitch) with a short,
// mid-range rattle. Much drier than the gated 1980s snare, so it cracks
// instead of hissing; a light 'ghost' hit is softer and duller still.
const popSnare = voice((ctx, out, ev, t) => {
  const v = Math.max(0.05, Math.min(1, ev.v));
  const ghost = ev.a === 'ghost';
  const amp = (peak, decay) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.001);
    g.gain.exponentialRampToValueAtTime(1e-4, t + decay);
    g.connect(out);
    return g;
  };
  const body = amp(0.5 * v, ghost ? 0.08 : 0.14);
  for (const [f0, f1, gg] of [[240, 175, 1], [400, 330, 0.45]]) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.05);
    const og = ctx.createGain();
    og.gain.value = gg;
    o.connect(og).connect(body);
    o.start(t);
    o.stop(t + 0.2);
  }
  const len = Math.ceil(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = ghost ? 2200 : 3200 + 1200 * v;
  bp.Q.value = 0.9;
  n.connect(bp).connect(amp((ghost ? 0.12 : 0.28) * v, ghost ? 0.05 : 0.1 + 0.04 * v));
  n.start(t);
  n.stop(t + 0.2);
}, 0.3);

const tamb = voice((ctx, out, ev, t) => hatDrum(ctx, out, t, ev.v, { color: 7500, gain: 0.1, decay: 0.07 }, false), 0.4);

export const POP_SECTION_OF = {
  kick: 'drums', snare: 'drums', clap: 'drums', hat: 'cymbals', crash: 'cymbals', etom: 'drums', sweep: 'cymbals', tamb: 'cymbals',
  bass: 'bass', mbass: 'bass', pbass: 'bass',
  hpsi: 'keys', ep: 'keys', piano: 'keys', organ: 'keys', arp: 'keys', bell: 'keys', gtr: 'keys', stab: 'keys',
  pad: 'pads', str: 'pads', vox: 'pads', pump: 'pads',
  lead: 'lead', moog: 'lead', saw: 'lead', pluck: 'lead', brass: 'lead', flute: 'lead',
};

export const POP_SECTIONS = [
  ['drums', 'DRUMS'],
  ['cymbals', 'CYMBALS · RISERS'],
  ['bass', 'BASS'],
  ['keys', 'KEYS · GUITAR'],
  ['pads', 'PADS & STRINGS'],
  ['lead', 'THE RIFF'],
];

export const POP_LEADS = new Set(['lead', 'moog', 'saw', 'pluck', 'brass', 'flute', 'hpsi', 'bell']);

const seat = (pan, depth, gain) => ({ pan, depth, gain });

export const POP_BAND = {
  sectionOf: POP_SECTION_OF,
  sections: POP_SECTIONS.map(([k]) => k),
  sets: {}, hits: {}, kit: {}, setGain: {}, ring: new Set(), ensemble: [],
  synth: {
    kick: V.kick, snare: popSnare, clap: V.clap, hat: metalHat, crash: V.crash, etom: V.etom, sweep: V.sweep, tamb,
    bass: V.synthBass, mbass: preset('moogBass', 0.5), pbass: preset('pickBass', 0.6),
    hpsi: preset('harpsi', 1), ep: V.ep, piano: preset('popPiano', 1.5), organ: V.organ, arp: V.arp, bell: V.bell, gtr: guitar, stab: preset('stab', 0.5),
    pad: V.pad, str: V.strings, vox: V.vox, pump: preset('pumpPad', 0.4),
    lead: V.lead, moog: preset('moogLead', 0.4), saw: preset('supersaw', 0.8), pluck: preset('edmPluck', 0.6), brass: V.brass, flute: preset('flute', 0.6),
  },
  fx: {
    lead: V.tempoDelay(0.75, 0.38, 0.28),
    saw: V.tempoDelay(0.75, 0.35, 0.22),
    pluck: V.tempoDelay(0.75, 0.4, 0.3),
    moog: V.tempoDelay(0.5, 0.2, 0.14),
    arp: V.tempoDelay(0.75, 0.35, 0.2),
    bell: V.tempoDelay(0.5, 0.3, 0.25),
    pad: V.chorus(0.003, 0.5),
    str: V.chorus(0.003, 0.5),
    ep: V.chorus(0.002, 0.4),
    hpsi: V.chorus(0.0015, 0.3),
  },
  release: {}, shortRelease: {},
  seats: {
    kick: seat(0, 0, 0.72), snare: seat(0.04, 0.1, 0.8), clap: seat(-0.06, 0.1, 0.8), hat: seat(0.3, 0.12, 0.5),
    crash: seat(-0.3, 0.15, 0.35), etom: seat(-0.2, 0.1, 0.8), sweep: seat(0, 0.2, 0.3), tamb: seat(0.45, 0.2, 0.4),
    bass: seat(0, 0, 0.68), mbass: seat(0, 0, 0.7), pbass: seat(0, 0, 0.7),
    hpsi: seat(-0.3, 0.2, 0.8), ep: seat(0.3, 0.15, 0.85), piano: seat(0.25, 0.15, 0.8), organ: seat(0.35, 0.25, 0.6), arp: seat(-0.35, 0.1, 0.7),
    bell: seat(0.4, 0.2, 0.7), gtr: seat(-0.25, 0.1, 0.75), stab: seat(0.2, 0.15, 0.7),
    pad: seat(0, 0.2, 0.8), str: seat(0.2, 0.2, 0.8), vox: seat(-0.2, 0.25, 0.7), pump: seat(0, 0.1, 0.8),
    lead: seat(0.05, 0.05, 0.9), moog: seat(0.05, 0.05, 0.85), saw: seat(0, 0.05, 0.85), pluck: seat(0.05, 0.05, 0.85), brass: seat(-0.15, 0.15, 0.8), flute: seat(0.1, 0.15, 0.8),
  },
};

export const POP_RANGE = {
  bass: [28, 55], mbass: [28, 55], pbass: [28, 55],
  hpsi: [41, 96], ep: [48, 84], piano: [40, 96], organ: [36, 96], arp: [55, 96], bell: [64, 100], gtr: [38, 64], stab: [48, 84],
  pad: [45, 84], str: [52, 88], vox: [52, 79], pump: [48, 84],
  lead: [50, 96], moog: [50, 96], saw: [50, 96], pluck: [50, 96], brass: [48, 86], flute: [60, 96], etom: [38, 62],
};
