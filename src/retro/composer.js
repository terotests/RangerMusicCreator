// SPDX-License-Identifier: MIT
// The song composer shared by the Space Age and Synthwave pages. It writes an
// original song (an 8-bar A tune, an 8-bar B tune, an intro) from a style's
// chord progressions and melody rhythms, then arranges it bar by bar through a
// form (intro, A, A, B, A, solo, B, A again louder, outro, final chord), with
// the style's bass line, comping, pads, ostinatos, drums and fills, each
// layer coming in as the music builds. Public-domain pieces replace the
// written tunes with their own melody and chords.
//
// A bar is { beats, bpm, events, info }; events are
// { i: player, a: articulation, b: beat, d: beats, m: midi, v: 0..1 }.
// Pure (no Web Audio), so it runs in node tests and offline renders.

import { Rng } from '../rng.js';
import { bars as chordBars, pcs as chordPcs, fourPcs, chordAt, scalePcs, snap, fit, NAMES, swingEvents } from '../jazz/theory.js';
import { chordName } from '../jazz/ragtime.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pc = (m) => ((m % 12) + 12) % 12;
const isIn = (m, ps) => ps.includes(pc(m));

// ---- melody rhythms -----------------------------------------------------------
// One-bar cells: [beat, length]. Grouped by feel; 'end' cells close a phrase.

export const CELLS = {
  lounge: {
    main: [
      [[0, 1.5], [1.5, 0.5], [2, 2]],
      [[0, 1], [1, 1], [2, 1.5], [3.5, 0.5]],
      [[0.5, 0.5], [1, 1], [2, 2]],
      [[0, 2], [2, 1], [3, 1]],
      [[0, 1.5], [1.5, 1.5], [3, 1]],
      [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]],
    ],
    long: [[[0, 4]], [[0, 2], [2, 2]], [[0, 3], [3, 1]], [[0, 1], [1, 3]]],
    end: [[[0, 4]], [[0, 2], [2, 2]], [[0, 3]]],
  },
  latin: {
    main: [
      [[0, 0.5], [0.5, 1], [1.5, 0.5], [2, 1], [3, 1]],
      [[0, 1.5], [1.5, 1], [2.5, 1.5]],
      [[0.5, 0.5], [1, 0.5], [1.5, 1], [2.5, 0.5], [3, 1]],
      [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]],
      [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1.5], [3, 1]],
    ],
    long: [[[0, 2], [2, 2]], [[0, 1.5], [1.5, 2.5]], [[0, 3], [3, 1]]],
    end: [[[0, 1.5], [1.5, 2.5]], [[0, 4]], [[0, 2]]],
  },
  float: {
    main: [[[0, 3], [3, 1]], [[0, 2], [2, 2]], [[0, 4]], [[0, 1], [1, 3]], [[0, 2.5], [2.5, 1.5]]],
    long: [[[0, 4]], [[0, 2], [2, 2]]],
    end: [[[0, 4]]],
  },
  waltz: {
    main: [[[0, 2], [2, 1]], [[0, 1], [1, 1], [2, 1]], [[0, 1.5], [1.5, 0.5], [2, 1]], [[0, 3]], [[0, 1], [1, 2]]],
    long: [[[0, 3]], [[0, 2], [2, 1]]],
    end: [[[0, 3]]],
  },
  synth: {
    main: [
      [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1], [2.5, 1.5]],
      [[0, 1.5], [1.5, 1.5], [3, 1]],
      [[0, 0.75], [0.75, 0.75], [1.5, 0.5], [2, 2]],
      [[0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
      [[0, 1], [1, 1], [2, 0.5], [2.5, 1.5]],
      [[0, 0.75], [0.75, 0.75], [1.5, 0.75], [2.25, 1.75]],
    ],
    long: [[[0, 2], [2, 2]], [[0, 1.5], [1.5, 2.5]], [[0, 4]], [[0, 3], [3, 1]]],
    end: [[[0, 4]], [[0, 2], [2, 2]], [[0, 1.5], [1.5, 2.5]]],
  },
};

// ---- voicing ------------------------------------------------------------------

// Notes of a chord as pitch classes: four-note jazz sound or a plain triad
// (with an added ninth when asked).
function chordTones(key, ch, S) {
  if (S.harmony === 'triad') {
    const t = chordPcs(key, ch).slice(0, 3);
    return S.add9 ? [...t, (key + ch.r + 2) % 12] : t;
  }
  return fourPcs(key, ch);
}

// Close voicing of `pcs` around `center`, moving as little as possible from `prev`.
function voice(pcs, center, prev, n = pcs.length) {
  let best = null;
  let bestScore = Infinity;
  for (let inv = 0; inv < pcs.length; inv++) {
    const order = [...pcs.slice(inv), ...pcs.slice(0, inv)].slice(0, n);
    for (const base of [center - 7, center - 2, center + 3]) {
      const out = [];
      let m = base - 1;
      for (const p of order) {
        m = snap(m + 1, [p], 1);
        while (pc(m) !== p) m++;
        out.push(m);
      }
      const mid = (out[0] + out[out.length - 1]) / 2;
      let score = Math.abs(mid - center) * 0.6;
      if (prev?.length) score += out.reduce((a, x, k) => a + Math.abs(x - (prev[k] ?? prev[prev.length - 1])), 0) / out.length;
      if (score < bestScore) [best, bestScore] = [out, score];
    }
  }
  return best;
}

// ---- melodies -----------------------------------------------------------------

function scaleOf(key, S, minor) {
  const sc = minor ? S.minorScale || [0, 2, 3, 5, 7, 8, 10] : S.scale || [0, 2, 4, 5, 7, 9, 11];
  return sc.map((x) => (key + x) % 12);
}

function scaleStep(m, steps, scale) {
  let x = m;
  const dir = Math.sign(steps);
  for (let k = 0; k < Math.abs(steps); k++) {
    x += dir;
    while (!isIn(x, scale)) x += dir;
  }
  return x;
}

const strongBeat = (b, beats) => Math.abs(b - Math.round(b)) < 1e-6 && (Math.round(b) % 2 === 0 || beats === 3);

// A fresh bar of melody over `chords`, starting near `prev`.
function freshBar(rng, cell, chords, key, scale, S, prev, lo, hi, dirHint) {
  const out = [];
  let m = prev;
  let dir = dirHint || (rng.chance(0.5) ? 1 : -1);
  cell.forEach(([b, d], k) => {
    const ch = chordAt(chords, b);
    const tones = chordTones(key, ch, S);
    if (m > hi - 3) dir = -1;
    else if (m < lo + 3) dir = 1;
    else if (rng.chance(0.25)) dir = -dir;
    if (k === 0 || strongBeat(b, S.beats) || d >= 1.5) {
      const leap = rng.chance(k === 0 ? 0.35 : 0.15) ? rng.int(3, 7) : rng.int(1, 3);
      m = snap(m + dir * leap, tones, dir);
    } else {
      m = scaleStep(m, dir * (rng.chance(0.75) ? 1 : 2), scale);
    }
    m = clamp(m, lo, hi);
    if (!isIn(m, scale) && !isIn(m, tones)) m = snap(m, tones, dir);
    out.push({ b, d, m });
  });
  return out;
}

// The same rhythm and shape moved onto new chords (a sequence).
function moveBar(src, chords, key, scale, S, lo, hi) {
  if (!src.length) return [];
  const ch0 = chordAt(chords, src[0].b);
  const t0 = chordTones(key, ch0, S);
  const first = snap(src[0].m, t0, 1);
  const shift = first - src[0].m;
  return src.map((n) => {
    const ch = chordAt(chords, n.b);
    const tones = chordTones(key, ch, S);
    let m = n.m + shift;
    m = strongBeat(n.b, S.beats) || n.d >= 1.5 ? snap(m, tones, 1) : snap(m, scale, 1);
    return { b: n.b, d: n.d, m: clamp(m, lo, hi) };
  });
}

// An 8-bar (or any length) tune: a two-bar idea, its sequence, the idea
// again, and a cadence that lands on the chord's root or third.
export function writeMelody(rng, S, key, minor, bars, kind, lo, hi) {
  const cells = CELLS[S.cells] || CELLS.lounge;
  const pool = kind === 'B' ? [...cells.long, ...cells.main.slice(0, 2)] : cells.main;
  const scale = scaleOf(key, S, minor);
  const n = bars.length;
  const c0 = rng.pick(pool);
  const c1 = rng.pick(pool);
  const c2 = rng.pick(pool);
  const cEnd = rng.pick(cells.end);
  const center = Math.round((lo + hi) / 2) + (kind === 'B' ? 2 : 0);
  let prev = snap(center, chordTones(key, bars[0][0], S), 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const inPhrase = i % 8;
    const last = i === n - 1 || inPhrase === 7;
    let notes;
    if (last) {
      // Land on a chord tone, the root if the chord is the tonic.
      const ch = bars[i][0];
      const tones = ch.r === 0 ? [(key + ch.r) % 12, (key + ch.r + (minor ? 3 : 4)) % 12] : chordTones(key, ch, S);
      notes = cEnd.map(([b, d], k) => ({ b, d, m: clamp(snap(prev + (k ? -2 : 0), tones, -1), lo, hi) }));
    } else if (inPhrase === 2 || inPhrase === 3) notes = moveBar(out[i - 2], bars[i], key, scale, S, lo, hi);
    else if (inPhrase === 4 || inPhrase === 5) notes = rng.chance(0.7) ? moveBar(out[i - 4], bars[i], key, scale, S, lo, hi) : freshBar(rng, [c0, c1][inPhrase - 4], bars[i], key, scale, S, prev, lo, hi);
    else {
      const cell = inPhrase === 0 ? c0 : inPhrase === 1 ? c1 : c2;
      notes = freshBar(rng, cell, bars[i], key, scale, S, prev, lo, hi, inPhrase === 6 ? -1 : 0);
    }
    out.push(notes);
    if (notes.length) prev = notes[notes.length - 1].m;
  }
  return out;
}

// Improvised line for a solo bar: chord-scale runs, denser as the energy rises.
function improviseBar(rng, S, key, minor, chords, lo, hi, prev, energy) {
  const beats = S.beats;
  const unit = S.soloUnit || 0.5;
  const out = [];
  let m = prev;
  let dir = rng.chance(0.5) ? 1 : -1;
  for (let b = 0; b < beats - 1e-6; b += unit) {
    if (rng.chance(0.28 - energy * 0.18)) continue;
    const ch = chordAt(chords, b);
    const scale = scalePcs(key, ch);
    const tones = chordTones(key, ch, S);
    if (m > hi - 2) dir = -1;
    else if (m < lo + 2) dir = 1;
    else if (rng.chance(0.2)) dir = -dir;
    m = Math.abs(b - Math.round(b)) < 1e-6 ? snap(scaleStep(m, dir, scale), tones, dir) : scaleStep(m, dir * (rng.chance(0.8) ? 1 : 2), scale);
    m = clamp(m, lo, hi);
    const long = rng.chance(0.15);
    out.push({ b, d: long ? Math.min(beats - b, unit * 3) : unit, m });
    if (long) b += unit * 2;
  }
  return out;
}

// ---- the parts ----------------------------------------------------------------
// Each takes the bar context and returns events.

const bassRoot = (c, ch) => fit((c.key + ch.r) % 12 + 36, c.bassLo, c.bassLo + 11);
const fifthOf = (root, c) => (root + 7 <= c.bassLo + 16 ? root + 7 : root - 5);

const BASS = {
  bossa: [[0, 1.5, 'R'], [1.5, 0.5, '5'], [2, 1.5, '5'], [3.5, 0.5, 'R']],
  beguine: [[0, 1.5, 'R'], [1.5, 0.5, 'R'], [2, 2, '5']],
  chacha: [[0, 1, 'R'], [1, 1, '5'], [2, 1, 'R'], [3, 0.5, '5'], [3.5, 0.5, '5']],
  two: [[0, 2, 'R'], [2, 2, '5']],
  waltz: [[0, 1, 'R']],
  pedal: [[0, 4, 'R']],
  drive8: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b) => [b, 0.45, 'R']),
  octave8: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, k) => [b, 0.4, k % 2 ? 'O' : 'R']),
  gallop: [0, 0.5, 0.75, 1, 1.5, 1.75, 2, 2.5, 2.75, 3, 3.5, 3.75].map((b) => [b, 0.22, 'R']),
  dream: [[0, 0.7, 'R'], [0.75, 0.7, 'R'], [1.5, 0.5, 'O'], [2, 0.7, 'R'], [2.75, 0.7, 'R'], [3.5, 0.5, '5']],
  sub: [[0, 2, 'R'], [2, 2, 'R']],
};

function bassPart(c, spec) {
  const pat = BASS[spec.pat];
  const out = [];
  const beats = c.beats;
  for (const [b, d, what] of pat) {
    if (b >= beats) continue;
    const ch = chordAt(c.chords, b);
    let root = bassRoot(c, ch);
    let m = what === 'R' ? root : what === 'O' ? root + 12 : fifthOf(root, c);
    // Anticipate the next bar's root on the last eighth of driving lines.
    if ((spec.pat === 'drive8' || spec.pat === 'gallop') && b >= beats - 0.5 && c.nextChord && c.rng.chance(0.5)) m = bassRoot(c, c.nextChord);
    if (spec.pat === 'pedal' && b === 0 && c.chords.length > 1) {
      for (const k of c.chords) out.push({ i: spec.i, a: spec.a || 'sus', b: k.at, d: beats - k.at, m: bassRoot(c, k), v: c.vel(0.7) });
      return out;
    }
    const dd = spec.pat === 'pedal' ? beats : spec.pat === 'waltz' ? 1 : Math.min(d, beats - b);
    out.push({ i: spec.i, a: spec.a || 'pizz', b, d: dd, m, v: c.vel(b === 0 ? 0.78 : 0.66) });
  }
  // Walking line instead when asked.
  return out;
}

function walkPart(c, spec) {
  const out = [];
  let m = c.state.walk ?? bassRoot(c, c.chords[0]);
  for (let b = 0; b < c.beats; b++) {
    const ch = chordAt(c.chords, b);
    const tones = chordTones(c.key, ch, c.S);
    if (b === 0 || chordAt(c.chords, b - 1) !== ch) m = bassRoot(c, ch);
    else if (b === c.beats - 1 && c.nextChord) m = bassRoot(c, c.nextChord) + (c.rng.chance(0.5) ? 1 : -1);
    else m = snap(m + (c.rng.chance(0.6) ? 3 : -3), tones, 1);
    m = clamp(m, c.bassLo, c.bassLo + 19);
    out.push({ i: spec.i, a: 'pizz', b, d: 0.95, m, v: c.vel(b % 2 ? 0.62 : 0.72) });
  }
  c.state.walk = m;
  return out;
}

// Chords: held, or hit in a rhythm.
const COMP = {
  hold: null,
  bossa: [[0, 0.75], [1.5, 0.5], [2.5, 0.75], [3.5, 0.5]],
  beguine: [[0, 1], [1.5, 0.5], [2, 1.5]],
  chacha: [[0.5, 0.5], [1.5, 0.5], [2.5, 0.5], [3.5, 0.5]],
  offbeat: [[0.5, 0.4], [1.5, 0.4], [2.5, 0.4], [3.5, 0.4]],
  waltz: [[1, 0.9], [2, 0.9]],
  ep: [[0, 0.7], [0.75, 0.7], [1.5, 1], [3, 0.45], [3.5, 0.45]],
  stabs: [[0, 0.4], [1.5, 0.4], [3, 0.4]],
  push: [[0, 2.5], [2.5, 1.5]],
};

function compPart(c, spec) {
  const out = [];
  const pat = COMP[spec.pat];
  const center = spec.center ?? 66;
  const n = spec.n ?? 4;
  if (!pat) {
    for (const ch of c.chords) {
      const tones = chordTones(c.key, ch, c.S);
      const v = voice(tones, center, c.state['v' + spec.i], n);
      c.state['v' + spec.i] = v;
      const d = (c.chords.find((x) => x.at > ch.at)?.at ?? c.beats) - ch.at;
      for (const m of v) out.push({ i: spec.i, a: spec.a || 'sus', b: ch.at, d, m, v: c.vel(0.5) });
    }
    return out;
  }
  for (const [b, d] of pat) {
    if (b >= c.beats) continue;
    const ch = chordAt(c.chords, b);
    const v = voice(chordTones(c.key, ch, c.S), center, c.state['v' + spec.i], n);
    c.state['v' + spec.i] = v;
    for (const m of v) out.push({ i: spec.i, a: spec.a || 'stac', b, d: Math.min(d, c.beats - b), m, v: c.vel(b === 0 ? 0.62 : 0.55) });
  }
  return out;
}

// Strings or pads split over several players (top, middle, low).
function sectionPad(c, spec) {
  const out = [];
  for (const ch of c.chords) {
    const tones = chordTones(c.key, ch, c.S);
    const v = voice(tones, spec.center ?? 67, c.state.pad, Math.max(3, Math.min(4, tones.length)));
    c.state.pad = v;
    const d = (c.chords.find((x) => x.at > ch.at)?.at ?? c.beats) - ch.at;
    const players = spec.players;
    v.forEach((m, k) => {
      const p = players[Math.min(players.length - 1, players.length - 1 - Math.floor((k * players.length) / v.length))];
      out.push({ i: p, a: spec.a || 'sus', b: ch.at, d, m, v: c.vel(0.45) });
    });
    if (spec.low) out.push({ i: spec.low, a: spec.a || 'sus', b: ch.at, d, m: fit((c.key + ch.r) % 12 + 36, 36, 47), v: c.vel(0.45) });
  }
  return out;
}

// Broken chords: arpeggios, ostinatos, glissandi, sparkles.
function arpPart(c, spec) {
  const out = [];
  const unit = spec.unit ?? 0.25;
  const span = spec.span ?? 2;
  let k = c.state['a' + spec.i] ?? 0;
  for (let b = 0; b < c.beats - 1e-6; b += unit) {
    const ch = chordAt(c.chords, b);
    const tones = chordTones(c.key, ch, c.S);
    const notes = [];
    for (let o = 0; o < span; o++) for (const p of tones) notes.push(fit(p + 48, spec.lo ?? 60, (spec.lo ?? 60) + 11) + 12 * o);
    notes.sort((x, y) => x - y);
    const uniq = [...new Set(notes)];
    const shape = spec.shape || 'up';
    const len = uniq.length;
    let idx;
    if (shape === 'up') idx = k % len;
    else if (shape === 'updown') {
      const per = Math.max(1, 2 * len - 2);
      const p = k % per;
      idx = p < len ? p : per - p;
    } else idx = [0, 2, 1, 3, 2, 4, 3, 5][k % 8] % len;
    out.push({ i: spec.i, a: spec.a || 'hit', b, d: unit * (spec.legato ?? 0.9), m: uniq[idx], v: c.vel(Math.abs(b - Math.round(b)) < 1e-6 ? 0.6 : 0.48) });
    k++;
  }
  c.state['a' + spec.i] = k;
  return out;
}

function glissPart(c, spec) {
  // A harp glissando up the chord at the start of every few bars.
  if (c.barIn % (spec.every ?? 4) !== 0) return [];
  const ch = c.chords[0];
  const tones = chordTones(c.key, ch, c.S);
  const out = [];
  let m = fit((c.key + ch.r) % 12 + 48, 48, 59);
  const steps = 14;
  for (let k = 0; k < steps; k++) {
    out.push({ i: spec.i, a: 'hit', b: k * (1 / steps) * (spec.len ?? 1), d: 1, m, v: c.vel(0.4 + k * 0.02) });
    m = snap(m + 1, tones, 1);
    if (m > 96) break;
  }
  return out;
}

function sparklePart(c, spec) {
  const out = [];
  for (let b = 0.5; b < c.beats; b += 1) {
    if (!c.rng.chance(spec.p ?? 0.35)) continue;
    const tones = chordTones(c.key, chordAt(c.chords, b), c.S);
    out.push({ i: spec.i, a: 'hit', b, d: 1, m: fit(c.rng.pick(tones) + 72, spec.lo ?? 79, (spec.lo ?? 79) + 14), v: c.vel(0.45) });
  }
  return out;
}

// Short brass figures: muted trumpets and trombones in close harmony.
function brassPart(c, spec) {
  const pat = COMP[spec.pat || 'stabs'];
  const out = [];
  for (const [b, d] of pat) {
    if (b >= c.beats || !c.rng.chance(spec.p ?? 0.8)) continue;
    const ch = chordAt(c.chords, b);
    const tones = chordTones(c.key, ch, c.S);
    const v = voice(tones, 64, c.state.brass, 4);
    c.state.brass = v;
    v.forEach((m, k) => out.push({ i: k >= 2 ? spec.top : spec.low, a: spec.a || 'stac', b, d, m, v: c.vel(0.66) }));
  }
  return out;
}

function fxPart(c, spec) {
  if (c.barIn % (spec.every ?? 8) !== (spec.at ?? 0) || !c.rng.chance(spec.p ?? 0.7)) return [];
  const m = c.rng.int(spec.lo ?? 72, spec.hi ?? 88);
  return [{ i: spec.i, a: spec.a || 'hit', b: spec.b ?? c.rng.pick([0, 1, 2]), d: spec.d ?? 2, m, v: 0.6 }];
}

// ---- drums --------------------------------------------------------------------
// Grids: player -> list of [beat, velocity, articulation?]. 'x' strings are 16ths.

function grid(str, v = 0.6, unit = 0.25, a = 'hit') {
  const out = [];
  [...str].forEach((ch, k) => {
    if (ch === 'x') out.push([k * unit, v, a]);
    else if (ch === 'X') out.push([k * unit, Math.min(1, v + 0.25), a]);
    else if (ch === 'o') out.push([k * unit, v, 'open']);
  });
  return out;
}

export const DRUMS = {
  // Space Age
  beguine: { bgh: grid('..x...x...x...x.', 0.5), bgl: grid('x.....x.x.......', 0.55), mrc: grid('x.x.x.x.x.x.x.x.', 0.35), clv: grid('x.....x.....x...', 0.5, 0.25), ride: grid('x...x...x...x...', 0.35) },
  bossa: { tap: grid('x..x..x...x..x..', 0.5), hh: grid('x.x.x.x.x.x.x.x.', 0.3), cgl: grid('x.......x.x.....', 0.45), mrc: grid('..x...x...x...x.', 0.3) },
  chacha: { gui: grid('x.......x.......', 0.55), clv: grid('x...x...x...x...', 0.45), cgh: grid('....X.......x...', 0.5), cgl: grid('............x.x.', 0.55), bgh: grid('x.x.x.x.x.x.x.x.', 0.3) },
  jungle: { cgl: grid('x..x..x.x..x..x.', 0.6), cgh: grid('..x...x...x...xx', 0.45), bgh: grid('x.x.x.x.x.x.x.x.', 0.3), mrc: grid('xxxxxxxxxxxxxxxx', 0.2) },
  waltz: { tap: grid('....x...x...', 0.35), ride: grid('x...........', 0.35) },
  orbit: {},
  swing: { ride: grid('x...x..xx...x..x', 0.4), hh: grid('....x.......x...', 0.35), tap: grid('................', 0.3) },
  // Synthwave
  outrun: { kick: grid('x.......x.x.....', 0.85), snare: grid('....x.......x...', 0.8), hat: grid('x.x.x.x.x.x.x.x.', 0.45) },
  italo: { kick: grid('x...x...x...x...', 0.85), clap: grid('....x.......x...', 0.7), hat: grid('..o...o...o...o.', 0.4) },
  dark: { kick: grid('x.....x...x.....', 0.95), snare: grid('........x.......', 0.95), hat: grid('xxxxxxxxxxxxxxxx', 0.32) },
  dream: { kick: grid('x.........x.....', 0.75), snare: grid('....x.......x...', 0.65), hat: grid('x.x.x.x.x.x.x.x.', 0.3), clap: grid('............x...', 0.4) },
  drive: { kick: grid('x......x..x.....', 0.85), snare: grid('....x.......x...', 0.8), hat: grid('x.xxx.xxx.xxx.xx', 0.38) },
};

function drumPart(c, name) {
  const g = DRUMS[name];
  const out = [];
  const e = c.energy;
  for (const [p, hits] of Object.entries(g)) {
    if (!c.has(p)) continue;
    for (const [b, v, a] of hits) {
      if (b >= c.beats) continue;
      // Light parts drop out when it is quiet.
      if (e < 0.3 && (p === 'mrc' || p === 'hat' || p === 'bgh') && Math.abs(b - Math.round(b)) > 1e-6) continue;
      out.push({ i: p, a: a || 'hit', b, d: a === 'open' ? 0.5 : 0.25, v: clamp(v * (0.75 + 0.4 * e) * (0.92 + c.rng.next() * 0.16), 0.05, 1) });
    }
  }
  // Busier hats at high energy.
  if (g.hat && e > 0.75 && name !== 'dark' && name !== 'italo') for (let b = 0.25; b < c.beats; b += 0.5) out.push({ i: 'hat', a: 'hit', b, d: 0.2, v: 0.22 });
  return out;
}

function fillPart(c) {
  const S = c.S;
  const out = [];
  if (S.fill === 'toms') {
    const ms = [62, 59, 55, 52, 50, 47, 45, 43];
    ms.forEach((m, k) => out.push({ i: 'etom', a: 'hit', b: 2 + k * 0.25, d: 0.25, m, v: 0.55 + k * 0.05 }));
  } else if (S.fill === 'timbale') {
    for (let k = 0; k < 6; k++) out.push({ i: 'tap', a: 'hit', b: 2.5 + k * 0.25, d: 0.25, v: 0.5 + k * 0.08 });
  } else if (S.fill === 'congas') {
    [[2, 'cgh'], [2.5, 'cgh'], [3, 'cgl'], [3.25, 'cgl'], [3.5, 'cgl'], [3.75, 'cgl']].forEach(([b, p], k) => out.push({ i: p, a: 'hit', b, d: 0.25, v: 0.55 + k * 0.06 }));
  } else if (S.fill === 'timp') {
    out.push({ i: 'timp', a: 'roll', b: c.beats - 2, d: 2, m: fit((c.key + 7) % 12 + 36, 40, 52), v: 0.35, v2: 0.75 });
  }
  return out;
}

// ---- forms --------------------------------------------------------------------

const SECTION_ENERGY = { intro: 0.3, A: 0.5, B: 0.6, solo: 0.68, A2: 0.92, outro: 0.4, end: 0.5, rest: 0 };

export class RetroComposer {
  // styles: the page's style table; pieces: its public-domain pieces by id;
  // band: { range, sectionOf }.
  constructor({ styles, pieces = {}, band, style, piece = null, seed = 1, intensity = 0.6, auto = true, tempo = 1, avail = {}, loop = true }) {
    this.styles = styles;
    this.pieces = pieces;
    this.players = band;
    this.styleId = style;
    this.piece = piece ? pieces[piece] : null;
    // The style is part of the seed, so the same number gives a different song in each style.
    let h = 0;
    for (const ch of String(piece || style)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    this.rng = new Rng((seed ^ h) >>> 0);
    this.intensity = intensity;
    this.auto = auto;
    this.tempo = tempo;
    this.avail = avail;
    this.loop = loop;
    this.ended = false;
    this.barNo = 0;
    this.newSong();
  }

  get S() {
    return this.song.S;
  }

  newSong() {
    const rng = this.rng;
    const P = this.piece;
    const S = this.styles[P ? P.style : this.styleId];
    const minor = P ? !!P.minor : rng.chance(S.minor ?? 0);
    const key = P ? P.key : rng.pick(S.keys);
    const beats = P?.beats || S.beats || 4;
    const SS = { ...S, beats };
    const lead = this.players.range[S.lead.A[0]] || [60, 84];
    const lo = Math.max(lead[0], S.melodyLo ?? 64);
    const hi = Math.min(lead[1], S.melodyHi ?? 84);
    const progs = minor ? S.minorProgs || S.progs : S.progs;
    const sec = {};
    for (const k of ['A', 'B']) {
      if (P?.sections?.[k]) {
        const ps = P.sections[k];
        sec[k] = { chords: chordBars(ps.chords, beats), melody: ps.melody };
      } else {
        const chords = chordBars(rng.pick(progs[k]), beats);
        sec[k] = { chords, melody: writeMelody(rng, SS, key, minor, chords, k, lo, hi) };
      }
    }
    const intro = P?.intro ? chordBars(P.intro, beats) : chordBars(rng.pick(progs.intro || [progs.A[0].split(/\s+/).slice(0, 2).join(' ')]), beats);
    const bpm = P?.bpm || rng.int(S.bpm[0], S.bpm[1]);
    const form = P?.form || S.form || ['intro', 'A', 'A', 'B', 'A', 'solo', 'B', 'A2', 'outro'];
    this.song = {
      S: SS, key, minor, bpm, sec, intro, form,
      name: P ? P.name : songName(rng, S.names),
      soloist: rng.pick(S.lead.solo || S.lead.A),
      lift: P ? P.lift ?? 0 : S.lift ? rng.pick(S.lift) : 0,
      accel: P?.accel ?? 1,
    };
    this.plan = [];
    for (const f of form) {
      const len = f === 'intro' || f === 'outro' ? (P?.introBars ?? S.introBars ?? 4) : this.sectionLen(f);
      for (let i = 0; i < len; i++) this.plan.push({ section: f, i, len });
    }
    this.plan.push({ section: 'end', i: 0, len: 1 });
    this.pos = 0;
    this.state = {};
    this.climaxed = false;
  }

  sectionLen(f) {
    const k = f === 'A2' || f === 'solo' ? 'A' : f;
    return this.song.sec[k].chords.length;
  }

  // NEXT: skip to the next section.
  next() {
    const cur = this.plan[this.pos]?.section;
    while (this.pos < this.plan.length - 1 && this.plan[this.pos].section === cur) this.pos++;
  }

  climax() {
    const at = this.plan.findIndex((p, k) => k >= this.pos && p.section === 'A2');
    if (at >= 0) this.pos = at;
    else {
      const len = this.sectionLen('A');
      const rest = this.plan.slice(this.pos);
      this.plan = [...this.plan.slice(0, this.pos), ...Array.from({ length: len }, (_, i) => ({ section: 'A2', i, len })), ...rest];
    }
  }

  end() {
    const at = this.plan.findIndex((p, k) => k >= this.pos && p.section === 'outro');
    if (at >= 0 && at > this.pos) this.pos = at;
    else if (at < 0) this.pos = this.plan.length - 1;
    this.loop = false;
  }

  energyFor(section, i, len) {
    let e = SECTION_ENERGY[section] ?? 0.5;
    if (section === 'outro') e = 0.45 - (0.25 * i) / len;
    if (section === 'intro') e = 0.25 + (0.15 * i) / len;
    if (!this.auto) return this.intensity;
    return clamp(e * (0.55 + this.intensity * 0.8), 0.05, 1);
  }

  has(p) {
    const s = this.players.sectionOf[p];
    return this.avail[s] !== false;
  }

  nextBar() {
    if (this.pos >= this.plan.length) {
      if (!this.loop) {
        this.ended = true;
        return null;
      }
      this.newSong();
      return this.restBar();
    }
    const step = this.plan[this.pos++];
    const song = this.song;
    const S = song.S;
    if (step.section === 'end') return this.endBar();
    const kind = step.section === 'A2' || step.section === 'solo' ? 'A' : step.section;
    const lift = step.section === 'A2' ? song.lift : 0;
    const key = (song.key + lift) % 12;
    let chords;
    let melody = null;
    if (kind === 'intro' || kind === 'outro') chords = song.intro[step.i % song.intro.length];
    else {
      chords = song.sec[kind].chords[step.i];
      melody = song.sec[kind].melody[step.i];
    }
    const nextStep = this.plan[this.pos];
    let nextChord = null;
    if (nextStep && nextStep.section !== 'end') {
      const nk = nextStep.section === 'A2' || nextStep.section === 'solo' ? 'A' : nextStep.section;
      nextChord = nk === 'intro' || nk === 'outro' ? song.intro[nextStep.i % song.intro.length][0] : song.sec[nk].chords[nextStep.i][0];
    }
    const energy = this.energyFor(step.section, step.i, step.len);
    const rng = this.rng;
    const c = {
      rng, S, key, minor: song.minor, chords, nextChord, beats: S.beats, energy, state: this.state, section: step.section, barIn: step.i, len: step.len,
      bassLo: S.bassLo ?? 33,
      has: (p) => this.has(p),
      vel: (base) => clamp(base * (0.62 + 0.55 * energy) * (0.94 + rng.next() * 0.1), 0.05, 1),
    };
    let events = [];
    const add = (evs) => {
      for (const e of evs) if (this.has(e.i)) events.push(e);
    };

    // The tune (or the solo).
    const L = S.lead;
    if (melody && step.section !== 'solo') {
      const players = step.section === 'A2' ? L.A2 || L.A : step.section === 'B' ? L.B || L.A : L.A;
      const [main, ...doubles] = players;
      const notes = melody.map((n) => ({ ...n, m: n.m + lift }));
      add(this.leadEvents(main, notes, c, 0, 0.72));
      for (const d of doubles) add(this.leadEvents(d, notes, c, d === L.octDown ? -12 : d === L.octUp ? 12 : 0, 0.55));
    } else if (step.section === 'solo') {
      const r = this.players.range[song.soloist] || [60, 84];
      const prev = this.state.solo ?? Math.round((r[0] + r[1]) / 2);
      const line = improviseBar(rng, S, key, song.minor, chords, Math.max(r[0], 58), Math.min(r[1], 88), prev, energy);
      if (line.length) this.state.solo = line[line.length - 1].m;
      add(this.leadEvents(song.soloist, line, c, 0, 0.66));
    }

    // The accompaniment, layer by layer.
    for (const spec of S.parts) {
      if (spec.min != null && energy < spec.min) continue;
      if (spec.max != null && energy > spec.max) continue;
      if (spec.in && !spec.in.includes(step.section)) continue;
      if (spec.out && spec.out.includes(step.section)) continue;
      if (!this.has(spec.i || spec.players?.[0] || spec.top || 'cb')) continue;
      const fn = PART_FNS[spec.fn];
      add(fn(c, spec));
    }
    if (S.drums && (S.drumsIn ? S.drumsIn.includes(step.section) : step.section !== 'intro' || energy > 0.35)) add(drumPart(c, S.drums));
    // Fills and crashes at the joins.
    const lastOfSection = step.i === step.len - 1 && nextStep && nextStep.section !== step.section;
    if (lastOfSection && S.fill && energy > 0.35) {
      events = events.filter((e) => !(e.b >= 2 && ['snare', 'clap', 'kick', 'tap', 'cgh', 'cgl'].includes(e.i)));
      add(fillPart(c));
      if (S.riser && nextStep.section === 'A2') add([{ i: 'sweep', a: 'hit', b: 0, d: S.beats, v: 0.7 }]);
    }
    if (step.i === 0 && S.crash && step.section !== 'intro' && energy > 0.4) add([{ i: S.crash, a: S.crash === 'cym' ? 'crash' : 'hit', b: 0, d: 2, v: 0.5 + energy * 0.3 }]);

    events = this.finish(events, c);
    const bpm = clamp(song.bpm * this.tempo * Math.pow(song.accel, this.sectionIndex()), 40, 260);
    this.lastBpm = bpm;
    this.barNo++;
    return {
      beats: S.beats, bpm, events,
      info: { section: step.section, name: song.name, bar: this.barNo, chord: chordName(key, chords[0]), key: NAMES[key] + (song.minor ? ' minor' : ' major'), label: S.labels?.[step.section] },
    };
  }

  sectionIndex() {
    let n = 0;
    for (let k = 1; k < this.pos; k++) if (this.plan[k].section !== this.plan[k - 1].section) n++;
    return n;
  }

  leadEvents(p, notes, c, shift, vel) {
    const r = this.players.range[p];
    const art = this.S.leadArt?.[p] || (this.players.sectionOf[p] === 'rhythm' ? 'hit' : 'sus');
    const out = [];
    notes.forEach((n, k) => {
      let m = n.m + shift;
      if (r) m = fit(m, r[0], r[1]);
      const prev = notes[k - 1];
      out.push({ i: p, a: art, b: n.b, d: n.d, m, v: c.vel(vel + (n.d >= 1.5 ? 0.05 : 0)), glide: !!prev && Math.abs(prev.b + prev.d - n.b) < 0.01 });
    });
    return out;
  }

  // Ranges, swing, and nothing past the bar line.
  finish(events, c) {
    const out = [];
    for (const e of events) {
      if (e.m != null && this.players.range[e.i]) {
        const [lo, hi] = this.players.range[e.i];
        if (e.m < lo || e.m > hi) e.m = fit(e.m, lo, hi);
        if (e.m > hi) continue;
      }
      if (e.b >= c.beats - 1e-6) continue;
      e.d = Math.max(0.05, e.d);
      e.v = clamp(e.v, 0.02, 1);
      out.push(e);
    }
    if (c.S.swing && c.S.swing > 0.5) swingEvents(out, c.S.swing, 1);
    for (const e of out) if (!e.glide) delete e.glide;
    return out;
  }

  endBar() {
    const song = this.song;
    const S = song.S;
    const key = song.key;
    const ch = { r: 0, q: song.minor ? 'min' : S.endChord || 'maj7', at: 0 };
    const events = [];
    const tones = chordTones(key, song.minor ? { r: 0, q: 'min' } : ch, S);
    const v = voice(tones, 66, null, Math.min(4, tones.length));
    for (const p of S.ending || []) {
      if (!this.has(p)) continue;
      const r = this.players.range[p];
      if (!r) {
        events.push({ i: p, a: p === 'cym' ? 'swell' : 'hit', b: 0, d: S.beats, v: 0.6 });
        continue;
      }
      for (const m of v) events.push({ i: p, a: S.leadArt?.[p] || 'sus', b: 0, d: S.beats, m: fit(m, r[0], r[1]), v: 0.5 });
    }
    if (this.has(S.endBass || 'cb')) events.push({ i: S.endBass || 'cb', a: 'sus', b: 0, d: S.beats, m: fit(key + 36, S.bassLo ?? 33, (S.bassLo ?? 33) + 11), v: 0.6 });
    this.barNo++;
    return {
      beats: S.beats, bpm: (this.lastBpm || song.bpm * this.tempo) * 0.85, events: this.finish(events, { S: { ...S, swing: 0 }, beats: S.beats }),
      info: { section: 'end', name: song.name, bar: this.barNo, chord: chordName(key, ch), key: NAMES[key] + (song.minor ? ' minor' : ' major') },
    };
  }

  restBar() {
    this.barNo++;
    return { beats: this.song.S.beats, bpm: 100, events: [], info: { section: 'rest', name: this.song.name, bar: this.barNo } };
  }
}

const PART_FNS = { bass: bassPart, walk: walkPart, comp: compPart, pad: sectionPad, arp: arpPart, gliss: glissPart, sparkle: sparklePart, brass: brassPart, fx: fxPart };

function songName(rng, names) {
  if (!names) return 'Untitled';
  return `${rng.pick(names[0])} ${rng.pick(names[1])}`;
}
