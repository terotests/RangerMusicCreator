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
    for (let base = lo - 12; base <= hi; base += 12) {
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
