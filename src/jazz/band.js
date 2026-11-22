// SPDX-License-Identifier: MIT
// The two jazz bands for the Orchestra engine (src/symphony/orchestra.js):
// players, the sample sets they play (samples/vsco2 and samples/jazz, both
// CC0), where they sit and which fader they belong to. The hi-hat is the only
// synthesized instrument: VSCO has no hi-hat.

export const SOURCES = [
  { root: 'samples/vsco2/', sets: ['tp_sus', 'tp_stac', 'tb_sus', 'tb_stac', 'cl_sus', 'bn_sus', 'cb_pizz', 'tu_sus', 'bd', 'sn', 'cym'] },
  { root: 'samples/jazz/' },
];

// Player -> articulation -> sample sets (first one that has a sample wins).
const SETS = {
  pno: { hit: ['piano'] },
  xyl: { hit: ['xylo'] },
  blk: { hit: ['tblock'] },
  tp: { sus: ['tp_sus'], stac: ['tp_stac'], mute: ['tp_mute'], vib: ['tp_vib', 'tp_sus'] },
  stp: { sus: ['tp_vib', 'tp_sus'], stac: ['tp_stac'], mute: ['tp_mute'], vib: ['tp_vib'] },
  tb: { sus: ['tb_sus', 'tb_vib'], stac: ['tb_short', 'tb_stac'], fall: ['tb_fall'], vib: ['tb_vib', 'tb_sus'] },
  stb: { sus: ['tb_vib', 'tb_sus'], stac: ['tb_short', 'tb_stac'], fall: ['tb_fall'], vib: ['tb_vib'] },
  cl: { sus: ['cl_sus'], stac: ['cl_stac', 'cl_sus'] },
  scl: { sus: ['cl_sus'], stac: ['cl_stac', 'cl_sus'] },
  bn: { sus: ['bn_sus'], stac: ['bn_sus'] },
  cb: { sus: ['cb_pizz'], pizz: ['cb_pizz'], hit: ['cb_pizz'] },
  tu: { sus: ['tu_sus'], stac: ['tu_sus'] },
};

const HITS = {
  bd: { hit: ['bdrum_mp_1', 'bdrum_f_1', 'bdrum_fff_1'], roll: ['bdrum_roll_long1'] },
  sn: { hit: ['snare1_mp_1', 'snare1_f_1', 'snare1_ff_1'], roll: ['snare2_nosnare_roll_ff_1'] },
  cym: { crash: ['crash_hit_mp_loose', 'crash_hit_ff_loose', 'crash_hit_fff_loose'], hit: ['susp_hit_softmall_f'], swell: ['susp_hit_softmall_roll4_fff_long'], soft: ['susp_hit_softmall_f'] },
};

// Drum-kit pieces picked by strength layer.
const KIT = {
  ride: { hit: 'ride', bell: 'bell' },
  tap: { hit: 'sn_tap' },
  tom: { hit: 'tom' },
};

// Level trims so the new sets sit with the VSCO 2 ones (measured loudness).
const SET_GAIN = {
  piano: 1.35, tp_vib: 3.2, tp_mute: 2.0, tp_stac: 2.6, tb_vib: 4.2, tb_short: 1.7, tb_fall: 1.2,
  cl_stac: 1.5, ride: 1.4, bell: 1.0, sn_tap: 3.0, tom: 0.55, tblock: 0.8, xylo: 0.9, cb_pizz: 1.25,
};

const RING = new Set(['xyl', 'blk', 'cym', 'bd', 'sn', 'ride', 'tap', 'tom']);

// A closed hi-hat: filtered noise with a fast decay ('open' rings longer).
const noiseCache = new WeakMap();
export function hihat(ctx, out, ev, t, dur, active) {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 7;
    for (let i = 0; i < d.length; i++) d[i] = ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7200;
  const bp = ctx.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 10500;
  bp.gain.value = 6;
  const g = ctx.createGain();
  const open = ev.a === 'open';
  const decay = open ? 0.28 : ev.a === 'pedal' ? 0.035 : 0.05;
  const lvl = 0.05 + 0.32 * ev.v * ev.v;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(lvl, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.004, decay / 3);
  src.connect(hp).connect(bp).connect(g).connect(out);
  src.start(t, Math.random() * 0.3);
  src.stop(t + decay * 3 + 0.05);
  const node = { src, g };
  active.add(node);
  src.onended = () => {
    active.delete(node);
    g.disconnect();
  };
}

const COMMON = { sets: SETS, hits: HITS, kit: KIT, setGain: SET_GAIN, ring: RING, synth: { hh: hihat }, ensemble: [], useOnset: true };

// ---- Ragtime: piano, a front line and a two-beat rhythm section -------------

export const RAG_SECTION_OF = {
  pno: 'piano', xyl: 'piano',
  tp: 'front', cl: 'front', tb: 'front',
  tu: 'rhythm', bd: 'rhythm', sn: 'rhythm', cym: 'rhythm', tap: 'rhythm', blk: 'rhythm', hh: 'rhythm', ride: 'rhythm', tom: 'rhythm',
};
export const RAG_SECTIONS = [
  ['piano', 'PIANO & XYLOPHONE'],
  ['front', 'CORNET · CLARINET · TROMBONE'],
  ['rhythm', 'TUBA & DRUMS'],
];

export const RAG_BAND = {
  ...COMMON,
  sectionOf: RAG_SECTION_OF,
  sections: RAG_SECTIONS.map(([k]) => k),
  release: { front: 0.16, rhythm: 0.12, piano: 0.25 },
  shortRelease: { piano: 0.22, front: 0.1 },
  seats: {
    pno: { pan: -0.35, depth: 0.25, gain: 0.95 },
    xyl: { pan: 0.42, depth: 0.35, gain: 0.7 },
    tp: { pan: -0.05, depth: 0.2, gain: 0.8 },
    cl: { pan: 0.22, depth: 0.25, gain: 0.72 },
    tb: { pan: 0.42, depth: 0.3, gain: 0.82 },
    tu: { pan: 0.6, depth: 0.55, gain: 0.85 },
    bd: { pan: 0.15, depth: 0.7, gain: 0.55 },
    sn: { pan: 0.08, depth: 0.7, gain: 0.42 },
    tap: { pan: 0.08, depth: 0.7, gain: 0.6 },
    cym: { pan: 0.28, depth: 0.75, gain: 0.4 },
    blk: { pan: -0.12, depth: 0.7, gain: 0.5 },
    hh: { pan: 0.18, depth: 0.7, gain: 0.5 },
    ride: { pan: 0.25, depth: 0.7, gain: 0.5 },
    tom: { pan: 0.0, depth: 0.7, gain: 0.5 },
  },
};

// ---- Big band: reeds, trumpets, trombones, piano and the rhythm section ----

export const BB_SECTION_OF = {
  cl: 'reeds', scl: 'reeds', bn: 'reeds',
  tp: 'trumpets', stp: 'trumpets',
  tb: 'trombones', stb: 'trombones',
  pno: 'piano',
  cb: 'rhythm', ride: 'rhythm', hh: 'rhythm', bd: 'rhythm', sn: 'rhythm', tap: 'rhythm', tom: 'rhythm', cym: 'rhythm', blk: 'rhythm',
};
export const BB_SECTIONS = [
  ['reeds', 'REEDS'],
  ['trumpets', 'TRUMPETS'],
  ['trombones', 'TROMBONES'],
  ['piano', 'PIANO'],
  ['rhythm', 'BASS & DRUMS'],
];

export const BIGBAND_BAND = {
  ...COMMON,
  sectionOf: BB_SECTION_OF,
  sections: BB_SECTIONS.map(([k]) => k),
  release: { reeds: 0.16, trumpets: 0.14, trombones: 0.16, piano: 0.25, rhythm: 0.1 },
  shortRelease: { piano: 0.2, trumpets: 0.08, trombones: 0.09, reeds: 0.08 },
  // Swing-era reeds sang with vibrato; held clarinet chords without it drone like a harmonium.
  vibrato: { reeds: { rate: 5.3, depth: 9, delay: 0.16 } },
  seats: {
    cl: { pan: -0.1, depth: 0.25, gain: 0.55 },
    bn: { pan: 0.2, depth: 0.3, gain: 0.5 },
    scl: { pan: 0.05, depth: 0.05, gain: 0.85 },
    tb: { pan: 0.15, depth: 0.5, gain: 0.55 },
    stb: { pan: 0.05, depth: 0.05, gain: 0.85 },
    tp: { pan: 0.25, depth: 0.75, gain: 0.5 },
    stp: { pan: 0.05, depth: 0.05, gain: 0.85 },
    pno: { pan: -0.6, depth: 0.45, gain: 0.85 },
    cb: { pan: -0.35, depth: 0.6, gain: 0.95 },
    ride: { pan: -0.15, depth: 0.75, gain: 0.55 },
    hh: { pan: -0.25, depth: 0.75, gain: 0.5 },
    bd: { pan: -0.2, depth: 0.8, gain: 0.5 },
    sn: { pan: -0.2, depth: 0.78, gain: 0.4 },
    tap: { pan: -0.2, depth: 0.78, gain: 0.55 },
    tom: { pan: -0.28, depth: 0.8, gain: 0.55 },
    cym: { pan: -0.05, depth: 0.8, gain: 0.4 },
    blk: { pan: -0.2, depth: 0.8, gain: 0.4 },
  },
};

// Sounding ranges the arrangers keep each player inside.
export const RANGE = {
  pno: [29, 97], xyl: [65, 108], blk: [72, 89],
  tp: [55, 84], stp: [55, 86], tb: [40, 67], stb: [40, 70], cl: [50, 89], scl: [52, 91], bn: [34, 62],
  cb: [28, 55], tu: [29, 50],
};
