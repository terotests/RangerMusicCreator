// SPDX-License-Identifier: MIT
// The repertoire: public-domain works played note for note from MIDI files
// in scores/, made with LilyPond from Mutopia Project editions by
// scripts/build-scores.py (LICENSES.md lists each edition and its licence).
// Every work can be played in more than one arrangement: on the concert
// grand, by the string orchestra, or by the full orchestra. The first one
// listed is how the composer wrote it.

import { parseScore, applyPedal } from './score.js';

export const COMPOSERS = [
  { id: 'bach', name: 'BACH', full: 'Johann Sebastian Bach', life: '1685–1750' },
  { id: 'vivaldi', name: 'VIVALDI', full: 'Antonio Vivaldi', life: '1678–1741' },
  { id: 'chopin', name: 'CHOPIN', full: 'Frédéric Chopin', life: '1810–1849' },
  { id: 'mozart', name: 'MOZART', full: 'Wolfgang Amadeus Mozart', life: '1756–1791' },
  { id: 'beethoven', name: 'BEETHOVEN', full: 'Ludwig van Beethoven', life: '1770–1827' },
  { id: 'debussy', name: 'DEBUSSY', full: 'Claude Debussy', life: '1862–1918' },
  { id: 'satie', name: 'SATIE', full: 'Erik Satie', life: '1866–1925' },
  { id: 'more', name: 'MORE', full: 'Strauss, Holst, Dvořák, Grieg, Tchaikovsky', life: 'orchestral favourites' },
];

export const ARRANGEMENTS = {
  piano: { name: 'PIANO', desc: 'The concert grand alone.' },
  strings: { name: 'STRINGS', desc: 'The string orchestra: violins, violas, cellos and basses.' },
  orchestra: { name: 'ORCHESTRA', desc: 'The full orchestra: strings, woodwinds, horns and harp.' },
};

// parts: the role of each MIDI track, in order (the last one repeats).
//   rh/lh: piano hands; solo, solo2: concerto soloists; vln1, vln2, vla, vc, cb:
//   string parts; fl, fl2, voice: wind or vocal lines; ped: organ pedals; hpd: harpsichord.
// bpm: opening tempo in quarter notes (LilyPond writes 60 when a source has none).
const PD = 'public domain';
const BYSA = (who) => `CC BY-SA 3.0, typeset by ${who}`;
export const WORKS = [
  { id: 'bach-air', composer: 'bach', name: 'AIR ON THE G STRING', source: 'Orchestral Suite No. 3 in D, BWV 1068: Air (c. 1730)', file: 'bach-air', parts: ['vln1', 'vln2', 'vla', 'vc'], bpm: 32, arr: ['strings', 'piano', 'orchestra'], edition: BYSA('Jeff Covey') },
  { id: 'bach-prelude-c', composer: 'bach', name: 'PRELUDE IN C MAJOR', source: 'The Well-Tempered Clavier I, BWV 846 (1722)', file: 'bach-prelude-c', parts: ['rh', 'lh'], bpm: 66, arr: ['piano', 'strings', 'orchestra'], edition: PD, arpeggio: true },
  { id: 'bach-toccata', composer: 'bach', name: 'TOCCATA AND FUGUE IN D MINOR', source: 'Organ, BWV 565', file: 'bach-toccata', parts: ['rh', 'lh', 'ped'], bpm: 66, arr: ['orchestra', 'piano', 'strings'], edition: PD },
  { id: 'bach-sheep', composer: 'bach', name: 'SHEEP MAY SAFELY GRAZE', source: 'Hunting Cantata, BWV 208: aria (1713)', file: 'bach-sheep', parts: ['fl', 'fl2', 'voice', 'vc'], bpm: 56, arr: ['orchestra', 'strings', 'piano'], edition: PD },
  { id: 'bach-double', composer: 'bach', name: 'DOUBLE VIOLIN CONCERTO', source: 'Concerto for Two Violins in D minor, BWV 1043: Vivace', file: 'bach-double', parts: ['solo', 'solo2', 'vln1', 'vln2', 'vla', 'vc'], bpm: 96, arr: ['strings', 'orchestra', 'piano'], edition: PD },
  { id: 'bach-brandenburg5', composer: 'bach', name: 'BRANDENBURG CONCERTO NO. 5', source: 'BWV 1050: Allegro (1721)', file: 'bach-brandenburg5', parts: ['fl', 'solo', 'vln1', 'vla', 'vc', 'cb', 'hpd', 'hpd'], bpm: 108, arr: ['orchestra', 'strings', 'piano'], edition: PD },
  { id: 'bach-minuet-g', composer: 'bach', name: 'MINUET IN G', source: 'Notebook for Anna Magdalena Bach, BWV Anh. 114 (1725; by Christian Petzold)', file: 'bach-minuet-g', parts: ['rh', 'lh'], bpm: 120, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'bach-invention1', composer: 'bach', name: 'INVENTION NO. 1', source: 'Two-Part Invention in C, BWV 772 (1723)', file: 'bach-invention1', parts: ['rh', 'lh'], bpm: 72, arr: ['piano', 'strings', 'orchestra'], edition: BYSA('Jeff Covey') },

  { id: 'vivaldi-spring-1', composer: 'vivaldi', name: 'SPRING · ALLEGRO', source: 'The Four Seasons, Op. 8 No. 1, RV 269 (1725)', file: 'vivaldi-spring-1', parts: ['solo', 'vln1', 'vln2', 'vla', 'vc'], bpm: 100, arr: ['strings', 'orchestra', 'piano'], edition: BYSA('a Mutopia contributor') },
  { id: 'vivaldi-summer-3', composer: 'vivaldi', name: 'SUMMER · PRESTO', source: 'The Four Seasons, Op. 8 No. 2, RV 315 (1725)', file: 'vivaldi-summer-3', parts: ['solo', 'vln1', 'vln2', 'vla', 'vc'], bpm: 150, arr: ['strings', 'orchestra', 'piano'], edition: BYSA('a Mutopia contributor') },
  { id: 'vivaldi-autumn-1', composer: 'vivaldi', name: 'AUTUMN · ALLEGRO', source: 'The Four Seasons, Op. 8 No. 3, RV 293 (1725)', file: 'vivaldi-autumn-1', parts: ['solo', 'vln1', 'vln2', 'vla', 'vc'], bpm: 100, arr: ['strings', 'orchestra', 'piano'], edition: BYSA('a Mutopia contributor') },
  { id: 'vivaldi-winter-1', composer: 'vivaldi', name: 'WINTER · ALLEGRO NON MOLTO', source: 'The Four Seasons, Op. 8 No. 4, RV 297 (1725)', file: 'vivaldi-winter-1', parts: ['solo', 'vln1', 'vln2', 'vla', 'vc'], bpm: 76, arr: ['strings', 'orchestra', 'piano'], edition: BYSA('a Mutopia contributor') },
  { id: 'vivaldi-winter-2', composer: 'vivaldi', name: 'WINTER · LARGO', source: 'The Four Seasons, Op. 8 No. 4, RV 297 (1725)', file: 'vivaldi-winter-2', parts: ['solo', 'vln1', 'vln2', 'vla', 'vc'], bpm: 46, arr: ['strings', 'orchestra', 'piano'], edition: BYSA('a Mutopia contributor'), pizz: ['vln1', 'vln2'] },

  { id: 'chopin-nocturne-9-2', composer: 'chopin', name: 'NOCTURNE IN E-FLAT', source: 'Op. 9 No. 2 (1832)', file: 'chopin-nocturne-9-2', parts: ['rh', 'lh'], bpm: 50, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: BYSA('Renato Biolcati Rinaldi') },
  { id: 'chopin-prelude-4', composer: 'chopin', name: 'PRELUDE IN E MINOR', source: 'Op. 28 No. 4 (1839)', file: 'chopin-prelude-4', parts: ['rh', 'lh'], bpm: 46, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'chopin-prelude-15', composer: 'chopin', name: '"RAINDROP" PRELUDE', source: 'Op. 28 No. 15 in D-flat (1839)', file: 'chopin-prelude-15', parts: ['rh', 'lh'], bpm: 66, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'chopin-prelude-7', composer: 'chopin', name: 'PRELUDE IN A MAJOR', source: 'Op. 28 No. 7 (1839)', file: 'chopin-prelude-7', parts: ['rh', 'lh'], bpm: 66, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'chopin-waltz-64-1', composer: 'chopin', name: '"MINUTE" WALTZ', source: 'Waltz in D-flat, Op. 64 No. 1 (1847)', file: 'chopin-waltz-64-1', parts: ['rh', 'lh'], bpm: 200, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'chopin-waltz-69-2', composer: 'chopin', name: 'WALTZ IN B MINOR', source: 'Op. 69 No. 2 (1829, published 1852)', file: 'chopin-waltz-69-2', parts: ['rh', 'lh'], bpm: 132, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'chopin-fantaisie', composer: 'chopin', name: 'FANTAISIE-IMPROMPTU', source: 'Op. 66 in C-sharp minor (1834, published 1855)', file: 'chopin-fantaisie', parts: ['rh', 'lh'], bpm: 150, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'chopin-revolutionary', composer: 'chopin', name: '"REVOLUTIONARY" ÉTUDE', source: 'Étude in C minor, Op. 10 No. 12 (1831)', file: 'chopin-revolutionary', parts: ['rh', 'lh'], bpm: 152, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },

  { id: 'mozart-nachtmusik', composer: 'mozart', name: 'EINE KLEINE NACHTMUSIK', source: 'Serenade in G, K. 525: Allegro (1787)', file: 'mozart-nachtmusik', parts: ['vln1', 'vln2', 'vla', 'vc'], bpm: 138, arr: ['strings', 'orchestra', 'piano'], edition: PD },
  { id: 'beethoven-elise', composer: 'beethoven', name: 'FÜR ELISE', source: 'Bagatelle in A minor, WoO 59 (1810)', file: 'beethoven-elise', parts: ['rh', 'lh'], bpm: null, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'debussy-clair', composer: 'debussy', name: 'CLAIR DE LUNE', source: 'Suite bergamasque (1905)', file: 'debussy-clair', parts: ['rh', 'lh'], bpm: 60, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'debussy-arabesque-1', composer: 'debussy', name: 'ARABESQUE NO. 1', source: 'Deux arabesques (1891)', file: 'debussy-arabesque-1', parts: ['rh', 'lh'], bpm: 92, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
  { id: 'satie-gymnopedie-1', composer: 'satie', name: 'GYMNOPÉDIE NO. 1', source: 'Trois Gymnopédies (1888)', file: 'satie-gymnopedie-1', parts: ['rh', 'lh'], bpm: 72, romantic: true, arr: ['piano', 'strings', 'orchestra'], edition: PD },
];
export const WORK_BY_ID = Object.fromEntries(WORKS.map((w) => [w.id, w]));
export const scoreUrl = (w) => `scores/${w.file}.mid`;

// ---- arranging ---------------------------------------------------------------

const STRING_ROLE = { solo: 'vln1', solo2: 'vln2', vln1: 'vln1', vln2: 'vln2', vla: 'vla', vc: 'vc', cb: 'cb', fl: 'vln2', fl2: 'vla', voice: 'vln1' };

// Notes struck together (within a 64th) form a chord.
function chords(notes, ppq) {
  const out = [];
  for (const n of notes) {
    const last = out[out.length - 1];
    if (last && n.t0 - last[0].t0 <= ppq / 16) last.push(n);
    else out.push([n]);
  }
  return out;
}

// Same pitch at the same time in two parts (a unison doubling): keep one.
function dedupe(notes, ppq) {
  const seen = new Set();
  return notes.filter((n) => {
    const k = `${n.m}:${Math.round(n.t0 / (ppq / 8))}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// score (from parseScore) -> [{ i, a, t0, t1, m, v, leg?, legOut? }] for one
// arrangement, shaped by interpret() (dynamics, legato) afterwards.
export function arrangeWork(score, work, arr) {
  // Accents in the MIDI hit far too hard: every note is drawn halfway back to the piece's usual level first.
  const src = score.tracks.flatMap((t) => t.notes);
  const vs = src.map((n) => n.v).sort((a, b) => a - b);
  const usual = vs[Math.floor(vs.length / 2)] ?? 0.7;
  for (const n of src) n.v = usual + (n.v - usual) * 0.55;
  return interpret(arrangeNotes(score, work, arr), score, work, arr);
}

function arrangeNotes(score, work, arr) {
  const ppq = score.ppq;
  const out = [];
  // voice: the source track, so legato is found within one part; lead: the melody.
  const add = (i, n, v = n.v, extra = {}) => out.push({ i, a: extra.a || (i === 'pno' || i === 'harp' ? 'hit' : 'sus'), t0: n.t0, t1: extra.t1 ?? n.t1, m: extra.m ?? n.m, v: Math.max(0.05, Math.min(1, v)), voice: `${extra.voice ?? n.tr}:${i}`, lead: extra.lead ?? false });
  // Off the piano the sustain pedal does not apply: notes end when the key comes up.
  const keyEnd = (n) => n.k1 ?? n.t1;
  const tracks = score.tracks.map((tr, k) => ({ role: work.parts[Math.min(k, work.parts.length - 1)], notes: tr.notes.filter((n) => n.ch !== 9).map((n) => Object.assign(n, { tr: k })) }));
  const melodyRoles = new Set(['solo', 'vln1', 'voice', 'rh']);
  const keyboard = tracks.some((t) => t.role === 'rh' || t.role === 'lh');

  // Romantic piano music, and string or vocal music played on the piano, is sung: pedal, legato, voicing.
  if (arr === 'piano' && (work.romantic || !keyboard)) {
    cantabilePiano(score, tracks, work, add);
    return out;
  }
  if (arr === 'piano') {
    const all = [];
    for (const t of tracks) for (const n of t.notes) all.push({ ...n, lead: melodyRoles.has(t.role) || t.role === 'fl' });
    all.sort((a, b) => a.t0 - b.t0 || b.lead - a.lead);
    for (const n of dedupe(all, ppq)) add('pno', n, n.v * (n.lead ? 1 : 0.85));
    return out;
  }

  const full = arr === 'orchestra';
  const beat = ppq;
  for (const t of tracks) {
    const r = t.role;
    if (r === 'rh' || r === 'lh') {
      // A keyboard part: split each chord into string voices.
      for (const c of chords(t.notes, ppq)) {
        c.sort((a, b) => a.m - b.m);
        c.forEach((n, j) => {
          const len = keyEnd(n) - n.t0;
          const nn = { ...n, t1: keyEnd(n) };
          if (r === 'rh' && work.arpeggio && len < beat * 0.5) {
            // Broken chords: each note to the string part at its height (the harp joins in the orchestra).
            add(n.m >= 72 ? 'vln1' : n.m >= 64 ? 'vln2' : 'vla', n, n.v * (full ? 0.6 : 0.85), { a: 'spic' });
            if (full) add('harp', n, n.v * 0.8);
          } else if (r === 'rh') {
            if (j === c.length - 1) {
              add('vln1', nn, n.v + 0.05);
              if (full && len >= beat * 0.45) add(n.m >= 67 ? 'fl' : 'ob', nn, n.v * 0.62);
            } else if (full && len < beat * 0.6 && c.length >= 3) add('harp', n, n.v * 0.7);
            else add(n.m >= 55 ? 'vln2' : 'vla', nn, n.v * 0.85);
            if (full && j < c.length - 1 && len >= beat * 1.5) add('cl', nn, n.v * 0.5);
          } else if (j === 0) {
            add(n.m >= 43 ? 'vc' : 'cb', nn, n.v);
            if (n.m >= 43 && len >= beat * 0.9 && n.m - 12 >= 28) add('cb', nn, n.v * 0.8, { m: n.m - 12 });
            if (full && len >= beat * 0.9) add('bn', nn, n.v * 0.6);
            if (full && len >= beat * 1.8) add('hn', nn, n.v * 0.45, { m: n.m < 41 ? n.m + 12 : n.m });
          } else if (full && len < beat * 0.6) add('harp', n, n.v * 0.7);
          else add(n.m >= 48 ? 'vla' : 'vc', nn, n.v * 0.8);
        });
      }
      continue;
    }
    if (r === 'ped') {
      for (const n of t.notes) {
        add('cb', n, n.v);
        add('vc', n, n.v * 0.8, { m: n.m + 12 });
        if (full && n.t1 - n.t0 >= beat) add('tb', n, n.v * 0.75, { m: n.m + 12 }), add('tu', n, n.v * 0.75);
      }
      continue;
    }
    if (r === 'hpd') {
      for (const n of t.notes) add(full || arr === 'strings' ? 'harp' : 'pno', n, n.v * 0.8);
      continue;
    }
    // String, wind and vocal parts.
    for (const n of t.notes) {
      const len = n.t1 - n.t0;
      let i = STRING_ROLE[r] || 'vln1';
      if (full && (r === 'fl' || r === 'fl2')) i = 'fl';
      if (full && r === 'voice') i = 'ob';
      const pizz = work.pizz?.includes(r);
      add(i, n, n.v + (r === 'solo' || r === 'solo2' ? 0.08 : 0), pizz ? { a: 'pizz' } : {});
      if (r === 'vc') {
        if (n.m - 12 >= 28) add('cb', n, n.v * 0.8, { m: n.m - 12, a: pizz ? 'pizz' : undefined });
        if (full && len >= beat * 0.9) add('bn', n, n.v * 0.55);
      }
      if (full && r === 'voice') add('vln1', n, n.v * 0.7);
      if (full && r === 'vln1' && len >= beat * 0.9) add('ob', n, n.v * 0.55);
      if (full && r === 'vla' && len >= beat * 1.5) add('hn', n, n.v * 0.45, { m: n.m < 41 ? n.m + 12 : n.m });
    }
  }
  return out;
}

// Singing piano (Chopin, Debussy, Satie…, and string music on the piano).
// The score's MIDI has nearly every note at one loudness and, unless the
// edition wrote pedal marks, no pedal, which makes a nocturne sound like a
// march. A pianist sings the melody over a soft accompaniment, joins the
// melody notes and changes the pedal with each new bass note, so:
//  - pedal: if the score has none, it goes down just after each bass note and
//    comes up at the next one (at least once a bar);
//  - legato: each melody note is held into the next one;
//  - voicing: the melody sings, inner notes, the bass and above all the left
//    hand's after-beat chords are lighter, fast ornaments lighter still.
const BASS_ROLES = new Set(['lh', 'vc', 'cb', 'ped']);
const LEAD_ROLES = new Set(['rh', 'solo', 'vln1', 'voice']);
function cantabilePiano(score, tracks, work, add) {
  const ppq = score.ppq;
  const barTicks = (ppq * 4 * score.meter.num) / score.meter.den;
  const bass = tracks.filter((t) => BASS_ROLES.has(t.role)).flatMap((t) => t.notes).sort((a, b) => a.t0 - b.t0);
  const bassAt = new Set();
  let last = -Infinity;
  let prevLow = Infinity;
  for (const c of chords(bass, ppq)) {
    const low = Math.min(...c.map((n) => n.m));
    const keys = tracks.some((t) => t.role === 'lh');
    // In a left hand the bass is a lower note than the chord before it; in a cello part every new note is one.
    if ((keys ? low <= prevLow - 3 : low !== prevLow) || c[0].t0 - last >= barTicks) bassAt.add(c[0].t0), (last = c[0].t0);
    prevLow = low;
  }
  const hasPedal = score.tracks.some((t) => t.notes.some((n) => n.k1 != null));
  if (!hasPedal && bassAt.size) {
    const ticks = [...bassAt].sort((a, b) => a - b);
    const events = [];
    ticks.forEach((t, k) => {
      events.push({ tick: t + ppq / 16, down: true });
      events.push({ tick: k + 1 < ticks.length ? ticks[k + 1] : t + barTicks, down: false });
    });
    applyPedal(score.tracks, events);
  }
  const soft = work.soft ?? 0.85;
  const seen = new Set();
  for (const t of tracks) {
    const isLead = LEAD_ROLES.has(t.role);
    const isBass = BASS_ROLES.has(t.role);
    for (const c of chords(t.notes, ppq)) {
      const top = Math.max(...c.map((n) => n.m));
      const low = Math.min(...c.map((n) => n.m));
      for (const n of c) {
        // A unison doubling between parts is played once.
        const k = `${n.m}:${Math.round(n.t0 / (ppq / 8))}`;
        if (seen.has(k)) continue;
        seen.add(k);
        let f;
        let sings = false;
        if (isBass) f = bassAt.has(c[0].t0) && n.m === low ? 0.78 : 0.6;
        else if (isLead && n.m === top) (f = 1.05), (sings = true);
        else f = isLead ? 0.72 : 0.66;
        if (n.t1 - n.t0 < ppq / 4 && (n.k1 == null || n.k1 - n.t0 < ppq / 4)) f *= 0.85; // runs and ornaments: light fingers
        const e = { ...n };
        add('pno', e, n.v * f * soft, { lead: sings });
      }
    }
  }
}

// ---- interpretation -------------------------------------------------------------
//
// What a player adds to the notes, so the score does not sound typed in:
//  - dynamics (after accents are softened in arrangeWork): each four-bar phrase swells
//    to its middle and relaxes, downbeats lean a little, and a melody grows as
//    it climbs and softens as it falls;
//  - legato: a melody on the piano is held into its next note; a string or
//    wind part whose notes follow each other without a rest is played on one
//    bow or breath: the next note starts without a new attack (`leg`) and the
//    one before it lets go quickly (`legOut`). Slurred notes overlap a little;
//    detached ones keep their small gap but do not swell in again.
const SUSTAINED = new Set(['vln1', 'vln2', 'vla', 'vc', 'cb', 'fl', 'ob', 'cl', 'bn', 'hn', 'tp', 'tb', 'tu']);
function interpret(notes, score, work, arr) {
  if (!notes.length) return notes;
  const ppq = score.ppq;
  const bar = (ppq * 4 * score.meter.num) / score.meter.den;
  const voices = new Map();
  for (const n of notes) {
    if (!voices.has(n.voice)) voices.set(n.voice, []);
    voices.get(n.voice).push(n);
  }
  for (const n of notes) {
    let v = n.v;
    const pos = (n.t0 % (bar * 4)) / (bar * 4);
    v *= 0.93 + 0.1 * Math.sin(Math.PI * pos);
    const inBar = n.t0 % bar;
    if (inBar < ppq / 16) v *= 1.04;
    else if (inBar % ppq > ppq / 16) v *= 0.97;
    n.v = v;
  }
  for (const line of voices.values()) {
    line.sort((a, b) => a.t0 - b.t0 || b.m - a.m);
    // Contour: against the average of the last few notes.
    let avg = line[0].m;
    for (const n of line) {
      if (n.lead || SUSTAINED.has(n.i)) n.v *= 1 + Math.max(-0.08, Math.min(0.08, (n.m - avg) / 30));
      avg = avg * 0.75 + n.m * 0.25;
    }
    for (let k = 0; k + 1 < line.length; k++) {
      const a = line[k];
      const b = line[k + 1];
      if (b.t0 <= a.t0 + ppq / 32) continue; // a chord, not a line
      const gap = b.t0 - a.t1;
      if (a.i === 'pno') {
        if (a.lead && b.lead && gap > 0 && gap < ppq * 0.5) a.t1 = b.t0 + ppq / 32;
      } else if (SUSTAINED.has(a.i) && a.a === 'sus' && gap < Math.max(ppq / 24, (a.t1 - a.t0) * 0.16) && gap > -ppq / 8) {
        if (gap <= ppq / 24) a.t1 = b.t0 + ppq / 24;
        a.legOut = true;
        b.leg = true;
      }
    }
  }
  for (const n of notes) n.v = Math.max(0.05, Math.min(1, n.v));
  return notes;
}

// Rubato for the romantic piano: each four-bar phrase moves on a little in
// its middle and broadens into its end; the last bars slow down.
export function tempoShape(work, arr) {
  if (!(work.romantic && arr === 'piano')) return null;
  const curve = [1.0, 1.03, 1.01, 0.92];
  return (bar, bars) => (bar >= bars - 2 ? 0.85 : curve[bar % 4]);
}

// For the page and tests: MIDI bytes -> notes of one arrangement.
export function arrangeBytes(buffer, work, arr) {
  return arrangeWork(parseScore(buffer), work, arr);
}
