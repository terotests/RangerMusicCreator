// SPDX-License-Identifier: MIT
// The session tape: everything the desk plays is kept (the last `minutes`),
// with a marker at every section, so you can go back, listen again, export a
// stretch as WAV, or jump the composer back to a section and remix from there.
// Tape time only runs while the music plays, so pauses leave no gaps.

export class Tape {
  constructor(engine, minutes = 10) {
    this.engine = engine;
    this.ctx = engine.ctx;
    this.rate = this.ctx.sampleRate;
    this.maxFrames = Math.floor(minutes * 60 * this.rate);
    this.chunks = []; // { frame, data: Int16Array (interleaved stereo), peak }
    this.total = 0; // frames written since the session started
    this.armed = false;
    this.markers = []; // { id, frame, time?, label, section, style, key, bpm, snapshot, kind }
    this.pending = [];
    this.nextId = 1;
    this.listeners = [];
  }

  async init() {
    const ctx = this.ctx;
    if (!ctx.audioWorklet) return false;
    await ctx.audioWorklet.addModule(new URL('./tape-worklet.js', import.meta.url));
    this.node = new AudioWorkletNode(ctx, 'tape-tap', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
    });
    const silent = ctx.createGain();
    silent.gain.value = 0;
    this.engine.master.connect(this.node);
    this.node.connect(silent).connect(ctx.destination);
    this.node.port.onmessage = (e) => this.write(e.data.l, e.data.r, e.data.end);
    return true;
  }

  get firstFrame() {
    return this.chunks.length ? this.chunks[0].frame : this.total;
  }

  get seconds() {
    return this.total / this.rate;
  }

  write(l, r, end) {
    if (!this.armed) return;
    const n = l.length;
    const start = end - n / this.rate;
    const data = new Int16Array(n * 2);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.max(-1, Math.min(1, l[i]));
      const b = Math.max(-1, Math.min(1, r[i]));
      data[i * 2] = a * 32767;
      data[i * 2 + 1] = b * 32767;
      peak = Math.max(peak, Math.abs(a), Math.abs(b));
    }
    // Markers were made ahead of time on the audio clock; place them now.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const m = this.pending[i];
      if (m.time <= end) {
        m.frame = this.total + Math.max(0, Math.round((m.time - start) * this.rate));
        delete m.time;
        this.markers.push(m);
        this.pending.splice(i, 1);
      }
    }
    this.markers.sort((a, b) => a.frame - b.frame);
    this.chunks.push({ frame: this.total, data, peak });
    this.total += n;
    while (this.chunks.length && this.total - this.chunks[0].frame > this.maxFrames) this.chunks.shift();
    const first = this.firstFrame;
    while (this.markers.length && this.markers[0].frame < first) this.markers.shift();
    for (const fn of this.listeners) fn();
  }

  // A marker at an audio-clock time (a section start, a bookmark).
  mark(time, fields) {
    const m = { id: this.nextId++, time, ...fields };
    if (this.armed) this.pending.push(m);
    return m;
  }

  bookmark(label = 'BOOKMARK') {
    const m = { id: this.nextId++, frame: this.total, kind: 'bookmark', label };
    this.markers.push(m);
    return m;
  }

  marker(id) {
    return this.markers.find((m) => m.id === Number(id));
  }

  // The section a frame falls in: [start marker, next section marker or the end).
  sectionAt(frame) {
    const secs = this.markers.filter((m) => m.kind === 'section');
    let i = secs.length - 1;
    while (i >= 0 && secs[i].frame > frame) i--;
    if (i < 0) return null;
    return { marker: secs[i], from: secs[i].frame, to: i + 1 < secs.length ? secs[i + 1].frame : this.total };
  }

  // Stereo AudioBuffer of [from, to) in tape frames.
  slice(from, to) {
    from = Math.max(this.firstFrame, Math.floor(from));
    to = Math.min(this.total, Math.floor(to));
    const n = Math.max(1, to - from);
    const buf = this.ctx.createBuffer(2, n, this.rate);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    for (const c of this.chunks) {
      const cn = c.data.length / 2;
      if (c.frame + cn <= from || c.frame >= to) continue;
      const a = Math.max(from, c.frame);
      const b = Math.min(to, c.frame + cn);
      for (let f = a; f < b; f++) {
        const k = (f - c.frame) * 2;
        L[f - from] = c.data[k] / 32768;
        R[f - from] = c.data[k + 1] / 32768;
      }
    }
    return buf;
  }

  // Peak per column for drawing, over [from, to).
  overview(from, to, columns) {
    const out = new Float32Array(columns);
    const span = (to - from) / columns;
    for (const c of this.chunks) {
      const cn = c.data.length / 2;
      const a = Math.floor((c.frame - from) / span);
      const b = Math.floor((c.frame + cn - from) / span);
      for (let i = Math.max(0, a); i <= Math.min(columns - 1, b); i++) out[i] = Math.max(out[i], c.peak);
    }
    return out;
  }

  clear() {
    this.chunks = [];
    this.markers = [];
    this.pending = [];
    this.total = 0;
  }
}

export function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
