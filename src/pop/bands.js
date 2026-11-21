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

const tamb = voice((ctx, out, ev, t) => hatDrum(ctx, out, t, ev.v, { color: 6500, gain: 0.16, decay: 0.12 }, false), 0.4);

export const POP_SECTION_OF = {
  kick: 'drums', snare: 'drums', clap: 'drums', hat: 'drums', crash: 'drums', etom: 'drums', sweep: 'drums', tamb: 'drums',
  bass: 'bass', mbass: 'bass', pbass: 'bass',
  hpsi: 'keys', ep: 'keys', piano: 'keys', organ: 'keys', arp: 'keys', bell: 'keys', gtr: 'keys', stab: 'keys',
  pad: 'pads', str: 'pads', vox: 'pads', pump: 'pads',
  lead: 'lead', moog: 'lead', saw: 'lead', pluck: 'lead', brass: 'lead', flute: 'lead',
};

export const POP_SECTIONS = [
  ['drums', 'DRUMS'],
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
    kick: V.kick, snare: V.snare, clap: V.clap, hat: V.hat, crash: V.crash, etom: V.etom, sweep: V.sweep, tamb,
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
    kick: seat(0, 0, 0.72), snare: seat(0.04, 0.1, 0.85), clap: seat(-0.06, 0.1, 0.8), hat: seat(0.3, 0.15, 0.36),
    crash: seat(-0.3, 0.15, 0.55), etom: seat(-0.2, 0.1, 0.8), sweep: seat(0, 0.2, 0.55), tamb: seat(0.45, 0.2, 0.5),
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
