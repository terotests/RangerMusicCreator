// SPDX-License-Identifier: MIT
// Scales, chords and voice leading. Pitches are MIDI note numbers.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

export const SCALE_LABEL = {
  major: 'MAJOR',
  minor: 'MINOR',
  dorian: 'DORIAN',
  phrygian: 'PHRYGIAN',
  lydian: 'LYDIAN',
  mixolydian: 'MIXOLYDIAN',
  harmonicMinor: 'HARM MINOR',
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function mtof(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function noteName(m) {
  return NOTE_NAMES[((m % 12) + 12) % 12];
}

// Scale degree (any integer, negatives go below the root) to MIDI.
export function degreeToMidi(root, scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return root + oct * 12 + scale[i];
}

// Degrees of a chord built by stacking scale thirds on `deg`.
export function chordDegrees(deg, size) {
  return [0, 2, 4, 6, 8].slice(0, size).map((x) => deg + x);
}

export function chordName(root, scale, deg, size) {
  const m = chordDegrees(deg, Math.max(3, size)).map((d) => degreeToMidi(root, scale, d));
  const third = (m[1] - m[0] + 12) % 12;
  const fifth = (m[2] - m[0] + 12) % 12;
  let q = third === 3 ? 'm' : '';
  if (fifth === 6) q = 'dim';
  if (fifth === 8) q = 'aug';
  let ext = '';
  if (size >= 4) {
    const sev = (m[3] - m[0] + 12) % 12;
    ext = sev === 11 ? (q === 'm' ? '(maj7)' : 'maj7') : '7';
    if (q === 'dim' && sev === 10) return noteName(m[0]) + 'm7b5';
  }
  return noteName(m[0]) + q + ext;
}

// Place chord pitch classes in [lo, hi] as close as possible to the previous voicing.
export function voiceLead(prev, pcs, lo = 52, hi = 76) {
  const candidates = [];
  const n = pcs.length;
  for (let inv = 0; inv < n; inv++) {
    // base must be a C (a multiple of 12): base + pc is then that pitch class.
    // (Starting from lo - 12 shifted every chord by lo mod 12: with the pad's
    // lo = 50 a C major chord came out as D major, a whole step above the bass.)
    for (let base = Math.floor(lo / 12) * 12 - 12; base <= hi; base += 12) {
      const v = [];
      let last = -Infinity;
      for (let k = 0; k < n; k++) {
        const pc = pcs[(inv + k) % n];
        let m = base + pc;
        while (m <= last) m += 12;
        v.push(m);
        last = m;
      }
      if (v[0] >= lo && v[v.length - 1] <= hi + 4) candidates.push(v);
    }
  }
  if (!candidates.length) return pcs.map((pc) => lo + ((pc - lo) % 12 + 12) % 12);
  if (!prev || !prev.length) {
    const mid = (lo + hi) / 2;
    candidates.sort((a, b) => Math.abs(avg(a) - mid) - Math.abs(avg(b) - mid));
    return candidates[0];
  }
  let best = candidates[0];
  let bestCost = Infinity;
  for (const c of candidates) {
    let cost = 0;
    for (const m of c) {
      let d = Infinity;
      for (const p of prev) d = Math.min(d, Math.abs(m - p));
      cost += d;
    }
    cost += Math.abs(avg(c) - avg(prev)) * 0.5;
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}

function avg(a) {
  return a.reduce((s, x) => s + x, 0) / a.length;
}

// ---- chord specs -------------------------------------------------------------
// A chord in a progression is either a scale degree (a diatonic triad or
// seventh chord built from the key's own scale) or an object for a chord from
// outside the scale: { deg, q } builds quality q on that degree's root, and
// { pc, q } on an absolute pitch class (used for the dominant of a new key).
// q 'dom' is a dominant: major triad with a minor seventh, the chord that
// pulls a fifth down to its target (V7, or a secondary dominant V7/x).

const QUALITY = { dom: [0, 4, 7, 10], maj: [0, 4, 7, 11], min: [0, 3, 7, 10] };
const QUALITY_NAME = { dom: ['', '7'], maj: ['', 'maj7'], min: ['m', 'm7'] };

export const mod12 = (m) => ((m % 12) + 12) % 12;

export function sameChord(a, b) {
  if (typeof a === 'number' || typeof b === 'number') return a === b;
  return !!a && !!b && a.deg === b.deg && a.pc === b.pc && a.q === b.q;
}

// { rootPc, pcs, fifthPc, name } for a chord spec in a key.
export function resolveChord(root, scale, spec, size) {
  if (typeof spec === 'number') {
    const pcs = chordDegrees(spec, size).map((d) => mod12(degreeToMidi(root, scale, d)));
    return { rootPc: pcs[0], pcs, fifthPc: pcs[2], name: chordName(root, scale, spec, size) };
  }
  const rootPc = spec.pc ?? mod12(degreeToMidi(root, scale, spec.deg));
  const ivs = QUALITY[spec.q].slice(0, size >= 4 ? 4 : 3);
  const pcs = ivs.map((i) => mod12(rootPc + i));
  const [tri, sev] = QUALITY_NAME[spec.q];
  return { rootPc, pcs, fifthPc: mod12(rootPc + 7), name: noteName(rootPc) + (size >= 4 ? sev : tri) };
}

// Notes of the scale that a chord replaces with a chromatic neighbour, as
// Map(scale pc -> semitone shift to the chord tone): over D7 in C major, F -> +1.
// A melody note on such a pitch would grind a semitone against the chord.
export function chromaticShifts(root, scale, pcs) {
  const inScale = new Set(scale.map((s) => mod12(root + s)));
  const out = new Map();
  for (const c of pcs) {
    if (inScale.has(c)) continue;
    if (inScale.has(mod12(c - 1))) out.set(mod12(c - 1), 1);
    else if (inScale.has(mod12(c + 1))) out.set(mod12(c + 1), -1);
  }
  return out;
}
