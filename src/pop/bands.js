// SPDX-License-Identifier: MIT
// The Pop Machine band for the Orchestra engine (src/symphony/orchestra.js):
// every sound is synthesized at play time, from a harpsichord and a 1970s
// staccato synth to power-chord guitar, supersaws and a pumping pad. No samples.

import * as V from '../retro/voices.js';
import { playNote, hat as hatDrum, kick as kickDrum, snare as snareDrum, driveCurve } from '../instruments.js';
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
export const metalHat = voice((ctx, out, ev, t) => {
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
export const popSnare = voice((ctx, out, ev, t) => {
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

// ---- MODERN: the sub bass and its kit ---------------------------------------------

// Sub bass, the lead voice of the MODERN machines. A pure sine for the floor,
// a driven triangle through a low-pass so the line is heard on small speakers
// too, and a quiet octave. Long notes glide into each other (ev.glide), can
// bend up a little at the end (ev.rise semitones, from ev.riseAt of the note)
// and duck on every beat where the kick hits (ev.spb: the sidechain pump).
const subLast = new WeakMap();
export const subBass = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const end = t + dur;
  const stop = end + 0.3;
  const prev = subLast.get(ctx);
  subLast.set(ctx, { m: ev.m + (ev.rise || 0), end });
  const from = ev.glide && prev && Math.abs(prev.end - t) < 0.12 ? mtof(prev.m) : null;
  const v = Math.max(0.05, Math.min(1, ev.v));
  const bend = (param, mult) => {
    // A new note starts a fifth high and drops into place: the 808 boom.
    param.setValueAtTime((from ?? f * 1.5) * mult, t);
    param.exponentialRampToValueAtTime(f * mult, t + (from ? 0.07 : 0.035));
    if (ev.rise) {
      const r0 = Math.max(t + 0.08, t + dur * (ev.riseAt ?? 0.6));
      param.setValueAtTime(f * mult, r0);
      param.exponentialRampToValueAtTime(f * mult * Math.pow(2, ev.rise / 12), Math.max(r0 + 0.05, end));
    }
  };
  const mix = ctx.createGain();
  mix.gain.value = 1;
  const sine = ctx.createOscillator();
  sine.type = 'sine';
  bend(sine.frequency, 1);
  const sg = ctx.createGain();
  sg.gain.value = 0.8;
  sine.connect(sg).connect(mix);
  const oct = ctx.createOscillator();
  oct.type = 'sine';
  bend(oct.frequency, 2);
  const og = ctx.createGain();
  og.gain.value = 0.05;
  oct.connect(og).connect(mix);
  const tri = ctx.createOscillator();
  tri.type = 'triangle';
  bend(tri.frequency, 1);
  const tg = ctx.createGain();
  tg.gain.value = 0.5;
  const ws = ctx.createWaveShaper();
  ws.curve = driveCurve(ctx, 0.75);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(260 + 240 * v, t);
  lp.frequency.setTargetAtTime(150 + 60 * v, t + 0.02, 0.12);
  const tl = ctx.createGain();
  tl.gain.value = 0.3;
  tri.connect(tg).connect(ws).connect(lp).connect(tl).connect(mix);
  // The pump: down on each beat, back up before the next one.
  const pump = ctx.createGain();
  pump.gain.value = 1;
  if (ev.spb) {
    const first = ((1 - (ev.b % 1)) % 1) * ev.spb;
    for (let bt = t + first; bt < end - 0.02; bt += ev.spb) {
      pump.gain.setValueAtTime(0.28, bt);
      pump.gain.setTargetAtTime(1, bt + 0.012, ev.spb * 0.16);
    }
  }
  const amp = ctx.createGain();
  const peak = 0.8 * v;
  amp.gain.setValueAtTime(from ? peak : 0, t);
  if (!from) amp.gain.linearRampToValueAtTime(peak, t + 0.008);
  amp.gain.setValueAtTime(peak, Math.max(t + 0.01, end - 0.01));
  amp.gain.setTargetAtTime(0, Math.max(t + 0.01, end - 0.01), 0.025);
  mix.connect(pump).connect(amp).connect(out);
  for (const o of [sine, oct, tri]) {
    o.start(t);
    o.stop(stop);
  }
}, 0.4);

// The MODERN kick: a booming 808-style drum, a long warm sine body that
// falls to about 36 Hz with a short click on top, so the beat is felt as much as heard. The
// sub bass ducks under it. 'boom' is the heavier hit that ends the breakdown.
export const danceKick = voice((ctx, out, ev, t) => kickDrum(ctx, out, t, ev.v, ev.a === 'boom'
  ? { pitch: 40, end: 30, decay: 0.9, click: 0.25, drive: 0.4, gain: 1.4 }
  : { pitch: 45, end: 36, decay: 0.55, click: 0.15, drive: 0.38, gain: 1.3 }), 0.8);

// The MODERN clap: drier and softer than the Italo clap, and never the same
// twice. Each hit picks its own colour and length; 'soft' is a ghost, 'flam'
// two hands a moment apart.
export const danceClap = voice((ctx, out, ev, t) => {
  const v = Math.max(0.05, Math.min(1, ev.v));
  const tone = 950 + Math.random() * 450 + (ev.a === 'soft' ? -150 : 0);
  const decay = (ev.a === 'soft' ? 0.1 : 0.16) + Math.random() * 0.05;
  snareDrum(ctx, out, t, v, { kind: 'clap', tone, decay, gain: 0.22 });
  if (ev.a === 'flam') snareDrum(ctx, out, t + 0.018, v * 0.6, { kind: 'clap', tone: tone * 1.12, decay: decay * 0.8, gain: 0.22 });
}, 0.5);

// The MODERN theme lead: a wide supersaw. Seven saws spread ±28 cents and
// split left and right, a square an octave down for weight, a soft drive and
// a filter that opens on each note, so the melody is thick, not thin.
const SAW_SPREAD = [-28, -17, -8, 0, 8, 17, 28];
const fatLead = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const v = Math.max(0.05, Math.min(1, ev.v));
  const end = t + Math.max(0.08, dur);
  const stop = end + 0.5;
  const L = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  const R = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  if (L.pan) {
    L.pan.value = -0.55;
    R.pan.value = 0.55;
  }
  const pre = ctx.createGain();
  pre.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(7, t + 0.45);
  lfo.connect(lg);
  lfo.start(t);
  lfo.stop(stop);
  SAW_SPREAD.forEach((dt, k) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = dt;
    lg.connect(o.detune);
    const g = ctx.createGain();
    g.gain.value = dt === 0 ? 0.22 : 0.16;
    o.connect(g).connect(dt === 0 ? pre : k < 3 ? L : R);
    o.start(t);
    o.stop(stop);
  });
  L.connect(pre);
  R.connect(pre);
  const sq = ctx.createOscillator();
  sq.type = 'square';
  sq.frequency.value = f / 2;
  const sg = ctx.createGain();
  sg.gain.value = 0.14;
  sq.connect(sg).connect(pre);
  sq.start(t);
  sq.stop(stop);
  const ws = ctx.createWaveShaper();
  ws.curve = driveCurve(ctx, 0.3);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.9;
  lp.frequency.setValueAtTime(1800 + 1500 * v, t);
  lp.frequency.linearRampToValueAtTime(4200 + 3000 * v, t + 0.03);
  lp.frequency.setTargetAtTime(2400 + 1600 * v, t + 0.04, 0.3);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 120;
  const amp = ctx.createGain();
  const peak = 0.2 * v;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.012);
  amp.gain.setTargetAtTime(peak * 0.82, t + 0.012, 0.15);
  amp.gain.setTargetAtTime(0, end, 0.09);
  pre.connect(ws).connect(lp).connect(hp).connect(amp).connect(out);
}, 0.6);

// MODERN violins: an ensemble, not one synth. Three players, each two saws
// with its own vibrato speed and a small scoop up into the note, a short
// bow-noise attack, and a body of resonances (about 450 Hz, 1.3 kHz and
// 3 kHz) that gives the sound its wooden, nasal character.
const VLN = [[-9, 4.7, 11], [3, 5.4, 13], [12, 6.1, 9]];
const violins = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const v = Math.max(0.05, Math.min(1, ev.v));
  const short = ev.a === 'stac' || dur < 0.25;
  const end = t + Math.max(0.1, dur);
  const stop = end + 0.8;
  const mix = ctx.createGain();
  mix.gain.value = 1;
  VLN.forEach(([dt, rate, depth], k) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(depth, t + 0.35 + 0.1 * k);
    lfo.connect(lg);
    lfo.start(t);
    lfo.stop(stop);
    for (const d2 of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.setValueAtTime(dt + d2 - 22, t);
      o.detune.linearRampToValueAtTime(dt + d2, t + 0.07 + 0.02 * k);
      lg.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = 0.12;
      o.connect(g).connect(mix);
      o.start(t);
      o.stop(stop);
    }
  });
  // The bow: a breath of band-passed noise at the start of the note.
  const len = Math.ceil(ctx.sampleRate * 0.25);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  const nbp = ctx.createBiquadFilter();
  nbp.type = 'bandpass';
  nbp.frequency.value = Math.min(9000, f * 4);
  nbp.Q.value = 1.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.05 * v, t + 0.015);
  ng.gain.exponentialRampToValueAtTime(1e-4, t + 0.2);
  n.connect(nbp).connect(ng).connect(mix);
  n.start(t);
  n.stop(t + 0.25);
  let node = mix;
  for (const [hz, q, gain] of [[450, 1.2, 5], [1300, 1.4, 4], [3000, 1.6, 3.5]]) {
    const pk = ctx.createBiquadFilter();
    pk.type = 'peaking';
    pk.frequency.value = hz;
    pk.Q.value = q;
    pk.gain.value = gain;
    node.connect(pk);
    node = pk;
  }
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 200;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6500;
  const amp = ctx.createGain();
  const peak = 0.17 * v;
  const a = short ? 0.02 : 0.09;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + a);
  amp.gain.setTargetAtTime(peak * (short ? 0.4 : 0.85), t + a, short ? 0.06 : 0.4);
  amp.gain.setTargetAtTime(0, end, short ? 0.05 : 0.18);
  node.connect(hp).connect(lp).connect(amp).connect(out);
}, 0.9);

const tamb = voice((ctx, out, ev, t) => hatDrum(ctx, out, t, ev.v, { color: 7500, gain: 0.1, decay: 0.07 }, false), 0.4);

export const POP_SECTION_OF = {
  kick: 'drums', dkick: 'drums', mclap: 'drums', snare: 'drums', clap: 'drums', hat: 'cymbals', crash: 'cymbals', etom: 'drums', sweep: 'cymbals', tamb: 'cymbals',
  bass: 'bass', sub: 'bass', mbass: 'bass', pbass: 'bass',
  hpsi: 'keys', ep: 'keys', piano: 'keys', organ: 'keys', arp: 'keys', bell: 'keys', gtr: 'keys', stab: 'keys',
  pad: 'pads', str: 'pads', horns: 'pads', vox: 'pads', pump: 'pads',
  lead: 'lead', theme: 'lead', vln: 'pads', tpluck: 'lead', moog: 'lead', saw: 'lead', pluck: 'lead', brass: 'lead', flute: 'lead',
};

export const POP_SECTIONS = [
  ['drums', 'DRUMS'],
  ['cymbals', 'CYMBALS · RISERS'],
  ['bass', 'BASS'],
  ['keys', 'KEYS · GUITAR'],
  ['pads', 'PADS & STRINGS'],
  ['lead', 'THE RIFF'],
];

export const POP_LEADS = new Set(['sub', 'theme', 'vln', 'tpluck', 'lead', 'moog', 'saw', 'pluck', 'brass', 'flute', 'hpsi', 'bell']);

const seat = (pan, depth, gain) => ({ pan, depth, gain });

export const POP_BAND = {
  sectionOf: POP_SECTION_OF,
  sections: POP_SECTIONS.map(([k]) => k),
  sets: {}, hits: {}, kit: {}, setGain: {}, ring: new Set(), ensemble: [],
  synth: {
    kick: V.kick, dkick: danceKick, mclap: danceClap, snare: popSnare, clap: V.clap, hat: metalHat, crash: V.crash, etom: V.etom, sweep: V.sweep, tamb,
    bass: V.synthBass, sub: subBass, mbass: preset('moogBass', 0.5), pbass: preset('pickBass', 0.6),
    hpsi: preset('harpsi', 1), ep: V.ep, piano: preset('popPiano', 1.5), organ: V.organ, arp: V.arp, bell: V.bell, gtr: guitar, stab: preset('stab', 0.5),
    pad: V.pad, str: V.strings, horns: V.brass, vox: V.vox, pump: preset('pumpPad', 0.4),
    lead: V.lead, theme: fatLead, vln: violins, tpluck: preset('edmPluck', 0.6), moog: preset('moogLead', 0.4), saw: preset('supersaw', 0.8), pluck: preset('edmPluck', 0.6), brass: V.brass, flute: preset('flute', 0.6),
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
    theme: V.tempoDelay(0.75, 0.3, 0.18),
    vln: V.chorus(0.002, 0.35),
    tpluck: V.tempoDelay(0.75, 0.4, 0.3),
    ep: V.chorus(0.002, 0.4),
    hpsi: V.chorus(0.0015, 0.3),
  },
  release: {}, shortRelease: {},
  seats: {
    kick: seat(0, 0, 0.72), dkick: seat(0, 0, 0.78), mclap: seat(-0.08, 0.14, 0.75), snare: seat(0.04, 0.1, 0.8), clap: seat(-0.06, 0.1, 0.8), hat: seat(0.3, 0.12, 0.5),
    crash: seat(-0.3, 0.15, 0.35), etom: seat(-0.2, 0.1, 0.8), sweep: seat(0, 0.2, 0.3), tamb: seat(0.45, 0.2, 0.4),
    bass: seat(0, 0, 0.68), sub: seat(0, 0, 0.62), mbass: seat(0, 0, 0.7), pbass: seat(0, 0, 0.7),
    hpsi: seat(-0.3, 0.2, 0.8), ep: seat(0.3, 0.15, 0.85), piano: seat(0.25, 0.15, 0.8), organ: seat(0.35, 0.25, 0.6), arp: seat(-0.35, 0.1, 0.7),
    bell: seat(0.4, 0.2, 0.7), gtr: seat(-0.25, 0.1, 0.75), stab: seat(0.2, 0.15, 0.7),
    pad: seat(0, 0.2, 0.8), horns: seat(-0.3, 0.3, 0.42), str: seat(0.2, 0.2, 0.8), vox: seat(-0.2, 0.25, 0.7), pump: seat(0, 0.1, 0.8),
    lead: seat(0.05, 0.05, 0.9), theme: seat(0.05, 0.12, 0.85), vln: seat(0.3, 0.3, 0.8), tpluck: seat(-0.15, 0.15, 0.7), moog: seat(0.05, 0.05, 0.85), saw: seat(0, 0.05, 0.85), pluck: seat(0.05, 0.05, 0.85), brass: seat(-0.15, 0.15, 0.8), flute: seat(0.1, 0.15, 0.8),
  },
};

export const POP_RANGE = {
  bass: [28, 55], sub: [23, 46], mbass: [28, 55], pbass: [28, 55],
  hpsi: [41, 96], ep: [48, 84], piano: [40, 96], organ: [36, 96], arp: [55, 96], bell: [64, 100], gtr: [38, 64], stab: [48, 84],
  pad: [45, 84], horns: [48, 76], str: [52, 88], vox: [52, 79], pump: [48, 84],
  lead: [50, 96], theme: [55, 88], vln: [55, 93], tpluck: [60, 96], moog: [50, 96], saw: [50, 96], pluck: [50, 96], brass: [48, 86], flute: [60, 96], etom: [38, 62],
};
