// SPDX-License-Identifier: MIT
// The composer: rule-based, seeded, endless. It plans one bar at a time and
// returns plain events (no audio here), so it runs the same in a browser, in
// a test, or in a game that wants its own playback.
//
// Song shape: sections (intro, verse, build, drop, break, bridge) chained by
// a weighted Markov walk. Each section has an energy that decides which
// layers play. Surprise comes from boundary events (key changes, new grooves,
// new melodies, theme quotes, half-time, tempo drift) and from small per-bar
// mutations, scaled by the SURPRISE knob.

import { Rng } from './rng.js';
import { STYLES, STYLE_BY_ID, LAYERS } from './styles.js';
import { SCALES, SCALE_LABEL, degreeToMidi, chordDegrees, chordName, voiceLead, noteName } from './theory.js';
import { THEMES } from './themes.js';

const SECTIONS = {
  intro: { energy: [0.15, 0.35], bars: [4, 8] },
  verse: { energy: [0.45, 0.66], bars: [8, 16] },
  build: { energy: [0.62, 0.76], bars: [4, 4] },
  drop: { energy: [0.86, 1], bars: [8, 16] },
  break: { energy: [0.1, 0.3], bars: [4, 8] },
  bridge: { energy: [0.38, 0.58], bars: [8, 8] },
};

const NEXT = {
  intro: [['verse', 3], ['build', 1]],
  verse: [['build', 3], ['drop', 1], ['bridge', 1]],
  build: [['drop', 1]],
  drop: [['break', 2], ['verse', 1], ['bridge', 1], ['drop', 0.5]],
  break: [['build', 2], ['verse', 1], ['bridge', 0.5]],
  bridge: [['build', 1], ['drop', 1], ['verse', 0.5]],
};

const pc = (d) => ((d % 7) + 7) % 7;

export class Composer {
  constructor({ seed = 1, style = 'lofi', surprise = 0.5 } = {}) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.surprise = surprise;
    this.freeze = false;
    this.halftime = false;
    this.queued = null;
    this.pendingStyle = null;
    this.totalBars = 0;
    this.messages = [];
    this.section = null;
    this.barInSection = 0;
    this.prevKeys = null;
    this.prevPad = null;
    this.lastLead = null;
    this.hold = new Set(); // parts the user is keeping as they are
    this.themeLock = false; // stay on a stored theme, only vary around it
    this.extraThemes = []; // themes imported from MIDI
    this.applyStyle(style, true);
  }

  // ---- style / harmony ---------------------------------------------------

  applyStyle(id, fresh) {
    const r = this.rng;
    this.style = STYLE_BY_ID[id] || STYLES[0];
    const s = this.style;
    this.bpm = r.int(s.bpm[0], s.bpm[1]);
    if (fresh || !s.scales.includes(this.scaleName)) this.scaleName = r.pick(s.scales);
    if (fresh) this.key = r.int(0, 11);
    this.newProgression();
    this.newDrums();
    this.newBass();
    this.newComp();
    this.newMotif();
    this.newArp();
    this.halftime = false;
  }

  get scale() {
    return SCALES[this.scaleName];
  }

  // Tonic in octave 3 (MIDI 48-59), the reference for chords and melody.
  get keyRoot() {
    return 48 + this.key;
  }

  get keyName() {
    return noteName(this.key) + ' ' + SCALE_LABEL[this.scaleName];
  }

  newProgression() {
    const s = this.style;
    let p = this.rng.pick(s.progressions).slice();
    // Sometimes borrow a chord or rotate the loop, so the same style keeps finding new loops.
    if (this.rng.chance(0.3 * (0.5 + this.surprise))) {
      const i = this.rng.int(1, p.length - 1);
      const ok = [1, 2, 3, 4, 5, 6].filter((d) => d !== p[i - 1] && !this.isDiminished(d));
      p[i] = this.rng.pick(ok);
    }
    if (this.rng.chance(0.2)) p = p.slice(1).concat(p[0]);
    this.progression = p;
  }

  isDiminished(deg) {
    const m = chordDegrees(deg, 3).map((d) => degreeToMidi(this.keyRoot, this.scale, d));
    return m[2] - m[0] === 6;
  }

  chordAt(barInSection) {
    const s = this.style;
    const i = Math.floor(barInSection / s.barsPerChord) % this.progression.length;
    return { deg: this.progression[i], next: this.progression[(i + 1) % this.progression.length], change: barInSection % s.barsPerChord === 0 };
  }

  chordPcs(deg, size) {
    return chordDegrees(deg, size).map((d) => (degreeToMidi(this.keyRoot, this.scale, d) % 12 + 12) % 12);
  }

  keyChange() {
    const r = this.rng;
    const old = this.keyName;
    const opts = [['up2', 3], ['up5', 2], ['relative', 3], ['mode', 2], ['down1', 1]];
    const kind = r.weighted(opts);
    const minorish = ['minor', 'dorian', 'phrygian', 'harmonicMinor'].includes(this.scaleName);
    if (kind === 'up2') this.key = (this.key + 2) % 12;
    else if (kind === 'up5') this.key = (this.key + 5) % 12;
    else if (kind === 'down1') this.key = (this.key + 11) % 12;
    else if (kind === 'relative') {
      const target = minorish ? this.style.scales.find((x) => ['major', 'lydian', 'mixolydian'].includes(x)) : this.style.scales.find((x) => ['minor', 'dorian', 'harmonicMinor'].includes(x));
      if (target) {
        this.key = (this.key + (minorish ? 3 : 9)) % 12;
        this.scaleName = target;
      } else this.key = (this.key + 2) % 12;
    } else {
      const others = this.style.scales.filter((x) => x !== this.scaleName);
      if (others.length) this.scaleName = r.pick(others);
    }
    this.say(`KEY CHANGE ${old} → ${this.keyName}`);
  }

  // ---- parts ---------------------------------------------------------------

  newDrums() {
    const r = this.rng;
    const d = this.style.drums;
    const mutate = (p, extra, keep) => {
      const a = p.split('');
      if (r.chance(0.35 * (0.4 + this.surprise))) {
        const i = r.int(0, 15);
        if (!keep(i)) a[i] = a[i] === '.' ? extra : '.';
      }
      return a.join('');
    };
    const prev = this.drums;
    this.drums = {
      kick: mutate(r.pick(d.kick), 'x', (i) => i === 0),
      snare: mutate(r.pick(d.snare), 'o', (i) => i % 8 === 4 || i === 8),
      hats: mutate(r.pick(d.hats), 'o', () => false),
      open: r.pick(d.open),
    };
    if (prev && this.hold) {
      for (const k of ['kick', 'snare', 'hats']) if (this.hold.has(k)) this.drums[k] = prev[k];
      if (this.hold.has('hats')) this.drums.open = prev.open;
    }
  }

  newBass() {
    const r = this.rng;
    let p = r.pick(this.style.bass.patterns).split('');
    if (r.chance(0.3 * (0.4 + this.surprise))) {
      const i = r.int(1, 15);
      if (p[i] === '.') p[i] = r.pick(['x', 'o', 'f']);
      else if (p[i] === 'x') p[i] = r.pick(['o', 'f']);
    }
    this.bassPat = p.join('');
  }

  newComp() {
    this.compPat = this.rng.pick(this.style.keys.patterns);
  }

  newArp() {
    this.arpMode = this.rng.pick(this.style.arp.modes);
    this.arpOct = this.rng.pick([1, 2, 2]);
  }

  // fromTheme: true / false / undefined (let chance decide) / a theme object to use.
  newMotif(fromTheme) {
    const r = this.rng;
    const useTheme = fromTheme ?? r.chance(0.18 + 0.25 * this.surprise);
    let notes;
    if (useTheme) {
      const th = typeof useTheme === 'object' ? useTheme : r.pick(THEMES.concat(this.extraThemes || []));
      const src = th.notes;
      const start = r.int(0, Math.max(0, src.length - 6));
      const speed = r.pick([1, 1, 0.5]);
      notes = [];
      let step = 0;
      for (let i = start; i < src.length && step < 32; i++) {
        const [deg, beats] = src[i];
        const len = Math.max(1, Math.round(beats * 4 * speed));
        if (deg !== null) notes.push({ step, len: Math.min(len, 32 - step), deg: deg + 2 });
        step += len;
      }
      this.motifName = th.name;
      this.say(`THEME QUOTE: ${th.name}`);
    } else {
      notes = this.generateMotif();
      this.motifName = null;
    }
    if (notes.length < 3) notes = this.generateMotif();
    this.motif = notes;
    this.motifB = this.vary(notes);
  }

  generateMotif() {
    const r = this.rng;
    const L = this.style.lead;
    const cells = Object.entries(L.cells);
    const notes = [];
    let deg = r.pick([2, 4, 4, 7, 6]);
    let lastLeap = 0;
    for (let c = 0; c < 8; c++) {
      let cell = r.weighted(cells);
      if (c % 2 === 1 && r.next() > L.density + 0.3) cell = '....';
      if (c === 0 && cell === '....') cell = 'x...';
      for (let k = 0; k < 4; k++) {
        const ch = cell[k];
        if (ch === '-' && notes.length) {
          notes[notes.length - 1].len++;
          continue;
        }
        if (ch !== 'x') continue;
        let move;
        if (lastLeap) move = -Math.sign(lastLeap);
        else {
          const x = r.next();
          move = x < 0.45 ? r.pick([-1, 1]) : x < 0.68 ? r.pick([-2, 2]) : x < 0.8 ? 0 : r.pick([-4, -3, 3, 4, 5]);
        }
        if (deg + move > 9 || deg + move < -2) move = -move;
        deg += move;
        lastLeap = Math.abs(move) >= 3 ? move : 0;
        notes.push({ step: c * 4 + k, len: 1, deg });
      }
    }
    // Let the last note ring a bit and land somewhere stable.
    if (notes.length) {
      const last = notes[notes.length - 1];
      last.len = Math.max(last.len, Math.min(4, 32 - last.step));
    }
    return notes;
  }

  vary(m) {
    const r = this.rng;
    const kind = r.weighted([['answer', 3], ['shift', 2], ['invert', 1], ['rhythm', 1], ['sparse', 1], ['ornament', 1.5]]);
    let out = m.map((n) => ({ ...n }));
    if (kind === 'answer') {
      const last = out[out.length - 1];
      last.deg = r.pick([0, 7, 4]);
    } else if (kind === 'shift') {
      const s = r.pick([1, 2, -1, -2, 3]);
      out.forEach((n) => (n.deg += s));
    } else if (kind === 'invert') {
      const a = out[0].deg;
      out.forEach((n) => (n.deg = a - (n.deg - a)));
    } else if (kind === 'rhythm') {
      const s = r.pick([2, -2, 4]);
      out.forEach((n) => (n.step = (n.step + s + 32) % 32));
      out.sort((a, b) => a.step - b.step);
      for (let i = 0; i < out.length; i++) {
        const end = i + 1 < out.length ? out[i + 1].step : 32;
        out[i].len = Math.max(1, Math.min(out[i].len, end - out[i].step));
      }
    } else if (kind === 'sparse') {
      out = out.filter((n, i) => i === 0 || r.chance(0.65));
    } else if (kind === 'ornament') {
      const add = [];
      for (let i = 0; i < out.length - 1; i++) {
        const gap = out[i + 1].step - out[i].step;
        if (gap >= 2 && out[i].len >= 2 && r.chance(0.5)) {
          out[i].len = 1;
          add.push({ step: out[i].step + 1, len: gap - 1, deg: out[i].deg + Math.sign(out[i + 1].deg - out[i].deg || 1) });
        }
      }
      out = out.concat(add).sort((a, b) => a.step - b.step);
    }
    out.forEach((n) => (n.deg = Math.max(-3, Math.min(10, n.deg))));
    return out;
  }

  // ---- structure -----------------------------------------------------------

  makeSection(type) {
    const r = this.rng;
    const def = SECTIONS[type];
    const energy = r.float(def.energy[0], def.energy[1]);
    const choices = [];
    for (let b = def.bars[0]; b <= def.bars[1]; b += 4) choices.push(b);
    const bars = r.pick(choices);
    const sec = { type, energy, bars, next: r.weighted(NEXT[type]), halftime: false };
    sec.layers = this.pickLayers(energy, type);
    return sec;
  }

  pickLayers(energy, type) {
    const r = this.rng;
    const th = this.style.layers;
    const on = new Set();
    for (const l of LAYERS) {
      const jitter = r.float(-0.12, 0.12) * (0.5 + this.surprise);
      if (energy > th[l] + jitter) on.add(l);
    }
    if (!on.has('keys') && !on.has('pad')) on.add(th.keys <= th.pad ? 'keys' : 'pad');
    if (type === 'drop') {
      for (const l of ['kick', 'bass']) if (th[l] < 0.8) on.add(l);
      if (!on.has('lead') && !on.has('arp')) on.add(th.lead <= th.arp ? 'lead' : 'arp');
    }
    if (type === 'break') {
      on.delete('kick');
      on.delete('snare');
    }
    return on;
  }

  advanceSection(forced) {
    const prev = this.section;
    const type = forced || (prev ? prev.next : 'intro');
    const sec = this.makeSection(type);
    this.section = sec;
    this.barInSection = 0;
    if (!prev) return;
    const r = this.rng;
    const p = this.surprise;
    if (this.pendingStyle) {
      const id = this.pendingStyle;
      this.pendingStyle = null;
      this.applyStyle(id, false);
      this.say(`STYLE → ${this.style.name} · ${this.bpm} BPM`);
      sec.layers = this.pickLayers(sec.energy, type);
      return;
    }
    if (type === 'build') return;
    const lock = this.themeLock;
    if ((type === 'drop' || type === 'verse' || type === 'bridge') && r.chance(0.2 + 0.4 * p) && this.can('lead')) {
      this.newMotif();
      if (!this.motifName) this.say('NEW MELODY');
    } else if (lock && r.chance(0.5)) {
      this.motifB = this.vary(this.motif);
      this.say('THEME VARIATION');
    }
    if (r.chance(0.04 + 0.2 * p) && !lock) this.keyChange();
    if (r.chance(0.1 + 0.35 * p) && this.can('keys') && this.can('pad')) {
      this.newProgression();
      this.say('NEW CHORDS');
    }
    if (r.chance(0.1 + 0.4 * p) && ['kick', 'snare', 'hats'].some((d) => !this.hold.has(d))) {
      this.newDrums();
      this.say('NEW GROOVE');
    }
    if (r.chance(0.1 + 0.3 * p) && this.can('bass')) this.newBass();
    if (r.chance(0.1 + 0.3 * p) && this.can('keys')) this.newComp();
    if (r.chance(0.2 * p) && !this.hold.has('arp')) this.newArp();
    if (r.chance(0.18 * p) && this.style.id !== 'ambient' && !lock) {
      const old = this.bpm;
      const [lo, hi] = this.style.bpm;
      this.bpm = Math.max(lo - 4, Math.min(hi + 4, this.bpm + r.pick([-4, -3, -2, 2, 3, 4])));
      this.say(`TEMPO ${old} → ${this.bpm}`);
    }
    if ((type === 'verse' || type === 'bridge') && r.chance(0.22 * p)) {
      sec.halftime = true;
      this.say('HALF-TIME');
    }
    if (type === 'drop') this.say('DROP');
    if (type === 'break') this.say('BREAKDOWN');
  }

  // ---- controls --------------------------------------------------------------

  say(msg) {
    this.messages.push(msg);
  }

  // May the composer rewrite this part by itself?
  can(part) {
    if (this.hold.has(part)) return false;
    return !(this.themeLock && ['bass', 'keys', 'pad', 'lead'].includes(part));
  }

  setHold(part, on) {
    if (on) this.hold.add(part);
    else this.hold.delete(part);
  }

  // The musical material of what is playing now: enough to make it the song's theme.
  material() {
    const keys = ['bpm', 'scaleName', 'key', 'progression', 'drums', 'bassPat', 'compPat', 'motif', 'motifB', 'motifName', 'arpMode', 'arpOct'];
    const m = { style: this.style.id };
    for (const k of keys) m[k] = structuredClone(this[k]);
    return m;
  }

  // Make stored material the base of the song from the next bar, and stay on it.
  useMaterial(m, lock = true) {
    const { style, ...rest } = structuredClone(m);
    this.style = STYLE_BY_ID[style] || this.style;
    Object.assign(this, rest);
    this.themeLock = lock;
    this.pendingStyle = null;
    this.queued = this.queued || 'verse';
    this.say(lock ? 'THEME RECALLED · VARIATIONS ONLY' : 'THEME RECALLED');
  }

  // A theme from outside (MIDI): { name, notes: [[degree, beats], ...] }. Used now and quoted later.
  importTheme(theme) {
    this.extraThemes = (this.extraThemes || []).filter((t) => t.name !== theme.name).concat(theme);
    this.newMotif(theme);
  }

  setStyle(id) {
    if (id === this.style.id && !this.pendingStyle) return;
    this.pendingStyle = id;
    this.queued = this.queued || 'verse';
  }

  setStyleNow(id) {
    this.applyStyle(id, false);
    this.section = null;
  }

  queue(type) {
    this.queued = type;
  }

  reroll(layer) {
    if (layer === 'kick' || layer === 'snare' || layer === 'hats') {
      const keep = { ...this.drums };
      this.newDrums();
      for (const k of ['kick', 'snare', 'hats']) if (k !== layer) this.drums[k] = keep[k];
      if (layer === 'hats') this.drums.open = this.rng.pick(this.style.drums.open);
      this.say(`NEW ${layer.toUpperCase()}`);
    } else if (layer === 'bass') {
      this.newBass();
      this.say('NEW BASSLINE');
    } else if (layer === 'keys') {
      this.newComp();
      this.newProgression();
      this.say('NEW CHORDS');
    } else if (layer === 'pad') {
      this.newProgression();
      this.say('NEW CHORDS');
    } else if (layer === 'lead') {
      this.newMotif(false);
      this.say('NEW MELODY');
    } else if (layer === 'arp') {
      this.newArp();
      this.say(`ARP ${this.arpMode.toUpperCase()}`);
    }
  }

  // ---- save points ---------------------------------------------------------------

  snapshot() {
    const keys = ['seed', 'halftime', 'totalBars', 'barInSection', 'prevKeys', 'prevPad', 'lastLead', 'bpm', 'scaleName', 'key', 'progression', 'drums', 'bassPat', 'compPat', 'motif', 'motifB', 'motifName', 'arpMode', 'arpOct'];
    const snap = { rng: this.rng.s, style: this.style.id, section: this.section && { ...this.section, layers: [...this.section.layers] } };
    for (const k of keys) snap[k] = structuredClone(this[k]);
    return snap;
  }

  restore(snap) {
    const { rng, style, section, ...rest } = structuredClone(snap);
    this.rng.s = rng;
    this.style = STYLE_BY_ID[style];
    this.section = section && { ...section, layers: new Set(section.layers) };
    Object.assign(this, rest);
    this.queued = null;
    this.pendingStyle = null;
    this.messages = [];
  }

  // ---- bar planning ------------------------------------------------------------

  nextBar() {
    if (!this.section) this.advanceSection();
    else if (this.queued) {
      const q = this.queued;
      this.queued = null;
      this.advanceSection(q === 'next' ? null : q);
    } else if (this.barInSection >= this.section.bars) {
      if (this.freeze) this.barInSection = 0;
      else this.advanceSection();
    }
    // A save point at the start of every section, so the song can go back there.
    if (this.barInSection === 0) this.savePoint = this.snapshot();
    const bar = this.planBar();
    if (this.barInSection === 0) bar.snapshot = this.savePoint;
    this.barInSection++;
    this.totalBars++;
    return bar;
  }

  planBar() {
    const r = this.rng;
    const s = this.style;
    const sec = this.section;
    const p = this.surprise;
    const b = this.barInSection;
    const lastBar = b === sec.bars - 1;
    const events = [];
    const L = sec.layers;
    const energy = sec.type === 'build' ? sec.energy + (b / sec.bars) * 0.2 : sec.energy;
    const half = sec.halftime || this.halftime;

    // Small mutations inside a section keep loops from settling.
    if (!this.freeze && b > 0 && b % 4 === 0) {
      if (r.chance(0.25 * p) && !this.hold.has('lead')) this.motifB = this.vary(this.motif);
      if (r.chance(0.12 * p) && this.can('hats')) this.drums.hats = this.mutateHats(this.drums.hats);
    }

    const ch = this.chordAt(b);
    const size = s.chordSize;
    const pcs = this.chordPcs(ch.deg, size);
    const chordTones = new Set(chordDegrees(ch.deg, 3).map(pc));

    // Drums
    const vel = (c) => (c === 'X' ? 1 : c === 'x' ? 0.82 : c === 'o' ? 0.35 : 0);
    const hum = () => r.float(-0.07, 0.07);
    if (L.has('kick')) {
      const pat = half ? 'x.........x.....' : this.drums.kick;
      for (let i = 0; i < 16; i++) {
        let v = vel(pat[i]);
        if (energy < 0.45 && i % 8 !== 0) v *= r.chance(0.5) ? 1 : 0;
        if (!v && !half && i % 4 === 2 && r.chance(0.03 * p * energy)) v = 0.6;
        if (v) events.push({ ch: 'kick', step: i, vel: Math.min(1, v + hum()) });
      }
    }
    if (L.has('snare')) {
      let pat = half ? '........x.......' : this.drums.snare;
      if (sec.type === 'build') pat = this.buildRoll(b, sec.bars);
      for (let i = 0; i < 16; i++) {
        let v = vel(pat[i]);
        if (sec.type === 'build' && v) v = 0.35 + 0.65 * ((b * 16 + i) / (sec.bars * 16));
        if (!v && !half && pat[i] === '.' && r.chance(0.05 * p * energy)) v = 0.25;
        if (v) events.push({ ch: 'snare', step: i, vel: Math.min(1, v + hum()) });
      }
    }
    if (L.has('hats')) {
      const pat = this.drums.hats;
      for (let i = 0; i < 16; i++) {
        let v = vel(pat[i]);
        if (energy < 0.45 && i % 2 === 1) v = 0;
        if (v) events.push({ ch: 'hats', step: i, vel: Math.min(1, v * (i % 4 === 0 ? 1 : i % 2 === 0 ? 0.8 : 0.62) + hum()) });
        if (this.drums.open[i] === 'x' && energy >= 0.5) events.push({ ch: 'hats', step: i, vel: 0.7, open: true });
      }
    }
    if (b === 0 && (sec.type === 'drop' || (sec.type === 'verse' && r.chance(0.5))) && (L.has('kick') || L.has('hats'))) {
      events.push({ ch: 'hats', step: 0, vel: 1, crash: true });
    }
    if (lastBar && sec.type !== 'build' && sec.type !== 'break' && (L.has('snare') || L.has('kick')) && r.chance(0.45 + 0.4 * p)) {
      this.fill(events, r);
    }

    // Bass
    if (L.has('bass')) {
      const pat = energy < 0.35 ? 'x---------------' : this.bassPat;
      const root = this.bassMidi(ch.deg);
      for (let i = 0; i < 16; i++) {
        const c = pat[i];
        if (c === '.' || c === '-') continue;
        let len = 1;
        while (i + len < 16 && pat[i + len] === '-') len++;
        let m = root;
        if (c === 'o') m = root + 12;
        else if (c === 'f') m = this.bassMidi(ch.deg + 4, root);
        else if (c === 'a') {
          const nr = this.bassMidi(ch.next, root);
          m = this.bassMidi(ch.next + (nr > root ? -1 : 1), root);
        }
        events.push({ ch: 'bass', step: i, midi: m, len, vel: (i % 4 === 0 ? 0.95 : 0.78) + hum() });
      }
    }

    // Keys
    if (L.has('keys')) {
      const voicing = voiceLead(this.prevKeys, pcs, s.keys.low, s.keys.high);
      this.prevKeys = voicing;
      const pat = this.compPat;
      for (let i = 0; i < 16; i++) {
        if (pat[i] !== 'x') continue;
        if (i > 0 && r.chance(0.08 * p)) continue;
        let len = 1;
        while (i + len < 16 && pat[i + len] === '-') len++;
        events.push({ ch: 'keys', step: i, midis: voicing, len, vel: (i === 0 ? 0.9 : 0.72) + hum() });
      }
      if (ch.next !== ch.deg && (b + 1) % s.barsPerChord === 0 && r.chance(0.12 * p) && pat[14] !== 'x') {
        const push = voiceLead(voicing, this.chordPcs(ch.next, size), s.keys.low, s.keys.high);
        events.push({ ch: 'keys', step: 14, midis: push, len: 2, vel: 0.7, push: true });
      }
    }

    // Pad
    if (L.has('pad') && ch.change) {
      const v = voiceLead(this.prevPad, pcs.slice(0, Math.min(4, pcs.length)), 50, 72);
      this.prevPad = v;
      events.push({ ch: 'pad', step: 0, midis: v, len: 16 * s.barsPerChord, vel: 0.8 });
    }

    // Lead
    if (L.has('lead')) {
      const phraseBar = b % 4;
      const m = phraseBar < 2 ? this.motif : this.motifB;
      const halfIdx = phraseBar % 2;
      const rest = energy < 0.62 && phraseBar === 3 && r.chance(0.55);
      if (!rest) {
        const base = this.keyRoot + 12;
        for (const n of m) {
          const st = n.step - halfIdx * 16;
          if (st < 0 || st >= 16) continue;
          let deg = n.deg;
          if (st % 8 === 0 && !chordTones.has(pc(deg))) {
            for (const dd of [1, -1, 2, -2]) {
              if (chordTones.has(pc(deg + dd))) {
                deg += dd;
                break;
              }
            }
          }
          let midi = degreeToMidi(base, this.scale, deg);
          while (midi > 88) midi -= 12;
          while (midi < 55) midi += 12;
          events.push({ ch: 'lead', step: st, midi, len: Math.min(n.len, 16 - st + 2), vel: (st % 4 === 0 ? 0.9 : 0.75) + hum(), glideFrom: this.lastLead });
          this.lastLead = midi;
        }
      }
    }

    // Arp
    if (L.has('arp')) {
      const rate = s.arp.rate;
      const base = this.keyRoot + 12;
      const tones = [];
      for (let o = 0; o < this.arpOct; o++) for (const x of pcs) tones.push(base + o * 12 + ((x - base) % 12 + 12) % 12);
      tones.sort((a, b2) => a - b2);
      let seq = tones;
      if (this.arpMode === 'down') seq = tones.slice().reverse();
      else if (this.arpMode === 'updown') seq = tones.concat(tones.slice(1, -1).reverse());
      let k = 0;
      for (let i = 0; i < 16; i += rate) {
        const m = this.arpMode === 'random' ? r.pick(tones) : seq[k++ % seq.length];
        events.push({ ch: 'arp', step: i, midi: m, len: rate * 0.9, vel: (i % 4 === 0 ? 0.85 : 0.65) + hum() });
      }
    }

    // Effects and transitions
    if (sec.type === 'build') {
      if (b === 0) events.push({ fx: 'sweepUp', step: 0, bars: sec.bars });
      if (b === sec.bars - 2) events.push({ fx: 'riser', step: 0, bars: 2 });
    }
    if (sec.type === 'break' && b === 0 && r.chance(0.5)) events.push({ fx: 'sweepDown', step: 0, bars: 2 });
    const dubby = s.id === 'dub' ? 3 : 1;
    if (r.chance((0.06 + 0.12 * p) * dubby)) {
      const cands = ['snare', 'keys', 'lead'].filter((c) => L.has(c));
      const c = cands.length ? r.pick(cands) : null;
      const hit = c && events.filter((e) => e.ch === c && e.step >= 8);
      if (hit && hit.length) {
        events.push({ fx: 'throw', ch: c, step: hit[0].step, beats: 1 });
        this.say(`ECHO THROW: ${c.toUpperCase()}`);
      }
    }
    if (lastBar && r.chance(0.03 * p * dubby)) {
      events.push({ fx: 'spin', step: 8, beats: 2 });
      this.say('ECHO SPIN');
    }
    // A moment of silence before a drop.
    if (lastBar && sec.next === 'drop' && !this.queued && r.chance(0.35 + 0.3 * p)) {
      for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (!e.fx && e.ch !== 'pad' && e.step >= 12) events.splice(i, 1);
      }
    }

    const messages = this.messages;
    this.messages = [];
    return {
      events,
      info: {
        bar: this.totalBars,
        section: sec.type,
        next: this.queued && this.queued !== 'next' ? this.queued : sec.next,
        barInSection: b,
        sectionBars: sec.bars,
        energy,
        layers: [...L],
        halftime: half,
        bpm: this.bpm,
        swing: s.swing,
        style: s.id,
        styleName: s.name,
        key: this.keyName,
        chord: chordName(this.keyRoot, this.scale, ch.deg, size),
        theme: this.motifName,
        messages,
      },
    };
  }

  bassMidi(deg, near) {
    let m = degreeToMidi(this.keyRoot, this.scale, deg) - 12 * (3 - this.style.bass.octave);
    if (near != null) {
      while (m - near > 7) m -= 12;
      while (near - m > 7) m += 12;
    } else {
      const lo = this.style.bass.octave === 1 ? 26 : 33;
      while (m < lo) m += 12;
      while (m >= lo + 12) m -= 12;
    }
    return m;
  }

  buildRoll(b, bars) {
    const pos = b / bars;
    if (pos < 0.25) return '....x.......x...';
    if (pos < 0.5) return 'x...x...x...x...';
    if (pos < 0.75) return 'x.x.x.x.x.x.x.x.';
    return 'xxxxxxxxxxxxxxxx';
  }

  mutateHats(p) {
    const a = p.split('');
    const i = this.rng.int(0, 15);
    a[i] = a[i] === '.' ? 'o' : a[i] === 'o' ? 'x' : '.';
    return a.join('');
  }

  fill(events, r) {
    const kind = r.weighted([['roll', 3], ['toms', 2], ['stutter', 1.5], ['gap', 1]]);
    const from = kind === 'roll' && r.chance(0.4) ? 8 : 12;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if ((e.ch === 'kick' || e.ch === 'snare') && e.step >= from) events.splice(i, 1);
    }
    if (kind === 'roll') for (let i = from; i < 16; i++) events.push({ ch: 'snare', step: i, vel: 0.4 + 0.6 * ((i - from) / (16 - from)) });
    else if (kind === 'toms') {
      const pitches = [220, 180, 150, 120];
      [12, 13, 14, 15].forEach((st, k) => events.push({ ch: 'snare', step: st, vel: 0.85, tom: pitches[k] }));
    } else if (kind === 'stutter') {
      [12, 13, 14, 15].forEach((st) => events.push({ ch: st % 2 ? 'snare' : 'kick', step: st, vel: 0.8 }));
    }
  }
}
