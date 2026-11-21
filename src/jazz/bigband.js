// SPDX-License-Identifier: MIT
// The big band composer: writes original swing tunes (32-bar AABA songs,
// 12-bar blues, minor tom-tom stompers) and arranges them the way swing-era
// bands did: intro, the head with the reeds in close harmony and brass
// punches, improvised solo choruses with section backgrounds, a shout chorus
// with the trumpets screaming on top, the head out and a tag ending.
//
// A bar is one 4/4 measure: { beats: 4, bpm, events, info }.
// Events are { i: player, a: articulation, b: beat, d: beats, m: midi, v: 0..1 }.
// Pure (no Web Audio), so it runs in node tests and offline renders.

import { Rng } from '../rng.js';
import { bars as chordBars, pcs as chordPcs, fourPcs, chordAt, scalePcs, closeBelow, shell, snap, fit, lineShift, line, NAMES, swingEvents } from './theory.js';
import { RANGE, BB_SECTION_OF } from './band.js';
import { chordName } from './ragtime.js';

export const BB_STYLES = {
  swing: {
    name: 'SWING BOUNCE', desc: 'A 32-bar song at a bouncing tempo: reeds on the tune, brass punches, a shout chorus',
    bpm: [136, 160], form: 'AABA', swing: 0.64, feel: 'ride', keys: [5, 10, 3, 0, 7], soloists: ['stp', 'scl', 'stb', 'pno'], two: true,
  },
  jump: {
    name: 'JUMP BLUES', desc: 'Fast 12-bar riffs: call and response between the reeds and the brass',
    bpm: [192, 220], form: 'blues', swing: 0.6, feel: 'ride', keys: [10, 5, 3, 0], soloists: ['stp', 'scl', 'stb'], riff: true,
  },
  kc: {
    name: 'KANSAS CITY SHUFFLE', desc: 'Medium blues with a shuffle beat, plinking piano and riffing horns',
    bpm: [116, 132], form: 'blues', swing: 0.68, feel: 'shuffle', keys: [5, 10, 0, 7], soloists: ['pno', 'stb', 'stp'], riff: true, basie: true,
  },
  ballad: {
    name: 'MOONLIGHT BALLAD', desc: 'Slow and dreamy: clarinet on the tune, muted trumpets, brushes',
    bpm: [64, 76], form: 'AABA', swing: 0.6, feel: 'brush', keys: [3, 5, 10, 0], soloists: ['scl', 'stb', 'pno'], mute: true, ballad: true, two: true,
  },
  jungle: {
    name: 'JUNGLE DRUMS', desc: 'Minor key and pounding tom-toms, wailing clarinet, the brass on fire',
    bpm: [184, 204], form: 'minor', swing: 0.6, feel: 'toms', keys: [2, 9, 7, 0], soloists: ['scl', 'stp'], riff: true, minor: true,
  },
};
export const BB_STYLE_IDS = Object.keys(BB_STYLES);

const A_PROGS = [
  ['I6 vi7-ii7 iii7-VI7 ii7-V7 I6 I7 IV6-#ivo7', 'I6-VI7 ii7-V7', 'I6-VI7 ii7-V7', 'I6 I6'],
  ['I6 #io7 ii7 V7 iii7 VI7', 'ii7-V7 I6-V7', 'ii7-V7 I6-V7', 'ii7-V7 I6'],
  ['I6 I6 II7 II7 ii7 V7', 'I6-vi7 ii7-V7', 'I6-vi7 ii7-V7', 'I6 I6'],
  ['Imaj7 vi7 ii7 V7 Imaj7 VI7', 'ii7-V7 I6-V7', 'ii7-V7 I6-V7', 'ii7-V7 I6'],
];
const B_PROGS = ['III7 III7 VI7 VI7 II7 II7 V7 V7', 'IV6 IV6 iv6 iv6 I6 VI7 II7 V7', 'vi7 II7 ii7 V7 IV6 #ivo7 ii7 V7'];
const BLUES = ['I7 IV7 I7 I7 IV7 #ivo7 I7 VI7 ii7 V7 I7-VI7 ii7-V7', 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', 'I7 IV7 I7 v7-I7 IV7 IV7 I7 VI7 II7 V7 I7-IV7 I7-V7'];
const MINOR_A = ['i6 i6 iv6 i6 bVI7 V7 i6 V7', 'i6 iv6 i6 i6 bVI7 bVI7 V7 V7', 'i6 i6 bVI7 V7 i6 i6 bVI7-V7 i6'];
const MINOR_B = ['iv6 iv6 i6 i6 bVI7 bVI7 V7 V7', 'bVI7 V7 i6 i6 iv6 iv6 V7 V7'];

// One-bar rhythm cells (straight eighths; swing is applied at the end).
const CELLS = [
  [[0, 1], [1, 0.5], [1.5, 1.5], [3, 1]],
  [[0.5, 0.5], [1, 0.5], [1.5, 1], [2.5, 1.5]],
  [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]],
  [[0, 1.5], [1.5, 0.5], [2, 2]],
  [[0, 0.5], [0.5, 1], [1.5, 0.5], [2, 0.5], [2.5, 1.5]],
  [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 0.5], [3, 1]],
  [[0, 2.5], [3, 0.5], [3.5, 0.5]],
];
const BALLAD_CELLS = [[[0, 2], [2, 1], [3, 1]], [[0, 3], [3, 1]], [[0, 1], [1, 1], [2, 2]], [[0, 4]], [[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 1], [1, 0.5], [1.5, 2.5]]];
const LONG = [[[0, 4]], [[0, 2], [2, 2]], [[0, 3], [3, 1]]];
// Short brass punches: beats that land on the off-beats.
const PUNCH = [[[1.5, 0.5], [3.5, 0.5]], [[1.5, 0.5]], [[0, 0.5], [1.5, 0.5]], [[3.5, 0.5]], [[2.5, 0.5], [3.5, 0.5]]];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const isTone = (m, ps) => ps.includes(((m % 12) + 12) % 12);

// ---- writing a tune ----------------------------------------------------------

function writeMelody(rng, S, key, chords, kind, base) {
  const n = chords.length;
  const pool = S.ballad ? BALLAD_CELLS : CELLS;
  const r0 = rng.pick(pool);
  let r1 = rng.pick(pool);
  if (r1 === r0) r1 = rng.pick(pool);
  let rhythms;
  if (kind === 'B') rhythms = Array.from({ length: n }, (_, i) => (i % 2 ? rng.pick(LONG) : S.ballad ? rng.pick(pool) : rng.pick([pool[3], pool[0], pool[6]])));
  else if (n === 12) rhythms = [r0, r1, r0, r1, r0, r1, r0, r1, rng.pick(pool), rng.pick(pool), r0, rng.pick(LONG)];
  else rhythms = [r0, r1, r0, rng.pick(pool), r0, r1, rng.pick(pool), rng.pick(LONG)].slice(0, n);
  while (rhythms.length < n) rhythms.push(rng.pick(pool));
  const bars = [];
  let cur = base + rng.pick([0, 4, 7]);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const ch = chords[i];
    const mel = [];
    // Riff tunes repeat their first bars over the new chords (bar 3 = bar 1, refitted).
    const src = kind !== 'B' && (i === 2 || i === 4 || (n === 12 && (i === 6 || i === 10))) ? bars[i % 2 === 0 ? 0 : 1] : null;
    if (src && (S.riff || rng.chance(0.6))) {
      for (const x of src.mel) {
        const c = chordAt(ch, x.b);
        const strong = x.d >= 1 || x.b % 1 === 0;
        mel.push({ b: x.b, d: x.d, m: snap(x.m, strong ? fourPcs(key, c) : scalePcs(key, c, S.form === 'blues'), 1) });
      }
      cur = mel.length ? mel[mel.length - 1].m : cur;
      bars.push({ chords: ch, mel });
      continue;
    }
    const target = base + (kind === 'B' ? [5, 7, 4, 2, 5, 9, 7, 2][i % 8] : [0, 2, 4, 2, 0, 4, 7, 0][i % 8]);
    rhythms[i].forEach(([b, d], j) => {
      const c = chordAt(ch, b);
      const tones = fourPcs(key, c);
      const scale = scalePcs(key, c, S.form === 'blues' && rng.chance(0.4));
      const strong = b % 1 === 0 || d >= 1;
      const dir = Math.abs(last) >= 5 ? -Math.sign(last) : Math.sign(target - cur) || (rng.chance(0.5) ? 1 : -1);
      let want = j === 0 && i === 0 ? cur : cur + dir * rng.weighted([[1, 3], [2, 4], [3, 3], [4, 2], [5, 1]]);
      if (i === n - 1 && j === rhythms[i].length - 1 && kind !== 'B') want = snap(target, [key, (key + 4) % 12, (key + 9) % 12], 1);
      let m = snap(want, strong ? tones : scale, Math.sign(want - cur) || 1);
      m = clamp(m, base - 5, base + 14);
      last = m - cur;
      cur = m;
      mel.push({ b, d, m });
    });
    bars.push({ chords: ch, mel });
  }
  return bars;
}

export function writeTune(seed, styleId) {
  const S = BB_STYLES[styleId];
  const rng = new Rng(seed);
  const key = rng.pick(S.keys);
  const base = fit(key + 64, 62, 72);
  const sections = [];
  if (S.form === 'blues') {
    const ch = chordBars(rng.pick(BLUES), 4);
    sections.push({ label: 'A', bars: writeMelody(rng, S, key, ch, 'A', base) });
  } else if (S.form === 'minor') {
    const A = writeMelody(rng, S, key, chordBars(rng.pick(MINOR_A), 4), 'A', base);
    const B = writeMelody(rng, S, key, chordBars(rng.pick(MINOR_B), 4), 'B', base);
    sections.push({ label: 'A', bars: A }, { label: 'A', bars: A }, { label: 'B', bars: B }, { label: 'A', bars: A });
  } else {
    const [body, end1, end2, endLast] = rng.pick(A_PROGS);
    const chA1 = chordBars(`${body} ${end1}`, 4);
    const chA3 = chordBars(`${body} ${endLast}`, 4);
    const A1 = writeMelody(rng, S, key, chA1, 'A', base);
    // The last A: the same tune, closing on the tonic.
    const A3 = A1.map((bar, i) => (i < 6 ? { ...bar, chords: chA3[i] } : { chords: chA3[i], mel: i === 7 ? [{ b: 0, d: 3, m: snap(bar.mel[0]?.m ?? base, [key, (key + 4) % 12, (key + 9) % 12], 1) }] : bar.mel }));
    const B = writeMelody(rng, S, key, chordBars(rng.pick(B_PROGS), 4), 'B', base);
    sections.push({ label: 'A', bars: A1 }, { label: 'A', bars: A1.map((b, i) => (i < 6 ? b : { ...b, chords: chordBars(`${body} ${end2}`, 4)[i] })) }, { label: 'B', bars: B }, { label: 'A', bars: A3 });
  }
  const bpm = rng.int(S.bpm[0], S.bpm[1]);
  return { name: `${S.name} No. ${seed % 1000}`, source: 'Original, written by the composer from a seed', key, bpm, style: styleId, sections, seed };
}

// ---- public-domain tunes -------------------------------------------------------

function written(chords, mel, tr) {
  const cb = chordBars(chords, 4);
  const mb = mel.split('|');
  if (cb.length !== mb.length) throw new Error(`tune: ${cb.length} chord bars, ${mb.length} melody bars`);
  return cb.map((ch, i) => {
    const l = line(mb[i]);
    if (Math.abs(l.beats - 4) > 1e-6) throw new Error(`tune bar ${i + 1} has ${l.beats} beats`);
    return { chords: ch, mel: l.notes.map((n) => ({ ...n, m: n.m + tr })) };
  });
}

export const BB_TUNES = [
  {
    id: 'saints', name: 'WHEN THE SAINTS GO MARCHING IN', source: 'Traditional spiritual', pd: 'Traditional', style: 'swing', bpm: 172, key: 5,
    sections: () => [{
      label: 'A',
      bars: written(
        'I I I I I I I V7 I I I7 IV I I V7 I',
        'r:1 C4:1 E4:1 F4:1|G4:4|r:1 C4:1 E4:1 F4:1|G4:4|r:1 C4:1 E4:1 F4:1|G4:2 E4:2|C4:2 E4:2|D4:4|r:1 E4:1 E4:1 D4:1|C4:3 C4:1|E4:2 G4:1.5 G4:0.5|F4:4|r:1 E4:1 F4:1 G4:1|E4:2 C4:2|D4:4|C4:4',
        5,
      ),
    }],
  },
  // Maple Leaf Rag in swing, as the swing bands played it: its first two strains, each 2/4 measure as a 4/4 bar.
  { id: 'maple-swing', name: 'MAPLE LEAF RAG (SWING)', source: 'Scott Joplin, 1899', pd: 'Joplin died 1917', style: 'jump', bpm: 196, key: 8, rag: 'maple' },
];
export const BB_TUNE_BY_ID = Object.fromEntries(BB_TUNES.map((t) => [t.id, t]));

// A rag (from scores.js) as swing sections: 16 measures per strain, time doubled.
export function sectionsFromRag(rag, strains = [0, 1]) {
  const out = [];
  for (const s of strains) {
    const ms = rag.measures.filter((m) => m.strain === s && !m.repeat && m.beats === 2).slice(0, 16);
    if (ms.length < 16) continue;
    const bars = ms.map((m) => {
      const tops = new Map();
      for (const n of m.notes) if (n.h === 0 && (!tops.has(n.b) || tops.get(n.b).m < n.m)) tops.set(n.b, n);
      const mel = [...tops.values()].sort((a, b) => a.b - b.b).map((n) => ({ b: n.b * 2, d: Math.min(n.d * 2, 4 - n.b * 2), m: n.m - 12 }));
      return { chords: m.chords.map((c) => ({ ...c, at: c.at * 2 })), mel };
    });
    out.push({ label: s === 0 ? 'A' : 'B', bars });
  }
  return out;
}

// ---- arranging -----------------------------------------------------------------

class Writer {
  constructor(avail, rng) {
    this.events = [];
    this.avail = avail;
    this.rng = rng;
  }
  has(i) {
    return this.avail[BB_SECTION_OF[i]] !== false;
  }
  add(i, a, b, d, m, v, extra) {
    if (!this.has(i)) return;
    if (m != null && RANGE[i]) m = fit(m, RANGE[i][0], RANGE[i][1]);
    this.events.push({ i, a, b: Math.max(0, b), d, m, v: clamp(v + this.rng.float(-0.03, 0.03), 0.05, 1), ...extra });
  }
}

// A section plays a line in close harmony: n voices under each lead note.
function soli(w, inst, notes, key, chords, v, { n = 4, art, low } = {}) {
  for (const x of notes) {
    const c = chordAt(chords, x.b);
    const voices = x.d < 0.5 ? [x.m, x.m - 12] : closeBelow(x.m, key, c, n);
    const a = art || (x.d < 0.6 ? 'stac' : 'sus');
    voices.forEach((m, k) => w.add(inst, a, x.b, x.d * 0.95, m, v - k * 0.03));
    if (low) w.add(low, a === 'stac' ? 'stac' : 'sus', x.b, x.d * 0.95, x.m - 12, v - 0.08);
  }
}

// Brass punches on the chord: trumpets up top, trombones below.
function punches(w, key, chords, cells, v, { tp = true, tb = true, top = 77 } = {}) {
  for (const [b, d] of cells) {
    const c = chordAt(chords, b);
    const ps = fourPcs(key, c);
    const lead = snap(top, ps, 1);
    if (tp) for (const m of closeBelow(lead, key, c, 4)) w.add('tp', 'stac', b, d, m, v);
    if (tb) for (const m of closeBelow(snap(lead - 17, ps, -1), key, c, 3)) w.add('tb', 'stac', b, d, m, v - 0.05);
  }
}

// Long chords under a soloist or the brass.
function pads(w, inst, key, chords, v, lo, hi, art = 'sus') {
  chords.forEach((c, i) => {
    const d = (i + 1 < chords.length ? chords[i + 1].at : 4) - c.at;
    const ps = fourPcs(key, c);
    const vo = [];
    for (let m = lo; m <= hi && vo.length < 4; m++) if (isTone(m, ps)) vo.push(m);
    for (const m of vo) w.add(inst, art, c.at, d * 1.01, m, v);
  });
}

function walk(w, key, chords, next, state, v, two) {
  const beats = two ? [0, 2] : [0, 1, 2, 3];
  for (const b of beats) {
    const c = chordAt(chords, b);
    const ps = chordPcs(key, c);
    let m;
    const prev = state.bass ?? 38;
    if (b === 0 || c.at === b) m = snap(prev, [ps[0]], prev > 42 ? -1 : 1);
    else if (b === 3 && next) {
      const nr = snap(prev, [chordPcs(key, next)[0]], 1);
      m = nr + (state.rng.chance(0.5) ? -1 : 1);
    } else if (two) m = snap(prev + 4, [ps[2]], 1);
    else m = snap(prev + (prev > 44 ? -2 : 2), state.rng.chance(0.6) ? ps : scalePcs(key, c), prev > 44 ? -1 : 1);
    m = fit(m, 31, 50);
    state.bass = m;
    w.add('cb', 'pizz', b, two ? 1.9 : 0.95, m, v + (b % 2 ? -0.04 : 0.02));
  }
}

function drums(w, feel, { v, pos, len, first, shout, rng, fill }) {
  if (feel === 'ride' || feel === 'shuffle') {
    const pat = feel === 'shuffle' ? [[0, 0.5], [0.5, 0.32], [1, 0.62], [1.5, 0.38], [2, 0.5], [2.5, 0.32], [3, 0.62], [3.5, 0.38]] : [[0, 0.5], [1, 0.62], [1.5, 0.36], [2, 0.5], [3, 0.62], [3.5, 0.36]];
    for (const [b, x] of pat) w.add('ride', 'hit', b, 0.5, null, v * x * (shout ? 1.15 : 1));
    w.add('hh', 'pedal', 1, 0.25, null, v * 0.55);
    w.add('hh', 'pedal', 3, 0.25, null, v * 0.55);
    for (const b of [0, 1, 2, 3]) w.add('bd', 'hit', b, 0.5, null, v * (feel === 'shuffle' && b % 2 === 0 ? 0.32 : 0.16));
    if (feel === 'shuffle') {
      w.add('sn', 'hit', 1, 0.25, null, v * 0.36);
      w.add('sn', 'hit', 3, 0.25, null, v * 0.38);
    } else if (rng.chance(0.6)) w.add('tap', 'hit', rng.pick([1.5, 2.5, 3.5]), 0.25, null, v * rng.float(0.3, 0.6));
  } else if (feel === 'brush') {
    for (let b = 0; b < 4; b += 0.5) w.add('tap', 'hit', b, 0.5, null, v * (b % 1 ? 0.22 : 0.34));
    w.add('hh', 'pedal', 1, 0.25, null, v * 0.4);
    w.add('hh', 'pedal', 3, 0.25, null, v * 0.4);
    w.add('bd', 'hit', 0, 0.5, null, v * 0.18);
  } else if (feel === 'toms') {
    for (const [b, x] of [[0, 0.75], [1, 0.55], [1.5, 0.4], [2, 0.7], [3, 0.55], [3.5, 0.4]]) w.add('tom', 'hit', b, 0.5, null, v * x);
    for (const b of [0, 1, 2, 3]) w.add('bd', 'hit', b, 0.5, null, v * 0.42);
    w.add('hh', 'pedal', 1, 0.25, null, v * 0.5);
    w.add('hh', 'pedal', 3, 0.25, null, v * 0.5);
    if (shout) for (const b of [1, 3]) w.add('ride', 'hit', b, 0.5, null, v * 0.5);
  }
  if (first) {
    w.add('cym', 'crash', 0, 4, null, v * (shout ? 0.8 : 0.6));
    w.add('bd', 'hit', 0, 1, null, v * 0.65);
  }
  if (fill) {
    // A fill into the next section: snare and tom triplets on the last beat(s).
    const from = rng.chance(0.5) ? 3 : 2;
    for (let b = from; b < 4 - 1e-6; b += 1 / 3) w.add(b > 3.3 && feel !== 'brush' ? 'tom' : feel === 'brush' ? 'tap' : 'sn', 'hit', b, 1 / 3, null, v * (0.42 + (b - from) * 0.12), { straight: true });
  }
}

function comp(w, S, key, chords, v, rng, { solo, rest }) {
  if (S.ballad) {
    for (const c of chords) {
      const ps = fourPcs(key, c);
      const lo = fit(ps[0] + 36, 36, 47);
      w.add('pno', 'hit', c.at, 1.8, lo, v - 0.05);
      w.add('pno', 'hit', c.at, 1.8, lo + (ps[3] != null ? (ps[3] - ps[0] + 12) % 12 : 7), v - 0.1);
      shell(key, c, 57, 72).forEach((m, k) => w.add('pno', 'hit', c.at + 0.5 + k * 0.08, 1.4, m, v - 0.15, { straight: true }));
    }
    return;
  }
  const pattern = S.basie ? rng.pick([[1.5], [3], [0, 2.5], [1.5, 3.5], []]) : rng.pick([[0, 1.5], [1.5, 3], [0.5, 2.5], [0, 2.5], [1.5]]);
  for (const b of pattern) {
    const c = chordAt(chords, b);
    for (const m of shell(key, c, 52, 70)) w.add('pno', 'hit', b, 0.35, m, v - (S.basie ? 0.02 : 0.08));
  }
  // Basie plinks: a few high notes in the gaps of the tune.
  if ((S.basie || rest) && !solo && rng.chance(S.basie ? 0.55 : 0.25)) {
    const c = chordAt(chords, 2);
    const ps = fourPcs(key, c);
    let m = snap(rng.int(79, 86), ps, 1);
    for (const b of rng.pick([[2, 2.5, 3], [2.5, 3.5], [3, 3 + 1 / 3, 3 + 2 / 3]])) {
      w.add('pno', 'hit', b, 0.3, m, v - 0.05, b % 0.5 ? { straight: true } : undefined);
      m = snap(m + rng.pick([2, 3, -3, 4]), ps, 1);
    }
  }
}

const SWEET = { stp: [64, 84], scl: [62, 88], stb: [48, 70], pno: [64, 88] };

// An improvised chorus line: phrases of eighths and triplets aimed at chord tones, with rests between.
function improvise(w, inst, S, key, chords, nextChords, state, v, e, rng, barInChorus) {
  const [lo, hi] = SWEET[inst];
  state.solo = state.solo ?? Math.round((lo + hi) / 2);
  const phraseBar = barInChorus % 4;
  const restBar = phraseBar === 3 && e < 0.85 && rng.chance(0.7);
  if (restBar) {
    // Breathe: maybe one held note, then a pickup into the next phrase.
    const c = chordAt(chords, 0);
    w.add(inst, inst === 'pno' ? 'hit' : inst === 'scl' ? 'sus' : 'vib', 0, 1.5, snap(state.solo, fourPcs(key, c), 1), v - 0.05);
    if (rng.chance(0.6)) for (const b of [3, 3.5]) w.add(inst, inst === 'pno' ? 'hit' : 'stac', b, 0.45, (state.solo = snap(state.solo + 2, scalePcs(key, chordAt(chords, b), S.form === 'blues'), 1)), v - 0.08);
    return;
  }
  const dense = e > 0.6 + rng.float(-0.15, 0.15);
  const cells = dense
    ? rng.pick([
        [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 1]],
        [[0, 1 / 3], [1 / 3, 1 / 3], [2 / 3, 1 / 3], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 1.5]],
        [[0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]],
      ])
    : rng.pick([[[0, 1.5], [1.5, 0.5], [2, 2]], [[0.5, 0.5], [1, 1], [2.5, 1.5]], [[0, 0.5], [0.5, 1.5], [2, 0.5], [2.5, 1.5]], [[0, 1], [1, 1], [2, 0.5], [2.5, 1.5]]]);
  const top = lo + (hi - lo) * (0.45 + 0.5 * e);
  let dir = state.soloDir ?? 1;
  cells.forEach(([b, d], j) => {
    const c = chordAt(chords, b);
    const strong = Math.abs(b - Math.round(b)) < 1e-6 && Math.round(b) % 2 === 0;
    const nextNote = cells[j + 1];
    let m;
    if (state.solo > top) dir = -1;
    if (state.solo < lo + 3) dir = 1;
    if (rng.chance(0.15)) dir = -dir;
    if (strong) m = snap(state.solo + dir, fourPcs(key, c), dir);
    else if (nextNote && d <= 0.5 && rng.chance(0.25)) {
      // Chromatic approach into the next chord tone.
      const t = snap(state.solo + dir * 2, fourPcs(key, chordAt(chords, nextNote[0])), dir);
      m = t - dir;
    } else m = snap(state.solo + dir * rng.pick([1, 2, 2, 3]), scalePcs(key, c, S.form === 'blues' || S.minor), dir);
    m = clamp(m, lo, hi);
    state.solo = m;
    const long = d * w.spb > 0.5;
    const art = inst === 'pno' ? 'hit' : long ? (inst === 'scl' ? 'sus' : 'vib') : 'stac';
    w.add(inst, art, b, d * 0.95, m, v + (strong ? 0.04 : 0) + (b % 1 ? -0.04 : 0), d < 0.5 && Math.abs(b * 3 - Math.round(b * 3)) < 1e-6 && b % 0.5 ? { straight: true } : undefined);
    if (inst === 'pno' && strong) for (const x of shell(key, c, 48, 62)) w.add('pno', 'hit', b, 0.4, x, v - 0.15);
  });
  state.soloDir = dir;
  // The trombone smears the end of a phrase.
  if (inst === 'stb' && phraseBar === 2 && rng.chance(0.4)) w.add('stb', 'fall', 3, 1, state.solo, v);
}

// ---- the composer ----------------------------------------------------------------

const KIND_E = { intro: 0.5, head: 0.55, solo: 0.62, shout: 1, out: 0.8, end: 0.95, rest: 0 };
export const KIND_LABEL = { intro: 'INTRO', head: 'THE TUNE', solo: 'SOLO', shout: 'SHOUT CHORUS', out: 'THE TUNE · OUT', end: 'ENDING', rest: '…' };

export class BigBandComposer {
  // tune: a public-domain tune id, or null for an original in the given style.
  // rag: the parsed rag when the tune is made from one (see scores.js).
  constructor({ seed = 1, style = 'swing', tune = null, rag = null, intensity = 0.6, auto = true, tempo = 1, swing = null, avail = {}, loop = true } = {}) {
    this.seed = seed;
    this.intensity = intensity;
    this.auto = auto;
    this.tempo = tempo;
    this.swing = swing;
    this.avail = avail;
    this.loop = loop;
    this.rng = new Rng(seed ^ 0xb16);
    this.bar = 0;
    this.cycle = 0;
    this.tuneId = tune && BB_TUNE_BY_ID[tune] ? tune : null;
    this.rag = rag;
    this.styleId = this.tuneId ? BB_TUNE_BY_ID[this.tuneId].style : BB_STYLES[style] ? style : 'swing';
    this.ended = false;
    this.pendingEnd = false;
    this.plan();
  }

  get S() {
    return BB_STYLES[this.styleId];
  }

  plan() {
    this.state = { rng: this.rng };
    const S = this.S;
    let tune;
    if (this.tuneId) {
      const t = BB_TUNE_BY_ID[this.tuneId];
      const sections = t.rag ? sectionsFromRag(this.rag) : t.sections();
      tune = { name: t.name, source: t.source, key: t.rag ? 0 : t.key, bpm: t.bpm, sections };
    } else tune = writeTune(this.seed + this.cycle * 7919, this.styleId);
    this.tune = tune;
    const rng = this.rng;
    const form = tune.sections;
    const soloists = S.soloists.slice();
    const q = [];
    const chorus = (kind, extra = {}) => {
      form.forEach((sec, si) =>
        sec.bars.forEach((bar, i) => q.push({ kind, label: sec.label, si, pos: i, len: sec.bars.length, bar, ...extra })),
      );
    };
    const introLen = S.feel === 'toms' ? 4 : S.ballad ? 2 : 4;
    for (let i = 0; i < introLen; i++) q.push({ kind: 'intro', pos: i, len: introLen, bar: { chords: chordBars(S.minor ? 'i6' : i === introLen - 1 ? 'V7' : i % 2 ? 'ii7' : 'I6', 4)[0], mel: [] } });
    chorus('head');
    if (form.length === 1) chorus('head', { brass: true });
    const nSolo = form.reduce((a, s) => a + s.bars.length, 0) <= 16 ? 2 : 1;
    for (let k = 0; k < nSolo; k++) chorus('solo', { soloist: soloists.splice(rng.int(0, soloists.length - 1), 1)[0] || 'stp', chorusNo: k });
    const tr = S.ballad ? 0 : rng.pick([0, 1, 0, 2]) % 12;
    chorus('shout', { tr });
    const last = form[form.length - 1];
    if (form.length === 1) chorus('out', { tr });
    else last.bars.forEach((bar, i) => q.push({ kind: 'out', label: last.label, si: form.length - 1, pos: i, len: last.bars.length, bar, tr }));
    // Tag: the last two bars twice more, then the final chord.
    const tail = last.bars.slice(-2);
    for (let k = 0; k < 2; k++) tail.forEach((bar, i) => q.push({ kind: 'end', pos: k * 2 + i, len: 6, bar, tr }));
    q.push({ kind: 'end', pos: 4, len: 6, bar: { chords: chordBars(S.minor ? 'i6' : 'I6', 4)[0], mel: [] }, tr, final: true });
    q.push({ kind: 'end', pos: 5, len: 6, bar: { chords: chordBars(S.minor ? 'i6' : 'I6', 4)[0], mel: [] }, tr, final: true, hold: true });
    q.push({ kind: 'rest', pos: 0, len: 1 });
    for (let i = 0; i < q.length; i++) q[i].next = q[i + 1]?.bar?.chords?.[0];
    this.queue = q;
    this.shift = lineShift(form.flatMap((s) => s.bars.flatMap((b) => b.mel.map((n) => n.m))), 66, 80);
  }

  next() {
    const cur = this.queue[0];
    if (!cur) return;
    while (this.queue.length > 1 && this.queue[0].kind === cur.kind && this.queue[0].soloist === cur.soloist && cur.kind !== 'end') this.queue.shift();
  }

  climax() {
    const i = this.queue.findIndex((s) => s.kind === 'shout');
    if (i > 0) this.queue.splice(0, i);
  }

  end() {
    this.pendingEnd = true;
    const i = this.queue.findIndex((s) => s.kind === 'out');
    const cur = this.queue[0];
    if (i > 0 && cur && cur.kind !== 'out' && cur.kind !== 'end') {
      // Finish the current section first.
      let j = 0;
      while (j < this.queue.length && this.queue[j].kind === cur.kind && this.queue[j].si === cur.si) j++;
      if (j < i) this.queue.splice(j, i - j);
    }
  }

  energy(sec) {
    let base = KIND_E[sec.kind] ?? 0.6;
    if (sec.kind === 'solo') base += (sec.chorusNo || 0) * 0.12 + (sec.pos / Math.max(1, sec.len)) * 0.1;
    if (sec.brass) base += 0.12;
    if (!this.auto) return clamp(this.intensity + (base - 0.6) * 0.3, 0.05, 1);
    return clamp(base * (0.5 + 0.8 * this.intensity), 0.05, 1);
  }

  nextBar() {
    if (!this.queue.length) {
      if (this.pendingEnd || (this.tuneId && !this.loop)) {
        this.ended = true;
        return null;
      }
      this.cycle++;
      this.plan();
    }
    const sec = this.queue.shift();
    const S = this.S;
    const tune = this.tune;
    const bpm = tune.bpm * this.tempo * (sec.hold ? 0.8 : 1);
    if (sec.kind === 'rest') {
      this.bar++;
      return { beats: 4, bpm, events: [], info: { section: 'rest', bar: this.bar, name: tune.name, chord: '', key: '' } };
    }
    const e = sec.kind === 'rest' ? 0 : this.energy(sec);
    const v = 0.3 + 0.6 * e;
    const w = new Writer(this.avail, this.rng);
    w.spb = 60 / bpm;
    const rng = this.rng;
    const key = (tune.key + (sec.tr || 0)) % 12;
    const chords = sec.bar.chords;
    const tr = sec.tr || 0;
    const mel = sec.bar.mel.map((n) => ({ ...n, m: n.m + tr + this.shift }));
    const firstOfSection = sec.pos === 0;
    const lastOfSection = sec.pos === sec.len - 1;
    const state = this.state;

    // --- the horns
    if (sec.kind === 'intro') {
      if (S.feel !== 'toms' && sec.pos === sec.len - 1) punches(w, key, chords, [[0, 0.5], [1.5, 0.5], [3, 0.5]], v + 0.1);
      if (S.ballad && sec.pos === 0) pads(w, 'cl', key, chords, v - 0.1, 62, 74);
    } else if (sec.kind === 'head' || sec.kind === 'out') {
      const bridge = sec.label === 'B';
      if (S.ballad) {
        if (!bridge) {
          for (const n of mel) w.add('scl', n.d * w.spb < 0.3 ? 'stac' : 'sus', n.b, n.d * 0.97, n.m, v + 0.12);
          pads(w, 'tp', key, chords, v - 0.15, 62, 74, 'mute');
        } else {
          soli(w, 'tp', mel.map((n) => ({ ...n, m: n.m + 5 > 82 ? n.m - 7 : n.m + 5 })), key, chords, v + 0.05, { art: 'mute' });
          pads(w, 'cl', key, chords, v - 0.12, 60, 72);
        }
        pads(w, 'tb', key, chords, v - 0.2, 46, 58);
      } else if (bridge || sec.brass) {
        soli(w, 'tp', mel.map((n) => ({ ...n, m: n.m + 7 })), key, chords, v + 0.08, {});
        soli(w, 'tb', mel.map((n) => ({ ...n, m: n.m - 5 })), key, chords, v - 0.02, { n: 3 });
        pads(w, 'cl', key, chords, v - 0.12, 62, 74);
      } else {
        soli(w, 'cl', mel, key, chords, v + 0.08, { low: 'bn' });
        if (S.riff && sec.pos % 4 >= 2) punches(w, key, chords, rng.pick(PUNCH).concat([[0, 0.5]]), v);
        else if (!S.riff && rng.chance(0.55)) punches(w, key, chords, rng.pick(PUNCH), v - 0.02);
      }
    } else if (sec.kind === 'solo') {
      improvise(w, sec.soloist, S, key, chords, sec.next, state, v + 0.1, e, rng, sec.pos);
      // Backgrounds: soft reed pads first, brass riffs later in the chorus.
      if (sec.chorusNo === 0 && sec.pos < sec.len / 2) pads(w, 'cl', key, chords, v - 0.22, 60, 72);
      else if (e > 0.55) {
        if (sec.pos % 2 === 0) state.bgRiff = rng.pick(PUNCH);
        punches(w, key, chords, state.bgRiff || PUNCH[0], v - 0.12, { top: 74 });
      } else pads(w, 'tb', key, chords, v - 0.2, 46, 58);
    } else if (sec.kind === 'shout' && S.ballad) {
      // A ballad's climax: the whole band sings the tune, trumpets on top.
      soli(w, 'tp', mel.map((n) => ({ ...n, m: n.m + 7 })), key, chords, v + 0.05, { art: 'sus' });
      soli(w, 'cl', mel, key, chords, v, { low: 'bn' });
      pads(w, 'tb', key, chords, v - 0.08, 46, 60);
    } else if (sec.kind === 'shout') {
      // A riff in the trumpets, high; trombones answer; reeds double an octave down.
      if (sec.pos % 2 === 0 || !state.shoutRiff) state.shoutRiff = rng.pick(CELLS.slice(0, 6));
      if (sec.pos === 0) state.shoutTop = snap(fit(key + 76, 74, 81), [key, (key + 4) % 12, (key + 7) % 12], 1);
      const riff = state.shoutRiff.map(([b, d], j) => {
        const c = chordAt(chords, b);
        const m = snap(state.shoutTop + (j % 2 ? -2 : 1), b % 1 === 0 ? fourPcs(key, c) : scalePcs(key, c, true), 1);
        return { b, d, m: clamp(m, 70, 84) };
      });
      soli(w, 'tp', riff, key, chords, v + 0.12, {});
      soli(w, 'cl', riff.map((n) => ({ ...n, m: n.m - 12 })), key, chords, v, { low: 'bn' });
      punches(w, key, chords, [[3.5, 0.5]], v, { tp: false });
      for (const c of chords) for (const m of closeBelow(snap(60, fourPcs(key, c), -1), key, c, 3)) w.add('tb', 'stac', c.at + 1.5, 0.5, m, v);
      if (lastOfSection) w.add('tb', 'fall', 3, 1, fit(key + 55, 52, 62), v + 0.05);
    } else if (sec.kind === 'end') {
      if (sec.final) {
        if (!sec.hold) {
          const c = chords[0];
          const ps = fourPcs(key, c);
          const lead = snap(fit(key + 79, 77, 84), ps, 1);
          for (const m of closeBelow(lead, key, c, 4)) w.add('tp', 'sus', 0, 7, m, v + 0.1, { v2: v + 0.2 });
          for (const m of closeBelow(snap(lead - 12, ps, -1), key, c, 4)) w.add('cl', 'sus', 0, 7, m, v);
          for (const m of closeBelow(snap(lead - 19, ps, -1), key, c, 3)) w.add('tb', 'sus', 0, 7, m, v);
          w.add('bn', 'sus', 0, 7, fit(ps[0] + 36, 34, 46), v);
          w.add('cb', 'pizz', 0, 2, fit(ps[0] + 24, 31, 43), v + 0.1);
          w.add('cym', 'crash', 0, 6, null, v + 0.1);
          w.add('bd', 'hit', 0, 2, null, v);
          w.add('sn', 'roll', 0, 7, null, v * 0.4, { v2: v * 0.8 });
          state.plink = S.basie || rng.chance(0.3);
        } else if (state.plink) {
          // The Basie button: three high piano plinks to close.
          for (const [b, m] of [[0, 0], [0.5, 4], [1, 7]]) w.add('pno', 'hit', b, 0.3, fit(key + 84 + m, 84, 96), 0.5, { straight: true });
        }
      } else {
        soli(w, 'tp', mel.map((n) => ({ ...n, m: n.m + 7 })), key, chords, v + 0.05, {});
        soli(w, 'cl', mel, key, chords, v, { low: 'bn' });
      }
    }

    // --- the rhythm section
    if (!sec.hold && !sec.final) {
      const two = S.two && (sec.kind === 'head' || sec.kind === 'intro') && sec.label !== 'B';
      if (sec.kind !== 'intro' || S.feel !== 'toms') walk(w, key, chords, sec.next, state, v - 0.02, two || (S.feel === 'toms' && sec.kind === 'intro'));
      if (!(sec.kind === 'solo' && sec.soloist === 'pno')) comp(w, S, key, chords, v - 0.05, rng, { solo: sec.kind === 'solo', rest: !mel.length });
      drums(w, S.feel, { v, pos: sec.pos, len: sec.len, first: firstOfSection && sec.kind !== 'intro', shout: sec.kind === 'shout', rng, fill: lastOfSection && sec.kind !== 'end' });
    } else if (sec.final && !sec.hold) {
      // nothing else: the band holds the chord
    }

    const sw = this.swing ?? S.swing;
    const events = swingEvents(w.events, S.ballad ? Math.min(sw, 0.6) : sw, 1);
    this.bar++;
    const label = sec.kind === 'solo' ? `SOLO · ${SOLOIST_NAME[sec.soloist]}` : KIND_LABEL[sec.kind];
    return {
      beats: 4,
      bpm,
      events,
      info: { section: sec.kind, label, part: sec.label, pos: sec.pos, len: sec.len, bar: this.bar, chord: chordName(key, chords[0]), key: NAMES[key], name: tune.name, e, soloist: sec.soloist },
    };
  }
}

export const SOLOIST_NAME = { stp: 'TRUMPET', scl: 'CLARINET', stb: 'TROMBONE', pno: 'PIANO' };
