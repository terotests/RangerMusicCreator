// SPDX-License-Identifier: MIT
// Standard MIDI files: export what the desk played (one track per part, drums
// on channel 10), and read a melody out of any MIDI file to use as a theme.

const PPQ = 480;
const STEP = PPQ / 4; // a sixteenth

const PARTS = {
  kick: { ch: 9, name: 'Kick' },
  snare: { ch: 9, name: 'Snare' },
  hats: { ch: 9, name: 'Hats' },
  bass: { ch: 0, name: 'Bass', program: 38 },
  keys: { ch: 1, name: 'Chords', program: 4 },
  pad: { ch: 2, name: 'Pad', program: 89 },
  lead: { ch: 3, name: 'Lead', program: 80 },
  arp: { ch: 4, name: 'Arp', program: 81 },
};

function drumNote(e) {
  if (e.ch === 'kick') return 36;
  if (e.ch === 'snare') {
    if (!e.tom) return 38;
    return e.tom > 200 ? 50 : e.tom > 160 ? 48 : e.tom > 135 ? 47 : 45;
  }
  if (e.crash) return 49;
  return e.open ? 46 : 42;
}

function vlq(n) {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}

function text(type, s) {
  const b = [...new TextEncoder().encode(s)];
  return [0xff, type, ...vlq(b.length), ...b];
}

function track(events) {
  // events: [tick, order, bytes]; note-offs (order 0) before note-ons (order 1) at the same tick
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const data = [];
  let last = 0;
  for (const [tick, , bytes] of events) {
    data.push(...vlq(Math.max(0, tick - last)), ...bytes);
    last = tick;
  }
  data.push(0, 0xff, 0x2f, 0);
  return [0x4d, 0x54, 0x72, 0x6b, (data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...data];
}

// bars: [{ events, info: { bpm, swing } }]
export function exportMidi(bars, title = 'Ranger Music Creator') {
  const tempo = [[0, 0, text(0x03, title)], [0, 0, [0xff, 0x58, 4, 4, 2, 24, 8]]];
  const parts = Object.fromEntries(Object.keys(PARTS).map((p) => [p, []]));
  let lastBpm = null;
  const sounding = new Map();
  bars.forEach((bar, b) => {
    const base = b * 16 * STEP;
    const { bpm, swing = 0 } = bar.info;
    if (bpm !== lastBpm) {
      const us = Math.round(60000000 / bpm);
      tempo.push([base, 0, [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255]]);
      lastBpm = bpm;
    }
    for (const e of bar.events) {
      if (e.fx || !PARTS[e.ch]) continue;
      const p = PARTS[e.ch];
      const at = base + e.step * STEP + (e.step % 2 ? Math.round(swing * STEP) : 0);
      const vel = Math.max(1, Math.min(127, Math.round(20 + 100 * Math.min(1, e.vel))));
      const notes = p.ch === 9 ? [drumNote(e)] : e.midis || [e.midi];
      const len = p.ch === 9 ? STEP / 2 : Math.max(STEP / 2, Math.round((e.len || 1) * STEP * 0.95));
      for (const n of notes) {
        // A new note cuts a still-sounding one of the same pitch, so every note-on gets its own note-off.
        const k = `${p.ch}:${n}`;
        const prev = sounding.get(k);
        if (prev && prev[0] > at) prev[0] = at;
        const off = [at + len, 0, [0x80 | p.ch, n, 0]];
        parts[e.ch].push([at, 1, [0x90 | p.ch, n, vel]]);
        parts[e.ch].push(off);
        sounding.set(k, off);
      }
    }
  });
  const tracks = [track(tempo)];
  for (const [part, evs] of Object.entries(parts)) {
    if (!evs.length) continue;
    const p = PARTS[part];
    const head = [[0, 0, text(0x03, p.name)]];
    if (p.program != null) head.push([0, 0, [0xc0 | p.ch, p.program]]);
    tracks.push(track(head.concat(evs)));
  }
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255];
  return new Uint8Array(header.concat(...tracks));
}

// ---- reading ----------------------------------------------------------------

export function parseMidi(buffer) {
  const d = new DataView(buffer);
  let p = 0;
  const str = (n) => String.fromCharCode(...new Uint8Array(buffer, p, n));
  if (str(4) !== 'MThd') throw new Error('not a MIDI file');
  const ntracks = d.getUint16(10);
  const division = d.getUint16(12);
  if (division & 0x8000) throw new Error('SMPTE-timed MIDI files are not supported');
  p = 8 + d.getUint32(4);
  const notes = [];
  let name = null;
  for (let t = 0; t < ntracks && p < buffer.byteLength; t++) {
    if (str(4) !== 'MTrk') break;
    const len = d.getUint32(p + 4);
    let q = p + 8;
    const end = q + len;
    let tick = 0;
    let status = 0;
    const open = new Map();
    const readVlq = () => {
      let v = 0;
      let b;
      do {
        b = d.getUint8(q++);
        v = (v << 7) | (b & 0x7f);
      } while (b & 0x80);
      return v;
    };
    while (q < end) {
      tick += readVlq();
      let b = d.getUint8(q);
      if (b & 0x80) {
        status = b;
        q++;
      }
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = d.getUint8(q++);
        const l = readVlq();
        if ((meta === 0x03 || meta === 0x01) && !name) name = new TextDecoder().decode(new Uint8Array(buffer, q, l)).trim() || null;
        q += l;
      } else if (status === 0xf0 || status === 0xf7) {
        q += readVlq();
      } else if (type === 0x90 || type === 0x80) {
        const n = d.getUint8(q++);
        const v = d.getUint8(q++);
        const k = ch * 128 + n;
        if (type === 0x90 && v > 0) open.set(k, { tick, v });
        else if (open.has(k)) {
          const o = open.get(k);
          notes.push({ ch, pitch: n, start: o.tick / division, dur: Math.max(1, tick - o.tick) / division, vel: o.v });
          open.delete(k);
        }
      } else if (type === 0xc0 || type === 0xd0) q += 1;
      else q += 2;
    }
    p = end;
  }
  notes.sort((a, b) => a.start - b.start || b.pitch - a.pitch);
  return { name, notes };
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

// The top line of the busiest non-drum channel, as a theme: { name, notes: [[degree, beats]] }.
export function melodyTheme({ name, notes }, fallbackName = 'MIDI THEME', maxBeats = 32) {
  const byCh = new Map();
  for (const n of notes) if (n.ch !== 9) byCh.set(n.ch, (byCh.get(n.ch) || 0) + 1);
  if (!byCh.size) throw new Error('no melodic notes in this file');
  const ch = [...byCh.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const q = (x) => Math.round(x * 4) / 4;
  // Skyline: the highest note at each onset.
  const line = [];
  for (const n of notes) {
    if (n.ch !== ch) continue;
    const s = q(n.start);
    const prev = line[line.length - 1];
    if (prev && prev.start === s) {
      if (n.pitch > prev.pitch) Object.assign(prev, { pitch: n.pitch, dur: n.dur });
    } else line.push({ start: s, pitch: n.pitch, dur: n.dur });
  }
  const t0 = line[0].start;
  const mel = line.filter((n) => n.start - t0 < maxBeats);
  // Key: the major scale that holds the most note time; minor if the tune ends on its sixth.
  let best = 0;
  let bestScore = -1;
  for (let pc = 0; pc < 12; pc++) {
    let score = 0;
    for (const n of mel) if (MAJOR.includes((n.pitch - pc + 120) % 12)) score += n.dur;
    if ((mel[mel.length - 1].pitch - pc + 120) % 12 === 0) score += 0.5;
    if (score > bestScore) [best, bestScore] = [pc, score];
  }
  const lastPc = mel[mel.length - 1].pitch % 12;
  const minor = lastPc === (best + 9) % 12;
  const tonic = minor ? (best + 9) % 12 : best;
  const scale = minor ? MINOR : MAJOR;
  let ref = mel[0].pitch;
  while ((ref - tonic + 120) % 12 !== 0) ref--;
  const degree = (pitch) => {
    const rel = pitch - ref;
    const oct = Math.floor(rel / 12);
    const pc = ((rel % 12) + 12) % 12;
    let i = scale.length - 1;
    while (scale[i] > pc) i--;
    return oct * 7 + i;
  };
  const out = [];
  for (let i = 0; i < mel.length; i++) {
    const n = mel[i];
    const next = i + 1 < mel.length ? mel[i + 1].start : n.start + n.dur;
    const len = Math.max(0.25, q(Math.min(n.dur, next - n.start)) || 0.25);
    out.push([degree(n.pitch), len]);
    const gap = q(next - n.start - len);
    if (gap >= 0.5 && i + 1 < mel.length) out.push([null, gap]);
  }
  return { name: (name || fallbackName).toUpperCase().slice(0, 24), source: 'imported MIDI', mode: minor ? 'minor' : 'major', notes: out };
}
