// SPDX-License-Identifier: MIT
// APOLLO on the Space Age page: music around Apollo 11 (July 1969) and
// Apollo 13 (April 1970). Almost everything people played in 1969 is still
// protected, and so is every recording, so this uses only:
// - public-domain works tied to the missions: the New World Symphony
//   (Armstrong took a tape of it on Apollo 11), Also sprach Zarathustra (the
//   Apollo 13 crew opened their TV broadcast with it, minutes before the
//   accident) and The Blue Danube (the docking waltz of the 1968 film that
//   made both of them "space music"). Notes written out from the free scores.
// - original tunes written here in the 1969 style, each named after a moment
//   of the two missions.
// The MOON SHOT style remixes these themes with a Moog lead over a 1969 beat.

import { tune } from './tunes.js';
import { THEMES } from './themes.js';

const NAMES = [
  ['Lunar', 'Saturn', 'Eagle', 'Columbia', 'Odyssey', 'Aquarius', 'Tranquility', 'Orbital', 'Silver', 'Translunar', 'Midnight', 'Telemetry'],
  ['Countdown', 'Module', 'Boogie', 'Rendezvous', 'Descent', 'Splashdown', 'Burn', 'Signal', 'Approach', 'Highway', 'Return', 'Footprint'],
];

// ---- the tunes ------------------------------------------------------------------
// Each: 8-bar A theme (and B when written), chords as Roman numerals.

const LARGO = THEMES.find((t) => t.id === 'largo');

const ZARATHUSTRA = {
  id: 'zarathustra', name: 'Zarathustra', by: 'R. Strauss', key: 0, minor: false, beats: 4,
  source: 'Richard Strauss, Also sprach Zarathustra, Op. 30, introduction (1896)',
  chords: 'I I I-i i i i i-I I',
  melody: 'C4/2 G4/2 | C5/4 | E5/2 Eb5/2 | Eb5/2 r/2 | C4/2 G4/2 | C5/4 | Eb5/2 E5/2 | E5/2 r/2',
  // The third call climbing to the top C (from the score), then a four-bar
  // close written here.
  bChords: 'I I-IV I V-I I IV V7 I',
  bMelody: 'C4/2 G4/2 | C5/2 E5/1 F5/1 | G5/4 | A5/1 B5/1 C6/2 | C6/4 | A5/2 F5/2 | G5/2 D5/2 | C5/4',
};

// The Blue Danube, the first waltz theme in D (3/4): D major, the two A7
// calls, D major again.
const DANUBE = {
  id: 'danube', name: 'Blue Danube', by: 'J. Strauss II', key: 2, minor: false, beats: 3,
  source: 'Johann Strauss II, An der schönen blauen Donau, Op. 314 (1867)',
  chords: 'I I I I V7 V7 V7 V7 V7 V7 V7 V7 I I I I',
  melody: 'D4/1 F#4/1 A4/1 | A4/3 | r/1 A5/1 A5/1 | r/1 F#5/1 F#5/1 | C#4/1 E4/1 B4/1 | B4/3 | r/1 B5/1 B5/1 | r/1 G5/1 G5/1 | '
    + 'C#4/1 E4/1 B4/1 | B4/3 | r/1 B5/1 B5/1 | r/1 G5/1 G5/1 | D4/1 F#4/1 A4/1 | D5/3 | r/1 D6/1 D6/1 | r/1 A5/1 A5/1',
};

// Originals, in the style of 1969.
const TRANQUILITY = {
  id: 'tranquility', name: 'Tranquility Base', by: 'Ranger', key: 2, minor: false, beats: 4,
  chords: 'Imaj7 iii7 IVmaj7 iv6 Imaj7 bVImaj7 ii7-V7 Imaj7',
  melody: 'F#5/3 E5/0.5 D5/0.5 | C#5/2 A4/2 | B4/1.5 C#5/0.5 D5/1 F#5/1 | E5/4 | F#5/2 A5/1.5 F#5/0.5 | F5/3 D5/1 | E5/2 G5/1 C#5/1 | D5/4',
  bChords: 'bVImaj7 bVImaj7 bVIImaj7 bVIImaj7 IVmaj7 iv6 iii7-VI7 ii7-V7',
  bMelody: 'D5/1.5 F5/0.5 A5/2 | G5/1 F5/1 D5/2 | E5/1.5 G5/0.5 B5/2 | A5/1 G5/1 E5/2 | F#5/1.5 D5/0.5 B4/2 | Bb4/1.5 D5/0.5 E5/2 | F#5/2 D#5/2 | E5/2 C#5/1 A4/1',
};

const COUNTDOWN = {
  id: 'countdown', name: 'Countdown', by: 'Ranger', key: 9, minor: true, beats: 4,
  chords: 'i bVII bVI V i bVII bVI-V i',
  melody: 'A4/0.5 E5/0.5 A5/1 G5/0.5 E5/0.5 D5/1 | D5/0.5 B4/0.5 G4/1 B4/0.5 D5/0.5 G5/1 | F5/0.5 C5/0.5 A4/1 C5/0.5 F5/0.5 A5/1 | G#5/1.5 E5/0.5 B4/2 | '
    + 'A4/0.5 E5/0.5 A5/1 G5/0.5 E5/0.5 D5/1 | D5/0.5 B4/0.5 G4/1 B4/0.5 D5/0.5 G5/1 | A5/1 F5/1 G#5/1 B5/1 | A5/3 r/1',
  // The bridge counts down: eight falling steps, then the engines.
  bChords: 'bIII bIII bVII bVII iv iv V V',
  bMelody: 'E5/1 E5/0.5 D5/0.5 C5/1 G4/1 | C5/0.5 D5/0.5 E5/0.5 G5/0.5 E5/2 | D5/1 D5/0.5 C5/0.5 B4/1 G4/1 | B4/0.5 C5/0.5 D5/0.5 G5/0.5 D5/2 | '
    + 'F5/1 E5/1 D5/1 C5/1 | D5/1 C5/1 B4/1 A4/1 | G#4/1 B4/1 E5/1 G#5/1 | B5/2 r/2',
};

const AQUARIUS = {
  id: 'aquarius', name: 'Aquarius Lifeboat', by: 'Ranger', key: 4, minor: true, beats: 4,
  chords: 'i bIImaj7 i bIImaj7 bVImaj7 iv6 V+ V7',
  melody: 'B4/2 E5/1 F#5/1 | G5/2 F5/1 E5/1 | B4/1 E5/1 G5/1 B5/1 | A5/3 E5/1 | G5/1.5 E5/0.5 B4/2 | C5/1.5 E5/0.5 F#5/2 | G5/2 D#5/2 | F#5/4',
  // The way home, in the relative major.
  bChords: 'bIIImaj7 bIIImaj7 bVImaj7 bVImaj7 bVII7 bVII7 V+ V7',
  bMelody: 'D5/1 G5/1 B5/2 | A5/1 G5/1 F#5/2 | E5/1 G5/1 B5/2 | A5/1 G5/1 E5/2 | F#5/1 A5/1 C6/2 | B5/1 A5/1 F#5/1 D5/1 | D#5/2 G5/2 | F#5/2 A5/1 D#5/1',
};

const SPLASHDOWN = {
  id: 'splashdown', name: 'Splashdown', by: 'Ranger', key: 5, minor: false, beats: 4,
  chords: 'I6 vi7 ii7 V7 I6 vi7 ii7-V7 I6',
  melody: 'C5/1 F5/1 A5/1.5 G5/0.5 | F5/1 D5/1 r/0.5 C5/0.5 D5/1 | Bb4/1 D5/1 F5/1.5 E5/0.5 | E5/2 C5/1 r/1 | '
    + 'C5/1 F5/1 A5/1.5 G5/0.5 | F5/1 A5/1 r/0.5 C6/0.5 A5/1 | G5/1 Bb5/1 E5/1 G5/1 | F5/3 r/1',
  bChords: 'IV6 IV6 I6 I6 II7 II7 ii7 V7',
  bMelody: 'D5/0.5 F5/0.5 G5/1 F5/1 D5/1 | Bb4/1 D5/1 G5/2 | C5/0.5 F5/0.5 A5/1 G5/1 F5/1 | D5/1 F5/1 C5/2 | '
    + 'B4/0.5 D5/0.5 F5/1 G5/1 B5/1 | A5/1 G5/1 F5/1 D5/1 | Bb5/1 A5/1 G5/1 F5/1 | E5/1 G5/1 C6/1 Bb5/1',
};

// The MOON SHOT style's themes: the public-domain ones and the originals.
export const APOLLO_THEMES = [LARGO, ZARATHUSTRA, TRANQUILITY, COUNTDOWN, AQUARIUS, SPLASHDOWN].map((t) => ({
  id: t.id, name: t.name, by: t.by, source: t.source || 'Original, written for Ranger', key: t.key, minor: t.minor, beats: t.beats, chords: t.chords, melody: t.melody,
}));

// ---- the style ------------------------------------------------------------------

export const APOLLO_STYLE = {
  name: 'MOON SHOT 1969', tab: 'apollo',
  desc: 'A Moog lead over a 1969 beat, strings, organ and muted brass, with radio beeps: a new mix of a mission theme every time',
  bpm: [112, 124], cells: 'lounge', keys: [0, 2, 9, 7, 5], minor: 0.4, names: NAMES,
  themes: APOLLO_THEMES,
  progs: {
    A: ['I vi IV V I vi IV V'],
    B: ['IV IV V V iii iii vi V', 'vi vi IV IV ii ii V V'],
    intro: ['I IV'],
  },
  minorProgs: {
    A: ['i bVII bVI V i bVII bVI V'],
    B: ['bVI bVI bVII bVII i i V V', 'iv iv bVI bVI bII bII V V'],
    intro: ['i bVII'],
  },
  melodyLo: 60, melodyHi: 86,
  lead: { A: ['moog'], B: ['vib', 'moog'], A2: ['moog', 'str'], solo: ['moog', 'org'] },
  leadArt: { org: 'stac' },
  parts: [
    { fn: 'bass', i: 'cb', grid: [[0, 1, 'R'], [1.5, 0.5, '5'], [2, 1, 'R'], [3, 0.5, 'O'], [3.5, 0.5, '5']] },
    { fn: 'comp', i: 'org', pat: 'offbeat', a: 'stac', center: 62, n: 3, min: 0.3 },
    { fn: 'pad', players: ['str', 'vla'], low: 'vc', min: 0.5, center: 70 },
    { fn: 'brass', top: 'tp', low: 'tb', pat: 'stabs', p: 0.6, min: 0.6, out: ['solo'] },
    { fn: 'arp', i: 'vib', unit: 0.5, shape: 'up', lo: 57, span: 2, min: 0.62, out: ['solo'] },
    { fn: 'gliss', i: 'hrp', every: 8, min: 0.6 },
    { fn: 'fx', i: 'beep', every: 8, at: 0, p: 0.7, b: 0, d: 0.25 },
    { fn: 'fx', i: 'beep', every: 8, at: 7, p: 0.6, b: 3.5, d: 0.25, a: 'fall' },
  ],
  // The tune on top: the beat and the organ stay under the Moog.
  mix: { kick: 0.55, tap: 0.75, hh: 0.8, org: 0.6, cb: 0.85, vib: 0.8 },
  drums: 'apollo', fill: 'timp', crash: 'cym', lift: [0, 1, 2],
  ending: ['moog', 'str', 'vla', 'vc', 'cym'],
};

// ---- the pieces -----------------------------------------------------------------

function piece(t, extra) {
  return {
    id: t.id === 'largo' ? 'newworld' : t.id, tab: 'apollo', beats: t.beats, key: t.key, minor: t.minor,
    sections: {
      A: { chords: t.chords, melody: tune(t.melody, extra.shift || 0) },
      ...(t.bMelody ? { B: { chords: t.bChords, melody: tune(t.bMelody, extra.shift || 0) } } : {}),
    },
    ...extra,
    key: (t.key + (extra.shift || 0) + 120) % 12,
  };
}

export const APOLLO_PIECES = [
  piece(LARGO, {
    name: 'New World Largo', mission: 'Apollo 11', pd: 'Dvořák died 1904',
    source: 'Apollo 11, July 1969: Neil Armstrong took a tape of Dvořák\'s New World Symphony to the Moon. The Largo on theremin.',
    style: 'orbit', shift: 13, bpm: 64, intro: 'Imaj7 bVImaj7', bChords: 'IVmaj7 IVmaj7 Imaj7 Imaj7 bVImaj7 bVImaj7 V+ V+', lift: 0,
    form: ['intro', 'A', 'B', 'A', 'solo', 'A2', 'outro'],
  }),
  piece(ZARATHUSTRA, {
    name: 'Zarathustra 1970', mission: 'Apollo 13', pd: 'R. Strauss died 1949',
    source: 'Apollo 13, April 1970: the crew opened their TV broadcast with Also sprach Zarathustra, minutes before "Houston, we\'ve had a problem". Moog and beat.',
    style: 'apollo', bpm: 104, intro: 'I I', lift: 0,
    form: ['intro', 'A', 'B', 'A', 'solo', 'B', 'outro'],
  }),
  piece(DANUBE, {
    name: 'Blue Danube Docking', mission: '1968', pd: 'J. Strauss II died 1899',
    source: 'The waltz that docked a spaceship in the 1968 film that made it space music, a year before Apollo 11. As a moon waltz.',
    style: 'moon', bpm: 156, intro: 'I V7', bChords: 'IV IV I I V7 V7 I I', lift: 0, introBars: 4,
    form: ['intro', 'A', 'B', 'A', 'B', 'A2', 'outro'],
  }),
  piece(COUNTDOWN, {
    name: 'Countdown', mission: 'Apollo 11', tag: 'Original · 1969 style',
    source: 'Saturn V on the pad, 16 July 1969. A Moog riff over a 1969 beat; the bridge counts down.',
    style: 'apollo', bpm: 122, intro: 'i bVII', lift: 2,
    form: ['intro', 'A', 'A', 'B', 'A', 'solo', 'B', 'A2', 'outro'],
  }),
  piece(TRANQUILITY, {
    name: 'Tranquility Base', mission: 'Apollo 11', tag: 'Original · 1969 style',
    source: 'The landing, 20 July 1969. A slow theremin tune over strings and harp.',
    style: 'orbit', bpm: 68, intro: 'Imaj7 bVImaj7', lift: 0,
    form: ['intro', 'A', 'B', 'A', 'solo', 'A2', 'outro'],
  }),
  piece(AQUARIUS, {
    name: 'Aquarius Lifeboat', mission: 'Apollo 13', tag: 'Original · 1970 style',
    source: 'April 1970: the lunar module Aquarius carries the crew home. Minor and tense, then the way home in major.',
    style: 'orbit', bpm: 72, intro: 'i bIImaj7', lift: 0,
    form: ['intro', 'A', 'B', 'A', 'solo', 'B', 'A2', 'outro'],
  }),
  piece(SPLASHDOWN, {
    name: 'Splashdown', mission: 'Apollo 13', tag: 'Original · 1970 style',
    source: '17 April 1970, the Pacific: everyone home. A bright cha-cha with organ and muted brass.',
    style: 'bachelor', bpm: 124, intro: 'ii7 V7', lift: 1,
    form: ['intro', 'A', 'A', 'B', 'A', 'solo', 'B', 'A2', 'outro'],
  }),
];
