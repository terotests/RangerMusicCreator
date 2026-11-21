// SPDX-License-Identifier: MIT
// Config for the jazz pages (ragtime.html or bigband.html, picked by
// <body data-band>), run by src/stagepage.js.
// URLs: ragtime.html?style=stomp&seed=12, ragtime.html?piece=maple,
//       bigband.html?style=jump&seed=5, bigband.html?tune=saints

import { runPage } from '../stagepage.js';
import { RAG_BAND, RAG_SECTIONS, RAG_SECTION_OF, BIGBAND_BAND, BB_SECTIONS, BB_SECTION_OF, SOURCES } from './band.js';
import { RagComposer, RAG_STYLES, RAG_STYLE_IDS } from './ragtime.js';
import { BigBandComposer, BB_STYLES, BB_STYLE_IDS, BB_TUNES, BB_TUNE_BY_ID } from './bigband.js';
import { RAGS, RAG_BY_ID, loadRag } from './scores.js';
import { RagStage, BandStage } from './stage.js';

const KIND = document.body.dataset.band === 'bigband' ? 'bigband' : 'ragtime';

const rags = new Map(); // parsed public-domain rags by id
async function ragFor(id) {
  if (!rags.has(id)) rags.set(id, await loadRag(id));
  return rags.get(id);
}

const CONFIG = {
  ragtime: {
    kind: 'ragtime',
    title: 'Ranger Ragtime',
    file: 'ranger-ragtime',
    band: RAG_BAND,
    sources: SOURCES,
    sections: RAG_SECTIONS,
    sectionOf: RAG_SECTION_OF,
    styles: RAG_STYLES,
    styleIds: RAG_STYLE_IDS,
    pieces: RAGS.map((r) => ({ ...r, desc: r.source })),
    pieceBy: RAG_BY_ID,
    pieceParam: 'piece',
    defaultStyle: 'classic',
    Stage: RagStage,
    labels: { intro: 'INTRODUCTION', A: 'FIRST STRAIN', B: 'SECOND STRAIN', C: 'TRIO', end: 'ENDING', rest: '…', strain: 'STRAIN', repeat: 'STRAIN · REPEAT' },
    core: ['piano', 'tp_vib', 'tp_sus', 'cl_sus', 'tb_vib', 'tu_sus', 'sn', 'bd'],
    climaxToast: 'The big finish!',
    metaBits(i, label) {
      const bits = [i.repeat && !this.labels[i.section]?.includes('REPEAT') ? `${label} · AGAIN` : label];
      if (i.band === false) bits.push('SOLO PIANO');
      return bits;
    },
    async makeSource(state, common) {
      const score = state.piece ? await ragFor(state.piece) : null;
      return new RagComposer({ ...common, style: state.style, score, band: state.band });
    },
  },
  bigband: {
    kind: 'bigband',
    title: 'Ranger Big Band',
    file: 'ranger-big-band',
    band: BIGBAND_BAND,
    sources: SOURCES,
    sections: BB_SECTIONS,
    sectionOf: BB_SECTION_OF,
    styles: BB_STYLES,
    styleIds: BB_STYLE_IDS,
    pieces: BB_TUNES.map((t) => ({ ...t, desc: t.source })),
    pieceBy: BB_TUNE_BY_ID,
    pieceParam: 'tune',
    defaultStyle: 'swing',
    Stage: BandStage,
    labels: {},
    core: ['cl_sus', 'tp_sus', 'tb_sus', 'cb_pizz', 'ride', 'piano'],
    climaxToast: 'Shout chorus!',
    async makeSource(state, common) {
      const t = state.piece ? BB_TUNE_BY_ID[state.piece] : null;
      const rag = t?.rag ? await ragFor(t.rag) : null;
      return new BigBandComposer({ ...common, style: state.style, tune: state.piece, rag, swing: state.swing });
    },
  },
}[KIND];

runPage(CONFIG);
