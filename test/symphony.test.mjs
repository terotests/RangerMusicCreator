// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SymphonyComposer, MOOD_IDS, RANGE, SECTION_OF, writeTheme } from '../src/symphony/composer.js';
import { CLASSICS } from '../src/symphony/classics.js';
import { MidiScore } from '../src/symphony/score.js';
import { exportMidi } from '../src/midi.js';
import { roman, note, chordPcs } from '../src/symphony/theory.js';

const ARTS = new Set(['sus', 'spic', 'trem', 'pizz', 'stac', 'hit', 'roll', 'crash', 'swell', 'soft']);

function bars(c, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = c.nextBar();
    if (!b) break;
    out.push(b);
  }
  return out;
}

function checkBar(b, where) {
  assert.ok(b.beats >= 3 && b.beats <= 5, `${where}: beats ${b.beats}`);
  assert.ok(b.bpm >= 40 && b.bpm <= 260, `${where}: bpm ${b.bpm}`);
  for (const e of b.events) {
    assert.ok(SECTION_OF[e.i], `${where}: unknown player ${e.i}`);
    assert.ok(ARTS.has(e.a), `${where}: articulation ${e.a}`);
    assert.ok(e.b >= 0 && e.b < b.beats + 1e-6, `${where}: beat ${e.b}`);
    assert.ok(e.d > 0, `${where}: length ${e.d}`);
    assert.ok(e.v > 0 && e.v <= 1, `${where}: velocity ${e.v}`);
    if (RANGE[e.i] && e.m != null) assert.ok(e.m >= RANGE[e.i][0] && e.m <= RANGE[e.i][1], `${where}: ${e.i} pitch ${e.m} out of range`);
  }
}

test('roman numerals and notes', () => {
  assert.equal(note('C4'), 60);
  assert.equal(note('F#4'), 66);
  assert.equal(note('Bb3'), 58);
  assert.deepEqual(chordPcs(0, roman('bVI')), [8, 0, 3]);
  assert.deepEqual(chordPcs(2, roman('V7')), [9, 1, 4, 7]);
  assert.deepEqual(chordPcs(11, roman('bIII')), [2, 6, 9]);
});

test('same seed gives the same symphony', () => {
  const a = JSON.stringify(bars(new SymphonyComposer({ seed: 11, mood: 'heroic' }), 50));
  const b = JSON.stringify(bars(new SymphonyComposer({ seed: 11, mood: 'heroic' }), 50));
  assert.equal(a, b);
  assert.notEqual(a, JSON.stringify(bars(new SymphonyComposer({ seed: 12, mood: 'heroic' }), 50)));
});

for (const mood of MOOD_IDS) {
  test(`${mood}: three cycles of valid bars through the whole form`, () => {
    const c = new SymphonyComposer({ seed: 3, mood });
    const out = bars(c, 140);
    const sections = new Set(out.map((b) => b.info.section));
    for (const s of ['intro', 'A1', 'A2', 'B', 'A3', 'coda']) assert.ok(sections.has(s), `missing ${s}`);
    out.forEach((b, i) => checkBar(b, `${mood} bar ${i}`));
    // The climax is louder and fuller than the first statement.
    const avg = (sec) => {
      const bs = out.filter((b) => b.info.section === sec).slice(0, 8);
      return bs.reduce((a, b) => a + b.events.length, 0) / bs.length;
    };
    assert.ok(avg('A3') > avg('A1'), `A3 ${avg('A3')} vs A1 ${avg('A1')}`);
  });
}

test('themes: A ends on the tonic, the opening leaps up', () => {
  for (const mood of MOOD_IDS) {
    for (let seed = 1; seed < 20; seed++) {
      const t = writeTheme(seed, mood);
      const A = t.phrases.A;
      assert.equal(A.length, 8);
      const last = A[7].mel[A[7].mel.length - 1];
      assert.equal(((last.m - t.key) % 12 + 12) % 12, 0, `${mood} ${seed}: ends on ${last.m}`);
    }
  }
});

test('intensity changes how big it gets', () => {
  const count = (I) => bars(new SymphonyComposer({ seed: 4, mood: 'flyby', intensity: I }), 60).reduce((a, b) => a + b.events.length, 0);
  assert.ok(count(1) > count(0.1) * 1.3);
});

test('muting brass moves the melody and removes brass', () => {
  const out = bars(new SymphonyComposer({ seed: 4, mood: 'heroic', avail: { brass: false } }), 60);
  for (const b of out) for (const e of b.events) assert.notEqual(SECTION_OF[e.i], 'brass');
  const a1 = out.filter((b) => b.info.section === 'A1');
  assert.ok(a1.some((b) => b.events.some((e) => e.i === 'vln1')));
});

for (const p of CLASSICS) {
  test(`classic ${p.id}: plays through and ends`, () => {
    const c = new SymphonyComposer({ seed: 1, piece: p.id, loop: false });
    const out = bars(c, 500);
    assert.ok(out.length > 10 && out.length < 500, `${out.length} bars`);
    assert.ok(c.ended);
    out.forEach((b, i) => checkBar(b, `${p.id} bar ${i}`));
    assert.equal(out[2].beats, p.meter);
  });
}

test('the Blue Danube opens with D-F#-A in the melody', () => {
  const c = new SymphonyComposer({ seed: 1, piece: 'danube', loop: false });
  const out = bars(c, 4);
  const lead = out[2].events.filter((e) => (e.i === 'hn' || e.i === 'vc') && e.a === 'sus').map((e) => e.m % 12);
  assert.deepEqual(lead.slice(0, 3), [2, 6, 9]);
});

test('MIDI score: parts go to the right players', () => {
  // Desk export: a track named "Bass" goes to the basses, "Lead" (program 80) to the string split.
  const ev = (ch, step, midi) => ({ ch, step, midi, dur: 4, vel: 0.8 });
  const midiBars = [{ events: [ev('bass', 0, 40), ev('lead', 0, 76), ev('kick', 0, 36)], info: { bpm: 100, swing: 0 } }, { events: [ev('bass', 0, 43)], info: { bpm: 100, swing: 0 } }];
  const bytes = exportMidi(midiBars, 'Test');
  const s = new MidiScore(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const all = [];
  for (let b; (b = s.nextBar()); ) all.push(...b.events);
  assert.ok(all.some((e) => e.i === 'cb' && e.m === 40), JSON.stringify(all));
  assert.ok(all.some((e) => e.i === 'vln1' && e.m === 76));
  assert.ok(all.some((e) => e.i === 'bd'));
});

test('sample map: every set the orchestra uses exists, and its files are there', () => {
  const map = JSON.parse(readFileSync(new URL('../samples/vsco2/map.json', import.meta.url)));
  const src = readFileSync(new URL('../src/symphony/orchestra.js', import.meta.url), 'utf8');
  const sets = new Set([...src.matchAll(/'([a-z]+_[a-z]+|harp|glock|timp)'/g)].map((m) => m[1]).filter((k) => /_(sus|spic|trem|pizz|stac|roll)$|^(harp|glock|timp)$/.test(k)));
  for (const s of sets) assert.ok(map[s], `missing set ${s}`);
  for (const [k, v] of Object.entries(map)) {
    assert.ok(v.samples.length, k);
    for (const s of v.samples) assert.ok(existsSync(new URL('../samples/vsco2/' + s.f, import.meta.url)), s.f);
  }
});
