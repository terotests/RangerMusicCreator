// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { WORKS, COMPOSERS, ARRANGEMENTS, arrangeBytes, scoreUrl } from '../src/symphony/repertoire.js';
import { MidiScore, parseScore } from '../src/symphony/score.js';
import { RANGE } from '../src/symphony/composer.js';
import { SEATS } from '../src/symphony/orchestra.js';

const bytes = (w) => {
  const b = readFileSync(new URL('../' + scoreUrl(w), import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

test('every work has a score file, a composer and known arrangements', () => {
  const ids = new Set(COMPOSERS.map((c) => c.id));
  for (const w of WORKS) {
    assert.ok(existsSync(new URL('../' + scoreUrl(w), import.meta.url)), w.file);
    assert.ok(ids.has(w.composer), w.id);
    assert.ok(w.arr.length >= 2 && w.arr.every((a) => ARRANGEMENTS[a]), w.id);
  }
  for (const c of ['bach', 'vivaldi', 'chopin']) assert.ok(WORKS.filter((w) => w.composer === c).length >= 5, c);
});

test('every arrangement plays on seated players, in range, and lasts a sensible time', () => {
  for (const w of WORKS) {
    const buf = bytes(w);
    for (const a of w.arr) {
      const s = new MidiScore(buf, w.name, { arrange: (sc) => arrangeBytes(buf, w, a), bpm: w.bpm, title: w.name });
      let secs = 0;
      let n = 0;
      for (let bar, k = 0; (bar = s.nextBar()) && k < 3000; k++) {
        secs += (bar.beats * 60) / bar.bpm;
        for (const e of bar.events) {
          n++;
          assert.ok(SEATS[e.i], `${w.id}/${a}: no seat for ${e.i}`);
          if (e.m != null && RANGE[e.i]) assert.ok(e.m >= RANGE[e.i][0] - 2 && e.m <= RANGE[e.i][1] + 2, `${w.id}/${a}: ${e.i} ${e.m}`);
          if (a === 'piano') assert.equal(e.i, 'pno');
          if (a === 'strings') assert.ok(['vln1', 'vln2', 'vla', 'vc', 'cb', 'harp'].includes(e.i), `${w.id}: ${e.i} in strings`);
        }
      }
      assert.ok(n > 50, `${w.id}/${a}: ${n} notes`);
      assert.ok(secs > 30 && secs < 900, `${w.id}/${a}: ${Math.round(secs)} s`);
    }
  }
});

test('the sustain pedal holds piano notes, and string versions end at the key', () => {
  const w = WORKS.find((x) => x.id === 'chopin-prelude-15');
  const sc = parseScore(bytes(w));
  const held = sc.tracks.flatMap((t) => t.notes).filter((n) => n.k1 != null);
  assert.ok(held.length > 20, 'pedalled notes');
  assert.ok(held.every((n) => n.k1 < n.t1));
  const strings = arrangeBytes(bytes(w), w, 'strings');
  const piano = arrangeBytes(bytes(w), w, 'piano');
  const avg = (ns) => ns.reduce((s, n) => s + n.t1 - n.t0, 0) / ns.length;
  assert.ok(avg(piano) > avg(strings));
});

test('the grand piano samples are all there', () => {
  const map = JSON.parse(readFileSync(new URL('../samples/grand/map.json', import.meta.url)));
  assert.equal(map.piano.layers, 3);
  assert.ok(map.piano.samples.length >= 120);
  for (const s of map.piano.samples) assert.ok(existsSync(new URL('../samples/grand/' + s.f, import.meta.url)), s.f);
});

test('interpretation: a nocturne sings over a lighter left hand, a string line is bowed legato', () => {
  const noct = WORKS.find((x) => x.id === 'chopin-nocturne-9-2');
  const p = arrangeBytes(bytes(noct), noct, 'piano');
  const lead = p.filter((n) => n.lead);
  const rest = p.filter((n) => !n.lead && n.m < 60);
  const mean = (ns) => ns.reduce((s, n) => s + n.v, 0) / ns.length;
  assert.ok(mean(lead) > mean(rest) * 1.3, `${mean(lead)} vs ${mean(rest)}`);
  const spring = WORKS.find((x) => x.id === 'vivaldi-spring-1');
  const s = arrangeBytes(bytes(spring), spring, 'strings');
  assert.ok(s.filter((n) => n.leg).length > s.length * 0.5);
});
