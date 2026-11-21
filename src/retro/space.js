// SPDX-License-Identifier: MIT
// Space Age pop, 1955–1965: exotica, science-fiction theremin, cha-cha
// "bachelor pad" hi-fi, bossa lounge and a space waltz. Style traits only;
// every tune is written by the composer, and the one standard is the
// traditional Greensleeves.

import { RetroComposer } from './composer.js';
import { SPACE_RANGE, SPACE_SECTION_OF } from './bands.js';
import { tune } from './tunes.js';

const NAMES = [
  ['Velvet', 'Saturn', 'Coral', 'Lunar', 'Tiki', 'Martini', 'Jade', 'Starlight', 'Cosmic', 'Bamboo', 'Orbiting', 'Silver', 'Moonlit', 'Atomic', 'Polynesian', 'Zero-G'],
  ['Lagoon', 'Satellite', 'Cocktail', 'Volcano', 'Rendezvous', 'Boomerang', 'Paradise', 'Comet', 'Lounge', 'Mambo', 'Galaxy', 'Orchid', 'Holiday', 'Nebula', 'Serenade', 'Cha-Cha'],
];

export const SPACE_STYLES = {
  exotica: {
    name: 'EXOTICA', desc: 'Island lounge: vibes and marimba, bongos and congas, birds calling in the trees',
    bpm: [100, 114], cells: 'latin', keys: [0, 5, 7, 2, 10], minor: 0.4, names: NAMES,
    progs: {
      A: ['Imaj7 vi7 ii7 V7 Imaj7 vi7 ii7-V7 Imaj7', 'Imaj7 IVmaj7 Imaj7 IVmaj7 iii7 vi7 ii7 V7', 'Imaj7 bVII7 Imaj7 bVII7 IVmaj7 iv6 Imaj7 V7'],
      B: ['IVmaj7 IVmaj7 iii7 vi7 ii7 ii7 V7 V7', 'vi7 vi7 II7 II7 ii7 ii7 bII7 V7'],
      intro: ['Imaj7 bVII7'],
    },
    minorProgs: {
      A: ['i6 i6 iv6 iv6 bVImaj7 V7 i6 V7', 'i6 bVII7 bVImaj7 V7 i6 bVII7 bVImaj7-V7 i6'],
      B: ['bIIImaj7 bIIImaj7 bVImaj7 bVImaj7 iv6 iv6 V7 V7'],
      intro: ['i6 bVImaj7'],
    },
    melodyLo: 64, melodyHi: 84,
    lead: { A: ['vib'], B: ['fl', 'vib'], A2: ['vib', 'mar'], solo: ['vib', 'mar'] },
    leadArt: { mar: 'hit', pno: 'hit' },
    parts: [
      { fn: 'bass', i: 'cb', pat: 'beguine' },
      { fn: 'comp', i: 'pno', pat: 'beguine', a: 'hit', center: 62, n: 3, min: 0.35 },
      { fn: 'pad', players: ['str', 'vla'], low: 'vc', min: 0.55, center: 70 },
      { fn: 'arp', i: 'mar', unit: 0.5, shape: 'pattern', lo: 53, span: 2, min: 0.42, out: ['solo'] },
      { fn: 'sparkle', i: 'glk', p: 0.3, min: 0.5 },
      { fn: 'gliss', i: 'hrp', every: 8, min: 0.55 },
      { fn: 'fx', i: 'bird', every: 4, at: 2, p: 0.55, lo: 86, hi: 98 },
    ],
    drums: 'beguine', fill: 'congas', crash: 'cym', lift: [0, 0, 2],
    ending: ['vib', 'str', 'vla', 'hrp', 'cym'],
  },
  orbit: {
    name: 'THEREMIN ORBIT', desc: 'Science-fiction lounge: a theremin over shimmering strings, harp, timpani and flying saucers',
    bpm: [66, 76], cells: 'float', keys: [2, 9, 4, 7], minor: 0.7, names: NAMES,
    progs: {
      A: ['Imaj7 bVImaj7 Imaj7 bVImaj7 IVmaj7 iv6 Imaj7 V+', 'Imaj7 bIIImaj7 bVImaj7 bIImaj7 Imaj7 bIIImaj7 IVmaj7 V+'],
      B: ['bVImaj7 bVImaj7 bIIImaj7 bIIImaj7 bIImaj7 bIImaj7 V+ V+'],
      intro: ['Imaj7 bVImaj7'],
    },
    minorProgs: {
      A: ['i bVImaj7 iv6 V+ i bIImaj7 bVII7 V7', 'i i bVI bVI iv iv V+ V+', 'i bIImaj7 i bIImaj7 bVImaj7 iv6 V+ V+'],
      B: ['bVImaj7 bVImaj7 bIImaj7 bIImaj7 iv6 iv6 V+ V7', 'bIII+ bIII+ bVImaj7 bVImaj7 bIImaj7 bIImaj7 V7 V7'],
      intro: ['i bIImaj7'],
    },
    melodyLo: 64, melodyHi: 86,
    lead: { A: ['thr'], B: ['thr'], A2: ['thr', 'str'], solo: ['thr', 'vib'] },
    parts: [
      { fn: 'bass', i: 'cb', pat: 'two', min: 0.5 },
      { fn: 'pad', players: ['str', 'vla'], low: 'vc', a: 'trem', center: 66 },
      { fn: 'gliss', i: 'hrp', every: 4, len: 1.5 },
      { fn: 'arp', i: 'vib', unit: 1, shape: 'updown', lo: 55, span: 2, min: 0.45 },
      { fn: 'sparkle', i: 'glk', p: 0.4 },
      { fn: 'fx', i: 'ufo', every: 8, at: 4, p: 0.8, b: 0, d: 3, lo: 70, hi: 82 },
      { fn: 'fx', i: 'ufo', every: 8, at: 7, p: 0.5, b: 1, d: 2, lo: 74, hi: 86, a: 'fall' },
    ],
    drums: 'orbit', fill: 'timp', crash: 'cym', lift: [0, 1],
    ending: ['str', 'vla', 'hrp', 'vib', 'cym'],
  },
  bachelor: {
    name: 'BACHELOR PAD', desc: 'Hi-fi cha-cha: muted brass stabs, organ and vibes bouncing from speaker to speaker',
    bpm: [116, 128], cells: 'latin', keys: [5, 10, 0, 3], minor: 0.25, names: NAMES,
    progs: {
      A: ['I6 vi7 ii7 V7 I6 vi7 ii7 V7', 'I6 I6 ii7 V7 iii7 VI7 ii7 V7', 'I6 #io7 ii7 V7 I6 I7 IV6 iv6'],
      B: ['IV6 IV6 I6 I6 II7 II7 ii7 V7', 'iii7 VI7 ii7 V7 iii7 VI7 ii7 V7'],
      intro: ['ii7 V7'],
    },
    minorProgs: {
      A: ['i6 iv6 V7 i6 i6 iv6 bVI7 V7'],
      B: ['iv6 iv6 i6 i6 bVI7 bVI7 V7 V7'],
      intro: ['i6 V7'],
    },
    melodyLo: 62, melodyHi: 82,
    lead: { A: ['org'], B: ['vib'], A2: ['tp', 'org'], solo: ['vib', 'org', 'pno'] },
    leadArt: { tp: 'mute', pno: 'hit', org: 'stac' },
    parts: [
      { fn: 'bass', i: 'cb', pat: 'chacha' },
      { fn: 'comp', i: 'pno', pat: 'chacha', a: 'hit', center: 64, n: 3, min: 0.3 },
      { fn: 'brass', top: 'tp', low: 'tb', pat: 'chacha', p: 0.55, min: 0.5, out: ['A2'] },
      { fn: 'pad', players: ['str', 'vla'], low: 'vc', min: 0.72, center: 72 },
      { fn: 'sparkle', i: 'glk', p: 0.25, min: 0.55 },
      { fn: 'gliss', i: 'hrp', every: 8, min: 0.6 },
    ],
    drums: 'chacha', fill: 'timbale', crash: 'cym', lift: [1, 2],
    ending: ['org', 'tp', 'tb', 'vib', 'cym'],
  },
  lounge: {
    name: 'COCKTAIL LOUNGE', desc: 'Bossa nova after midnight: flute and vibes, a soft organ and brushes',
    bpm: [124, 138], cells: 'lounge', keys: [5, 0, 7, 10], minor: 0.2, names: NAMES,
    progs: {
      A: ['Imaj7 vi7 ii7 V7 iii7 VI7 ii7 V7', 'Imaj7 Imaj7 II7 II7 ii7 bII7 Imaj7 bII7', 'Imaj7 IVmaj7 iii7 vi7 ii7 V7 Imaj7 V7'],
      B: ['IVmaj7 IVmaj7 iv6 iv6 iii7 VI7 ii7 V7', 'bVIImaj7 bVIImaj7 IVmaj7 IVmaj7 iii7 VI7 ii7 V7'],
      intro: ['Imaj7 bII7'],
    },
    minorProgs: {
      A: ['i6 i6 iv6 iv6 iiø V7 i6 V7'],
      B: ['bVImaj7 bVImaj7 iv6 iv6 iiø iiø V7 V7'],
      intro: ['i6 iiø'],
    },
    melodyLo: 64, melodyHi: 86,
    lead: { A: ['fl'], B: ['vib'], A2: ['fl', 'vib'], solo: ['vib', 'org', 'pno'] },
    leadArt: { pno: 'hit' },
    parts: [
      { fn: 'bass', i: 'cb', pat: 'bossa' },
      { fn: 'comp', i: 'org', a: 'soft', center: 60, n: 4 },
      { fn: 'comp', i: 'pno', pat: 'bossa', a: 'hit', center: 64, n: 3, min: 0.45 },
      { fn: 'pad', players: ['str', 'vla'], min: 0.72, center: 74 },
      { fn: 'sparkle', i: 'glk', p: 0.2, min: 0.6 },
    ],
    drums: 'bossa', crash: null, lift: [0, 1],
    ending: ['fl', 'vib', 'org', 'str'],
  },
  moon: {
    name: 'MOON WALTZ', desc: 'A slow waltz under the stars: vibes and strings, harp and celeste',
    bpm: [138, 152], beats: 3, cells: 'waltz', keys: [3, 8, 10, 5], minor: 0.3, names: NAMES,
    progs: {
      A: ['Imaj7 Imaj7 vi7 vi7 ii7 V7 Imaj7 V7', 'Imaj7 III7 vi7 VI7 ii7 V7 iii7-vi7 ii7-V7', 'I6 #io7 ii7 V7 iii7 VI7 ii7 V7'],
      B: ['IVmaj7 IVmaj7 iv6 iv6 Imaj7 VI7 II7 V7', 'vi7 II7 Imaj7 Imaj7 vi7 II7 ii7 V7'],
      intro: ['Imaj7 ii7'],
    },
    minorProgs: {
      A: ['i i iv iv V7 V7 i V7'],
      B: ['bVImaj7 bVImaj7 bIIImaj7 bIIImaj7 iv6 iv6 V7 V7'],
      intro: ['i iv'],
    },
    melodyLo: 64, melodyHi: 86,
    lead: { A: ['vib'], B: ['str'], A2: ['str', 'vib'], solo: ['vib', 'thr'] },
    parts: [
      { fn: 'bass', i: 'cb', pat: 'waltz' },
      { fn: 'comp', i: 'pno', pat: 'waltz', a: 'hit', center: 63, n: 3, min: 0.3 },
      { fn: 'pad', players: ['vla'], low: 'vc', min: 0.45, center: 62 },
      { fn: 'arp', i: 'hrp', unit: 1, shape: 'updown', lo: 55, span: 2, min: 0.4 },
      { fn: 'sparkle', i: 'glk', p: 0.3 },
    ],
    drums: 'waltz', crash: 'cym', lift: [0, 1],
    ending: ['vib', 'str', 'vla', 'hrp', 'cym'],
  },
};
export const SPACE_STYLE_IDS = Object.keys(SPACE_STYLES);

// Greensleeves (traditional, 16th century): verse and chorus in A minor.
const G_VERSE = 'C5/2 D5/1 | E5/1.5 F5/0.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/0.5 B4/1 | C5/2 A4/1 | A4/1.5 G#4/0.5 A4/1 | B4/2 G#4/1 | E4/2 A4/1 | '
  + 'C5/2 D5/1 | E5/1.5 F5/0.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/0.5 B4/1 | C5/1.5 B4/0.5 A4/1 | G#4/1.5 F#4/0.5 G#4/1 | A4/3 | A4/2 A4/1';
const G_CHORUS = 'G5/3 | G5/1.5 F#5/0.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/0.5 B4/1 | C5/2 A4/1 | A4/1.5 G#4/0.5 A4/1 | B4/2 G#4/1 | E4/3 | '
  + 'G5/3 | G5/1.5 F#5/0.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/0.5 B4/1 | C5/1.5 B4/0.5 A4/1 | G#4/1.5 F#4/0.5 G#4/1 | A4/3 | A4/2 A4/1';

export const SPACE_PIECES = {
  greensleeves: {
    id: 'greensleeves', name: 'Greensleeves', source: 'Traditional English, 16th century', pd: 'traditional',
    style: 'moon', beats: 3, bpm: 132, key: 9, minor: true, intro: 'i bVII', lift: 0,
    sections: {
      A: { chords: 'i bIII bVII v i V V V i bIII bVII v i V i i', melody: tune(G_VERSE) },
      B: { chords: 'bIII bIII bVII v i V V V bIII bIII bVII v i V i i', melody: tune(G_CHORUS) },
    },
    form: ['intro', 'A', 'B', 'solo', 'B', 'A2', 'outro'],
  },
};
export const SPACE_PIECE_LIST = Object.values(SPACE_PIECES);

export const SPACE_BAND_INFO = { range: SPACE_RANGE, sectionOf: SPACE_SECTION_OF };

export class SpaceComposer extends RetroComposer {
  constructor(opts) {
    super({ ...opts, styles: SPACE_STYLES, pieces: SPACE_PIECES, band: SPACE_BAND_INFO, style: opts.style || 'exotica' });
  }
}

export function writeSpace(seed, style, bars = 64) {
  const c = new SpaceComposer({ seed, style });
  return Array.from({ length: bars }, () => c.nextBar());
}
