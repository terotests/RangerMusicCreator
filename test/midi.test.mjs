// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportMidi, parseMidi, melodyTheme } from '../src/midi.js';
import { Composer } from '../src/composer.js';

test('exported MIDI reads back with the same notes', () => {
  const c = new Composer({ seed: 12, style: 'house' });
  const bars = [];
  for (let i = 0; i < 24; i++) bars.push(c.nextBar());
  const bytes = exportMidi(bars);
  const { notes } = parseMidi(bytes.buffer);
  const expected = bars.flatMap((b) => b.events.filter((e) => !e.fx).flatMap((e) => (e.midis ? e.midis : [1]))).length;
  assert.equal(notes.length, expected);
  assert.ok(notes.some((n) => n.ch === 9 && n.pitch === 36), 'kick on channel 10');
});

test('a melody comes back as scale degrees', () => {
  // C major: C D E G | E C (written by hand)
  const bars = [{ info: { bpm: 120 }, events: [60, 62, 64, 67, 64, 60].map((m, i) => ({ ch: 'lead', step: i * 2, midi: m, len: 2, vel: 0.8 })) }];
  const th = melodyTheme(parseMidi(exportMidi(bars, 'Test').buffer));
  assert.deepEqual(th.notes.map((n) => n[0]), [0, 1, 2, 4, 2, 0]);
  assert.equal(th.name, 'TEST');
});
