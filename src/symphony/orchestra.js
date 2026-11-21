// SPDX-License-Identifier: MIT
// The orchestra in Web Audio: a multi-sampler over the VSCO 2 Community
// Edition samples (CC0, see LICENSES.md), seated on a stage (each player
// panned and sent to the hall by where it sits), section faders, and a
// concert-hall reverb whose impulse response is generated at run time.
// Works in an AudioContext or an OfflineAudioContext (for SAVE WAV).

import { SECTION_OF } from './composer.js';

export const SAMPLE_ROOT = 'samples/vsco2/';

// Player -> articulation -> sample set (first one that exists wins).
const SETS = {
  vln1: { sus: ['vln_sus'], spic: ['vln_spic'], trem: ['vln_trem', 'vln_sus'], pizz: ['vln_pizz'] },
  vla: { sus: ['vla_sus'], spic: ['vla_spic'], trem: ['vla_sus'], pizz: ['vln_pizz'] },
  vc: { sus: ['vc_sus'], spic: ['vc_spic'], trem: ['vc_trem', 'vc_sus'], pizz: ['cb_pizz'] },
  cb: { sus: ['cb_sus'], spic: ['cb_pizz'], trem: ['cb_sus'], pizz: ['cb_pizz'] },
  hn: { sus: ['hn_sus'], stac: ['hn_stac'] },
  tp: { sus: ['tp_sus'], stac: ['tp_stac'] },
  tb: { sus: ['tb_sus'], stac: ['tb_stac'] },
  tu: { sus: ['tu_sus'] },
  fl: { sus: ['fl_sus'] },
  ob: { sus: ['ob_sus'] },
  cl: { sus: ['cl_sus'] },
  bn: { sus: ['bn_sus'] },
  harp: { hit: ['harp'] },
  glock: { hit: ['glock'] },
  timp: { hit: ['timp'], roll: ['timp_roll'] },
};
SETS.vln2 = SETS.vln1;

// Unpitched hits: articulation -> file names by rising strength.
const HITS = {
  cym: { crash: ['crash_hit_mp_loose', 'crash_hit_ff_loose', 'crash_hit_fff_loose'], hit: ['susp_hit_softmall_f'], swell: ['susp_hit_softmall_roll4_fff_long'], soft: ['susp_hit_softmall_f'] },
  bd: { hit: ['bdrum_mp_1', 'bdrum_f_1', 'bdrum_fff_1'], roll: ['bdrum_roll_long1'] },
  sn: { hit: ['snare1_mp_1', 'snare1_f_1', 'snare1_ff_1'], roll: ['snare2_nosnare_roll_ff_1'] },
  gong: { hit: ['gong_hit_mf', 'gong_hit_ff'], roll: ['gong_roll_medium_f'] },
  tri: { hit: ['Triangle6-Hit_v2_rr1_Sum'] },
};

// Seating: pan (-1 left .. 1 right), depth (0 front .. 1 back), level trim.
export const SEATS = {
  vln1: { pan: -0.55, depth: 0.05, gain: 0.85, row: 0 },
  vln2: { pan: -0.22, depth: 0.12, gain: 0.75, row: 0 },
  vla: { pan: 0.18, depth: 0.12, gain: 0.85, row: 0 },
  vc: { pan: 0.45, depth: 0.1, gain: 0.95, row: 0 },
  cb: { pan: 0.68, depth: 0.3, gain: 1.0, row: 1 },
  harp: { pan: -0.72, depth: 0.25, gain: 0.8, row: 1 },
  fl: { pan: -0.18, depth: 0.45, gain: 0.7, row: 2 },
  ob: { pan: 0.08, depth: 0.45, gain: 0.7, row: 2 },
  cl: { pan: -0.08, depth: 0.55, gain: 0.7, row: 2 },
  bn: { pan: 0.2, depth: 0.55, gain: 0.75, row: 2 },
  hn: { pan: -0.38, depth: 0.7, gain: 0.8, row: 3 },
  tp: { pan: 0.08, depth: 0.8, gain: 0.7, row: 3 },
  tb: { pan: 0.36, depth: 0.8, gain: 0.72, row: 3 },
  tu: { pan: 0.52, depth: 0.8, gain: 0.8, row: 3 },
  glock: { pan: 0.4, depth: 0.85, gain: 0.45, row: 4 },
  timp: { pan: -0.12, depth: 0.95, gain: 0.9, row: 4 },
  cym: { pan: 0.25, depth: 0.95, gain: 0.55, row: 4 },
  bd: { pan: 0.15, depth: 0.95, gain: 0.8, row: 4 },
  sn: { pan: 0.3, depth: 0.95, gain: 0.5, row: 4 },
  gong: { pan: 0.05, depth: 1, gain: 0.6, row: 4 },
  tri: { pan: 0.35, depth: 0.95, gain: 0.35, row: 4 },
};

const RELEASE = { strings: 0.38, brass: 0.28, winds: 0.22 };
// Players whose sample is left to ring out instead of being cut at the note's end.
const RING = new Set(['harp', 'glock', 'timp', 'cym', 'bd', 'sn', 'gong', 'tri']);
// Which sets to load first, so music can start before everything is in.
export const CORE = ['vln_sus', 'vla_sus', 'vc_sus', 'cb_sus', 'hn_sus', 'timp', 'harp', 'fl_sus', 'ob_sus'];

export class SampleBank {
  constructor() {
    this.map = null;
    this.buffers = new Map();
    this.loaded = 0;
    this.total = 0;
  }

  // sources: [{ root, sets? }] loads several sample folders into one bank
  // (a sample's `f` becomes root + its path); `sets` limits what is loaded,
  // `core` is loaded first so music can start early.
  async load(ctx, { root = SAMPLE_ROOT, sources = [{ root }], core = CORE, onProgress = () => {}, fetcher = fetch } = {}) {
    const map = {};
    for (const src of sources) {
      const m = await (await fetcher(src.root + 'map.json')).json();
      for (const [k, v] of Object.entries(m)) {
        if (src.sets && !src.sets.includes(k)) continue;
        map[k] = { ...v, samples: v.samples.map((s) => ({ ...s, f: src.root + s.f })) };
      }
    }
    const files = [];
    const order = [...core.filter((k) => map[k]), ...Object.keys(map).filter((k) => !core.includes(k))];
    for (const set of order) for (const s of map[set].samples) files.push(s.f);
    this.total = files.length;
    this.map = map;
    let i = 0;
    const worker = async () => {
      while (i < files.length) {
        const f = files[i++];
        try {
          const data = await (await fetcher(f)).arrayBuffer();
          this.buffers.set(f, await ctx.decodeAudioData(data));
        } catch (err) {
          console.warn('sample failed', f, err);
        }
        this.loaded++;
        onProgress(this.loaded, this.total, f);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  get ready() {
    return this.map && this.loaded >= this.total;
  }
}

// The symphony orchestra; other bands pass their own (see src/jazz/band.js).
export const SYMPHONY_BAND = {
  seats: SEATS, sets: SETS, hits: HITS, sectionOf: SECTION_OF, sections: ['strings', 'brass', 'winds', 'perc', 'harp'],
  ring: RING, release: RELEASE, ensemble: ['strings'], kit: {}, synth: {}, setGain: {}, fx: {},
};

export class Orchestra {
  constructor(ctx, bank, { destination = ctx.destination, band = SYMPHONY_BAND } = {}) {
    this.ctx = ctx;
    this.bank = bank;
    this.band = { ...SYMPHONY_BAND, ...band };
    this.rr = new Map();
    this.listeners = [];
    this.voices = 0;
    this.active = new Set();

    this.master = ctx.createGain();
    this.master.gain.value = 0.78;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -20;
    this.comp.ratio.value = 1.6;
    this.comp.knee.value = 10;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.3;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.15;
    this.warmth = ctx.createBiquadFilter();
    this.warmth.type = 'lowshelf';
    this.warmth.frequency.value = 220;
    this.warmth.gain.value = 1.5;
    this.air = ctx.createBiquadFilter();
    this.air.type = 'highshelf';
    this.air.frequency.value = 7000;
    this.air.gain.value = -1;
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.dry.connect(this.warmth);
    this.wet.connect(this.warmth);
    // The compressors add make-up gain, so the level is set after them and a soft clipper catches what is left.
    this.clip = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.abs(x) < 0.8 ? x : Math.sign(x) * (0.8 + 0.18 * Math.tanh((Math.abs(x) - 0.8) / 0.18));
    }
    this.clip.curve = curve;
    this.clip.oversample = '2x';
    this.warmth.connect(this.air).connect(this.comp).connect(this.limiter).connect(this.master).connect(this.clip).connect(destination);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(this.analyser);

    // Hall reverb
    this.verbIn = ctx.createGain();
    this.verbPre = ctx.createDelay(0.2);
    this.verbPre.delayTime.value = 0.022;
    this.verbHP = ctx.createBiquadFilter();
    this.verbHP.type = 'highpass';
    this.verbHP.frequency.value = 120;
    this.convolver = ctx.createConvolver();
    this.verbIn.connect(this.verbHP).connect(this.verbPre).connect(this.convolver).connect(this.wet);

    // Sections and players
    this.sections = {};
    for (const s of this.band.sections) {
      const g = ctx.createGain();
      g.connect(this.dry);
      const send = ctx.createGain();
      g.connect(send).connect(this.verbIn);
      this.sections[s] = { gain: g, send, level: 1 };
    }
    this.players = {};
    for (const [p, seat] of Object.entries(this.band.seats)) {
      const input = ctx.createGain();
      input.gain.value = seat.gain;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 16000 - seat.depth * 7000; // far players a touch darker
      const pan = ctx.createStereoPanner();
      pan.pan.value = seat.pan;
      input.connect(tone).connect(pan);
      // A band can give a player its own effect (a tempo-synced delay, a chorus).
      const fx = this.band.fx?.[p]?.(ctx);
      if (fx) pan.connect(fx.input), fx.output.connect(this.sections[this.band.sectionOf[p]].gain);
      else pan.connect(this.sections[this.band.sectionOf[p]].gain);
      this.players[p] = { input, seat, fx, spb: 0 };
    }
    this.setHall(0.6, 0.5);
  }

  onNote(fn) {
    this.listeners.push(fn);
  }

  // size 0..1 (small hall .. cathedral), mix 0..1
  setHall(size, mix) {
    this.hallSize = size;
    this.hallMix = mix;
    const rt = 1.2 + size * 3.6;
    if (Math.abs((this.rt || 0) - rt) > 0.05) {
      this.rt = rt;
      this.convolver.buffer = hallImpulse(this.ctx, rt);
    }
    const t = this.ctx.currentTime;
    this.wet.gain.setTargetAtTime(0.25 + mix * 1.1, t, 0.05);
    this.dry.gain.setTargetAtTime(1.05 - mix * 0.45, t, 0.05);
    for (const s of Object.values(this.sections)) s.send.gain.setTargetAtTime(0.35 + mix * 0.4, t, 0.05);
  }

  setSection(name, level) {
    const s = this.sections[name];
    s.level = level;
    s.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
  }

  // Silence everything that is sounding or scheduled.
  stopAll(fade = 0.25) {
    const t = this.ctx.currentTime;
    for (const { src, g } of this.active) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.setTargetAtTime(0, t, fade / 3);
      try {
        src.stop(t + fade + 0.05);
      } catch {}
    }
  }

  get voiceCount() {
    return this.active.size;
  }

  setVolume(v) {
    this.master.gain.setTargetAtTime(v * 0.87, this.ctx.currentTime, 0.05);
  }

  pick(set, midi, vel, retry = false) {
    const info = this.bank.map?.[set];
    if (!info) return null;
    const layer = info.layers > 1 && set !== 'harp' ? Math.min(info.layers - 1, Math.floor(vel * info.layers * 0.999 + (info.layers === 2 ? 0.1 : 0))) : null;
    let best = null;
    let bestD = Infinity;
    for (const s of info.samples) {
      if (layer != null && s.v !== layer) continue;
      if (!this.bank.buffers.has(s.f)) continue;
      // Prefer pitching down a little over pitching up (pitching up thins the tone).
      const d = Math.abs(s.m + (s.c || 0) / 100 - midi) + (s.m < midi ? 0.4 : 0);
      if (d < bestD - 1e-6) [best, bestD] = [[s], d];
      else if (Math.abs(d - bestD) < 1e-6) best.push(s);
    }
    if (!best && layer != null && !retry) return this.pick(set, midi, vel < 0.5 ? 0.9 : 0.1, true);
    if (!best) return null;
    const key = set + best[0].m;
    const n = (this.rr.get(key) || 0) + 1;
    this.rr.set(key, n);
    return best[n % best.length];
  }

  // The nearest other recorded note: a second desk of players for the section sound.
  pickNeighbour(set, midi, s0) {
    const info = this.bank.map?.[set];
    let best = null;
    let bestD = Infinity;
    for (const s of info?.samples || []) {
      if (s.m === s0.m || s.v !== s0.v || !this.bank.buffers.has(s.f) || s.loop == null) continue;
      const d = Math.abs(s.m - midi);
      if (d < bestD) [best, bestD] = [s, d];
    }
    return bestD <= 5 ? best : null;
  }

  pickHit(player, art, vel) {
    const hits = this.band.hits;
    const names = hits[player]?.[art] || hits[player]?.hit;
    if (!names) return null;
    const name = names[Math.min(names.length - 1, Math.floor(vel * names.length))];
    const set = this.bank.map?.[player];
    return set?.samples.find((s) => s.f.endsWith('/' + name + '.mp3') && this.bank.buffers.has(s.f)) || null;
  }

  // A drum-kit hit: the strength layer from the velocity, round-robin inside it.
  pickKit(set, vel) {
    const info = this.bank.map?.[set];
    if (!info) return null;
    const layer = Math.min(info.layers - 1, Math.floor(vel * info.layers));
    const list = info.samples.filter((s) => s.v === layer && this.bank.buffers.has(s.f));
    if (!list.length) return info.samples.find((s) => this.bank.buffers.has(s.f)) || null;
    const n = (this.rr.get(set + layer) || 0) + 1;
    this.rr.set(set + layer, n);
    return list[n % list.length];
  }

  // Plays one composer event at audio time t; spb = seconds per beat.
  play(ev, t, spb) {
    const ctx = this.ctx;
    const pl = this.players[ev.i];
    if (!pl) return;
    const B = this.band;
    const section = B.sectionOf[ev.i];
    if (this.sections[section].level <= 0.001) return;
    const dur = Math.max(0.05, ev.d * spb);
    const v = ev.v;
    const v2 = ev.v2 ?? v;
    if (pl.fx?.tempo && pl.spb !== spb) {
      pl.spb = spb;
      pl.fx.tempo(spb, t);
    }
    if (B.synth[ev.i]) {
      B.synth[ev.i](ctx, pl.input, ev, t, dur, this.active);
      for (const fn of this.listeners) fn(ev, t, dur);
      return;
    }
    let s;
    let rate = 1;
    let gain = 1;
    if (B.kit[ev.i]) {
      const set = B.kit[ev.i][ev.a] || B.kit[ev.i].hit;
      s = this.pickKit(set, Math.max(v, v2));
      gain = B.setGain[set] ?? 1;
    } else if (B.hits[ev.i]) {
      s = this.pickHit(ev.i, ev.a, Math.max(v, v2));
    } else {
      const sets = B.sets[ev.i]?.[ev.a] || B.sets[ev.i]?.sus || B.sets[ev.i]?.hit;
      if (!sets) return;
      for (const set of sets) if ((s = this.pick(set, ev.m, Math.max(v, v2)))) {
        s.set = set;
        gain = B.setGain[set] ?? 1;
        break;
      }
      if (s) rate = Math.pow(2, (ev.m - s.m - (s.c || 0) / 100) / 12);
    }
    if (!s) return;
    const buf = this.bank.buffers.get(s.f);
    const ring = B.ring.has(ev.i) || ev.a === 'fall';
    const sustained = ev.a === 'sus' || ev.a === 'trem' || ev.a === 'roll' || ev.a === 'swell' || ev.a === 'mute' || ev.a === 'vib';
    const rel = ring ? 0.12 : sustained ? B.release[section] || 0.25 : B.shortRelease?.[section] ?? 0.12;
    const voices = B.ensemble.includes(section) && sustained && ev.i !== 'cb' ? 2 : 1;
    for (let k = 0; k < voices; k++) {
      let smp = s;
      let r = rate;
      if (k > 0) {
        smp = this.pickNeighbour(s.set, ev.m, s);
        if (!smp) break;
        r = Math.pow(2, (ev.m - smp.m - (smp.c || 0) / 100) / 12);
      }
      const src = ctx.createBufferSource();
      src.buffer = this.bank.buffers.get(smp.f);
      const detune = (Math.random() - 0.5) * 8;
      src.playbackRate.value = r * Math.pow(2, detune / 1200);
      if (smp.loop && sustained) {
        src.loop = true;
        src.loopStart = smp.loop[0];
        src.loopEnd = smp.loop[1];
      }
      const g = ctx.createGain();
      const lvl = (0.03 + 0.97 * Math.pow(v, 1.9)) * (k ? 0.55 : 1) * gain;
      const lvl2 = (0.03 + 0.97 * Math.pow(v2, 1.9)) * (k ? 0.55 : 1) * gain;
      const t0 = t + k * 0.011;
      const attack = sustained && !ring ? (ev.a === 'swell' || ev.a === 'roll' || ev.v2 != null ? 0.05 : 0.018 + (1 - v) * 0.06) : 0.002;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(lvl, t0 + attack);
      if (ev.v2 != null) g.gain.linearRampToValueAtTime(lvl2, t0 + dur);
      let end;
      if (ring && ev.a !== 'roll' && ev.a !== 'swell') {
        end = t0 + buf.duration / rate;
      } else {
        const hold = sustained ? dur : Math.min(dur + 0.15, buf.duration / rate);
        g.gain.setValueAtTime(ev.v2 != null ? lvl2 : lvl, t0 + Math.max(attack, hold));
        g.gain.setTargetAtTime(0, t0 + Math.max(attack, hold), rel / 3);
        end = t0 + Math.max(attack, hold) + rel * 2.5;
        if (!src.loop) end = Math.min(end, t0 + buf.duration / rate);
      }
      src.connect(g).connect(pl.input);
      src.start(t0);
      src.stop(end + 0.02);
      const node = { src, g };
      this.active.add(node);
      src.onended = () => {
        this.active.delete(node);
        g.disconnect();
      };
    }
    for (const fn of this.listeners) fn(ev, t, dur);
  }
}

// Concert-hall impulse response: early reflections, then a dense tail that
// gets darker as it decays (high frequencies die first, as in a real hall).
export function hallImpulse(ctx, rt60) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * Math.min(6, rt60 * 1.2));
  const buf = ctx.createBuffer(2, len, rate);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const env = Math.exp((-6.91 * t) / rt60);
      const onset = Math.min(1, t / 0.03);
      const k = 0.08 + 0.75 * Math.exp((-3 * t) / rt60);
      lp += k * (rnd() - lp);
      lp2 += k * (lp - lp2);
      d[i] = lp2 * env * onset * 2.2;
    }
    // Early reflections from the walls, different on each side.
    const taps = c ? [0.011, 0.019, 0.027, 0.041, 0.053, 0.067, 0.079] : [0.013, 0.017, 0.031, 0.037, 0.049, 0.061, 0.083];
    taps.forEach((tt, j) => {
      const at = Math.floor(tt * rate);
      if (at < len) d[at] += (0.5 - j * 0.05) * (j % 2 ? -1 : 1);
    });
  }
  return buf;
}
