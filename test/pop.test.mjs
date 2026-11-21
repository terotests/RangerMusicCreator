// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PopComposer, toDegrees, fromDegrees, prepareRiff } from '../src/pop/composer.js';
import { POP_STYLES, POP_STYLE_IDS } from '../src/pop/styles.js';
import { RIFFS, RIFF_BY } from '../src/pop/riffs.js';
import { PROGRESSIONS, PROGRESSION_BY, ROTATIONS } from '../src/pop/progressions.js';
import { POP_BAND, POP_SECTION_OF, POP_RANGE } from '../src/pop/bands.js';
import { bars as chordBars, chord, pcs as chordPcs } from '../src/jazz/theory.js';
import { tune } from '../src/retro/tunes.js';

function song(c, max = 200) {
  const out = [];
  for (let i = 0; i < max; i++) {
    const b = c.nextBar();
    if (!b) break;
    out.push(b);
    if (b.info.section === 'end') break;
  }
  return out;
}

function check(bars, where) {
  bars.forEach((b, k) => {
    assert.equal(b.beats, 4);
    assert.ok(b.bpm >= 40 && b.bpm <= 260, `${where} bar ${k}: bpm`);
    for (const e of b.events) {
      assert.ok(POP_SECTION_OF[e.i], `${where} bar ${k}: unknown player ${e.i}`);
      assert.ok(POP_BAND.synth[e.i], `${where} bar ${k}: nothing plays ${e.i}`);
      assert.ok(e.b >= 0 && e.b < 4, `${where} bar ${k}: beat ${e.b}`);
      assert.ok(e.d > 0 && e.v > 0 && e.v <= 1, `${where} bar ${k}: length or velocity`);
      if (POP_RANGE[e.i]) assert.ok(e.m >= POP_RANGE[e.i][0] && e.m <= POP_RANGE[e.i][1], `${where} bar ${k}: ${e.i} ${e.m} out of range`);
    }
  });
}

test('every player has a seat, a fader and a sound', () => {
  for (const p of Object.keys(POP_SECTION_OF)) {
    assert.ok(POP_BAND.seats[p], `no seat for ${p}`);
    assert.ok(POP_BAND.sections.includes(POP_SECTION_OF[p]), `no fader for ${p}`);
    assert.ok(POP_BAND.synth[p], `no sound for ${p}`);
  }
});

test('scale degrees go there and back', () => {
  for (const minor of [false, true]) for (let m = 48; m < 84; m++) {
    const { deg, alt } = toDegrees(m, 60, minor);
    assert.equal(fromDegrees(deg, alt, 60, minor), m);
  }
  // G# in A minor is the raised seventh.
  assert.deepEqual(toDegrees(68, 57, true), { deg: 6, alt: 1 });
});

test('riffs, loops and rotations are well formed', () => {
  for (const r of RIFFS) {
    const bars = tune(r.notes);
    assert.ok(bars.length === 1 || bars.length === 2, `${r.id}: ${bars.length} bars`);
    for (const bar of bars) {
      const end = Math.max(...bar.map((n) => n.b + n.d));
      assert.ok(end <= 4 + 1e-6, `${r.id}: bar longer than 4 beats (${end})`);
    }
    assert.ok(r.pd && r.source, `${r.id}: no public-domain note`);
    assert.equal(prepareRiff(r, r.minor).bars.length, bars.length);
  }
  for (const p of PROGRESSIONS) {
    const bars = chordBars(p.chords, 4);
    assert.equal(bars.length, 4, `${p.id}: 4 bars`);
    assert.ok(p.moves && p.where && p.bass, `${p.id}: description`);
    for (const r of ROTATIONS[p.id]) assert.ok(PROGRESSION_BY[r], `${p.id}: rotation ${r}`);
  }
  for (const id of POP_STYLE_IDS) for (const pid of POP_STYLES[id].progs) assert.ok(PROGRESSION_BY[pid], `${id}: ${pid}`);
  for (const id of POP_STYLE_IDS) for (const rid of POP_STYLES[id].riffs) assert.ok(rid === 'motif' || RIFF_BY[rid], `${id}: ${rid}`);
});

test('every machine writes a whole song in form', () => {
  for (const style of POP_STYLE_IDS) for (const seed of [1, 2, 3, 4]) {
    const c = new PopComposer({ style, seed, loop: false });
    const bars = song(c);
    check(bars, `${style}/${seed}`);
    const order = [];
    for (const b of bars) if (order[order.length - 1] !== b.info.section) order.push(b.info.section);
    assert.deepEqual(order, ['intro', 'verse', 'build', 'chorus', 'break', 'verse', 'build', 'chorus', 'lift', 'outro', 'end'], `${style}/${seed}`);
    assert.ok(bars.slice(0, -1).every((b) => b.events.some((e) => POP_STYLES[style].lead[b.info.section].includes(e.i))), `${style}/${seed}: a bar without the riff`);
  }
});

test('every riff and every loop can be chosen', () => {
  for (const r of [...RIFFS.map((x) => x.id), 'motif']) {
    const bars = song(new PopComposer({ style: 'moog', riff: r, seed: 3 }));
    check(bars, r);
    if (r !== 'motif') assert.equal(bars[0].info.riffId, r);
  }
  for (const p of PROGRESSIONS) {
    const c = new PopComposer({ style: 'edm', prog: p.id, seed: 2 });
    assert.equal(c.song.minor, p.minor);
    const bars = song(c);
    check(bars, p.id);
    assert.ok(bars.some((b) => b.info.progId === p.id));
  }
});

test('the riff is transformed: held, moved, answered, halved and lifted', () => {
  const labels = new Set();
  for (const style of POP_STYLE_IDS) for (const seed of [1, 2, 3, 4, 5, 6]) for (const b of song(new PopComposer({ style, seed }))) if (b.info.riff) for (const l of b.info.riff.split(' · ')) labels.add(l.replace(/[↑↓+−]\d+$/, '').replace(/ \+\d$/, '').trim());
  for (const l of ['RIFF HOLDS', 'SEQUENCE', 'TRANSPOSED', 'BROKEN CHORDS', 'ANSWER', 'HALF TIME', 'DOUBLED', 'KEY CHANGE']) assert.ok([...labels].some((x) => x.startsWith(l)), `never saw ${l}: ${[...labels].join(', ')}`);
});

test('a riff held over the loop keeps its strong notes on chord tones', () => {
  for (const riff of ['elise', 'turca', 'mountain', 'invention']) {
    const c = new PopComposer({ style: 'moog', seed: 9, riff, prog: 'andalusian' });
    for (const b of song(c)) {
      if (b.info.section !== 'verse') continue;
      const tones = chordPcs(c.song.key, chord(b.info.roman));
      for (const e of b.events.filter((x) => x.i === 'moog' && (x.b === 0 || x.b === 2))) assert.ok(tones.includes(e.m % 12), `${riff}: ${e.m} on beat ${e.b} over ${b.info.roman}`);
    }
  }
});

test('the same seed gives the same song', () => {
  const a = song(new PopComposer({ style: 'euro', seed: 77 }));
  const b = song(new PopComposer({ style: 'euro', seed: 77 }));
  assert.deepEqual(a, b);
});
