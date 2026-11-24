// SPDX-License-Identifier: MIT
// Synthesized voices for the Space Age and Synthwave pages, in the Orchestra's
// synth-voice form: (ctx, out, ev, t, dur, active). Everything is made from
// oscillators and noise at play time, so nobody else owns any of it.
// Each voice goes through its own gain, registered in `active`, so STOP can
// fade it like a sample.

import { playNote, kick as kickDrum, snare as snareDrum, hat as hatDrum, crash as crashCym } from '../instruments.js';
import { mtof } from '../theory.js';

// Wraps a sound-making function so the Orchestra can stop it. `tail` is how
// long the sound may ring after the note's end.
function voice(make, tail = 0.6) {
  return (ctx, out, ev, t, dur, active) => {
    const g = ctx.createGain();
    g.connect(out);
    make(ctx, g, ev, t, dur);
    // A silent source that ends when the sound has died away: STOP fades `g`
    // and stopping this tells the Orchestra the voice is gone.
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

const noiseBufs = new WeakMap();
function noise(ctx) {
  let b = noiseBufs.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 99;
    for (let i = 0; i < d.length; i++) d[i] = ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
    noiseBufs.set(ctx, b);
  }
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.loop = true;
  return src;
}

function osc(ctx, type, f, t, stop) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.start(t);
  o.stop(stop);
  return o;
}

function env(ctx, t, { a = 0.005, peak = 1, d = 0.2, s = 0.7, end, r = 0.1 }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, Math.max(0.005, d / 3));
  if (end != null) {
    g.gain.cancelScheduledValues(Math.max(end, t + a));
    g.gain.setTargetAtTime(0, Math.max(end, t + a), Math.max(0.005, r / 3));
  }
  return g;
}

// Last pitch per player, for portamento between legato notes.
const lastPitch = new WeakMap();
function glideFrom(ctx, key, ev, t) {
  let m = lastPitch.get(ctx);
  if (!m) lastPitch.set(ctx, (m = {}));
  const prev = m[key];
  m[key] = { midi: ev.m, t };
  return ev.glide && prev && t - prev.t < 3 ? prev.midi : null;
}

// ---- Space Age ------------------------------------------------------------------

// Vibraphone: a sine with its 4th partial, a mallet tick, and the motor's tremolo.
export const vib = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const ring = Math.min(4, dur + 1.2);
  const stop = t + ring + 0.1;
  const amp = ctx.createGain();
  const peak = 0.05 + 0.3 * ev.v * ev.v;
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.003);
  amp.gain.setTargetAtTime(peak * 0.55, t + 0.003, 0.25);
  amp.gain.setTargetAtTime(0, t + Math.max(0.2, dur), ev.a === 'stac' ? 0.05 : 0.35);
  const trem = ctx.createGain();
  trem.gain.value = 0.75;
  const lfo = osc(ctx, 'sine', 5.2, t, stop);
  const lg = ctx.createGain();
  lg.gain.value = 0.25;
  lfo.connect(lg).connect(trem.gain);
  const o1 = osc(ctx, 'sine', f, t, stop);
  const o2 = osc(ctx, 'sine', f * 4, t, stop);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.35 * ev.v, t);
  g2.gain.setTargetAtTime(0, t, 0.12);
  const o3 = osc(ctx, 'sine', f * 10, t, stop);
  const g3 = ctx.createGain();
  g3.gain.setValueAtTime(0.12 * ev.v, t);
  g3.gain.setTargetAtTime(0, t, 0.02);
  o1.connect(trem);
  o2.connect(g2).connect(trem);
  o3.connect(g3).connect(trem);
  trem.connect(amp).connect(out);
}, 4.2);

// Drawbar organ (16', 8', 4', 2 2/3', 2'), a key click and a slow rotary wobble.
const DRAWBARS = { sus: [0.5, 1, 0.6, 0.35, 0.3], stac: [0.6, 1, 0.8, 0.5, 0.45], soft: [0.6, 1, 0.25, 0, 0] };
export const organ = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const end = t + dur;
  const stop = end + 0.15;
  const amp = env(ctx, t, { a: 0.006, peak: 0.035 + 0.1 * ev.v, d: 0.1, s: 1, end, r: 0.05 });
  const lfo = osc(ctx, 'sine', 6.3, t, stop);
  const lg = ctx.createGain();
  lg.gain.value = 7;
  lfo.connect(lg);
  const bars = DRAWBARS[ev.a] || DRAWBARS.sus;
  [0.5, 1, 2, 3, 4].forEach((r, k) => {
    if (!bars[k]) return;
    const o = osc(ctx, 'sine', f * r, t, stop);
    lg.connect(o.detune);
    const g = ctx.createGain();
    g.gain.value = bars[k] / (1 + k * 0.15);
    o.connect(g).connect(amp);
  });
  const n = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2500;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.06 * ev.v, t);
  ng.gain.setTargetAtTime(0, t + 0.002, 0.003);
  n.connect(bp).connect(ng).connect(out);
  n.start(t, Math.random());
  n.stop(t + 0.05);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 5200;
  amp.connect(tone).connect(out);
}, 0.3);

// Theremin: a pure tone that slides between notes, with a slow swell and a wide vibrato.
export const theremin = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const end = t + dur;
  const stop = end + 0.6;
  const from = glideFrom(ctx, 'thr', ev, t);
  const lfo = osc(ctx, 'sine', 5.6 + Math.random() * 0.6, t, stop);
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(4, t);
  lg.gain.linearRampToValueAtTime(30, t + Math.min(0.6, dur));
  lfo.connect(lg);
  const amp = env(ctx, t, { a: from != null ? 0.04 : 0.14, peak: 0.07 + 0.2 * ev.v, d: 0.4, s: 0.85, end, r: 0.22 });
  if (ev.v2 != null) amp.gain.linearRampToValueAtTime(0.07 + 0.2 * ev.v2, end);
  // the tone and a touch of its octave, sliding together
  for (const [mult, lvl] of [[1, 1], [2, 0.1]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    if (from != null) {
      o.frequency.setValueAtTime(mtof(from) * mult, t);
      o.frequency.exponentialRampToValueAtTime(f * mult, t + Math.min(0.18, dur * 0.4));
    } else {
      o.frequency.setValueAtTime(f * mult * 0.94, t);
      o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.09);
    }
    lg.connect(o.detune);
    const g = ctx.createGain();
    g.gain.value = lvl;
    o.connect(g).connect(amp);
    o.start(t);
    o.stop(stop);
  }
  amp.connect(out);
}, 0.8);

// Bird calls for the jungle: quick rising and falling chirps.
export const bird = voice((ctx, out, ev, t, dur) => {
  const n = 2 + ((ev.m * 7) % 3);
  const base = mtof(ev.m);
  for (let k = 0; k < n; k++) {
    const t0 = t + k * 0.11;
    const o = osc(ctx, 'sine', base, t0, t0 + 0.1);
    o.frequency.setValueAtTime(base * 0.8, t0);
    o.frequency.exponentialRampToValueAtTime(base * 1.35, t0 + 0.04);
    o.frequency.exponentialRampToValueAtTime(base * 0.9, t0 + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.12 * ev.v, t0 + 0.01);
    g.gain.linearRampToValueAtTime(0, t0 + 0.09);
    o.connect(g).connect(out);
  }
}, 0.6);

// Flying-saucer swoop: a wobbling sine that rises (or falls, for 'fall').
export const ufo = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const end = t + dur;
  const o = osc(ctx, 'sine', f, t, end + 0.4);
  const up = ev.a !== 'fall';
  o.frequency.setValueAtTime(up ? f / 2 : f * 2, t);
  o.frequency.exponentialRampToValueAtTime(up ? f * 2 : f / 2, end);
  const lfo = osc(ctx, 'sine', 7, t, end + 0.4);
  const lg = ctx.createGain();
  lg.gain.value = 60;
  lfo.connect(lg).connect(o.detune);
  const amp = env(ctx, t, { a: dur * 0.3, peak: 0.08 * ev.v, d: dur, s: 0.9, end, r: 0.3 });
  o.connect(amp).connect(out);
}, 1);

// ---- Synthwave ------------------------------------------------------------------

const p = (preset, extra) => voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, preset, extra), 2.5);
export const synthBass = p('synthBass');
export const pad = voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, ev.a === 'soft' ? 'glassPad' : 'warmPad'), 3.5);
export const strings = voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, 'strings'), 3);
export const brass = voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, ev.a === 'stac' ? 'stab' : 'brass'), 1);
export const ep = voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, 'epiano'), 2.5);
export const bell = voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, 'bell'), 3.5);
export const arp = voice((ctx, out, ev, t, dur) => playNote(ctx, out, t, ev.m, dur, ev.v, ev.a === 'soft' ? 'bellArp' : 'arpPluck'), 1.2);
export const lead = voice((ctx, out, ev, t, dur) => {
  const from = glideFrom(ctx, 'lead', ev, t);
  playNote(ctx, out, t, ev.m, dur, ev.v, ev.a === 'soft' ? 'chipLead' : 'sawLead', from != null ? { glideFrom: from } : {});
}, 1);

// The Space Age page's 1969 Moog-style lead (monophonic, gliding).
export const moog = voice((ctx, out, ev, t, dur) => {
  const from = glideFrom(ctx, 'moog', ev, t);
  playNote(ctx, out, t, ev.m, dur, ev.v, 'apolloMoog', from != null ? { glideFrom: from } : {});
}, 0.8);

// Radio beeps like the ones heard on the Apollo air-to-ground loop: a short
// pure tone, a little above or below 2.5 kHz.
export const beep = voice((ctx, out, ev, t) => {
  const f = ev.a === 'fall' ? 2475 : 2525;
  const o = osc(ctx, 'sine', f, t, t + 0.3);
  const g = env(ctx, t, { a: 0.004, peak: 0.05 * ev.v, d: 0.05, s: 1, end: t + 0.25, r: 0.01 });
  o.connect(g).connect(out);
}, 0.4);

// Electric guitar for the 1969 radio styles. 'soft' is clean, 'vib' a
// bluesy crunch with vibrato, 'sus' a fuzz lead, 'hit' a crunchy chord stab
// and 'stac' a palm-muted chug. Two detuned saws through a soft clipper and a
// speaker-cabinet filter, one clipper per string so chords stay clear.
const curves = new Map();
function clipCurve(k) {
  if (!curves.has(k)) {
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) {
      const x = (i / (c.length - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    curves.set(k, c);
  }
  return curves.get(k);
}
const GTR = {
  soft: { drive: 1.2, clip: 1.5, tone: 2600, a: 0.003, decay: 1.4, s: 0.15, vib: 0, gain: 0.22 },
  vib: { drive: 3, clip: 3, tone: 2400, a: 0.004, decay: 1.2, s: 0.55, vib: 22, gain: 0.2 },
  sus: { drive: 8, clip: 6, tone: 2900, a: 0.004, decay: 2, s: 0.8, vib: 18, gain: 0.15 },
  hit: { drive: 4, clip: 4, tone: 2200, a: 0.003, decay: 0.6, s: 0.4, vib: 0, gain: 0.13 },
  stac: { drive: 4, clip: 4, tone: 900, a: 0.002, decay: 0.12, s: 0.1, vib: 0, gain: 0.16 },
};
export const guitar = voice((ctx, out, ev, t, dur) => {
  const P = GTR[ev.a] || GTR.hit;
  const f = mtof(ev.m);
  const end = t + (ev.a === 'stac' ? Math.min(dur, 0.2) : dur);
  const stop = end + 0.4;
  const from = ev.a === 'sus' || ev.a === 'vib' ? glideFrom(ctx, 'gtr', ev, t) : null;
  const pre = ctx.createGain();
  pre.gain.value = P.drive;
  for (const [dt, type, g] of [[-6, 'sawtooth', 0.5], [5, 'sawtooth', 0.5], [0, 'triangle', 0.4]]) {
    const o = osc(ctx, type, f, t, stop);
    o.detune.value = dt;
    if (from != null) {
      o.frequency.setValueAtTime(mtof(from), t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    }
    if (P.vib) {
      const l = osc(ctx, 'sine', 5.2, t, stop);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(P.vib, t + Math.min(0.5, dur));
      l.connect(lg).connect(o.detune);
    }
    const og = ctx.createGain();
    og.gain.value = g;
    o.connect(og).connect(pre);
  }
  // the pick: the string is brighter for a moment
  const pick = ctx.createBiquadFilter();
  pick.type = 'lowpass';
  pick.frequency.setValueAtTime(P.tone * 2.2, t);
  pick.frequency.setTargetAtTime(P.tone, t + 0.01, 0.05);
  const sh = ctx.createWaveShaper();
  sh.curve = clipCurve(P.clip);
  sh.oversample = '2x';
  const cab = ctx.createBiquadFilter();
  cab.type = 'lowpass';
  cab.frequency.value = P.tone;
  cab.Q.value = 0.9;
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 800;
  mid.gain.value = 4;
  mid.Q.value = 0.8;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 90;
  const amp = env(ctx, t, { a: P.a, peak: P.gain * (0.4 + 0.6 * ev.v), d: P.decay, s: P.s, end, r: 0.08 });
  pre.connect(pick).connect(sh).connect(cab).connect(mid).connect(hp).connect(amp);
  amp.connect(out);
}, 0.6);

// Tambourine: jingles (bright noise through two resonances) with a quick decay.
export const tambourine = voice((ctx, out, ev, t) => {
  const src = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5000;
  const pk = ctx.createBiquadFilter();
  pk.type = 'peaking';
  pk.frequency.value = 9000;
  pk.Q.value = 3;
  pk.gain.value = 10;
  const g = ctx.createGain();
  const lvl = 0.25 * ev.v;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(lvl, t + 0.004);
  g.gain.setTargetAtTime(lvl * 0.4, t + 0.006, 0.02);
  g.gain.setTargetAtTime(0, t + 0.05, 0.06);
  src.connect(hp).connect(pk).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.4);
}, 0.5);

// Choir pad: sawtooths through two vowel formants ("aah").
export const vox = voice((ctx, out, ev, t, dur) => {
  const f = mtof(ev.m);
  const end = t + dur;
  const stop = end + 1.5;
  const amp = env(ctx, t, { a: 0.5, peak: 0.12 * ev.v, d: 1, s: 0.9, end, r: 0.6 });
  const mix = ctx.createGain();
  for (const dt of [-8, 0, 9]) {
    const o = osc(ctx, 'sawtooth', f, t, stop);
    o.detune.value = dt;
    o.connect(mix);
  }
  for (const [ff, q, g] of [[760, 7, 1], [1150, 8, 0.6], [2600, 10, 0.25]]) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = ff;
    bp.Q.value = q;
    const gg = ctx.createGain();
    gg.gain.value = g;
    mix.connect(bp).connect(gg).connect(amp);
  }
  amp.connect(out);
}, 1.8);

// Drum machine.
export const kick = voice((ctx, out, ev, t) => kickDrum(ctx, out, t, ev.v, { pitch: 52, end: 38, decay: 0.42, click: 0.35, drive: 0.15, gain: 1.15 }), 0.6);
// The big 80s snare: a body, wires, and a burst of room cut off short (gated reverb).
export const snare = voice((ctx, out, ev, t) => {
  snareDrum(ctx, out, t, ev.v, { tone: 190, color: 4500, noise: 0.55, decay: 0.16, gated: true, gain: 0.5 });
  const n = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.6;
  const g = ctx.createGain();
  // A short gated room: enough for the 1980s snap, not a wash of noise.
  const lvl = 0.06 * ev.v;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(lvl, t + 0.01);
  g.gain.setValueAtTime(lvl * 0.7, t + 0.11);
  g.gain.linearRampToValueAtTime(0, t + 0.13);
  n.connect(bp).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(t + 0.3);
}, 0.5);
export const clap = voice((ctx, out, ev, t) => snareDrum(ctx, out, t, ev.v, { kind: 'clap', tone: 1200, decay: 0.25, gain: 0.32 }), 0.5);
export const hat = voice((ctx, out, ev, t) => hatDrum(ctx, out, t, ev.v, { color: 8500, gain: 0.2, decay: 0.045 }, ev.a === 'open'), 0.5);
export const crash = voice((ctx, out, ev, t) => crashCym(ctx, out, t, ev.v), 2.6);
// Electronic toms: a sine that dives in pitch, with a noise skin.
export const etom = voice((ctx, out, ev, t) => {
  const f = mtof(ev.m);
  const o = osc(ctx, 'sine', f * 2, t, t + 0.6);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.25);
  const g = env(ctx, t, { a: 0.002, peak: 0.5 * ev.v, d: 0.5, s: 0 });
  o.connect(g).connect(out);
  const n = noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  const ng = env(ctx, t, { a: 0.001, peak: 0.12 * ev.v, d: 0.08, s: 0 });
  n.connect(lp).connect(ng).connect(out);
  n.start(t, Math.random());
  n.stop(t + 0.2);
}, 0.7);
// White-noise sweep into a new section.
export const sweep = voice((ctx, out, ev, t, dur) => {
  const n = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.5;
  const up = ev.a !== 'fall';
  bp.frequency.setValueAtTime(up ? 300 : 9000, t);
  bp.frequency.exponentialRampToValueAtTime(up ? 9000 : 300, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(up ? 0.001 : 0.1 * ev.v, t);
  g.gain.exponentialRampToValueAtTime(up ? 0.1 * ev.v : 0.001, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
  n.connect(bp).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(t + dur + 0.05);
}, 0.3);

// ---- effects ----------------------------------------------------------------------

// A stereo delay synced to the tempo (a dotted eighth by default), with darker repeats.
export function tempoDelay(beats = 0.75, feedback = 0.38, mix = 0.3) {
  return (ctx) => {
    const input = ctx.createGain();
    const output = ctx.createGain();
    input.connect(output);
    const merge = ctx.createChannelMerger(2);
    const dl = ctx.createDelay(2);
    const dr = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    const wet = ctx.createGain();
    wet.gain.value = mix;
    // ping-pong: left feeds right feeds left
    input.connect(tone).connect(dl);
    dl.connect(merge, 0, 0);
    dl.connect(dr);
    dr.connect(merge, 0, 1);
    dr.connect(fb).connect(dl);
    merge.connect(wet).connect(output);
    return {
      input,
      output,
      tempo(spb, t) {
        const s = Math.min(1.9, spb * beats);
        dl.delayTime.setTargetAtTime(s, t, 0.05);
        dr.delayTime.setTargetAtTime(s, t, 0.05);
      },
    };
  };
}

// A slow chorus: two short delays wobbling against each other.
export function chorus(depth = 0.003, mix = 0.5) {
  return (ctx) => {
    const input = ctx.createGain();
    const output = ctx.createGain();
    input.connect(output);
    const merge = ctx.createChannelMerger(2);
    [0.31, 0.43].forEach((rate, k) => {
      const d = ctx.createDelay(0.05);
      d.delayTime.value = 0.012 + k * 0.004;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const lg = ctx.createGain();
      lg.gain.value = depth;
      lfo.connect(lg).connect(d.delayTime);
      lfo.start();
      input.connect(d).connect(merge, 0, k);
    });
    const wet = ctx.createGain();
    wet.gain.value = mix;
    merge.connect(wet).connect(output);
    return { input, output };
  };
}
