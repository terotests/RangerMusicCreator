// SPDX-License-Identifier: MIT
// Turns the composer's bars into sound: a look-ahead scheduler on the audio
// clock, swing and humanising, side-chain ducking, and the style's effects.

import { LAYERS, STYLES } from './styles.js';
import { kick, snare, hat, tom, crash, riser, playNote } from './instruments.js';
import { AmbientLayer } from './ambient.js';

const PAN = { kick: 0, snare: 0.04, hats: 0.22, bass: 0, keys: -0.18, pad: 0, lead: 0.08, arp: 0.28, amb: 0 };
const DUCKED = ['bass', 'keys', 'pad', 'lead', 'arp'];

export class Player {
  constructor(engine, composer) {
    this.engine = engine;
    this.ctx = engine.ctx;
    this.composer = composer;
    this.channels = {};
    for (const name of [...LAYERS, 'amb']) {
      const ch = engine.channel(name);
      ch.pan.pan.value = PAN[name];
      this.channels[name] = ch;
    }
    this.ambient = new AmbientLayer(engine, this.channels.amb.input);
    this.playing = false;
    this.bar = null;
    this.step = 0;
    this.queue = []; // bar infos waiting for their audio time, for the display
    this.listeners = {};
    this.journey = false;
    this.journeyCount = 0;
    this.styleId = null;
    this.bpm = null;
  }

  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
  }

  emit(evt, data) {
    for (const fn of this.listeners[evt] || []) fn(data);
  }

  async start() {
    await this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.nextTime = this.ctx.currentTime + 0.12;
    this.step = 0;
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
  }

  get stepDur() {
    return 60 / this.composer.bpm / 4;
  }

  tick() {
    const ahead = this.ctx.currentTime + 0.18;
    if (this.playing) {
      // If the tab slept, skip ahead instead of firing a burst of late notes.
      if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
      while (this.nextTime < ahead) {
        const i = this.step % 16;
        if (i === 0) this.startBar(this.nextTime);
        this.scheduleStep(i, this.nextTime);
        this.nextTime += this.stepDur;
        this.step++;
      }
    }
    this.ambient.tick(ahead);
  }

  startBar(t) {
    const c = this.composer;
    if (this.journey && c.barInSection >= (c.section?.bars ?? 0) && !c.freeze && !c.pendingStyle) {
      // At a section boundary, sometimes travel to another style.
      if (++this.journeyCount >= 3 + Math.floor(Math.random() * 3)) {
        this.journeyCount = 0;
        const others = STYLES.filter((s) => s.id !== c.style.id);
        c.setStyle(others[Math.floor(Math.random() * others.length)].id);
      }
    }
    this.bar = c.nextBar();
    const info = this.bar.info;
    if (info.style !== this.styleId) {
      this.styleId = info.style;
      this.applyStyleFx(c.style);
      this.emit('style', c.style);
    }
    if (info.bpm !== this.bpm) {
      this.bpm = info.bpm;
      this.engine.setEchoTime((60 / info.bpm) * c.style.fx.delay);
    }
    this.queue.push({ time: t, info, events: this.bar.events, stepDur: this.stepDur });
    this.emit('plan', { time: t, info });
  }

  applyStyleFx(style) {
    const e = this.engine;
    e.setReverbSize(style.fx.verb);
    e.setEchoFeedback(style.fx.feedback);
    e.setTone(style.fx.lowpass);
    if (this.autoTape !== false) e.setTape(style.fx.tape);
  }

  scheduleStep(i, t) {
    const bar = this.bar;
    if (!bar) return;
    const sd = this.stepDur;
    let tt = t;
    if (i % 2 === 1) tt += bar.info.swing * sd;
    for (const e of bar.events) {
      if (e.step !== i) continue;
      // Tiny timing drift so it breathes like a player, not a grid.
      const human = e.fx || e.ch === 'kick' ? 0 : (Math.random() - 0.5) * 0.008;
      this.play(e, tt + human, sd);
    }
  }

  play(e, t, sd) {
    const ctx = this.ctx;
    const style = this.composer.style;
    const kit = style.kit;
    const beat = sd * 4;
    if (e.fx) {
      if (e.fx === 'throw') this.channels[e.ch].throwEcho(t, e.beats * beat * 0.5);
      else if (e.fx === 'spin') this.engine.echoSpin(t, e.beats * beat);
      else if (e.fx === 'sweepUp') this.engine.sweep(t, e.bars * 16 * sd, 'highpass');
      else if (e.fx === 'sweepDown') this.engine.sweep(t, e.bars * 16 * sd, 'lowpass');
      else if (e.fx === 'riser') riser(ctx, this.channels.snare.input, t, e.bars * 16 * sd);
      return;
    }
    const ch = this.channels[e.ch];
    const out = ch.input;
    switch (e.ch) {
      case 'kick':
        kick(ctx, out, t, e.vel, kit.kick);
        if (style.fx.duck) for (const d of DUCKED) this.channels[d].duckAt(t, style.fx.duck, beat * 0.22);
        break;
      case 'snare':
        if (e.tom) tom(ctx, out, t, e.vel, e.tom);
        else snare(ctx, out, t, e.vel, kit.snare);
        break;
      case 'hats':
        if (e.crash) crash(ctx, out, t, e.vel);
        else hat(ctx, out, t, e.vel, kit.hats, e.open);
        break;
      case 'bass':
        playNote(ctx, out, t, e.midi, e.len * sd * 0.95, e.vel, style.bass.voice);
        break;
      case 'keys': {
        const strum = style.keys.voice === 'epiano' || style.keys.voice === 'pizz' ? 0.012 : 0;
        e.midis.forEach((m, k) => playNote(ctx, out, t + k * strum, m, e.len * sd * 0.92, e.vel * 0.9, style.keys.voice));
        break;
      }
      case 'pad':
        e.midis.forEach((m) => playNote(ctx, out, t, m, e.len * sd, e.vel, style.pad.voice));
        break;
      case 'lead':
        playNote(ctx, out, t, e.midi, e.len * sd * 0.9, e.vel, style.lead.voice, { glideFrom: e.glideFrom });
        break;
      case 'arp':
        playNote(ctx, out, t, e.midi, e.len * sd, e.vel, style.arp.voice);
        break;
    }
  }

  // Bar info whose audio time has arrived (for the screen).
  current() {
    const now = this.ctx.currentTime;
    while (this.queue.length > 1 && this.queue[1].time <= now) this.queue.shift();
    return this.queue[0] && this.queue[0].time <= now + 0.05 ? this.queue[0] : null;
  }
}
