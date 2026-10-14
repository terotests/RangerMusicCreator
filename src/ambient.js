// SPDX-License-Identifier: MIT
// Ambience beds, synthesised: a looping noise bed for the body of the sound
// and randomly timed events (drops, chirps, crackles, waves) on top, so the
// texture never repeats.

import { bank } from './instruments.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const expo = (rate) => -Math.log(1 - Math.random()) / rate;

function loop(ctx, kind) {
  const s = ctx.createBufferSource();
  s.buffer = bank(ctx)[kind];
  s.loop = true;
  s.loopStart = 0;
  s.playbackRate.value = rnd(0.97, 1.03);
  return s;
}

function filter(ctx, type, freq, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function gain(ctx, v) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function burst(ctx, out, t, { kind = 'white', type = 'bandpass', freq, q = 1, peak, attack = 0.001, decay, pan = 0 }) {
  const s = ctx.createBufferSource();
  s.buffer = bank(ctx)[kind];
  const f = filter(ctx, type, freq, q);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  s.connect(f).connect(g).connect(p).connect(out);
  s.start(t, Math.random() * 1.5, attack + decay + 0.05);
  s.onended = () => p.disconnect();
}

function chirp(ctx, out, t, f0, f1, dur, peak, pan) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.2);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  o.connect(g).connect(p).connect(out);
  o.start(t);
  o.stop(t + dur + 0.01);
  o.onended = () => p.disconnect();
}

// Each ambience: bed(ctx, out) -> nodes with .stop(), rate (events / s), event(ctx, out, t, state)
export const AMBIENCES = [
  {
    id: 'rain',
    name: 'RAIN',
    color: '#3d7bff',
    bed(ctx, out) {
      const a = loop(ctx, 'pink');
      a.connect(filter(ctx, 'highpass', 500)).connect(filter(ctx, 'lowpass', 7000)).connect(gain(ctx, 0.35)).connect(out);
      const b = loop(ctx, 'brown');
      b.connect(filter(ctx, 'lowpass', 500)).connect(gain(ctx, 0.25)).connect(out);
      return [a, b];
    },
    rate: 18,
    event(ctx, out, t) {
      burst(ctx, out, t, { freq: rnd(1800, 7000), q: rnd(2, 6), peak: rnd(0.02, 0.09), decay: rnd(0.008, 0.03), pan: rnd(-0.9, 0.9) });
    },
  },
  {
    id: 'wind',
    name: 'WIND',
    color: '#e6c23a',
    bed(ctx, out, st) {
      const a = loop(ctx, 'brown');
      st.bp = filter(ctx, 'bandpass', 500, 2.5);
      st.g = gain(ctx, 0.5);
      a.connect(st.bp).connect(st.g).connect(out);
      const b = loop(ctx, 'pink');
      st.whistle = filter(ctx, 'bandpass', 1800, 8);
      b.connect(st.whistle).connect(gain(ctx, 0.06)).connect(out);
      return [a, b];
    },
    rate: 0.5,
    event(ctx, out, t, st) {
      const d = rnd(1.5, 4);
      st.bp.frequency.setTargetAtTime(rnd(220, 950), t, d / 2);
      st.g.gain.setTargetAtTime(rnd(0.25, 1.1), t, d / 2);
      st.whistle.frequency.setTargetAtTime(rnd(1200, 2600), t, d / 2);
    },
  },
  {
    id: 'ocean',
    name: 'OCEAN',
    color: '#ff4a4a',
    bed(ctx, out, st) {
      const a = loop(ctx, 'brown');
      const b = loop(ctx, 'pink');
      st.lp = filter(ctx, 'lowpass', 500, 0.5);
      st.g = gain(ctx, 0.15);
      a.connect(st.lp);
      b.connect(gain(ctx, 0.5)).connect(st.lp);
      st.lp.connect(st.g).connect(out);
      return [a, b];
    },
    rate: 0.12,
    event(ctx, out, t, st) {
      const up = rnd(2.5, 4);
      const down = rnd(3.5, 6);
      const peak = rnd(0.6, 1.1);
      st.g.gain.setTargetAtTime(peak, t, up / 3);
      st.lp.frequency.setTargetAtTime(rnd(1800, 3500), t, up / 3);
      st.g.gain.setTargetAtTime(0.12, t + up, down / 3);
      st.lp.frequency.setTargetAtTime(400, t + up, down / 3);
    },
  },
  {
    id: 'birds',
    name: 'BIRDS',
    color: '#ff9a2e',
    bed(ctx, out) {
      const a = loop(ctx, 'pink');
      a.connect(filter(ctx, 'bandpass', 900, 0.6)).connect(gain(ctx, 0.03)).connect(out);
      return [a];
    },
    rate: 0.45,
    event(ctx, out, t) {
      const pan = rnd(-0.85, 0.85);
      const species = Math.floor(Math.random() * 3);
      const n = 2 + Math.floor(Math.random() * 6);
      const base = rnd(2400, 4800);
      let tt = t;
      for (let i = 0; i < n; i++) {
        const dur = species === 0 ? rnd(0.05, 0.1) : species === 1 ? rnd(0.12, 0.2) : rnd(0.03, 0.05);
        const f0 = base * rnd(0.9, 1.15);
        const f1 = species === 1 ? f0 * rnd(0.55, 0.7) : f0 * rnd(1.1, 1.5);
        chirp(ctx, out, tt, f0, f1, dur, rnd(0.03, 0.07), pan);
        tt += dur + (species === 2 ? rnd(0.02, 0.04) : rnd(0.05, 0.16));
      }
    },
  },
  {
    id: 'night',
    name: 'NIGHT',
    color: '#26c6da',
    bed(ctx, out) {
      const a = loop(ctx, 'brown');
      a.connect(filter(ctx, 'lowpass', 300)).connect(gain(ctx, 0.12)).connect(out);
      return [a];
    },
    rate: 2.2,
    event(ctx, out, t) {
      const f = rnd(4300, 4900);
      const pan = rnd(-0.8, 0.8);
      const pulses = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pulses; i++) chirp(ctx, out, t + i * 0.028, f, f * 0.98, 0.016, 0.022, pan);
    },
  },
  {
    id: 'fire',
    name: 'FIRE',
    color: '#9b5cff',
    bed(ctx, out) {
      const a = loop(ctx, 'brown');
      a.connect(filter(ctx, 'lowpass', 700)).connect(gain(ctx, 0.35)).connect(out);
      const b = loop(ctx, 'pink');
      b.connect(filter(ctx, 'highpass', 2500)).connect(gain(ctx, 0.04)).connect(out);
      return [a, b];
    },
    rate: 9,
    event(ctx, out, t) {
      const pop = Math.random() < 0.08;
      burst(ctx, out, t, {
        freq: pop ? rnd(500, 1500) : rnd(1500, 6000),
        q: rnd(0.8, 3),
        peak: pop ? rnd(0.15, 0.3) : rnd(0.03, 0.1),
        decay: pop ? rnd(0.02, 0.05) : rnd(0.002, 0.008),
        pan: rnd(-0.5, 0.5),
      });
    },
  },
  {
    id: 'vinyl',
    name: 'VINYL',
    color: '#3ddc84',
    bed(ctx, out) {
      const a = loop(ctx, 'pink');
      a.connect(filter(ctx, 'highpass', 3000)).connect(filter(ctx, 'lowpass', 9000)).connect(gain(ctx, 0.05)).connect(out);
      const b = loop(ctx, 'brown');
      b.connect(filter(ctx, 'lowpass', 90)).connect(gain(ctx, 0.12)).connect(out);
      return [a, b];
    },
    rate: 7,
    event(ctx, out, t) {
      const pop = Math.random() < 0.06;
      burst(ctx, out, t, {
        type: pop ? 'lowpass' : 'highpass',
        freq: pop ? 2500 : rnd(2000, 5000),
        peak: pop ? rnd(0.12, 0.22) : rnd(0.02, 0.08),
        decay: pop ? 0.012 : rnd(0.0015, 0.004),
        pan: rnd(-0.3, 0.3),
      });
    },
  },
  {
    id: 'city',
    name: 'CITY',
    color: '#ff5ad1',
    bed(ctx, out) {
      const a = loop(ctx, 'brown');
      a.connect(filter(ctx, 'lowpass', 260)).connect(gain(ctx, 0.4)).connect(out);
      const b = loop(ctx, 'pink');
      b.connect(filter(ctx, 'bandpass', 900, 0.8)).connect(gain(ctx, 0.04)).connect(out);
      return [a, b];
    },
    rate: 0.18,
    event(ctx, out, t) {
      // A car passing from one side to the other.
      const s = ctx.createBufferSource();
      s.buffer = bank(ctx).pink;
      const f = filter(ctx, 'bandpass', rnd(500, 1100), 1.2);
      const g = ctx.createGain();
      const p = ctx.createStereoPanner();
      const dur = rnd(3, 6);
      const dir = Math.random() < 0.5 ? -1 : 1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(rnd(0.12, 0.3), t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      f.frequency.setValueAtTime(f.frequency.value * 1.2, t);
      f.frequency.linearRampToValueAtTime(f.frequency.value * 0.75, t + dur);
      p.pan.setValueAtTime(-0.9 * dir, t);
      p.pan.linearRampToValueAtTime(0.9 * dir, t + dur);
      s.connect(f).connect(g).connect(p).connect(out);
      s.start(t, Math.random(), dur + 0.1);
      s.onended = () => p.disconnect();
    },
  },
];

export class AmbientLayer {
  constructor(engine, out) {
    this.engine = engine;
    this.ctx = engine.ctx;
    this.out = out;
    this.slots = AMBIENCES.map((def) => ({ def, on: false, gain: null, sources: [], st: {}, next: 0 }));
  }
  isOn(i) {
    return this.slots[i].on;
  }
  set(i, on) {
    const s = this.slots[i];
    if (s.on === on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    s.on = on;
    if (on) {
      s.gain = ctx.createGain();
      s.gain.gain.setValueAtTime(0, t);
      s.gain.gain.linearRampToValueAtTime(1, t + 2.5);
      s.gain.connect(this.out);
      s.st = {};
      s.sources = s.def.bed(ctx, s.gain, s.st);
      for (const src of s.sources) src.start(t, Math.random() * 2);
      s.next = t + expo(s.def.rate);
    } else {
      const g = s.gain;
      const srcs = s.sources;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 2);
      for (const src of srcs) src.stop(t + 2.1);
      setTimeout(() => g.disconnect(), 2500);
      s.gain = null;
      s.sources = [];
    }
  }
  toggle(i) {
    this.set(i, !this.slots[i].on);
    return this.slots[i].on;
  }
  setOnly(ids) {
    this.slots.forEach((s, i) => this.set(i, ids.includes(s.def.id)));
  }
  tick(until) {
    for (const s of this.slots) {
      if (!s.on) continue;
      const now = this.ctx.currentTime;
      if (s.next < now) s.next = now + 0.01;
      while (s.next < until) {
        s.def.event(this.ctx, s.gain, s.next, s.st);
        s.next += expo(s.def.rate);
      }
    }
  }
}
