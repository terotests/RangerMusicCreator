// SPDX-License-Identifier: MIT
// The two jazz stages, drawn on a canvas. RagStage: a parlour with a player
// piano whose paper roll scrolls past the tracker bar, and a little bandstand
// under bunting. BandStage: an art-deco ballroom with the band on three
// risers behind music stands, the rhythm section at the side, and a
// spotlight on whoever takes a solo.

export class BaseStage {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.act = {};
    this.pending = [];
    this.level = 0;
    this.beat = 0;
    this.now = 0;
  }

  note(ev, t, dur) {
    this.pending.push({ p: ev.i, m: ev.m, v: Math.max(ev.v, ev.v2 ?? 0), t, end: t + Math.max(0.1, dur) });
  }

  tick(now, level, beatPhase) {
    if (this.pending.length > 2500) this.pending.splice(0, this.pending.length - 2500);
    for (const p in this.act) this.act[p] *= 0.88;
    const keep = [];
    this.sounding = [];
    for (const n of this.pending) {
      if (n.end < now - 4) continue;
      keep.push(n);
      if (n.t <= now && n.end >= now) {
        this.act[n.p] = Math.min(1, Math.max(this.act[n.p] || 0, n.v * (0.75 + 0.25 * Math.max(0, 1 - (now - n.t) * 3))));
        this.sounding.push(n);
      }
    }
    this.pending = keep;
    this.level = this.level * 0.85 + level * 0.15;
    this.beat = beatPhase;
    this.now = now;
    this.draw();
  }

  clear() {
    this.pending = [];
    this.act = {};
  }

  figure(x, y, s, a, [r, gg, b], bob = 0) {
    const g = this.g;
    const lift = a * 3 * s + bob;
    if (a > 0.03) {
      const glow = g.createRadialGradient(x, y - 10 * s, 0, x, y - 10 * s, 42 * s);
      glow.addColorStop(0, `rgba(${r},${gg},${b},${0.7 * a})`);
      glow.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = glow;
      g.fillRect(x - 46 * s, y - 56 * s, 92 * s, 92 * s);
    }
    const shade = (k, base) => Math.round(base + a * (k - base));
    g.fillStyle = `rgb(${shade(r, 28)},${shade(gg, 20)},${shade(b, 18)})`;
    g.beginPath();
    g.ellipse(x, y - 4 * s - lift, 9 * s, 12 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x, y - 22 * s - lift, 6 * s, 0, Math.PI * 2);
    g.fill();
  }
}

// ---- Ragtime -------------------------------------------------------------------

const RAG_HUE = { tp: [255, 214, 120], cl: [210, 240, 190], tb: [255, 190, 120], tu: [240, 200, 140], xyl: [255, 236, 170], drums: [250, 150, 120] };
const DRUMS = new Set(['bd', 'sn', 'cym', 'tap', 'blk', 'hh', 'ride', 'tom']);

export class RagStage extends BaseStage {
  draw() {
    const { g, c } = this;
    const W = c.width;
    const H = c.height;
    const L = Math.min(1, this.level * 3);
    // Wallpaper: striped damask in sepia.
    g.fillStyle = '#3b2414';
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 28) {
      g.fillStyle = x % 56 ? 'rgba(120, 78, 40, 0.28)' : 'rgba(80, 46, 20, 0.35)';
      g.fillRect(x, 0, 14, H * 0.72);
    }
    g.fillStyle = 'rgba(214, 170, 96, 0.08)';
    for (let y = 30; y < H * 0.7; y += 46) for (let x = (y / 46) % 2 ? 0 : 14; x < W; x += 28) {
      g.beginPath();
      g.moveTo(x + 7, y - 7);
      g.lineTo(x + 12, y);
      g.lineTo(x + 7, y + 7);
      g.lineTo(x + 2, y);
      g.fill();
    }
    // Wainscot and floor
    g.fillStyle = '#2a170b';
    g.fillRect(0, H * 0.72, W, H * 0.28);
    g.fillStyle = '#4d2e17';
    for (let x = -40; x < W + 40; x += 60) {
      g.beginPath();
      g.moveTo(x, H);
      g.lineTo(x + 30, H * 0.72);
      g.lineTo(x + 34, H * 0.72);
      g.lineTo(x + 8, H);
      g.fill();
    }
    // Warm lamp light
    const lamp = g.createRadialGradient(W * 0.3, H * 0.2, 10, W * 0.3, H * 0.4, W * 0.55);
    lamp.addColorStop(0, `rgba(255, 210, 140, ${0.18 + L * 0.18})`);
    lamp.addColorStop(1, 'rgba(255, 210, 140, 0)');
    g.fillStyle = lamp;
    g.fillRect(0, 0, W, H);

    this.drawPiano(W * 0.07, H * 0.1, W * 0.5, H * 0.84);
    this.drawBand(W * 0.6, H * 0.18, W * 0.38, H * 0.74);
  }

  drawPiano(x, y, w, h) {
    const g = this.g;
    const a = this.act.pno || 0;
    // Cabinet
    const wood = g.createLinearGradient(x, y, x + w, y);
    wood.addColorStop(0, '#2b130a');
    wood.addColorStop(0.5, '#5c2e15');
    wood.addColorStop(1, '#2b130a');
    g.fillStyle = wood;
    g.fillRect(x, y, w, h * 0.78);
    g.strokeStyle = '#c99a4a';
    g.lineWidth = 2;
    g.strokeRect(x + 8, y + 8, w - 16, h * 0.78 - 16);
    // The roll window
    const rx = x + w * 0.12;
    const ry = y + 22;
    const rw = w * 0.76;
    const rh = h * 0.46;
    g.fillStyle = '#efe0bd';
    g.fillRect(rx, ry, rw, rh);
    const track = ry + rh - 16;
    // Holes: each piano note punched where it sounded, scrolling up from the tracker bar.
    const speed = rh * 0.42; // pixels per second
    g.fillStyle = '#2a1a0e';
    for (const n of this.pending) {
      if (n.p !== 'pno' || n.m == null || n.t > this.now) continue;
      const kx = rx + ((n.m - 28) / 72) * rw;
      // The paper moves up: the note's start has travelled further than its end.
      const top = Math.max(ry, track - (this.now - n.t) * speed);
      const bot = Math.min(track, track - (this.now - n.end) * speed);
      if (bot > top + 1) g.fillRect(kx - 2, top, 4, bot - top);
    }
    // Tracker bar
    g.fillStyle = `rgba(201, 154, 74, ${0.7 + a * 0.3})`;
    g.fillRect(rx - 4, track, rw + 8, 5);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(rx, ry, rw, 6);
    g.strokeStyle = '#8a5a26';
    g.strokeRect(rx, ry, rw, rh);
    g.fillStyle = '#c99a4a';
    g.font = 'italic 15px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('~ The Ranger Pianola ~', x + w / 2, y + h * 0.53);
    // Keyboard
    const ky = y + h * 0.56;
    const kh = h * 0.14;
    g.fillStyle = '#1a0c06';
    g.fillRect(x - 6, ky - 6, w + 12, kh + 14);
    const lo = 28;
    const hi = 100;
    const whites = [];
    for (let m = lo; m <= hi; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
    const ww = w / whites.length;
    const down = new Map();
    for (const n of this.sounding || []) if (n.p === 'pno' && n.m != null) down.set(n.m, Math.max(down.get(n.m) || 0, n.v));
    whites.forEach((m, i) => {
      const d = down.get(m) || 0;
      g.fillStyle = d ? `rgb(255, ${Math.round(230 - d * 60)}, ${Math.round(170 - d * 100)})` : '#f4ead2';
      g.fillRect(x + i * ww + 0.5, ky, ww - 1, kh);
    });
    let wi = 0;
    for (let m = lo; m <= hi; m++) {
      if (![1, 3, 6, 8, 10].includes(m % 12)) {
        wi++;
        continue;
      }
      const d = down.get(m) || 0;
      g.fillStyle = d ? '#e0902e' : '#140a05';
      g.fillRect(x + wi * ww - ww * 0.32, ky, ww * 0.64, kh * 0.62);
    }
    // Legs and pedals
    g.fillStyle = '#2b130a';
    g.fillRect(x + 10, y + h * 0.78, 18, h * 0.2);
    g.fillRect(x + w - 28, y + h * 0.78, 18, h * 0.2);
    g.fillStyle = '#c99a4a';
    g.fillRect(x + w / 2 - 20, y + h * 0.95, 12, 5);
    g.fillRect(x + w / 2 + 8, y + h * 0.95, 12, 5);
  }

  drawBand(x, y, w, h) {
    const g = this.g;
    // Bandstand with bunting
    g.fillStyle = '#5b351a';
    g.fillRect(x, y + h * 0.82, w, h * 0.1);
    g.fillStyle = '#7a4a24';
    g.fillRect(x, y + h * 0.8, w, 8);
    const colors = ['#b8332a', '#efe0bd', '#2f4f8f'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = colors[i % 3];
      g.beginPath();
      const bx = x + (i * w) / 8;
      g.moveTo(bx, y);
      g.quadraticCurveTo(bx + w / 16, y + 26, bx + w / 8, y);
      g.fill();
    }
    g.fillStyle = '#e9cf8f';
    g.font = 'bold 13px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('★ THE RANGER SYNCOPATORS ★', x + w / 2, y + 44);
    const players = [
      ['tp', 0.18, 0.62, 'CORNET'],
      ['cl', 0.38, 0.6, 'CLARINET'],
      ['tb', 0.6, 0.62, 'TROMBONE'],
      ['xyl', 0.84, 0.66, 'XYLOPHONE'],
      ['tu', 0.28, 0.82, 'TUBA'],
      ['drums', 0.68, 0.82, 'DRUMS'],
    ];
    let drums = 0;
    for (const p of DRUMS) drums = Math.max(drums, this.act[p] || 0);
    const bob = Math.sin(this.beat * Math.PI * 2) * 1.5;
    for (const [p, fx, fy, label] of players) {
      const a = p === 'drums' ? drums : this.act[p] || 0;
      const px = x + fx * w;
      const py = y + fy * h;
      this.figure(px, py, 1.25, a, RAG_HUE[p], a > 0.1 ? bob : 0);
      g.strokeStyle = `rgba(233, 207, 143, ${0.45 + a * 0.55})`;
      g.lineWidth = 3;
      g.beginPath();
      if (p === 'tp') {
        g.moveTo(px + 6, py - 26);
        g.lineTo(px + 30, py - 30);
        g.lineTo(px + 36, py - 36);
      } else if (p === 'cl') {
        g.moveTo(px + 2, py - 22);
        g.lineTo(px + 10, py + 8);
      } else if (p === 'tb') {
        g.moveTo(px + 6, py - 26);
        g.lineTo(px + 44 + a * 10, py - 24);
        g.moveTo(px + 20, py - 20);
        g.lineTo(px + 44 + a * 10, py - 18);
      } else if (p === 'tu') {
        g.arc(px + 10, py - 14, 14, -1.2, 2.4);
      } else if (p === 'xyl') {
        for (let k = 0; k < 6; k++) {
          g.moveTo(px - 24 + k * 9, py + 6);
          g.lineTo(px - 24 + k * 9, py + 14 - k);
        }
      } else if (p === 'drums') {
        g.ellipse(px + 18, py + 6, 16, 6, 0, 0, Math.PI * 2);
        g.moveTo(px - 26, py - 22);
        g.lineTo(px - 6, py - 26);
      }
      g.stroke();
      g.fillStyle = `rgba(233, 207, 143, ${0.4 + a * 0.6})`;
      g.font = '10px Georgia, serif';
      g.fillText(label, px, py + 26);
    }
  }
}

// ---- Big band -----------------------------------------------------------------

const BB_HUE = { reeds: [150, 230, 210], trumpets: [255, 214, 110], trombones: [255, 170, 110], piano: [220, 200, 255], rhythm: [255, 140, 140], solo: [255, 240, 200] };
const SOLO = { stp: 'TRUMPET', scl: 'CLARINET', stb: 'TROMBONE' };

export class BandStage extends BaseStage {
  draw() {
    const { g, c } = this;
    const W = c.width;
    const H = c.height;
    const L = Math.min(1, this.level * 3);
    g.fillStyle = '#0b1020';
    g.fillRect(0, 0, W, H);
    // Deco sunburst behind the risers
    const cx = W * 0.56;
    const cy = H * 0.95;
    for (let i = 0; i < 28; i++) {
      const a0 = Math.PI + (i / 28) * Math.PI;
      const a1 = Math.PI + ((i + 0.5) / 28) * Math.PI;
      g.fillStyle = `rgba(217, 180, 90, ${0.07 + (i % 2) * 0.03 + L * 0.06})`;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * W, cy + Math.sin(a0) * W);
      g.lineTo(cx + Math.cos(a1) * W, cy + Math.sin(a1) * W);
      g.fill();
    }
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = `rgba(217, 180, 90, ${0.35 - k * 0.07})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, H * (0.32 + k * 0.17), Math.PI, 2 * Math.PI);
      g.stroke();
    }
    // Risers: trumpets at the back, trombones, reeds in front.
    const rows = [
      ['trumpets', 'tp', H * 0.36, 4],
      ['trombones', 'tb', H * 0.56, 4],
      ['reeds', 'cl', H * 0.78, 5],
    ];
    rows.forEach(([sec, p, y, n], ri) => {
      const rx = cx - W * (0.2 + ri * 0.035);
      const rw = W * (0.4 + ri * 0.07);
      g.fillStyle = `rgba(30, 36, 64, 0.95)`;
      g.fillRect(rx, y + 14, rw, H * 0.06);
      g.fillStyle = 'rgba(217, 180, 90, 0.75)';
      g.fillRect(rx, y + 14, rw, 3);
      let a = 0;
      for (const q of p === 'cl' ? ['cl', 'bn'] : [p]) a = Math.max(a, this.act[q] || 0);
      for (let k = 0; k < n; k++) {
        const px = rx + ((k + 0.5) / n) * rw;
        const sway = a > 0.1 ? Math.sin(this.beat * Math.PI * 2 + k) * 1.2 : 0;
        this.figure(px, y + 6, 1.05, a, BB_HUE[sec], sway);
        this.horn(p, px, y + 6, a, k);
        // Music stand with the band's monogram
        g.fillStyle = '#141a33';
        g.beginPath();
        g.moveTo(px - 18, y + 4);
        g.lineTo(px + 18, y + 4);
        g.lineTo(px + 14, y + 22);
        g.lineTo(px - 14, y + 22);
        g.fill();
        g.strokeStyle = `rgba(217, 180, 90, ${0.55 + a * 0.45})`;
        g.lineWidth = 1.5;
        g.stroke();
        g.fillStyle = `rgba(217, 180, 90, ${0.6 + a * 0.4})`;
        g.font = 'bold 11px Futura, "Avenir Next", "Gill Sans", sans-serif';
        g.textAlign = 'center';
        g.fillText('R', px, y + 17);
      }
    });
    // Rhythm section on the left: piano, bass, drums.
    this.drawPiano(W * 0.04, H * 0.62, this.act.pno || 0);
    let dr = 0;
    for (const p of ['ride', 'hh', 'bd', 'sn', 'tap', 'tom', 'cym', 'blk']) dr = Math.max(dr, this.act[p] || 0);
    this.drawDrums(W * 0.13, H * 0.36, dr);
    const ba = this.act.cb || 0;
    this.figure(W * 0.24, H * 0.56, 1.1, ba, BB_HUE.rhythm);
    g.fillStyle = `rgb(${Math.round(90 + ba * 120)}, ${Math.round(50 + ba * 60)}, 30)`;
    g.beginPath();
    g.ellipse(W * 0.24 + 14, H * 0.56 - 4, 11, 26, 0.12, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#d9b45a';
    g.beginPath();
    g.moveTo(W * 0.24 + 10, H * 0.56 - 30);
    g.lineTo(W * 0.24 + 6, H * 0.56 - 70);
    g.stroke();
    // The soloist steps up to the microphone.
    let solo = null;
    let sa = 0;
    for (const p of Object.keys(SOLO)) if ((this.act[p] || 0) > sa) [solo, sa] = [p, this.act[p]];
    const mx = W * 0.56;
    const my = H * 0.97;
    if (solo && sa > 0.05) {
      const cone = g.createLinearGradient(mx, 0, mx, my);
      cone.addColorStop(0, `rgba(255, 244, 214, ${0.05 + sa * 0.25})`);
      cone.addColorStop(1, `rgba(255, 244, 214, ${0.02 + sa * 0.12})`);
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(mx - 20, 0);
      g.lineTo(mx + 20, 0);
      g.lineTo(mx + 90, my);
      g.lineTo(mx - 90, my);
      g.fill();
      this.figure(mx - 26, my - 8, 1.6, Math.max(0.35, sa), BB_HUE.solo);
      this.horn(solo === 'stp' ? 'tp' : solo === 'stb' ? 'tb' : 'cl', mx - 26, my - 8, sa, 0, 1.6);
      g.fillStyle = 'rgba(255, 244, 214, 0.85)';
      g.font = '12px Futura, "Avenir Next", "Gill Sans", sans-serif';
      g.textAlign = 'center';
      g.fillText(SOLO[solo], mx - 26, my - 70);
    }
    // Microphone
    g.strokeStyle = '#c0c4d0';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(mx + 10, my);
    g.lineTo(mx + 10, my - 52);
    g.stroke();
    g.fillStyle = '#c0c4d0';
    g.beginPath();
    g.ellipse(mx + 10, my - 58, 5, 8, 0, 0, Math.PI * 2);
    g.fill();
    // Marquee
    g.fillStyle = '#d9b45a';
    g.font = 'bold 18px Futura, "Avenir Next", "Gill Sans", sans-serif';
    g.textAlign = 'center';
    g.fillText('THE RANGER ORCHESTRA', cx, H * 0.14);
    for (let i = 0; i < 26; i++) {
      const on = (Math.floor(this.now * 6) + i) % 3 === 0;
      g.fillStyle = on ? `rgba(255, 226, 150, ${0.6 + L * 0.4})` : 'rgba(120, 100, 60, 0.5)';
      g.beginPath();
      g.arc(cx - 190 + i * 15.2, H * 0.17, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }

  horn(p, x, y, a, k, s = 1) {
    const g = this.g;
    g.strokeStyle = `rgba(217, 180, 90, ${0.5 + a * 0.5})`;
    g.lineWidth = 2.2 * s;
    g.beginPath();
    const up = a * 4 * s;
    if (p === 'tp') {
      g.moveTo(x + 4 * s, y - 20 * s - up);
      g.lineTo(x + 24 * s, y - 26 * s - up * 1.5);
      g.lineTo(x + 28 * s, y - 31 * s - up * 1.5);
    } else if (p === 'tb') {
      g.moveTo(x + 4 * s, y - 20 * s - up);
      g.lineTo(x + (32 + a * 8) * s, y - 20 * s - up);
    } else {
      g.moveTo(x + 2 * s, y - 18 * s - up);
      g.lineTo(x + 8 * s, y + 4 * s - up);
      g.lineTo(x + 13 * s, y + 1 * s - up);
    }
    g.stroke();
  }

  drawPiano(x, y, a) {
    const g = this.g;
    g.fillStyle = `rgb(${Math.round(16 + a * 40)}, ${Math.round(16 + a * 30)}, ${Math.round(26 + a * 60)})`;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 140, y);
    g.quadraticCurveTo(x + 150, y + 40, x + 100, y + 54);
    g.lineTo(x, y + 54);
    g.closePath();
    g.fill();
    g.strokeStyle = '#d9b45a';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#e8e2d0';
    g.fillRect(x + 4, y + 54, 96, 8);
    this.figure(x + 52, y + 96, 1.1, a, BB_HUE.piano);
  }

  drawDrums(x, y, a) {
    const g = this.g;
    this.figure(x, y, 1.05, a, BB_HUE.rhythm, a > 0.2 ? Math.sin(this.beat * Math.PI * 2) * 1.5 : 0);
    g.fillStyle = `rgba(232, 226, 208, ${0.75 + a * 0.25})`;
    g.beginPath();
    g.ellipse(x, y + 18, 20, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e2574c';
    g.font = 'bold 10px Futura, "Avenir Next", sans-serif';
    g.textAlign = 'center';
    g.fillText('RANGER', x, y + 21);
    g.strokeStyle = `rgba(217, 180, 90, ${0.5 + a * 0.5})`;
    g.lineWidth = 2;
    for (const [dx, dy, r] of [[-34, -26, 14], [34, -30, 15]]) {
      g.beginPath();
      g.ellipse(x + dx, y + dy - a * 2, r, 3, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
}
