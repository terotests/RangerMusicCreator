// SPDX-License-Identifier: MIT
// The Pop Machine composer. A pop song built the way many instrumental hits
// are: one short riff, repeated and transformed over a loop of (usually four)
// chords. The riff is a public-domain classical figure or a new motif; the
// machine keeps it while the chords change under it, moves it with the chords
// (by scale steps as a sequence, as broken chords, or in exact semitones),
// answers it, halves its speed in the breakdown, doubles it in octaves in the
// chorus and lifts the last chorus into a higher key.
//
// Form: intro (the riff alone), verse, build-up, chorus, breakdown, verse,
// build-up, chorus, the chorus again in the new key, outro, final chord.
//
// A bar is { beats, bpm, events, info }; events are
// { i: player, a: articulation, b: beat, d: beats, m: midi, v: 0..1 }.
// Pure (no Web Audio), so it runs in node tests and offline renders.

import { Rng } from '../rng.js';
import { bars as chordBars, pcs as chordPcs, chord as parseChord, chordAt, fit, NAMES } from '../jazz/theory.js';
import { chordName } from '../jazz/ragtime.js';
import { PART_FNS, chordTones, voice } from '../retro/composer.js';
import { tune } from '../retro/tunes.js';
import { RIFFS, RIFF_BY, makeMotif, MOTIF_KINDS } from './riffs.js';
import { PROGRESSIONS, PROGRESSION_BY, ROTATIONS } from './progressions.js';
import { POP_STYLES } from './styles.js';
import { POP_RANGE, POP_SECTION_OF } from './bands.js';

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pc = (m) => ((m % 12) + 12) % 12;
const near = (x, y) => Math.abs(x - y) < 1e-6;

// ---- scale degrees ---------------------------------------------------------------
// A riff is kept as scale degrees (0 = tonic, 7 = the octave) plus a chromatic
// alteration, so it can be moved by scale steps or played in the other mode.

export function toDegrees(m, tonic, minor) {
  const sc = minor ? MIN : MAJ;
  const rel = m - tonic;
  const oct = Math.floor(rel / 12);
  const r = rel - oct * 12;
  let idx = sc.indexOf(r);
  let alt = 0;
  if (idx < 0) [idx, alt] = [sc.indexOf(r - 1), 1];
  if (idx < 0) [idx, alt] = [sc.indexOf(r + 1), -1];
  return { deg: idx + 7 * oct, alt };
}

export function fromDegrees(deg, alt, tonic, minor) {
  const sc = minor ? MIN : MAJ;
  const oct = Math.floor(deg / 7);
  return tonic + sc[deg - 7 * oct] + 12 * oct + alt;
}

// The scale degree of a chord's root ('bVII' in major is degree 6, lowered).
function rootDeg(ch, minor) {
  return toDegrees(ch.r, 0, minor).deg;
}

// A riff ready for a song: bars of { b, d, deg, alt } in the song's mode.
export function prepareRiff(def, minor) {
  let bars;
  if (def.degrees) bars = def.degrees.map((bar) => bar.map((n) => ({ b: n.b, d: n.d, deg: n.deg, alt: 0 })));
  else {
    bars = tune(def.notes).map((bar) => bar.map((n) => ({ b: n.b, d: n.d, ...toDegrees(n.m, 60 + def.key, def.minor) })));
    // A minor riff played in major: its raised sixth and seventh are the major scale's own.
    if (def.minor && !minor) for (const bar of bars) for (const n of bar) if (n.alt === 1 && [5, 6].includes(((n.deg % 7) + 7) % 7)) n.alt = 0;
  }
  const home = Array.isArray(def.home) ? [...def.home] : (def.home || 'I').trim().split(/\s+/);
  while (home.length < bars.length) home.push(home[home.length - 1]);
  return {
    id: def.id, name: def.name, by: def.by, source: def.source, kind: def.kind, bars, home: home.map((t) => parseChord(t)),
    flipped: def.minor != null && def.minor !== minor,
  };
}

// '1 bar per word' progressions; slow styles hold each chord for two bars.
function loopBars(prog, beats, slow) {
  const bars = chordBars(prog, beats);
  if (!slow) return bars;
  const out = [];
  for (const bar of bars) {
    if (bar.length === 1) out.push(bar, bar);
    else for (const ch of bar) out.push([{ ...ch, at: 0 }]);
  }
  return out;
}

const repeatTo = (bars, n) => Array.from({ length: n }, (_, i) => bars[i % bars.length]);

// ---- the extra parts --------------------------------------------------------------

// Power-chord guitar: palm-muted eighths in the verse, open chords in the chorus.
function powerPart(c, spec) {
  const out = [];
  const open = c.section === 'chorus' || c.section === 'lift';
  c.chords.forEach((ch, k) => {
    const end = c.chords[k + 1]?.at ?? c.beats;
    const root = fit(pc(c.key + ch.r) + 36, 40, 51);
    if (open) out.push({ i: spec.i, a: 'sus', b: ch.at, d: end - ch.at, m: root, v: c.vel(0.72) });
    else for (let b = ch.at; b < end - 1e-6; b += 0.5) out.push({ i: spec.i, a: 'stac', b, d: 0.4, m: root, v: c.vel(near(b, Math.round(b)) ? 0.62 : 0.5) });
  });
  return out;
}

const PARTS = { ...PART_FNS, power: powerPart };

// ---- drums ----------------------------------------------------------------------

function drumPart(c) {
  const S = c.S;
  const sec = c.section;
  const out = [];
  if (sec === 'intro' || sec === 'break') return out;
  if (sec === 'outro' && c.barIn >= c.len - 2) return out;
  const loud = sec === 'chorus' || sec === 'lift';
  const g = loud ? S.drums.chorus : S.drums.main;
  const e = c.energy;
  for (const [p, hits] of Object.entries(g)) {
    if (!c.has(p)) continue;
    if (sec === 'build' && (p === 'snare' || p === 'clap' || p === 'crash')) continue;
    if (sec === 'build' && p === 'hat' && c.barIn === c.len - 1) continue;
    for (const [b, v, a] of hits) {
      const off = !near(b, Math.round(b));
      const sixteenth = !near(b * 2, Math.round(b * 2));
      let acc = 1;
      let art = a || 'hit';
      if (p === 'hat') {
        if (sixteenth && e < 0.6) continue;
        // A drummer's hand: the beat strong, the offbeat lighter, the
        // sixteenths ghosted, beat 1 of a phrase pushed, and an open hat
        // at the end of every fourth bar to lift into the next phrase.
        acc = sixteenth ? 0.4 : off ? 0.68 : near(b % 2, 0) ? 1.08 : 0.92;
        if (c.barIn % 4 === 0 && near(b, 0)) acc = 1.2;
        if (c.barIn % 4 === 3 && near(b, 3.5) && art !== 'open') art = 'open';
      }
      out.push({ i: p, a: art, b, d: art === 'open' ? 0.5 : 0.25, v: clamp(v * acc * (0.75 + 0.35 * e) * (0.9 + c.rng.next() * 0.2), 0.05, 1) });
    }
  }
  // The build-up: a snare roll that doubles its speed every bar, from a
  // whisper to a crack.
  if (sec === 'build') {
    const drum = c.has('snare') ? 'snare' : 'clap';
    const unit = [1, 0.5, 0.25, 0.25][Math.min(3, Math.floor((c.barIn * 4) / c.len))];
    for (let b = 0; b < c.beats - 1e-6; b += unit) {
      const prog = (c.barIn + b / c.beats) / c.len;
      out.push({ i: drum, a: prog < 0.5 ? 'ghost' : 'hit', b, d: 0.2, v: clamp(0.15 + 0.5 * prog * prog, 0.05, 1) });
    }
    return out;
  }
  return vary(c, out, loud);
}

// A drummer does not play the same bar four times. Ghost notes on the
// snare, a pushed kick every other bar, and at the end of each phrase a
// turn-around: a kick on the "and", a short snare fill into the next bar.
function vary(c, out, loud) {
  const rng = c.rng;
  const four = out.filter((e) => e.i === 'kick').length >= 4;
  const back = out.some((e) => e.i === 'snare') ? 'snare' : out.some((e) => e.i === 'clap') ? 'clap' : null;
  const at = (i, b) => out.some((e) => e.i === i && near(e.b, b));
  const add = (i, b, v, a = 'hit') => {
    if (c.has(i) && !at(i, b)) out.push({ i, a, b, d: 0.2, v });
  };
  if (back === 'snare' && c.energy > 0.4) {
    for (const b of [0.75, 1.75, 2.75, 3.25]) if (rng.chance(loud ? 0.3 : 0.18)) add('snare', b, 0.14 + 0.08 * c.energy, 'ghost');
  }
  if (!four && c.barIn % 2 === 1 && rng.chance(0.6)) add('kick', rng.pick([1.5, 2.5, 3.5]), 0.6);
  const phraseEnd = c.barIn % 4 === 3 && c.barIn < c.len - 1;
  const sectionEnd = c.barIn === c.len - 1;
  if (phraseEnd && !sectionEnd) {
    if (!four) add('kick', 3.5, 0.65);
    if (back && rng.chance(0.7)) {
      const pat = rng.pick([[3.25, 3.5, 3.75], [3.5, 3.75], [3, 3.25, 3.5, 3.75]]);
      pat.forEach((b, k) => add(back === 'snare' ? 'snare' : 'clap', b, 0.3 + 0.12 * k, k === 0 ? 'ghost' : 'hit'));
    }
  }
  if (sectionEnd && back && !c.S.fill) {
    for (let k = 0; k < 4; k++) add(back, 3 + k * 0.25, 0.35 + k * 0.12);
  }
  return out;
}

function tomFill(c) {
  const ms = [62, 59, 55, 52, 50, 47, 45, 43];
  return ms.map((m, k) => ({ i: 'etom', a: 'hit', b: 2 + k * 0.25, d: 0.25, m, v: 0.55 + k * 0.05 }));
}

// ---- the form ---------------------------------------------------------------------

const FORM = [['intro', 4], ['verse', 8], ['build', 4], ['chorus', 8], ['break', 4], ['verse', 8], ['build', 4], ['chorus', 8], ['lift', 8], ['outro', 4]];
const ENERGY = { intro: 0.25, verse: 0.5, build: 0.6, chorus: 0.85, break: 0.3, lift: 1, outro: 0.5 };
export const POP_LABELS = { intro: 'INTRO', verse: 'VERSE', build: 'BUILD-UP', chorus: 'CHORUS', break: 'BREAKDOWN', lift: 'FINAL CHORUS', outro: 'OUTRO', end: 'FINAL CHORD', rest: '…' };
const GATE = { moog: 0.55, pluck: 0.75, piano: 0.85, hpsi: 0.95, bell: 1 };

const NAMES_A = ['Neon', 'Chrome', 'Golden', 'Velvet', 'Electric', 'Silver', 'Magic', 'Satellite', 'Crystal', 'Paper', 'Rocket', 'Summer', 'Midnight', 'Pocket', 'Digital', 'Royal'];
const NAMES_B = ['Machine', 'Fugue', 'Heartbeat', 'Overture', 'Rondo', 'Signal', 'Anthem', 'Toccata', 'Popcorn', 'Engine', 'Prelude', 'Minuet', 'Pulse', 'Loop', 'Canon', 'Groove'];

export class PopComposer {
  constructor({ style = 'moog', riff = null, prog = null, seed = 1, intensity = 0.6, auto = true, tempo = 1, avail = {}, loop = true }) {
    this.styleId = POP_STYLES[style] ? style : 'moog';
    this.riffId = riff && riff !== 'auto' ? riff : null;
    this.progId = prog && PROGRESSION_BY[prog] ? prog : null;
    let h = 0;
    for (const ch of `${this.styleId}/${this.riffId || ''}/${this.progId || ''}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    this.rng = new Rng((seed ^ h) >>> 0);
    this.intensity = intensity;
    this.auto = auto;
    this.tempo = tempo;
    this.avail = avail;
    this.loop = loop;
    this.ended = false;
    this.barNo = 0;
    this.newSong();
  }

  get S() {
    return this.song.S;
  }

  pickRiff(S) {
    const rng = this.rng;
    const id = this.riffId || rng.pick(S.riffs);
    if (id === 'motif' || !RIFF_BY[id]) return makeMotif(rng, rng.pick(S.motifs || MOTIF_KINDS));
    return RIFF_BY[id];
  }

  newSong() {
    const rng = this.rng;
    const S = { ...POP_STYLES[this.styleId], harmony: 'triad', beats: 4 };
    const def = this.pickRiff(S);
    // The mode: the chosen loop's, else the riff's (now and then flipped), else the style's.
    let minor;
    if (this.progId) minor = PROGRESSION_BY[this.progId].minor;
    else if (def.minor != null) minor = rng.chance(0.12) ? !def.minor : def.minor;
    else minor = rng.chance(S.minor);
    S.isMinor = minor;
    const sameMode = (id) => PROGRESSION_BY[id] && PROGRESSION_BY[id].minor === minor;
    let verse = this.progId;
    if (!verse) {
      const fits = S.progs.filter(sameMode);
      verse = rng.pick(fits.length ? fits : PROGRESSIONS.filter((p) => p.minor === minor).map((p) => p.id));
    }
    let chorus = verse;
    if (!this.progId) {
      const rot = (ROTATIONS[verse] || [verse]).filter(sameMode);
      if (rot.length) chorus = rng.pick(rot);
    }
    const riff = prepareRiff(def, minor);
    const key = rng.pick(S.keys);
    const slow = !!S.slow;
    const vBars = loopBars(PROGRESSION_BY[verse].chords, 4, slow);
    const cBars = loopBars(PROGRESSION_BY[chorus].chords, 4, slow);
    const tonic = minor ? 'i' : 'I';
    const sec = {
      intro: { chords: repeatTo(chordBars(tonic, 4), 4), loop: chordBars(tonic, 4), prog: null },
      verse: { chords: repeatTo(vBars, 8), loop: vBars, prog: verse },
      build: { chords: chordBars(minor ? 'bVI bVI bVII bVII' : 'IV IV V V', 4), loop: chordBars(minor ? 'bVI bVII' : 'IV V', 4), prog: null },
      chorus: { chords: repeatTo(cBars, 8), loop: cBars, prog: chorus },
      break: { chords: repeatTo(vBars, 4), loop: vBars, prog: verse },
      lift: { chords: repeatTo(cBars, 8), loop: cBars, prog: chorus },
      outro: { chords: repeatTo(cBars, 4), loop: cBars, prog: chorus },
    };
    // The riff's octave: its average note near the middle of the lead's range.
    const notes = riff.bars.flat();
    const mean = notes.reduce((a, n) => a + fromDegrees(n.deg, n.alt, 60 + key, minor), 0) / Math.max(1, notes.length);
    const want = S.riffCenter ?? 72;
    const octave = Math.round((want - mean) / 12);
    this.song = {
      S, key, minor, riff, verse, chorus, sec, octave,
      bpm: rng.int(S.bpm[0], S.bpm[1]),
      lift: rng.pick(S.lift),
      name: `${rng.pick(NAMES_A)} ${rng.pick(NAMES_B)}`,
      answers: rng.chance(0.75),
    };
    this.plan = [];
    for (const [f, len] of FORM) for (let i = 0; i < len; i++) this.plan.push({ section: f, i, len });
    this.plan.push({ section: 'end', i: 0, len: 1 });
    this.pos = 0;
    this.state = {};
  }

  // NEXT: skip to the next section.
  next() {
    const cur = this.plan[this.pos]?.section;
    while (this.pos < this.plan.length - 1 && this.plan[this.pos].section === cur) this.pos++;
  }

  // Straight to the key-change chorus.
  climax() {
    const at = this.plan.findIndex((p, k) => k >= this.pos && p.section === 'lift');
    if (at >= 0) this.pos = at;
  }

  end() {
    const at = this.plan.findIndex((p, k) => k >= this.pos && p.section === 'outro');
    if (at > this.pos) this.pos = at;
    else if (at < 0) this.pos = this.plan.length - 1;
    this.loop = false;
  }

  energyFor(section, i, len) {
    let e = ENERGY[section] ?? 0.5;
    if (section === 'build') e = 0.55 + (0.3 * i) / len;
    if (section === 'outro') e = 0.55 - (0.3 * i) / len;
    if (!this.auto) return this.intensity;
    return clamp(e * (0.55 + this.intensity * 0.8), 0.05, 1);
  }

  has(p) {
    return this.avail[POP_SECTION_OF[p]] !== false;
  }

  // How the riff moves over a section: 'hold', 'seq', 'arp' or 'transpose'.
  moveFor(section) {
    const S = this.S;
    const R = this.song.riff;
    const mode = section === 'intro' ? 'hold' : S.modes[section] || 'hold';
    if (R.kind === 'arp') return 'arp';
    if (mode === 'hold') return 'hold';
    if (R.kind === 'chromatic') return 'transpose';
    return S.preferMove === 'transpose' && this.rng.chance(0.5) ? 'transpose' : 'seq';
  }

  // One bar of the riff over `chords`, and a label for what was done to it.
  riffBar(step, chords, key) {
    const song = this.song;
    const R = song.riff;
    const minor = song.minor;
    const nb = R.bars.length;
    const tonic = 60 + key + 12 * song.octave;
    let src;
    let j;
    const labels = [];
    if (step.section === 'break') {
      j = Math.floor(step.i / 2) % nb;
      const half = step.i % 2;
      src = R.bars[j].filter((n) => (half ? n.b >= 2 - 1e-6 : n.b < 2 - 1e-6)).map((n) => ({ ...n, b: (n.b - half * 2) * 2, d: n.d * 2 }));
      labels.push('HALF TIME');
    } else {
      j = step.i % nb;
      src = R.bars[j];
    }
    if (!this.state.move || step.i === 0) this.state.move = this.moveFor(step.section);
    const move = this.state.move;
    const home = R.home[j];
    const hd = rootDeg(home, minor);
    const scale = (minor ? MIN : MAJ).map((x) => (key + x) % 12);
    let firstShift = null;
    let notes = src.map((n) => {
      const ch = chordAt(chords, n.b);
      let m;
      if (move === 'seq' || move === 'arp') {
        let sh = (((rootDeg(ch, minor) - hd) % 7) + 7) % 7;
        if (sh > 3) sh -= 7;
        if (firstShift == null) firstShift = sh;
        m = fromDegrees(n.deg + sh, n.alt, tonic, minor);
      } else if (move === 'transpose') {
        let st = pc(ch.r - home.r);
        if (st > 6) st -= 12;
        if (firstShift == null) firstShift = st;
        m = fromDegrees(n.deg, n.alt, tonic, minor);
        // Keep the riff's third in line with the new chord's.
        const rel = pc(m - (tonic + home.r));
        const homeMinor = ['min', 'dim'].includes(home.q);
        const toMinor = ['min', 'dim'].includes(ch.q);
        if (homeMinor && !toMinor && rel === 3) m += 1;
        if (!homeMinor && toMinor && rel === 4) m -= 1;
        m += st;
      } else m = fromDegrees(n.deg, n.alt, tonic, minor);
      return { b: n.b, d: n.d, m };
    });
    // Notes that clash with the chord move to the nearest chord note.
    for (const n of notes) {
      const ch = chordAt(chords, n.b);
      const tones = chordPcs(key, ch);
      if (tones.includes(pc(n.m))) continue;
      const strong = n.d >= 0.75 || near(n.b, ch.at) || (near(n.b, Math.round(n.b)) && Math.round(n.b) % 2 === 0);
      const rub = tones.some((t) => [1, 11].includes(pc(n.m - t)));
      const outside = !scale.includes(pc(n.m));
      if (move === 'arp' || (strong && (move === 'hold' || rub || outside)) || (rub && n.d >= 1 && R.kind !== 'chromatic')) n.m = nearestPc(n.m, tones);
    }
    // Every fourth bar (eighth for two-bar riffs) answers: the riff breaks off
    // and lands on a chord note.
    const phrase = nb > 1 ? 8 : 4;
    if (song.answers && ['verse', 'chorus', 'lift'].includes(step.section) && step.i % phrase === phrase - 1 && step.i < step.len) {
      const keep = notes.filter((n) => n.b < 2 - 1e-6);
      const ch = chordAt(chords, 2);
      const last = keep.length ? keep[keep.length - 1].m : tonic;
      const root = pc(key + ch.r);
      let m = nearestPc(last - 1, [root]);
      if (Math.abs(m - last) > 5) m = nearestPc(last, chordPcs(key, ch));
      notes = [...keep, { b: 2, d: 1.75, m }];
      labels.push('ANSWER');
    }
    if (move === 'seq') labels.unshift(firstShift ? `SEQUENCE ${firstShift > 0 ? '↑' : '↓'}${Math.abs(firstShift)}` : 'SEQUENCE · HOME');
    else if (move === 'transpose') labels.unshift(firstShift ? `TRANSPOSED ${firstShift > 0 ? '+' : '−'}${Math.abs(firstShift)}` : 'TRANSPOSED · HOME');
    else if (move === 'arp') labels.unshift('BROKEN CHORDS');
    else labels.unshift(step.section === 'intro' ? 'THE RIFF ALONE' : 'RIFF HOLDS · CHORDS MOVE');
    return { notes, label: labels.join(' · ') };
  }

  nextBar() {
    if (this.pos >= this.plan.length) {
      if (!this.loop) {
        this.ended = true;
        return null;
      }
      this.newSong();
      return this.restBar();
    }
    const step = this.plan[this.pos++];
    const song = this.song;
    const S = song.S;
    if (step.section === 'end') return this.endBar();
    const lift = step.section === 'lift' ? song.lift : 0;
    const key = (song.key + lift) % 12;
    const sec = song.sec[step.section];
    const chords = sec.chords[step.i];
    const nextStep = this.plan[this.pos];
    const nextChord = nextStep && nextStep.section !== 'end' ? song.sec[nextStep.section].chords[nextStep.i][0] : null;
    const energy = this.energyFor(step.section, step.i, step.len);
    const rng = this.rng;
    const c = {
      rng, S, key, minor: song.minor, chords, nextChord, beats: 4, energy, state: this.state, section: step.section, barIn: step.i, len: step.len,
      bassLo: S.bassLo ?? 33,
      has: (p) => this.has(p),
      vel: (base) => clamp(base * (0.62 + 0.55 * energy) * (0.94 + rng.next() * 0.1), 0.05, 1),
    };
    let events = [];
    const add = (evs) => {
      for (const e of evs) if (this.has(e.i)) events.push(e);
    };

    // The riff.
    const { notes, label } = this.riffBar(step, chords, key);
    const players = S.lead[step.section] || S.lead.verse;
    const quiet = step.section === 'outro' ? 1 - (0.4 * step.i) / step.len : 1;
    players.forEach((p, k) => {
      if (k > 0 && energy < 0.55 && step.section !== 'lift') return;
      add(this.leadEvents(p, notes, c, k === 0 ? 0 : S.double?.[p] ?? 0, (k === 0 ? 0.74 : 0.5) * quiet));
    });
    let riffLabel = label;
    if (players.length > 1 && (energy >= 0.55 || step.section === 'lift')) riffLabel += ' · DOUBLED';
    if (step.section === 'lift' && step.i === 0 && song.lift) riffLabel = `KEY CHANGE +${song.lift} · ${riffLabel}`;

    // The band, layer by layer (the intro starts with the riff alone).
    if (step.section !== 'intro' || step.i >= 2) {
      for (const spec of S.parts) {
        if (spec.min != null && energy < spec.min) continue;
        if (spec.in && !spec.in.includes(step.section)) continue;
        if (spec.out && spec.out.includes(step.section)) continue;
        if (!this.has(spec.i)) continue;
        if (step.section === 'intro' && spec.fn !== 'bass' && spec.fn !== 'walk' && spec.fn !== 'comp') continue;
        add(PARTS[spec.fn](c, spec));
      }
    }
    add(drumPart(c));
    const lastOfSection = step.i === step.len - 1 && nextStep && nextStep.section !== step.section;
    if (lastOfSection && S.fill === 'toms' && ['verse', 'chorus'].includes(step.section)) {
      events = events.filter((e) => !(e.b >= 2 && ['snare', 'clap', 'kick'].includes(e.i)));
      add(tomFill(c));
    }
    if (step.section === 'build' && step.i === 0) add([{ i: 'sweep', a: 'hit', b: 0, d: 4 * step.len - 0.5, v: 0.45 }]);
    if (step.section === 'break' && step.i === 0) add([{ i: 'sweep', a: 'fall', b: 0, d: 6, v: 0.3 }]);
    if (step.i === 0 && ['verse', 'chorus', 'lift'].includes(step.section)) add([{ i: 'crash', a: 'hit', b: 0, d: 2, v: 0.3 + energy * 0.3 }]);

    events = this.finish(events, c);
    const bpm = clamp(song.bpm * this.tempo, 40, 260);
    this.lastBpm = bpm;
    this.barNo++;
    const loopLen = sec.loop.length;
    return {
      beats: 4, bpm, events,
      info: {
        section: step.section, label: POP_LABELS[step.section], name: song.name, bar: this.barNo,
        chord: chordName(key, chords[0]), roman: chords.map((ch) => ch.name).join('–'), key: NAMES[key] + (song.minor ? ' minor' : ' major'),
        riff: riffLabel, riffName: song.riff.name, riffId: song.riff.id, flipped: song.riff.flipped,
        prog: sec.prog ? PROGRESSION_BY[sec.prog].name : null, progId: sec.prog,
        loop: sec.loop.map((bar) => bar.map((ch) => ({ roman: ch.name, name: chordName(key, ch) }))), loopBar: step.i % loopLen,
      },
    };
  }

  leadEvents(p, notes, c, shift, vel) {
    const r = POP_RANGE[p];
    const gate = GATE[p] ?? 0.92;
    return notes.map((n, k) => {
      let m = n.m + shift;
      if (r) m = fit(m, r[0], r[1]);
      const accent = near(n.b, Math.round(n.b)) ? 0.06 : 0;
      const prev = notes[k - 1];
      return { i: p, a: 'sus', b: n.b, d: Math.max(0.08, n.d * gate), m, v: c.vel(vel + accent), glide: !!prev && Math.abs(prev.b + prev.d - n.b) < 0.01 && n.d >= 0.5, lead: true };
    });
  }

  // Ranges, nothing past the bar line, and keys or pads that rub a semitone
  // against a held riff note move to the nearest chord note that does not.
  finish(events, c) {
    const lead = events.filter((e) => e.lead && e.d >= 0.5);
    const out = [];
    for (const e of events) {
      if (!e.lead && e.m != null && lead.length && e.m >= 52 && !['drums', 'bass'].includes(POP_SECTION_OF[e.i]) && e.i !== 'gtr') {
        const over = lead.filter((l) => l.b < e.b + Math.min(e.d, 1) - 0.05 && l.b + l.d > e.b + 0.05);
        const rubs = (m) => over.some((l) => [1, 11].includes(pc(l.m - m)));
        if (rubs(e.m)) {
          const triad = chordPcs(c.key, chordAt(c.chords, e.b));
          for (let k = 1; k <= 5; k++) {
            const m = [e.m - k, e.m + k].find((x) => triad.includes(pc(x)) && !rubs(x));
            if (m != null) {
              e.m = m;
              break;
            }
          }
        }
      }
      if (e.m != null && POP_RANGE[e.i]) {
        const [lo, hi] = POP_RANGE[e.i];
        if (e.m < lo || e.m > hi) e.m = fit(e.m, lo, hi);
        if (e.m > hi || e.m < lo) continue;
      }
      if (e.b >= c.beats - 1e-6) continue;
      e.d = Math.max(0.05, e.d);
      e.v = clamp(e.v, 0.02, 1);
      if (!e.glide) delete e.glide;
      delete e.lead;
      out.push(e);
    }
    return out;
  }

  endBar() {
    const song = this.song;
    const S = song.S;
    const key = (song.key + song.lift) % 12;
    const ch = { r: 0, q: song.minor ? 'min' : 'maj', at: 0 };
    const tones = chordTones(key, ch, S);
    const v = voice(tones, 66, null, 3);
    const events = [];
    for (const p of S.ending || []) {
      if (!this.has(p)) continue;
      const r = POP_RANGE[p];
      if (p === 'gtr') {
        events.push({ i: p, a: 'sus', b: 0, d: 4, m: fit(key + 36, 40, 51), v: 0.6 });
        continue;
      }
      for (const m of v) events.push({ i: p, a: 'sus', b: 0, d: 4, m: r ? fit(m, r[0], r[1]) : m, v: 0.5 });
    }
    if (this.has(S.endBass)) events.push({ i: S.endBass, a: 'sus', b: 0, d: 4, m: fit(key + 36, 33, 44), v: 0.6 });
    if (this.has('crash')) events.push({ i: 'crash', a: 'hit', b: 0, d: 2, v: 0.6 });
    this.barNo++;
    return {
      beats: 4, bpm: (this.lastBpm || song.bpm * this.tempo) * 0.85, events: this.finish(events, { key, chords: [ch], beats: 4 }),
      info: { section: 'end', label: POP_LABELS.end, name: song.name, bar: this.barNo, chord: chordName(key, ch), key: NAMES[key] + (song.minor ? ' minor' : ' major'), riffName: song.riff.name },
    };
  }

  restBar() {
    this.barNo++;
    return { beats: 4, bpm: 100, events: [], info: { section: 'rest', name: this.song.name, bar: this.barNo } };
  }
}

function nearestPc(m, ps) {
  for (let k = 0; k < 12; k++) {
    if (ps.includes(pc(m + k))) return m + k;
    if (ps.includes(pc(m - k))) return m - k;
  }
  return m;
}

export function writePop(seed, style, bars = 80, opts = {}) {
  const c = new PopComposer({ seed, style, ...opts });
  return Array.from({ length: bars }, () => c.nextBar());
}

export { RIFFS, PROGRESSIONS };
