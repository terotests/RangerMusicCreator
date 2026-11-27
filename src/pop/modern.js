// SPDX-License-Identifier: MIT
// MODERN: the Pop Machine's bass-led dance tracks. Here the sub bass is the
// lead: long low notes that walk high, middle, low and then bend up a little,
// pumping under a four-on-the-floor kick and a clap on two and four. A simple
// lead theme, violins and quiet horns sit well below the bass. The drum machine
// fills in only at the end of a section.
//
// Form: intro, drop (the 16-bar main theme), variation, breakdown (the bass
// and kick drop out and the theme plays alone, ending on a drum hit), drop
// again, variation, outro.
//
// Bars and events have the same shape as the PopComposer's, so the same page,
// stage and SAVE WAV play them. Pure (no Web Audio).

import { Rng } from '../rng.js';
import { bars as chordBars, pcs as chordPcs, fit, NAMES } from '../jazz/theory.js';
import { chordName } from '../jazz/ragtime.js';
import { voice } from '../retro/composer.js';
import { POP_RANGE, POP_SECTION_OF } from './bands.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pc = (m) => ((m % 12) + 12) % 12;
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];

// Register of each bass bar: high, middle, low.
const REG = { H: 45, M: 38, L: 31 };

// Bass rhythms for one bar: [beat, length, pitch] with pitch 'R' (the root in
// the bar's register), 'O' (an octave up) or '5' (the fifth above).
const BASS_BARS = {
  long: [[[0, 3.9, 'R']], [[0, 2.9, 'R'], [3, 0.9, 'O']], [[0, 1.9, 'R'], [2, 1.9, 'R']]],
  bounce: [[[0, 1.4, 'R'], [1.5, 2.4, 'R']], [[0, 0.7, 'R'], [1, 2.9, 'R']], [[0, 2.9, 'R'], [3, 0.4, 'O'], [3.5, 0.4, 'R']], [[0, 1.4, 'R'], [1.5, 1.4, '5'], [3, 0.9, 'R']]],
  slow: [[[0, 3.9, 'R']], [[0, 3.4, 'R'], [3.5, 0.4, 'O']]],
};

export const MODERN_STYLES = {
  subpulse: {
    name: 'SUB PULSE', era: '2020s', tab: 'modern',
    desc: 'Deep house: a long sub bass walks high, middle, low and bends up, pumping under the kick and clap',
    bpm: [122, 125], keys: [5, 7, 4, 9, 2], minor: 0.7,
    loops: { minor: ['i bVI bIII bVII', 'i bVII bVI bVII', 'i iv bVI bVII'], major: ['vi IV I V', 'I V vi IV'] },
    shape: [['H', 'M', 'L', 'L'], ['H', 'H', 'M', 'L']], vary: [['L', 'M', 'H', 'M'], ['M', 'L', 'H', 'L']],
    rhythm: 'long', varRhythm: 'bounce', rise: [1, 2, 2], hat: 0.75,
  },
  basshouse: {
    name: 'BASS HOUSE', era: '2020s', tab: 'modern',
    desc: 'A bouncier sub line with octave jumps and offbeat restarts, horn stabs and a harder clap',
    bpm: [125, 128], keys: [7, 5, 9, 4], minor: 0.85,
    loops: { minor: ['i i bVI bVII', 'i bVII bVI bVII', 'i bIII bVII bVI'], major: ['vi IV I V'] },
    shape: [['H', 'M', 'L', 'L'], ['M', 'H', 'L', 'M']], vary: [['L', 'H', 'M', 'L'], ['H', 'L', 'M', 'L']],
    rhythm: 'bounce', varRhythm: 'bounce', rise: [2, 3], hat: 0.65, hornsUp: true,
  },
  nightdrive: {
    name: 'NIGHT DRIVE', era: '2020s', tab: 'modern',
    desc: 'Slower and darker: very long sub notes, wide strings and a theme that takes its time',
    bpm: [116, 120], keys: [2, 4, 5, 7], minor: 1,
    loops: { minor: ['i bVI bVII i', 'i iv bVI bV', 'i bVI bIII bVII'], major: [] },
    shape: [['H', 'M', 'L', 'L'], ['M', 'M', 'L', 'L']], vary: [['L', 'M', 'H', 'H'], ['L', 'L', 'M', 'H']],
    rhythm: 'slow', varRhythm: 'long', rise: [1, 2], hat: 0.85,
  },
};
export const MODERN_STYLE_IDS = Object.keys(MODERN_STYLES);

const FORM = [['intro', 8], ['drop', 16], ['variation', 16], ['breakdown', 8], ['drop2', 16], ['variation2', 16], ['outro', 8]];
const ENERGY = { intro: 0.4, drop: 0.75, variation: 0.85, breakdown: 0.35, drop2: 0.9, variation2: 1, outro: 0.6 };
export const MODERN_LABELS = { intro: 'INTRO', drop: 'DROP · MAIN THEME', variation: 'VARIATION', breakdown: 'BREAKDOWN · THEME ALONE', drop2: 'DROP', variation2: 'VARIATION', outro: 'OUTRO', end: 'LAST HIT', rest: '…' };
const BASS_ON = new Set(['drop', 'variation', 'drop2', 'variation2', 'outro']);
const REG_NAME = { H: 'HIGH', M: 'MIDDLE', L: 'LOW' };

// The theme's rhythms: a call bar and an answer bar. [beat, length].
const CALLS = [
  [[0, 1.5], [1.5, 0.5], [2, 2]],
  [[0, 0.75], [0.75, 0.75], [1.5, 2.5]],
  [[0, 1], [1, 1], [2, 1], [3, 1]],
  [[0.5, 1], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
  [[0, 1.5], [1.5, 1.5], [3, 1]],
];
const ANSWERS = [[[0, 2], [2, 2]], [[0, 4]], [[0, 1], [1, 3]], [[0, 3], [3, 1]]];
// Which chord note each theme note takes (0 = the lowest chord note in the
// theme's octave, 1 the next and so on): the same shape over every chord.
const CALL_SHAPES = [[2, 1, 0, 1], [0, 1, 2, 1], [0, 2, 1, 0], [1, 2, 3, 2], [2, 3, 2, 1]];
const ANSWER_SHAPES = [[1, 0], [2, 1], [0, 1]];

const NAMES_A = ['Sub', 'Low', 'Deep', 'Night', 'Neon', 'Velvet', 'Concrete', 'Mono', 'Pulse', 'Glass', 'Heavy', 'Late'];
const NAMES_B = ['Pressure', 'Motion', 'Floor', 'Drive', 'Weight', 'Signal', 'Gravity', 'Current', 'Engine', 'Echo', 'Tide', 'Frequency'];

export class ModernComposer {
  constructor({ style = 'subpulse', seed = 1, intensity = 0.6, auto = true, tempo = 1, avail = {}, loop = true }) {
    this.styleId = MODERN_STYLES[style] ? style : 'subpulse';
    let h = 0;
    for (const ch of `modern/${this.styleId}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
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

  newSong() {
    const rng = this.rng;
    const S = MODERN_STYLES[this.styleId];
    const minor = !S.loops.major.length || rng.chance(S.minor);
    const prog = rng.pick(minor ? S.loops.minor : S.loops.major);
    const loop = chordBars(prog, 4);
    const key = rng.pick(S.keys);
    const pickRhythm = (kind) => Array.from({ length: 4 }, () => rng.pick(BASS_BARS[kind]));
    const call = rng.pick(CALLS);
    const answer = rng.pick(ANSWERS);
    this.song = {
      S, key, minor, prog, loop,
      bpm: rng.int(S.bpm[0], S.bpm[1]),
      name: `${rng.pick(NAMES_A)} ${rng.pick(NAMES_B)}`,
      bass: { shape: rng.pick(S.shape), rhythm: pickRhythm(S.rhythm), rise: rng.pick(S.rise) },
      vary: { shape: rng.pick(S.vary), rhythm: pickRhythm(S.varRhythm), rise: rng.pick(S.rise) },
      theme: {
        call, answer,
        callShape: rng.pick(CALL_SHAPES), answerShape: rng.pick(ANSWER_SHAPES),
        center: rng.pick([62, 64, 65]),
      },
      hornBeat: rng.pick([0, 0.5, 2.5]),
    };
    this.plan = [];
    for (const [f, len] of FORM) for (let i = 0; i < len; i++) this.plan.push({ section: f, i, len });
    this.plan.push({ section: 'end', i: 0, len: 1 });
    this.pos = 0;
    this.prevPad = null;
    this.prevHorn = null;
  }

  next() {
    const cur = this.plan[this.pos]?.section;
    while (this.pos < this.plan.length - 1 && this.plan[this.pos].section === cur) this.pos++;
  }

  // KEY CHANGE! on this page jumps to the second drop, right after the breakdown's drum hit.
  climax() {
    const at = this.plan.findIndex((p, k) => k >= this.pos && p.section === 'drop2');
    if (at >= 0) this.pos = at;
  }

  end() {
    const at = this.plan.findIndex((p, k) => k >= this.pos && p.section === 'outro');
    if (at > this.pos) this.pos = at;
    else if (at < 0) this.pos = this.plan.length - 1;
    this.loop = false;
  }

  has(p) {
    return this.avail[POP_SECTION_OF[p]] !== false;
  }

  energyFor(section, i, len) {
    let e = ENERGY[section] ?? 0.6;
    if (section === 'outro') e = 0.7 - (0.4 * i) / len;
    if (!this.auto) return this.intensity;
    return clamp(e * (0.55 + this.intensity * 0.8), 0.05, 1);
  }

  // ---- the sub bass ---------------------------------------------------------------

  bassBar(step, chord, spb, c) {
    const song = this.song;
    const varied = step.section.startsWith('variation');
    const plan = varied ? song.vary : song.bass;
    const slot = step.i % 4;
    const reg = plan.shape[slot];
    const rootPc = pc(song.key + chord.r);
    const base = fit(rootPc + 24, REG[reg] - 5, REG[reg] + 6);
    const cells = plan.rhythm[slot];
    const out = [];
    const quiet = step.section === 'outro' ? 1 - (0.35 * step.i) / step.len : 1;
    let prevM = null;
    cells.forEach(([b, d, w], k) => {
      let m = base;
      if (w === 'O') m = base + 12 <= 52 ? base + 12 : base;
      if (w === '5') m = base + 7;
      const last = k === cells.length - 1;
      // A new pitch slides in; the same pitch is struck again, so it pumps.
      const e = { i: 'sub', a: 'sus', b, d, m, v: c.vel(0.86 * quiet), spb, glide: prevM != null && prevM !== m };
      prevM = m;
      // The fourth bar's last note bends up a little: the small rise into the next round.
      if (slot === 3 && last && d >= 0.9) {
        e.rise = plan.rise;
        e.riseAt = d >= 2 ? 0.55 : 0.3;
      }
      out.push(e);
    });
    const label = `SUB BASS · ${REG_NAME[reg]}${slot === 3 ? ` · RISE +${plan.rise}` : ''}${varied ? ' · VARIED' : ''}`;
    return { events: out, label };
  }

  // ---- the theme --------------------------------------------------------------------

  // The 16-bar main theme: four four-bar phrases (call, answer, call, answer),
  // the third phrase a step brighter, the last one closing on the root.
  themeBar(n, chord) {
    const song = this.song;
    const T = song.theme;
    const phrase = Math.floor(n / 4) % 4;
    const inPhrase = n % 4;
    const isCall = inPhrase % 2 === 0;
    const rhythm = isCall ? T.call : T.answer;
    let shape = isCall ? T.callShape : T.answerShape;
    let lift = phrase === 2 ? 1 : 0;
    if (!isCall && inPhrase === 3) shape = phrase === 3 ? [...shape.slice(0, -1), 0] : [...shape.slice(0, -1), 1];
    const tones = chordPcs(song.key, chord).slice(0, 3);
    const ladder = [];
    for (let m = T.center - 6; ladder.length < 7; m++) if (tones.includes(pc(m))) ladder.push(m);
    return rhythm.map(([b, d], k) => ({ b, d, m: ladder[clamp(shape[k % shape.length] + lift, 0, ladder.length - 1)] }));
  }

  // The variation: the same notes, the second half an octave up, and a passing
  // note between call notes a third apart.
  variedTheme(n, chord, notes) {
    const song = this.song;
    const sc = (song.minor ? MIN : MAJ).map((x) => (song.key + x) % 12);
    const out = [];
    notes.forEach((x, k) => {
      const nx = notes[k + 1];
      const up = n >= 8 ? 12 : 0;
      if (nx && x.d >= 1 && Math.abs(nx.m - x.m) >= 3 && Math.abs(nx.m - x.m) <= 4) {
        const mid = Math.round((x.m + nx.m) / 2);
        const pass = sc.includes(pc(mid)) ? mid : mid + 1;
        out.push({ b: x.b, d: x.d - 0.5, m: x.m + up }, { b: x.b + x.d - 0.5, d: 0.5, m: pass + up });
      } else out.push({ ...x, m: x.m + up });
    });
    void chord;
    return out;
  }

  // ---- drums --------------------------------------------------------------------------

  drums(step, c) {
    const sec = step.section;
    const out = [];
    const S = this.S;
    const e = c.energy;
    const lastBar = step.i === step.len - 1;
    if (sec === 'breakdown') {
      // The breakdown ends on a drum hit: a roll, then one big kick and clap.
      if (lastBar) {
        for (let b = 1; b < 3.5 - 1e-6; b += 0.25) out.push({ i: 'snare', a: b < 2 ? 'ghost' : 'hit', b, d: 0.2, v: clamp(0.18 + 0.28 * (b - 1), 0.1, 0.85) });
        out.push({ i: 'dkick', a: 'boom', b: 3.5, d: 0.5, v: 1 }, { i: 'mclap', a: 'flam', b: 3.5, d: 0.3, v: 0.85 }, { i: 'etom', a: 'hit', b: 3.5, d: 0.5, m: 40, v: 0.7 });
      }
      return out;
    }
    if (sec === 'outro' && step.i >= step.len - 2) {
      out.push({ i: 'dkick', a: 'hit', b: 0, d: 0.3, v: 0.8 - 0.2 * (step.i - step.len + 2) });
      return out;
    }
    const fill = lastBar && ['drop', 'variation2', 'intro'].includes(sec);
    const clapOn = sec !== 'intro' || step.i >= 2;
    for (let b = 0; b < 4; b++) {
      if (fill && b === 3) continue;
      out.push({ i: 'dkick', a: 'hit', b, d: 0.3, v: clamp((b === 0 ? 0.95 : 0.88) * (0.85 + 0.2 * e), 0.1, 1) });
    }
    if (clapOn) out.push(...this.claps(step, e, fill));
    // A soft offbeat hat only when the track is at full pace.
    if (e >= S.hat && sec !== 'intro') for (let b = 0.5; b < 4; b += 1) out.push({ i: 'hat', a: 'hit', b, d: 0.2, v: 0.22 + 0.1 * (b === 3.5 ? 1 : 0) });
    // The drum machine lifts only at the end of a section: a snare and tom fill.
    if (fill) {
      const toms = [55, 52, 48, 45];
      for (let k = 0; k < 4; k++) out.push({ i: 'snare', a: 'hit', b: 3 + k * 0.25, d: 0.2, v: 0.4 + 0.15 * k });
      if (sec !== 'intro') toms.forEach((m, k) => out.push({ i: 'etom', a: 'hit', b: 2 + k * 0.25, d: 0.25, m, v: 0.45 + 0.05 * k }));
    }
    return out;
  }

  // The clap on two and four, kept below the kick and never quite the same:
  // beat 4 a little lighter, now and then a flam or a ghost clap before it,
  // a pushed clap at the end of every eighth bar, and the varied sections
  // swap in their own pattern every other bar.
  claps(step, e, fill) {
    const rng = this.rng;
    const out = [];
    const v = (x) => clamp(x * (0.36 + 0.16 * e) * (0.88 + rng.next() * 0.2), 0.05, 1);
    const add = (b, x, a = 'hit') => out.push({ i: 'mclap', a, b, d: 0.25, v: v(x) });
    const varied = step.section.startsWith('variation');
    add(1, 1, rng.chance(0.15) ? 'flam' : 'hit');
    if (!fill) {
      if (varied && step.i % 2 === 1) {
        add(2.75, 0.45, 'soft');
        add(3, 0.85);
      } else add(3, 0.9, rng.chance(0.12) ? 'flam' : 'hit');
      if (step.i % 8 === 7) add(3.75, 0.55, 'soft');
      else if (rng.chance(0.18)) add(rng.pick([1.75, 2.75, 0.75]), 0.35, 'soft');
    }
    return out;
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
    if (step.section === 'end') return this.endBar();
    const S = song.S;
    const key = song.key;
    const chords = song.loop[step.i % song.loop.length];
    const chord = chords[0];
    const energy = this.energyFor(step.section, step.i, step.len);
    const rng = this.rng;
    const bpm = clamp(song.bpm * this.tempo, 40, 260);
    const spb = 60 / bpm;
    const c = { energy, vel: (base) => clamp(base * (0.7 + 0.4 * energy) * (0.96 + rng.next() * 0.06), 0.05, 1) };
    let events = [];
    const add = (evs) => {
      for (const e of evs) if (this.has(e.i)) events.push(e);
    };
    const sec = step.section;
    let label = '';

    // The sub bass.
    if (BASS_ON.has(sec) && !(sec === 'outro' && step.i >= step.len - 2)) {
      const b = this.bassBar(step, chord, spb, c);
      add(b.events);
      label = b.label;
    }

    // The main theme: quiet strings under the bass in the drops, alone and up
    // front in the breakdown. The intro hints at it from bar 5.
    const themeIn = ['drop', 'variation', 'breakdown', 'drop2', 'variation2'].includes(sec) || (sec === 'intro' && step.i >= 4);
    if (themeIn) {
      const n = sec === 'intro' ? step.i + 8 : step.i;
      let notes = this.themeBar(n, chord);
      if (sec.startsWith('variation')) notes = this.variedTheme(n, chord, notes);
      if (sec === 'breakdown' && step.i === step.len - 1) notes = [{ b: 0, d: 3, m: notes[0].m }];
      const solo = sec === 'breakdown';
      const sv = solo ? 0.95 : sec === 'intro' ? 0.14 : 0.19;
      add(notes.map((x) => ({ i: 'theme', a: 'sus', b: x.b, d: Math.max(0.2, x.d * 0.96), m: x.m, v: c.vel(sv) })));
      // The violins: in the drops a simple figure that repeats every bar (two
      // chord notes above the theme), in the breakdown the theme an octave up.
      const vv = solo ? 0.62 : sec === 'intro' ? 0.2 : 0.3;
      if (solo) add(notes.map((x) => ({ i: 'vln', a: 'sus', b: x.b, d: Math.max(0.2, x.d * 0.98), m: x.m + 12, v: c.vel(vv) })));
      else {
        const vt = chordPcs(song.key, chord).slice(0, 3);
        const lad = [];
        for (let m = song.theme.center + 7; lad.length < 4; m++) if (vt.includes(pc(m))) lad.push(m);
        const fig = sec.startsWith('variation') ? [[0, 1.5, 1], [1.5, 1, 2], [2.5, 1.5, 1]] : [[0, 2, 1], [2, 2, 2]];
        add(fig.map(([b, d, k]) => ({ i: 'vln', a: 'sus', b, d: d - 0.05, m: lad[k], v: c.vel(vv) })));
      }
      if (solo || sec.startsWith('variation') || sec === 'drop2') add(notes.map((x) => ({ i: 'tpluck', a: 'sus', b: x.b, d: Math.max(0.15, Math.min(x.d, 0.9)), m: x.m + 12, v: c.vel(solo ? 0.8 : 0.17) })));
      if (solo) label = step.i === step.len - 1 ? 'THE THEME ENDS ON A DRUM HIT' : 'BREAKDOWN · THE THEME ALONE';
      else if (!label) label = 'THE THEME · SUB BASS ON ITS WAY';
    }

    // Pads under the breakdown and the end of the intro.
    const tones = chordPcs(key, chord).slice(0, 3);
    if (sec === 'breakdown' || (sec === 'intro' && step.i >= 4)) {
      const v = voice(tones, 57, this.prevPad, 3);
      this.prevPad = v;
      add(v.map((m) => ({ i: 'pad', a: 'sus', b: 0, d: 4, m, v: c.vel(sec === 'breakdown' ? 0.7 : 0.28) })));
    }

    // Horns, far in the background: a soft swell on every other bar, and in
    // the bass-house machine a short stab before the next round.
    if (['variation', 'drop2', 'variation2'].includes(sec) && energy >= 0.5) {
      const hv = voice(tones.slice(1), 60, this.prevHorn, 2);
      this.prevHorn = hv;
      if (step.i % 2 === 1) add(hv.map((m) => ({ i: 'horns', a: 'sus', b: song.hornBeat, d: 3.5 - song.hornBeat, m, v: c.vel(0.26) })));
      if (S.hornsUp && step.i % 4 === 3) add(hv.map((m) => ({ i: 'horns', a: 'stac', b: 3.5, d: 0.3, m, v: c.vel(0.3) })));
    }

    add(this.drums(step, c));
    // Risers: up into each drop, a falling sweep into the breakdown, a crash on each drop.
    if ((sec === 'intro' || sec === 'breakdown') && step.i === step.len - 2) add([{ i: 'sweep', a: 'hit', b: 0, d: 7.5, v: 0.4 }]);
    if (sec === 'breakdown' && step.i === 0) add([{ i: 'sweep', a: 'fall', b: 0, d: 6, v: 0.3 }, { i: 'crash', a: 'hit', b: 0, d: 2, v: 0.35 }]);
    if (step.i === 0 && ['drop', 'drop2', 'variation', 'variation2'].includes(sec)) add([{ i: 'crash', a: 'hit', b: 0, d: 2, v: 0.32 + 0.2 * energy }]);

    events = this.finish(events);
    this.lastBpm = bpm;
    this.barNo++;
    return {
      beats: 4, bpm, events,
      info: {
        section: sec, label: MODERN_LABELS[sec], name: song.name, bar: this.barNo,
        chord: chordName(key, chord), roman: chord.name, key: NAMES[key] + (song.minor ? ' minor' : ' major'),
        riff: label || MODERN_LABELS[sec], riffName: `${S.name} · bar ${(step.i % 16) + 1} of the theme`, riffId: null, rollTitle: 'SUB BASS (TWO OCTAVES UP) · THEME',
        prog: song.prog.replace(/ /g, '–'), progId: null,
        loop: song.loop.map((bar) => bar.map((ch) => ({ roman: ch.name, name: chordName(key, ch) }))), loopBar: step.i % song.loop.length,
      },
    };
  }

  finish(events) {
    const out = [];
    for (const e of events) {
      if (e.m != null && POP_RANGE[e.i]) {
        const [lo, hi] = POP_RANGE[e.i];
        if (e.m < lo || e.m > hi) e.m = fit(e.m, lo, hi);
      }
      if (e.b >= 4 - 1e-6) continue;
      e.d = Math.max(0.05, e.d);
      e.v = clamp(e.v, 0.02, 1);
      if (!e.glide) delete e.glide;
      out.push(e);
    }
    return out;
  }

  endBar() {
    const song = this.song;
    const key = song.key;
    const root = fit(key + 24, 26, 37);
    const tones = chordPcs(key, { r: 0, q: song.minor ? 'min' : 'maj' });
    const events = [
      { i: 'dkick', a: 'boom', b: 0, d: 0.5, v: 1 },
      { i: 'mclap', a: 'flam', b: 0, d: 0.3, v: 0.7 },
      { i: 'crash', a: 'hit', b: 0, d: 2, v: 0.5 },
      { i: 'sub', a: 'sus', b: 0, d: 3, m: root, v: 0.85 },
      ...voice(tones, 60, null, 3).map((m) => ({ i: 'pad', a: 'sus', b: 0, d: 4, m, v: 0.35 })),
    ].filter((e) => this.has(e.i));
    this.barNo++;
    return {
      beats: 4, bpm: this.lastBpm || song.bpm * this.tempo, events: this.finish(events),
      info: { section: 'end', label: MODERN_LABELS.end, name: song.name, bar: this.barNo, chord: chordName(key, { r: 0, q: song.minor ? 'min' : 'maj' }), key: NAMES[key] + (song.minor ? ' minor' : ' major'), riff: 'LAST HIT', rollTitle: 'SUB BASS (TWO OCTAVES UP) · THEME' },
    };
  }

  restBar() {
    this.barNo++;
    return { beats: 4, bpm: 100, events: [], info: { section: 'rest', name: this.song.name, bar: this.barNo } };
  }
}

export function writeModern(seed, style, bars = 120, opts = {}) {
  const c = new ModernComposer({ seed, style, ...opts });
  return Array.from({ length: bars }, () => c.nextBar());
}
