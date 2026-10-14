// SPDX-License-Identifier: MIT
// Draws the session tape and lets you pick a stretch of it: drag to select,
// click a section (the coloured band) to select all of it.

import { fmtTime } from './tape.js';

const SECTION_COLOR = { intro: '#7aa7ff', verse: '#5ee08a', build: '#ffc04d', drop: '#ff5470', break: '#9b8cff', bridge: '#4dd6e0' };
const BAND = 24;

export class TapeView {
  constructor(canvas, tape, onSelect) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.tape = tape;
    this.onSelect = onSelect;
    this.sel = null; // { from, to } in frames
    this.head = null; // frame being previewed
    this.from = 0;
    this.to = 1;
    this.w = canvas.width;
    this.h = canvas.height;
    let down = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      const p = this.pos(e);
      down = { x: p.x, y: p.y, f: this.frameAt(p.x) };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!down || !canvas.hasPointerCapture(e.pointerId)) return;
      const p = this.pos(e);
      if (Math.abs(p.x - down.x) < 4) return;
      const f = this.frameAt(p.x);
      this.select(Math.min(down.f, f), Math.max(down.f, f));
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return;
      const p = this.pos(e);
      if (Math.abs(p.x - down.x) < 4) {
        const s = this.tape.sectionAt(down.f);
        if (s) this.select(s.from, s.to, s.marker);
        else this.select(null);
      }
      down = null;
    });
  }

  pos(e) {
    const r = this.c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.w, y: ((e.clientY - r.top) / r.height) * this.h };
  }

  frameAt(x) {
    return this.from + (x / this.w) * (this.to - this.from);
  }

  xOf(frame) {
    return ((frame - this.from) / (this.to - this.from)) * this.w;
  }

  select(from, to, marker) {
    this.sel = from == null ? null : { from: Math.max(this.tape.firstFrame, from), to: Math.min(this.tape.total, to), marker };
    this.onSelect(this.sel);
  }

  draw() {
    const g = this.g;
    const t = this.tape;
    const rate = t.rate;
    const w = this.w;
    const h = this.h;
    this.from = t.firstFrame;
    this.to = Math.max(t.total, this.from + 60 * rate);
    g.fillStyle = '#070809';
    g.fillRect(0, 0, w, h);
    // Waveform
    const cols = Math.floor(w / 2);
    const peaks = t.overview(this.from, this.to, cols);
    const mid = BAND + (h - BAND) / 2;
    for (let i = 0; i < cols; i++) {
      const x = i * 2;
      const f = this.from + (i / cols) * (this.to - this.from);
      const inSel = this.sel && f >= this.sel.from && f <= this.sel.to;
      const a = peaks[i] * ((h - BAND) / 2 - 4);
      g.fillStyle = inSel ? '#cfe6ff' : '#5d6470';
      g.fillRect(x, mid - a, 1.5, a * 2 || 1);
    }
    // Sections
    const secs = t.markers.filter((m) => m.kind === 'section');
    g.font = '600 12px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.textBaseline = 'middle';
    secs.forEach((m, i) => {
      const x0 = this.xOf(m.frame);
      const x1 = this.xOf(i + 1 < secs.length ? secs[i + 1].frame : t.total);
      g.fillStyle = SECTION_COLOR[m.section] || '#888';
      g.globalAlpha = this.sel && this.sel.marker === m ? 1 : 0.7;
      g.fillRect(x0 + 1, 2, Math.max(1, x1 - x0 - 2), BAND - 4);
      g.globalAlpha = 1;
      if (x1 - x0 > 30) {
        g.save();
        g.beginPath();
        g.rect(x0 + 1, 0, x1 - x0 - 3, BAND);
        g.clip();
        g.fillStyle = '#000';
        g.fillText(`${m.section.toUpperCase()} · ${m.style}`, x0 + 5, BAND / 2);
        g.restore();
      }
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x0, BAND, 1, h - BAND);
    });
    // Bookmarks
    for (const m of t.markers) {
      if (m.kind !== 'bookmark') continue;
      const x = this.xOf(m.frame);
      g.fillStyle = '#ffb83d';
      g.fillRect(x, BAND, 2, h - BAND);
      g.beginPath();
      g.moveTo(x - 6, BAND);
      g.lineTo(x + 8, BAND);
      g.lineTo(x + 1, BAND + 9);
      g.fill();
    }
    // Selection
    if (this.sel) {
      const x0 = this.xOf(this.sel.from);
      const x1 = this.xOf(this.sel.to);
      g.fillStyle = 'rgba(74,168,255,0.18)';
      g.fillRect(x0, BAND, x1 - x0, h - BAND);
      g.fillStyle = '#4aa8ff';
      g.fillRect(x0, BAND, 2, h - BAND);
      g.fillRect(x1 - 2, BAND, 2, h - BAND);
    }
    // Time ticks
    g.fillStyle = '#7d8798';
    g.font = '500 11px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    const secsSpan = (this.to - this.from) / rate;
    const step = secsSpan > 400 ? 60 : secsSpan > 150 ? 30 : 10;
    for (let s = Math.ceil(this.from / rate / step) * step; s * rate < this.to; s += step) {
      const x = this.xOf(s * rate);
      g.fillRect(x, h - 6, 1, 6);
      g.fillText(fmtTime(s), x + 3, h - 9);
    }
    // Now, and the preview head
    if (t.total > this.from) {
      g.fillStyle = '#3ee06e';
      g.fillRect(this.xOf(t.total) - 1, BAND, 2, h - BAND);
    }
    if (this.head != null) {
      g.fillStyle = '#fff';
      g.fillRect(this.xOf(this.head) - 1, 0, 2, h);
    }
    if (!t.total) {
      g.fillStyle = '#7d8798';
      g.font = '600 15px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText('Everything you play is kept here (the last 10 minutes). Press PLAY.', w / 2, mid);
      g.textAlign = 'left';
    }
  }
}
