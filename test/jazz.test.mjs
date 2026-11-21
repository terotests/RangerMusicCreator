// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { RagComposer, RAG_STYLE_IDS, writeRag } from '../src/jazz/ragtime.js';
import { BigBandComposer, BB_STYLE_IDS, BB_TUNES, writeTune } from '../src/jazz/bigband.js';
import { RAGS, RAG_BY_ID, ragFromMidi, detectChord } from '../src/jazz/scores.js';
import { RANGE, RAG_SECTION_OF, BB_SECTION_OF, RAG_BAND, BIGBAND_BAND } from '../src/jazz/band.js';
import { chord, pcs, closeBelow, swingEvents } from '../src/jazz/theory.js';

const ARTS = new Set(['sus', 'stac', 'hit', 'pizz', 'mute', 'vib', 'fall', 'roll', 'crash', 'soft', 'pedal', 'open']);
const UNPITCHED = new Set(['bd', 'sn', 'cym', 'tap', 'hh', 'ride', 'tom']);

function readBuf(path) {
  const b = readFileSync(new URL('../' + path, import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
}
const loadRag = (id) => ragFromMidi(readBuf(RAG_BY_ID[id].file), RAG_BY_ID[id]);

function take(c, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = c.nextBar();
    if (!b) break;
    out.push(b);
  }
  return out;
}

function checkBars(bars, sectionOf, where) {
  bars.forEach((b, k) => {
    assert.ok(b.beats > 0 && b.beats <= 4, `${where} bar ${k}: beats ${b.beats}`);
    assert.ok(b.bpm >= 40 && b.bpm <= 260, `${where} bar ${k}: bpm ${b.bpm}`);
    for (const e of b.events) {
      assert.ok(sectionOf[e.i], `${where} bar ${k}: unknown player ${e.i}`);
      assert.ok(ARTS.has(e.a), `${where} bar ${k}: articulation ${e.a}`);
      assert.ok(e.b >= 0 && e.b < b.beats + 1e-6, `${where} bar ${k}: beat ${e.b}`);
      assert.ok(e.d > 0, `${where} bar ${k}: length ${e.d}`);
      assert.ok(e.v > 0 && e.v <= 1, `${where} bar ${k}: velocity ${e.v}`);
      if (UNPITCHED.has(e.i)) continue;
      assert.ok(Number.isFinite(e.m), `${where} bar ${k}: ${e.i} has no pitch`);
      if (RANGE[e.i]) assert.ok(e.m >= RANGE[e.i][0] && e.m <= RANGE[e.i][1], `${where} bar ${k}: ${e.i} pitch ${e.m} out of range`);
    }
  });
}

test('jazz chords and voicings', () => {
  assert.deepEqual(pcs(0, chord('V7')), [7, 11, 2, 5]);
  assert.deepEqual(pcs(5, chord('ii7')), [7, 10, 2, 5]);
  assert.deepEqual(pcs(0, chord('#ivo7')), [6, 9, 0, 3]);
  assert.deepEqual(pcs(0, chord('I6')), [0, 4, 7, 9]);
  assert.deepEqual(closeBelow(72, 0, chord('I6'), 4), [72, 69, 67, 64]);
  const ev = swingEvents([{ b: 0.5, d: 0.5 }, { b: 1, d: 0.5 }], 0.66);
  assert.ok(Math.abs(ev[0].b - 0.66) < 1e-9);
  assert.equal(ev[1].b, 1);
});

test('every player of both bands has a seat and a fader', () => {
  for (const [band, sectionOf] of [[RAG_BAND, RAG_SECTION_OF], [BIGBAND_BAND, BB_SECTION_OF]]) {
    for (const p of Object.keys(sectionOf)) {
      assert.ok(band.seats[p], `no seat for ${p}`);
      assert.ok(band.sections.includes(sectionOf[p]), `no fader for ${p}`);
    }
  }
});

test('the jazz sample map lists files that exist', () => {
  const map = JSON.parse(readFileSync(new URL('../samples/jazz/map.json', import.meta.url)));
  for (const [set, info] of Object.entries(map)) {
    assert.ok(info.samples.length > 0, set);
    for (const s of info.samples) assert.ok(existsSync(new URL('../samples/jazz/' + s.f, import.meta.url)), `missing ${s.f}`);
  }
  for (const set of ['piano', 'tp_mute', 'tb_vib', 'tb_fall', 'cl_stac', 'ride', 'sn_tap']) assert.ok(map[set], `no ${set}`);
});

test('same seed gives the same rag and the same tune', () => {
  assert.equal(JSON.stringify(writeRag(5, 'stomp')), JSON.stringify(writeRag(5, 'stomp')));
  assert.notEqual(JSON.stringify(writeRag(5, 'stomp')), JSON.stringify(writeRag(6, 'stomp')));
  assert.equal(JSON.stringify(writeTune(5, 'swing')), JSON.stringify(writeTune(5, 'swing')));
});

for (const style of RAG_STYLE_IDS) {
  test(`ragtime ${style}: the whole rag form, valid bars`, () => {
    const c = new RagComposer({ seed: 3, style, band: 'auto' });
    const bars = take(c, 140);
    const sections = new Set(bars.map((b) => b.info.section));
    for (const s of ['intro', 'A', 'B', 'C', 'end']) assert.ok(sections.has(s), `missing ${s}`);
    checkBars(bars, RAG_SECTION_OF, style);
    // The trio is in the subdominant.
    const a = bars.find((b) => b.info.section === 'A');
    const t = bars.find((b) => b.info.section === 'C');
    assert.notEqual(a.info.key, t.info.key);
  });
}

test('ragtime band: AUTO joins on the repeats, SOLO PIANO never', () => {
  const auto = take(new RagComposer({ seed: 4, style: 'stomp', band: 'auto' }), 60);
  const first = auto.filter((b) => b.info.section === 'A' && !b.info.repeat);
  const again = auto.filter((b) => b.info.section === 'A' && b.info.repeat);
  assert.ok(first.every((b) => b.events.every((e) => e.i === 'pno')));
  assert.ok(again.some((b) => b.events.some((e) => e.i === 'tp')));
  const solo = take(new RagComposer({ seed: 4, style: 'stomp', band: 'off' }), 120);
  assert.ok(solo.every((b) => b.events.every((e) => e.i === 'pno')));
});

for (const r of RAGS) {
  test(`Joplin: ${r.id} reads into measures and plays to the end`, () => {
    const rag = loadRag(r.id);
    assert.ok(rag.measures.length > 60, `${rag.measures.length} measures`);
    const notes = rag.measures.reduce((a, m) => a + m.notes.length, 0);
    assert.ok(notes > 1000, `${notes} notes`);
    const bars = take(new RagComposer({ score: rag, loop: false, band: 'on' }), 400);
    assert.equal(bars.length, rag.measures.length);
    checkBars(bars, RAG_SECTION_OF, r.id);
  });
}

test('The Entertainer starts with its famous descending intro', () => {
  const rag = loadRag('entertainer');
  const tops = rag.measures[0].notes.filter((n) => n.h === 0).sort((a, b) => a.b - b.b || b.m - a.m);
  const melody = [];
  for (const n of tops) if (!melody.length || melody[melody.length - 1].b !== n.b) melody.push(n);
  assert.deepEqual(melody.slice(0, 4).map((n) => n.m % 12), [2, 4, 0, 9]); // D E C A
});

test('chord detection', () => {
  assert.deepEqual(detectChord([{ m: 43, h: 1 }, { m: 59, h: 1 }, { m: 62, h: 1 }, { m: 65, h: 1 }]), { r: 7, q: 'dom7', at: 0 });
  assert.deepEqual(detectChord([{ m: 36, h: 1 }, { m: 52, h: 1 }, { m: 55, h: 1 }]), { r: 0, q: 'maj', at: 0 });
});

for (const style of BB_STYLE_IDS) {
  test(`big band ${style}: intro, tune, solo, shout, out, ending`, () => {
    const c = new BigBandComposer({ seed: 9, style });
    const bars = [];
    for (let i = 0; i < 260; i++) {
      const b = c.nextBar();
      bars.push(b);
      if (b.info.section === 'rest') break;
    }
    const kinds = new Set(bars.map((b) => b.info.section));
    for (const k of ['intro', 'head', 'solo', 'shout', 'out', 'end']) assert.ok(kinds.has(k), `missing ${k}`);
    checkBars(bars, BB_SECTION_OF, style);
    // The shout chorus is louder and busier than the first chorus.
    const avg = (k) => {
      const bs = bars.filter((b) => b.info.section === k);
      return bs.reduce((a, b) => a + b.events.reduce((x, e) => x + e.v, 0), 0) / bs.length;
    };
    assert.ok(avg('shout') > avg('head'), `${style}: shout ${avg('shout')} vs head ${avg('head')}`);
  });
}

test('big band standards', () => {
  const maple = loadRag('maple');
  for (const t of BB_TUNES) {
    const c = new BigBandComposer({ tune: t.id, rag: t.rag ? maple : null, loop: false });
    const bars = take(c, 300);
    assert.ok(bars.length > 60, `${t.id}: ${bars.length} bars`);
    assert.equal(c.ended, true);
    checkBars(bars, BB_SECTION_OF, t.id);
  }
});

test('SHOUT and ENDING jump through the form', () => {
  const c = new BigBandComposer({ seed: 2, style: 'jump' });
  take(c, 6);
  c.climax();
  assert.equal(c.nextBar().info.section, 'shout');
  c.end();
  const rest = take(c, 200);
  assert.ok(rest.some((b) => b.info.section === 'end'));
  assert.equal(c.ended, true);
});
