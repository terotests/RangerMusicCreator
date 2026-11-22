// SPDX-License-Identifier: MIT
// The stage view: a concert hall with the orchestra seated in arcs around the
// conductor. Each player lights up as it plays; the conductor beats time.

import { SEATS } from './orchestra.js';
import { SECTION_OF } from './composer.js';

const COUNT = { pno: 1, vln1: 8, vln2: 7, vla: 6, vc: 5, cb: 3, harp: 1, fl: 2, ob: 2, cl: 2, bn: 2, hn: 4, tp: 3, tb: 3, tu: 1, timp: 1, cym: 1, bd: 1, sn: 1, gong: 1, tri: 1, glock: 1 };
const HUE = { strings: [255, 196, 120], brass: [255, 220, 110], winds: [170, 230, 160], perc: [255, 140, 120], harp: [150, 210, 255], piano: [255, 236, 200] };
const LABEL = { pno: 'PIANO', vln1: 'VIOLINS I', vln2: 'VIOLINS II', vla: 'VIOLAS', vc: 'CELLOS', cb: 'BASSES', harp: 'HARP', fl: 'FLUTES', ob: 'OBOES', cl: 'CLARINETS', bn: 'BASSOONS', hn: 'HORNS', tp: 'TRUMPETS', tb: 'TROMBONES', tu: 'TUBA', timp: 'TIMPANI', glock: 'BELLS', gong: 'GONG' };

export class Stage {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.act = {};
    this.pending = [];
    this.level = 0;
    this.beat = 0;
    this.layout();
  }

  layout() {
    const W = this.c.width;
    const H = this.c.height;
    const cx = W / 2;
    const cy = H * 0.93;
    this.cx = cx;
    this.cy = cy;
    this.seats = [];
    for (const [p, s] of Object.entries(SEATS)) {
      const n = COUNT[p] || 1;
      const r0 = H * 0.2 + s.depth * H * 0.52;
      const a0 = s.pan * 1.25;
      const spread = 0.09 + Math.min(n, 8) * 0.035;
      for (let k = 0; k < n; k++) {
        const f = n === 1 ? 0 : k / (n - 1) - 0.5;
        const row = n > 4 ? (k % 2) * 0.06 : 0;
        const a = a0 + f * spread;
        const r = r0 * (1 + row);
        this.seats.push({ p, x: cx + Math.sin(a) * r * 1.55, y: cy - Math.cos(a) * r * 0.78, depth: s.depth, k });
      }
    }
    this.seats.sort((a, b) => a.y - b.y);
    this.labels = {};
    for (const p of Object.keys(LABEL)) {
      const ss = this.seats.filter((s) => s.p === p);
      if (!ss.length) continue;
      this.labels[p] = { x: ss.reduce((a, s) => a + s.x, 0) / ss.length, y: Math.min(...ss.map((s) => s.y)) - 18 };
    }
  }

  note(ev, t, dur) {
    this.pending.push({ p: ev.i, v: Math.max(ev.v, ev.v2 ?? 0), t, end: t + Math.max(0.12, dur) });
  }

  tick(now, level, beatPhase) {
    if (this.pending.length > 1500) this.pending.splice(0, this.pending.length - 1500);
    for (const p in this.act) this.act[p] *= 0.9;
    const keep = [];
    for (const n of this.pending) {
      if (n.end < now) continue;
      keep.push(n);
      if (n.t <= now) this.act[n.p] = Math.min(1, Math.max(this.act[n.p] || 0, n.v * (0.75 + 0.25 * Math.max(0, 1 - (now - n.t) * 3))));
    }
    this.pending = keep;
    this.level = this.level * 0.85 + level * 0.15;
    this.beat = beatPhase;
    this.draw();
  }

  clear() {
    this.pending = [];
    this.act = {};
  }

  draw() {
    const { g, c } = this;
    const W = c.width;
    const H = c.height;
    const L = Math.min(1, this.level * 3);
    // Hall back wall and organ pipes
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#1a0c08');
    wall.addColorStop(0.55, '#2c150c');
    wall.addColorStop(1, '#120705');
    g.fillStyle = wall;
    g.fillRect(0, 0, W, H);
    g.save();
    g.globalAlpha = 0.18 + L * 0.12;
    for (let i = -14; i <= 14; i++) {
      const h = 120 + Math.cos(i * 0.32) * 70 + (14 - Math.abs(i)) * 4;
      const x = W / 2 + i * 18;
      const pipe = g.createLinearGradient(x - 6, 0, x + 6, 0);
      pipe.addColorStop(0, '#5a4630');
      pipe.addColorStop(0.5, '#d8b77a');
      pipe.addColorStop(1, '#4a3826');
      g.fillStyle = pipe;
      g.fillRect(x - 6, 70 + (200 - h), 12, h);
    }
    g.restore();
    // Stage floor
    const floor = g.createRadialGradient(W / 2, H * 1.05, 40, W / 2, H * 0.9, W * 0.62);
    floor.addColorStop(0, `rgba(150, 92, 48, ${0.95})`);
    floor.addColorStop(0.6, '#5a3319');
    floor.addColorStop(1, '#1c0d06');
    g.fillStyle = floor;
    g.beginPath();
    g.ellipse(W / 2, H * 0.98, W * 0.6, H * 0.78, 0, Math.PI, 2 * Math.PI);
    g.fill();
    // Floor boards
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 1;
    for (let i = -20; i <= 20; i++) {
      g.beginPath();
      g.moveTo(W / 2 + i * 14, H * 0.3);
      g.lineTo(W / 2 + i * 60, H);
      g.stroke();
    }
    // Spotlight
    const spot = g.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.6, W * 0.5);
    spot.addColorStop(0, `rgba(255, 220, 160, ${0.1 + L * 0.22})`);
    spot.addColorStop(1, 'rgba(255, 220, 160, 0)');
    g.fillStyle = spot;
    g.fillRect(0, 0, W, H);
    // Players
    for (const s of this.seats) {
      const a = this.act[s.p] || 0;
      const sec = SECTION_OF[s.p];
      const [r, gg, b] = HUE[sec];
      const scale = 1 - s.depth * 0.35;
      const rad = 7 * scale;
      if (a > 0.02) {
        const glow = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 34 * scale);
        glow.addColorStop(0, `rgba(${r},${gg},${b},${0.85 * a})`);
        glow.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = glow;
        g.fillRect(s.x - 40, s.y - 40, 80, 80);
      }
      // The grand piano: a black case with its lid up, the pianist at the keys.
      if (s.p === 'pno') {
        const px = s.x - rad * 0.5;
        const py = s.y - rad * 1.2;
        g.fillStyle = '#060303';
        g.strokeStyle = `rgba(231,192,106,${0.35 + a * 0.6})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(px + rad * 1.2, py - rad * 0.8);
        g.lineTo(px + rad * 9, py - rad * 0.4);
        g.quadraticCurveTo(px + rad * 10.5, py + rad * 1.4, px + rad * 6, py + rad * 2.2);
        g.lineTo(px + rad * 1.2, py + rad * 2);
        g.closePath();
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(px + rad * 1.4, py - rad * 0.8);
        g.lineTo(px + rad * 7.5, py - rad * 4.2);
        g.lineTo(px + rad * 9, py - rad * 0.4);
        g.stroke();
        g.fillStyle = `rgba(246,234,210,${0.5 + a * 0.5})`;
        g.fillRect(px + rad * 0.6, py - rad * 0.6, rad * 0.6, rad * 2.4);
      }
      // chair
      g.fillStyle = 'rgba(20,8,4,0.8)';
      g.fillRect(s.x - rad, s.y + rad * 0.6, rad * 2, rad * 0.7);
      // body and head
      g.fillStyle = `rgba(${Math.round(40 + a * (r - 40))},${Math.round(26 + a * (gg - 26))},${Math.round(20 + a * (b - 20))},1)`;
      g.beginPath();
      g.ellipse(s.x, s.y + rad * 0.2, rad * 0.95, rad * 0.8, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(s.x, s.y - rad * 0.9, rad * 0.55, 0, Math.PI * 2);
      g.fill();
      if (s.p === 'timp' || s.p === 'gong' || s.p === 'harp') {
        g.strokeStyle = `rgba(231,192,106,${0.4 + a * 0.6})`;
        g.lineWidth = 2;
        g.beginPath();
        if (s.p === 'timp') g.ellipse(s.x + rad * 2.2, s.y + rad * 0.4, rad * 1.6, rad * 0.7, 0, 0, Math.PI * 2);
        else if (s.p === 'gong') g.arc(s.x + rad * 2.4, s.y - rad, rad * 1.5, 0, Math.PI * 2);
        else {
          g.moveTo(s.x - rad * 1.6, s.y + rad);
          g.quadraticCurveTo(s.x - rad * 2.4, s.y - rad * 3, s.x - rad * 0.6, s.y - rad * 3.4);
        }
        g.stroke();
      }
    }
    // Section labels
    g.font = '11px Georgia, serif';
    g.textAlign = 'center';
    for (const [p, l] of Object.entries(this.labels)) {
      const a = this.act[p] || 0;
      g.fillStyle = `rgba(231,192,106,${0.28 + a * 0.6})`;
      g.fillText(LABEL[p], l.x, l.y);
    }
    // Conductor on the podium, baton on the beat
    const px = W / 2;
    const py = H * 0.9;
    g.fillStyle = '#2a1209';
    g.fillRect(px - 28, py + 6, 56, 14);
    g.fillStyle = '#0d0605';
    g.beginPath();
    g.ellipse(px, py - 6, 12, 15, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(px, py - 26, 8, 0, Math.PI * 2);
    g.fill();
    const ph = this.beat;
    const bx = px + 22 + Math.sin(ph * Math.PI * 2) * 8;
    const by = py - 30 - Math.abs(Math.cos(ph * Math.PI)) * 16;
    g.strokeStyle = '#f6ead2';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(px + 8, py - 10);
    g.lineTo(bx, by);
    g.stroke();
    // Curtains and valance
    this.curtain(0, 1);
    this.curtain(W, -1);
    const val = g.createLinearGradient(0, 0, 0, 46);
    val.addColorStop(0, '#5e1019');
    val.addColorStop(1, '#2e060b');
    g.fillStyle = val;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W, 0);
    g.lineTo(W, 30);
    for (let x = W; x >= 0; x -= 40) g.quadraticCurveTo(x - 20, 52, x - 40, 30);
    g.closePath();
    g.fill();
    g.fillStyle = '#c99a45';
    for (let x = 0; x < W; x += 8) g.fillRect(x, 31 + Math.sin(x / 40 * Math.PI) * 10, 3, 6);
  }

  curtain(x0, dir) {
    const { g, c } = this;
    const H = c.height;
    const w = c.width * 0.09;
    for (let i = 0; i < 6; i++) {
      const x = x0 + dir * (i * w) / 6;
      const grad = g.createLinearGradient(x, 0, x + (dir * w) / 6, 0);
      grad.addColorStop(0, '#3a070d');
      grad.addColorStop(0.5, '#8a1a24');
      grad.addColorStop(1, '#3a070d');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + (dir * w) / 6, 0);
      g.lineTo(x + (dir * w) / 6 + dir * i * 3, H);
      g.lineTo(x + dir * i * 3, H);
      g.closePath();
      g.fill();
    }
  }
}
