// SPDX-License-Identifier: MIT
// TASTE: a small neural net that learns which songs the listener likes.
//
// Every song is described by a feature vector taken from the composer's
// material (style, tempo, scale, drum and bass density, melody shape...).
// Liked songs are positives. Songs skipped quickly are negatives, and a few
// random songs act as weak negatives ("unlabelled" background), so the net
// learns what sets the liked ones apart from what the composer makes anyway.
// New songs are then picked among a handful of candidate seeds, weighted by
// the net's score, with some pure chance left in so it keeps exploring.
//
// Pure JS with no browser APIs, so it is tested in node. Weights are stored
// as JSON (main.js keeps them in localStorage).

import { STYLES } from './styles.js';
import { Rng } from './rng.js';

const STYLE_IDS = STYLES.map((s) => s.id);
const SCALE_IDS = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'harmonicMinor'];

export const FEATURE_NAMES = [
  ...STYLE_IDS.map((s) => `style:${s}`),
  'bpm_in_style', 'bpm',
  ...SCALE_IDS.map((s) => `scale:${s}`),
  'kick_density', 'kick_offbeat', 'snare_density', 'hats_density', 'open_hats',
  'bass_density', 'bass_offbeat', 'comp_density',
  'melody_notes', 'melody_len', 'melody_range', 'melody_leaps', 'melody_offbeat',
  'known_tune', 'prog_len', 'prog_colour', 'arp_octaves', 'slow_chords',
];
export const N_FEATURES = FEATURE_NAMES.length;

const hits = (p) => (p ? [...p].filter((c) => c !== '.' && c !== '-').length : 0);
const offbeat = (p) => {
  if (!p) return 0;
  const all = [...p].map((c, i) => (c !== '.' && c !== '-' ? i : -1)).filter((i) => i >= 0);
  return all.length ? all.filter((i) => i % 4 !== 0).length / all.length : 0;
};
const clamp = (x) => Math.max(0, Math.min(1, x));

// material: composer.material() (or anything with the same fields).
export function features(m) {
  const style = STYLES.find((s) => s.id === m.style) || STYLES[0];
  const notes = [...(m.motif || []), ...(m.motifB || []).map((n) => ({ ...n, step: n.step + 32 }))].filter((n) => n.deg != null);
  const degs = notes.map((n) => n.deg);
  let leaps = 0;
  for (let i = 1; i < degs.length; i++) leaps += Math.abs(degs[i] - degs[i - 1]);
  const prog = m.progression || [];
  const d = m.drums || {};
  return [
    ...STYLE_IDS.map((s) => (s === style.id ? 1 : 0)),
    clamp((m.bpm - style.bpm[0]) / Math.max(1, style.bpm[1] - style.bpm[0])),
    clamp((m.bpm - 60) / 120),
    ...SCALE_IDS.map((s) => (s === m.scaleName ? 1 : 0)),
    hits(d.kick) / 16,
    offbeat(d.kick),
    hits(d.snare) / 16,
    hits(d.hats) / 16,
    clamp(hits(d.open) / 4),
    hits(m.bassPat) / 16,
    offbeat(m.bassPat),
    m.compPat ? [...m.compPat].filter((c) => c !== '.').length / 16 : 0,
    clamp(notes.length / 32),
    clamp(notes.length ? notes.reduce((a, n) => a + n.len, 0) / notes.length / 8 : 0),
    clamp(degs.length ? (Math.max(...degs) - Math.min(...degs)) / 14 : 0),
    clamp(degs.length > 1 ? leaps / (degs.length - 1) / 5 : 0),
    notes.length ? notes.filter((n) => n.step % 4 !== 0).length / notes.length : 0,
    m.motifName ? 1 : 0,
    clamp(prog.length / 8),
    prog.length ? prog.filter((c) => typeof c === 'object').length / prog.length : 0,
    clamp(((m.arpOct || 1) - 1) / 2),
    m.chordBars ? 1 : 0,
  ];
}

// One hidden layer, tanh, sigmoid out. Tiny on purpose: it trains in a few ms.
export class TasteNet {
  constructor({ inputs = N_FEATURES, hidden = 10, seed = 1 } = {}) {
    const r = new Rng(seed);
    const g = (n) => (r.next() * 2 - 1) * Math.sqrt(1 / n);
    this.inputs = inputs;
    this.hidden = hidden;
    this.w1 = Array.from({ length: hidden }, () => Array.from({ length: inputs }, () => g(inputs)));
    this.b1 = new Array(hidden).fill(0);
    this.w2 = Array.from({ length: hidden }, () => g(hidden));
    this.b2 = 0;
  }

  forward(x) {
    const h = this.w1.map((w, j) => Math.tanh(w.reduce((a, wi, i) => a + wi * x[i], this.b1[j])));
    const z = h.reduce((a, hj, j) => a + hj * this.w2[j], this.b2);
    return { h, z, p: 1 / (1 + Math.exp(-z)) };
  }

  predict(x) {
    return this.forward(x).p;
  }

  // samples: [{ x, y (0/1), w (weight) }]. Full-batch gradient descent with L2.
  train(samples, { epochs = 400, lr = 0.5, l2 = 0.01 } = {}) {
    if (!samples.length) return 0;
    const H = this.hidden;
    const I = this.inputs;
    const wsum = samples.reduce((a, s) => a + (s.w ?? 1), 0);
    let loss = 0;
    for (let e = 0; e < epochs; e++) {
      const gw1 = this.w1.map((r) => new Array(I).fill(0));
      const gb1 = new Array(H).fill(0);
      const gw2 = new Array(H).fill(0);
      let gb2 = 0;
      loss = 0;
      for (const s of samples) {
        const w = (s.w ?? 1) / wsum;
        const { h, p } = this.forward(s.x);
        loss -= w * (s.y ? Math.log(p + 1e-9) : Math.log(1 - p + 1e-9));
        const dz = (p - s.y) * w;
        gb2 += dz;
        for (let j = 0; j < H; j++) {
          gw2[j] += dz * h[j];
          const dh = dz * this.w2[j] * (1 - h[j] * h[j]);
          gb1[j] += dh;
          const row = gw1[j];
          for (let i = 0; i < I; i++) row[i] += dh * s.x[i];
        }
      }
      for (let j = 0; j < H; j++) {
        this.w2[j] -= lr * (gw2[j] + l2 * this.w2[j]);
        this.b1[j] -= lr * gb1[j];
        for (let i = 0; i < I; i++) this.w1[j][i] -= lr * (gw1[j][i] + l2 * this.w1[j][i]);
      }
      this.b2 -= lr * gb2;
    }
    return loss;
  }

  toJSON() {
    return { inputs: this.inputs, hidden: this.hidden, w1: this.w1, b1: this.b1, w2: this.w2, b2: this.b2 };
  }

  static fromJSON(j) {
    if (!j || j.inputs !== N_FEATURES) return null; // features changed: start over
    const n = new TasteNet({ inputs: j.inputs, hidden: j.hidden });
    Object.assign(n, { w1: j.w1, b1: j.b1, w2: j.w2, b2: j.b2 });
    return n;
  }
}

export const MIN_LIKES = 3; // below this the net is not trusted and songs stay random

// The preference model: training data in, song choices out.
// makeMaterial(seed, styleId) -> composer.material() for a fresh song.
export class Taste {
  constructor({ makeMaterial, styles = STYLE_IDS, random = Math.random } = {}) {
    this.makeMaterial = makeMaterial;
    this.styles = styles;
    this.random = random;
    this.net = null;
    this.likes = 0;
    this.enabled = true;
    this.explore = 0.2; // share of songs that ignore the net completely
  }

  get ready() {
    return !!this.net && this.likes >= MIN_LIKES;
  }

  // likes / skips: arrays of feature vectors.
  fit(likes, skips = []) {
    this.likes = likes.length;
    if (!likes.length) {
      this.net = null;
      return null;
    }
    const samples = [
      ...likes.map((x) => ({ x, y: 1, w: 1 })),
      ...skips.map((x) => ({ x, y: 0, w: 0.6 })),
    ];
    // Background: random songs as weak negatives, about four per like.
    const n = Math.min(160, Math.max(30, likes.length * 4));
    for (let i = 0; i < n; i++) {
      const style = this.styles[Math.floor(this.random() * this.styles.length)];
      samples.push({ x: features(this.makeMaterial(Math.floor(this.random() * 1e9), style)), y: 0, w: 0.3 });
    }
    this.net = new TasteNet({ seed: likes.length * 7919 + skips.length });
    const loss = this.net.train(samples);
    return loss;
  }

  score(material) {
    return this.net ? this.net.predict(features(material)) : 0.5;
  }

  // A new seed. styleId: keep this style, or null to let taste pick the style too.
  // Returns { seed, style, score, picked: 'taste' | 'random' }.
  pick(styleId, { candidates = 16 } = {}) {
    const rnd = () => Math.floor(this.random() * 1e9);
    const styleOf = () => styleId || this.styles[Math.floor(this.random() * this.styles.length)];
    if (!this.enabled || !this.ready || this.random() < this.explore) {
      const seed = rnd();
      const style = styleOf();
      return { seed, style, score: this.net ? this.score(this.makeMaterial(seed, style)) : null, picked: 'random' };
    }
    const list = [];
    for (let i = 0; i < candidates; i++) {
      const seed = rnd();
      const style = styleOf();
      list.push({ seed, style, score: this.score(this.makeMaterial(seed, style)) });
    }
    // Softmax over logits so a good-but-not-best song still gets a turn.
    const logit = (p) => Math.log((p + 1e-6) / (1 - p + 1e-6));
    const ws = list.map((c) => Math.exp(logit(c.score) * 1.5));
    let r = this.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
      r -= ws[i];
      if (r <= 0) return { ...list[i], picked: 'taste' };
    }
    return { ...list[list.length - 1], picked: 'taste' };
  }

  // What the net has learned, for the screen: the features that push the score most.
  explain(top = 3) {
    if (!this.net) return [];
    const base = new Array(N_FEATURES).fill(0);
    const p0 = this.net.predict(base);
    return FEATURE_NAMES.map((name, i) => {
      const x = base.slice();
      x[i] = 1;
      return { name, effect: this.net.predict(x) - p0 };
    })
      .sort((a, b) => b.effect - a.effect)
      .slice(0, top);
  }
}
