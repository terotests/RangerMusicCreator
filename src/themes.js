// SPDX-License-Identifier: MIT
// Melodies from public-domain tunes. Each note is [scale degree, beats],
// degree 0 = the tonic of `mode`; null degree = rest. They are written out by
// ear for this project (no published edition or recording was copied) and
// set in 4/4, starting on a downbeat, so four bars (16 beats) make one phrase.
// Tunes in 3/4 or 6/8 are adapted by lengthening a note in each bar.
// The composer plays a phrase as written, in the tune's own mode, puts chords
// under it that fit, and varies it from there. Sources: LICENSES.md.

export const THEMES = [
  {
    name: 'ODE TO JOY',
    source: 'L. van Beethoven, Symphony No. 9 (1824)',
    mode: 'major',
    notes: [
      [2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [2, 1.5], [1, 0.5], [1, 2],
      [2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [1, 1.5], [0, 0.5], [0, 2],
    ],
  },
  {
    name: 'FRERE JACQUES',
    source: 'Traditional French round (18th c.)',
    mode: 'major',
    notes: [
      [0, 1], [1, 1], [2, 1], [0, 1], [0, 1], [1, 1], [2, 1], [0, 1], [2, 1], [3, 1], [4, 2], [2, 1], [3, 1], [4, 2],
      [4, 0.5], [5, 0.5], [4, 0.5], [3, 0.5], [2, 1], [0, 1], [4, 0.5], [5, 0.5], [4, 0.5], [3, 0.5], [2, 1], [0, 1], [0, 1], [-3, 1], [0, 2], [0, 1], [-3, 1], [0, 2],
    ],
  },
  {
    name: 'AMAZING GRACE',
    source: 'Hymn tune "New Britain", American traditional (1829)',
    mode: 'major',
    notes: [[0, 2], [2, 1], [0, 1], [2, 3], [1, 1], [0, 3], [-2, 1], [-3, 3], [-3, 1], [0, 2], [2, 1], [0, 1], [2, 3], [1, 1], [4, 4], [null, 3], [-3, 1]],
  },
  {
    name: 'CANON',
    source: 'J. Pachelbel, Canon in D (c. 1680)',
    mode: 'major',
    notes: [[2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-3, 2], [-2, 2], [-1, 2]],
  },
  {
    name: 'MORNING MOOD',
    source: 'E. Grieg, Peer Gynt (1875)',
    mode: 'major',
    notes: [
      [4, 1], [2, 0.5], [1, 0.5], [0, 0.5], [1, 0.5], [2, 1], [4, 1], [2, 0.5], [1, 0.5], [0, 0.5], [1, 0.5], [2, 1],
      [4, 0.5], [2, 0.5], [4, 0.5], [5, 0.5], [2, 0.5], [5, 0.5], [4, 0.5], [2, 0.5], [1, 1], [0, 3],
    ],
  },
  {
    name: 'WHEN THE SAINTS',
    source: 'Traditional American spiritual',
    mode: 'major',
    notes: [
      [null, 1], [0, 1], [2, 1], [3, 1], [4, 4], [null, 1], [0, 1], [2, 1], [3, 1], [4, 4],
      [null, 1], [0, 1], [2, 1], [3, 1], [4, 2], [2, 2], [0, 2], [2, 2], [1, 4],
    ],
  },
  {
    name: 'AULD LANG SYNE',
    source: 'Traditional Scottish air (18th c.)',
    mode: 'major',
    notes: [[0, 1.5], [0, 0.5], [0, 1], [2, 1], [1, 1.5], [0, 0.5], [1, 1], [2, 1], [0, 1.5], [0, 0.5], [2, 1], [4, 1], [5, 4]],
  },
  {
    name: 'GYMNOPEDIE',
    source: 'E. Satie, Gymnopedie No. 1 (1888)',
    mode: 'major',
    notes: [[null, 1], [2, 1], [4, 1], [3, 1], [2, 1], [-1, 1], [-2, 1], [-1, 1], [0, 1], [-3, 3], [null, 4]],
  },
  {
    name: 'GREENSLEEVES',
    source: 'Traditional English (16th c.)',
    mode: 'minor',
    notes: [
      [2, 3], [3, 1], [4, 2], [5, 1], [4, 1], [3, 3], [1, 1], [-1, 2], [0, 1], [1, 1],
      [2, 3], [0, 1], [0, 2], [-1, 1], [0, 1], [1, 3], [-1, 1], [-3, 3], [0, 1],
    ],
  },
  {
    name: 'SCARBOROUGH FAIR',
    source: 'Traditional English ballad',
    mode: 'dorian',
    notes: [[0, 3], [0, 1], [4, 3], [4, 1], [1, 1.5], [2, 0.5], [1, 2], [0, 4], [null, 3], [4, 1], [6, 3], [7, 1], [6, 3], [4, 1], [5, 1], [3, 1], [4, 2]],
  },
  {
    name: 'MOUNTAIN KING',
    source: 'E. Grieg, Peer Gynt (1875)',
    mode: 'minor',
    notes: [
      [0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [4, 0.5], [2, 0.5], [4, 1], [3, 0.5], [1, 0.5], [3, 1], [2, 0.5], [0, 0.5], [2, 1],
      [0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [4, 0.5], [2, 0.5], [4, 0.5], [7, 0.5], [6, 0.5], [4, 0.5], [2, 0.5], [4, 0.5], [6, 2],
    ],
  },
  {
    name: 'SWAN THEME',
    source: 'P. I. Tchaikovsky, Swan Lake (1876)',
    mode: 'minor',
    notes: [[4, 2], [0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [4, 1.5], [2, 0.5], [4, 1.5], [2, 0.5], [4, 1], [0, 0.5], [2, 0.5], [0, 0.5], [-2, 0.5], [2, 0.5], [0, 0.5], [0, 4]],
  },
];
