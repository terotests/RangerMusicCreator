// SPDX-License-Identifier: MIT
// The Pop Machine stage, drawn on a canvas: the chord loop as a row of keys
// that light up in turn, the riff on a scrolling piano roll with what is done
// to it written underneath, a level meter for each part of the band, and the
// path from Baroque to modern pop along the bottom.

import { BaseStage } from '../jazz/stage.js';
import { POP_LEADS, POP_SECTION_OF } from './bands.js';

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

// Colours per machine: background top, bottom, accent, second accent.
const LOOKS = {
  baroque: [[40, 12, 18], [14, 6, 10], [232, 190, 110], [200, 90, 90]],
  moog: [[52, 26, 8], [18, 10, 4], [255, 160, 60], [250, 220, 120]],
  tv: [[18, 6, 8], [4, 2, 4], [255, 40, 40], [255, 140, 120]],
  anthem: [[30, 20, 60], [80, 30, 30], [255, 150, 60], [130, 200, 255]],
  euro: [[26, 8, 60], [6, 2, 20], [0, 230, 255], [255, 80, 220]],
  edm: [[6, 30, 40], [4, 8, 16], [80, 255, 200], [255, 90, 160]],
  subpulse: [[10, 4, 30], [2, 2, 8], [150, 90, 255], [255, 60, 140]],
  basshouse: [[30, 4, 10], [6, 2, 4], [255, 70, 50], [255, 200, 60]],
  nightdrive: [[4, 10, 24], [0, 2, 6], [60, 160, 255], [180, 120, 255]],
};
const MODERN = new Set(['subpulse', 'basshouse', 'nightdrive']);
const PATH = [['classical', '1680–1810'], ['baroque', '1966'], ['moog', '1972'], ['tv', '1982'], ['anthem', '1986'], ['euro', '1994'], ['edm', '2015'], ['modern', '2020s']];
const METERS = [['DRUMS', 'drums'], ['BASS', 'bass'], ['KEYS', 'keys'], ['PADS · HORNS', 'pads'], ['RIFF · THEME', 'lead']];

export class PopStage extends BaseStage {
  constructor(canvas) {
    super(canvas);
    this.info = null;
    this.style = 'moog';
  }

  setInfo(info, style) {
    this.info = info;
    if (style) this.style = style;
  }

  draw() {
    const g = this.g;
    const W = 1200;
    const H = 520;
    const t = this.now;
    const [top, bot, acc, acc2] = LOOKS[this.style] || LOOKS.moog;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rgba(top, 1));
    bg.addColorStop(1, rgba(bot, 1));
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const pulse = Math.max(0, 1 - this.beat * 3);
    const info = this.info;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';

    // The loop.
    g.font = '700 13px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
    g.fillStyle = rgba(acc, 0.8);
    const progTitle = info?.prog ? `THE LOOP · ${info.prog}` : info?.section === 'build' ? 'THE LOOP · BUILD-UP: IV–V / bVI–bVII' : 'THE LOOP';
    g.fillText(progTitle, 40, 34);
    const loop = info?.loop || [];
    const cells = loop.flatMap((bar, k) => bar.map((ch) => ({ ...ch, bar: k, w: 1 / bar.length })));
    if (cells.length) {
      const gap = 10;
      const total = W - 80;
      const unit = (total - gap * (loop.length - 1)) / loop.length;
      for (let k = 0; k < loop.length; k++) {
        const bar = cells.filter((c) => c.bar === k);
        const w = (unit - 4 * (bar.length - 1)) / bar.length;
        bar.forEach((c, j) => {
          const x = 40 + k * (unit + gap) + j * (w + 4);
          const on = k === info.loopBar;
          g.fillStyle = rgba(on ? acc : [255, 255, 255], on ? 0.22 + 0.15 * pulse : 0.05);
          g.fillRect(x, 48, w, 78);
          g.strokeStyle = rgba(acc, on ? 0.85 + 0.15 * pulse : 0.18);
          g.lineWidth = on ? 2.5 : 1;
          g.strokeRect(x + 0.5, 48.5, w - 1, 77);
          g.textAlign = 'center';
          g.fillStyle = rgba(on ? [255, 255, 255] : acc, on ? 1 : 0.55);
          g.font = `700 ${cells.length > 4 ? 24 : 34}px "Avenir Next", Futura, "Trebuchet MS", sans-serif`;
          g.fillText(c.roman, x + w / 2, 94);
          g.font = '600 13px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
          g.fillStyle = rgba(acc2, on ? 0.95 : 0.45);
          g.fillText(c.name, x + w / 2, 116);
        });
      }
      g.textAlign = 'left';
    }

    // The riff on a piano roll.
    const rollX = 40;
    const rollW = W - 80;
    const head = rollX + rollW * 0.78;
    const y0 = 150;
    const y1 = 360;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(rollX, y0, rollW, y1 - y0);
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 1;
    for (let m = 48; m <= 96; m += 12) {
      const y = y1 - ((m - 48) / 48) * (y1 - y0);
      g.beginPath();
      g.moveTo(rollX, y);
      g.lineTo(rollX + rollW, y);
      g.stroke();
    }
    const px = 170;
    const leads = this.pending.filter((n) => POP_LEADS.has(n.p) && n.m != null && n.end > t - 6 && n.t < t + 1.5);
    for (const n of leads) {
      const x = head + (n.t - t) * px;
      const w = Math.max(3, (n.end - n.t) * px - 2);
      if (x + w < rollX || x > rollX + rollW) continue;
      // The sub bass is drawn two octaves up so its line fits on the roll.
      const dm = n.p === 'sub' ? n.m + 24 : n.m;
      const y = y1 - ((Math.max(48, Math.min(96, dm)) - 48) / 48) * (y1 - y0);
      const playing = n.t <= t && n.end >= t;
      const col = n.p === 'brass' || n.p === 'str' || n.p === 'flute' || n.p === 'theme' || n.p === 'tpluck' ? acc2 : acc;
      g.fillStyle = rgba(col, playing ? 1 : 0.55);
      const xx = Math.max(rollX, x);
      g.fillRect(xx, y - 4, Math.min(w, rollX + rollW - xx), 8);
      if (playing) {
        g.fillStyle = rgba(col, 0.25);
        g.fillRect(xx - 3, y - 9, Math.min(w, rollX + rollW - xx) + 6, 18);
      }
    }
    g.strokeStyle = rgba(acc, 0.7);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(head, y0);
    g.lineTo(head, y1);
    g.stroke();
    g.font = '700 12px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
    g.fillStyle = rgba(acc, 0.7);
    if (info?.rollTitle) g.fillText(info.rollTitle, rollX + 10, y0 + 20);
    else g.fillText(info?.riffName ? `RIFF · ${info.riffName.toUpperCase()}${info.flipped ? ' · MODE FLIPPED' : ''}` : 'RIFF', rollX + 10, y0 + 20);

    // What is done to the riff.
    g.textAlign = 'center';
    g.font = '800 26px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
    g.shadowColor = rgba(acc, 0.9);
    g.shadowBlur = 14 + 10 * pulse;
    g.fillStyle = '#fff';
    g.fillText(info?.riff || (info?.section === 'end' ? 'FINAL CHORD' : 'PRESS PLAY'), W / 2, 402);
    g.shadowBlur = 0;

    // Meters.
    const mw = (W - 80 - 4 * 16) / 5;
    METERS.forEach(([label, sec], k) => {
      let a = 0;
      for (const p in this.act) if (POP_SECTION_OF[p] === sec) a = Math.max(a, this.act[p]);
      const x = 40 + k * (mw + 16);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(x, 424, mw, 10);
      g.fillStyle = rgba(k % 2 ? acc2 : acc, 0.85);
      g.fillRect(x, 424, mw * a, 10);
      g.font = '700 10px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
      g.textAlign = 'left';
      g.fillStyle = rgba(acc, 0.6);
      g.fillText(label, x, 448);
    });

    // The path from old to new.
    const pw = (W - 80) / (PATH.length - 1);
    g.strokeStyle = rgba(acc, 0.35);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(40, 482);
    g.lineTo(W - 40, 482);
    g.stroke();
    PATH.forEach(([id, year], k) => {
      const x = 40 + k * pw;
      const on = id === this.style || (id === 'modern' && MODERN.has(this.style)) || (id === 'classical' && info?.riffId && info.riffId !== 'motif');
      g.fillStyle = rgba(on ? acc : [255, 255, 255], on ? 1 : 0.3);
      g.beginPath();
      g.arc(x, 482, on ? 7 + 2 * pulse : 4, 0, Math.PI * 2);
      g.fill();
      g.font = '700 11px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
      g.textAlign = k === 0 ? 'left' : k === PATH.length - 1 ? 'right' : 'center';
      g.fillStyle = rgba(on ? acc : [255, 255, 255], on ? 0.95 : 0.4);
      g.fillText(year, x, 506);
    });
    g.textAlign = 'left';
    g.fillStyle = 'rgba(0,0,0,0.1)';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    void t;
  }
}
