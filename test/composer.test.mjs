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
