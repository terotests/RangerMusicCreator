// SPDX-License-Identifier: MIT
// Melodic seeds from public-domain tunes. Each note is [scale degree, beats],
// degree 0 = the tonic; null degree = rest. These are short openings written
// out by ear for this project (no published edition was copied), and the
// composer only uses them as raw material: it takes a fragment, re-times it,
// maps it onto whatever key and mode is playing, and varies it from there.
// Sources and licence notes: LICENSES.md.

export const THEMES = [
  {
    name: 'ODE TO JOY',
    source: 'L. van Beethoven, Symphony No. 9 (1824)',
    notes: [[2, 1], [2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 1], [1, 1], [2, 1], [2, 1.5], [1, 0.5], [1, 2]],
  },
  {
    name: 'FRERE JACQUES',
    source: 'Traditional French round (18th c.)',
    notes: [[0, 1], [1, 1], [2, 1], [0, 1], [0, 1], [1, 1], [2, 1], [0, 1], [2, 1], [3, 1], [4, 2], [2, 1], [3, 1], [4, 2]],
  },
  {
    name: 'GREENSLEEVES',
    source: 'Traditional English (16th c.)',
    notes: [[0, 1], [2, 2], [3, 1], [4, 1.5], [5, 0.5], [4, 1], [3, 2], [1, 1], [-1, 1.5], [0, 0.5], [1, 1], [2, 2], [0, 1], [0, 1.5], [-1, 0.5], [0, 1], [1, 2], [-1, 1], [-3, 2]],
  },
  {
    name: 'SCARBOROUGH FAIR',
    source: 'Traditional English ballad',
    notes: [[0, 2], [0, 1], [4, 2], [4, 1], [1, 1.5], [2, 0.5], [1, 1], [0, 3], [4, 1], [6, 2], [7, 1], [6, 2], [4, 1], [5, 1], [3, 1], [4, 3]],
  },
  {
    name: 'MOUNTAIN KING',
    source: 'E. Grieg, Peer Gynt (1875)',
    notes: [[0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [4, 0.5], [2, 0.5], [4, 1], [3, 0.5], [1, 0.5], [3, 1], [2, 0.5], [0, 0.5], [2, 1], [0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [4, 0.5], [2, 0.5], [4, 0.5], [7, 0.5], [6, 0.5], [4, 0.5], [2, 0.5], [4, 0.5], [6, 2]],
  },
  {
    name: 'GYMNOPEDIE',
    source: 'E. Satie, Gymnopedie No. 1 (1888)',
    notes: [[null, 1], [2, 1], [4, 1], [3, 1], [2, 1], [-1, 1], [-2, 1], [-1, 1], [0, 1], [-3, 3]],
  },
  {
    name: 'SWAN THEME',
    source: 'P. I. Tchaikovsky, Swan Lake (1876)',
    notes: [[4, 3], [0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5], [4, 2], [2, 1], [4, 2], [2, 1], [4, 2], [0, 1], [2, 1], [0, 1], [-2, 1], [0, 3]],
  },
];
