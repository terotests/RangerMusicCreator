// SPDX-License-Identifier: MIT
// Jazz harmony helpers: roman-numeral chords with jazz qualities (6, maj7,
// m7, 7, 9, dim7, m7b5), chord scales for improvising, close voicings under
// a lead note, and swing timing. Pitches are MIDI numbers (C4 = 60).

export { snap, fit, lineShift, note, noteName, NAMES, line } from '../symphony/theory.js';
import { snap, fit } from '../symphony/theory.js';

const DEG = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
export const QUAL = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  six: [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dom9: [0, 4, 7, 10, 2],
  dim7: [0, 3, 6, 9],
  hdim: [0, 3, 6, 10],
};
// The four-note sound of each chord for section voicings.
const FOUR = { maj: 'six', min: 'min7', dim: 'dim7', aug: 'aug', six: 'six', min6: 'min6', maj7: 'maj7', min7: 'min7', dom7: 'dom7', dom9: 'dom7', dim7: 'dim7', hdim: 'hdim' };

// 'I', 'vi7', 'V9', '#ivo7', 'bVII7', 'iiø', 'IVmaj7', 'I6', 'iv6', 'viio'
export function chord(tok) {
  const m = /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(o7|o|ø|maj7|m7b5|7|9|6|\+)?$/.exec(tok);
  if (!m) throw new Error(`bad chord ${tok}`);
  const minor = m[2] === m[2].toLowerCase();
  const r = (DEG[m[2].toUpperCase()] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0) + 12) % 12;
  const s = m[3] || '';
  let q = minor ? 'min' : 'maj';
  if (s === 'o') q = 'dim';
  else if (s === 'o7') q = 'dim7';
  else if (s === 'ø' || s === 'm7b5') q = 'hdim';
  else if (s === 'maj7') q = 'maj7';
  else if (s === '7') q = minor ? 'min7' : 'dom7';
  else if (s === '9') q = minor ? 'min7' : 'dom9';
  else if (s === '6') q = minor ? 'min6' : 'six';
  else if (s === '+') q = 'aug';
  return { r, q, name: tok };
}

// 'I vi7 ii7-V7' -> per bar [{ r, q, at }] (a dash splits the bar evenly)
export function bars(s, beats) {
  return s.trim().split(/\s+/).map((tok) => {
    const parts = tok.split('-');
    return parts.map((p, i) => ({ ...chord(p), at: (i * beats) / parts.length }));
  });
}

export function pcs(key, ch) {
  return QUAL[ch.q].map((x) => (key + ch.r + x) % 12);
}

export function fourPcs(key, ch) {
  return QUAL[FOUR[ch.q]].map((x) => (key + ch.r + x) % 12);
}

export function chordAt(chords, b) {
  let c = chords[0];
  for (const ch of chords) if (ch.at <= b + 1e-6) c = ch;
  return c;
}

const SCALE = {
  maj: [0, 2, 4, 5, 7, 9, 11], six: [0, 2, 4, 5, 7, 9, 11], maj7: [0, 2, 4, 7, 9, 11, 5],
  min: [0, 2, 3, 5, 7, 9, 10], min6: [0, 2, 3, 5, 7, 9, 11], min7: [0, 2, 3, 5, 7, 9, 10],
  dom7: [0, 2, 4, 5, 7, 9, 10], dom9: [0, 2, 4, 5, 7, 9, 10], aug: [0, 2, 4, 6, 8, 10],
  dim: [0, 2, 3, 5, 6, 8, 9, 11], dim7: [0, 2, 3, 5, 6, 8, 9, 11], hdim: [0, 1, 3, 5, 6, 8, 10],
};
// Notes to improvise with over a chord (its scale, plus the blue notes of the key when asked).
export function scalePcs(key, ch, blue = false) {
  const out = SCALE[ch.q].map((x) => (key + ch.r + x) % 12);
  if (blue) for (const x of [3, 6, 10]) if (!out.includes((key + x) % 12)) out.push((key + x) % 12);
  return out;
}

// Close voicing of n voices from the lead note down, using the chord's four notes.
// A lead note outside the chord is harmonized as a diminished seventh around it.
export function closeBelow(lead, key, ch, n = 4) {
  let ps = fourPcs(key, ch);
  if (!ps.includes(((lead % 12) + 12) % 12)) ps = [0, 3, 6, 9].map((x) => (lead + x) % 12);
  const out = [lead];
  let m = lead - 1;
  while (out.length < n && m > lead - 13) {
    if (ps.includes(((m % 12) + 12) % 12)) out.push(m);
    m--;
  }
  return out;
}

// Shell voicing for piano comping: root-less 3rd + 7th (or 6th) and a top note, inside [lo, hi].
export function shell(key, ch, lo = 52, hi = 69) {
  const ps = fourPcs(key, ch);
  const third = ps[1];
  const seventh = ps[3] ?? ps[2];
  const a = fit(third + 48, lo, hi - 4);
  const b = snap(a + 3, [seventh], 1);
  const c = snap(b + 3, [ps[2], ps[0], (key + ch.r + 2) % 12], 1);
  return [a, b, c].filter((m) => m <= hi + 3);
}

// Straight eighths -> swung: an off-beat eighth moves to `amount` of the beat (0.5 = straight, 0.67 = triplet).
export function swingBeat(b, amount, unit = 1) {
  const pos = b / unit;
  const beat = Math.floor(pos + 1e-6);
  const frac = pos - beat;
  if (Math.abs(frac - 0.5) < 1e-6) return (beat + amount) * unit;
  return b;
}

export function swingEvents(events, amount, unit = 1) {
  if (amount <= 0.501) return events;
  for (const e of events) {
    if (e.straight) {
      delete e.straight;
      continue;
    }
    const b2 = swingBeat(e.b, amount, unit);
    if (b2 !== e.b) {
      // An off-beat note gets shorter, the note before it longer, so legato lines stay legato.
      e.d = Math.max(0.05, e.d - (b2 - e.b));
      e.b = b2;
    } else if (Math.abs(((e.b / unit) % 1) - 0) < 1e-6 && Math.abs(e.d - 0.5 * unit) < 1e-6) {
      e.d = amount * unit;
    }
  }
  return events;
}
