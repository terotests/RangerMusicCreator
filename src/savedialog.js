// SPDX-License-Identifier: MIT
// The SAVE WAV window: shows the stretch that will be saved, lets you move its
// start and end (snapped to bars), play it back, and then save it.
import { fmtTime } from './tape.js';
import { SECTION_COLOR } from './tapeview.js';

const OVER = 30; // height of the whole-tape strip at the top of the canvas

export class SaveDialog {
  // opts: { tape, bars() -> [frame], listen(range, loop), stop(), preview() -> {from,to,start,loop}|null,
  //         now() -> audio clock seconds, save(range, name), name(range) }
  constructor(root, opts) {
    this.root = root;
    this.o = opts;
    this.tape = opts.tape;
    this.range = null;
    this.snap = true;
    this.loop = true;
    root.innerHTML = `
      <div class="save-card" role="dialog" aria-label="Save a stretch of the tape">
        <button class="help-close" data-act="cancel" aria-label="Close">×</button>
        <h2>SAVE WAV</h2>
        <p class="save-hint">Drag the edges to set the start and end, drag the middle to move it, or drag across the waveform to pick a new stretch. The strip at the top is the whole tape: click it to jump there.</p>
        <div class="save-presets">
          <button data-act="sel">SELECTION</button><button data-act="sec">SECTION</button><button data-act="last30">LAST 30 S</button><button data-act="last120">LAST 2 MIN</button><button data-act="all">WHOLE TAPE</button>
        </div>
        <canvas class="save-wave" width="1800" height="300"></canvas>
        <div class="save-row">
          <span class="save-edge">START <button data-act="s-">◀</button><b data-out="from"></b><button data-act="s+">▶</button></span>
          <span class="save-len" data-out="len"></span>
          <span class="save-edge">END <button data-act="e-">◀</button><b data-out="to"></b><button data-act="e+">▶</button></span>
        </div>
        <div class="save-row">
          <button class="save-play" data-act="play">▶ PLAY</button>
          <label><input type="checkbox" data-opt="loop" checked> loop</label>
          <label><input type="checkbox" data-opt="snap" checked> snap to bars</label>
          <span class="save-grow"></span>
          <input class="save-name" data-out="name" spellcheck="false" aria-label="File name">
          <button class="save-go" data-act="save">SAVE WAV</button>
          <button data-act="cancel">CANCEL</button>
        </div>
      </div>`;
    this.canvas = root.querySelector('canvas');
    this.g = this.canvas.getContext('2d');
    this.nameEl = root.querySelector('[data-out=name]');
    this.nameTouched = false;
    this.nameEl.addEventListener('input', () => (this.nameTouched = true));
    root.addEventListener('click', (e) => {
      if (e.target === root) return this.close();
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act) this.act(act);
    });
    root.addEventListener('change', (e) => {
      const opt = e.target.dataset.opt;
      if (opt) this[opt] = e.target.checked;
      if (opt === 'loop' && this.o.preview()) this.play(true);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      else if (e.key === ' ' && !e.target.closest('input')) {
        e.preventDefault();
        this.act('play');
      }
      e.stopPropagation();
    });
    this.bindPointer();
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(range) {
    if (!this.tape.total) return false;
    this.selection = range;
    this.nameTouched = false;
    this.root.hidden = false;
    this.setRange(range && range.to > range.from ? range : this.preset('last30'), false);
    this.fitView();
    this.root.querySelector('.save-play').focus();
    this.loopFrame();
    return true;
  }

  close() {
    this.o.stop();
    this.root.hidden = true;
  }

  // ---- range ------------------------------------------------------------------

  preset(kind) {
    const t = this.tape;
    const r = t.rate;
    if (kind === 'sel' && this.selection) return this.selection;
    if (kind === 'sec') {
      const at = this.range ? this.range.from + 1 : t.total - 1;
      const s = t.sectionAt(at);
      if (s) return { from: s.from, to: s.to };
    }
    if (kind === 'all') return { from: t.firstFrame, to: t.total };
    const secs = kind === 'last120' ? 120 : 30;
    return { from: Math.max(t.firstFrame, t.total - secs * r), to: t.total };
  }

  snapFrame(f) {
    if (!this.snap) return f;
    const bars = this.o.bars();
    let best = f;
    let d = Infinity;
    for (const b of bars) {
      const x = Math.abs(b - f);
      if (x < d) [best, d] = [b, x];
    }
    // Only snap when a bar line is near (half a second), so the edges never jump far.
    return d < this.tape.rate * 0.5 ? best : f;
  }

  setRange(r, snap = true) {
    const t = this.tape;
    let from = Math.max(t.firstFrame, Math.min(r.from, r.to));
    let to = Math.min(t.total, Math.max(r.from, r.to));
    if (snap) {
      from = this.snapFrame(from);
      to = this.snapFrame(to);
    }
    if (to - from < t.rate * 0.25) to = Math.min(t.total, from + t.rate * 0.25);
    this.range = { from, to };
    if (!this.nameTouched) this.nameEl.value = this.o.name(this.range);
    const out = (k, v) => (this.root.querySelector(`[data-out=${k}]`).textContent = v);
    const sec = (f) => (f / t.rate).toFixed(1);
    out('from', fmtTime(from / t.rate) + '.' + sec(from).split('.')[1]);
    out('to', fmtTime(to / t.rate) + '.' + sec(to).split('.')[1]);
    const nBars = this.o.bars().filter((b) => b >= from - 100 && b < to - 100).length;
    out('len', `${((to - from) / t.rate).toFixed(1)} s${nBars ? ` · about ${nBars} bar${nBars > 1 ? 's' : ''}` : ''}`);
    // While dragging, playback restarts once on release instead of on every move.
    if (this.o.preview() && !this.dragging) this.play(true);
  }

  // Bar length near a frame, from the bar log (or 2 s when unknown).
  barNear(f) {
    const bars = this.o.bars();
    for (let i = 1; i < bars.length; i++) if (bars[i] >= f) return bars[i] - bars[i - 1];
    return this.tape.rate * 2;
  }

  act(a) {
    const r = this.range;
    if (a === 'cancel') return this.close();
    if (a === 'save') {
      this.o.stop();
      this.o.save(r, (this.nameEl.value || this.o.name(r)).replace(/[\\/:*?"<>|]+/g, '-').replace(/(\.wav)?$/i, '.wav'));
      return this.close();
    }
    if (a === 'play') return this.o.preview() ? this.stopPlay() : this.play();
    if (['sel', 'sec', 'last30', 'last120', 'all'].includes(a)) {
      this.setRange(this.preset(a), false);
      return this.fitView();
    }
    const step = this.snap ? this.barNear(a[0] === 's' ? r.from : r.to) : this.tape.rate;
    const d = a[1] === '+' ? step : -step;
    if (a[0] === 's') this.setRange({ from: Math.min(r.from + d, r.to - step / 2), to: r.to }, false);
    else this.setRange({ from: r.from, to: Math.max(r.to + d, r.from + step / 2) }, false);
    this.keepInView();
  }

  play(restart) {
    if (restart && !this.o.preview()) return;
    this.o.listen(this.range, this.loop);
    this.root.querySelector('.save-play').textContent = '■ STOP';
  }

  stopPlay() {
    this.o.stop();
    this.root.querySelector('.save-play').textContent = '▶ PLAY';
  }

  // ---- view -------------------------------------------------------------------

  // The zoomed view shows the range with some tape on both sides.
  fitView() {
    const t = this.tape;
    const len = this.range.to - this.range.from;
    const pad = Math.max(len * 0.25, t.rate * 4);
    this.vFrom = Math.max(t.firstFrame, this.range.from - pad);
    this.vTo = Math.min(t.total, this.range.to + pad);
    if (this.vTo - this.vFrom < t.rate * 10) this.vTo = Math.min(t.total, this.vFrom + t.rate * 10);
  }

  keepInView() {
    if (this.range.from < this.vFrom || this.range.to > this.vTo) this.fitView();
  }

  xOf(f) {
    return ((f - this.vFrom) / (this.vTo - this.vFrom)) * this.canvas.width;
  }

  fOf(x) {
    return this.vFrom + (x / this.canvas.width) * (this.vTo - this.vFrom);
  }

  bindPointer() {
    const c = this.canvas;
    let drag = null;
    const pos = (e) => {
      const b = c.getBoundingClientRect();
      return { x: ((e.clientX - b.left) / b.width) * c.width, y: ((e.clientY - b.top) / b.height) * c.height };
    };
    c.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      c.setPointerCapture(e.pointerId);
      const t = this.tape;
      if (p.y < OVER) {
        // Whole-tape strip: move the range (same length) to where you clicked.
        const f = t.firstFrame + (p.x / c.width) * (t.total - t.firstFrame);
        const len = this.range.to - this.range.from;
        const from = Math.max(t.firstFrame, Math.min(t.total - len, f - len / 2));
        this.setRange({ from, to: from + len });
        this.fitView();
        return;
      }
      const x0 = this.xOf(this.range.from);
      const x1 = this.xOf(this.range.to);
      const grab = 18;
      if (Math.abs(p.x - x0) < grab) drag = { kind: 'from' };
      else if (Math.abs(p.x - x1) < grab) drag = { kind: 'to' };
      else if (p.x > x0 && p.x < x1) drag = { kind: 'move', at: this.fOf(p.x), r: { ...this.range } };
      else drag = { kind: 'new', at: this.fOf(p.x) };
      this.dragging = true;
    });
    c.addEventListener('pointermove', (e) => {
      const p = pos(e);
      c.style.cursor = p.y < OVER ? 'pointer' : [this.xOf(this.range.from), this.xOf(this.range.to)].some((x) => Math.abs(p.x - x) < 18) ? 'ew-resize' : 'crosshair';
      if (!drag) return;
      const f = this.fOf(p.x);
      const r = this.range;
      if (drag.kind === 'from') this.setRange({ from: Math.min(f, r.to - this.tape.rate * 0.25), to: r.to });
      else if (drag.kind === 'to') this.setRange({ from: r.from, to: Math.max(f, r.from + this.tape.rate * 0.25) });
      else if (drag.kind === 'move') {
        const t = this.tape;
        const len = drag.r.to - drag.r.from;
        const from = Math.max(t.firstFrame, Math.min(t.total - len, drag.r.from + f - drag.at));
        const s = this.snapFrame(from);
        this.setRange({ from: s, to: s + len }, false);
      } else if (Math.abs(f - drag.at) > this.tape.rate * 0.1) this.setRange({ from: drag.at, to: f });
    });
    const end = () => {
      drag = null;
      if (!this.dragging) return;
      this.dragging = false;
      if (this.o.preview()) this.play(true);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  loopFrame() {
    if (!this.isOpen) return;
    this.draw();
    requestAnimationFrame(() => this.loopFrame());
  }

  draw() {
    const g = this.g;
    const t = this.tape;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const r = this.range;
    g.fillStyle = '#070809';
    g.fillRect(0, 0, W, H);
    // Whole tape strip with the zoom window and the range.
    const all = (f) => ((f - t.firstFrame) / Math.max(1, t.total - t.firstFrame)) * W;
    const op = t.overview(t.firstFrame, t.total, W / 3);
    g.fillStyle = '#3a4150';
    op.forEach((v, i) => g.fillRect(i * 3, OVER / 2 - v * (OVER / 2 - 3), 2, Math.max(1, v * (OVER - 6))));
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(all(this.vFrom), 0, Math.max(2, all(this.vTo) - all(this.vFrom)), OVER);
    g.fillStyle = '#4aa8ff';
    g.fillRect(all(r.from), OVER - 4, Math.max(2, all(r.to) - all(r.from)), 4);
    g.fillStyle = '#2a2d33';
    g.fillRect(0, OVER, W, 2);
    // Sections band.
    const top = OVER + 6;
    const band = 26;
    const secs = t.markers.filter((m) => m.kind === 'section');
    g.font = '600 20px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.textBaseline = 'middle';
    secs.forEach((m, i) => {
      const x0 = this.xOf(m.frame);
      const x1 = this.xOf(i + 1 < secs.length ? secs[i + 1].frame : t.total);
      if (x1 < 0 || x0 > W) return;
      g.fillStyle = SECTION_COLOR[m.section] || '#888';
      g.globalAlpha = 0.75;
      g.fillRect(x0 + 1, top, Math.max(1, x1 - x0 - 2), band);
      g.globalAlpha = 1;
      g.save();
      g.beginPath();
      g.rect(x0, top, Math.max(0, x1 - x0 - 4), band);
      g.clip();
      g.fillStyle = '#000';
      g.fillText(`${m.section.toUpperCase()} · ${m.style}`, Math.max(x0, 0) + 8, top + band / 2);
      g.restore();
    });
    // Bar lines.
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (const b of this.o.bars()) {
      const x = this.xOf(b);
      if (x >= 0 && x <= W) g.fillRect(x, top + band, 1, H - top - band - 22);
    }
    // Waveform.
    const wTop = top + band + 6;
    const wH = H - wTop - 26;
    const mid = wTop + wH / 2;
    const cols = W / 3;
    const peaks = t.overview(this.vFrom, this.vTo, cols);
    for (let i = 0; i < cols; i++) {
      const f = this.vFrom + (i / cols) * (this.vTo - this.vFrom);
      const a = peaks[i] * (wH / 2 - 2);
      g.fillStyle = f >= r.from && f <= r.to ? '#cfe6ff' : '#4d5562';
      g.fillRect(i * 3, mid - a, 2, a * 2 || 1);
    }
    // Range with handles.
    const x0 = this.xOf(r.from);
    const x1 = this.xOf(r.to);
    g.fillStyle = 'rgba(74,168,255,0.16)';
    g.fillRect(x0, top + band, x1 - x0, H - top - band - 22);
    g.fillStyle = '#4aa8ff';
    for (const x of [x0, x1]) {
      g.fillRect(x - 2, top + band, 4, H - top - band - 22);
      g.fillRect(x - 9, mid - 22, 18, 44);
    }
    // Time ticks.
    g.fillStyle = '#7d8798';
    g.font = '500 18px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    const span = (this.vTo - this.vFrom) / t.rate;
    const step = span > 300 ? 60 : span > 120 ? 30 : span > 50 ? 10 : span > 20 ? 5 : 1;
    for (let s = Math.ceil(this.vFrom / t.rate / step) * step; s * t.rate < this.vTo; s += step) {
      const x = this.xOf(s * t.rate);
      g.fillRect(x, H - 10, 1, 10);
      g.fillText(fmtTime(s), x + 4, H - 14);
    }
    // Playback head.
    const p = this.o.preview();
    if (p) {
      const len = p.to - p.from;
      let off = (this.o.now() - p.start) * t.rate;
      off = p.loop ? off % len : Math.min(off, len);
      const x = this.xOf(p.from + off);
      g.fillStyle = '#fff';
      g.fillRect(x - 1, top, 3, H - top - 22);
    } else this.root.querySelector('.save-play').textContent = '▶ PLAY';
  }
}
