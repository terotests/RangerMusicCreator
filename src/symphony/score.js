// SPDX-License-Identifier: MIT
// Plays a MIDI score with the orchestra: reads every track (tempo map, track
// names, program changes, volume and expression), gives each part to a player
// by its name or General MIDI program, and hands it out bar by bar like the
// composer does. Use it with open scores, e.g. public-domain works from
// Mutopia or IMSLP exported as MIDI.

import { RANGE } from './composer.js';

const NAME_RULES = [
  [/viol(?:in|ino)?s?\s*(?:2|ii)\b|second violin|violin\s*ii/i, 'vln2'],
  [/viol(?:in|ino)?s?\s*(?:1|i)\b|first violin|violin\s*i\b/i, 'vln1'],
  [/viola|bratsche/i, 'vla'],
  [/cell|violoncello/i, 'vc'],
  [/contrab|double\s*bass|kontrabass|basses\b|^bass$/i, 'cb'],
  [/violin|violini|geige/i, 'vln1'],
  [/english horn|cor anglais|oboe|oboi/i, 'ob'],
  [/horn|corno|corni/i, 'hn'],
  [/trumpet|tromba|trombe|cornet/i, 'tp'],
  [/trombone|posaune/i, 'tb'],
  [/tuba/i, 'tu'],
  [/flute|flauto|piccolo|flöte/i, 'fl'],
  [/clarinet|klarinette|clarinetto/i, 'cl'],
  [/bassoon|fagott|fagotto/i, 'bn'],
  [/harp|arpa|harfe/i, 'harp'],
  [/timpani|pauken|timp/i, 'timp'],
  [/glock|celesta|bells|campan/i, 'glock'],
];

// General MIDI program -> player ('split' = by pitch over the string section).
function programPlayer(p) {
  if (p === 40) return 'vln1';
  if (p === 41) return 'vla';
  if (p === 42) return 'vc';
  if (p === 43) return 'cb';
  if (p === 44) return 'split-trem';
  if (p === 45) return 'split-pizz';
  if (p === 46) return 'harp';
  if (p === 47) return 'timp';
  if (p === 56 || p === 59) return 'tp';
  if (p === 57) return 'tb';
  if (p === 58) return 'tu';
  if (p === 60) return 'hn';
  if (p === 61 || p === 62 || p === 63) return 'brass';
  if (p >= 64 && p <= 67) return 'cl';
  if (p === 68 || p === 69) return 'ob';
  if (p === 70) return 'bn';
  if (p === 71) return 'cl';
  if (p >= 72 && p <= 79) return 'fl';
  if (p >= 8 && p <= 14) return 'glock';
  if (p <= 7) return 'harp';
  return 'split';
}

function splitStrings(m) {
  if (m >= 67) return 'vln1';
  if (m >= 57) return 'vln2';
  if (m >= 48) return 'vla';
  if (m >= 36) return 'vc';
  return 'cb';
}

function splitBrass(m) {
  if (m >= 62) return 'tp';
  if (m >= 50) return 'hn';
  if (m >= 36) return 'tb';
  return 'tu';
}

const DRUMS = { 35: ['bd', 'hit'], 36: ['bd', 'hit'], 38: ['sn', 'hit'], 40: ['sn', 'hit'], 49: ['cym', 'crash'], 57: ['cym', 'crash'], 55: ['cym', 'crash'], 51: ['cym', 'soft'], 59: ['cym', 'soft'], 52: ['gong', 'hit'], 81: ['tri', 'hit'], 80: ['tri', 'hit'] };

export function parseScore(buffer) {
  const d = new DataView(buffer);
  let p = 0;
  const str = (at, n) => String.fromCharCode(...new Uint8Array(buffer, at, n));
  if (str(0, 4) !== 'MThd') throw new Error('not a MIDI file');
  const ntracks = d.getUint16(10);
  const ppq = d.getUint16(12);
  if (ppq & 0x8000) throw new Error('SMPTE-timed MIDI files are not supported');
  p = 8 + d.getUint32(4);
  const tempos = [];
  const tracks = [];
  let title = null;
  let meter = null;
  const pedalEvents = [];
  for (let t = 0; t < ntracks && p + 8 <= buffer.byteLength; t++) {
    if (str(p, 4) !== 'MTrk') break;
    const len = d.getUint32(p + 4);
    let q = p + 8;
    const end = Math.min(buffer.byteLength, q + len);
    let tick = 0;
    let status = 0;
    const tr = { name: null, notes: [], programs: {} };
    const open = new Map();
    const vol = new Array(16).fill(100);
    const expr = new Array(16).fill(127);
    const close = (k, o, t1) => {
      tr.notes.push({ ch: o.ch, m: o.m, t0: o.tick, t1: Math.max(t1, o.tick + 1), v: Math.min(1, o.v) });
    };
    const readVlq = () => {
      let v = 0;
      let b;
      do {
        b = d.getUint8(q++);
        v = (v << 7) | (b & 0x7f);
      } while (b & 0x80 && q < end);
      return v;
    };
    while (q < end) {
      tick += readVlq();
      const b = d.getUint8(q);
      if (b & 0x80) {
        status = b;
        q++;
      }
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = d.getUint8(q++);
        const l = readVlq();
        if (meta === 0x58 && l >= 2 && !meter) meter = { num: d.getUint8(q), den: 2 ** d.getUint8(q + 1), tick };
        if (meta === 0x51 && l === 3) tempos.push({ tick, us: (d.getUint8(q) << 16) | (d.getUint8(q + 1) << 8) | d.getUint8(q + 2) });
        if (meta === 0x03 || meta === 0x04) {
          const s = new TextDecoder().decode(new Uint8Array(buffer, q, l)).trim();
          if (s && !tr.name) tr.name = s;
          if (s && t === 0 && !title) title = s;
        }
        q += l;
      } else if (status === 0xf0 || status === 0xf7) {
        q += readVlq();
      } else if (type === 0x90 || type === 0x80) {
        const n = d.getUint8(q++);
        const v = d.getUint8(q++);
        const k = ch * 128 + n;
        if (type === 0x90 && v > 0) {
          if (open.has(k)) close(k, open.get(k), tick);
          open.set(k, { ch, m: n, tick, v: (v / 127) * (vol[ch] / 127) * (expr[ch] / 127) * 1.25 });
        } else if (open.has(k)) {
          const o = open.get(k);
          open.delete(k);
          close(k, o, tick);
        }
      } else if (type === 0xb0) {
        const c = d.getUint8(q++);
        const v = d.getUint8(q++);
        if (c === 7) vol[ch] = v;
        if (c === 11) expr[ch] = v;
        if (c === 64) pedalEvents.push({ tick, down: v >= 64 });
      } else if (type === 0xc0) {
        tr.programs[ch] ??= d.getUint8(q);
        q += 1;
      } else if (type === 0xd0) q += 1;
      else q += 2;
    }
    for (const [k, o] of open) close(k, o, tick);
    tr.notes.sort((a, b) => a.t0 - b.t0 || a.m - b.m);
    if (tr.notes.length) tracks.push(tr);
    p = 8 + len + p;
  }
  applyPedal(tracks, pedalEvents);
  tempos.sort((a, b) => a.tick - b.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, us: 500000 });
  return { title, ppq, tempos, tracks, meter: meter || { num: 4, den: 4, tick: 0 } };
}

// Sustain pedal (written in any track, usually the left hand's): a key let go
// while the pedal is down rings until the pedal comes up, or until the same key
// is struck again. The key-up time stays in `k1` for instruments without a pedal.
export function applyPedal(tracks, events) {
  if (!events.length) return;
  events.sort((a, b) => a.tick - b.tick);
  const spans = [];
  let from = null;
  for (const e of events) {
    if (e.down && from == null) from = e.tick;
    else if (!e.down && from != null) spans.push([from, e.tick]), (from = null);
  }
  if (from != null) spans.push([from, Infinity]);
  for (const tr of tracks) {
    const next = new Map();
    for (let j = tr.notes.length - 1; j >= 0; j--) {
      const n = tr.notes[j];
      const again = next.get(n.m) ?? Infinity;
      next.set(n.m, n.t0);
      const sp = spans.find(([a, b]) => a < n.t1 && n.t1 < b);
      if (!sp) continue;
      const end = Math.min(sp[1], again);
      if (end > n.t1 && end !== Infinity) n.k1 = n.t1, (n.t1 = end);
    }
  }
}

// Assign every note a player and articulation; returns { title, notes, parts }.
export function orchestrateScore(score) {
  const notes = [];
  const parts = [];
  let violins = 0;
  for (const tr of score.tracks) {
    let player = null;
    if (tr.name) for (const [re, pl] of NAME_RULES) if (re.test(tr.name)) {
      player = pl;
      break;
    }
    if (player === 'vln1' && !/1|i\b/i.test(tr.name || '') && violins++ > 0) player = 'vln2';
    for (const n of tr.notes) {
      let i = player;
      let a = 'sus';
      if (n.ch === 9) {
        const dr = DRUMS[n.m];
        if (!dr) continue;
        [i, a] = dr;
        notes.push({ i, a, t0: n.t0, t1: n.t1, m: null, v: n.v });
        continue;
      }
      if (!i) {
        const prog = programPlayer(tr.programs[n.ch] ?? 48);
        if (prog.startsWith('split')) {
          i = splitStrings(n.m);
          if (prog === 'split-trem') a = 'trem';
          if (prog === 'split-pizz') a = 'pizz';
        } else if (prog === 'brass') i = splitBrass(n.m);
        else i = prog;
      }
      if (i === 'vln1' && n.m < 55) i = n.m < 48 ? 'vc' : 'vla';
      if (i === 'harp' || i === 'glock' || i === 'timp') a = 'hit';
      notes.push({ i, a, t0: n.t0, t1: n.t1, m: n.m, v: n.v });
    }
    parts.push({ name: tr.name || `Track ${parts.length + 1}`, player: player || 'auto', notes: tr.notes.length });
  }
  notes.sort((x, y) => x.t0 - y.t0);
  return { title: score.title, notes, parts };
}

// Bar-by-bar playback of an orchestrated score. Options: `arrange(score)`
// returns the notes with their players instead of orchestrateScore (see
// repertoire.js), `bpm` sets the opening tempo (the tempo map is scaled to
// it; LilyPond writes 60 when a source has no metronome mark).
export class MidiScore {
  constructor(buffer, name = 'MIDI SCORE', { arrange = null, bpm = null, title = null, label = null, rubato = null } = {}) {
    const score = parseScore(buffer);
    const o = arrange ? { title, notes: arrange(score).sort((x, y) => x.t0 - y.t0), parts: [] } : orchestrateScore(score);
    this.ppq = score.ppq;
    const scale = bpm ? bpm / (60000000 / score.tempos[0].us) : 1;
    this.tempos = score.tempos.map((t) => ({ tick: t.tick, us: t.us / scale }));
    this.notes = o.notes;
    this.parts = o.parts;
    this.name = (title || o.title || name).toUpperCase().slice(0, 40);
    this.meter = score.meter;
    this.label = label;
    this.rubato = rubato;
    // Bars follow the time signature; the music itself is timed in quarters.
    this.beatsPerBar = (score.meter.num * 4) / score.meter.den;
    this.barTicks = Math.round(this.ppq * this.beatsPerBar);
    this.lastTick = Math.max(0, ...this.notes.map((n) => n.t1));
    this.bar = 0;
    this.tempo = 1;
    this.intensity = 0.6;
    this.avail = {};
    this.idx = 0;
    this.ended = false;
  }

  bpmAt(tick) {
    let us = this.tempos[0].us;
    for (const t of this.tempos) if (t.tick <= tick) us = t.us;
    return 60000000 / us;
  }

  nextBar() {
    const start = this.bar * this.barTicks;
    if (start > this.lastTick) {
      this.ended = true;
      return null;
    }
    const end = start + this.barTicks;
    const bpm = this.bpmAt(start) * (this.rubato ? this.rubato(this.bar, Math.ceil(this.lastTick / this.barTicks)) : 1);
    const spb = 60 / (bpm * this.tempo);
    const events = [];
    while (this.idx < this.notes.length && this.notes[this.idx].t0 < end) {
      const n = this.notes[this.idx++];
      const b = (n.t0 - start) / this.ppq;
      const dur = (n.t1 - n.t0) / this.ppq;
      let a = n.a;
      if (a === 'sus' && dur * spb < 0.2 && !n.leg && !n.legOut) a = ['vln1', 'vln2', 'vla', 'vc'].includes(n.i) ? 'spic' : n.i === 'cb' ? 'pizz' : ['hn', 'tp', 'tb'].includes(n.i) ? 'stac' : 'sus';
      let m = n.m;
      if (m != null && RANGE[n.i]) {
        while (m < RANGE[n.i][0] - 2) m += 12;
        while (m > RANGE[n.i][1] + 2) m -= 12;
      }
      const v = Math.min(1, n.v * (0.6 + 0.8 * this.intensity));
      const e = { i: n.i, a, b, d: dur, m, v };
      if (n.leg) e.leg = true;
      if (n.legOut) e.legOut = true;
      events.push(e);
    }
    this.bar++;
    return { beats: this.beatsPerBar, bpm: bpm * this.tempo, events, info: { section: this.label || 'score', bar: this.bar, chord: '', key: '', name: this.name, e: this.intensity } };
  }
}
