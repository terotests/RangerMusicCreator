// SPDX-License-Identifier: MIT
// RADIO 1969 on the Space Age page: what a radio played while Apollo flew.
// The hits of 1969–70 are all still protected, so every style here plays
// tunes written for this repo in the manner of the time: only the habits of
// each style are used (fuzz guitar riffs, Motown tambourine and bass, the
// 12-bar shuffle, the organ trio, sunshine-pop harmony), never a melody,
// recording or arrangement by anyone else. Each style remixes its own
// themes, the way MOON SHOT 1969 remixes the mission themes.

const NAMES = [
  ['Silver', 'Midnight', 'Sunday', 'Highway', 'Satellite', 'Velvet', 'Electric', 'Moonlight', 'Summer', 'Gemini', 'Telstar', 'Starlight'],
  ['Signal', 'Shuffle', 'Groove', 'Strut', 'Drive', 'Avenue', 'Fever', 'Ride', 'Serenade', 'Station', 'Boogie', 'Dream'],
];

const T = (id, name, key, minor, chords, melody) => ({ id, name, by: 'Ranger', source: 'Original, written for Ranger in the style of 1969', key, minor, beats: 4, chords, melody });

// ---- rock ----------------------------------------------------------------------
const ROCK_THEMES = [
  T('highway', 'Highway Signal', 4, false, 'I bVII-IV I bVII-IV I bVII-IV bVI-bVII I',
    'E4/0.5 G4/0.5 A4/0.5 B4/1 D5/0.5 B4/1 | D5/0.5 B4/0.5 A4/1 C#5/0.5 A4/0.5 E4/1 | E4/0.5 G4/0.5 A4/0.5 B4/1 D5/0.5 E5/1 | D5/1 B4/0.5 A4/0.5 A4/2 | '
    + 'G5/0.5 E5/0.5 D5/0.5 E5/1 B4/0.5 D5/1 | D5/0.5 E5/0.5 F#5/1 E5/0.5 C#5/0.5 A4/1 | C5/1 E5/1 D5/1 F#5/1 | E5/3 r/1'),
  T('fuzz', 'Fuzz Rendezvous', 9, true, 'i iv i bVII i iv bVI-bVII i',
    'A4/0.5 C5/0.5 D5/0.5 E5/1 G5/0.5 E5/1 | F5/0.5 E5/0.5 D5/1 A4/0.5 C5/0.5 D5/1 | E5/1 C5/0.5 A4/0.5 G4/0.5 A4/1.5 | B4/0.5 D5/0.5 G5/1 F5/0.5 D5/0.5 B4/1 | '
    + 'A4/0.5 C5/0.5 D5/0.5 E5/1 G5/0.5 A5/1 | A5/0.5 G5/0.5 F5/1 D5/0.5 F5/0.5 A5/1 | C6/1 A5/1 B5/1 G5/1 | A5/3 r/1'),
];

// ---- soul ----------------------------------------------------------------------
const SOUL_THEMES = [
  T('comehome', 'Come Home Soon', 0, false, 'I vi7 IV V I vi7 IV-V I',
    'r/0.5 E5/0.5 G5/0.5 E5/0.5 G5/1 A5/1 | G5/1 E5/0.5 C5/0.5 D5/1 E5/1 | F5/0.5 F5/0.5 A5/0.5 F5/0.5 C5/1 D5/1 | D5/1.5 B4/0.5 D5/2 | '
    + 'r/0.5 E5/0.5 G5/0.5 E5/0.5 G5/1 C6/1 | A5/1 G5/0.5 E5/0.5 G5/1 A5/1 | A5/1 F5/1 G5/0.5 F5/0.5 D5/1 | C5/3 r/1'),
  T('missiongroove', 'Mission Groove', 10, false, 'I7 I7 IV7 IV7 I7 I7 V7-IV7 I7',
    'Bb4/0.5 Db5/0.5 D5/0.5 F5/1 Ab5/0.5 F5/1 | r/1 F5/0.5 Ab5/0.5 F5/0.5 D5/0.5 Bb4/1 | Eb5/0.5 G5/0.5 Bb5/0.5 Db6/0.5 Bb5/1 G5/1 | Ab5/1 G5/0.5 F5/0.5 Eb5/2 | '
    + 'Bb4/0.5 Db5/0.5 D5/0.5 F5/1 Ab5/0.5 Bb5/1 | Ab5/0.5 F5/0.5 D5/1 F5/1 r/1 | A5/1 C6/1 G5/1 Eb5/1 | Bb4/3 r/1'),
];

// ---- blues (12 bars) ---------------------------------------------------------------
const BLUES_THEMES = [
  T('telemetry', 'Telemetry Blues', 9, false, 'I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7',
    'r/0.5 C5/0.5 C#5/0.5 E5/1 A4/1.5 | C5/0.5 A4/0.5 F#4/1 A4/2 | r/0.5 E5/0.5 G5/0.5 E5/0.5 C#5/1 A4/1 | A4/2 r/2 | '
    + 'r/0.5 F#5/0.5 A5/0.5 F#5/1 D5/1.5 | C5/0.5 A4/0.5 F#4/1 A4/2 | r/0.5 E5/0.5 G5/0.5 E5/0.5 C#5/1 A4/1 | A4/2 r/2 | '
    + 'B4/0.5 D5/0.5 E5/0.5 G#5/0.5 B5/1 G#5/1 | A5/1 F#5/0.5 D5/0.5 C5/1 A4/1 | C5/0.5 C#5/0.5 E5/1 A4/1 r/1 | B4/1 G#4/1 E4/2'),
  T('slowburn', 'Slow Burn', 4, true, 'i7 iv7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7',
    'B4/1 D5/0.5 E5/0.5 G5/1.5 E5/0.5 | A5/1.5 G5/0.5 E5/2 | G5/0.5 E5/0.5 D5/0.5 B4/0.5 D5/1 E5/1 | E5/3 r/1 | '
    + 'C5/1 E5/0.5 G5/0.5 A5/1.5 G5/0.5 | E5/1.5 D5/0.5 C5/2 | G5/0.5 E5/0.5 D5/0.5 B4/0.5 D5/1 E5/1 | E5/3 r/1 | '
    + 'Bb5/1 G5/0.5 E5/0.5 C5/2 | A5/1 F#5/0.5 D#5/0.5 B4/2 | E5/0.5 G5/0.5 A5/0.5 Bb5/0.5 B5/2 | A5/1 F#5/1 D#5/2'),
];

// ---- soul jazz ---------------------------------------------------------------------
const JAZZ_THEMES = [
  T('eaglestrut', 'Eagle Strut', 5, false, 'ii7 V7 Imaj7 VI7 ii7 V7 iii7-VI7 ii7-V7',
    'D5/0.5 F5/0.5 Bb5/0.5 A5/0.5 G5/1 D5/1 | E5/0.5 G5/0.5 Bb5/1 A5/0.5 G5/0.5 E5/1 | F5/1.5 E5/0.5 C5/1 A4/1 | F#5/1 A5/0.5 C6/0.5 A5/1 F#5/1 | '
    + 'D5/0.5 F5/0.5 Bb5/0.5 A5/0.5 G5/1 D5/1 | E5/0.5 G5/0.5 Bb5/0.5 D6/0.5 C6/2 | C6/1 A5/1 F#5/1 A5/1 | G5/1 Bb5/0.5 G5/0.5 E5/1 C5/1'),
  T('lateedition', 'Late Edition', 0, true, 'i7 i7 iv7 iv7 i7 bVI7 V7 i7',
    'G4/0.5 Bb4/0.5 C5/0.5 Eb5/0.5 G5/1 F5/1 | Eb5/1 C5/0.5 Bb4/0.5 C5/2 | Ab4/0.5 C5/0.5 Eb5/0.5 F5/0.5 Ab5/1 G5/1 | F5/1 Eb5/0.5 C5/0.5 F5/2 | '
    + 'G5/0.5 Bb5/0.5 G5/0.5 F5/0.5 Eb5/1 C5/1 | Eb5/1 Gb5/1 F5/0.5 Eb5/0.5 C5/1 | B4/0.5 D5/0.5 F5/0.5 Ab5/0.5 G5/1 F5/1 | Eb5/1 D5/0.5 B4/0.5 C5/2'),
];

// ---- sunshine pop ------------------------------------------------------------------
const POP_THEMES = [
  T('silversunday', 'Silver Sunday', 7, false, 'I iii7 IV iv6 I vi7 ii7-V7 I',
    'B4/1 D5/1 G5/1.5 F#5/0.5 | F#5/1 D5/1 B4/2 | C5/1 E5/1 G5/1.5 E5/0.5 | Eb5/2 D5/2 | '
    + 'B4/1 D5/1 G5/1 B5/1 | B5/1.5 A5/0.5 G5/1 E5/1 | A5/1 C6/1 F#5/1 A5/1 | G5/3 r/1'),
  T('flowerorbit', 'Flower Orbit', 2, false, 'I IV I IV vi IV ii7 V7',
    'A4/0.5 D5/0.5 F#5/0.5 A5/0.5 A5/1 F#5/1 | G5/0.5 F#5/0.5 E5/0.5 D5/0.5 B4/2 | A4/0.5 D5/0.5 F#5/0.5 A5/0.5 B5/1 A5/1 | G5/1.5 E5/0.5 D5/2 | '
    + 'F#5/1 D5/0.5 F#5/0.5 B5/2 | B5/1 A5/0.5 G5/0.5 D5/2 | E5/1 G5/1 B5/1 A5/1 | G5/1 E5/1 C#5/1 A4/1'),
];

export const RADIO_THEMES = [...ROCK_THEMES, ...SOUL_THEMES, ...BLUES_THEMES, ...JAZZ_THEMES, ...POP_THEMES];

// ---- the styles ----------------------------------------------------------------------

// The beat sits under the tune (measured per section: drums and bass were the
// loudest part before this).
const KIT = { kick: 0.6, snr: 0.62, hh: 0.7, ride: 0.7, tamb: 0.8, cb: 0.8 };
const COMMON = { tab: 'radio', names: NAMES, cells: 'lounge', ending: ['str', 'vla', 'vc', 'cym'] };

export const RADIO_STYLES = {
  rock69: {
    ...COMMON,
    name: 'ROCK 1969', desc: 'Fuzz guitar riffs, a driving bass, organ and a hard backbeat',
    bpm: [118, 132], keys: [4, 9, 2, 7], minor: 0.5, themes: ROCK_THEMES,
    progs: { A: ['I bVII IV I I bVII IV I'], B: ['IV IV I I bVII bVII V V'], intro: ['I bVII'] },
    minorProgs: { A: ['i bVII bVI bVII i bVII bVI V'], B: ['iv iv i i bVI bVI V V'], intro: ['i bVII'] },
    melodyLo: 60, melodyHi: 86,
    lead: { A: ['gtr'], B: ['org', 'gtr'], A2: ['gtr'], solo: ['gtr', 'org'] },
    leadArt: { gtr: 'sus', org: 'sus' },
    parts: [
      { fn: 'bass', i: 'cb', pat: 'drive8' },
      { fn: 'comp', i: 'gtr', grid: [[0, 0.4], [0.5, 0.4], [1, 0.4], [1.5, 0.4], [2, 0.4], [2.5, 0.4], [3, 0.4], [3.5, 0.4]], a: 'stac', center: 52, n: 2, out: ['solo'] },
      { fn: 'comp', i: 'org', a: 'sus', center: 62, n: 3, min: 0.45 },
      { fn: 'pad', players: ['str', 'vla'], low: 'vc', min: 0.8, center: 70 },
    ],
    drums: 'rock69', fill: 'snare', crash: 'cym', lift: [0, 2],
    mix: { ...KIT, org: 0.6 },
    ending: ['gtr', 'org', 'cym'],
  },
  soul69: {
    ...COMMON,
    name: 'SOUL 1969', desc: 'Detroit and Memphis: tambourine on the backbeat, a busy bass, horn stabs, strings and piano',
    bpm: [104, 118], keys: [0, 10, 3, 5], minor: 0, themes: SOUL_THEMES,
    progs: { A: ['I vi7 IV V I vi7 IV V'], B: ['IV IV iii7 vi7 ii7 ii7 V7 V7', 'IV7 IV7 I7 I7 V7 IV7 I7 V7'], intro: ['I IV'] },
    melodyLo: 62, melodyHi: 86,
    lead: { A: ['org'], B: ['str', 'vib'], A2: ['tp', 'org'], solo: ['gtr', 'org'] },
    leadArt: { tp: 'vib', org: 'sus', gtr: 'vib' },
    parts: [
      { fn: 'bass', i: 'cb', grid: [[0, 0.75, 'R'], [0.75, 0.25, 'R'], [1.5, 0.5, '5'], [2, 0.75, 'O'], [2.75, 0.25, '5'], [3.5, 0.5, 'R']] },
      { fn: 'comp', i: 'pno', pat: 'offbeat', a: 'hit', center: 64, n: 3 },
      { fn: 'comp', i: 'gtr', grid: [[1, 0.25], [3, 0.25]], a: 'soft', center: 66, n: 3, min: 0.3 },
      { fn: 'brass', top: 'tp', low: 'tb', pat: 'stabs', p: 0.7, min: 0.45, center: 62 },
      { fn: 'pad', players: ['str', 'vla'], low: 'vc', min: 0.5, center: 72 },
      { fn: 'sparkle', i: 'glk', p: 0.2, min: 0.7 },
    ],
    drums: 'soul69', fill: 'snare', crash: 'cym', lift: [1, 2],
    mix: { ...KIT, kick: 0.5, snr: 0.55, cb: 0.7, pno: 0.7, gtr: 0.8 },
    ending: ['vib', 'str', 'vla', 'tp', 'tb', 'cym'],
  },
  blues69: {
    ...COMMON,
    name: 'BLUES SHUFFLE', desc: 'The 12-bar shuffle: a crunchy guitar, organ and a swinging backbeat',
    bpm: [96, 112], keys: [9, 4, 7, 2], minor: 0.4, swing: 0.66, themes: BLUES_THEMES,
    progs: { A: ['I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7'], B: ['I7 IV7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 V7 I7 V7'], intro: ['V7 IV7'] },
    minorProgs: { A: ['i7 iv7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7'], B: ['i7 iv7 i7 i7 iv7 iv7 i7 i7 bVI7 V7 i7 V7'], intro: ['bVI7 V7'] },
    melodyLo: 57, melodyHi: 86,
    lead: { A: ['gtr'], B: ['org', 'gtr'], A2: ['gtr'], solo: ['gtr', 'org'] },
    leadArt: { gtr: 'vib', org: 'sus' },
    parts: [
      { fn: 'bass', i: 'cb', grid: [[0, 0.5, 'R'], [0.5, 0.5, 'R'], [1, 0.5, '5'], [1.5, 0.5, '5'], [2, 0.5, 'O'], [2.5, 0.5, 'O'], [3, 0.5, '5'], [3.5, 0.5, '5']] },
      { fn: 'comp', i: 'org', a: 'soft', center: 60, n: 3 },
      { fn: 'comp', i: 'pno', grid: [[0.5, 0.4], [1.5, 0.4], [2.5, 0.4], [3.5, 0.4]], a: 'hit', center: 68, n: 3, min: 0.4 },
      { fn: 'brass', top: 'tp', low: 'tb', pat: 'push', p: 0.5, min: 0.75, out: ['solo'] },
    ],
    drums: 'blues69', fill: 'snare', crash: 'cym', lift: [0],
    mix: { ...KIT, org: 0.65, pno: 0.7 },
    ending: ['gtr', 'org', 'pno', 'cym'],
  },
  jazz69: {
    ...COMMON,
    name: 'SOUL JAZZ', desc: 'The organ trio: Hammond, vibes and guitar over a walking bass and the ride cymbal',
    bpm: [126, 150], keys: [5, 10, 0, 3], minor: 0.4, swing: 0.64, themes: JAZZ_THEMES,
    progs: { A: ['ii7 V7 Imaj7 VI7 ii7 V7 Imaj7 V7'], B: ['iv7 bVII7 Imaj7 Imaj7 ii7 V7 iii7-VI7 ii7-V7'], intro: ['ii7 V7'] },
    minorProgs: { A: ['i7 i7 iv7 iv7 i7 bVI7 V7 i7'], B: ['bVI7 bVI7 V7 V7 i7 iv7 bVI7 V7'], intro: ['iiø V7'] },
    melodyLo: 60, melodyHi: 86,
    lead: { A: ['org'], B: ['vib'], A2: ['org', 'vib'], solo: ['vib', 'gtr', 'org'] },
    leadArt: { org: 'sus', gtr: 'soft' },
    parts: [
      { fn: 'walk', i: 'cb' },
      { fn: 'comp', i: 'org', grid: [[0, 0.3], [1.5, 0.4], [2.5, 0.3]], a: 'soft', center: 58, n: 3 },
      { fn: 'comp', i: 'gtr', grid: [[0, 0.3], [1, 0.3], [2, 0.3], [3, 0.3]], a: 'soft', center: 60, n: 3, min: 0.35 },
      { fn: 'brass', top: 'tp', low: 'tb', pat: 'push', p: 0.4, min: 0.8, out: ['solo'] },
    ],
    drums: 'swing', fill: 'snare', crash: 'cym', lift: [0, 1],
    mix: { ...KIT, org: 0.7, gtr: 0.7 },
    ending: ['org', 'vib', 'cb', 'cym'],
  },
  pop69: {
    ...COMMON,
    name: 'SUNSHINE POP', desc: 'Sunny harmony pop: flute and vibes, strings, harpsichord-bright piano and tambourine',
    bpm: [112, 126], keys: [7, 2, 9, 0], minor: 0, themes: POP_THEMES,
    progs: { A: ['I iii7 IV V I iii7 IV V'], B: ['IV IV iii7 iii7 ii7 ii7 V7 V7', 'vi7 vi7 IV IV ii7 ii7 V7 V7'], intro: ['I IV'] },
    melodyLo: 62, melodyHi: 86,
    lead: { A: ['fl'], B: ['vib', 'fl'], A2: ['str', 'fl'], solo: ['vib', 'org'] },
    leadArt: { org: 'stac' },
    parts: [
      { fn: 'bass', i: 'cb', grid: [[0, 1, 'R'], [1, 0.5, '5'], [1.5, 0.5, 'R'], [2, 1, 'O'], [3, 1, '5']] },
      { fn: 'comp', i: 'pno', grid: [[0, 0.4], [1, 0.4], [1.5, 0.4], [2.5, 0.4], [3, 0.4]], a: 'hit', center: 66, n: 3 },
      { fn: 'comp', i: 'gtr', grid: [[0, 0.5], [2, 0.5]], a: 'soft', center: 62, n: 3, min: 0.4 },
      { fn: 'pad', players: ['str', 'vla'], low: 'vc', min: 0.45, center: 72 },
      { fn: 'brass', top: 'tp', low: 'tb', pat: 'push', p: 0.5, min: 0.7 },
      { fn: 'sparkle', i: 'glk', p: 0.3, min: 0.5 },
      { fn: 'gliss', i: 'hrp', every: 8, min: 0.55 },
    ],
    drums: 'pop69', fill: 'snare', crash: 'cym', lift: [1, 2],
    mix: { ...KIT, pno: 0.7 },
    ending: ['fl', 'vib', 'str', 'vla', 'hrp', 'cym'],
  },
};
