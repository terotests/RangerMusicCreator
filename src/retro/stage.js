// SPDX-License-Identifier: MIT
// The Space Age and Synthwave stages, drawn on a canvas.
// SpaceStage: a lounge on a kidney-shaped stage under a starry sky with a
// ringed planet, starbursts, the instruments glowing as they play, a flying
// saucer for the theremin's friends and birds for the exotica.
// SynthStage: a neon sunset over a scrolling perspective grid, a striped sun
// that pulses with the beat, and a light column for each synth.

import { BaseStage } from '../jazz/stage.js';

function rnd(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

function glow(g, x, y, r, col, a) {
  if (a < 0.02) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, 0.75 * a));
  gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---- Space Age ------------------------------------------------------------------

const SPACE_SEATS = {
  thr: { x: 600, y: 330, label: 'THEREMIN', col: [140, 255, 220] },
  moog: { x: 1000, y: 222, label: 'MOOG', col: [255, 140, 90] },
  gtr: { x: 205, y: 225, label: 'GUITAR', col: [255, 110, 110] },
  vib: { x: 420, y: 360, label: 'VIBES', col: [255, 210, 120] },
  mar: { x: 790, y: 360, label: 'MARIMBA', col: [255, 170, 110] },
  org: { x: 960, y: 345, label: 'ORGAN', col: [255, 120, 160] },
  pno: { x: 250, y: 350, label: 'PIANO', col: [240, 240, 220] },
  hrp: { x: 120, y: 300, label: 'HARP', col: [230, 210, 255] },
  glk: { x: 1080, y: 290, label: 'CELESTE', col: [200, 240, 255] },
  str: { x: 330, y: 255, label: 'STRINGS', col: [255, 220, 180] },
  vla: { x: 420, y: 245, label: '', col: [255, 220, 180] },
  vc: { x: 510, y: 255, label: '', col: [255, 200, 160] },
  fl: { x: 700, y: 245, label: 'FLUTE', col: [210, 255, 230] },
  tp: { x: 800, y: 245, label: 'TRUMPET', col: [255, 230, 140] },
  tb: { x: 890, y: 255, label: 'TROMBONE', col: [255, 200, 120] },
  cb: { x: 1110, y: 400, label: 'BASS', col: [220, 170, 120] },
  perc: { x: 600, y: 415, label: 'BONGOS · CONGAS · MARACAS', col: [255, 150, 90] },
};
const PERC = new Set(['kick', 'snr', 'tamb', 'bgh', 'bgl', 'cgh', 'cgl', 'clv', 'gui', 'mrc', 'tap', 'ride', 'hh', 'timp', 'cym']);

export class SpaceStage extends BaseStage {
  constructor(canvas) {
    super(canvas);
    const r = rnd(7);
    this.stars = Array.from({ length: 160 }, () => ({ x: r() * 1200, y: r() * 300, s: 0.4 + r() * 1.4, p: r() * 6 }));
    this.bursts = Array.from({ length: 7 }, () => ({ x: r() * 1200, y: 40 + r() * 170, s: 6 + r() * 12, p: r() * 6 }));
    this.saucer = null;
  }

  draw() {
    const g = this.g;
    const W = 1200;
    const H = 520;
    const t = this.now;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#071a2b');
    sky.addColorStop(0.55, '#0e3340');
    sky.addColorStop(1, '#13262b');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    for (const s of this.stars) {
      g.fillStyle = `rgba(230,245,255,${0.35 + 0.35 * Math.sin(t * 1.3 + s.p)})`;
      g.fillRect(s.x, s.y, s.s, s.s);
    }
    // Atomic-age starbursts.
    g.strokeStyle = 'rgba(255,214,140,0.55)';
    g.lineWidth = 1.2;
    for (const b of this.bursts) {
      const k = b.s * (1 + 0.15 * Math.sin(t * 2 + b.p) + this.level * 2);
      g.beginPath();
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4 + b.p;
        const len = a % 2 ? k * 0.5 : k;
        g.moveTo(b.x, b.y);
        g.lineTo(b.x + Math.cos(ang) * len, b.y + Math.sin(ang) * len);
      }
      g.stroke();
    }
    // A ringed planet.
    const px = 1010;
    const py = 95;
    const pg = g.createRadialGradient(px - 18, py - 18, 4, px, py, 52);
    pg.addColorStop(0, '#f6c98b');
    pg.addColorStop(1, '#a8593a');
    g.fillStyle = pg;
    g.beginPath();
    g.arc(px, py, 46, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,230,190,0.7)';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(px, py, 86, 18, -0.25, 0, Math.PI * 2);
    g.stroke();
    // A small moon in orbit, quicker when the music is loud.
    const ma = t * 0.4;
    g.fillStyle = '#d8e6ea';
    g.beginPath();
    g.arc(px + Math.cos(ma) * 120, py + Math.sin(ma) * 30, 7, 0, Math.PI * 2);
    g.fill();

    // The flying saucer while the 'ufo' voice sounds.
    const ufo = this.act.ufo || 0;
    if (ufo > 0.05 && !this.saucer) this.saucer = { t0: t, dir: Math.random() < 0.5 ? 1 : -1 };
    if (this.saucer) {
      const k = (t - this.saucer.t0) / 6;
      if (k > 1) this.saucer = null;
      else {
        const x = this.saucer.dir > 0 ? -60 + k * 1320 : 1260 - k * 1320;
        const y = 150 + Math.sin(k * 9) * 30;
        glow(g, x, y + 8, 60, [140, 255, 220], 0.6);
        g.fillStyle = '#b9c7cc';
        g.beginPath();
        g.ellipse(x, y, 34, 9, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(160,255,230,0.8)';
        g.beginPath();
        g.ellipse(x, y - 6, 13, 9, 0, Math.PI, 0);
        g.fill();
      }
    }
    // Birds.
    const bird = this.act.bird || 0;
    if (bird > 0.05) {
      g.strokeStyle = `rgba(20,30,30,${0.4 + bird * 0.6})`;
      g.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const x = 180 + k * 60 + ((t * 40) % 400);
        const y = 90 + k * 14 + Math.sin(t * 3 + k) * 6;
        const f = Math.sin(t * 14 + k) * 6;
        g.beginPath();
        g.moveTo(x - 9, y - f);
        g.quadraticCurveTo(x - 4, y - 2, x, y);
        g.quadraticCurveTo(x + 4, y - 2, x + 9, y - f);
        g.stroke();
      }
    }

    // The stage: a kidney shape with a gold rim.
    g.fillStyle = '#1d3a3f';
    g.beginPath();
    g.moveTo(40, 470);
    g.bezierCurveTo(60, 270, 520, 300, 600, 300);
    g.bezierCurveTo(700, 300, 1140, 250, 1170, 470);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(232,190,110,0.8)';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#10272b';
    g.fillRect(0, 470, W, 50);

    // The players.
    let perc = 0;
    for (const p in this.act) if (PERC.has(p)) perc = Math.max(perc, this.act[p]);
    const draw = (key, a) => {
      const s = SPACE_SEATS[key];
      glow(g, s.x, s.y - 10, 70, s.col, a);
      this.instrument(key, s, a, t);
      if (s.label) {
        g.fillStyle = rgba(s.col, 0.35 + a * 0.65);
        g.font = '600 11px Futura, "Avenir Next", "Trebuchet MS", sans-serif';
        g.textAlign = 'center';
        g.fillText(s.label, s.x, s.y + 34);
      }
    };
    for (const key of Object.keys(SPACE_SEATS)) draw(key, key === 'perc' ? perc : this.act[key] || 0);
  }

  instrument(key, s, a, t) {
    const g = this.g;
    const col = rgba(s.col, 0.45 + 0.55 * a);
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineWidth = 2;
    const { x, y } = s;
    if (key === 'thr') {
      // A box, an antenna and a loop; the air waves while it plays.
      g.fillRect(x - 26, y + 2, 52, 16);
      g.beginPath();
      g.moveTo(x + 20, y + 2);
      g.lineTo(x + 20, y - 46);
      g.moveTo(x - 20, y + 6);
      g.arc(x - 34, y + 6, 12, 0, Math.PI * 2);
      g.stroke();
      if (a > 0.05) {
        g.beginPath();
        for (let k = 0; k < 40; k++) {
          const xx = x - 60 + k * 2;
          const yy = y - 30 + Math.sin(k * 0.5 + t * 10) * 6 * a;
          k ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
        }
        g.stroke();
      }
    } else if (key === 'gtr') {
      // A solid-body guitar on a slant; the strings shimmer while it plays.
      g.save();
      g.translate(x, y);
      g.rotate(-0.5);
      g.beginPath();
      g.ellipse(-14, 0, 16, 12, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillRect(0, -2, 40, 4);
      g.fillRect(40, -4, 8, 8);
      if (a > 0.05) for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.moveTo(-20, k * 2 + Math.sin(t * 40 + k) * a);
        g.lineTo(40, k * 1.5);
        g.stroke();
      }
      g.restore();
    } else if (key === 'moog') {
      // A modular cabinet: rows of knobs and patch cords that swing as it plays.
      g.strokeRect(x - 36, y - 26, 72, 34);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.arc(x - 27 + k * 11, y - 18 + r * 12, 3, 0, Math.PI * 2);
        g.stroke();
      }
      g.beginPath();
      for (const [x0, x1] of [[-27, 6], [-5, 27]]) {
        g.moveTo(x + x0, y - 18);
        g.quadraticCurveTo(x + (x0 + x1) / 2, y + 2 + Math.sin(t * 6 + x0) * 5 * a, x + x1, y - 6);
      }
      g.stroke();
      g.fillRect(x - 40, y + 10, 80, 5);
    } else if (key === 'vib' || key === 'mar' || key === 'glk') {
      const n = key === 'glk' ? 6 : 9;
      for (let k = 0; k < n; k++) {
        const h = 22 - k * 1.5;
        g.fillRect(x - n * 4 + k * 8, y - h / 2 + (a > 0.05 ? Math.sin(t * 20 + k) * a : 0), 6, h);
      }
      g.fillRect(x - n * 4 - 2, y + 14, n * 8 + 2, 3);
    } else if (key === 'org') {
      g.strokeRect(x - 34, y - 18, 68, 30);
      for (let k = 0; k < 5; k++) g.fillRect(x - 24 + k * 11, y - 14, 5, 8 + 6 * a * Math.abs(Math.sin(t * 3 + k)));
      g.fillRect(x - 34, y + 6, 68, 4);
    } else if (key === 'pno') {
      g.beginPath();
      g.moveTo(x - 34, y + 10);
      g.lineTo(x - 34, y - 12);
      g.quadraticCurveTo(x + 10, y - 22, x + 34, y + 10);
      g.closePath();
      g.stroke();
      g.fillRect(x - 34, y + 10, 68, 4);
    } else if (key === 'hrp') {
      g.beginPath();
      g.moveTo(x - 18, y + 20);
      g.lineTo(x - 18, y - 40);
      g.quadraticCurveTo(x + 10, y - 40, x + 22, y + 20);
      g.closePath();
      g.stroke();
      for (let k = 1; k < 6; k++) {
        g.beginPath();
        g.moveTo(x - 18 + k * 6, y + 20);
        g.lineTo(x - 18 + k * 6, y - 38 + k * 6 + (a > 0.05 ? Math.sin(t * 30 + k) * a * 2 : 0));
        g.stroke();
      }
    } else if (key === 'cb') {
      g.beginPath();
      g.ellipse(x, y + 4, 14, 22, 0, 0, Math.PI * 2);
      g.moveTo(x, y - 18);
      g.lineTo(x, y - 56);
      g.stroke();
    } else if (key === 'perc') {
      for (const [dx, r] of [[-60, 13], [-34, 11], [30, 16], [62, 18]]) {
        const bounce = a > 0.05 ? Math.sin(t * 25 + dx) * a * 2 : 0;
        g.beginPath();
        g.ellipse(x + dx, y + bounce, r, r * 0.45, 0, 0, Math.PI * 2);
        g.stroke();
      }
    } else {
      // Strings, flute and brass: little figures.
      g.beginPath();
      g.arc(x, y - 18 - a * 3, 6, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x, y - a * 3, 9, 12, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ---- Synthwave ------------------------------------------------------------------

const SYNTH_COLS = [
  ['kick', 'KICK', [255, 60, 160]],
  ['snare', 'SNARE', [255, 90, 200]],
  ['hat', 'HATS', [255, 160, 230]],
  ['etom', 'TOMS', [255, 110, 120]],
  ['bass', 'BASS', [120, 90, 255]],
  ['arp', 'ARP', [0, 230, 255]],
  ['ep', 'E.PIANO', [120, 255, 220]],
  ['bell', 'BELL', [200, 255, 255]],
  ['brass', 'BRASS', [255, 200, 90]],
  ['pad', 'PAD', [170, 120, 255]],
  ['str', 'STRINGS', [210, 160, 255]],
  ['vox', 'CHOIR', [255, 150, 255]],
  ['lead', 'LEAD', [255, 240, 120]],
];

export class SynthStage extends BaseStage {
  constructor(canvas) {
    super(canvas);
    const r = rnd(11);
    this.stars = Array.from({ length: 90 }, () => ({ x: r() * 1200, y: r() * 200, s: 0.5 + r() * 1.3, p: r() * 6 }));
    this.scroll = 0;
    this.lastT = 0;
  }

  draw() {
    const g = this.g;
    const W = 1200;
    const H = 520;
    const t = this.now;
    const horizon = 300;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#0b0326');
    sky.addColorStop(0.6, '#3a0b55');
    sky.addColorStop(1, '#ff3f8e');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, horizon);
    for (const s of this.stars) {
      g.fillStyle = `rgba(255,230,255,${0.3 + 0.3 * Math.sin(t * 1.7 + s.p)})`;
      g.fillRect(s.x, s.y, s.s, s.s);
    }
    // The sun: stripes cut out of its lower half, a pulse on the beat.
    const pulse = 1 + 0.03 * Math.max(0, 1 - this.beat * 4) + this.level * 0.3;
    const R = 120 * pulse;
    const sx = 600;
    const sy = horizon - 10;
    const sun = g.createLinearGradient(0, sy - R, 0, sy);
    sun.addColorStop(0, '#ffe66b');
    sun.addColorStop(1, '#ff2f7d');
    g.save();
    g.beginPath();
    g.arc(sx, sy, R, Math.PI, 0);
    g.closePath();
    g.clip();
    g.fillStyle = sun;
    g.fillRect(sx - R, sy - R, R * 2, R);
    g.fillStyle = '#ff3f8e';
    for (let k = 0; k < 7; k++) {
      const yy = sy - 8 - k * 14;
      g.fillRect(sx - R, yy, R * 2, Math.max(1, 7 - k));
    }
    g.restore();
    // Wireframe mountains.
    g.strokeStyle = 'rgba(0,240,255,0.7)';
    g.lineWidth = 1.5;
    g.fillStyle = '#16052b';
    for (const [x0, w, h] of [[0, 300, 90], [180, 260, 60], [860, 340, 100], [1040, 200, 55]]) {
      g.beginPath();
      g.moveTo(x0, horizon);
      g.lineTo(x0 + w * 0.35, horizon - h * 0.7);
      g.lineTo(x0 + w * 0.5, horizon - h);
      g.lineTo(x0 + w * 0.7, horizon - h * 0.6);
      g.lineTo(x0 + w, horizon);
      g.closePath();
      g.fill();
      g.stroke();
    }
    // The floor and its grid, scrolling toward you.
    const floor = g.createLinearGradient(0, horizon, 0, H);
    floor.addColorStop(0, '#1a0633');
    floor.addColorStop(1, '#05010d');
    g.fillStyle = floor;
    g.fillRect(0, horizon, W, H - horizon);
    const dt = Math.min(0.1, Math.max(0, t - this.lastT));
    this.lastT = t;
    this.scroll = (this.scroll + dt * (0.6 + this.level * 3)) % 1;
    g.strokeStyle = 'rgba(255,60,200,0.65)';
    g.lineWidth = 1.2;
    for (let k = -14; k <= 14; k++) {
      g.beginPath();
      g.moveTo(sx + k * 14, horizon);
      g.lineTo(sx + k * 140, H);
      g.stroke();
    }
    for (let k = 0; k < 12; k++) {
      const z = (k + this.scroll) / 12;
      const y = horizon + (H - horizon) * z * z;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }

    // A light column for each synth, standing on the grid.
    const n = SYNTH_COLS.length;
    SYNTH_COLS.forEach(([p, label, col], k) => {
      const a = p === 'snare' ? Math.max(this.act.snare || 0, this.act.clap || 0) : p === 'hat' ? Math.max(this.act.hat || 0, this.act.crash || 0) : this.act[p] || 0;
      const x = 70 + (k * (W - 140)) / (n - 1);
      const base = 425;
      const h = 14 + a * 130;
      glow(g, x, base - h / 2, 50 + h * 0.3, col, a * 0.8);
      const grd = g.createLinearGradient(0, base - h, 0, base);
      grd.addColorStop(0, rgba(col, 0.95));
      grd.addColorStop(1, rgba(col, 0.15));
      g.fillStyle = grd;
      g.fillRect(x - 9, base - h, 18, h);
      g.fillStyle = rgba(col, 0.45 + a * 0.55);
      g.font = '700 10px "Avenir Next", Futura, "Trebuchet MS", sans-serif';
      g.textAlign = 'center';
      g.fillText(label, x, base + 18);
    });

    // The lead line as a laser across the sky.
    const notes = this.sounding.filter((s) => s.p === 'lead' || s.p === 'bell').slice(-1);
    for (const nn of notes) {
      const y = 250 - (nn.m - 55) * 4;
      g.strokeStyle = 'rgba(255,240,140,0.85)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
      glow(g, sx, y, 160, [255, 240, 140], 0.4);
    }
    // Scanlines.
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  }
}
