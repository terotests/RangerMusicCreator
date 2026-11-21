// SPDX-License-Identifier: MIT
// The riffs of the Pop Machine: short public-domain figures from classical
// music, one or two bars each, written out by ear. Every composer died more
// than 70 years ago; each riff is listed in LICENSES.md. A riff can also be a
// new motif the machine writes itself (makeMotif).
//
// `notes` is 'C5/0.25 E5/0.25 | ...' (note/length in beats, bars split by
// '|'), in `key` (tonic pitch class). `home` is the chord each bar of the riff
// implies, so the machine knows how far to move it over another chord.
// `kind` says how it moves best: 'arp' (broken chords, re-voiced to each
// chord), 'line' (a tune, moved by scale steps) or 'chromatic' (moved in exact
// semitones, the way a rock riff is).

export const RIFFS = [
  {
    id: 'prelude', name: 'Prelude in C', by: 'J. S. Bach', source: 'Prelude in C major, BWV 846 (1722)', pd: 'Bach died 1750',
    key: 0, minor: false, kind: 'arp', home: 'I',
    notes: 'C4/0.25 E4/0.25 G4/0.25 C5/0.25 E5/0.25 G4/0.25 C5/0.25 E5/0.25 C4/0.25 E4/0.25 G4/0.25 C5/0.25 E5/0.25 G4/0.25 C5/0.25 E5/0.25',
  },
  {
    id: 'cello', name: 'Cello Suite No. 1', by: 'J. S. Bach', source: 'Prelude of the Cello Suite No. 1, BWV 1007 (c. 1720)', pd: 'Bach died 1750',
    key: 7, minor: false, kind: 'arp', home: 'I',
    notes: 'G3/0.25 D4/0.25 B4/0.25 A4/0.25 B4/0.25 D4/0.25 B4/0.25 D4/0.25 G3/0.25 D4/0.25 B4/0.25 A4/0.25 B4/0.25 D4/0.25 B4/0.25 D4/0.25',
  },
  {
    id: 'invention', name: 'Invention No. 1', by: 'J. S. Bach', source: 'Two-part Invention No. 1, BWV 772 (1723)', pd: 'Bach died 1750',
    key: 0, minor: false, kind: 'line', home: 'I',
    notes: 'r/0.25 C5/0.25 D5/0.25 E5/0.25 F5/0.25 D5/0.25 E5/0.25 C5/0.25 G5/0.5 C6/0.5 B5/0.5 C6/0.5',
  },
  {
    id: 'fugue', name: 'Little Fugue', by: 'J. S. Bach', source: 'Fugue in G minor, BWV 578 (c. 1707)', pd: 'Bach died 1750',
    key: 7, minor: true, kind: 'line', home: 'i i',
    notes: 'G4/1 D5/1 Bb4/1.5 A4/0.5 | G4/0.5 Bb4/0.5 A4/0.5 G4/0.5 F#4/0.5 A4/0.5 D4/1',
  },
  {
    id: 'toccata', name: 'Toccata in D minor', by: 'J. S. Bach (attr.)', source: 'Toccata and Fugue in D minor, BWV 565', pd: 'Bach died 1750',
    key: 2, minor: true, kind: 'chromatic', home: 'i',
    notes: 'A5/0.25 G5/0.25 A5/1.5 G5/0.25 F5/0.25 E5/0.25 D5/0.25 C#5/0.5 D5/0.5',
  },
  {
    id: 'canon', name: 'Canon in D', by: 'Pachelbel', source: 'Johann Pachelbel, Canon in D (c. 1680)', pd: 'Pachelbel died 1706',
    key: 2, minor: false, kind: 'line', home: 'I vi',
    notes: 'F#5/1 E5/1 D5/1 C#5/1 | B4/1 A4/1 B4/1 C#5/1',
  },
  {
    id: 'spring', name: 'Spring', by: 'Vivaldi', source: 'Antonio Vivaldi, The Four Seasons, Spring (1725)', pd: 'Vivaldi died 1741',
    key: 4, minor: false, kind: 'line', home: 'I I',
    notes: 'E4/0.5 G#4/0.5 G#4/0.5 G#4/0.5 F#4/0.25 E4/0.25 B4/1.5 | B4/0.25 A4/0.25 G#4/0.5 G#4/0.5 G#4/0.5 F#4/0.25 E4/0.25 B4/1.5',
  },
  {
    id: 'mozart40', name: 'Symphony No. 40', by: 'Mozart', source: 'Wolfgang Amadeus Mozart, Symphony No. 40 (1788)', pd: 'Mozart died 1791',
    key: 7, minor: true, kind: 'line', home: 'i i',
    notes: 'D5/1 Eb5/0.5 D5/0.5 D5/1 Eb5/0.5 D5/0.5 | D5/1 Bb5/2 Bb5/0.5 A5/0.5',
  },
  {
    id: 'turca', name: 'Rondo alla Turca', by: 'Mozart', source: 'Wolfgang Amadeus Mozart, Piano Sonata K. 331 (1783)', pd: 'Mozart died 1791',
    key: 9, minor: true, kind: 'line', home: 'i i',
    notes: 'B4/0.25 A4/0.25 G#4/0.25 A4/0.25 C5/0.5 r/0.5 D5/0.25 C5/0.25 B4/0.25 C5/0.25 E5/0.5 r/0.5 | F5/0.25 E5/0.25 D#5/0.25 E5/0.25 B5/0.25 A5/0.25 G#5/0.25 A5/0.25 B5/0.25 A5/0.25 G#5/0.25 A5/0.25 C6/1',
  },
  {
    id: 'elise', name: 'Für Elise', by: 'Beethoven', source: 'Ludwig van Beethoven, Bagatelle WoO 59 (1810)', pd: 'Beethoven died 1827',
    key: 9, minor: true, kind: 'line', home: 'i V',
    notes: 'E5/0.25 D#5/0.25 E5/0.25 D#5/0.25 E5/0.25 B4/0.25 D5/0.25 C5/0.25 A4/0.5 r/0.25 C4/0.25 E4/0.25 A4/0.25 B4/0.5 | r/0.25 E4/0.25 G#4/0.25 B4/0.25 C5/0.5 r/0.25 E4/0.25 E5/0.25 D#5/0.25 E5/0.25 D#5/0.25 E5/0.25 B4/0.25 D5/0.25 C5/0.25',
  },
  {
    id: 'mountain', name: 'Mountain King', by: 'Grieg', source: 'Edvard Grieg, Peer Gynt (1875)', pd: 'Grieg died 1907',
    key: 11, minor: true, kind: 'line', home: 'i bIII',
    notes: 'B4/0.5 C#5/0.5 D5/0.5 E5/0.5 F#5/0.5 D5/0.5 F#5/1 | A5/0.5 F#5/0.5 D5/0.5 F#5/0.5 A5/2',
  },
  {
    id: 'bumblebee', name: 'Flight of the Bumblebee', by: 'Rimsky-Korsakov', source: 'Nikolai Rimsky-Korsakov, The Tale of Tsar Saltan (1900)', pd: 'Rimsky-Korsakov died 1908',
    key: 9, minor: true, kind: 'chromatic', home: 'V',
    notes: 'E5/0.25 D#5/0.25 D5/0.25 C#5/0.25 C5/0.25 F5/0.25 E5/0.25 D#5/0.25 E5/0.25 D#5/0.25 D5/0.25 C#5/0.25 C5/0.25 C#5/0.25 D5/0.25 D#5/0.25',
  },
];

export const RIFF_BY = Object.fromEntries(RIFFS.map((r) => [r.id, r]));

// ---- new motifs ---------------------------------------------------------------
// The machine's own riffs, built the way pop riffs are: a pivot note the line
// keeps returning to (Baroque figuration and 1970s synth hooks alike), a
// bouncing staccato hook with rests, or a slow anthem line with a leap.
// Notes are scale degrees: 0 = tonic, 7 = the octave.

const MOTIFS = {
  pivot: (rng) => {
    const pivot = rng.pick([4, 7]);
    const run = rng.pick([[2, 1, 0, 1], [3, 2, 1, 2], [0, 1, 2, 3], [2, 3, 4, 2], [-1, 0, 1, 2]]);
    const unit = rng.pick([0.25, 0.5]);
    const n = unit === 0.25 ? 16 : 8;
    const out = [];
    for (let k = 0; k < n; k++) out.push({ b: k * unit, d: unit * 0.9, deg: k % 2 === 0 ? pivot : run[Math.floor(k / 2) % run.length] });
    return { notes: [out], kind: 'arp' };
  },
  hook: (rng) => {
    const rhythms = [
      [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [3, 0.5], [3.5, 0.5]],
      [[0, 0.5], [0.5, 0.5], [1, 0.5], [2, 0.5], [2.5, 0.5], [3, 1]],
      [[0, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]],
    ];
    const bar = () => {
      const r = rng.pick(rhythms);
      let deg = rng.pick([0, 2, 4]);
      return r.map(([b, d], k) => {
        if (k > 0) deg += rng.pick([1, -1, -1, 2, -2, 0, 3, -3]);
        deg = Math.max(-2, Math.min(9, deg));
        return { b, d: d * 0.8, deg };
      });
    };
    const a = bar();
    // The second bar answers: same rhythm, ending lower.
    const b = a.map((x, k) => ({ ...x, deg: k < a.length - 2 ? x.deg + rng.pick([0, 1, -1]) : k === a.length - 1 ? 0 : x.deg - 1 }));
    return { notes: [a, b], kind: 'line' };
  },
  anthem: (rng) => {
    const up = rng.pick([3, 4]);
    const a = [{ b: 0, d: 1.5, deg: 0 }, { b: 1.5, d: 0.5, deg: 1 }, { b: 2, d: 2, deg: up }];
    const b = [{ b: 0, d: 1, deg: up + 1 }, { b: 1, d: 1, deg: up }, { b: 2, d: 1, deg: up - 1 }, { b: 3, d: 1, deg: rng.pick([1, 2]) }];
    return { notes: [a, b], kind: 'line' };
  },
};

export const MOTIF_KINDS = Object.keys(MOTIFS);

export function makeMotif(rng, kind = rng.pick(MOTIF_KINDS)) {
  const m = MOTIFS[kind](rng);
  return { id: 'motif', name: `Machine motif (${kind})`, by: 'the machine', kind: m.kind, motif: kind, degrees: m.notes, home: m.notes.map(() => 'I') };
}
