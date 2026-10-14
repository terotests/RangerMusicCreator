// SPDX-License-Identifier: MIT
// Taps the master output for the session tape: hands blocks of stereo samples
// to the main thread together with the audio-clock time they end at.

const BLOCK = 4096;

class TapeTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.fresh();
  }
  fresh() {
    this.l = new Float32Array(BLOCK);
    this.r = new Float32Array(BLOCK);
    this.n = 0;
  }
  process(inputs) {
    const inp = inputs[0];
    if (inp && inp.length) {
      const l = inp[0];
      const r = inp[1] || inp[0];
      this.l.set(l, this.n);
      this.r.set(r, this.n);
      this.n += l.length;
      if (this.n >= BLOCK) {
        const end = currentTime + l.length / sampleRate;
        this.port.postMessage({ l: this.l, r: this.r, end }, [this.l.buffer, this.r.buffer]);
        this.fresh();
      }
    }
    return true;
  }
}

registerProcessor('tape-tap', TapeTap);
