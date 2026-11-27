// SPDX-License-Identifier: MIT
// Config for popmachine.html, run by src/stagepage.js.
// URLs: popmachine.html?style=moog&seed=7&riff=elise&prog=andalusian

import { runPage } from '../stagepage.js';
import { POP_BAND, POP_SECTIONS, POP_SECTION_OF } from './bands.js';
import { PopComposer, POP_LABELS } from './composer.js';
import { POP_STYLES, POP_STYLE_IDS } from './styles.js';
import { RIFFS } from './riffs.js';
import { PROGRESSIONS } from './progressions.js';
import { PopStage } from './stage.js';
import { ModernComposer, MODERN_STYLES, MODERN_STYLE_IDS, MODERN_LABELS } from './modern.js';

const ALL = { ...POP_STYLES, ...MODERN_STYLES };
const ALL_IDS = [...POP_STYLE_IDS, ...MODERN_STYLE_IDS];
const STYLES = Object.fromEntries(ALL_IDS.map((id) => [id, { ...ALL[id], name: `${ALL[id].era} · ${ALL[id].name}` }]));

let current = null;

runPage({
  kind: 'pop',
  title: 'Ranger Pop Machine',
  file: 'ranger-pop-machine',
  band: POP_BAND,
  sources: [],
  sections: POP_SECTIONS,
  sectionOf: POP_SECTION_OF,
  styles: STYLES,
  styleIds: ALL_IDS,
  pieces: [],
  pieceBy: {},
  pieceParam: 'piece',
  defaultStyle: 'moog',
  Stage: PopStage,
  labels: { ...POP_LABELS, ...MODERN_LABELS },
  core: [],
  climaxToast: 'Key change!',
  hallSize: 0.4,
  hallMix: 0.28,
  tight: new Set(['kick', 'snare', 'clap', 'hat', 'crash', 'etom', 'tamb', 'bass', 'mbass', 'arp', 'moog', 'pluck', 'hpsi', 'gtr', 'pump']),
  jitter: 0.004,
  options: [
    {
      key: 'riff', param: 'riff', tab: 'riffs', autoName: 'AUTO', autoDesc: 'A riff that suits the machine: a classical figure or a new motif.',
      items: [
        ...RIFFS.map((r) => ({ id: r.id, name: r.name, desc: r.source, tag: `Public domain · ${r.pd}` })),
        { id: 'motif', name: 'Machine motif', desc: 'A new riff written by the machine: a pivot-note figure, a staccato hook or an anthem line.', tag: 'Original' },
      ],
    },
    {
      key: 'prog', param: 'prog', tab: 'chords', autoName: 'AUTO', autoDesc: 'The machine picks a loop the style loves, and often rotates it for the chorus.',
      items: PROGRESSIONS.map((p) => ({ id: p.id, name: p.name, nick: `${p.nick} · bass ${p.bass} · ${p.minor ? 'minor' : 'major'}`, desc: `${p.moves} <em>${p.where}</em>` })),
    },
  ],
  programName: (state) => `${ALL[state.style].name} No. ${state.seed % 1000}`,
  metaBits: (i, label) => [label, ...(i.prog ? [i.prog] : [])],
  onInfo: (info, stage) => stage.setInfo(info, current?.style),
  makeSource: (state, common) => {
    current = state;
    if (MODERN_STYLES[state.style]) return new ModernComposer({ ...common, style: state.style });
    return new PopComposer({ ...common, style: state.style, riff: state.riff, prog: state.prog });
  },
});
