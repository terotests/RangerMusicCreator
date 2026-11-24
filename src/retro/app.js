// SPDX-License-Identifier: MIT
// Config for spaceage.html and synthwave.html (picked by <body data-band>),
// run by src/stagepage.js.
// URLs: spaceage.html?style=orbit&seed=7, spaceage.html?piece=greensleeves,
//       spaceage.html?piece=countdown (APOLLO tab), spaceage.html?style=apollo&seed=5,
//       synthwave.html?style=dark&seed=3, synthwave.html?piece=mountain

import { runPage } from '../stagepage.js';
import { SPACE_BAND, SPACE_SECTIONS, SPACE_SECTION_OF, SPACE_SOURCES, SYNTH_BAND, SYNTH_SECTIONS, SYNTH_SECTION_OF } from './bands.js';
import { SpaceComposer, SPACE_STYLES, SPACE_STYLE_IDS, SPACE_PIECE_LIST, SPACE_PIECES } from './space.js';
import { SynthComposer, SYNTH_STYLES, SYNTH_STYLE_IDS, SYNTH_PIECE_LIST, SYNTH_PIECES } from './synthwave.js';
import { SpaceStage, SynthStage } from './stage.js';

const KIND = document.body.dataset.band === 'synthwave' ? 'synthwave' : 'space';
const LABELS = { intro: 'INTRO', A: 'THEME', B: 'BRIDGE', solo: 'SOLO', A2: 'BIG FINISH', outro: 'OUTRO', end: 'FINAL CHORD', rest: '…' };

const CONFIG = {
  space: {
    kind: 'space',
    title: 'Ranger Space Age',
    file: 'ranger-space-age',
    band: SPACE_BAND,
    sources: SPACE_SOURCES,
    sections: SPACE_SECTIONS,
    sectionOf: SPACE_SECTION_OF,
    styles: SPACE_STYLES,
    styleIds: SPACE_STYLE_IDS,
    pieces: SPACE_PIECE_LIST.map((p) => ({ ...p, desc: p.source })),
    pieceBy: SPACE_PIECES,
    pieceParam: 'piece',
    defaultStyle: 'exotica',
    Stage: SpaceStage,
    labels: LABELS,
    core: ['vln_sus', 'vla_sus', 'vc_sus', 'cb_pizz', 'marimba', 'piano', 'harp', 'fl_sus'],
    climaxToast: 'Lift-off!',
    hallSize: 0.35,
    hallMix: 0.4,
    makeSource: (state, common) => new SpaceComposer({ ...common, style: state.style, piece: state.piece }),
  },
  synthwave: {
    kind: 'synthwave',
    title: 'Ranger Synthwave',
    file: 'ranger-synthwave',
    band: SYNTH_BAND,
    sources: [],
    sections: SYNTH_SECTIONS,
    sectionOf: SYNTH_SECTION_OF,
    styles: SYNTH_STYLES,
    styleIds: SYNTH_STYLE_IDS,
    pieces: SYNTH_PIECE_LIST.map((p) => ({ ...p, desc: p.source })),
    pieceBy: SYNTH_PIECES,
    pieceParam: 'piece',
    defaultStyle: 'outrun',
    Stage: SynthStage,
    labels: LABELS,
    core: [],
    climaxToast: 'Overdrive!',
    hallSize: 0.45,
    hallMix: 0.32,
    // A drum machine plays in time.
    tight: new Set(['kick', 'snare', 'clap', 'hat', 'crash', 'etom', 'bass', 'arp']),
    jitter: 0.004,
    makeSource: (state, common) => new SynthComposer({ ...common, style: state.style, piece: state.piece }),
  },
}[KIND];

runPage(CONFIG);
