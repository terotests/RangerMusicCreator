// SPDX-License-Identifier: MIT
// The two bands of the Space Age and Synthwave pages for the Orchestra engine
// (src/symphony/orchestra.js). Space Age mixes CC0 samples (VSCO 2 CE strings,
// harp, glockenspiel, flute, muted brass, piano, marimba and Latin percussion)
// with synthesized vibraphone, organ, theremin and sound effects. Synthwave is
// all synthesizers and drum machine, made at play time.

import * as V from './voices.js';
import { hihat } from '../jazz/band.js';

// ---- Space Age ------------------------------------------------------------------

export const SPACE_SOURCES = [
  { root: 'samples/vsco2/', sets: ['vln_sus', 'vln_trem', 'vla_sus', 'vc_sus', 'fl_sus', 'harp', 'glock', 'cb_pizz', 'timp', 'timp_roll', 'cym'] },
  { root: 'samples/jazz/', sets: ['piano', 'tp_mute', 'tp_vib', 'tb_vib', 'tb_short', 'ride', 'bell', 'sn_tap'] },
  { root: 'samples/space/' },
];

export const SPACE_SECTION_OF = {
  vib: 'keys', org: 'keys', pno: 'keys', mar: 'keys',
  thr: 'space', glk: 'space', hrp: 'space', ufo: 'space', bird: 'space',
  str: 'strings', vla: 'strings', vc: 'strings', fl: 'strings',
  tp: 'brass', tb: 'brass',
  cb: 'rhythm', bgh: 'rhythm', bgl: 'rhythm', cgh: 'rhythm', cgl: 'rhythm', clv: 'rhythm', gui: 'rhythm', mrc: 'rhythm',
  tap: 'rhythm', ride: 'rhythm', hh: 'rhythm', timp: 'rhythm', cym: 'rhythm',
};
export const SPACE_SECTIONS = [
  ['keys', 'VIBES · ORGAN · MARIMBA'],
  ['space', 'THEREMIN · HARP · CELESTE'],
  ['strings', 'STRINGS & FLUTE'],
  ['brass', 'MUTED BRASS'],
  ['rhythm', 'BASS & LATIN PERCUSSION'],
];

export const SPACE_BAND = {
  sectionOf: SPACE_SECTION_OF,
  sections: SPACE_SECTIONS.map(([k]) => k),
  sets: {
    pno: { hit: ['piano'], sus: ['piano'] },
    mar: { hit: ['marimba'] },
    glk: { hit: ['glock'] },
    hrp: { hit: ['harp'] },
    str: { sus: ['vln_sus'], trem: ['vln_trem', 'vln_sus'] },
    vla: { sus: ['vla_sus'] },
    vc: { sus: ['vc_sus'] },
    fl: { sus: ['fl_sus'] },
    tp: { sus: ['tp_mute'], mute: ['tp_mute'], vib: ['tp_vib'], stac: ['tp_mute'] },
    tb: { sus: ['tb_vib'], vib: ['tb_vib'], stac: ['tb_short'] },
    cb: { sus: ['cb_pizz'], pizz: ['cb_pizz'], hit: ['cb_pizz'] },
    timp: { hit: ['timp'], roll: ['timp_roll'] },
  },
  hits: {
    cym: { crash: ['crash_hit_mp_loose', 'crash_hit_ff_loose'], hit: ['susp_hit_softmall_f'], swell: ['susp_hit_softmall_roll4_fff_long'], soft: ['susp_hit_softmall_f'] },
  },
  kit: {
    bgh: { hit: 'bongo_hi' }, bgl: { hit: 'bongo_lo' }, cgh: { hit: 'conga_hi' }, cgl: { hit: 'conga_lo' },
    clv: { hit: 'claves' }, gui: { hit: 'guiro' }, mrc: { hit: 'maraca' }, tap: { hit: 'sn_tap' }, ride: { hit: 'ride', bell: 'bell' },
  },
  setGain: { piano: 1.2, tp_mute: 2.0, tp_vib: 3.0, tb_vib: 4.0, tb_short: 1.7, ride: 1.2, bell: 0.9, sn_tap: 2.6, cb_pizz: 1.3, marimba: 1.1, bongo_hi: 0.9, bongo_lo: 0.9, conga_hi: 0.8, conga_lo: 0.8, claves: 0.7, guiro: 0.8, maraca: 0.7, glock: 0.8 },
  ring: new Set(['mar', 'glk', 'hrp', 'timp', 'cym', 'bgh', 'bgl', 'cgh', 'cgl', 'clv', 'gui', 'mrc', 'tap', 'ride']),
  synth: { vib: V.vib, org: V.organ, thr: V.theremin, ufo: V.ufo, bird: V.bird, hh: hihat },
  fx: { thr: V.tempoDelay(1, 0.32, 0.22), vib: V.tempoDelay(1.5, 0.2, 0.12), org: V.chorus(0.002, 0.35) },
  ensemble: ['strings'],
  useOnset: true,
  release: { strings: 0.45, brass: 0.2, keys: 0.25, space: 0.3, rhythm: 0.1 },
  shortRelease: { keys: 0.2, brass: 0.09, strings: 0.15 },
  seats: {
    vib: { pan: -0.3, depth: 0.2, gain: 0.85 },
    org: { pan: 0.35, depth: 0.3, gain: 0.8 },
    pno: { pan: -0.45, depth: 0.35, gain: 0.75 },
    mar: { pan: 0.45, depth: 0.35, gain: 0.8 },
    thr: { pan: 0.05, depth: 0.1, gain: 0.85 },
    glk: { pan: 0.5, depth: 0.5, gain: 0.45 },
    hrp: { pan: -0.65, depth: 0.4, gain: 0.75 },
    ufo: { pan: 0, depth: 0.3, gain: 0.7 },
    bird: { pan: 0.6, depth: 0.6, gain: 0.6 },
    str: { pan: -0.4, depth: 0.25, gain: 0.7 },
    vla: { pan: 0.1, depth: 0.3, gain: 0.65 },
    vc: { pan: 0.4, depth: 0.3, gain: 0.7 },
    fl: { pan: -0.15, depth: 0.35, gain: 0.7 },
    tp: { pan: 0.25, depth: 0.55, gain: 0.6 },
    tb: { pan: 0.4, depth: 0.6, gain: 0.6 },
    cb: { pan: 0.15, depth: 0.5, gain: 0.7 },
    bgh: { pan: 0.55, depth: 0.6, gain: 0.55 },
    bgl: { pan: 0.5, depth: 0.6, gain: 0.45 },
    cgh: { pan: -0.5, depth: 0.6, gain: 0.55 },
    cgl: { pan: -0.55, depth: 0.6, gain: 0.42 },
    clv: { pan: 0.3, depth: 0.6, gain: 0.45 },
    gui: { pan: -0.3, depth: 0.6, gain: 0.45 },
    mrc: { pan: 0.65, depth: 0.6, gain: 0.4 },
    tap: { pan: 0.0, depth: 0.7, gain: 0.5 },
    ride: { pan: 0.2, depth: 0.7, gain: 0.45 },
    hh: { pan: 0.2, depth: 0.7, gain: 0.35 },
    timp: { pan: -0.1, depth: 0.85, gain: 0.8 },
    cym: { pan: 0.25, depth: 0.85, gain: 0.45 },
  },
};

export const SPACE_RANGE = {
  vib: [53, 89], org: [36, 96], pno: [29, 97], mar: [45, 96], thr: [55, 91], glk: [79, 108], hrp: [24, 103],
  str: [55, 96], vla: [48, 84], vc: [36, 72], fl: [60, 96], tp: [55, 82], tb: [40, 67], cb: [28, 55], timp: [40, 57],
  ufo: [48, 96], bird: [84, 108],
};

// ---- Synthwave ------------------------------------------------------------------

export const SYNTH_SECTION_OF = {
  kick: 'drums', snare: 'drums', clap: 'drums', hat: 'drums', crash: 'drums', etom: 'drums', sweep: 'drums',
  bass: 'bass',
  arp: 'keys', ep: 'keys', bell: 'keys', brass: 'keys',
  pad: 'pads', str: 'pads', vox: 'pads',
  lead: 'lead',
};
export const SYNTH_SECTIONS = [
  ['drums', 'DRUM MACHINE'],
  ['bass', 'BASS'],
  ['keys', 'ARP · KEYS · BRASS'],
  ['pads', 'PADS & CHOIR'],
  ['lead', 'LEAD'],
];

export const SYNTH_BAND = {
  sectionOf: SYNTH_SECTION_OF,
  sections: SYNTH_SECTIONS.map(([k]) => k),
  sets: {}, hits: {}, kit: {}, setGain: {}, ring: new Set(), ensemble: [],
  synth: {
    kick: V.kick, snare: V.snare, clap: V.clap, hat: V.hat, crash: V.crash, etom: V.etom, sweep: V.sweep,
    bass: V.synthBass, arp: V.arp, ep: V.ep, bell: V.bell, brass: V.brass, pad: V.pad, str: V.strings, vox: V.vox, lead: V.lead,
  },
  fx: {
    lead: V.tempoDelay(0.75, 0.4, 0.3),
    arp: V.tempoDelay(0.75, 0.35, 0.22),
    bell: V.tempoDelay(0.5, 0.3, 0.25),
    pad: V.chorus(0.003, 0.5),
    str: V.chorus(0.003, 0.5),
    ep: V.chorus(0.002, 0.4),
  },
  release: {}, shortRelease: {},
  seats: {
    kick: { pan: 0, depth: 0, gain: 0.72 },
    snare: { pan: 0.04, depth: 0.1, gain: 0.9 },
    clap: { pan: -0.06, depth: 0.1, gain: 0.8 },
    hat: { pan: 0.3, depth: 0.1, gain: 0.55 },
    crash: { pan: -0.3, depth: 0.15, gain: 0.6 },
    etom: { pan: -0.2, depth: 0.1, gain: 0.8 },
    sweep: { pan: 0, depth: 0.2, gain: 0.6 },
    bass: { pan: 0, depth: 0, gain: 0.68 },
    arp: { pan: -0.35, depth: 0.1, gain: 0.75 },
    ep: { pan: 0.3, depth: 0.15, gain: 0.85 },
    bell: { pan: 0.4, depth: 0.2, gain: 0.7 },
    brass: { pan: -0.15, depth: 0.15, gain: 0.8 },
    pad: { pan: 0, depth: 0.2, gain: 0.85 },
    str: { pan: 0.2, depth: 0.2, gain: 0.8 },
    vox: { pan: -0.2, depth: 0.25, gain: 0.75 },
    lead: { pan: 0.05, depth: 0.05, gain: 0.9 },
  },
};

export const SYNTH_RANGE = {
  bass: [28, 55], arp: [55, 96], ep: [48, 84], bell: [64, 100], brass: [48, 84], pad: [45, 84], str: [52, 88], vox: [52, 79], lead: [45, 96], etom: [38, 62],
};
