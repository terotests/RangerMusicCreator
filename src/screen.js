// SPDX-License-Identifier: MIT
// The multi-view screen: four tiles like a video switcher's monitor.
//   PGM    spectrum and the style       SCOPE   waveform, key and chord
//   SONG   section, bar, layers         EVENTS  what the composer just did

const W = 960;
const H = 540;
const LAYER_TAGS = [['kick', 'K'], ['snare', 'S'], ['hats', 'H'], ['bass', 'B'], ['keys', 'C'], ['pad', 'P'], ['lead', 'L'], ['arp', 'A']];
const SECTION_COLOR = { intro: '#7aa7ff', verse: '#5ee08a', build: '#ffc04d', drop: '#ff5470', break: '#9b8cff', bridge: '#4dd6e0' };

export const SKINS = {
  ice: { a: '#6fd0ff', b: '#1b6cff', glow: 'rgba(80,180,255,0.55)', bg: '#020611' },
  lime: { a: '#e0ff7a', b: '#6fcf1a', glow: 'rgba(170,255,60,0.5)', bg: '#041003' },
  ember: { a: '#ffcf7a', b: '#ff6a10', glow: 'rgba(255,140,30,0.5)', bg: '#0d0805' },
};

export class Screen {
  constructor(canvas, engine) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.engine = engine;
    this.freq = new Uint8Array(engine.analyser.frequencyBinCount);
    this.wave = new Float32Array(engine.analyser.fftSize);
    this.events = [];
    this.info = null;
    this.skin = SKINS.ice;
    this.seed = 0;
    this.peaks = new Float32Array(48);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.c.width = W * dpr;
    this.c.height = H * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  log(msg) {
    this.events.unshift({ msg, at: performance.now() });
    this.events.length = Math.min(this.events.length, 7);
  }

  draw(playing, rec) {
    const g = this.g;
    const s = this.skin;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    const tw = W / 2 - 3;
    const th = H / 2 - 3;
    const tiles = [
      [0, 0, 'PGM'],
      [W / 2 + 3, 0, 'SCOPE'],
      [0, H / 2 + 3, 'SONG'],
      [W / 2 + 3, H / 2 + 3, 'EVENTS'],
    ];
    for (const [x, y] of tiles) {
      g.fillStyle = s.bg;
      g.fillRect(x, y, tw, th);
    }
    if (!playing && !this.info) {
      this.splash();
      return;
    }
    this.engine.analyser.getByteFrequencyData(this.freq);
    this.engine.analyser.getFloatTimeDomainData(this.wave);
    this.pgm(0, 0, tw, th);
    this.scope(W / 2 + 3, 0, tw, th);
    this.song(0, H / 2 + 3, tw, th);
    this.eventsTile(W / 2 + 3, H / 2 + 3, tw, th, rec);
    for (const [x, y, label] of tiles) this.label(x + 12, y + th - 14, label);
    if (!playing) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, 0, W, H);
      this.bigText('PAUSED', W / 2, H / 2 + 12, 44);
    }
  }

  splash() {
    const g = this.g;
    const s = this.skin;
    const t = performance.now() / 1000;
    for (let i = 0; i < 48; i++) {
      const h = (Math.sin(t * 1.3 + i * 0.35) * 0.5 + 0.5) * 120 + 10;
      g.fillStyle = s.b;
      g.globalAlpha = 0.25;
      g.fillRect(40 + i * 18.5, H - 40 - h, 12, h);
    }
    g.globalAlpha = 1;
    this.bigText('RANGER MUSIC CREATOR', W / 2, H / 2 - 40, 46);
    g.fillStyle = '#cfd8e6';
    g.font = '500 22px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('Automatic, endless, royalty-free music', W / 2, H / 2);
    g.fillStyle = s.a;
    g.font = '700 26px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillText('PRESS ▶ PLAY OR PICK A STYLE', W / 2, H / 2 + 60);
  }

  bigText(text, x, y, size) {
    const g = this.g;
    g.font = `800 ${size}px "Roboto Condensed", "Arial Narrow", Arial, sans-serif`;
    g.textAlign = 'center';
    g.lineWidth = 5;
    g.strokeStyle = '#000';
    g.strokeText(text, x, y);
    g.fillStyle = '#fff';
    g.fillText(text, x, y);
  }

  label(x, y, text) {
    const g = this.g;
    g.font = '700 30px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    g.textAlign = 'left';
    g.lineWidth = 5;
    g.strokeStyle = '#000';
    g.strokeText(text, x, y);
    g.fillStyle = '#f2f2f2';
    g.fillText(text, x, y);
  }

  pgm(x, y, w, h) {
    const g = this.g;
    const s = this.skin;
    const n = 48;
    const bins = this.freq.length;
    const grad = g.createLinearGradient(0, y + h, 0, y);
    grad.addColorStop(0, s.b);
    grad.addColorStop(1, s.a);
    g.save();
    g.shadowColor = s.glow;
    g.shadowBlur = 14;
    const bw = (w - 30) / n;
    for (let i = 0; i < n; i++) {
      // Log-spaced bands from ~30 Hz to ~16 kHz.
      const lo = Math.floor(Math.pow(bins * 0.75, i / n));
      const hi = Math.max(lo + 1, Math.floor(Math.pow(bins * 0.75, (i + 1) / n)));
      let v = 0;
      for (let k = lo; k < hi; k++) v = Math.max(v, this.freq[k]);
      v = (v / 255) ** 1.6;
      this.peaks[i] = Math.max(v, this.peaks[i] - 0.012);
      const bh = v * (h - 120);
      g.fillStyle = grad;
      g.fillRect(x + 15 + i * bw, y + h - 40 - bh, bw - 3, bh);
      g.fillStyle = '#fff';
      g.fillRect(x + 15 + i * bw, y + h - 42 - this.peaks[i] * (h - 120), bw - 3, 2);
    }
    g.restore();
    const info = this.info;
    if (info) {
      g.textAlign = 'left';
      g.font = '800 34px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
      g.fillStyle = '#fff';
      g.fillText(info.styleName, x + 16, y + 42);
      g.font = '500 17px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
      g.fillStyle = '#b8c4d6';
      g.fillText(info.mood || '', x + 16, y + 64);
    }
  }

  scope(x, y, w, h) {
    const g = this.g;
    const s = this.skin;
    g.save();
    g.strokeStyle = s.a;
    g.shadowColor = s.glow;
    g.shadowBlur = 10;
    g.lineWidth = 2;
    g.beginPath();
    const n = 512;
    // Start at a rising zero crossing so the trace stands still.
    let start = 0;
    for (let i = 1; i < this.wave.length - n; i++) {
      if (this.wave[i - 1] < 0 && this.wave[i] >= 0) {
        start = i;
        break;
      }
    }
    for (let i = 0; i < n; i++) {
      const v = this.wave[start + i] || 0;
      const px = x + (i / (n - 1)) * w;
      const py = y + h * 0.55 - v * h * 0.42;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
    g.restore();
    const info = this.info;
    if (!info) return;
    g.textAlign = 'right';
    g.font = '800 40px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillStyle = '#fff';
    g.fillText(info.chord, x + w - 16, y + 46);
    g.font = '600 18px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillStyle = '#b8c4d6';
    g.fillText(`${info.key} · ${info.bpm} BPM`, x + w - 16, y + 70);
  }

  song(x, y, w, h) {
    const g = this.g;
    const info = this.info;
    if (!info) return;
    const col = SECTION_COLOR[info.section] || '#fff';
    g.textAlign = 'left';
    g.font = '800 38px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillStyle = col;
    g.fillText(info.section.toUpperCase() + (info.halftime ? ' ½' : ''), x + 16, y + 46);
    g.font = '600 18px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillStyle = '#b8c4d6';
    g.fillText(`BAR ${info.barInSection + 1}/${info.sectionBars}  ·  NEXT: ${String(info.next).toUpperCase()}`, x + 16, y + 72);
    // Bar progress within the section
    const px = x + 16;
    const pw = w - 32;
    g.fillStyle = '#1b2333';
    g.fillRect(px, y + 86, pw, 10);
    g.fillStyle = col;
    g.fillRect(px, y + 86, pw * ((info.barInSection + 1) / info.sectionBars), 10);
    // Energy
    g.fillStyle = '#8b97aa';
    g.font = '600 15px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillText('ENERGY', px, y + 122);
    g.fillStyle = '#1b2333';
    g.fillRect(px + 64, y + 111, pw - 64, 10);
    const eg = g.createLinearGradient(px + 64, 0, px + pw, 0);
    eg.addColorStop(0, '#3ddc84');
    eg.addColorStop(0.6, '#ffc04d');
    eg.addColorStop(1, '#ff5470');
    g.fillStyle = eg;
    g.fillRect(px + 64, y + 111, (pw - 64) * Math.min(1, info.energy), 10);
    // Layers
    const on = new Set(info.layers);
    const lw = (pw - 7 * 8) / 8;
    LAYER_TAGS.forEach(([id, tag], i) => {
      const lx = px + i * (lw + 8);
      const ly = y + 138;
      g.fillStyle = on.has(id) ? col : '#1b2333';
      g.globalAlpha = on.has(id) ? 0.9 : 1;
      g.fillRect(lx, ly, lw, 40);
      g.globalAlpha = 1;
      g.fillStyle = on.has(id) ? '#000' : '#4b5568';
      g.font = '800 22px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText(tag, lx + lw / 2, ly + 28);
    });
    g.textAlign = 'right';
    g.fillStyle = '#8b97aa';
    g.font = '600 15px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillText(`BAR ${info.bar + 1}`, x + w - 16, y + h - 18);
  }

  eventsTile(x, y, w, h, rec) {
    const g = this.g;
    const now = performance.now();
    g.textAlign = 'left';
    g.font = '600 19px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    this.events.forEach((e, i) => {
      const age = (now - e.at) / 1000;
      g.globalAlpha = Math.max(0.25, 1 - i * 0.13);
      g.fillStyle = age < 1.2 ? this.skin.a : '#d6dce6';
      g.fillText((i === 0 ? '▶ ' : '  ') + e.msg, x + 16, y + 34 + i * 26);
    });
    g.globalAlpha = 1;
    g.textAlign = 'right';
    g.fillStyle = '#8b97aa';
    g.font = '600 15px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillText(`SEED ${this.seed}`, x + w - 16, y + h - 18);
    if (rec) {
      const blink = Math.floor(now / 500) % 2;
      g.fillStyle = blink ? '#ff3b3b' : '#7a1515';
      g.beginPath();
      g.arc(x + w - 30, y + 26, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '700 16px "Roboto Condensed", "Arial Narrow", Arial, sans-serif';
      g.fillText(`REC ${rec}`, x + w - 46, y + 32);
    }
  }
}
