import test from 'node:test';
import assert from 'node:assert/strict';
import { Composer } from '../src/composer.js';
import { Taste, TasteNet, features, N_FEATURES, FEATURE_NAMES } from '../src/taste.js';
import { mulberry32 } from '../src/rng.js';

const makeMaterial = (seed, style) => new Composer({ seed, style }).material();

test('features are a fixed-length vector in 0..1', () => {
  for (const style of ['lofi', 'dnb', 'scene', 'adventure']) {
    const x = features(makeMaterial(42, style));
    assert.equal(x.length, N_FEATURES);
    assert.equal(FEATURE_NAMES.length, N_FEATURES);
    for (const v of x) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), `${style}: ${v}`);
  }
});

test('the net learns a simple rule', () => {
  const r = mulberry32(3);
  const data = Array.from({ length: 80 }, () => {
    const x = Array.from({ length: N_FEATURES }, () => r());
    return { x, y: x[3] > 0.5 ? 1 : 0 };
  });
  const net = new TasteNet({ seed: 2 });
  net.train(data, { epochs: 600 });
  const acc = data.filter((d) => (net.predict(d.x) > 0.5) === !!d.y).length / data.length;
  assert.ok(acc > 0.85, `accuracy ${acc}`);
  const back = TasteNet.fromJSON(JSON.parse(JSON.stringify(net)));
  assert.equal(back.predict(data[0].x), net.predict(data[0].x));
});

test('liking one style makes new songs lean toward it', () => {
  const likes = [1, 2, 3, 4, 5, 6].map((s) => features(makeMaterial(s * 101, 'dnb')));
  const skips = [7, 8, 9].map((s) => features(makeMaterial(s * 101, 'ambient')));
  const taste = new Taste({ makeMaterial, random: mulberry32(11) });
  taste.fit(likes, skips);
  assert.ok(taste.ready);
  assert.ok(taste.score(makeMaterial(999, 'dnb')) > taste.score(makeMaterial(999, 'ambient')));
  let dnb = 0;
  const n = 60;
  for (let i = 0; i < n; i++) if (taste.pick(null).style === 'dnb') dnb++;
  // Random choice would give about 1 in 9.
  assert.ok(dnb / n > 0.4, `dnb picked ${dnb}/${n}`);
});

test('without enough likes songs stay random', () => {
  const taste = new Taste({ makeMaterial, random: mulberry32(5) });
  taste.fit([features(makeMaterial(1, 'dnb'))]);
  assert.equal(taste.ready, false);
  assert.equal(taste.pick('lofi').picked, 'random');
});
