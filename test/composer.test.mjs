// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Composer } from '../src/composer.js';
import { STYLES } from '../src/styles.js';
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
  assert.deepEqual(c.motif.slice(0, 3).map((n) => n.deg), [2, 4, 6]);
});
