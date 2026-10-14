// SPDX-License-Identifier: MIT
// Every sound here is synthesised from oscillators and noise at play time:
// no samples, so there is nothing anyone else owns in the output.

import { mtof } from './theory.js';

// ---- shared buffers and curves ------------------------------------------

const banks = new WeakMap();

export function bank(ctx) {
  let b = banks.get(ctx);
  if (!b) {
    b = {
      white: makeNoise(ctx, 'white', 2),
      pink: makeNoise(ctx, 'pink', 4),
      brown: makeNoise(ctx, 'brown', 4),
      waves: {},
      curves: {},
    };
    banks.set(ctx, b);
  }
  return b;
}

function makeNoise(ctx, kind, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Fade the loop seam.
    const fade = Math.min(2000, len >> 4);
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - g) + d[i] * g;
    }
  }
  return buf;
}

export function pulseWave(ctx, duty) {
  const b = bank(ctx);
  const key = 'p' + duty;
  if (!b.waves[key]) {
    const n = 64;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty);
    b.waves[key] = ctx.createPeriodicWave(real, imag);
  }
  return b.waves[key];
}

export function driveCurve(ctx, amount) {
  const b = bank(ctx);
  const key = amount.toFixed(2);
  if (!b.curves[key]) {
    const n = 2048;
    const c = new Float32Array(n);
    const k = 1 + amount * 12;
    const norm = Math.tanh(k);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x) / norm;
    }
    b.curves[key] = c;
  }
  return b.curves[key];
}

function noiseSource(ctx, kind = 'white') {
  const s = ctx.createBufferSource();
  s.buffer = bank(ctx)[kind];
  s.loop = true;
  return s;
}

function cleanup(src, nodes) {
  src.onended = () => {
    for (const n of nodes) n.disconnect();
  };
}

function setOsc(ctx, o, type) {
  if (type === 'pulse25') o.setPeriodicWave(pulseWave(ctx, 0.25));
  else if (type === 'pulse12') o.setPeriodicWave(pulseWave(ctx, 0.125));
  else o.type = type;
}

// ---- melodic presets ----------------------------------------------------
// osc: [{ type, detune (cents), oct, gain }]; filter: { type, freq, q, env, attack, decay }
// amp: { a, d, s, r } (s is a fraction of the peak); kind 'fm' uses ratio / index / modDecay.

export const PRESETS = {
  // bass
  lofiBass: { osc: [{ type: 'triangle', gain: 0.8 }, { type: 'sine', gain: 0.7 }], filter: { freq: 700, q: 0.8 }, amp: { a: 0.006, d: 0.4, s: 0.6, r: 0.12 }, gain: 0.55 },
  houseBass: { osc: [{ type: 'square', gain: 0.35 }, { type: 'sine', gain: 0.9 }], filter: { freq: 380, q: 3, env: 1400, decay: 0.12 }, amp: { a: 0.004, d: 0.18, s: 0.5, r: 0.06 }, gain: 0.5 },
  synthBass: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'sawtooth', detune: -9, gain: 0.4 }, { type: 'sine', oct: -1, gain: 0.5 }], filter: { freq: 260, q: 5, env: 1800, decay: 0.14 }, amp: { a: 0.004, d: 0.15, s: 0.55, r: 0.05 }, gain: 0.42 },
  subBass: { osc: [{ type: 'sine', gain: 1 }, { type: 'triangle', gain: 0.2 }], filter: { freq: 500, q: 0.5 }, amp: { a: 0.08, d: 1, s: 0.85, r: 0.6 }, gain: 0.5 },
  chipBass: { osc: [{ type: 'triangle', gain: 1 }], filter: { freq: 6000, q: 0.3 }, amp: { a: 0.002, d: 0.05, s: 1, r: 0.02 }, gain: 0.55 },
  reese: { osc: [{ type: 'sawtooth', detune: -14, gain: 0.45 }, { type: 'sawtooth', detune: 14, gain: 0.45 }, { type: 'sine', oct: -1, gain: 0.7 }], filter: { freq: 520, q: 2.5, env: 300, decay: 0.6 }, amp: { a: 0.02, d: 0.5, s: 0.85, r: 0.15 }, gain: 0.38 },
  dubBass: { osc: [{ type: 'sine', gain: 1 }, { type: 'triangle', gain: 0.45 }], filter: { freq: 420, q: 1.2 }, amp: { a: 0.008, d: 0.5, s: 0.7, r: 0.1 }, gain: 0.465, drive: 0.25 },
  celloBass: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'sawtooth', detune: 7, gain: 0.4 }], filter: { freq: 650, q: 1.5, env: 600, attack: 0.04, decay: 0.3 }, amp: { a: 0.02, d: 0.3, s: 0.7, r: 0.12 }, gain: 0.42 },

  // pads (long attack, wide)
  warmPad: { osc: [{ type: 'sawtooth', detune: -11, gain: 0.33 }, { type: 'sawtooth', detune: 0, gain: 0.33 }, { type: 'sawtooth', detune: 12, gain: 0.33 }], filter: { freq: 900, q: 0.7, env: 500, attack: 1.2, decay: 2 }, amp: { a: 0.9, d: 1, s: 0.85, r: 1.6 }, gain: 0.18, vibrato: { rate: 0.3, depth: 6 } },
  glassPad: { osc: [{ type: 'triangle', gain: 0.6 }, { type: 'sine', oct: 1, detune: 5, gain: 0.35 }, { type: 'triangle', detune: -8, gain: 0.4 }], filter: { freq: 3200, q: 0.4 }, amp: { a: 1.8, d: 1.5, s: 0.8, r: 3 }, gain: 0.182, vibrato: { rate: 0.2, depth: 8 } },
  darkPad: { osc: [{ type: 'sawtooth', detune: -7, gain: 0.4 }, { type: 'square', detune: 7, gain: 0.25 }, { type: 'sawtooth', oct: -1, gain: 0.25 }], filter: { freq: 650, q: 1.5, env: 900, attack: 1.5, decay: 2.5 }, amp: { a: 1.4, d: 1, s: 0.9, r: 2.2 }, gain: 0.165, vibrato: { rate: 0.25, depth: 5 } },
  strings: { osc: [{ type: 'sawtooth', detune: -8, gain: 0.4 }, { type: 'sawtooth', detune: 8, gain: 0.4 }, { type: 'sawtooth', oct: -1, detune: 3, gain: 0.2 }], filter: { freq: 2200, q: 0.5 }, amp: { a: 0.5, d: 1, s: 0.85, r: 1 }, gain: 0.16, vibrato: { rate: 5, depth: 9, delay: 0.4 } },
  pulsePad: { osc: [{ type: 'pulse25', gain: 0.5 }, { type: 'pulse25', detune: 10, gain: 0.4 }], filter: { freq: 2400, q: 0.3 }, amp: { a: 0.3, d: 0.5, s: 0.8, r: 0.4 }, gain: 0.1 },

  // chords
  epiano: { kind: 'fm', ratio: 1, index: 1.4, modDecay: 0.6, chorus: 5, amp: { a: 0.004, d: 1.8, s: 0.3, r: 0.5 }, gain: 0.21 },
  stab: { osc: [{ type: 'sawtooth', detune: -6, gain: 0.5 }, { type: 'square', detune: 6, gain: 0.4 }], filter: { freq: 700, q: 3, env: 2600, decay: 0.12 }, amp: { a: 0.003, d: 0.22, s: 0, r: 0.08 }, gain: 0.286 },
  brass: { osc: [{ type: 'sawtooth', detune: -5, gain: 0.5 }, { type: 'sawtooth', detune: 5, gain: 0.5 }], filter: { freq: 700, q: 1.5, env: 1800, attack: 0.08, decay: 0.5 }, amp: { a: 0.04, d: 0.6, s: 0.65, r: 0.25 }, gain: 0.162 },
  pulseChord: { osc: [{ type: 'pulse12', gain: 1 }], filter: { freq: 5000, q: 0.3 }, amp: { a: 0.002, d: 0.08, s: 0.6, r: 0.03 }, gain: 0.12 },
  skank: { osc: [{ type: 'square', gain: 0.5 }, { type: 'sine', oct: 1, gain: 0.4 }], filter: { type: 'bandpass', freq: 1400, q: 0.9 }, amp: { a: 0.002, d: 0.09, s: 0, r: 0.05 }, gain: 0.4 },
  pizz: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'triangle', gain: 0.6 }], filter: { freq: 900, q: 1, env: 2400, decay: 0.08 }, amp: { a: 0.003, d: 0.25, s: 0, r: 0.1 }, gain: 0.208 },

  // leads
  mallet: { kind: 'fm', ratio: 4, index: 2.2, modDecay: 0.06, amp: { a: 0.002, d: 0.7, s: 0, r: 0.4 }, gain: 0.36 },
  bell: { kind: 'fm', ratio: 3.5, index: 2.4, modDecay: 0.9, amp: { a: 0.003, d: 2.6, s: 0, r: 1.2 }, gain: 0.26 },
  pluck: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'square', detune: 5, gain: 0.35 }], filter: { freq: 900, q: 2, env: 4200, decay: 0.12 }, amp: { a: 0.002, d: 0.35, s: 0.1, r: 0.2 }, gain: 0.28 },
  sawLead: { osc: [{ type: 'sawtooth', detune: -7, gain: 0.5 }, { type: 'sawtooth', detune: 7, gain: 0.5 }], filter: { freq: 1800, q: 1.5, env: 2200, decay: 0.3 }, amp: { a: 0.01, d: 0.4, s: 0.7, r: 0.25 }, gain: 0.2, vibrato: { rate: 5.5, depth: 14, delay: 0.25 }, glide: 0.05 },
  chipLead: { osc: [{ type: 'pulse25', gain: 1 }], filter: { freq: 7000, q: 0.3 }, amp: { a: 0.002, d: 0.1, s: 0.7, r: 0.04 }, gain: 0.182, vibrato: { rate: 6, depth: 18, delay: 0.15 } },
  flute: { osc: [{ type: 'sine', gain: 0.8 }, { type: 'triangle', gain: 0.35 }], filter: { freq: 3000, q: 0.5 }, amp: { a: 0.06, d: 0.3, s: 0.8, r: 0.2 }, gain: 0.32, vibrato: { rate: 5, depth: 12, delay: 0.2 }, breath: 0.05 },
  melodica: { osc: [{ type: 'square', gain: 0.4 }, { type: 'sawtooth', detune: 4, gain: 0.3 }], filter: { freq: 1600, q: 0.8 }, amp: { a: 0.03, d: 0.3, s: 0.75, r: 0.15 }, gain: 0.2, vibrato: { rate: 4.5, depth: 10, delay: 0.3 } },

  // arps
  arpPluck: { osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'square', oct: 1, gain: 0.2 }], filter: { freq: 700, q: 4, env: 3000, decay: 0.07 }, amp: { a: 0.002, d: 0.15, s: 0, r: 0.08 }, gain: 0.22 },
  bellArp: { kind: 'fm', ratio: 3.5, index: 1.2, modDecay: 0.4, amp: { a: 0.003, d: 1.1, s: 0, r: 0.6 }, gain: 0.198 },
  chipArp: { osc: [{ type: 'pulse12', gain: 1 }], filter: { freq: 6000, q: 0.3 }, amp: { a: 0.001, d: 0.05, s: 0.5, r: 0.02 }, gain: 0.13 },
  harp: { kind: 'fm', ratio: 2, index: 1.1, modDecay: 0.15, amp: { a: 0.002, d: 1.2, s: 0, r: 0.6 }, gain: 0.234 },
};

// Plays one note. `out` is the channel input; returns nothing, cleans up after itself.
export function playNote(ctx, out, t, midi, dur, vel, presetName, extra = {}) {
  const p = PRESETS[presetName];
  if (!p) return;
  if (p.kind === 'fm') return fmNote(ctx, out, t, midi, dur, vel, p);
  const f = mtof(midi);
  const { a = 0.005, d = 0.1, s = 0.7, r = 0.1 } = p.amp || {};
  const peak = vel * (p.gain ?? 0.2);
  const end = t + Math.max(dur, a + 0.01);
  const stop = end + r * 2.5 + 0.05;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + a);
  amp.gain.setTargetAtTime(peak * s, t + a, Math.max(0.01, d / 3));
  amp.gain.setTargetAtTime(0, end, Math.max(0.005, r / 3));

  const filt = ctx.createBiquadFilter();
  const fp = p.filter || {};
  filt.type = fp.type || 'lowpass';
  filt.Q.value = fp.q ?? 0.7;
  const base = Math.min(18000, (fp.freq ?? 8000) * (extra.bright ?? 1));
  filt.frequency.setValueAtTime(base, t);
  if (fp.env) {
    const fa = fp.attack ?? 0.004;
    filt.frequency.linearRampToValueAtTime(Math.min(18000, base + fp.env * vel), t + fa);
    filt.frequency.setTargetAtTime(base, t + fa, (fp.decay ?? 0.2) / 3);
  }
  const nodes = [amp, filt];
  let last = filt;
  if (p.drive) {
    const ws = ctx.createWaveShaper();
    ws.curve = driveCurve(ctx, p.drive);
    filt.connect(ws);
    last = ws;
    nodes.push(ws);
  }
  last.connect(amp);
  amp.connect(out);

  let lfo = null;
  if (p.vibrato) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = p.vibrato.rate;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(p.vibrato.depth, t + (p.vibrato.delay ?? 0) + 0.3);
    lfo.connect(lg);
    lfo.start(t);
    lfo.stop(stop);
    nodes.push(lfo, lg);
    lfo._g = lg;
  }

  let src = null;
  for (const o of p.osc) {
    const osc = ctx.createOscillator();
    setOsc(ctx, osc, o.type);
    const of = f * Math.pow(2, o.oct || 0);
    const glide = extra.glideFrom != null && p.glide;
    if (glide) {
      osc.frequency.setValueAtTime(mtof(extra.glideFrom) * Math.pow(2, o.oct || 0), t);
      osc.frequency.exponentialRampToValueAtTime(of, t + p.glide);
    } else osc.frequency.setValueAtTime(of, t);
    osc.detune.value = o.detune || 0;
    if (lfo) lfo._g.connect(osc.detune);
    const g = ctx.createGain();
    g.gain.value = o.gain ?? 0.5;
    osc.connect(g);
    g.connect(filt);
    osc.start(t);
    osc.stop(stop);
    nodes.push(osc, g);
    src = osc;
  }
  if (p.breath) {
    const n = noiseSource(ctx, 'pink');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p.breath * vel, t + 0.04);
    g.gain.setTargetAtTime(p.breath * vel * 0.3, t + 0.05, 0.1);
    g.gain.setTargetAtTime(0, end, 0.05);
    n.connect(bp);
    bp.connect(g);
    g.connect(amp);
    n.start(t, Math.random());
    n.stop(stop);
    nodes.push(n, bp, g);
  }
  cleanup(src, nodes);
}

function fmNote(ctx, out, t, midi, dur, vel, p) {
  const f = mtof(midi);
  const { a = 0.003, d = 1, s = 0, r = 0.4 } = p.amp || {};
  const peak = vel * (p.gain ?? 0.2);
  const end = t + Math.max(dur, a + 0.01);
  const stop = end + r * 2.5 + 0.05;

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + a);
  amp.gain.setTargetAtTime(peak * s, t + a, Math.max(0.01, d / 3));
  amp.gain.setTargetAtTime(0, end, Math.max(0.005, r / 3));
  amp.connect(out);

  const mod = ctx.createOscillator();
  mod.frequency.value = f * p.ratio;
  const mg = ctx.createGain();
  // Higher notes get a lighter touch, like a real tine.
  const idx = p.index * (0.6 + 0.6 * vel) * Math.min(1, 600 / f + 0.35);
  mg.gain.setValueAtTime(f * idx, t);
  mg.gain.setTargetAtTime(f * idx * 0.12, t, p.modDecay / 3);
  mod.connect(mg);
  mod.start(t);
  mod.stop(stop);
  const nodes = [amp, mod, mg];
  const detunes = p.chorus ? [-p.chorus, p.chorus] : [0];
  let src = null;
  for (const dt of detunes) {
    const car = ctx.createOscillator();
    car.frequency.value = f;
    car.detune.value = dt;
    mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.value = 1 / detunes.length;
    car.connect(g);
    g.connect(amp);
    car.start(t);
    car.stop(stop);
    nodes.push(car, g);
    src = car;
  }
  cleanup(src, nodes);
}

// ---- drums --------------------------------------------------------------

function envGain(ctx, t, peak, decay, attack = 0.001) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

export function kick(ctx, out, t, vel, k) {
  const gain = (k.gain ?? 1) * vel * (k.kind === 'chip' ? 2.4 : 0.62);
  if (k.kind === 'chip') {
    const o = ctx.createOscillator();
    o.setPeriodicWave(pulseWave(ctx, 0.5));
    o.frequency.setValueAtTime(k.pitch, t);
    o.frequency.exponentialRampToValueAtTime(k.end, t + k.decay);
    const g = envGain(ctx, t, gain * 0.35, k.decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + k.decay + 0.05);
    cleanup(o, [o, g]);
    return;
  }
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(k.pitch * (k.kind === 'taiko' ? 1 : 1.6), t);
  o.frequency.exponentialRampToValueAtTime(k.pitch, t + 0.012);
  o.frequency.exponentialRampToValueAtTime(k.end, t + (k.kind === 'taiko' ? 0.18 : 0.09));
  const g = envGain(ctx, t, gain * 0.9, k.decay, 0.002);
  const nodes = [o, g];
  let last = o;
  if (k.drive) {
    const ws = ctx.createWaveShaper();
    ws.curve = driveCurve(ctx, k.drive);
    o.connect(ws);
    last = ws;
    nodes.push(ws);
  }
  last.connect(g).connect(out);
  o.start(t);
  o.stop(t + k.decay + 0.05);
  const click = k.kind === 'taiko' ? 0.6 : k.click || 0;
  if (click) {
    const n = noiseSource(ctx, 'white');
    const f = ctx.createBiquadFilter();
    f.type = k.kind === 'taiko' ? 'lowpass' : 'highpass';
    f.frequency.value = k.kind === 'taiko' ? 900 : 1800;
    const ng = envGain(ctx, t, gain * click * 0.5, k.kind === 'taiko' ? 0.12 : 0.012);
    n.connect(f).connect(ng).connect(out);
    n.start(t, Math.random());
    n.stop(t + 0.2);
    cleanup(n, [n, f, ng]);
  }
  cleanup(o, nodes);
}

export function snare(ctx, out, t, vel, s) {
  const gain = (s.gain ?? 0.5) * vel * (s.kind === 'clap' || s.kind === 'rim' ? 2.4 : s.kind === 'chip' ? 1.8 : 1);
  if (s.kind === 'clap') return clap(ctx, out, t, gain, s);
  if (s.kind === 'rim') return rim(ctx, out, t, gain, s);
  const decay = s.decay ?? 0.15;
  // body
  const o = ctx.createOscillator();
  o.type = s.kind === 'chip' ? 'square' : 'triangle';
  o.frequency.setValueAtTime(s.tone * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(s.tone, t + 0.03);
  const og = envGain(ctx, t, gain * (s.kind === 'chip' ? 0.3 : 0.7), 0.08);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.15);
  cleanup(o, [o, og]);
  // wires
  const n = noiseSource(ctx, 'white');
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = s.kind === 'chip' ? 1500 : 900;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s.color ?? 5000;
  const ng = ctx.createGain();
  const peak = gain * (s.noise ?? 0.7);
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(peak, t + 0.001);
  if (s.gated) {
    ng.gain.setTargetAtTime(peak * 0.45, t + 0.02, 0.06);
    ng.gain.setValueAtTime(peak * 0.3, t + decay);
    ng.gain.linearRampToValueAtTime(0, t + decay + 0.015);
  } else ng.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  n.connect(hp).connect(lp).connect(ng).connect(out);
  n.start(t, Math.random());
  n.stop(t + decay + 0.05);
  cleanup(n, [n, hp, lp, ng]);
}

function clap(ctx, out, t, gain, s) {
  const n = noiseSource(ctx, 'white');
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = s.tone ?? 1100;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  for (let i = 0; i < 3; i++) {
    const tt = t + i * 0.011;
    g.gain.setValueAtTime(gain, tt);
    g.gain.exponentialRampToValueAtTime(gain * 0.15, tt + 0.009);
  }
  g.gain.setValueAtTime(gain * 0.9, t + 0.034);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.034 + (s.decay ?? 0.2));
  n.connect(bp).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(t + 0.4);
  cleanup(n, [n, bp, g]);
}

function rim(ctx, out, t, gain, s) {
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = s.tone ?? 800;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (s.tone ?? 800) * 2;
  bp.Q.value = 3;
  const g = envGain(ctx, t, gain, s.decay ?? 0.06);
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = 1700;
  const g2 = envGain(ctx, t, gain * 0.6, 0.03);
  o.connect(bp).connect(g).connect(out);
  o2.connect(g2).connect(out);
  o.start(t);
  o2.start(t);
  o.stop(t + 0.15);
  o2.stop(t + 0.1);
  cleanup(o, [o, bp, g, o2, g2]);
}

const METAL = [2, 3, 4.16, 5.43, 6.79, 8.21];

export function hat(ctx, out, t, vel, h, open = false) {
  const gain = (h.gain ?? 0.2) * vel;
  const decay = open ? (h.kind === 'chip' ? 0.15 : 0.32) : h.decay ?? 0.05;
  const g = envGain(ctx, t, gain, decay, h.kind === 'shaker' ? 0.012 : 0.001);
  const nodes = [g];
  let src;
  if (h.kind === 'metal') {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = h.color ?? 10000;
    bp.Q.value = 0.8;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    bp.connect(hp).connect(g);
    nodes.push(bp, hp);
    for (const r of METAL) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 40 * r;
      o.connect(bp);
      o.start(t);
      o.stop(t + decay + 0.05);
      nodes.push(o);
      src = o;
    }
  } else {
    const n = noiseSource(ctx, 'white');
    const f = ctx.createBiquadFilter();
    f.type = h.kind === 'shaker' ? 'bandpass' : 'highpass';
    f.frequency.value = h.color ?? 8000;
    if (h.kind === 'shaker') f.Q.value = 1.2;
    n.connect(f).connect(g);
    n.start(t, Math.random());
    n.stop(t + decay + 0.05);
    nodes.push(n, f);
    src = n;
  }
  g.connect(out);
  cleanup(src, nodes);
}

export function tom(ctx, out, t, vel, pitch) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(pitch, t + 0.08);
  const g = envGain(ctx, t, 0.6 * vel, 0.35, 0.002);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.45);
  cleanup(o, [o, g]);
}

export function crash(ctx, out, t, vel) {
  const n = noiseSource(ctx, 'white');
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4500;
  const g = envGain(ctx, t, 0.16 * vel, 2.2, 0.002);
  n.connect(hp).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(t + 2.4);
  cleanup(n, [n, hp, g]);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 7000;
  const g2 = envGain(ctx, t, 0.06 * vel, 1.6, 0.002);
  bp.connect(g2).connect(out);
  let last;
  for (const r of METAL) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 57 * r;
    o.connect(bp);
    o.start(t);
    o.stop(t + 1.7);
    last = o;
  }
  cleanup(last, [bp, g2]);
}

// Rising noise for builds.
export function riser(ctx, out, t, dur) {
  const n = noiseSource(ctx, 'white');
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 2;
  bp.frequency.setValueAtTime(400, t);
  bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  n.connect(bp).connect(g).connect(out);
  n.start(t, Math.random());
  n.stop(t + dur + 0.1);
  cleanup(n, [n, bp, g]);
}

// ---- what each channel can be switched to ---------------------------------

export const VOICE_CHOICES = {
  bass: ['lofiBass', 'houseBass', 'synthBass', 'subBass', 'reese', 'dubBass', 'celloBass', 'chipBass'],
  keys: ['epiano', 'stab', 'brass', 'skank', 'pizz', 'harp', 'mallet', 'pulseChord'],
  pad: ['warmPad', 'glassPad', 'darkPad', 'strings', 'pulsePad'],
  lead: ['mallet', 'bell', 'pluck', 'sawLead', 'flute', 'melodica', 'chipLead', 'epiano'],
  arp: ['arpPluck', 'bellArp', 'harp', 'pluck', 'mallet', 'chipArp'],
};

export const VOICE_LABEL = {
  lofiBass: 'WARM BASS', houseBass: 'HOUSE BASS', synthBass: 'SYNTH BASS', subBass: 'SUB BASS', chipBass: '8-BIT BASS',
  reese: 'REESE BASS', dubBass: 'DUB BASS', celloBass: 'CELLO',
  warmPad: 'WARM PAD', glassPad: 'GLASS PAD', darkPad: 'DARK PAD', strings: 'STRINGS', pulsePad: '8-BIT PAD',
  epiano: 'E-PIANO', stab: 'HOUSE STAB', brass: 'SYNTH BRASS', pulseChord: '8-BIT CHORD', skank: 'SKANK ORGAN', pizz: 'PIZZICATO',
  mallet: 'MALLET', bell: 'BELL', pluck: 'PLUCK', sawLead: 'SAW LEAD', chipLead: '8-BIT LEAD', flute: 'FLUTE', melodica: 'MELODICA',
  arpPluck: 'SYNTH ARP', bellArp: 'BELL ARP', chipArp: '8-BIT ARP', harp: 'HARP',
};
