// SPDX-License-Identifier: MIT
// The ragtime composer: writes original rags in the classic form (intro, two
// strains, the first strain again, a trio in the subdominant, ending) for
// piano, and arranges any rag measure for an early-jazz band: cornet (or
// xylophone) on the tune, clarinet runs, tailgate trombone, tuba on the two
// beats and drums. It also plays public-domain rags from MIDI (see scores.js).
//
// A bar is one 2/4 measure: { beats: 2, bpm, events, info }, beats in quarter notes.
// Events are { i: player, a: articulation, b: beat, d: beats, m: midi, v: 0..1 }.
// Pure (no Web Audio), so it runs in node tests and offline renders.

import { Rng } from '../rng.js';
import { bars as chordBars, pcs as chordPcs, chordAt, scalePcs, snap, fit, lineShift, NAMES, swingEvents } from './theory.js';
import { RANGE, RAG_SECTION_OF } from './band.js';

export const RAG_STYLES = {
  classic: {
    name: 'PIANO RAG', desc: 'A classic rag for solo piano: syncopated right hand over a striding left hand',
    bpm: [72, 84], band: 'off', lead: 'tp', drums: 'march', keys: [0, 5, 7, 10, 3, 8], harmony: 0.55,
  },
  cakewalk: {
    name: 'CAKEWALK', desc: 'A strutting march: cornet, tuba and snare join the piano on the repeats',
    bpm: [92, 104], band: 'auto', lead: 'tp', drums: 'march', keys: [0, 5, 7, 10], harmony: 0.45,
  },
  stomp: {
    name: 'DIXIELAND STOMP', desc: 'A hot New Orleans front line: cornet lead, clarinet runs, tailgate trombone',
    bpm: [100, 116], band: 'auto', lead: 'tp', drums: 'stomp', swing: 0.6, keys: [10, 3, 5, 0], harmony: 0.35, hot: true,
  },
  drag: {
    name: 'SLOW DRAG', desc: 'Slow and lazy: muted cornet, brushes and blue notes',
    bpm: [58, 66], band: 'auto', lead: 'tp', mute: true, drums: 'brush', blue: true, swing: 0.58, keys: [5, 10, 3], harmony: 0.6, slow: true,
  },
  novelty: {
    name: 'NOVELTY XYLOPHONE', desc: '1920s novelty: xylophone and temple blocks over a bouncing piano',
    bpm: [96, 108], band: 'auto', lead: 'xyl', drums: 'blocks', keys: [0, 7, 5], harmony: 0.3,
  },
};
export const RAG_STYLE_IDS = Object.keys(RAG_STYLES);

// One chord per 2/4 measure, 16 measures per strain ('-' splits a measure).
const A_PROGS = [
  'I I V7 V7 V7 V7 I I I I IV #ivo7 I-VI7 II7-V7 I I',
  'I I III7 III7 VI7 VI7 II7 V7 I I III7 III7 VI7 II7-V7 I I',
  'I IV I V7 I IV II7 V7 I IV I VI7 II7 V7 I I',
  'I I7 IV iv I VI7 II7 V7 I I7 IV iv I-VI7 II7-V7 I I',
];
const B_PROGS = [
  'V7 V7 I I V7 V7 I I II7 II7 V7 V7 I-VI7 II7-V7 I I',
  'vi vi III7 III7 vi vi II7 V7 vi vi III7 III7 IV #ivo7 I-V7 I',
  'IV IV I I II7 II7 V7 V7 IV IV I VI7 II7 V7 I I',
];
const C_PROGS = [
  'I I V7 V7 V7 V7 I I I I7 IV iv I-VI7 II7-V7 I I',
  'I I II7 II7 V7 V7 I I I I II7 II7 V7 V7 I I',
  'I VI7 II7 V7 I VI7 II7 V7 I I7 IV #ivo7 I-VI7 II7-V7 I I',
];
const INTROS = ['IV #ivo7 I-VI7 II7-V7', 'V7 V7 II7 V7', 'I I7 IV-#ivo7 I-V7'];

// Syncopated rhythm cells for one measure, as [beat, length] in quarter notes.
const CELLS = [
  [[0, 0.25], [0.25, 0.5], [0.75, 0.25], [1, 0.5], [1.5, 0.5]],
  [[0, 0.25], [0.25, 0.5], [0.75, 0.5], [1.25, 0.25], [1.5, 0.5]],
  [[0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.5], [1.25, 0.25], [1.5, 0.5]],
  [[0, 0.5], [0.5, 0.25], [0.75, 0.5], [1.25, 0.75]],
  [[0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25], [1, 0.25], [1.25, 0.25], [1.5, 0.5]],
  [[0, 0.75], [0.75, 0.25], [1, 0.25], [1.25, 0.75]],
  [[0, 0.25], [0.25, 0.5], [0.75, 1.25]],
  [[0.25, 0.25], [0.5, 0.25], [0.75, 0.5], [1.25, 0.25], [1.5, 0.5]],
];
const SLOW_CELLS = [CELLS[0], CELLS[3], CELLS[5], CELLS[6], [[0, 0.5], [0.5, 0.5], [1, 1]], [[0, 0.75], [0.75, 0.25], [1, 1]]];
const CADENCE = [[[0, 0.5], [0.5, 0.5], [1, 1]], [[0, 1], [1, 1]], [[0, 0.25], [0.25, 0.5], [0.75, 1.25]]];
const RUN = 4;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const isTone = (m, ps) => ps.includes(((m % 12) + 12) % 12);

// ---- writing a rag --------------------------------------------------------------

// One 16-measure strain: the melody plus its chords. Measures 9-12 repeat 1-4 (as rags do).
function writeStrain(rng, S, key, prog) {
  const chords = chordBars(prog, 2);
  const pool = S.slow ? SLOW_CELLS : CELLS;
  const pick = () => rng.pick(pool);
  const r0 = pick();
  let r1 = pick();
  if (r1 === r0) r1 = pick();
  const r2 = pick();
  const rhythms = [r0, r1, r0, r2, r0, r1, pick(), rng.pick(CADENCE), r0, r1, r0, r2, pick(), pick(), pick(), CADENCE[1]];
  const plan = [0, 2, 4, 2, 4, 5, 7, 4, 0, 2, 4, 2, 7, 5, 2, 0];
  const base = fit(key + 72, 69, 80);
  const lo = 66;
  const hi = 88;
  const seqShift = rng.pick([2, 3, -2, 5]);
  const measures = [];
  let cur = base + rng.pick([0, 4, 7]);
  let last = 0;
  for (let i = 0; i < 16; i++) {
    const ch = chords[i];
    let mel = [];
    if (i >= 8 && i < 11) {
      // The strain's second half starts like its first.
      mel = measures[i - 8].mel.map((n) => ({ ...n, m: snap(n.m, isTone(n.m, chordPcs(key, chordAt(measures[i - 8].chords, n.b))) ? chordPcs(key, chordAt(ch, n.b)) : scalePcs(key, chordAt(ch, n.b)), 1) }));
    } else if (i === 2 && measures[0]) {
      mel = measures[0].mel.map((n) => {
        const c = chordAt(ch, n.b);
        return { ...n, m: snap(n.m + seqShift, n.d >= 0.5 || n.b % 1 === 0 ? chordPcs(key, c) : scalePcs(key, c, S.blue), Math.sign(seqShift)) };
      });
    } else {
      const cells = rhythms[i];
      const run = cells === pool[RUN] && !S.slow;
      const target = base + plan[i];
      const dir0 = rng.chance(0.5) ? 1 : -1;
      cells.forEach(([b, d], j) => {
        const c = chordAt(ch, b);
        const tones = chordPcs(key, c);
        const scale = scalePcs(key, c, S.blue && rng.chance(0.3));
        const strong = b % 0.5 === 0 && (d >= 0.5 || b % 1 === 0);
        let want;
        if (run) {
          want = cur + dir0 * (j === 0 ? 0 : 3);
        } else {
          const dir = Math.abs(last) >= 5 ? -Math.sign(last) : Math.sign(target - cur) || (rng.chance(0.5) ? 1 : -1);
          want = cur + dir * rng.weighted([[1, 2], [2, 4], [3, 3], [4, 3], [5, 2], [7, 1]]);
        }
        if ((i === 15 || i === 7) && j === cells.length - 1) want = snap(target, i === 15 ? [key] : [(key + 7) % 12, (key + 2) % 12], 1);
        let m = snap(want, run || strong || d >= 0.5 ? tones : scale, Math.sign(want - cur) || 1);
        m = clamp(m, lo, hi);
        last = m - cur;
        cur = m;
        mel.push({ b, d, m });
      });
      // Chromatic lower neighbours into chord tones, the ragtime sigh.
      for (let k = 0; k + 1 < mel.length; k++) {
        if (mel[k].d <= 0.25 && rng.chance(0.28) && isTone(mel[k + 1].m, chordPcs(key, chordAt(ch, mel[k + 1].b)))) mel[k].m = mel[k + 1].m - 1;
      }
    }
    measures.push({ chords: ch, mel });
  }
  return measures;
}

// Right hand: the tune, with chord tones under the longer notes. Left hand: stride.
function pianoNotes(meas, key, S, rng, { pos, len, nextChord, final }) {
  const out = [];
  for (const n of meas.mel) {
    const c = chordAt(meas.chords, n.b);
    const ps = chordPcs(key, c);
    out.push({ b: n.b, d: n.d, m: n.m, h: 0, v: 0.64 + (n.b % 0.5 ? 0.04 : 0) });
    if ((n.d >= 0.5 || (n.b % 0.5 !== 0 && n.d >= 0.25)) && rng.chance(S.harmony + (n.d >= 0.75 ? 0.2 : 0))) {
      let m = n.m - 1;
      let k = 0;
      while (m > n.m - 10 && k < 2) {
        if (isTone(m, ps) && n.m - m >= 3) {
          out.push({ b: n.b, d: n.d, m, h: 0, v: 0.48 });
          k++;
          m -= 3;
        } else m--;
      }
    } else if (n.d >= 0.5 && isTone(n.m, ps) && rng.chance(0.25)) out.push({ b: n.b, d: n.d, m: n.m - 12, h: 0, v: 0.5 });
  }
  if (final) {
    const ps = chordPcs(key, meas.chords[0]);
    out.length = 0;
    const top = fit(key + 72, 72, 83);
    for (const m of [top, top - 12, ...stack(ps, 60, 3)]) out.push({ b: 0, d: 1.5, m, h: 0, v: 0.7 });
    const r = fit(key + 36, 33, 44);
    out.push({ b: 0, d: 1.5, m: r, h: 1, v: 0.7 }, { b: 0, d: 1.5, m: r + 12, h: 1, v: 0.6 });
    return out;
  }
  // Left hand, per quarter: bass (octave) on the beat, chord on the off-beat.
  const brk = (pos === len - 1 || pos === 7) && len >= 16 && nextChord;
  for (const q of [0, 1]) {
    const c = chordAt(meas.chords, q);
    const ps = chordPcs(key, c);
    const same = q === 1 && chordAt(meas.chords, 0) === c;
    let bass = fit(same ? ps[2] : ps[0], 0, 11) + 36;
    bass = fit(bass, 31, 45);
    if (brk && q === 1) {
      // A walking-octave break into the next strain.
      const nr = fit(chordPcs(key, nextChord)[0] + 36, 33, 45);
      for (const [b, m] of [[1, nr - 2], [1.5, nr - 1]]) out.push({ b, d: 0.45, m, h: 1, v: 0.62 }, { b, d: 0.45, m: m + 12, h: 1, v: 0.54 });
      continue;
    }
    out.push({ b: q, d: 0.45, m: bass, h: 1, v: 0.6 });
    if (bass + 12 <= 52 && (q === 0 || rng.chance(0.5))) out.push({ b: q, d: 0.45, m: bass + 12, h: 1, v: 0.5 });
    for (const m of stack(c.q === 'dom7' || c.q === 'dim7' ? ps.slice(1) : ps, 53, 3)) out.push({ b: q + 0.5, d: 0.4, m, h: 1, v: 0.44 });
  }
  return out;
}

// n chord tones upward from lo.
function stack(ps, lo, n) {
  const out = [];
  for (let m = lo; out.length < n && m < lo + 14; m++) if (isTone(m, ps)) out.push(m);
  return out;
}

export function writeRag(seed, styleId) {
  const S = RAG_STYLES[styleId];
  const rng = new Rng(seed);
  const key = rng.pick(S.keys);
  const A = writeStrain(rng, S, key, rng.pick(A_PROGS));
  const B = writeStrain(rng, S, key, rng.pick(B_PROGS));
  const C = writeStrain(rng, S, (key + 5) % 12, rng.pick(C_PROGS));
  const introChords = chordBars(rng.pick(INTROS), 2);
  // The intro: the end of strain A over the intro chords.
  const intro = introChords.map((ch, i) => ({ chords: ch, mel: A[12 + i].mel.map((n) => ({ ...n, m: snap(n.m, scalePcs(key, chordAt(ch, n.b)), 1) })) }));
  const bpm = rng.int(S.bpm[0], S.bpm[1]);
  return { name: `${S.name} No. ${seed % 1000}`, source: 'Original, written by the composer from a seed', key, bpm, style: styleId, strains: { intro, A, B, C }, seed };
}

// ---- the band ---------------------------------------------------------------

class Writer {
  constructor(avail, rng) {
    this.events = [];
    this.avail = avail;
    this.rng = rng;
  }
  has(i) {
    return this.avail[RAG_SECTION_OF[i]] !== false;
  }
  add(i, a, b, d, m, v, extra) {
    if (!this.has(i)) return;
    if (m != null && RANGE[i]) m = fit(m, RANGE[i][0], RANGE[i][1]);
    this.events.push({ i, a, b: Math.max(0, b), d, m, v: clamp(v + this.rng.float(-0.03, 0.03), 0.05, 1), ...extra });
  }
}

// The melody a band hears in a measure: the top note of each right-hand onset.
export function topLine(notes) {
  const by = new Map();
  for (const n of notes) if (n.h === 0) if (!by.has(n.b) || by.get(n.b).m < n.m) by.set(n.b, n);
  return [...by.values()].sort((a, b) => a.b - b.b);
}

function bandPart(w, ctx) {
  const { S, key, chords, mel, pos, len, e, rng, state, nextChord, spb } = ctx;
  const vel = 0.3 + 0.6 * e;
  const lead = S.lead;
  // Tune
  if (lead === 'xyl') {
    for (const n of mel) {
      const m = n.m + (state.xylShift ?? 12);
      if (n.d >= 0.5 && n.d * spb > 0.3) for (let b = n.b; b < n.b + n.d - 0.01; b += 0.125) w.add('xyl', 'hit', b, 0.125, m, vel - 0.06 + (b === n.b ? 0.08 : 0));
      else w.add('xyl', 'hit', n.b, n.d, m, vel + 0.05);
    }
  } else if (w.has('tp')) {
    const s = state.leadShift ?? 0;
    for (let k = 0; k < mel.length; k++) {
      const n = mel[k];
      const art = S.mute ? 'mute' : n.d * spb < 0.2 ? 'stac' : 'sus';
      w.add('tp', art, n.b, Math.max(0.1, n.d * 0.92), n.m + s, vel - 0.02);
    }
  }
  // Clarinet: runs over the chords, above the tune.
  if (((S.hot && e > 0.55) || e > 0.72) && !S.mute && lead !== 'xyl') {
    const step = S.hot && e > 0.85 ? 0.25 : 0.5;
    const up = pos % 2 === 0;
    for (let b = 0; b < 2 - 1e-6; b += step) {
      const ps = chordPcs(key, chordAt(chords, b));
      state.cl = state.cl ?? 76;
      let m = snap(state.cl + (up ? 2 : -2), ps, up ? 1 : -1);
      if (m > 86) m -= 12;
      if (m < 70) m += 12;
      state.cl = m;
      w.add('cl', 'sus', b, step * 0.95, m, vel - 0.24 + (b % 1 === 0 ? 0.05 : 0));
    }
    if (pos === len - 1) for (let j = 0; j < 4; j++) w.add('cl', 'stac', 1 + j * 0.25, 0.24, snap(82 - j * 3, chordPcs(key, chordAt(chords, 1)), -1), vel - 0.1);
  }
  // Trombone: tailgate guide tones that slide by step, and a fall into each new strain.
  if (e > 0.55 || S.hot) {
    for (const c of chords) {
      const ps = chordPcs(key, c);
      const guide = [ps[1], ps[3] ?? ps[2]];
      state.tb = snap(state.tb ?? 55, guide, rng.chance(0.5) ? 1 : -1);
      state.tb = clamp(state.tb, 46, 62);
      const d = (chords.length > 1 ? 1 : 2) * 0.95;
      if (pos === len - 1 && c.at >= 1 - 1e-6 && S.hot) w.add('tb', 'fall', c.at, 1, state.tb + 5, vel);
      else w.add('tb', S.hot ? 'vib' : 'sus', c.at, d, state.tb, vel - 0.2);
    }
    if (pos === len - 1 && chords.length === 1 && S.hot) w.add('tb', 'fall', 1, 1, (state.tb ?? 55) + 5, vel);
  }
  // Tuba on the two beats.
  for (const q of [0, 1]) {
    const c = chordAt(chords, q);
    const ps = chordPcs(key, c);
    const same = q === 1 && chordAt(chords, 0) === c;
    let m = fit((same ? ps[2] : ps[0]) + 36, 31, 46);
    if (q === 1 && pos === len - 1 && nextChord) m = fit(chordPcs(key, nextChord)[0] + 36 - 1, 31, 46);
    w.add('tu', 'stac', q, 0.42, m, vel - 0.02);
  }
  drums(w, S.drums, { pos, len, vel, e, rng });
}

function drums(w, kind, { pos, len, vel, e }) {
  const first = pos === 0;
  const lastM = pos === len - 1;
  if (kind === 'march') {
    w.add('bd', 'hit', 0, 0.5, null, vel * 0.55);
    w.add('bd', 'hit', 1, 0.5, null, vel * 0.45);
    for (const [b, v] of [[0.5, 0.5], [1.5, 0.5], [0.75, 0.25], [1.75, 0.25]]) w.add('sn', 'hit', b, 0.25, null, vel * v);
    if (lastM) w.add('sn', 'roll', 1, 1, null, vel * 0.3, { v2: vel * 0.7 });
    if (first) w.add('cym', 'crash', 0, 2, null, vel * 0.6);
  } else if (kind === 'stomp') {
    w.add('bd', 'hit', 0, 0.5, null, vel * 0.5);
    w.add('bd', 'hit', 1, 0.5, null, vel * 0.4);
    w.add('sn', 'hit', 0.5, 0.25, null, vel * 0.6);
    w.add('sn', 'hit', 1.5, 0.25, null, vel * 0.62);
    for (const b of [0.25, 0.75, 1.25, 1.75]) w.add('tap', 'hit', b, 0.25, null, vel * 0.3);
    w.add('hh', 'pedal', 0.5, 0.25, null, vel * 0.5);
    w.add('hh', 'pedal', 1.5, 0.25, null, vel * 0.5);
    if (first || (e > 0.8 && pos % 4 === 0)) w.add('cym', 'crash', 0, 2, null, vel * 0.55);
    if (lastM) for (let j = 0; j < 4; j++) w.add('sn', 'hit', 1 + j * 0.25, 0.25, null, vel * (0.4 + j * 0.1));
  } else if (kind === 'brush') {
    for (let b = 0; b < 2 - 1e-6; b += 0.5) w.add('tap', 'hit', b, 0.5, null, vel * (b % 1 ? 0.3 : 0.4));
    w.add('hh', 'pedal', 0.5, 0.25, null, vel * 0.4);
    w.add('hh', 'pedal', 1.5, 0.25, null, vel * 0.4);
    w.add('bd', 'hit', 0, 0.5, null, vel * 0.25);
  } else if (kind === 'blocks') {
    for (const [b, m, v] of [[0, 84, 0.5], [0.5, 79, 0.4], [1, 84, 0.45], [1.5, 72, 0.42], [1.75, 79, 0.3]]) w.add('blk', 'hit', b, 0.25, m, vel * v + 0.05);
    w.add('bd', 'hit', 0, 0.5, null, vel * 0.4);
    if (first) w.add('cym', 'crash', 0, 2, null, vel * 0.5);
  }
}

// ---- the composer ------------------------------------------------------------

const SEC_E = { intro: 0.45, A: 0.55, B: 0.62, C: 0.7, end: 0.8 };

export class RagComposer {
  // score: a parsed public-domain rag ({ measures, piece }) from scores.js, or null for an original.
  constructor({ seed = 1, style = 'classic', score = null, intensity = 0.6, auto = true, tempo = 1, avail = {}, band = 'auto', loop = true } = {}) {
    this.seed = seed;
    this.intensity = intensity;
    this.auto = auto;
    this.tempo = tempo;
    this.avail = avail;
    this.band = band; // 'auto' | 'on' | 'off'
    this.loop = loop;
    this.rng = new Rng(seed ^ 0x7a9);
    this.bar = 0;
    this.cycle = 0;
    this.styleId = RAG_STYLES[style] ? style : 'classic';
    this.score = score;
    this.ended = false;
    this.pendingEnd = false;
    this.plan();
  }

  get S() {
    return { ...RAG_STYLES[this.styleId], ...(this.score?.piece?.style || {}) };
  }

  plan() {
    this.state = {};
    if (this.score) {
      const p = this.score.piece;
      this.tune = { name: p.name, source: p.source, key: 0, bpm: p.bpm };
      this.queue = this.score.measures.map((m, i) => ({ kind: m.section, pos: m.pos, len: 16, score: m, repeat: m.repeat, idx: i }));
      return;
    }
    const rag = writeRag(this.seed + this.cycle * 7919, this.styleId);
    this.tune = rag;
    const q = [];
    const add = (kind, strain, key, repeat) => strain.forEach((meas, i) => q.push({ kind, pos: i, len: strain.length, meas, key, repeat, next: strain[i + 1]?.chords[0] }));
    const { intro, A, B, C } = rag.strains;
    add('intro', intro, rag.key, false);
    add('A', A, rag.key, false);
    add('A', A, rag.key, true);
    add('B', B, rag.key, false);
    add('B', B, rag.key, true);
    add('A', A, rag.key, true);
    add('C', C, (rag.key + 5) % 12, false);
    add('C', C, (rag.key + 5) % 12, true);
    // Link each strain's last measure to the next strain's first chord (in its own key).
    for (let i = 0; i + 1 < q.length; i++) if (!q[i].next && q[i + 1].meas) q[i].next = transpose(q[i + 1].meas.chords[0], q[i + 1].key, q[i].key);
    q.push({ kind: 'end', pos: 0, len: 2, meas: { chords: C[15].chords, mel: [] }, key: (rag.key + 5) % 12, repeat: true, final: true });
    q.push({ kind: 'rest', pos: 0, len: 1 });
    this.queue = q;
  }

  next() {
    const cur = this.queue[0];
    if (!cur) return;
    while (this.queue.length > 1 && this.queue[0].kind === cur.kind && this.queue[0].repeat === cur.repeat && this.queue[0].kind !== 'end') this.queue.shift();
  }

  // The big finish: straight to the trio's repeat with the whole band.
  climax() {
    const i = this.queue.findLastIndex((s) => s.kind === 'C' && s.pos === 0);
    if (i > 0) this.queue.splice(0, i);
    this.forceBand = true;
  }

  end() {
    this.pendingEnd = true;
    const i = this.queue.findIndex((s) => s.kind === 'end');
    if (i > 0) {
      const at = this.queue.findIndex((s) => s.pos === 0 && s.kind !== this.queue[0].kind);
      if (at > 0 && at < i) this.queue.splice(at, i - at);
    }
  }

  bandOn(sec) {
    if (this.forceBand && sec.kind !== 'intro') return true;
    if (this.band === 'on') return true;
    if (this.band === 'off') return false;
    if (this.S.band === 'off') return false;
    return sec.repeat || sec.kind === 'end' || (sec.kind === 'C' && this.intensity > 0.7);
  }

  energy(sec) {
    const base = (SEC_E[sec.kind] ?? 0.55) + (sec.repeat ? 0.12 : 0);
    if (!this.auto) return clamp(this.intensity, 0.05, 1);
    return clamp(base * (0.5 + 0.8 * this.intensity), 0.05, 1);
  }

  nextBar() {
    if (!this.queue.length) {
      if (this.pendingEnd || (this.score && !this.loop)) {
        this.ended = true;
        return null;
      }
      this.cycle++;
      this.forceBand = false;
      this.plan();
    }
    const sec = this.queue.shift();
    const S = this.S;
    const tune = this.tune;
    let bpm = tune.bpm * this.tempo;
    if (sec.kind === 'end') bpm *= 0.92;
    const beats = sec.score?.beats ?? 2;
    if (sec.kind === 'rest') {
      this.bar++;
      return { beats: 2, bpm, events: [], info: { section: 'rest', bar: this.bar, name: tune.name, chord: '', key: '' } };
    }
    const e = this.energy(sec);
    const w = new Writer(this.avail, this.rng);
    const band = this.bandOn(sec);
    let key;
    let notes;
    let chords;
    let mel;
    if (sec.score) {
      key = 0;
      notes = sec.score.notes;
      chords = sec.score.chords;
      mel = topLine(notes);
      if (sec.pos === 0 || this.state.leadShift == null) this.state.leadShift = leadShift(this.score.measures, this.queue, sec, S);
    } else {
      key = sec.key;
      notes = pianoNotes(sec.meas, key, S, this.rng, { pos: sec.pos, len: sec.len, nextChord: sec.next, final: sec.final });
      chords = sec.meas.chords;
      mel = sec.meas.mel;
      if (sec.pos === 0) {
        const strainMel = this.queue.filter((s) => s.kind === sec.kind && s.repeat === sec.repeat).flatMap((s) => s.meas?.mel || []).concat(mel);
        this.state.leadShift = lineShift(strainMel.map((n) => n.m), 62, 81);
        this.state.xylShift = lineShift(strainMel.map((n) => n.m), 76, 98);
      }
    }
    // Piano
    const pv = 0.4 + 0.55 * e;
    for (const n of notes) {
      let v = n.v * (pv / 0.65);
      if (band && n.h === 0) v -= 0.12;
      if (band && n.h === 1 && n.m < 48) v -= 0.08;
      w.add('pno', 'hit', n.b, Math.max(0.08, n.d), n.m, v);
    }
    if (band && !sec.final && beats >= 2) bandPart(w, { S, key, chords, mel, pos: sec.pos, len: sec.len, e, rng: this.rng, state: this.state, nextChord: sec.next, spb: 60 / bpm });
    if (sec.final && band) {
      const ps = chordPcs(key, chords[0]);
      w.add('tp', 'sus', 0, 1.5, fit(ps[0] + 72, 70, 81), 0.8);
      w.add('cl', 'sus', 0, 1.5, fit(ps[1] + 72, 76, 88), 0.7);
      w.add('tb', 'fall', 0, 1.5, fit(ps[2] + 48, 50, 62), 0.75);
      w.add('tu', 'sus', 0, 1.2, fit(ps[0] + 36, 31, 45), 0.75);
      w.add('cym', 'crash', 0, 2, null, 0.75);
      w.add('bd', 'hit', 0, 1, null, 0.7);
    }
    let events = band ? avoidClashes(w.events) : w.events;
    if (S.swing) events = swingEvents(events, S.swing, 0.5);
    this.bar++;
    const ch = chords[0];
    return {
      beats,
      bpm,
      events,
      info: { section: sec.kind, repeat: !!sec.repeat, pos: sec.pos, len: sec.len, bar: this.bar, chord: sec.score ? '' : chordName(key, ch), key: sec.score ? '' : NAMES[key], name: tune.name, band, e },
    };
  }
}

// The band's harmony notes must not rub a semitone against what the piano
// is playing at the same time (chords read from a score are only a guess).
// A clarinet or trombone note that would is moved to the nearest note that
// fits, preferring notes the piano has; a long one is cut where a clash starts.
const HARMONY = new Set(['cl', 'tb']);
const rub = (a, b) => {
  const iv = (((a - b) % 12) + 12) % 12;
  return iv === 1 || iv === 11;
};
export function avoidClashes(events) {
  const pno = events.filter((e) => e.i === 'pno');
  const out = [];
  for (const e of events) {
    if (!HARMONY.has(e.i) || e.m == null) {
      out.push(e);
      continue;
    }
    const over = (t0, t1) => pno.filter((p) => p.b < t1 - 0.01 && p.b + p.d > t0 + 0.01);
    const head = over(e.b, e.b + Math.min(e.d, 0.5));
    const [lo, hi] = RANGE[e.i];
    const fits = (m) => m >= lo && m <= hi && !head.some((p) => rub(m, p.m));
    let m = e.m;
    if (!fits(m)) {
      const have = new Set(head.map((p) => ((p.m % 12) + 12) % 12));
      let best = null;
      for (let k = 1; k <= 4 && best == null; k++) {
        for (const c of [m - k, m + k]) if (fits(c) && have.has(((c % 12) + 12) % 12)) best ??= c;
      }
      for (let k = 1; k <= 2 && best == null; k++) for (const c of [m - k, m + k]) if (fits(c)) best ??= c;
      if (best == null) continue;
      m = best;
    }
    let d = e.d;
    for (const p of over(e.b, e.b + e.d)) if (p.b > e.b + 0.4 && rub(m, p.m)) d = Math.min(d, p.b - e.b);
    out.push({ ...e, m, d });
  }
  return out;
}

function transpose(ch, from, to) {
  return { ...ch, r: (ch.r + from - to + 24) % 12 };
}

function leadShift(measures, queue, sec, S) {
  const ms = [];
  for (const m of measures) if (m.section === sec.kind) for (const n of topLine(m.notes)) ms.push(n.m);
  return lineShift(ms.length ? ms : [72], S.lead === 'xyl' ? 76 : 62, S.lead === 'xyl' ? 98 : 81);
}

export function chordName(key, ch) {
  if (!ch) return '';
  return NAMES[(key + ch.r) % 12] + ({ maj: '', min: 'm', dim: 'dim', aug: '+', six: '6', min6: 'm6', maj7: 'maj7', min7: 'm7', dom7: '7', dom9: '9', dim7: 'dim7', hdim: 'm7b5' }[ch.q] ?? '');
}
