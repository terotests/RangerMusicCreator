// SPDX-License-Identifier: MIT
// The symphony composer: writes original film-style themes (or takes a
// public-domain one from classics.js) and orchestrates them bar by bar for a
// full orchestra, following a cinematic form: intro swell, theme, theme in
// full strings, bridge that builds, climax in the brass a step higher, coda.
//
// Output per bar: { beats, bpm, events, info }. Each event is
// { i: player, a: articulation, b: beat, d: beats, m: midi, v: 0..1, v2? }.
// It is pure (no Web Audio), so it runs in node tests and offline renders.

import { Rng } from '../rng.js';
import { MODES, chordBars, chordPcs, chordScale, snap, fit, lineShift, voicing, noteName, NAMES } from './theory.js';
import { CLASSICS, CLASSIC_BY_ID } from './classics.js';

// Player ranges (sounding pitch) the arranger keeps parts inside.
export const RANGE = {
  vln1: [55, 91], vln2: [55, 84], vla: [48, 79], vc: [36, 69], cb: [28, 52],
  hn: [41, 74], tp: [55, 82], tb: [40, 67], tu: [28, 52],
  fl: [60, 96], ob: [58, 88], cl: [50, 86], bn: [34, 67],
  harp: [28, 100], glock: [79, 106], timp: [40, 57],
};
// Where a melody sits best on each player.
const SWEET = {
  vln1: [64, 86], vln2: [60, 79], vla: [55, 74], vc: [48, 67], hn: [53, 72], tp: [62, 81], tb: [48, 65],
  fl: [67, 91], ob: [62, 82], cl: [58, 79], bn: [43, 62], glock: [81, 103], harp: [60, 84],
};
export const SECTION_OF = {
  vln1: 'strings', vln2: 'strings', vla: 'strings', vc: 'strings', cb: 'strings',
  hn: 'brass', tp: 'brass', tb: 'brass', tu: 'brass',
  fl: 'winds', ob: 'winds', cl: 'winds', bn: 'winds',
  harp: 'harp', glock: 'harp',
  timp: 'perc', cym: 'perc', bd: 'perc', sn: 'perc', gong: 'perc', tri: 'perc',
};
const SHORT = { vln1: 'spic', vln2: 'spic', vla: 'spic', vc: 'spic', cb: 'pizz', hn: 'stac', tp: 'stac', tb: 'stac' };

// Rhythm cells per character, as [beat, length] inside one bar.
const CELLS = {
  fanfare4: [
    [[0, 1.5], [1.5, 0.5], [2, 2]],
    [[0, 3], [3, 1 / 3], [3 + 1 / 3, 1 / 3], [3 + 2 / 3, 1 / 3]],
    [[0, 1], [1, 1], [2, 2]],
    [[0, 0.75], [0.75, 0.25], [1, 1], [2, 1.5], [3.5, 0.5]],
    [[0, 2], [2, 1], [3, 1]],
    [[0, 2.5], [2.5, 0.5], [3, 1]],
  ],
  lyric4: [
    [[0, 3], [3, 1]],
    [[0, 2], [2, 1], [3, 1]],
    [[0, 1], [1, 1], [2, 2]],
    [[0, 1.5], [1.5, 0.5], [2, 2]],
    [[0, 2], [2, 2]],
  ],
  wonder4: [
    [[0, 4]],
    [[0, 2], [2, 2]],
    [[0, 3], [3, 1]],
    [[0, 1], [1, 3]],
    [[0, 1], [1, 1], [2, 2]],
    [[0, 1.5], [1.5, 0.5], [2, 2]],
  ],
  drive4: [
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]],
    [[0, 1.5], [1.5, 1.5], [3, 1]],
    [[0, 2], [2, 0.5], [2.5, 0.5], [3, 1]],
    [[0, 0.75], [0.75, 0.75], [1.5, 0.5], [2, 2]],
  ],
  lyric3: [
    [[0, 2], [2, 1]],
    [[0, 3]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1]],
  ],
};
const LONG = { 4: [[[0, 4]], [[0, 2], [2, 2]]], 3: [[[0, 3]], [[0, 2], [2, 1]]] };

// Moods: harmony, rhythm and who plays what.
export const MOODS = {
  heroic: {
    name: 'HEROIC', desc: 'Brass fanfare, marching strings, snare and timpani', mode: 'major', meter: 4, bpm: [104, 116],
    cells: 'fanfare4', progs: ['I bVII IV I', 'I bVI bVII I', 'I IV bVI V', 'I iii IV V'], bprogs: ['bVI bVII I I', 'IV V iii vi', 'iv bVI bVII V'],
    cad: 'IV V', coda: ['bVI', 'bVII', 'I', 'I'], solo: ['hn'], bLead: ['vc', 'hn'], ost: 'march', harp: null, climax: [2, 1],
  },
  wonder: {
    name: 'SPACE WONDER', desc: 'Lydian shimmer, harp, celesta-like bells, slow strings', mode: 'lydian', meter: 4, bpm: [64, 74],
    cells: 'wonder4', progs: ['I II I II', 'I II vi V', 'I II IV I', 'IV II I I'], bprogs: ['vi II IV V', 'IV iv I I', 'bVI bVII I I'],
    cad: 'IV iv', coda: ['IV', 'iv', 'I', 'I'], solo: ['fl'], bLead: ['vln1'], ost: 'arp', harp: 'arp', glock: true, climax: [3, 2],
  },
  flyby: {
    name: 'PLANET FLYBY', desc: 'Majestic and broad: big horns, swelling strings, mediant chords', mode: 'major', meter: 4, bpm: [78, 90],
    cells: 'lyric4', progs: ['I bVI I bVI', 'I III IV iv', 'I bIII IV I', 'I bVI bVII I', 'I V vi IV'], bprogs: ['vi IV bVI V', 'IV iv I bVI', 'bVI bVII I I'],
    cad: 'IV V', coda: ['bVI', 'bVII', 'I', 'I'], solo: ['hn'], bLead: ['vc', 'hn'], ost: 'pulse', harp: 'arp', climax: [2, 3],
  },
  ominous: {
    name: 'OMINOUS', desc: 'Minor, low brass, galloping low strings, gong', mode: 'minor', meter: 4, bpm: [92, 104],
    cells: 'drive4', progs: ['i bVI i bII', 'i iv bVI V', 'i bII i bVI', 'i bVI iv V'], bprogs: ['bVI bIII bVII V', 'iv bVI bII V'],
    cad: 'bVI V', coda: ['bVI', 'bII', 'i', 'i'], solo: ['vc', 'bn'], bLead: ['hn'], ost: 'gallop', harp: null, gong: true, climax: [1, 3],
  },
  adventure: {
    name: 'ADVENTURE', desc: 'Fast and driving: string ostinato, horn calls, cymbals', mode: 'dorian', meter: 4, bpm: [132, 144],
    cells: 'drive4', progs: ['i bVII bVI bVII', 'i bVI bIII bVII', 'i iv bVII bIII', 'i IV i IV'], bprogs: ['bVI bVII I I', 'iv bVII bIII bVI'],
    cad: 'bVI bVII', coda: ['bVI', 'bVII', 'I', 'I'], solo: ['vln1'], bLead: ['hn'], ost: 'gallop', harp: null, climax: [2, 1],
  },
  triumph: {
    name: 'TRIUMPH', desc: 'Victory: full orchestra, trumpets on top, crashes', mode: 'major', meter: 4, bpm: [112, 124],
    cells: 'fanfare4', progs: ['I IV I V', 'I bVII IV I', 'I vi IV V', 'I V vi IV'], bprogs: ['IV V iii vi', 'bVI bVII I I'],
    cad: 'IV V', coda: ['bVI', 'bVII', 'I', 'I'], solo: ['tp'], bLead: ['hn', 'vc'], ost: 'march', harp: null, climax: [1, 2],
  },
  tender: {
    name: 'TENDER', desc: 'A lyrical waltz: oboe and strings, harp arpeggios', mode: 'major', meter: 3, bpm: [72, 84],
    cells: 'lyric3', progs: ['I vi IV V', 'I iii IV I', 'IV I ii V', 'I V vi IV'], bprogs: ['vi iii IV V', 'ii V I vi'],
    cad: 'ii V', coda: ['IV', 'iv', 'I', 'I'], solo: ['ob'], bLead: ['vc'], ost: 'waltz', harp: 'arp', climax: [2, 1],
  },
};
export const MOOD_IDS = Object.keys(MOODS);

// How strong each part of the form is, before the INTENSITY control.
const SEC_E = { intro: 0.35, A1: 0.42, A2: 0.62, B: 0.6, A3: 1, coda: 0.95, rest: 0.1 };

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- theme writing -----------------------------------------------------------

function expandProg(rng, M, prog, kind) {
  const t = prog.split(' ');
  const cad = M.cad.split(' ');
  const tonic = ['minor', 'dorian', 'harmonic'].includes(M.mode) ? 'i' : 'I';
  const slow = M.bpm[0] < 92 && t.length === 4;
  if (kind === 'A') return slow ? [t[0], t[0], t[1], t[1], t[2], t[2], cad[cad.length - 1], tonic] : [...t, t[0], cad[0], cad[1] ?? 'V', tonic];
  return slow ? [t[0], t[0], t[1], t[1], t[2], t[2], t[3], 'V'] : [...t, t[0], t[1], cad[0], 'V'];
}

function strongAt(b, d, meter) {
  return b === 0 || d >= 1.5 || (meter === 4 && b === 2 && d >= 1);
}

// One 8-bar phrase: a 2-bar motif, its sequence, a climb and a cadence.
function writePhrase(rng, M, key, kind, base) {
  const meter = M.meter;
  const prog = expandProg(rng, M, rng.pick(kind === 'A' ? M.progs : M.bprogs), kind);
  const chords = chordBars(prog.join(' '), meter);
  const pool = CELLS[M.cells];
  const r0 = rng.pick(pool);
  let r1 = rng.pick(pool);
  if (r1 === r0) r1 = rng.pick(pool);
  const cad = rng.pick(LONG[meter]);
  const rhythms = [r0, r1, r0, r1, rng.chance(0.5) ? r0 : rng.pick(pool), rng.pick(pool), rng.chance(0.6) ? r1 : rng.pick(pool), cad];
  const plan = kind === 'A' ? [0, 3, 2, 5, 5, 8, 4, 0] : [5, 7, 9, 7, 9, 12, 9, 7];
  const mode = M.mode;
  const bars = [];
  let cur = base + (kind === 'A' ? 0 : 7);
  let lastStep = 0;
  let first = true;
  const seqShift = rng.pick([2, 2, 3, 5, -2]);
  for (let bi = 0; bi < 8; bi++) {
    const ch = chords[bi][0];
    const tones = chordPcs(key, ch);
    const scale = chordScale(key, mode, ch);
    const target = base + plan[bi];
    const mel = [];
    if ((bi === 2 || bi === 3) && bars[bi - 2]) {
      // Sequence: the motif again, moved, its notes refitted to the new chord.
      for (const n of bars[bi - 2].mel) {
        const pcs = strongAt(n.b, n.d, meter) ? tones : scale;
        mel.push({ b: n.b, d: n.d, m: snap(n.m + seqShift, pcs, Math.sign(seqShift)) });
      }
      cur = mel[mel.length - 1].m;
      bars.push({ chords: chords[bi], mel });
      continue;
    }
    rhythms[bi].forEach(([b, d], j) => {
      const strong = strongAt(b, d, meter);
      let want;
      if (first) {
        want = cur;
        first = false;
      } else if (kind === 'A' && bi === 0 && j === 1) {
        want = cur + rng.weighted([[7, 4], [12, 2], [5, 2]]); // the opening leap
      } else {
        const dir = Math.abs(lastStep) >= 5 ? -Math.sign(lastStep) : Math.sign(target - cur) || (rng.chance(0.5) ? 1 : -1);
        const size = rng.weighted([[1, 3], [2, 4], [3, 2], [4, 2], [5, 1], [7, 0.6]]);
        want = cur + dir * size;
      }
      if (bi === 7 && (strong || j === rhythms[bi].length - 1)) {
        // Cadence: tonic for A, the dominant's tone for B.
        const goal = kind === 'A' ? key : (key + 7) % 12;
        want = snap(target, [goal], 1);
      }
      let m = snap(want, strong ? tones : scale, Math.sign(want - cur) || 1);
      m = clamp(m, base - 5, base + 17);
      if (mel.length >= 2 && mel[mel.length - 1].m === m && mel[mel.length - 2].m === m) m = snap(m + 2, scale, 1);
      lastStep = m - cur;
      cur = m;
      mel.push({ b, d, m });
    });
    bars.push({ chords: chords[bi], mel });
  }
  return bars;
}

export function writeTheme(seed, moodId) {
  const M = MOODS[moodId];
  const rng = new Rng(seed);
  const keys = M.mode === 'major' || M.mode === 'lydian' || M.mode === 'mixolydian' ? [0, 2, 3, 5, 7, 10] : [2, 4, 7, 9, 0];
  const key = rng.pick(keys);
  const base = fit(60 + key, 60, 71);
  const A = writePhrase(rng, M, key, 'A', base);
  const B = writePhrase(rng, M, key, 'B', base);
  const bpm = rng.int(M.bpm[0], M.bpm[1]);
  return { name: `${M.name} THEME ${seed % 1000}`, source: 'Original, written by the composer from a seed', key, mode: M.mode, meter: M.meter, bpm, mood: moodId, phrases: { A, B }, seed };
}

// ---- orchestration -----------------------------------------------------------

function melodyShift(bars, inst) {
  const ms = bars.flatMap((b) => b.mel.map((n) => n.m));
  const [lo, hi] = SWEET[inst] || RANGE[inst];
  return lineShift(ms, lo, hi);
}

function chordAt(bar, b) {
  let c = bar.chords[0];
  for (const ch of bar.chords) if (ch.at <= b + 1e-6) c = ch;
  return c;
}

class Writer {
  constructor(spb, avail, rng) {
    this.events = [];
    this.spb = spb;
    this.avail = avail;
    this.rng = rng;
  }
  has(i) {
    return this.avail[SECTION_OF[i]] !== false;
  }
  add(i, a, b, d, m, v, extra) {
    if (!this.has(i)) return;
    if (m != null && RANGE[i]) m = fit(m, RANGE[i][0], RANGE[i][1]);
    const hv = this.rng.float(-0.04, 0.04);
    this.events.push({ i, a, b: Math.max(0, b), d, m, v: clamp(v + hv, 0.05, 1), ...extra });
  }
  // A note that picks its articulation from its length.
  play(i, b, d, m, v, legato = 1.03) {
    const short = d * this.spb < 0.24 && SHORT[i];
    if (short) this.add(i, SHORT[i], b, d, m, v + 0.05);
    else this.add(i, 'sus', b, d * legato, m, v);
  }
}

// Picks the first available player of a list (so melodies move when a section is muted).
function pickLead(list, w) {
  for (const i of list) if (w.has(i)) return i;
  for (const i of ['vln1', 'fl', 'hn', 'ob', 'tp', 'harp']) if (w.has(i)) return i;
  return null;
}

function arrange(ctx) {
  const { bar, nextBar, kind, pos, len, e, M, meter, tr, key, avail, rng, spb, theme, prevKind, nextKind } = ctx;
  const w = new Writer(spb, avail, rng);
  const vel = 0.22 + 0.7 * e;
  const k = (key + tr) % 12;
  const mode = theme.mode;
  const mel = bar ? bar.mel.map((n) => ({ ...n, m: n.m + tr })) : [];
  const resp = bar && bar.resp ? bar.resp.map((n) => ({ ...n, m: n.m + tr })) : [];
  const chords = bar ? bar.chords : [{ r: 0, q: ['major', 'lydian', 'mixolydian'].includes(theme.mode) ? 'maj' : 'min', at: 0 }];
  const last = pos === len - 1;
  const shift = (inst) => (ctx.shifts[inst] ??= melodyShift(ctx.phraseBars, inst));
  const leadLine = (inst, v, extraShift = 0) => {
    const s = shift(inst) + extraShift;
    for (const n of mel) w.play(inst, n.b, n.d, n.m + s, v);
  };

  // Chord spans in this bar.
  const spans = chords.map((c, i) => ({ c, b: c.at, d: (i + 1 < chords.length ? chords[i + 1].at : meter) - c.at }));

  // --- melody and counter-line
  const leads = [];
  if (kind === 'A1') leads.push(pickLead(M.solo, w));
  else if (kind === 'A2') leads.push(pickLead(['vln1'], w));
  else if (kind === 'B') leads.push(...M.bLead.filter((i) => w.has(i)).slice(0, 2));
  else if (kind === 'A3') {
    leads.push(pickLead(['tp', 'hn', 'vln1'], w));
    if (w.has('hn') && leads[0] !== 'hn') leads.push('hn');
    if (w.has('vln1')) leads.push('vln1');
  }
  for (const inst of leads.filter(Boolean)) {
    const extra = kind === 'A3' && inst === 'vln1' && leads.includes('tp') ? 12 : 0;
    leadLine(inst, vel + 0.12, extra);
  }
  if (leads.includes('vln1') && e > 0.5) leadLine('fl', vel, shift('vln1') + 12 - shift('fl'));
  if ((kind === 'A2' || kind === 'A3') && e > 0.45) leadLine('cl', vel - 0.1);
  if (M.glock && (kind === 'A1' || kind === 'A2')) {
    for (const n of mel) if (n.d >= 1) w.add('glock', 'hit', n.b, n.d, n.m + shift('glock'), vel * 0.7);
  }

  // Counter-line: the response line of a classic, or long horn/cello notes.
  if (resp.length && kind !== 'intro' && kind !== 'coda') {
    const who = kind === 'A1' ? ['vln2'] : kind === 'A3' ? ['vln2', 'fl', 'ob'] : ['vln2', 'fl'];
    for (const inst of who) for (const n of resp) w.play(inst, n.b, n.d, fit(n.m, RANGE[inst][0] + 7, RANGE[inst][1]), vel);
  } else if ((kind === 'A2' || kind === 'A3') && !resp.length) {
    const who = kind === 'A3' ? (leads.includes('hn') ? 'vla' : 'hn') : 'hn';
    for (const sp of spans) {
      const pcs = chordPcs(k, sp.c);
      ctx.state.counter = snap(ctx.state.counter ?? 62, [pcs[1], pcs[pcs.length > 3 ? 3 : 2]], rng.chance(0.5) ? 1 : -1);
      ctx.state.counter = clamp(ctx.state.counter, 55, 69);
      w.add(who, 'sus', sp.b, sp.d * 1.02, ctx.state.counter, vel - 0.12);
    }
  }

  // --- strings: pad, bass and ostinato
  const melLow = mel.length ? Math.min(...mel.map((n) => n.m + shift(leads[0] || 'vln1'))) : 90;
  for (const sp of spans) {
    const pcs = chordPcs(k, sp.c);
    const root = pcs[0];
    const hold = kind === 'intro' || kind === 'coda';
    const swell = kind === 'intro' ? { v2: clamp(vel + 0.25, 0, 1) } : undefined;
    // Pad
    if (e > 0.12) {
      const top = leads.includes('vln1') || leads.includes('vln2') ? Math.min(78, melLow - 1) : 78;
      const vo = voicing(pcs, 55, top, 3);
      const art = (kind === 'intro' && M.ost !== 'arp') || M.padArt === 'trem' ? 'trem' : 'sus';
      const pv = vel - 0.12;
      if (vo.length) {
        w.add('vla', art, sp.b, sp.d * 1.02, vo[0], pv, swell);
        for (const m of vo.slice(1)) w.add('vln2', art, sp.b, sp.d * 1.02, m, pv, swell);
        if (!leads.includes('vln1') && (kind === 'intro' || kind === 'B' || M.ost === 'arp')) w.add('vln1', art, sp.b, sp.d * 1.02, fit(vo[vo.length - 1] + 12, 72, 88), pv - 0.08, swell);
      }
    }
    // Bass
    const cbRoot = fit(root + 36, 31, 47);
    const driving = (M.ost === 'gallop' || M.ost === 'march') && e > 0.3 && !hold;
    if (!driving) {
      w.add('cb', 'sus', sp.b, sp.d * 1.02, cbRoot, vel - 0.05, swell);
      if (!leads.includes('vc')) w.add('vc', 'sus', sp.b, sp.d * 1.02, fit(root + 36, 36, 50) + (e > 0.6 ? 12 : 0), vel - 0.08, swell);
    }
    // Ostinato
    if (!hold) ostinato(w, M.ost, sp, pcs, cbRoot, vel, e, meter, leads);
    // Brass chords
    if (e > 0.6 && kind !== 'A1' && !hold) {
      const hnVo = voicing(pcs, 53, 70, e > 0.8 ? 4 : 3);
      if (!leads.includes('hn')) for (const m of hnVo) w.add('hn', 'sus', sp.b, sp.d * 1.01, m, vel - 0.1);
      if (e > 0.76) {
        for (const m of voicing(pcs, 43, 60, 3)) w.add('tb', 'sus', sp.b, sp.d * 1.01, m, vel - 0.12);
        w.add('tu', 'sus', sp.b, sp.d * 1.01, fit(root + 36, 31, 46), vel - 0.1);
      }
    }
    // Woodwinds hold the chord when it is quiet.
    if (e < 0.5 && kind !== 'intro' && !hold && rng.chance(0.7)) {
      const vo = voicing(pcs, 55, 72, 2);
      if (!leads.includes('cl')) w.add('cl', 'sus', sp.b, sp.d, vo[1] ?? vo[0], vel - 0.15);
      w.add('bn', 'sus', sp.b, sp.d, fit(root + 48, 43, 55), vel - 0.18);
    }
    // Harp
    if (M.harp === 'arp' && !hold) harpArp(w, sp, pcs, vel, meter, rng);
  }

  // --- intro and coda
  if (kind === 'intro') {
    const pcs = chordPcs(k, chords[0]);
    if (pos === len - 2 && ctx.motif?.length && w.has('hn')) {
      // A horn call: the theme's first notes.
      const s = shift('hn');
      for (const n of ctx.motif) w.add('hn', 'sus', n.b, n.d * 1.02, n.m + tr + s, vel + 0.1);
    }
    if (pos === 0 && M.harp) harpGliss(w, 0, Math.min(2, meter), k, mode, 48, 84, vel);
    if (ctx.pickup) {
      const inst = pickLead(M.solo, w);
      if (inst) for (const n of ctx.pickup) w.play(inst, meter + n.b, n.d, n.m + shift(inst), vel + 0.12);
    }
    if (last) w.add('timp', 'roll', 0, meter, fit(pcs[0] + 48, 40, 57), 0.25, { v2: clamp(vel + 0.35, 0, 1) });
  }
  if (kind === 'coda') {
    const pcs = chordPcs(k, chords[0]);
    const vo = voicing(pcs, 53, 70, 4);
    const final = pos >= 2;
    const v = clamp(vel + (final ? 0.1 : 0), 0, 1);
    if (pos < 3) {
      const d = final ? meter * 2 : meter;
      for (const m of vo) w.add('hn', 'sus', 0, d, m, v);
      for (const m of voicing(pcs, 43, 60, 3)) w.add('tb', 'sus', 0, d, m, v - 0.05);
      w.add('tu', 'sus', 0, d, fit(pcs[0] + 36, 31, 46), v);
      if (final) {
        for (const m of voicing(pcs, 64, 88, 3)) w.add('tp', 'sus', 0, d, m, v);
        w.add('fl', 'sus', 0, d, fit(pcs[0] + 72, 74, 91), v - 0.1);
      } else if (w.has('tp')) {
        const top = snap(pcs[pcs.length > 3 ? 2 : 2] + 72, pcs, 1);
        w.add('tp', 'sus', 0, d, fit(top, 67, 79), v);
      }
      for (const m of voicing(pcs, 55, 84, 4)) w.add(m > 74 ? 'vln1' : m > 64 ? 'vln2' : 'vla', 'sus', 0, d, m, v - 0.05);
      w.add('cb', 'sus', 0, d, fit(pcs[0] + 36, 31, 47), v);
      w.add('vc', 'sus', 0, d, fit(pcs[0] + 36, 36, 50), v);
      w.add('timp', pos === 2 ? 'roll' : 'hit', 0, pos === 2 ? meter * 2 : 1, fit(pcs[0] + 48, 40, 57), v, pos === 2 ? { v2: v } : undefined);
      if (final) {
        w.add('cym', 'crash', 0, 4, null, v);
        w.add('bd', 'hit', 0, 2, null, v);
        if (M.gong) w.add('gong', 'hit', 0, 6, null, v);
      }
    } else {
      w.add('timp', 'hit', meter - 1, 1, fit(pcs[0] + 48, 40, 57), v);
    }
  }

  // --- percussion
  const pcs0 = chordPcs(k, chords[0]);
  if (kind !== 'intro' && kind !== 'coda' && e > 0.28) {
    const tRoot = fit(pcs0[0] + 48, 40, 57);
    const tFifth = fit(pcs0[2] + 48, 40, 57);
    w.add('timp', 'hit', 0, 1, tRoot, vel);
    if (e > 0.5 && meter === 4) w.add('timp', 'hit', 2, 1, tFifth, vel - 0.12);
    if (M.ost === 'march' && e > 0.55) {
      w.add('timp', 'hit', 3.5, 0.5, tFifth, vel - 0.2);
      w.add('timp', 'hit', 3.75, 0.25, tFifth, vel - 0.25);
    }
  }
  if (M.ost === 'march' && e > 0.7 && kind !== 'intro' && kind !== 'coda') {
    for (const [b, v] of [[0, 0.1], [1, -0.1], [1.5, -0.15], [1.75, -0.15], [2, 0], [3, -0.1], [3.5, -0.1], [3.75, -0.05]]) w.add('sn', 'hit', b, 0.25, null, vel + v - 0.15);
  }
  if (pos === 0 && kind === 'A3') {
    w.add('cym', 'crash', 0, 4, null, clamp(vel + 0.1, 0, 1));
    w.add('bd', 'hit', 0, 2, null, vel);
    if (M.gong) w.add('gong', 'hit', 0, 6, null, vel - 0.15);
    if (M.harp) harpGliss(w, 0, 1, k, mode, 55, 91, vel);
  }
  if (pos === 0 && kind === 'A1' && M.glock) w.add('tri', 'hit', 0, 2, null, vel - 0.1);
  // Build into the climax: snare and cymbal swell, timpani roll, a woodwind run.
  if (last && nextKind === 'A3') {
    w.add('cym', 'swell', 0, meter, null, 0.15, { v2: clamp(vel + 0.2, 0, 1) });
    w.add('timp', 'roll', 0, meter, fit(((k + 7) % 12) + 48, 40, 57), 0.25, { v2: clamp(vel + 0.2, 0, 1) });
    if (M.ost === 'march' || M.ost === 'gallop') w.add('sn', 'roll', 0, meter, null, 0.2, { v2: clamp(vel, 0, 1) });
    run(w, meter - 1, 1, k, mode, 72, 91, vel);
  }
  if (last && nextKind !== 'A3' && kind !== 'coda' && kind !== 'intro' && M.harp) harpGliss(w, meter - 1, 1, k, mode, 55, 84, vel - 0.1);

  return w.events;
}

function ostinato(w, kind, sp, pcs, cbRoot, vel, e, meter, leads) {
  const vo = voicing(pcs, 55, 76, 3);
  if (kind === 'march' && e > 0.4) {
    for (let b = sp.b; b < sp.b + sp.d - 1e-6; b += 0.5) {
      const m = vo[Math.round((b - sp.b) * 2) % vo.length];
      if (!leads.includes('vla')) w.add('vla', 'spic', b, 0.5, m, vel - 0.12);
    }
    for (let b = sp.b; b < sp.b + sp.d - 1e-6; b += 1) {
      w.add('cb', 'pizz', b, 1, cbRoot, vel - 0.05);
      if (!leads.includes('vc')) w.add('vc', 'spic', b, 0.5, cbRoot + 12, vel - 0.05);
      if (!leads.includes('vc') && Math.round(b) % 2 === 1) w.add('vc', 'spic', b + 0.5, 0.5, cbRoot + 12 + 7, vel - 0.12);
    }
  } else if (kind === 'gallop' && e > 0.25) {
    for (let b = sp.b; b < sp.b + sp.d - 1e-6; b += 1) {
      for (const [o, acc] of [[0, 0.05], [0.5, -0.1], [0.75, -0.1]]) {
        if (!leads.includes('vc')) w.add('vc', 'spic', b + o, 0.25, cbRoot + 12, vel + acc);
        if (e > 0.45) w.add('cb', 'pizz', b + o, 0.25, cbRoot, vel + acc - 0.05);
        if (e > 0.6 && !leads.includes('vla')) w.add('vla', 'spic', b + o, 0.25, vo[0], vel + acc - 0.12);
      }
    }
  } else if (kind === 'pulse' && e > 0.45) {
    for (let b = sp.b; b < sp.b + sp.d - 1e-6; b += 0.5) {
      const m = vo[(Math.round((b - sp.b) * 2) % 2) + 1] ?? vo[0];
      if (!leads.includes('vln2')) w.add('vln2', 'spic', b, 0.5, m, vel - 0.2);
    }
  } else if (kind === 'waltz') {
    for (let b = sp.b; b < sp.b + sp.d - 1e-6; b += meter) {
      w.add('cb', 'pizz', b, 1, cbRoot, vel);
      for (const o of [0.95, 2]) for (const m of vo.slice(0, 2)) w.add('vln2', 'pizz', b + o, 0.5, m, vel - 0.12);
    }
  }
}

function harpArp(w, sp, pcs, vel, meter, rng) {
  const notes = [];
  for (let m = 48; m <= 84 && notes.length < 8; m++) if (pcs.includes(m % 12)) notes.push(m);
  const seq = [...notes.slice(0, 6), ...notes.slice(1, 5).reverse()];
  let j = 0;
  for (let b = sp.b; b < sp.b + sp.d - 1e-6; b += 0.5) w.add('harp', 'hit', b, 1.5, seq[j++ % seq.length], vel - 0.15 + (j === 1 ? 0.08 : 0));
}

function scaleNotes(k, mode, lo, hi) {
  const pcs = MODES[mode].map((s) => (k + s) % 12);
  const out = [];
  for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out.push(m);
  return out;
}

function harpGliss(w, b, d, k, mode, lo, hi, vel) {
  const notes = scaleNotes(k, mode, lo, hi);
  notes.forEach((m, j) => w.add('harp', 'hit', b + (j * d) / notes.length, 1, m, vel - 0.2 + (j / notes.length) * 0.15));
}

function run(w, b, d, k, mode, lo, hi, vel) {
  const notes = scaleNotes(k, mode, lo, hi).slice(-8);
  notes.forEach((m, j) => {
    w.add('fl', 'sus', b + (j * d) / notes.length, d / notes.length, m, vel - 0.1);
    w.add('cl', 'sus', b + (j * d) / notes.length, d / notes.length, m - 12, vel - 0.15);
  });
}

// ---- the composer ------------------------------------------------------------

export class SymphonyComposer {
  constructor({ seed = 1, mood = 'flyby', piece = null, intensity = 0.6, auto = true, tempo = 1, avail = {}, loop = true } = {}) {
    this.seed = seed;
    this.intensity = intensity;
    this.auto = auto;
    this.tempo = tempo;
    this.avail = avail;
    this.loop = loop;
    this.rng = new Rng(seed ^ 0x5eed);
    this.bar = 0;
    this.queue = [];
    this.ended = false;
    this.setProgram({ mood, piece, seed });
  }

  setProgram({ mood, piece, seed }) {
    this.piece = piece && CLASSIC_BY_ID[piece] ? CLASSIC_BY_ID[piece] : null;
    this.moodId = this.piece ? this.piece.mood : mood && MOODS[mood] ? mood : this.moodId || 'flyby';
    if (seed != null) this.seed = seed;
    this.cycle = 0;
    this.queue = [];
    this.ended = false;
    this.pendingEnd = false;
    this.planCycle();
  }

  get M() {
    return { ...MOODS[this.moodId], ...(this.piece?.orch || {}) };
  }

  planCycle() {
    const p = this.piece;
    if (p && p.script) {
      this.theme = { name: p.name, source: p.source, key: p.key, mode: p.mode, meter: p.meter, bpm: p.bpm };
      this.queue = p.script().map((b) => ({ kind: 'script', bar: b }));
      return;
    }
    const theme = p ? classicTheme(p) : writeTheme(this.seed + this.cycle * 7919, this.moodId);
    this.theme = theme;
    const M = this.M;
    const [up1, up2] = M.climax;
    const tr3 = p ? p.climaxShift ?? 0 : this.rng.pick([up1, up2]);
    const A = theme.phrases.A;
    const B = theme.phrases.B;
    const plan = [];
    const nIntro = p ? p.intro ?? 2 : this.rng.pick([2, 4]);
    for (let i = 0; i < nIntro; i++) plan.push({ kind: 'intro', pos: i, len: nIntro, bar: null, tr: 0, pickup: i === nIntro - 1 && p?.pickup ? p.pickup : null });
    const add = (kind, bars, tr) => bars.forEach((bar, i) => plan.push({ kind, pos: i, len: bars.length, bar, tr, phraseBars: bars }));
    add('A1', A, 0);
    add('A2', A, 0);
    if (B) add('B', B, 0);
    add('A3', A, tr3);
    const codaChords = chordBars((p?.coda || M.coda).join(' '), theme.meter);
    for (let i = 0; i < 4; i++) plan.push({ kind: 'coda', pos: i, len: 4, bar: { chords: codaChords[i], mel: [] }, tr: tr3 });
    plan.push({ kind: 'rest', pos: 0, len: 1, bar: null, tr: 0 });
    this.queue = plan;
    this.motif = A[0].mel.filter((n) => n.b < theme.meter);
    this.shifts = {};
    this.counter = null;
  }

  // Jump to the climax (or the next section).
  next() {
    const cur = this.queue[0]?.kind;
    while (this.queue.length && this.queue[0].kind === cur && cur !== 'coda') this.queue.shift();
  }

  climax() {
    if (this.piece?.script) return;
    const i = this.queue.findIndex((s) => s.kind === 'A3');
    if (i > 0) this.queue.splice(0, i);
  }

  // Finish: go to the coda and stop after it.
  end() {
    this.pendingEnd = true;
    if (this.piece?.script) return;
    const i = this.queue.findIndex((s) => s.kind === 'coda');
    if (i > 0) this.queue.splice(0, i);
  }

  energy(kind, pos, len) {
    let base = SEC_E[kind] ?? 0.5;
    if (kind === 'B') base += (pos / Math.max(1, len - 1)) * 0.25;
    if (kind === 'coda') base = pos < 2 ? 0.9 : 1;
    const I = this.intensity;
    if (!this.auto) return clamp(I + (base - 0.6) * 0.3, 0.05, 1);
    return clamp(base * (0.45 + 0.85 * I) - 0.05, 0.05, 1);
  }

  nextBar() {
    if (!this.queue.length) {
      if (this.pendingEnd || (this.piece && !this.loop)) {
        this.ended = true;
        return null;
      }
      this.cycle++;
      this.planCycle();
    }
    const sec = this.queue.shift();
    const theme = this.theme;
    const meter = sec.bar?.beats ?? theme.meter;
    let bpm = (sec.bar?.bpm ?? theme.bpm) * this.tempo * (this.piece?.sectionBpm?.[sec.kind] ?? 1);
    if (sec.kind === 'coda' && sec.pos >= 2) bpm *= 0.86; // broaden at the end
    if (sec.kind === 'script') {
      const s = sec.bar;
      const scale = 0.55 + 0.6 * this.intensity;
      const events = s.events.filter((e) => this.avail[SECTION_OF[e.i]] !== false).map((e) => ({ ...e, v: clamp(e.v * scale, 0.05, 1), v2: e.v2 != null ? clamp(e.v2 * scale, 0.05, 1) : undefined }));
      this.bar++;
      return { beats: s.beats, bpm, events, info: { section: s.section || 'theme', bar: this.bar, chord: s.chord || '', key: NAMES[theme.key], name: theme.name, mood: this.moodId, e: this.intensity } };
    }
    const e = sec.kind === 'rest' ? 0 : this.energy(sec.kind, sec.pos, sec.len);
    const nextKind = this.queue[0]?.kind;
    const events =
      sec.kind === 'rest'
        ? []
        : arrange({
            bar: sec.bar, kind: sec.kind, pos: sec.pos, len: sec.len, e, M: this.M, meter, tr: sec.tr, key: theme.key,
            avail: this.avail, rng: this.rng, spb: 60 / bpm, theme, nextKind, motif: this.motif,
            phraseBars: sec.phraseBars || theme.phrases.A, shifts: (this.shifts[sec.kind + (sec.phraseBars === theme.phrases.B ? 'B' : 'A')] ??= {}),
            state: this, pickup: sec.pickup,
          });
    this.bar++;
    const ch = sec.bar?.chords?.[0];
    return {
      beats: meter,
      bpm,
      events,
      info: { section: sec.kind, pos: sec.pos, len: sec.len, bar: this.bar, chord: ch ? chordLabel((theme.key + sec.tr) % 12, ch) : '', key: NAMES[(theme.key + sec.tr) % 12], name: theme.name, mood: this.moodId, e },
    };
  }
}

export function chordLabel(key, ch) {
  const root = NAMES[(key + ch.r) % 12];
  return root + ({ maj: '', min: 'm', dim: 'dim', aug: '+', sus: 'sus4', dom7: '7', maj7: 'maj7', min7: 'm7', add9: 'add9' }[ch.q] || '');
}

// A classic's written-out phrases as a theme.
export function classicTheme(p) {
  const phrases = {};
  for (const [name, ph] of Object.entries(p.phrases)) phrases[name] = ph;
  return { name: p.name, source: p.source, key: p.key, mode: p.mode, meter: p.meter, bpm: p.bpm, mood: p.mood, phrases };
}

export { CLASSICS, noteName };
