// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SpaceComposer, SPACE_STYLE_IDS, SPACE_PIECE_LIST, writeSpace } from '../src/retro/space.js';
import { SynthComposer, SYNTH_STYLE_IDS, SYNTH_PIECE_LIST, writeSynth } from '../src/retro/synthwave.js';
import { SPACE_BAND, SPACE_SECTION_OF, SPACE_RANGE, SYNTH_BAND, SYNTH_SECTION_OF, SYNTH_RANGE } from '../src/retro/bands.js';
import { tune, midi } from '../src/retro/tunes.js';

const ARTS = new Set(['sus', 'stac', 'hit', 'pizz', 'mute', 'vib', 'trem', 'roll', 'crash', 'swell', 'soft', 'open', 'fall']);

function playable(band, p) {
  return !!(band.synth?.[p] || band.kit?.[p] || band.hits?.[p] || band.sets?.[p]);
}

function checkBars(bars, band, sectionOf, range, where) {
  bars.forEach((b, k) => {
    assert.ok(b.beats === 3 || b.beats === 4, `${where} bar ${k}: beats ${b.beats}`);
    assert.ok(b.bpm >= 40 && b.bpm <= 260, `${where} bar ${k}: bpm ${b.bpm}`);
    for (const e of b.events) {
      assert.ok(sectionOf[e.i], `${where} bar ${k}: unknown player ${e.i}`);
      assert.ok(playable(band, e.i), `${where} bar ${k}: nothing plays ${e.i}`);
      assert.ok(ARTS.has(e.a), `${where} bar ${k}: articulation ${e.a}`);
      assert.ok(e.b >= 0 && e.b < b.beats + 1e-6, `${where} bar ${k}: beat ${e.b}`);
      assert.ok(e.d > 0, `${where} bar ${k}: length ${e.d}`);
      assert.ok(e.v > 0 && e.v <= 1, `${where} bar ${k}: velocity ${e.v}`);
      if (range[e.i]) assert.ok(e.m >= range[e.i][0] && e.m <= range[e.i][1], `${where} bar ${k}: ${e.i} pitch ${e.m} out of range`);
    }
  });
}

function song(c, max = 200) {
  const bars = [];
  for (let i = 0; i < max; i++) {
    const b = c.nextBar();
    if (!b) break;
    bars.push(b);
    if (b.info.section === 'end') break;
  }
  return bars;
}

test('tunes are read note by note', () => {
  assert.equal(midi('A4'), 69);
  assert.equal(midi('C#5'), 73);
  assert.deepEqual(tune('C5/2 r/1 D5/1 | E5/4'), [[{ b: 0, d: 2, m: 72 }, { b: 3, d: 1, m: 74 }], [{ b: 0, d: 4, m: 76 }]]);
});

test('every player of both bands has a seat and a fader', () => {
  for (const [band, sectionOf] of [[SPACE_BAND, SPACE_SECTION_OF], [SYNTH_BAND, SYNTH_SECTION_OF]]) {
    for (const p of Object.keys(sectionOf)) {
      assert.ok(band.seats[p], `no seat for ${p}`);
      assert.ok(band.sections.includes(sectionOf[p]), `no fader for ${p}`);
      assert.ok(playable(band, p), `no sound for ${p}`);
    }
  }
});

test('the space sample map lists files that exist', () => {
  const map = JSON.parse(readFileSync(new URL('../samples/space/map.json', import.meta.url)));
  for (const [set, info] of Object.entries(map)) for (const s of info.samples) assert.ok(existsSync(new URL('../samples/space/' + s.f, import.meta.url)), `missing ${s.f}`);
  for (const k of Object.values(SPACE_BAND.kit)) for (const set of Object.values(k)) {
    const where = ['ride', 'bell', 'sn_tap'].includes(set) ? 'jazz' : 'space';
    const m = JSON.parse(readFileSync(new URL(`../samples/${where}/map.json`, import.meta.url)));
    assert.ok(m[set], `no sample set ${set}`);
  }
});

test('same seed gives the same song, other styles another', () => {
  assert.equal(JSON.stringify(writeSpace(5, 'exotica', 40)), JSON.stringify(writeSpace(5, 'exotica', 40)));
  assert.notEqual(JSON.stringify(writeSpace(5, 'exotica', 40)), JSON.stringify(writeSpace(6, 'exotica', 40)));
  assert.equal(JSON.stringify(writeSynth(5, 'outrun', 40)), JSON.stringify(writeSynth(5, 'outrun', 40)));
  assert.notEqual(writeSynth(5, 'outrun', 1)[0].info.name + writeSynth(5, 'dark', 1)[0].info.name, '');
});

for (const [Composer, ids, band, sectionOf, range, label] of [
  [SpaceComposer, SPACE_STYLE_IDS, SPACE_BAND, SPACE_SECTION_OF, SPACE_RANGE, 'space'],
  [SynthComposer, SYNTH_STYLE_IDS, SYNTH_BAND, SYNTH_SECTION_OF, SYNTH_RANGE, 'synthwave'],
]) {
  for (const style of ids) {
    test(`${label} ${style}: the whole song, valid bars, a louder finish`, () => {
      for (const seed of [1, 2, 3]) {
        const bars = song(new Composer({ seed, style }));
        const kinds = new Set(bars.map((b) => b.info.section));
        for (const k of ['intro', 'A', 'B', 'solo', 'A2', 'outro', 'end']) assert.ok(kinds.has(k), `${style} ${seed}: missing ${k}`);
        checkBars(bars, band, sectionOf, range, `${style}/${seed}`);
        const avg = (k) => {
          const bs = bars.filter((b) => b.info.section === k);
          return bs.reduce((a, b) => a + b.events.reduce((x, e) => x + e.v, 0), 0) / bs.length;
        };
        assert.ok(avg('A2') > avg('A'), `${style} ${seed}: finish ${avg('A2')} vs theme ${avg('A')}`);
        // Every bar of the tune has its melody.
        const themeBars = bars.filter((b) => b.info.section === 'A');
        assert.ok(themeBars.filter((b) => b.events.length > 0).length === themeBars.length, `${style}: empty theme bar`);
      }
    });
  }
}

test('the classics play to their end', () => {
  for (const [Composer, list, band, sectionOf, range] of [[SpaceComposer, SPACE_PIECE_LIST, SPACE_BAND, SPACE_SECTION_OF, SPACE_RANGE], [SynthComposer, SYNTH_PIECE_LIST, SYNTH_BAND, SYNTH_SECTION_OF, SYNTH_RANGE]]) {
    for (const p of list) {
      const c = new Composer({ piece: p.id, loop: false });
      const bars = [];
      let b;
      while ((b = c.nextBar()) && bars.length < 400) bars.push(b);
      assert.equal(c.ended, true, p.id);
      assert.ok(bars.length > 40, `${p.id}: ${bars.length} bars`);
      checkBars(bars, band, sectionOf, range, p.id);
      for (const k of ['A', 'B']) {
        const sec = p.sections[k];
        if (sec) assert.equal(sec.chords.split(/\s+/).length, sec.melody.length, `${p.id} ${k}: chords and melody bars differ`);
      }
    }
  }
});

test('Greensleeves starts with its tune, the Mountain King speeds up', () => {
  const g = new SpaceComposer({ piece: 'greensleeves', loop: false });
  let b;
  do b = g.nextBar(); while (b.info.section !== 'A');
  const lead = b.events.filter((e) => e.i === 'vib').map((e) => e.m % 12);
  assert.deepEqual(lead, [0, 2]); // C D after the pickup
  const m = new SynthComposer({ piece: 'mountain', loop: false });
  const bpms = [];
  while ((b = m.nextBar())) if (b.info.section !== 'end') bpms.push(b.bpm);
  assert.ok(bpms[bpms.length - 1] > bpms[0] * 1.3, `${bpms[0]} -> ${bpms[bpms.length - 1]}`);
});

test('NEXT, the big finish and ENDING jump through the song', () => {
  const c = new SynthComposer({ seed: 2, style: 'dark' });
  song(c, 3);
  c.climax();
  assert.equal(c.nextBar().info.section, 'A2');
  c.end();
  const rest = [];
  let b;
  while ((b = c.nextBar()) && rest.length < 100) rest.push(b);
  assert.ok(rest.some((x) => x.info.section === 'outro'));
  assert.ok(rest.some((x) => x.info.section === 'end'));
  assert.equal(c.ended, true);
  const s = new SpaceComposer({ seed: 2, style: 'lounge' });
  s.nextBar();
  s.next();
  assert.equal(s.nextBar().info.section, 'A');
});

test('a muted section stays quiet', () => {
  const c = new SpaceComposer({ seed: 3, style: 'bachelor', avail: { brass: false, rhythm: false } });
  const bars = song(c);
  for (const b of bars) for (const e of b.events) assert.ok(!['brass', 'rhythm'].includes(SPACE_SECTION_OF[e.i]), `${e.i} plays while muted`);
});

test('retro tunes: chord tones on long notes, chorus not above the verse', async () => {
  const { SynthComposer, SYNTH_STYLE_IDS } = await import('../src/retro/synthwave.js');
  const { pcs, chordAt } = await import('../src/jazz/theory.js');
  const pc = (m) => ((m % 12) + 12) % 12;
  for (const style of SYNTH_STYLE_IDS) for (let seed = 1; seed <= 10; seed++) {
    const s = new SynthComposer({ style, seed }).song;
    const avg = (k) => { const ms = s.sec[k].melody.flat().map((x) => x.m); return ms.reduce((a, b) => a + b, 0) / ms.length; };
    assert.ok(avg('B') <= avg('A') + 4, `${style}/${seed}: chorus ${avg('B')} vs verse ${avg('A')}`);
    for (const k of s.theme ? ['B'] : ['A', 'B']) s.sec[k].melody.forEach((bar, i) => {
      for (const n of bar) if (n.d >= 1) {
        const ch = chordAt(s.sec[k].chords[i], n.b);
        const t = [...pcs(s.key, ch).slice(0, 3), ...(s.S.add9 ? [(s.key + ch.r + 2) % 12] : [])];
        assert.ok(t.includes(pc(n.m)), `${style}/${seed} ${k}${i}: long note ${n.m} not in chord`);
      }
    });
  }
});

test('retro style songs are remixes of public-domain themes', async () => {
  const { SynthComposer, SYNTH_STYLE_IDS } = await import('../src/retro/synthwave.js');
  const { SpaceComposer, SPACE_STYLE_IDS } = await import('../src/retro/space.js');
  const { THEMES } = await import('../src/retro/themes.js');
  const lic = readFileSync(new URL('../LICENSES.md', import.meta.url), 'utf8');
  for (const t of THEMES) {
    assert.ok(lic.includes(t.source), `LICENSES.md lists ${t.source}`);
    const mel = tune(t.melody);
    assert.equal(mel.length, 8, t.id);
    assert.equal(t.chords.trim().split(/\s+/).length, 8, t.id);
    mel.forEach((bar, i) => {
      const end = bar.length ? bar[bar.length - 1].b + bar[bar.length - 1].d : t.beats;
      assert.ok(end <= t.beats + 1e-6, `${t.id} bar ${i + 1} has ${end} beats`);
    });
  }
  for (const [C, ids] of [[SynthComposer, SYNTH_STYLE_IDS], [SpaceComposer, SPACE_STYLE_IDS]]) for (const style of ids) {
    const c = new C({ style, seed: 3 });
    assert.ok(c.song.theme, `${style} picks a theme`);
    for (let k = 0; k < 40; k++) assert.ok(c.nextBar());
  }
});

test('APOLLO: pieces fill their bars and MOON SHOT remixes only mission themes', async () => {
  const { APOLLO_PIECES, APOLLO_THEMES } = await import('../src/retro/apollo.js');
  assert.ok(APOLLO_PIECES.length >= 6);
  for (const p of APOLLO_PIECES) {
    assert.equal(p.tab, 'apollo');
    assert.ok(p.pd || p.tag, `${p.id}: licence line`);
    for (const [k, sec] of Object.entries(p.sections)) {
      const n = sec.chords.trim().split(/\s+/).length;
      assert.equal(sec.melody.length, n, `${p.id} ${k}: ${sec.melody.length} melody bars for ${n} chord bars`);
      sec.melody.forEach((bar, i) => {
        const end = Math.max(0, ...bar.map((x) => x.b + x.d));
        assert.ok(end <= p.beats + 1e-6, `${p.id} ${k} bar ${i + 1} is ${end} beats long`);
      });
    }
  }
  const ids = new Set(APOLLO_THEMES.map((t) => t.id));
  for (let seed = 1; seed <= 12; seed++) {
    const c = new SpaceComposer({ seed, style: 'apollo' });
    assert.ok(ids.has(c.song.theme.id), `seed ${seed}: theme ${c.song.theme.id}`);
  }
});

test('RADIO 1969: each style remixes only its own tunes, blues in 12 bars', async () => {
  const { RADIO_STYLES } = await import('../src/retro/radio.js');
  for (const [id, S] of Object.entries(RADIO_STYLES)) {
    assert.equal(S.tab, 'radio');
    const ids = new Set(S.themes.map((t) => t.id));
    for (let seed = 1; seed <= 6; seed++) {
      const c = new SpaceComposer({ seed, style: id });
      assert.ok(ids.has(c.song.theme.id), `${id} seed ${seed}: ${c.song.theme.id}`);
      if (id === 'blues69') assert.equal(c.song.sec.A.chords.length, 12);
    }
    for (const t of S.themes) {
      const bars = tune(t.melody);
      assert.equal(bars.length, t.chords.trim().split(/\s+/).length, `${t.id}: bars`);
      bars.forEach((b, i) => assert.ok(Math.max(0, ...b.map((x) => x.b + x.d)) <= 4 + 1e-6, `${t.id} bar ${i + 1} too long`));
    }
  }
});
