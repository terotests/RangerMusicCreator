// SPDX-License-Identifier: MIT
// Records the master output and saves it as a 16-bit WAV, ready for a game.

export class Recorder {
  constructor(engine) {
    this.engine = engine;
    this.rec = null;
  }

  get recording() {
    return !!this.rec;
  }

  start() {
    const stream = this.engine.recordDest.stream;
    const types = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    this.chunks = [];
    this.rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 256000 } : undefined);
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.started = performance.now();
  }

  // Resolves to { blob, ext } once the recording is converted.
  stop() {
    const rec = this.rec;
    this.rec = null;
    return new Promise((resolve) => {
      rec.onstop = async () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType });
        try {
          const buf = await this.engine.ctx.decodeAudioData(await blob.arrayBuffer());
          resolve({ blob: encodeWav(buf), ext: 'wav' });
        } catch {
          resolve({ blob, ext: rec.mimeType.includes('ogg') ? 'ogg' : 'webm' });
        }
      };
      rec.stop();
    });
  }
}

export function encodeWav(buf) {
  const ch = buf.numberOfChannels;
  const len = buf.length;
  const rate = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  data.setUint32(4, 36 + len * ch * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, ch, true);
  data.setUint32(24, rate, true);
  data.setUint32(28, rate * ch * 2, true);
  data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true);
  str(36, 'data');
  data.setUint32(40, len * ch * 2, true);
  const chans = [];
  for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([data], { type: 'audio/wav' });
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
