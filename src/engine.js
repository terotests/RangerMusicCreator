// SPDX-License-Identifier: MIT
// The mixing desk in Web Audio: channel strips, echo and reverb sends, and a
// master bus with glue compression, soft saturation, tape wobble and a limiter.

import { driveCurve } from './instruments.js';

// Fader position (0..1) to gain. 0.75 is unity, the top is +6 dB.
export function faderGain(pos) {
  if (pos <= 0.001) return 0;
  const db = (pos - 0.75) * 48;
  return Math.pow(10, db / 20);
}

export class Channel {
  constructor(engine, name) {
    const ctx = engine.ctx;
    this.name = name;
    this.input = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.filter.Q.value = 0.5;
    this.duck = ctx.createGain();
    this.pan = ctx.createStereoPanner();
    this.fader = ctx.createGain();
    this.mute = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.verbSend = ctx.createGain();
    this.echoSend = ctx.createGain();
    this.input.connect(this.filter).connect(this.duck).connect(this.pan).connect(this.fader).connect(this.mute);
    this.mute.connect(engine.mixBus);
    this.mute.connect(this.analyser);
    this.mute.connect(this.verbSend).connect(engine.verbIn);
    this.mute.connect(this.echoSend).connect(engine.echoIn);
    this.ctx = ctx;
    this.level = 0.75;
    this.send = 0;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.setLevel(0.75);
    this.setSend(0);
  }
  setLevel(pos) {
    this.level = pos;
    this.fader.gain.setTargetAtTime(faderGain(pos), this.ctx.currentTime, 0.02);
  }
  setSend(v) {
    this.send = v;
    this.verbSend.gain.setTargetAtTime(v * 0.7, this.ctx.currentTime, 0.03);
    this.echoSend.gain.setTargetAtTime(v * 0.55, this.ctx.currentTime, 0.03);
  }
  setAudible(on) {
    this.mute.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.015);
  }
  duckAt(t, amount, release = 0.12) {
    if (amount <= 0) return;
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(this.duck.gain.value, t);
    this.duck.gain.linearRampToValueAtTime(1 - amount, t + 0.006);
    this.duck.gain.setTargetAtTime(1, t + 0.03, release);
  }
  throwEcho(t, dur) {
    const g = this.echoSend.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(this.send * 0.55, t);
    g.linearRampToValueAtTime(0.95, t + 0.01);
    g.setValueAtTime(0.95, t + dur);
    g.linearRampToValueAtTime(this.send * 0.55, t + dur + 0.05);
  }
  meter() {
    this.analyser.getFloatTimeDomainData(this.buf);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) {
      const v = Math.abs(this.buf[i]);
      if (v > peak) peak = v;
      sum += v * v;
    }
    return { peak, rms: Math.sqrt(sum / this.buf.length) };
  }
}

export class Engine {
  constructor() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
    this.ctx = ctx;
    this.channels = {};

    this.mixBus = ctx.createGain();
    // Master: sweep filters -> tape wobble -> glue -> saturation -> limiter -> fade -> out
    this.masterLP = ctx.createBiquadFilter();
    this.masterLP.type = 'lowpass';
    this.masterLP.frequency.value = 20000;
    this.masterLP.Q.value = 0.9;
    this.masterHP = ctx.createBiquadFilter();
    this.masterHP.type = 'highpass';
    this.masterHP.frequency.value = 20;
    this.masterHP.Q.value = 0.9;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 18000;
    this.tone.Q.value = 0.4;

    this.wow = ctx.createDelay(0.05);
    this.wow.delayTime.value = 0.008;
    this.wowLfo = ctx.createOscillator();
    this.wowLfo.frequency.value = 0.55;
    this.wowDepth = ctx.createGain();
    this.wowDepth.gain.value = 0;
    this.wowLfo.connect(this.wowDepth).connect(this.wow.delayTime);
    this.flutter = ctx.createOscillator();
    this.flutter.frequency.value = 7.3;
    this.flutterDepth = ctx.createGain();
    this.flutterDepth.gain.value = 0;
    this.flutter.connect(this.flutterDepth).connect(this.wow.delayTime);
    this.wowLfo.start();
    this.flutter.start();

    this.glue = ctx.createDynamicsCompressor();
    this.glue.threshold.value = -12;
    this.glue.ratio.value = 2;
    this.glue.knee.value = 8;
    this.glue.attack.value = 0.015;
    this.glue.release.value = 0.25;
    this.satIn = ctx.createGain();
    this.satIn.gain.value = 0.9;
    this.sat = ctx.createWaveShaper();
    this.sat.curve = driveCurve(ctx, 0.08);
    this.sat.oversample = '2x';
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.fade = ctx.createGain();
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this.splitter = ctx.createChannelSplitter(2);
    this.meterL = ctx.createAnalyser();
    this.meterR = ctx.createAnalyser();
    this.meterL.fftSize = this.meterR.fftSize = 512;
    this.recordDest = ctx.createMediaStreamDestination();

    this.mixBus
      .connect(this.masterLP)
      .connect(this.masterHP)
      .connect(this.tone)
      .connect(this.wow)
      .connect(this.glue)
      .connect(this.satIn)
      .connect(this.sat)
      .connect(this.limiter)
      .connect(this.fade)
      .connect(this.master);
    this.master.connect(ctx.destination);
    this.master.connect(this.analyser);
    this.master.connect(this.recordDest);
    this.master.connect(this.splitter);
    this.splitter.connect(this.meterL, 0);
    this.splitter.connect(this.meterR, 1);

    // Reverb send
    this.verbIn = ctx.createGain();
    this.verbHP = ctx.createBiquadFilter();
    this.verbHP.type = 'highpass';
    this.verbHP.frequency.value = 220;
    this.verbPre = ctx.createDelay(0.2);
    this.verbPre.delayTime.value = 0.025;
    this.convolver = ctx.createConvolver();
    this.verbDamp = ctx.createBiquadFilter();
    this.verbDamp.type = 'lowpass';
    this.verbDamp.frequency.value = 6500;
    this.verbReturn = ctx.createGain();
    this.verbReturn.gain.value = 0.8;
    this.verbIn.connect(this.verbHP).connect(this.verbPre).connect(this.convolver).connect(this.verbDamp).connect(this.verbReturn).connect(this.mixBus);
    this.setReverbSize(2.5);

    // Ping-pong echo send with a filtered feedback loop (the dub part).
    this.echoIn = ctx.createGain();
    this.echoL = ctx.createDelay(4);
    this.echoR = ctx.createDelay(4);
    this.echoHP = ctx.createBiquadFilter();
    this.echoHP.type = 'highpass';
    this.echoHP.frequency.value = 280;
    this.echoLP = ctx.createBiquadFilter();
    this.echoLP.type = 'lowpass';
    this.echoLP.frequency.value = 3200;
    this.echoFb = ctx.createGain();
    this.echoFb.gain.value = 0.4;
    this.echoSat = ctx.createWaveShaper();
    this.echoSat.curve = driveCurve(ctx, 0.2);
    this.echoMerge = ctx.createChannelMerger(2);
    this.echoReturn = ctx.createGain();
    this.echoReturn.gain.value = 0.7;
    this.echoIn.connect(this.echoHP).connect(this.echoLP).connect(this.echoL);
    this.echoL.connect(this.echoR);
    this.echoR.connect(this.echoSat).connect(this.echoFb).connect(this.echoHP);
    this.echoL.connect(this.echoMerge, 0, 0);
    this.echoR.connect(this.echoMerge, 0, 1);
    this.echoMerge.connect(this.echoReturn).connect(this.mixBus);
    this.echoReturn.connect(this.verbIn);

    this.mL = new Float32Array(512);
    this.mR = new Float32Array(512);
  }

  channel(name) {
    if (!this.channels[name]) this.channels[name] = new Channel(this, name);
    return this.channels[name];
  }

  get now() {
    return this.ctx.currentTime;
  }

  setReverbSize(seconds) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const x = i / len;
        // Exponential tail, darker as it decays.
        const env = Math.pow(1 - x, 2.2) * Math.exp(-x * 2.5);
        const k = 0.25 + 0.7 * (1 - x);
        lp = lp + k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * env;
      }
      // A few early reflections.
      for (let e = 0; e < 8; e++) {
        const at = Math.floor(rate * (0.008 + Math.random() * 0.06));
        if (at < len) d[at] += (Math.random() - 0.5) * 0.6;
      }
    }
    this.convolver.buffer = buf;
    this.reverbSize = seconds;
  }

  setEchoTime(seconds) {
    const t = this.ctx.currentTime;
    this.echoL.delayTime.setTargetAtTime(Math.min(3.9, seconds), t, 0.05);
    this.echoR.delayTime.setTargetAtTime(Math.min(3.9, seconds), t, 0.05);
  }

  setEchoFeedback(v) {
    this.echoFb.gain.setTargetAtTime(Math.min(0.85, v), this.ctx.currentTime, 0.05);
    this.feedback = v;
  }

  // A short burst of runaway feedback, the classic dub throw.
  echoSpin(t, dur) {
    const g = this.echoFb.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(this.feedback ?? 0.4, t);
    g.linearRampToValueAtTime(0.82, t + 0.05);
    g.setValueAtTime(0.82, t + dur);
    g.linearRampToValueAtTime(this.feedback ?? 0.4, t + dur + 0.4);
  }

  setTape(on) {
    const t = this.ctx.currentTime;
    this.wowDepth.gain.setTargetAtTime(on ? 0.0011 : 0, t, 0.3);
    this.flutterDepth.gain.setTargetAtTime(on ? 0.00012 : 0, t, 0.3);
    this.tape = on;
  }

  setTone(freq) {
    this.tone.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.4);
  }

  // Filter sweep on the master: 'down' closes the low-pass, 'up' opens a high-pass build.
  sweep(t, dur, kind) {
    if (kind === 'lowpass') {
      const f = this.masterLP.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(20000, t);
      f.exponentialRampToValueAtTime(450, t + dur * 0.6);
      f.exponentialRampToValueAtTime(20000, t + dur);
    } else {
      const f = this.masterHP.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(20, t);
      f.exponentialRampToValueAtTime(900, t + dur);
      f.setValueAtTime(20, t + dur + 0.01);
    }
  }

  fadeTo(v, seconds = 2) {
    const t = this.ctx.currentTime;
    this.fade.gain.cancelScheduledValues(t);
    this.fade.gain.setValueAtTime(this.fade.gain.value, t);
    this.fade.gain.linearRampToValueAtTime(v, t + seconds);
  }

  masterMeter() {
    this.meterL.getFloatTimeDomainData(this.mL);
    this.meterR.getFloatTimeDomainData(this.mR);
    let l = 0;
    let r = 0;
    for (let i = 0; i < 512; i++) {
      l = Math.max(l, Math.abs(this.mL[i]));
      r = Math.max(r, Math.abs(this.mR[i]));
    }
    return [l, r];
  }
}
