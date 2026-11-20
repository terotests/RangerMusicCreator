// SPDX-License-Identifier: MIT
// Public-domain classics, arranged for this project. Each composer died more
// than 70 years ago, so the compositions are free to use in Finland, the EU
// and the US (Sibelius is protected in Finland until the end of 2027, so he
// is left out). Only the notes are used: the melodies are written out by ear,
// harmonised and orchestrated here, and played with the CC0 samples. No
// recording, edition or arrangement by anyone else is copied. LICENSES.md
// lists every piece.
//
// A piece is either phrases ({ A, B }) that the composer orchestrates in its
// cinematic form, or a `script` that returns the bars written out in full.

import { line, chordBars, note } from './theory.js';

// Bars from a chord string and '|'-separated note strings (melody, optional response line).
function phrase(meter, chords, mel, resp) {
  const cb = chordBars(chords, meter);
  const mb = mel.split('|');
  const rb = resp ? resp.split('|') : [];
  if (mb.length !== cb.length) throw new Error(`phrase: ${cb.length} chord bars, ${mb.length} melody bars`);
  return cb.map((chords, i) => {
    const m = line(mb[i]);
    if (Math.abs(m.beats - meter) > 1e-6) throw new Error(`bar ${i + 1} has ${m.beats} beats: ${mb[i]}`);
    const bar = { chords, mel: m.notes };
    if (rb[i]) bar.resp = line(rb[i]).notes;
    return bar;
  });
}

const twice = (bars) => [...bars, ...bars];

// ---- Also sprach Zarathustra: the sunrise, written out ---------------------------

function ev(i, a, b, d, m, v, v2) {
  const e = { i, a, b, d, m: m == null ? null : typeof m === 'string' ? note(m) : m, v };
  if (v2 != null) e.v2 = v2;
  return e;
}

function chord(list, a, b, d, notes, v, v2) {
  return notes.map(([i, n]) => ev(i, a, b, d, n, v, v2));
}

const C_MAJ = [['hn', 'C4'], ['hn', 'E4'], ['hn', 'G4'], ['tb', 'C3'], ['tb', 'G3'], ['tu', 'C2'], ['vln1', 'E5'], ['vln1', 'C6'], ['vln2', 'G4'], ['vln2', 'C5'], ['vla', 'E4'], ['vc', 'C3'], ['fl', 'G5'], ['ob', 'E5'], ['cl', 'C5']];
const minor = (arr) => arr.map(([i, n]) => [i, n.replace(/^E(\d)/, 'Eb$1')]);

function zarathustra() {
  const bars = [];
  const bar = (events, section = 'theme', chordName = 'C') => bars.push({ beats: 4, events, section, chord: chordName });
  const pedal = (v = 0.45) => [ev('cb', 'sus', 0, 4.1, 'C2', v), ev('tu', 'sus', 0, 4.1, 'C2', v * 0.7), ev('bn', 'sus', 0, 4.1, 'C2', v * 0.7)];
  const timpTail = (v) => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, j) => ev('timp', 'hit', b, 0.5, j % 2 ? 'G2' : 'C3', v - j * 0.02));
  bar([...pedal(0.35), ev('bd', 'roll', 0, 4, null, 0.15, 0.25)], 'intro');
  bar([...pedal(0.4), ev('bd', 'roll', 0, 4, null, 0.25, 0.3)], 'intro');
  // Three statements: C - G - C, then the chord turns.
  const statement = (first, turn, last) => {
    bar([...pedal(), ev('tp', 'sus', 0, 2, 'C4', 0.7), ev('tp', 'sus', 2, 2, 'G4', 0.75)], 'fanfare');
    if (last) return;
    const [a, b] = turn;
    bar([...pedal(), ev('tp', 'sus', 0, 2.5, 'C5', 0.85), ...chord(0, 'sus', 2.5, 0.5, a, 0.9), ...chord(0, 'sus', 3, 3, b, 0.95, 0.7), ev('timp', 'hit', 2.5, 0.5, 'C3', 0.9), ev('cym', 'crash', 3, 3, null, 0.6)], 'fanfare', first ? 'C - Cm' : 'Cm - C');
    bar([...pedal(0.4), ...timpTail(0.85).filter((e) => e.b >= 2)], 'timpani');
    bar([...pedal(0.35), ...timpTail(0.8).filter((e) => e.b < 2.5), ev('timp', 'hit', 2, 1, 'C3', 0.8)], 'timpani');
  };
  statement(true, [C_MAJ, minor(C_MAJ)]);
  statement(false, [minor(C_MAJ), C_MAJ]);
  statement(false, null, true);
  const F_MAJ = [['hn', 'C4'], ['hn', 'F4'], ['hn', 'A4'], ['tb', 'F3'], ['tb', 'C3'], ['tu', 'F2'], ['vln1', 'A5'], ['vln2', 'F5'], ['vla', 'C5'], ['vc', 'F3'], ['fl', 'A5'], ['ob', 'F5'], ['cl', 'C5']];
  const G7 = [['hn', 'D4'], ['hn', 'F4'], ['hn', 'B4'], ['tb', 'G3'], ['tb', 'D3'], ['tu', 'G2'], ['vln1', 'B5'], ['vln2', 'F5'], ['vla', 'D5'], ['vc', 'G3'], ['fl', 'B5'], ['ob', 'G5'], ['cl', 'D5']];
  const CE = C_MAJ.map(([i, n]) => [i, i === 'tu' || i === 'vc' ? n.replace('C', 'E') : n]);
  bar([...pedal(), ev('tp', 'sus', 0, 2, 'C5', 0.85), ...chord(0, 'sus', 2, 1, CE, 0.8), ev('tp', 'sus', 2, 1, 'E5', 0.85), ...chord(0, 'sus', 3, 1, F_MAJ, 0.82), ev('tp', 'sus', 3, 1, 'F5', 0.88)], 'rise', 'C/E - F');
  bar([...pedal(0.6), ...chord(0, 'sus', 0, 2, F_MAJ, 0.85, 0.9), ev('tp', 'sus', 0, 2, 'A4', 0.9), ...chord(0, 'sus', 2, 2, G7, 0.85, 1), ev('tp', 'sus', 2, 2, 'B4', 0.95), ev('timp', 'roll', 0, 4, 'G2', 0.4, 0.95), ev('cym', 'swell', 0, 4, null, 0.2, 0.9), ev('sn', 'roll', 2, 2, null, 0.3, 0.8)], 'rise', 'F - G7');
  const final = [...C_MAJ, ['tp', 'C5'], ['tp', 'G4'], ['tp', 'E5'], ['cb', 'C2'], ['vc', 'G3'], ['fl', 'C6']];
  bar([...chord(0, 'sus', 0, 7, final, 1, 0.9), ev('timp', 'roll', 0, 7, 'C3', 1, 0.8), ev('cym', 'crash', 0, 6, null, 1), ev('bd', 'hit', 0, 4, null, 1), ev('gong', 'hit', 0, 8, null, 0.7), ev('harp', 'hit', 0, 2, 'C3', 0.8)], 'sunrise', 'C');
  bar([ev('timp', 'hit', 3, 1, 'C3', 0.9)], 'sunrise', 'C');
  bar([ev('cb', 'sus', 0, 4, 'C2', 0.4), ev('bn', 'sus', 0, 4, 'C2', 0.3)], 'coda', 'C');
  return bars;
}

// ---- Mars ostinato: a build over the 5/4 rhythm ---------------------------------

function mars() {
  const bars = [];
  const OST = [[0, 1 / 3], [1 / 3, 1 / 3], [2 / 3, 1 / 3], [1, 1], [2, 1], [3, 0.5], [3.5, 0.5], [4, 1]];
  const ost = (v, low = 'G2', full = false) => {
    const out = [];
    for (const [b, d] of OST) {
      const acc = b === 0 || b === 1 || b === 4 ? 0.06 : 0;
      out.push(ev('vc', 'spic', b, d, low, v + acc), ev('vla', 'spic', b, d, note(low) + 12, v + acc - 0.05));
      if (full) out.push(ev('vln2', 'spic', b, d, note(low) + 24, v + acc - 0.05), ev('cb', 'pizz', b, d, note(low) - 12, v + acc));
      out.push(ev('timp', 'hit', b, d, low, v - 0.1 + acc));
    }
    out.push(ev('harp', 'hit', 0, 1, note(low) - 12, v));
    return out;
  };
  const bar = (events, section, chordName) => bars.push({ beats: 5, events, section, chord: chordName });
  for (let i = 0; i < 4; i++) bar(ost(0.3 + i * 0.04), 'ostinato', 'G');
  const sus = (insts, b, d, notes, v, v2) => insts.flatMap((i, k) => notes.map((n) => ev(i, 'sus', b, d, n, v, v2)));
  // Long horn and bassoon notes over the pedal.
  const plan = [['G3', 'D4'], ['Ab3', 'Eb4'], ['G3', 'D4'], ['Db4', 'F4', 'Ab4'], ['C4', 'E4', 'G4'], ['Db4', 'F4', 'Ab4'], ['D4', 'F#4', 'A4'], ['Eb4', 'G4', 'Bb4']];
  plan.forEach((ns, j) => {
    const v = 0.4 + j * 0.05;
    bar([...ost(0.42 + j * 0.04, 'G2', j > 3), ...sus(['hn'], 0, 5.05, ns, v, v + 0.1), ...sus(['bn'], 0, 5.05, [ns[0]], v - 0.1), ...(j > 3 ? sus(['tb'], 0, 5.05, ns.map((n) => note(n) - 12), v - 0.05) : [])], 'build', ns[0].replace(/\d/, ''));
  });
  // Climax: full brass and strings, cymbals.
  const top = [['Ab4', 'C5', 'Eb5'], ['G4', 'B4', 'D5'], ['Ab4', 'Db5', 'F5'], ['G4', 'C5', 'E5']];
  top.forEach((ns, j) => {
    bar([
      ...ost(0.85, 'G2', true),
      ...sus(['tp'], 0, 5.05, ns, 0.9),
      ...sus(['hn'], 0, 5.05, ns.map((n) => note(n) - 12), 0.85),
      ...sus(['tb'], 0, 5.05, ns.map((n) => note(n) - 24), 0.85),
      ev('tu', 'sus', 0, 5.05, 'G1', 0.8),
      ...sus(['vln1'], 0, 5.05, ns.map((n) => note(n) + 12), 0.8),
      ev('cym', 'crash', 0, 4, null, j % 2 ? 0.7 : 0.95),
      ev('bd', 'hit', 0, 2, null, 0.9),
      ...(j === 3 ? [ev('gong', 'hit', 0, 8, null, 0.9)] : []),
    ], 'climax', ns[0].replace(/\d/, ''));
  });
  bar([...chord(0, 'sus', 0, 3, [['tp', 'G4'], ['tp', 'D5'], ['hn', 'G3'], ['hn', 'D4'], ['tb', 'G2'], ['tu', 'G1'], ['vln1', 'G5'], ['vln2', 'D5'], ['vla', 'G4'], ['vc', 'G2'], ['cb', 'G2']], 1), ev('timp', 'roll', 0, 3, 'G2', 1, 0.9), ev('cym', 'crash', 0, 4, null, 1), ev('bd', 'hit', 0, 3, null, 1)], 'end', 'G5');
  bar([ev('timp', 'hit', 0, 1, 'G2', 1), ev('bd', 'hit', 0, 2, null, 0.9), ...chord(0, 'stac', 0, 0.5, [['tp', 'G4'], ['hn', 'G3'], ['tb', 'G2']], 1)], 'end', 'G5');
  bar([], 'end', '');
  return bars;
}

// ---- the list -----------------------------------------------------------------

export const CLASSICS = [
  {
    id: 'danube',
    name: 'THE BLUE DANUBE',
    source: 'Johann Strauss II, An der schönen blauen Donau (1866)',
    pd: 'Composer died 1899',
    mood: 'tender',
    orch: { solo: ['hn', 'vc'], bLead: ['vln1'], harp: null },
    key: 2,
    mode: 'major',
    meter: 3,
    bpm: 156,
    intro: 2,
    pickup: line('D4:1', -1).notes,
    climaxShift: 0,
    coda: ['IV', 'V7', 'I', 'I'],
    phrases: {
      A: phrase(
        3,
        'I I I I I I I V7 V7 V7 V7 V7 V7 V7 V7 I I I I I I I I vi ii ii II7 I V7 I I I',
        'D4:1 F#4:1 A4:1 | A4:3 | r:3 | r:2 D4:1 | D4:1 F#4:1 A4:1 | A4:3 | r:3 | r:2 C#4:1 | C#4:1 E4:1 B4:1 | B4:3 | r:3 | r:2 C#4:1 | C#4:1 E4:1 B4:1 | B4:3 | r:3 | r:2 D4:1 | D4:1 F#4:1 A4:1 | D5:3 | r:3 | r:2 D4:1 | D4:1 F#4:1 A4:1 | D5:3 | r:3 | r:2 E4:1 | E4:1 G4:1 B4:1 | B4:3 | r:1 G#4:1 A4:1 | F#5:3 | E5:2 C#5:1 | D5:3 | r:3 | r:2 D4:1',
        'r:3 | r:3 | r:1 A5:1 A5:1 | r:1 F#5:1 F#5:1 | r:3 | r:3 | r:1 A5:1 A5:1 | r:1 G5:1 G5:1 | r:3 | r:3 | r:1 B5:1 B5:1 | r:1 G5:1 G5:1 | r:3 | r:3 | r:1 B5:1 B5:1 | r:1 F#5:1 F#5:1 | r:3 | r:3 | r:1 D6:1 D6:1 | r:1 A5:1 A5:1 | r:3 | r:3 | r:1 D6:1 D6:1 | r:1 B5:1 B5:1 | r:3 | r:3 | r:3 | r:3 | r:3 | r:3 | r:3 | r:3',
      ),
    },
  },
  {
    id: 'zarathustra',
    name: 'ALSO SPRACH ZARATHUSTRA',
    source: 'Richard Strauss, Also sprach Zarathustra, introduction (1896)',
    pd: 'Composer died 1949 (free in the EU since 2020; published 1896, free in the US)',
    mood: 'flyby',
    key: 0,
    mode: 'major',
    meter: 4,
    bpm: 58,
    script: zarathustra,
  },
  {
    id: 'mars',
    name: 'MARS OSTINATO',
    source: 'After Gustav Holst, The Planets: Mars (1914–16). The 5/4 rhythm, with a build written here',
    pd: 'Composer died 1934 (free in the EU since 2005; published 1921, free in the US)',
    mood: 'ominous',
    key: 7,
    mode: 'minor',
    meter: 5,
    bpm: 150,
    script: mars,
  },
  {
    id: 'ode',
    name: 'ODE TO JOY',
    source: 'Ludwig van Beethoven, Symphony No. 9, finale (1824)',
    pd: 'Composer died 1827',
    mood: 'triumph',
    orch: { solo: ['vc', 'bn'], bLead: ['vln1', 'ob'] },
    key: 2,
    mode: 'major',
    meter: 4,
    bpm: 96,
    climaxShift: 0,
    coda: ['IV', 'V', 'I', 'I'],
    phrases: {
      A: phrase(4, 'I V I I-V I V I V-I', 'F#4:1 F#4:1 G4:1 A4:1 | A4:1 G4:1 F#4:1 E4:1 | D4:1 D4:1 E4:1 F#4:1 | F#4:1.5 E4:0.5 E4:2 | F#4:1 F#4:1 G4:1 A4:1 | A4:1 G4:1 F#4:1 E4:1 | D4:1 D4:1 E4:1 F#4:1 | E4:1.5 D4:0.5 D4:2'),
      B: phrase(4, 'V-I V-I V-ii I-V I V I V-I', 'E4:1 E4:1 F#4:1 D4:1 | E4:1 F#4:0.5 G4:0.5 F#4:1 D4:1 | E4:1 F#4:0.5 G4:0.5 F#4:1 E4:1 | D4:1 E4:1 A3:2 | F#4:1 F#4:1 G4:1 A4:1 | A4:1 G4:1 F#4:1 E4:1 | D4:1 D4:1 E4:1 F#4:1 | E4:1.5 D4:0.5 D4:2'),
    },
  },
  {
    id: 'newworld',
    name: 'NEW WORLD LARGO',
    source: 'Antonín Dvořák, Symphony No. 9 "From the New World", Largo (1893)',
    pd: 'Composer died 1904',
    mood: 'flyby',
    orch: { solo: ['ob'], bLead: ['vln1'], ost: null, harp: null },
    key: 1,
    mode: 'major',
    meter: 4,
    bpm: 54,
    climaxShift: 0,
    coda: ['IV', 'iv', 'I', 'I'],
    phrases: {
      A: phrase(4, 'I I vi V I I V I', 'F4:1.5 Ab4:0.5 Ab4:2 | F4:1.5 Eb4:0.5 Db4:2 | Eb4:1 F4:1 Ab4:1 F4:1 | Eb4:4 | F4:1.5 Ab4:0.5 Ab4:2 | F4:1.5 Eb4:0.5 Db4:2 | Eb4:1 F4:1 Eb4:1 Db4:1 | Db4:4'),
    },
  },
  {
    id: 'mountain',
    name: 'IN THE HALL OF THE MOUNTAIN KING',
    source: 'Edvard Grieg, Peer Gynt (1875)',
    pd: 'Composer died 1907',
    mood: 'ominous',
    orch: { solo: ['bn', 'vc'], bLead: ['vln1'], ost: 'march', gong: false },
    key: 11,
    mode: 'minor',
    meter: 4,
    bpm: 84,
    intro: 2,
    climaxShift: 0,
    sectionBpm: { A1: 1, A2: 1.2, B: 1.4, A3: 1.65, coda: 1.65 },
    coda: ['bVI', 'V', 'i', 'i'],
    phrases: {
      A: twice(phrase(4, 'i V i bIII', 'B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4:1 | F4:0.5 C#4:0.5 F4:1 E4:0.5 C4:0.5 E4:1 | B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4:0.5 B4:0.5 | A4:0.5 F#4:0.5 D4:0.5 F#4:0.5 A4:2')),
      B: twice(phrase(4, 'v II v bVII', 'F#4:0.5 G#4:0.5 A4:0.5 B4:0.5 C#5:0.5 A4:0.5 C#5:1 | C5:0.5 G#4:0.5 C5:1 B4:0.5 G4:0.5 B4:1 | F#4:0.5 G#4:0.5 A4:0.5 B4:0.5 C#5:0.5 A4:0.5 C#5:0.5 F#5:0.5 | E5:0.5 C#5:0.5 A4:0.5 C#5:0.5 E5:2')),
    },
  },
  {
    id: 'morning',
    name: 'MORNING MOOD',
    source: 'Edvard Grieg, Peer Gynt (1875)',
    pd: 'Composer died 1907',
    mood: 'wonder',
    orch: { solo: ['fl', 'ob'], bLead: ['vln1'], glock: false },
    key: 4,
    mode: 'major',
    meter: 4,
    bpm: 66,
    climaxShift: 0,
    coda: ['IV', 'V', 'I', 'I'],
    phrases: {
      A: twice(phrase(4, 'I I I-vi V-I', 'B4:1 G#4:0.5 F#4:0.5 E4:0.5 F#4:0.5 G#4:1 | B4:1 G#4:0.5 F#4:0.5 E4:0.5 F#4:0.5 G#4:1 | B4:0.5 G#4:0.5 B4:0.5 C#5:0.5 G#4:0.5 C#5:0.5 B4:0.5 G#4:0.5 | F#4:1 E4:3')),
    },
  },
  {
    id: 'swan',
    name: 'SWAN LAKE',
    source: 'Pyotr Ilyich Tchaikovsky, Swan Lake, scene (1876)',
    pd: 'Composer died 1893',
    mood: 'flyby',
    orch: { solo: ['ob'], bLead: ['vln1', 'vc'], padArt: 'trem', ost: null, harp: 'arp' },
    key: 11,
    mode: 'minor',
    meter: 4,
    bpm: 70,
    climaxShift: 0,
    coda: ['bVI', 'V', 'i', 'i'],
    phrases: {
      A: twice(phrase(4, 'i bIII i-bVI i', 'F#4:2 B3:0.5 C#4:0.5 D4:0.5 E4:0.5 | F#4:1.5 D4:0.5 F#4:1.5 D4:0.5 | F#4:1 B3:0.5 D4:0.5 B3:0.5 G3:0.5 D4:0.5 B3:0.5 | B3:4')),
    },
  },
];

export const CLASSIC_BY_ID = Object.fromEntries(CLASSICS.map((c) => [c.id, c]));
