// SPDX-License-Identifier: MIT
// The six machines of the Pop Machine, a path from Baroque figuration to
// modern pop. Each is a set of style traits only (tempo, beat, instruments,
// favourite chord loops, what is done to the riff); no melody, recording or
// arrangement of any record is used.
//
// lead: who plays the riff in each section ([main, ...doubles]).
// modes: what is done to the riff over each section's chords ('hold' keeps
// it while the chords change under it, 'move' moves it with the chords: by
// scale steps, as broken chords or in exact semitones, by the riff's kind).
// parts: accompaniment layers (src/retro/composer.js PART_FNS plus 'power').
// slow: one chord every two bars.

import { grid } from '../retro/composer.js';

const bass = (cells) => cells.map(([b, d, w]) => [b, d, w]);

export const POP_STYLES = {
  baroque: {
    name: 'BAROQUE POP', era: '1966', desc: 'Harpsichord riffs, strings and a walking bass: chamber pop, one step out of the concert hall',
    bpm: [96, 108], keys: [0, 2, 7, 9, 4], minor: 0.4,
    progs: ['pachelbel', 'circle', 'doowop', 'folia', 'andalusian', 'minorcircle'],
    riffs: ['prelude', 'cello', 'invention', 'canon', 'spring', 'fugue', 'mozart40', 'turca', 'motif'],
    lead: { intro: ['hpsi'], verse: ['hpsi'], build: ['hpsi', 'flute'], chorus: ['hpsi', 'str'], break: ['flute'], lift: ['hpsi', 'str', 'flute'], outro: ['hpsi'] },
    double: { str: 12, flute: 12 },
    modes: { verse: 'hold', build: 'move', chorus: 'move', break: 'hold', lift: 'move', outro: 'hold' },
    bassLo: 36,
    parts: [
      { fn: 'walk', i: 'pbass', min: 0.3 },
      { fn: 'comp', i: 'str', center: 64, n: 3, min: 0.45 },
      { fn: 'comp', i: 'organ', grid: [[0, 1.8], [2, 1.8]], center: 60, n: 3, min: 0.7, a: 'sus' },
      { fn: 'arp', i: 'bell', unit: 1, shape: 'up', lo: 76, span: 1, min: 0.85 },
    ],
    drums: {
      main: { kick: grid('x.......x.......', 0.7), snare: grid('....x.......x...', 0.55), tamb: grid('..x...x...x...x.', 0.5) },
      chorus: { kick: grid('x.....x.x.......', 0.75), snare: grid('....x.......x...', 0.65), tamb: grid('x.x.x.x.x.x.x.x.', 0.45) },
    },
    lift: [2, 1, 0], ending: ['hpsi', 'str', 'organ'], endBass: 'pbass',
  },
  moog: {
    name: 'MOOG POP', era: '1972', desc: 'A plucky staccato synth hammers out the riff over a bouncing bass: the first synth-pop hits',
    bpm: [120, 132], keys: [9, 4, 2, 7, 0], minor: 0.75,
    progs: ['andalusian', 'lift', 'minorcircle', 'mixo', 'doowop'],
    riffs: ['turca', 'elise', 'mountain', 'invention', 'bumblebee', 'toccata', 'motif', 'motif'],
    motifs: ['hook', 'pivot'],
    lead: { intro: ['moog'], verse: ['moog'], build: ['moog'], chorus: ['moog', 'lead'], break: ['bell'], lift: ['moog', 'lead'], outro: ['moog'] },
    double: { lead: 12 },
    modes: { verse: 'hold', build: 'move', chorus: 'move', break: 'hold', lift: 'move', outro: 'hold' },
    bassLo: 33,
    parts: [
      { fn: 'bass', i: 'mbass', grid: bass([[0, 0.4, 'R'], [0.5, 0.4, 'O'], [1, 0.4, 'R'], [1.5, 0.4, 'O'], [2, 0.4, 'R'], [2.5, 0.4, 'O'], [3, 0.4, '5'], [3.5, 0.4, 'O']]), a: 'sus' },
      { fn: 'comp', i: 'organ', grid: [[0.5, 0.35], [1.5, 0.35], [2.5, 0.35], [3.5, 0.35]], center: 62, n: 3, min: 0.4, a: 'sus' },
      { fn: 'comp', i: 'str', center: 66, n: 3, min: 0.8 },
    ],
    drums: {
      main: { kick: grid('x.......x.......', 0.8), snare: grid('....x.......x...', 0.7), hat: grid('x.x.x.x.x.x.x.x.', 0.4) },
      chorus: { kick: grid('x.....x.x.......', 0.85), snare: grid('....x.......x...', 0.75), hat: grid('x.x.x.x.x.x.x.x.', 0.45), tamb: grid('....x.......x...', 0.5) },
    },
    lift: [1, 2, 0], ending: ['moog', 'organ', 'str'], endBass: 'mbass',
  },
  tv: {
    name: 'TV DRIVE', era: '1982', desc: 'A sixteenth-note sequencer bass, gated toms and a riff that moves in parallel: an action-show opener',
    bpm: [116, 128], keys: [9, 4, 2, 11], minor: 0.9,
    progs: ['lift', 'epic', 'andalusian', 'minorcircle'],
    riffs: ['toccata', 'mountain', 'fugue', 'bumblebee', 'elise', 'mozart40', 'motif', 'motif'],
    motifs: ['pivot', 'hook'],
    lead: { intro: ['lead'], verse: ['lead'], build: ['lead'], chorus: ['lead', 'brass'], break: ['bell'], lift: ['lead', 'brass'], outro: ['lead'] },
    double: { brass: -12 },
    modes: { verse: 'hold', build: 'move', chorus: 'move', break: 'hold', lift: 'move', outro: 'hold' },
    preferMove: 'transpose',
    bassLo: 33,
    parts: [
      { fn: 'bass', i: 'bass', grid: bass([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75].map((b, k) => [b, 0.2, [2, 5, 10, 13].includes(k) ? 'O' : 'R'])), a: 'sus' },
      { fn: 'comp', i: 'pad', center: 60, n: 3, min: 0.35 },
      { fn: 'comp', i: 'stab', grid: [[0, 0.3], [0.75, 0.3], [1.5, 0.3]], center: 62, n: 3, min: 0.7, a: 'sus' },
      { fn: 'arp', i: 'arp', unit: 0.25, shape: 'updown', lo: 57, span: 2, min: 0.75, legato: 0.6 },
    ],
    drums: {
      main: { kick: grid('x.......x.x.....', 0.85), snare: grid('....x.......x...', 0.8), hat: grid('x.x.x.x.x.x.x.x.', 0.4) },
      chorus: { kick: grid('x...x...x...x...', 0.85), snare: grid('....x.......x...', 0.85), hat: grid('xxxxxxxxxxxxxxxx', 0.34) },
    },
    fill: 'toms',
    lift: [1, 2, 3], ending: ['pad', 'brass', 'lead'], endBass: 'bass',
  },
  anthem: {
    name: 'ANTHEM', era: '1986', desc: 'Power-chord guitar, a huge snare and a slow soaring riff that ends a whole step higher',
    bpm: [100, 112], keys: [7, 2, 9, 4, 0], minor: 0.3, slow: true,
    progs: ['mixo', 'axis', 'sensitive', 'doowop', 'lift', 'epic'],
    riffs: ['canon', 'spring', 'mountain', 'mozart40', 'fugue', 'invention', 'motif', 'motif'],
    motifs: ['anthem'],
    lead: { intro: ['lead'], verse: ['lead'], build: ['lead'], chorus: ['saw', 'brass'], break: ['bell'], lift: ['saw', 'brass', 'lead'], outro: ['lead'] },
    double: { brass: -12, lead: 12 },
    modes: { verse: 'hold', build: 'move', chorus: 'move', break: 'hold', lift: 'move', outro: 'hold' },
    bassLo: 33,
    parts: [
      { fn: 'bass', i: 'pbass', grid: bass([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((b) => [b, 0.45, 'R'])), a: 'sus' },
      { fn: 'power', i: 'gtr', min: 0.4 },
      { fn: 'comp', i: 'pad', center: 64, n: 3 },
      { fn: 'comp', i: 'str', center: 70, n: 3, min: 0.8 },
    ],
    drums: {
      main: { kick: grid('x.......x.......', 0.85), snare: grid('....x.......x...', 0.9), hat: grid('x.x.x.x.x.x.x.x.', 0.38) },
      chorus: { kick: grid('x.....x.x.......', 0.9), snare: grid('....x.......x...', 0.95), hat: grid('x.x.x.x.x.x.x.x.', 0.42), crash: grid('x...............', 0.5) },
    },
    fill: 'toms',
    lift: [2, 2, 1], ending: ['gtr', 'pad', 'brass'], endBass: 'pbass',
  },
  euro: {
    name: 'EURODANCE', era: '1994', desc: 'Four on the floor, an offbeat bass, piano stabs and a supersaw riff in a minor loop',
    bpm: [132, 140], keys: [9, 4, 7, 2], minor: 0.85,
    progs: ['epic', 'minorcircle', 'andalusian', 'lift', 'sensitive'],
    riffs: ['elise', 'turca', 'mozart40', 'toccata', 'mountain', 'fugue', 'motif', 'motif'],
    motifs: ['hook', 'pivot'],
    lead: { intro: ['saw'], verse: ['piano'], build: ['saw'], chorus: ['saw', 'pluck'], break: ['piano'], lift: ['saw', 'pluck'], outro: ['saw'] },
    double: { pluck: 12 },
    modes: { verse: 'hold', build: 'move', chorus: 'move', break: 'hold', lift: 'move', outro: 'hold' },
    bassLo: 33,
    parts: [
      { fn: 'bass', i: 'bass', grid: bass([[0.5, 0.4, 'R'], [1.5, 0.4, 'R'], [2.5, 0.4, 'R'], [3.5, 0.4, 'R']]), a: 'sus' },
      { fn: 'comp', i: 'piano', grid: [[0, 0.4], [0.75, 0.4], [1.5, 0.4], [2.5, 0.4], [3, 0.4]], center: 66, n: 3, min: 0.55, out: ['verse'], a: 'sus' },
      { fn: 'comp', i: 'pad', center: 62, n: 3, min: 0.3 },
      { fn: 'comp', i: 'vox', center: 66, n: 3, min: 0.85 },
    ],
    drums: {
      main: { kick: grid('x...x...x...x...', 0.9), clap: grid('....x.......x...', 0.6), hat: grid('..o...o...o...o.', 0.4) },
      chorus: { kick: grid('x...x...x...x...', 0.95), clap: grid('....x.......x...', 0.7), snare: grid('....x.......x...', 0.5), hat: grid('x.o.x.o.x.o.x.o.', 0.4) },
    },
    lift: [1, 2], ending: ['saw', 'pad', 'piano'], endBass: 'bass',
  },
  edm: {
    name: 'EDM POP', era: '2015', desc: 'A pumping pad, a build with a snare roll and a drop where a pluck plays the riff over four chords',
    bpm: [120, 128], keys: [0, 5, 7, 2, 9], minor: 0.35,
    progs: ['axis', 'sensitive', 'royal', 'epic', 'minoriv', 'lift'],
    riffs: ['prelude', 'cello', 'canon', 'spring', 'elise', 'invention', 'motif', 'motif'],
    motifs: ['pivot', 'hook'],
    lead: { intro: ['pluck'], verse: ['bell'], build: ['pluck'], chorus: ['pluck', 'saw'], break: ['bell'], lift: ['pluck', 'saw'], outro: ['pluck'] },
    double: { saw: 12 },
    modes: { verse: 'hold', build: 'move', chorus: 'move', break: 'hold', lift: 'move', outro: 'hold' },
    bassLo: 33,
    parts: [
      { fn: 'bass', i: 'bass', grid: bass([[0, 0.9, 'R'], [1.5, 0.4, 'R'], [2, 0.9, 'R'], [3.5, 0.4, 'O']]), a: 'sus', min: 0.3 },
      { fn: 'comp', i: 'pump', grid: [[0.1, 0.85], [1.1, 0.85], [2.1, 0.85], [3.1, 0.85]], center: 64, n: 4, a: 'sus' },
      { fn: 'comp', i: 'piano', grid: [[0, 1.5], [1.5, 1], [2.5, 1.5]], center: 60, n: 3, in: ['verse', 'break'], a: 'sus' },
      { fn: 'comp', i: 'vox', center: 67, n: 3, min: 0.85 },
    ],
    drums: {
      main: { kick: grid('x.......x.......', 0.8), clap: grid('....x.......x...', 0.55), hat: grid('..x...x...x...x.', 0.35) },
      chorus: { kick: grid('x...x...x...x...', 0.95), clap: grid('....x.......x...', 0.75), hat: grid('..o...o...o...o.', 0.4) },
    },
    lift: [0, 1, 2], ending: ['pump', 'piano', 'pluck'], endBass: 'bass',
  },
};

export const POP_STYLE_IDS = Object.keys(POP_STYLES);
