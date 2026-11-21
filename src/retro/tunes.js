// SPDX-License-Identifier: MIT
// Writing public-domain melodies by hand: 'C5/2 D5/1 | E5/1.5 F5/0.5 E5/1'
// (note/length in beats, bars split by '|', 'r' is a rest).

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1);
}

export function tune(s, shift = 0) {
  return s.split('|').map((bar) => {
    let b = 0;
    const out = [];
    for (const tok of bar.trim().split(/\s+/).filter(Boolean)) {
      const [n, d] = tok.split('/');
      const len = Number(d);
      if (n !== 'r') out.push({ b, d: len, m: midi(n) + shift });
      b += len;
    }
    return out;
  });
}
