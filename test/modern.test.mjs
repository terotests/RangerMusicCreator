// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModernComposer, MODERN_STYLE_IDS } from '../src/pop/modern.js';
import { POP_BAND, POP_SECTION_OF, POP_RANGE } from '../src/pop/bands.js';

function song(style, seed) {
  const c = new ModernComposer({ style, seed, loop: false });
  const out = [];
  for (let i = 0; i < 200; i++) {
    const b = c.nextBar();
    if (!b) break;
    out.push(b);
  }
  return out;
}

test('modern songs are well formed and every player has a sound', () => {
  for (const style of MODERN_STYLE_IDS) for (const seed of [1, 7, 42, 99]) {
    const bars = song(style, seed);
    assert.equal(bars[bars.length - 1].info.section, 'end');
    assert.equal(bars.length, 89);
    bars.forEach((b, k) => {
      for (const e of b.events) {
        assert.ok(POP_SECTION_OF[e.i] && POP_BAND.synth[e.i], `${style}/${seed} bar ${k}: ${e.i}`);
        assert.ok(e.b >= 0 && e.b < 4 && e.d > 0 && e.v > 0 && e.v <= 1, `${style}/${seed} bar ${k}: ${e.i} timing`);
        if (POP_RANGE[e.i]) assert.ok(e.m >= POP_RANGE[e.i][0] && e.m <= POP_RANGE[e.i][1], `${style} bar ${k}: ${e.i} ${e.m}`);
      }
    });
  }
});

test('the drops pump: a kick on every beat, a quieter clap on two and four, the sub bass louder than the theme', () => {
  for (const style of MODERN_STYLE_IDS) {
    const bars = song(style, 5).filter((b) => b.info.section === 'drop');
    assert.equal(bars.length, 16);
    for (const [k, b] of bars.entries()) {
      const kicks = b.events.filter((e) => e.i === 'dkick').map((e) => e.b);
      if (k < 15) assert.deepEqual(kicks, [0, 1, 2, 3]);
      const claps = b.events.filter((e) => e.i === 'mclap');
      if (k < 15) assert.ok(claps.some((e) => e.b === 1) && claps.some((e) => e.b === 3));
      const kickV = Math.min(...b.events.filter((e) => e.i === 'dkick').map((e) => e.v));
      assert.ok(claps.every((e) => e.v < kickV), `${style} bar ${k}: clap above kick`);
      const sub = b.events.filter((e) => e.i === 'sub');
      const theme = b.events.filter((e) => e.i === 'theme');
      assert.ok(sub.length && theme.length);
      assert.ok(Math.min(...sub.map((e) => e.v)) > 2 * Math.max(...theme.map((e) => e.v)), `${style} bar ${k}`);
      assert.ok(sub.every((e) => e.m <= 46));
    }
    // Every fourth bar of the bass line ends with a small rise.
    assert.ok(bars.filter((b, k) => k % 4 === 3).every((b) => b.events.some((e) => e.i === 'sub' && e.rise > 0 && e.rise <= 3)));
  }
});

test('the breakdown drops the bass and kick, and ends on a drum hit', () => {
  for (const style of MODERN_STYLE_IDS) {
    const bars = song(style, 11);
    const bd = bars.filter((b) => b.info.section === 'breakdown');
    assert.equal(bd.length, 8);
    for (const b of bd) {
      assert.ok(!b.events.some((e) => e.i === 'sub'));
      assert.ok(b.events.some((e) => e.i === 'theme'));
    }
    for (const b of bd.slice(0, 7)) assert.ok(!b.events.some((e) => e.i === 'dkick'));
    const last = bd[7].events;
    assert.ok(last.some((e) => e.i === 'dkick' && e.a === 'boom' && e.b === 3.5));
    const after = bars[bars.indexOf(bd[7]) + 1];
    assert.equal(after.info.section, 'drop2');
    assert.ok(after.events.some((e) => e.i === 'sub' && e.b === 0));
  }
});

test('the main theme repeats every 16 bars; the variation keeps its notes', () => {
  const bars = song('subpulse', 3);
  const notes = (sec, n) => bars.filter((b) => b.info.section === sec)[n].events.filter((e) => e.i === 'theme').map((e) => e.m);
  for (let n = 0; n < 16; n++) assert.deepEqual(notes('drop', n), notes('drop2', n));
  for (let n = 0; n < 7; n++) assert.deepEqual(notes('breakdown', n), notes('drop', n));
  for (let n = 0; n < 16; n++) assert.ok(notes('variation', n).length >= notes('drop', n).length);
});
