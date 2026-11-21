// SPDX-License-Identifier: MIT
// Synthwave: 1980s synth-pop and film-score sounds made new. Outrun night
// drives, Italo disco, darksynth, dreamwave and a TV-theme fanfare. Style
// traits only; tunes are written by the composer. The two standards are
// public-domain classics given the synth treatment: Grieg's "In the Hall of
// the Mountain King" (1875) and the opening of the Toccata in D minor,
// BWV 565, attributed to J. S. Bach.

import { RetroComposer } from './composer.js';
import { SYNTH_RANGE, SYNTH_SECTION_OF } from './bands.js';
import { tune } from './tunes.js';

const NAMES = [
  ['Neon', 'Midnight', 'Chrome', 'Laser', 'Electric', 'Turbo', 'Crystal', 'Violet', 'Digital', 'Sunset', 'Hyper', 'Night', 'Pastel', 'Infinite', 'Static', 'Cobalt'],
  ['Highway', 'Grid', 'Horizon', 'Runner', 'Arcade', 'Skyline', 'Drive', 'Pulse', 'Dreams', 'Boulevard', 'Mirage', 'Signal', 'Overdrive', 'Coast', 'Memory', 'Heat'],
];

const COMMON = { harmony: 'triad', cells: 'synth', soloUnit: 0.25, bassLo: 33, crash: 'crash', fill: 'toms', riser: true, names: NAMES };

export const SYNTH_STYLES = {
  outrun: {
    ...COMMON,
    name: 'OUTRUN', desc: 'Night drive: pulsing eighth-note bass, gated snare, a saw lead with echoes',
    bpm: [104, 118], keys: [9, 4, 2, 7, 11], minor: 0.75,
    progs: {
      A: ['I V vi IV I V vi IV', 'I iii IV V I iii IV V', 'vi IV I V vi IV I V'],
      B: ['IV IV V V vi vi V V', 'ii ii IV IV V V V V'],
      intro: ['I IV'],
    },
    minorProgs: {
      A: ['i bVI bIII bVII i bVI bIII bVII', 'i bVII bVI bVII i bVII bVI V', 'i i bVI bVI bIII bIII bVII bVII'],
      B: ['bVI bVII i i bVI bVII V V', 'iv iv bVI bVI bVII bVII V V'],
      intro: ['i bVI'],
    },
    melodyLo: 64, melodyHi: 86,
    lead: { A: ['lead'], B: ['lead'], A2: ['lead', 'brass'], solo: ['lead'] },
    parts: [
      { fn: 'bass', i: 'bass', pat: 'drive8', a: 'sus' },
      { fn: 'comp', i: 'pad', center: 62, n: 3 },
      { fn: 'arp', i: 'arp', unit: 0.25, shape: 'updown', lo: 52, span: 2, min: 0.45, legato: 0.8 },
      { fn: 'comp', i: 'str', center: 70, n: 3, min: 0.7 },
      { fn: 'comp', i: 'vox', center: 66, n: 3, min: 0.85 },
    ],
    drums: 'outrun', lift: [0, 1, 2],
    ending: ['pad', 'str', 'bell'], endBass: 'bass',
  },
  italo: {
    ...COMMON,
    name: 'ITALO DISCO', desc: 'Octave-jumping bass, four on the floor, handclaps and bright synth brass',
    bpm: [116, 126], keys: [4, 9, 2, 7], minor: 0.5,
    progs: {
      A: ['vi IV V iii vi IV V V', 'I vi IV V I vi IV V'],
      B: ['IV V iii vi IV V I I', 'ii V I vi ii V iii vi'],
      intro: ['vi V'],
    },
    minorProgs: {
      A: ['i bVII bVI V i bVII bVI V', 'i iv bVII bIII bVI iv V V'],
      B: ['bVI bVII i i bVI bVII V V'],
      intro: ['i bVII'],
    },
    melodyLo: 64, melodyHi: 86,
    lead: { A: ['lead'], B: ['bell', 'lead'], A2: ['lead', 'brass'], solo: ['lead', 'bell'] },
    leadArt: { lead: 'soft' },
    parts: [
      { fn: 'bass', i: 'bass', pat: 'octave8', a: 'sus' },
      { fn: 'brass', top: 'brass', low: 'brass', pat: 'stabs', p: 0.8, min: 0.4, center: 58 },
      { fn: 'arp', i: 'arp', unit: 0.5, shape: 'up', lo: 55, span: 2, min: 0.5, a: 'soft' },
      { fn: 'comp', i: 'pad', center: 64, n: 3, min: 0.6 },
    ],
    drums: 'italo', lift: [1, 2],
    ending: ['pad', 'brass', 'bell'], endBass: 'bass',
  },
  dark: {
    ...COMMON,
    name: 'DARKSYNTH', desc: 'Minor and heavy: a galloping bass, half-time drums, choir and alarm arps',
    bpm: [92, 104], keys: [4, 2, 9, 11], minor: 1,
    progs: { A: ['vi vi IV IV V V iii iii'], B: ['IV IV V V vi vi V V'], intro: ['vi IV'] },
    minorProgs: {
      A: ['i i bVI bVI iv iv V V', 'i bII i bII bVI bVI V V', 'i i bVII bVII bVI bVI V V'],
      B: ['bVI bVI bVII bVII i i V V', 'iv iv bVI bVI bII bII V V'],
      intro: ['i bII'],
    },
    melodyLo: 60, melodyHi: 82,
    lead: { A: ['lead'], B: ['lead', 'vox'], A2: ['lead', 'brass'], solo: ['lead'] },
    parts: [
      { fn: 'bass', i: 'bass', pat: 'gallop', a: 'sus' },
      { fn: 'comp', i: 'pad', center: 60, n: 3 },
      { fn: 'arp', i: 'arp', unit: 0.25, shape: 'pattern', lo: 50, span: 2, min: 0.5, legato: 0.6 },
      { fn: 'comp', i: 'vox', center: 64, n: 3, min: 0.6, out: ['B'] },
      { fn: 'comp', i: 'brass', pat: 'push', center: 58, n: 3, min: 0.75 },
    ],
    drums: 'dark', lift: [0, 1],
    ending: ['pad', 'vox', 'brass'], endBass: 'bass',
  },
  dream: {
    ...COMMON,
    name: 'DREAMWAVE', desc: 'Slow and warm: electric piano, glassy pads, a lazy beat and a bell melody',
    bpm: [84, 96], keys: [5, 0, 7, 2], minor: 0.25, add9: true,
    progs: {
      A: ['IV V iii vi IV V I I', 'I iii vi IV I iii IV V', 'vi IV I V vi IV ii V'],
      B: ['ii ii iii iii IV IV V V', 'IV IV iii vi ii ii V V'],
      intro: ['IV V'],
    },
    minorProgs: {
      A: ['i bVI bIII bVII i bVI iv V'],
      B: ['bVI bVI bVII bVII bIII bIII V V'],
      intro: ['i bVI'],
    },
    melodyLo: 66, melodyHi: 88,
    lead: { A: ['bell'], B: ['lead'], A2: ['lead', 'bell'], solo: ['ep', 'lead'] },
    leadArt: {},
    parts: [
      { fn: 'bass', i: 'bass', pat: 'dream', a: 'sus' },
      { fn: 'comp', i: 'ep', pat: 'ep', center: 62, n: 4 },
      { fn: 'comp', i: 'pad', a: 'soft', center: 66, n: 4 },
      { fn: 'arp', i: 'arp', unit: 0.5, shape: 'updown', lo: 55, span: 2, min: 0.55, a: 'soft' },
      { fn: 'comp', i: 'str', center: 72, n: 3, min: 0.75 },
    ],
    drums: 'dream', swing: 0.54, lift: [0, 2],
    ending: ['pad', 'ep', 'bell'], endBass: 'bass',
  },
  tv: {
    ...COMMON,
    name: 'TV THEME', desc: 'An 80s action-show opener: synth brass fanfares, a driving beat and a big key change',
    bpm: [124, 134], keys: [0, 7, 2, 10], minor: 0.2,
    progs: {
      A: ['I bVII IV I I bVII IV V', 'I IV I V I IV bVII V', 'I V IV V I V IV IV'],
      B: ['vi vi IV IV ii ii V V', 'bVI bVI bVII bVII IV IV V V'],
      intro: ['I bVII'],
    },
    minorProgs: { A: ['i bVII bVI bVII i bVII bVI V'], B: ['bVI bVI bVII bVII iv iv V V'], intro: ['i bVII'] },
    melodyLo: 62, melodyHi: 84,
    lead: { A: ['brass'], B: ['lead'], A2: ['brass', 'lead'], solo: ['lead'] },
    parts: [
      { fn: 'bass', i: 'bass', pat: 'octave8', a: 'sus' },
      { fn: 'comp', i: 'ep', pat: 'offbeat', center: 64, n: 3, min: 0.35 },
      { fn: 'comp', i: 'pad', center: 62, n: 3, min: 0.5 },
      { fn: 'arp', i: 'bell', unit: 0.5, shape: 'up', lo: 72, span: 1, min: 0.7 },
    ],
    drums: 'drive', lift: [2, 2, 3],
    ending: ['brass', 'pad', 'bell'], endBass: 'bass',
  },
};
export const SYNTH_STYLE_IDS = Object.keys(SYNTH_STYLES);

// In the Hall of the Mountain King (Grieg, Peer Gynt, 1875): the theme in
// B minor, then a fifth higher, getting faster with every section.
const MK = 'B4/0.5 C#5/0.5 D5/0.5 E5/0.5 F#5/0.5 D5/0.5 F#5/1 | F5/0.5 C#5/0.5 F5/1 E5/0.5 C5/0.5 E5/1 | B4/0.5 C#5/0.5 D5/0.5 E5/0.5 F#5/0.5 D5/0.5 F#5/0.5 B5/0.5 | A5/0.5 F#5/0.5 D5/0.5 F#5/0.5 A5/2';
const MK2 = `${MK} | ${MK}`;

// Toccata in D minor, BWV 565: the opening flourish in three octaves, the
// diminished chord and its resolution.
const TOCCATA = 'A5/0.25 G5/0.25 A5/3.5 | G5/0.25 F5/0.25 E5/0.25 D5/0.25 C#5/1 D5/2 | A4/0.25 G4/0.25 A4/3.5 | E4/0.5 F4/0.5 C#4/1 D4/2 | '
  + 'A3/0.25 G3/0.25 A3/3.5 | G3/0.25 F3/0.25 E3/0.25 D3/0.25 C#3/1 D3/2 | C#4/0.25 E4/0.25 G4/0.25 Bb4/3.25 | D4/0.25 F4/0.25 A4/0.25 D5/3.25';

export const SYNTH_PIECES = {
  mountain: {
    id: 'mountain', name: 'In the Hall of the Mountain King', source: 'Edvard Grieg, Peer Gynt, 1875', pd: 'Grieg died 1907',
    style: 'dark', bpm: 96, key: 11, minor: true, accel: 1.055, lift: 0, intro: 'i i',
    sections: {
      A: { chords: 'i II7-bII i bIII i II7-bII i bIII', melody: tune(MK2) },
      B: { chords: 'v VI7-bVI v bVII v VI7-bVI v bVII', melody: tune(MK2, 7) },
    },
    form: ['intro', 'A', 'B', 'A', 'B', 'A2', 'B', 'outro'],
  },
  toccata: {
    id: 'toccata', name: 'Toccata in D minor', source: 'BWV 565, attributed to J. S. Bach, before 1750', pd: 'Bach died 1750',
    style: 'dark', bpm: 92, key: 2, minor: true, lift: 0, intro: 'i V',
    sections: {
      A: { chords: 'i V7-i i V7-i i V7-i viio7 i', melody: tune(TOCCATA) },
    },
    form: ['A', 'B', 'A', 'solo', 'B', 'A2', 'outro'],
  },
};
export const SYNTH_PIECE_LIST = Object.values(SYNTH_PIECES);

export const SYNTH_BAND_INFO = { range: SYNTH_RANGE, sectionOf: SYNTH_SECTION_OF };

export class SynthComposer extends RetroComposer {
  constructor(opts) {
    super({ ...opts, styles: SYNTH_STYLES, pieces: SYNTH_PIECES, band: SYNTH_BAND_INFO, style: opts.style || 'outrun' });
  }
}

export function writeSynth(seed, style, bars = 64) {
  const c = new SynthComposer({ seed, style });
  return Array.from({ length: bars }, () => c.nextBar());
}
