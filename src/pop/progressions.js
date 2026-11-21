// SPDX-License-Identifier: MIT
// The chord library of the Pop Machine: the loops pop music keeps coming back
// to, most of them four chords long, with how each one moves. Chord loops are
// not owned by anyone; the names and notes here are ours.
//
// `chords` is one bar per word, '-' splits a bar ('I-V vi-iii' is four chords
// in two bars). `minor` says which kind of key the loop lives in. `bass` is
// the bass line in C major or A minor, so the movement can be read at a glance.

export const PROGRESSIONS = [
  {
    id: 'axis', name: 'I–V–vi–IV', nick: 'The pop axis', minor: false, chords: 'I V vi IV', bass: 'C G A F',
    moves: 'Home, down a fourth to V, up a step to the minor vi, down a third to IV, then a fourth up home. No chord pulls hard, so it can loop for a whole song.',
    where: 'The most used loop in pop since the 1980s: ballads, pop-punk, stadium choruses.',
  },
  {
    id: 'sensitive', name: 'vi–IV–I–V', nick: 'The axis from vi', minor: false, chords: 'vi IV I V', bass: 'A F C G',
    moves: 'The same four chords started on the minor vi. The loop sounds sadder and more anthemic, and the V at the end throws it back to vi.',
    where: 'Choruses that want to sound bittersweet. Pop songs often use the axis in the verse and this rotation in the chorus.',
  },
  {
    id: 'doowop', name: 'I–vi–IV–V', nick: 'The fifties loop', minor: false, chords: 'I vi IV V', bass: 'C A F G',
    moves: 'Home, its relative minor, then IV and V climb back by step: a full circle of tonic, subdominant, dominant.',
    where: 'Doo-wop and 1950s ballads; it grows out of the classical I–vi–ii–V–I cadence.',
  },
  {
    id: 'pachelbel', name: 'I–V–vi–iii–IV–I–IV–V', nick: 'Pachelbel\'s canon', minor: false, chords: 'I-V vi-iii IV-I IV-V', bass: 'C B A G F E F G',
    moves: 'Two chords a bar. The bass walks down the scale step by step while each chord drops a fourth and climbs a step; at the end IV–V turns it round.',
    where: 'Johann Pachelbel, around 1680. Its falling bass has carried countless pop ballads since the 1960s.',
  },
  {
    id: 'royal', name: 'IV–V–iii–vi', nick: 'The royal road', minor: false, chords: 'IV V iii vi', bass: 'F G E A',
    moves: 'Starts away from home on IV, rises to V and, instead of resolving, side-steps to iii and lands on the minor vi. It never reaches I, so it always wants more.',
    where: 'J-pop and anime openings call it ōdō shinkō, the royal road progression.',
  },
  {
    id: 'mixo', name: 'I–bVII–IV–I', nick: 'The rock turn', minor: false, chords: 'I bVII IV I', bass: 'C Bb F C',
    moves: 'The flat-seven chord is borrowed from the minor key; bVII–IV–I is two plagal ("amen") steps in a row, each a fourth up.',
    where: 'Rock anthems, 1980s TV themes and film-trailer fanfares.',
  },
  {
    id: 'circle', name: 'vi–ii–V–I', nick: 'Circle of fifths', minor: false, chords: 'vi ii V I', bass: 'A D G C',
    moves: 'Every root falls a fifth (or climbs a fourth) to the next. Each chord is the dominant of the one after it, so the loop pulls forward hard.',
    where: 'Baroque sequences (Vivaldi, Handel), the jazz ii–V–I, disco strings.',
  },
  {
    id: 'minoriv', name: 'I–iii–IV–iv', nick: 'The minor four', minor: false, chords: 'I iii IV iv', bass: 'C E F F',
    moves: 'IV turns minor (iv): one inner note falls a semitone (A to Ab in C) and the loop sighs before going home.',
    where: 'Beatles-era and alternative-rock ballads; the iv is borrowed from the minor key.',
  },
  {
    id: 'andalusian', name: 'i–bVII–bVI–V', nick: 'Andalusian cadence', minor: true, chords: 'i bVII bVI V', bass: 'A G F E',
    moves: 'The bass walks down four notes of the minor scale, A G F E, and the major V at the bottom pulls back up to i.',
    where: 'Renaissance and Baroque laments, flamenco, surf rock, 1960s pop and disco.',
  },
  {
    id: 'epic', name: 'i–bVI–bIII–bVII', nick: 'The epic minor', minor: true, chords: 'i bVI bIII bVII', bass: 'A F C G',
    moves: 'All four chords come from the natural minor scale and there is no dominant, so it never cadences: it floats and rises.',
    where: 'Trance, eurodance, film scores and power anthems. In major it is the axis turned minor.',
  },
  {
    id: 'lift', name: 'i–bVI–bVII–i', nick: 'The minor lift', minor: true, chords: 'i bVI bVII i', bass: 'A F G A',
    moves: 'Down to bVI, then two steps up like a lift, bVI–bVII–i. The whole-step climb home sounds heroic.',
    where: '1980s action themes, synth-pop and video-game music.',
  },
  {
    id: 'minorcircle', name: 'i–iv–bVII–bIII', nick: 'Minor circle', minor: true, chords: 'i iv bVII bIII', bass: 'A D G C',
    moves: 'The circle of fifths inside a minor key: every root rises a fourth. Usually continues bVI–ii°–V–i.',
    where: 'Baroque sequences, gypsy jazz, 1990s eurodance.',
  },
  {
    id: 'folia', name: 'La Folia', nick: 'The oldest hit', minor: true, chords: 'i-V i-bVII bIII-bVII i-V', bass: 'A E A G C G A E',
    moves: 'Eight chords, two a bar: i–V, i–bVII, bIII–bVII, i–V. A slow swing between the minor home and its neighbours.',
    where: 'A dance tune from the 1500s, varied by Corelli, Vivaldi and many more for three hundred years.',
  },
];

export const PROGRESSION_BY = Object.fromEntries(PROGRESSIONS.map((p) => [p.id, p]));

// Which loop a chorus may use after a verse loop: the same, its rotation
// (the axis from another chord), or a related loop in the same mode.
export const ROTATIONS = {
  axis: ['sensitive', 'axis', 'royal'],
  sensitive: ['axis', 'sensitive'],
  doowop: ['axis', 'doowop'],
  pachelbel: ['axis', 'pachelbel'],
  royal: ['sensitive', 'royal'],
  mixo: ['axis', 'mixo'],
  circle: ['axis', 'doowop'],
  minoriv: ['axis', 'doowop'],
  andalusian: ['epic', 'andalusian'],
  epic: ['lift', 'epic'],
  lift: ['epic', 'andalusian'],
  minorcircle: ['epic', 'andalusian'],
  folia: ['andalusian', 'epic'],
};
