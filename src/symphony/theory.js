// SPDX-License-Identifier: MIT
// Pitch helpers for the symphony composer: note names, roman-numeral chords,
// chord scales and range fitting. Pitches are MIDI numbers (C4 = 60).

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// 'F#4' -> 66, 'Bb3' -> 58
export function note(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error(`bad note ${s}`);
  return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1);
}

export function noteName(m) {
  return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

// 'E4:1.5 D4:0.5 r:2' -> [{ b, d, m }] (rests advance time only)
export function line(s, start = 0) {
  const out = [];
  let b = start;
  for (const tok of s.trim().split(/\s+/)) {
    if (!tok) continue;
    const [n, d] = tok.split(':');
    const dur = eval_(d);
    if (n !== 'r') out.push({ b, d: dur, m: note(n) });
    b += dur;
  }
  return { notes: out, beats: b - start };
}

function eval_(d) {
  if (d.includes('/')) {
    const [a, b] = d.split('/').map(Number);
    return a / b;
  }
  return Number(d);
}

const DEG = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
const QUAL = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus: [0, 5, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  add9: [0, 4, 7, 2],
};

// Roman numeral relative to the tonic: 'bVI', 'iv', 'V7', 'IVmaj7', 'Vsus', 'viio', 'II'.
export function roman(tok) {
  const m = /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(o|\+|7|maj7|sus|add9)?$/.exec(tok);
  if (!m) throw new Error(`bad chord ${tok}`);
  const minor = m[2] === m[2].toLowerCase();
  const r = (DEG[m[2].toUpperCase()] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0) + 12) % 12;
  let q = minor ? 'min' : 'maj';
  if (m[3] === 'o') q = 'dim';
  else if (m[3] === '+') q = 'aug';
  else if (m[3] === '7') q = minor ? 'min7' : 'dom7';
  else if (m[3] === 'maj7') q = 'maj7';
  else if (m[3] === 'sus') q = 'sus';
  else if (m[3] === 'add9') q = 'add9';
  return { r, q, name: tok };
}

// 'I V-I IV' -> per bar [{ r, q, at }] (a dash splits the bar evenly)
export function chordBars(s, meter) {
  return s.trim().split(/\s+/).map((tok) => {
    const parts = tok.split('-');
    return parts.map((p, i) => ({ ...roman(p), at: (i * meter) / parts.length }));
  });
}

export function chordPcs(key, ch) {
  return QUAL[ch.q].map((x) => (key + ch.r + x) % 12);
}

// The mode's notes bent to fit the chord: a scale note a semitone from a chord tone becomes that chord tone.
export function chordScale(key, mode, ch) {
  const tones = chordPcs(key, ch);
  const out = new Set(tones);
  for (const s of MODES[mode]) {
    const pc = (key + s) % 12;
    const clash = tones.some((t) => t !== pc && (Math.abs(t - pc) === 1 || Math.abs(t - pc) === 11));
    if (!clash) out.add(pc);
  }
  return [...out];
}

// Nearest pitch to m whose pitch class is in pcs; ties go in direction dir.
export function snap(m, pcs, dir = 1) {
  for (let k = 0; k < 12; k++) {
    const a = m + k * (dir >= 0 ? 1 : -1);
    const b = m - k * (dir >= 0 ? 1 : -1);
    if (pcs.includes(((a % 12) + 12) % 12)) return a;
    if (pcs.includes(((b % 12) + 12) % 12)) return b;
  }
  return m;
}

// Move a pitch by octaves into [lo, hi] (as close as it gets).
export function fit(m, lo, hi) {
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m < lo ? m + 12 : m;
}

// Octave shift that puts a whole line inside [lo, hi] best, keeping its shape.
export function lineShift(ms, lo, hi) {
  if (!ms.length) return 0;
  const min = Math.min(...ms);
  const max = Math.max(...ms);
  let best = 0;
  let bestCost = Infinity;
  for (let k = -5; k <= 5; k++) {
    const s = k * 12;
    const cost = Math.max(0, lo - (min + s)) + Math.max(0, max + s - hi) + Math.abs((min + max) / 2 + s - (lo + hi) / 2) * 0.05;
    if (cost < bestCost) [best, bestCost] = [s, cost];
  }
  return best;
}

// A close voicing of the chord, n notes, the lowest at or above lo, nothing above hi.
export function voicing(pcs, lo, hi, n) {
  const out = [];
  let m = lo;
  const want = [pcs[0], ...pcs.slice(1)];
  let guard = 0;
  while (out.length < n && guard++ < 48 && m <= hi) {
    if (want.includes(((m % 12) + 12) % 12) && !out.includes(m)) out.push(m);
    m++;
  }
  return out;
}
