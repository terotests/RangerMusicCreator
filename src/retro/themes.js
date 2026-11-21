// SPDX-License-Identifier: MIT
// Public-domain themes the style songs are remixed from. Each composer died
// more than 70 years ago, or the tune is traditional. Only the notes are
// used: melodies written out by ear, with chords chosen here. Every theme is
// listed in LICENSES.md.
//
// A theme is 8 bars: `chords` (Roman numerals, '-' splits a bar) and
// `melody` ('C5/2 D5/1 | ...'), in `key` (tonic pitch class). The composer
// transposes it, gives it the style's rhythm feel and harmony sound, and
// writes the B section from the theme's own rhythms.

export const THEMES = [
  {
    id: 'ode', name: 'Ode to Joy', by: 'Beethoven', source: 'Ludwig van Beethoven, Symphony No. 9 (1824)', key: 0, minor: false, beats: 4,
    chords: 'I V I I-V I V I V-I',
    melody: 'E4/1 E4/1 F4/1 G4/1 | G4/1 F4/1 E4/1 D4/1 | C4/1 C4/1 D4/1 E4/1 | E4/1.5 D4/0.5 D4/2 | E4/1 E4/1 F4/1 G4/1 | G4/1 F4/1 E4/1 D4/1 | C4/1 C4/1 D4/1 E4/1 | D4/1.5 C4/0.5 C4/2',
  },
  {
    id: 'largo', name: 'New World Largo', by: 'Dvořák', source: 'Antonín Dvořák, Symphony No. 9, Largo (1893)', key: 0, minor: false, beats: 4,
    chords: 'I I vi V I I V I',
    melody: 'E4/1.5 G4/0.5 G4/2 | E4/1.5 D4/0.5 C4/2 | D4/1 E4/1 G4/1 E4/1 | D4/4 | E4/1.5 G4/0.5 G4/2 | E4/1.5 D4/0.5 C4/2 | D4/1 E4/1 D4/1 C4/1 | C4/4',
  },
  {
    id: 'morning', name: 'Morning Mood', by: 'Grieg', source: 'Edvard Grieg, Peer Gynt (1875)', key: 0, minor: false, beats: 4,
    chords: 'I I I-vi V-I I I I-vi V-I',
    melody: 'G4/1 E4/0.5 D4/0.5 C4/0.5 D4/0.5 E4/1 | G4/1 E4/0.5 D4/0.5 C4/0.5 D4/0.5 E4/1 | G4/0.5 E4/0.5 G4/0.5 A4/0.5 E4/0.5 A4/0.5 G4/0.5 E4/0.5 | D4/1 C4/3 | '
      + 'G4/1 E4/0.5 D4/0.5 C4/0.5 D4/0.5 E4/1 | G4/1 E4/0.5 D4/0.5 C4/0.5 D4/0.5 E4/1 | G4/0.5 E4/0.5 G4/0.5 A4/0.5 E4/0.5 A4/0.5 G4/0.5 E4/0.5 | D4/1 C4/3',
  },
  {
    id: 'canon', name: 'Canon in D', by: 'Pachelbel', source: 'Johann Pachelbel, Canon in D (c. 1680)', key: 0, minor: false, beats: 4,
    chords: 'I-V vi-iii IV-I IV-V I-V vi-iii IV-I IV-V',
    melody: 'E5/2 D5/2 | C5/2 B4/2 | A4/2 G4/2 | A4/2 B4/2 | E5/1 C5/1 D5/1 B4/1 | C5/1 A4/1 B4/1 G4/1 | A4/1 F4/1 G4/1 E4/1 | F4/1 A4/1 G4/1 B4/1',
  },
  {
    id: 'nacht', name: 'Eine kleine Nachtmusik', by: 'Mozart', source: 'Wolfgang Amadeus Mozart, Serenade K. 525 (1787)', key: 0, minor: false, beats: 4,
    chords: 'I I V V I I V I',
    melody: 'C5/1 r/0.5 G4/0.5 C5/1 r/0.5 G4/0.5 | C5/0.5 G4/0.5 C5/0.5 E5/0.5 G5/2 | F5/1 r/0.5 D5/0.5 F5/1 r/0.5 D5/0.5 | F5/0.5 D5/0.5 B4/0.5 D5/0.5 G4/2 | '
      + 'C5/1 r/0.5 G4/0.5 C5/1 r/0.5 G4/0.5 | C5/0.5 G4/0.5 C5/0.5 E5/0.5 G5/2 | F5/0.5 D5/0.5 B4/0.5 G4/0.5 D5/1 B4/1 | C5/2 r/2',
  },
  {
    id: 'swan', name: 'Swan Lake', by: 'Tchaikovsky', source: 'Pyotr Ilyich Tchaikovsky, Swan Lake (1876)', key: 9, minor: true, beats: 4,
    chords: 'i bIII i-bVI i i bIII i-bVI i',
    melody: 'E5/2 A4/0.5 B4/0.5 C5/0.5 D5/0.5 | E5/1.5 C5/0.5 E5/1.5 C5/0.5 | E5/1 A4/0.5 C5/0.5 A4/0.5 F4/0.5 C5/0.5 A4/0.5 | A4/4 | '
      + 'E5/2 A4/0.5 B4/0.5 C5/0.5 D5/0.5 | E5/1.5 C5/0.5 E5/1.5 C5/0.5 | E5/1 A4/0.5 C5/0.5 A4/0.5 F4/0.5 C5/0.5 A4/0.5 | A4/4',
  },
  {
    id: 'mountain', name: 'Mountain King', by: 'Grieg', source: 'Edvard Grieg, Peer Gynt (1875)', key: 9, minor: true, beats: 4,
    chords: 'i V i bIII i V i bIII',
    melody: 'A4/0.5 B4/0.5 C5/0.5 D5/0.5 E5/0.5 C5/0.5 E5/1 | D#5/0.5 B4/0.5 D#5/1 D5/0.5 Bb4/0.5 D5/1 | A4/0.5 B4/0.5 C5/0.5 D5/0.5 E5/0.5 C5/0.5 E5/0.5 A5/0.5 | G5/0.5 E5/0.5 C5/0.5 E5/0.5 G5/2 | '
      + 'A4/0.5 B4/0.5 C5/0.5 D5/0.5 E5/0.5 C5/0.5 E5/1 | D#5/0.5 B4/0.5 D#5/1 D5/0.5 Bb4/0.5 D5/1 | A4/0.5 B4/0.5 C5/0.5 D5/0.5 E5/0.5 C5/0.5 E5/0.5 A5/0.5 | G5/0.5 E5/0.5 C5/0.5 E5/0.5 G5/2',
  },
  {
    id: 'mozart40', name: 'Symphony No. 40', by: 'Mozart', source: 'Wolfgang Amadeus Mozart, Symphony No. 40 (1788)', key: 7, minor: true, beats: 4,
    chords: 'i i iv V7 V7 V7 V7 i',
    melody: 'D5/1 Eb5/0.5 D5/0.5 D5/1 Eb5/0.5 D5/0.5 | D5/1 Bb5/2 Bb5/0.5 A5/0.5 | G5/1 G5/0.5 F5/0.5 Eb5/1 Eb5/0.5 D5/0.5 | C5/1 C5/2 D5/0.5 C5/0.5 | '
      + 'C5/1 D5/0.5 C5/0.5 C5/1 D5/0.5 C5/0.5 | C5/1 A5/2 A5/0.5 G5/0.5 | F#5/1 F#5/0.5 Eb5/0.5 D5/1 D5/0.5 C5/0.5 | Bb4/1 Bb4/1 G4/2',
  },
  {
    id: 'sakura', name: 'Sakura', by: 'traditional', source: 'Sakura Sakura, traditional Japanese', key: 9, minor: true, beats: 4,
    chords: 'i i i bVI i V i bVI',
    melody: 'A4/1 A4/1 B4/2 | A4/1 A4/1 B4/2 | A4/1 B4/1 C5/1 B4/1 | A4/1 B4/0.5 A4/0.5 F4/2 | E4/1 C4/1 E4/1 F4/1 | E4/1 E4/0.5 C4/0.5 B3/2 | A4/1 B4/1 C5/1 B4/1 | A4/1 B4/0.5 A4/0.5 F4/2',
  },
  // 3/4
  {
    id: 'greensleeves', name: 'Greensleeves', by: 'traditional', source: 'Traditional English, 16th century', key: 9, minor: true, beats: 3,
    chords: 'i bIII bVII v i V V V',
    melody: 'C5/2 D5/1 | E5/1.5 F5/0.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/0.5 B4/1 | C5/2 A4/1 | A4/1.5 G#4/0.5 A4/1 | B4/2 G#4/1 | E4/2 A4/1',
  },
  {
    id: 'minuet', name: 'Minuet in G', by: 'Petzold', source: 'Christian Petzold, Minuet in G (1725), long attributed to J. S. Bach', key: 7, minor: false, beats: 3,
    chords: 'I I IV I IV I V V',
    melody: 'D5/1 G4/0.5 A4/0.5 B4/0.5 C5/0.5 | D5/1 G4/1 G4/1 | E5/1 C5/0.5 D5/0.5 E5/0.5 F#5/0.5 | G5/1 G4/1 G4/1 | C5/1 D5/0.5 C5/0.5 B4/0.5 A4/0.5 | B4/1 C5/0.5 B4/0.5 A4/0.5 G4/0.5 | F#4/1 G4/0.5 A4/0.5 B4/0.5 G4/0.5 | A4/3',
  },
  {
    id: 'grace', name: 'Amazing Grace', by: 'traditional', source: 'Amazing Grace, hymn tune "New Britain" (1829)', key: 0, minor: false, beats: 3,
    chords: 'I I IV I I I V V',
    melody: 'C5/2 E5/0.5 C5/0.5 | E5/2 D5/1 | C5/2 A4/1 | G4/2 G4/1 | C5/2 E5/0.5 C5/0.5 | E5/2 D5/1 | G5/3 | G5/2 E5/1',
  },
  {
    id: 'scarborough', name: 'Scarborough Fair', by: 'traditional', source: 'Scarborough Fair, traditional English', key: 9, minor: true, beats: 3,
    chords: 'i i bVII i i bVII IV i',
    melody: 'A4/2 A4/1 | E5/2 E5/1 | B4/1.5 C5/0.5 B4/1 | A4/3 | r/1 E5/1 G5/1 | A5/2 G5/1 | E5/1 F#5/1 D5/1 | E5/3',
  },
];
