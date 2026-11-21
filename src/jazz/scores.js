// SPDX-License-Identifier: MIT
// Public-domain rags, played from MIDI files in scores/. Scott Joplin died in
// 1917, so his rags are free everywhere. The MIDI files were made with
// LilyPond from the Mutopia Project's editions, which their typesetters
// placed in the public domain (see LICENSES.md). This module cuts a score
// into 2/4 measures and finds each quarter's chord from the notes.

import { parseScore } from '../symphony/score.js';

export const RAGS = [
  { id: 'entertainer', name: 'THE ENTERTAINER', source: 'Scott Joplin, 1902', file: 'scores/joplin-entertainer.mid', offset: 0, bpm: 76, pd: 'Joplin died 1917' },
  { id: 'maple', name: 'MAPLE LEAF RAG', source: 'Scott Joplin, 1899', file: 'scores/joplin-maple-leaf-rag.mid', offset: 192, bpm: 92, pd: 'Joplin died 1917' },
  { id: 'winners', name: 'THE EASY WINNERS', source: 'Scott Joplin, 1901', file: 'scores/joplin-easy-winners.mid', offset: 0, bpm: 84, pd: 'Joplin died 1917' },
  { id: 'pineapple', name: 'PINEAPPLE RAG', source: 'Scott Joplin, 1908', file: 'scores/joplin-pineapple-rag.mid', offset: 0, bpm: 92, pd: 'Joplin died 1917' },
  { id: 'peacherine', name: 'PEACHERINE RAG', source: 'Scott Joplin, 1901', file: 'scores/joplin-peacherine-rag.mid', offset: 0, bpm: 84, pd: 'Joplin died 1917' },
];
export const RAG_BY_ID = Object.fromEntries(RAGS.map((r) => [r.id, r]));

const ROOT_Q = [
  ['dom7', [0, 4, 10]], ['dim7', [0, 3, 6, 9]], ['dim', [0, 3, 6]], ['maj7', [0, 4, 11]], ['min7', [0, 3, 10]], ['min', [0, 3, 7]], ['min', [0, 3]], ['maj', [0, 4]], ['maj', [0, 7]],
];

// The chord of a set of notes: the lowest left-hand note is the root unless the notes say otherwise.
export function detectChord(notes) {
  if (!notes.length) return null;
  const pcs = new Set(notes.map((n) => n.m % 12));
  const bassNotes = notes.filter((n) => n.h === 1);
  const low = (bassNotes.length ? bassNotes : notes).reduce((a, n) => (n.m < a.m ? n : a));
  const tryRoot = (r) => {
    for (const [q, iv] of ROOT_Q) if (iv.every((x) => pcs.has((r + x) % 12))) return { r, q };
    return null;
  };
  let c = tryRoot(low.m % 12);
  if (!c) for (const p of pcs) if ((c = tryRoot(p))) break;
  return { ...(c || { r: low.m % 12, q: 'maj' }), at: 0 };
}

// MIDI file bytes -> { piece, measures: [{ beats, notes: [{ b, d, m, h, v }], chords, section, pos, repeat }] }
export function ragFromMidi(buffer, piece) {
  const sc = parseScore(buffer);
  const ppq = sc.ppq;
  const M = 2 * ppq;
  const off = piece.offset || 0;
  const all = [];
  sc.tracks.forEach((tr, ti) => {
    for (const n of tr.notes) all.push({ t0: n.t0, t1: n.t1, m: n.m, h: ti === 0 ? 0 : 1 });
  });
  const end = Math.max(...all.map((n) => n.t1));
  const count = Math.ceil((end - off) / M);
  const measures = [];
  const first = off > 0 ? -1 : 0;
  for (let k = first; k < count; k++) {
    const s = off + k * M;
    const startT = Math.max(0, s);
    const beats = (s + M - startT) / ppq;
    const notes = all
      .filter((n) => n.t0 >= startT && n.t0 < s + M)
      .map((n) => ({ b: (n.t0 - startT) / ppq, d: Math.max(0.05, (n.t1 - n.t0) / ppq - 0.02), m: n.m, h: n.h }));
    measures.push({ beats, notes, startT });
  }
  // Voices: the top right-hand note sings, the left hand's lowest note is the bass.
  for (const meas of measures) {
    const tops = new Map();
    for (const n of meas.notes) if (n.h === 0 && (!tops.has(n.b) || tops.get(n.b).m < n.m)) tops.set(n.b, n);
    for (const n of meas.notes) {
      if (n.h === 0) n.v = tops.get(n.b) === n ? 0.64 : 0.5;
      else n.v = n.m < 50 && Math.abs(n.b - Math.round(n.b)) < 1e-6 ? 0.6 : 0.45;
    }
    const chords = [];
    for (let q = 0; q < Math.ceil(meas.beats - 1e-6); q++) {
      const inQ = meas.notes.filter((n) => n.b >= q - 1e-6 && n.b < q + 1 - 1e-6);
      const c = detectChord(inQ);
      if (c && (!chords.length || chords[chords.length - 1].r !== c.r || chords[chords.length - 1].q !== c.q)) chords.push({ ...c, at: q });
    }
    meas.chords = chords.length ? chords : [{ r: 0, q: 'maj', at: 0 }];
  }
  // Repeats: a measure that matches the one 16 measures earlier is the strain played again.
  const sig = (m) => m.notes.map((n) => `${n.b.toFixed(2)}:${n.m}`).sort().join(',');
  const sigs = measures.map(sig);
  let strain = 0;
  let pos = 0;
  measures.forEach((m, i) => {
    m.repeat = i >= 16 && sigs[i] === sigs[i - 16] && sigs[i].length > 0;
    m.section = m.repeat ? 'repeat' : 'strain';
    if (i > 0 && measures[i - 1].repeat && !m.repeat) {
      strain++;
      pos = 0;
    }
    m.strain = strain;
    m.pos = pos++ % 16;
  });
  return { piece, measures };
}

export async function loadRag(id, fetcher = fetch) {
  const piece = RAG_BY_ID[id];
  if (!piece) throw new Error(`unknown rag ${id}`);
  const buf = await (await fetcher(piece.file)).arrayBuffer();
  return ragFromMidi(buf, piece);
}
