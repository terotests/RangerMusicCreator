// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Composer } from '../src/composer.js';
import { STYLES, STYLE_BY_ID } from '../src/styles.js';
import { THEMES } from '../src/themes.js';
import { SCALES } from '../src/theory.js';
import { PRESETS } from '../src/instruments.js';

function run(seed, style, bars) {
  const c = new Composer({ seed, style });
  const out = [];
  for (let i = 0; i < bars; i++) out.push(c.nextBar());
  return out;
}

test('same seed and style give the same music', () => {
  assert.deepEqual(JSON.stringify(run(42, 'house', 64)), JSON.stringify(run(42, 'house', 64)));
});

test('different seeds give different music', () => {
  assert.notEqual(JSON.stringify(run(1, 'lofi', 32)), JSON.stringify(run(2, 'lofi', 32)));
});

for (const style of STYLES) {
  test(`${style.id}: 300 bars of valid events with structure and surprises`, () => {
    const bars = run(7, style.id, 300);
    const sections = new Set();
    let messages = 0;
    for (const { events, info } of bars) {
      sections.add(info.section);
      messages += info.messages.length;
      assert.ok(info.bpm >= 50 && info.bpm <= 190, `bpm ${info.bpm}`);
      for (const e of events) {
        assert.ok(Number.isInteger(e.step) && e.step >= 0 && e.step < 16, `step ${e.step}`);
        if (e.fx) continue;
        assert.ok(e.vel > 0 && e.vel <= 1.2, `vel ${e.vel}`);
        if (e.midi != null) assert.ok(e.midi >= 20 && e.midi <= 100, `${e.ch} midi ${e.midi}`);
        if (e.midis) for (const m of e.midis) assert.ok(m >= 40 && m <= 90, `${e.ch} midi ${m}`);
      }
    }
    assert.ok(sections.size >= 4, `sections ${[...sections]}`);
    assert.ok(messages > 5, `only ${messages} surprise messages`);
  });
  test(`${style.id}: every voice it names exists`, () => {
    for (const v of [style.bass.voice, style.keys.voice, style.pad.voice, style.lead.voice, style.arp.voice]) assert.ok(PRESETS[v], v);
  });
}

test('restoring a save point replays the same music from there', () => {
  const c = new Composer({ seed: 9, style: 'dub' });
  let saved = null;
  const after = [];
  for (let i = 0; i < 80; i++) {
    const bar = c.nextBar();
    if (bar.snapshot && i > 20 && !saved) saved = bar.snapshot;
    if (saved) after.push(JSON.stringify(bar.events));
  }
  c.restore(saved);
  for (let i = 0; i < after.length; i++) assert.equal(JSON.stringify(c.nextBar().events), after[i], `bar ${i}`);
});

test('held parts and a locked theme are not rewritten by the composer', () => {
  const c = new Composer({ seed: 3, style: 'house', surprise: 1 });
  c.nextBar();
  c.setHold('lead', true);
  c.setHold('kick', true);
  const motif = JSON.stringify(c.motif);
  const kick = c.drums.kick;
  for (let i = 0; i < 200; i++) c.nextBar();
  assert.equal(JSON.stringify(c.motif), motif);
  assert.equal(c.drums.kick, kick);

  const t = new Composer({ seed: 4, style: 'lofi', surprise: 1 });
  for (let i = 0; i < 10; i++) t.nextBar();
  const m = t.material();
  t.useMaterial(m);
  for (let i = 0; i < 200; i++) t.nextBar();
  for (const k of ['key', 'scaleName', 'bpm', 'progression', 'motif', 'bassPat', 'compPat']) assert.deepEqual(t[k], m[k], k);
});

test('an imported theme becomes the melody', () => {
  const c = new Composer({ seed: 5, style: 'adventure' });
  c.importTheme({ name: 'MY TUNE', notes: [[0, 1], [2, 1], [4, 1], [7, 2], [4, 1], [2, 2]] });
  assert.equal(c.motifName, 'MY TUNE');
  assert.deepEqual(c.motif.slice(0, 3).map((n) => n.deg), [0, 2, 4]);
});

test('every built-in theme is whole 4/4 phrases with a known mode', () => {
  for (const th of THEMES) {
    const beats = th.notes.reduce((a, [, b]) => a + b, 0);
    assert.equal(beats % 16, 0, `${th.name} is ${beats} beats`);
    assert.ok(SCALES[th.mode], `${th.name} mode ${th.mode}`);
  }
});

test('a quoted theme plays as written, in its mode, with one chord per bar', () => {
  const c = new Composer({ seed: 9, style: 'lofi' });
  const ode = THEMES.find((t) => t.name === 'ODE TO JOY');
  let tries = 0;
  do c.quoteTheme(ode);
  while (c.motif[0].step !== 0 && ++tries < 20); // phrase 1 is picked most of the time
  assert.equal(c.motifName, 'ODE TO JOY');
  assert.ok(['major', 'mixolydian'].includes(c.scaleName), c.scaleName);
  assert.deepEqual(c.motif.slice(0, 8).map((n) => n.deg), [2, 2, 3, 4, 4, 3, 2, 1]);
  assert.equal(c.progression.length, 4);
  assert.equal(c.barsPerChord, 1);
  assert.equal(c.progression[0], 0, 'starts on the tonic chord');
});

test('a song starts on the style main groove', () => {
  const c = new Composer({ seed: 4, style: 'lofi' });
  const d = STYLE_BY_ID.lofi.drums;
  assert.deepEqual([c.drums.kick, c.drums.snare, c.drums.hats], [d.kick[0], d.snare[0], d.hats[0]]);
});

test('generated melodies close on the tonic and stay within about an octave and a half', () => {
  for (let seed = 1; seed < 40; seed++) {
    const c = new Composer({ seed, style: seed % 2 ? 'lofi' : 'synthwave' });
    c.newMotif(false);
    const degs = c.motif.concat(c.motifB).map((n) => n.deg);
    assert.ok(Math.max(...degs) - Math.min(...degs) <= 11, `seed ${seed}: ${degs}`);
    assert.equal(((c.motifB.at(-1).deg % 7) + 7) % 7, 0, `seed ${seed} ends on ${c.motifB.at(-1).deg}`);
  }
});

// ---- harmony ---------------------------------------------------------------

import { NOTE_NAMES, SCALE_LABEL, chromaticShifts } from '../src/theory.js';

function phrases(th) {
  const out = [];
  let cur = [];
  let beat = 0;
  for (const [deg, beats] of th.notes) {
    if (beat >= 16) {
      out.push(cur);
      cur = [];
      beat = 0;
    }
    if (deg !== null) cur.push({ step: Math.round(beat * 4), len: Math.round(beats * 4), deg });
    beat += beats;
  }
  return out.concat([cur]);
}

test('theme harmony closes like the tune: half close on V, full close V-I or on I', () => {
  const c = new Composer({ seed: 1, style: 'lofi' });
  c.useMode('major');
  const [one, two] = phrases(THEMES.find((t) => t.name === 'ODE TO JOY'));
  const a = c.harmonize(one);
  assert.equal(a[0], 0);
  assert.ok([4, 6].includes(a[3]) || typeof a[3] === 'object', `line 1 ends on ${JSON.stringify(a[3])}`);
  const b = c.harmonize(two);
  assert.equal(b[3], 0, 'line 2 ends home');
});

test('a chromatic chord never fights the quoted melody', () => {
  const c = new Composer({ seed: 2, style: 'lofi' });
  for (const th of THEMES) {
    c.useMode(th.mode);
    for (const ph of phrases(th)) {
      c.harmonize(ph).forEach((spec, bar) => {
        if (typeof spec === 'number') return;
        const shifts = chromaticShifts(c.keyRoot, c.scale, c.chord(spec, 3).pcs);
        for (const n of ph) {
          if (n.step + n.len <= bar * 16 || n.step >= bar * 16 + 16) continue;
          const k = (((c.keyRoot + c.scale[((n.deg % 7) + 7) % 7]) % 12) + 12) % 12;
          assert.ok(!shifts.has(k), `${th.name} bar ${bar + 1}`);
        }
      });
    }
  }
});

const pcOf = (name) => NOTE_NAMES.indexOf(name);
const scaleOf = (key) => {
  const [n, ...rest] = key.split(' ');
  const id = Object.keys(SCALE_LABEL).find((k) => SCALE_LABEL[k] === rest.join(' '));
  return { root: pcOf(n), scale: SCALES[id] };
};

test('key changes are prepared by the new key dominant (except DEMO SCENE)', () => {
  let prepared = 0;
  let changes = 0;
  for (const style of STYLES.filter((s) => s.cadences !== false)) {
    for (let seed = 1; seed <= 12; seed++) {
      const bars = run(seed, style.id, 200);
      for (let i = 1; i < bars.length; i++) {
        if (!bars[i].info.messages.some((m) => m.startsWith('KEY CHANGE'))) continue;
        changes++;
        const { root } = scaleOf(bars[i].info.key);
        const prev = bars[i - 1].info.chord;
        const m = prev.match(/^[A-G]#?/)[0];
        if (pcOf(m) === (root + 7) % 12 && !/m/.test(prev.slice(m.length).replace('maj', ''))) prepared++;
      }
    }
  }
  assert.ok(changes > 10, `only ${changes} key changes`);
  assert.ok(prepared / changes > 0.6, `${prepared} of ${changes} prepared`);
});

test('a generated melody takes the altered note of a chromatic chord', () => {
  let chromatic = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const c = new Composer({ seed, style: 'lofi', surprise: 0.8 });
    for (let i = 0; i < 160; i++) {
      const { events, info } = c.nextBar();
      if (info.theme) continue;
      const { root, scale } = scaleOf(info.key);
      const keys = events.find((e) => e.ch === 'keys' && !e.push);
      if (!keys) continue;
      const shifts = chromaticShifts(root + 48, scale, [...new Set(keys.midis.map((m) => m % 12))]);
      if (!shifts.size) continue;
      chromatic++;
      for (const e of events.filter((x) => x.ch === 'lead')) assert.ok(!shifts.has(e.midi % 12), `seed ${seed} bar ${i} ${info.chord}: lead ${e.midi}`);
    }
  }
  assert.ok(chromatic > 20, `only ${chromatic} bars with a chromatic chord`);
});

test('voice leading keeps the chord: pitch classes in, the same pitch classes out', async () => {
  const { voiceLead } = await import('../src/theory.js');
  for (const [lo, hi] of [[50, 72], [55, 74], [57, 76], [48, 70]]) {
    let prev = null;
    for (const pcs of [[0, 4, 7], [5, 9, 0, 4], [7, 11, 2, 5], [9, 0, 4]]) {
      const v = voiceLead(prev, pcs, lo, hi);
      assert.deepEqual([...new Set(v.map((m) => m % 12))].sort((a, b) => a - b), [...pcs].sort((a, b) => a - b), `${lo}-${hi} ${pcs}`);
      prev = v;
    }
  }
});
