// SPDX-License-Identifier: MIT
// Knobs, faders and lit buttons for the desk.

export function knob(el, { value = 0.5, min = 0, max = 1, def = value, onChange = () => {}, format } = {}) {
  el.classList.add('knob');
  el.innerHTML = '<div class="knob-cap"><i class="knob-pointer"></i></div>';
  el.tabIndex = 0;
  const cap = el.firstChild;
  let v = value;
  const title = () => (el.title = format ? format(v) : '');
  const draw = () => {
    const x = (v - min) / (max - min);
    cap.style.transform = `rotate(${-140 + 280 * x}deg)`;
    title();
  };
  const set = (nv, silent) => {
    nv = Math.max(min, Math.min(max, nv));
    if (nv === v && silent) return draw();
    v = nv;
    draw();
    if (!silent) onChange(v);
  };
  let startY = 0;
  let startV = 0;
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    startY = e.clientY;
    startV = v;
    el.classList.add('active');
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    const range = (max - min) * (e.shiftKey ? 0.2 : 1);
    set(startV + ((startY - e.clientY) / 160) * range);
  });
  el.addEventListener('pointerup', () => el.classList.remove('active'));
  el.addEventListener('dblclick', () => set(def));
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    set(v - Math.sign(e.deltaY) * (max - min) * 0.03);
  }, { passive: false });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(v + (max - min) * 0.02);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(v - (max - min) * 0.02);
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  draw();
  return { set, get: () => v, el };
}

export function fader(el, { value = 0.75, onChange = () => {}, onTouch = () => {} } = {}) {
  el.classList.add('fader');
  el.innerHTML = '<div class="fader-ticks"></div><div class="fader-slot"><div class="fader-meter"></div></div><div class="fader-cap"></div>';
  const cap = el.querySelector('.fader-cap');
  const meter = el.querySelector('.fader-meter');
  let v = value;
  const travel = () => el.clientHeight - cap.offsetHeight;
  const draw = () => {
    cap.style.top = `${(1 - v) * travel()}px`;
  };
  const set = (nv, silent) => {
    v = Math.max(0, Math.min(1, nv));
    draw();
    if (!silent) onChange(v);
  };
  const fromY = (y) => {
    const r = el.getBoundingClientRect();
    const scale = r.height / el.clientHeight || 1;
    return 1 - ((y - r.top) / scale - cap.offsetHeight / 2) / travel();
  };
  let grab = 0;
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    onTouch();
    const onCap = e.target === cap;
    grab = onCap ? fromY(e.clientY) - v : 0;
    if (!onCap) set(fromY(e.clientY));
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    set(fromY(e.clientY) - grab);
  });
  el.addEventListener('dblclick', () => {
    onTouch();
    set(0.75);
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    onTouch();
    set(v - Math.sign(e.deltaY) * 0.02);
  }, { passive: false });
  requestAnimationFrame(draw);
  return {
    set,
    get: () => v,
    redraw: draw,
    meter: (level) => {
      meter.style.height = `${Math.min(100, level * 100)}%`;
    },
  };
}

// A lit key with a caption. color: green | red | white | amber | blue
export function key(parent, { label = '', color = 'white', num, tag, size = '', onClick, title } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  if (num != null) wrap.insertAdjacentHTML('beforeend', `<span class="num">${num}</span>`);
  const b = document.createElement('button');
  b.className = `key ${size}`;
  b.dataset.color = color;
  if (title) b.title = title;
  b.setAttribute('aria-label', (tag || label).replace(/<br>/g, ' '));
  wrap.appendChild(b);
  if (tag) wrap.insertAdjacentHTML('beforeend', `<span class="tag">${tag}</span>`);
  if (label) wrap.insertAdjacentHTML('beforeend', `<span class="cap">${label}</span>`);
  if (onClick) b.addEventListener('click', (e) => onClick(e));
  parent.appendChild(wrap);
  return {
    el: b,
    wrap,
    on(state) {
      b.classList.toggle('on', !!state);
      b.setAttribute('aria-pressed', state ? 'true' : 'false');
    },
    flash(ms = 160) {
      b.classList.add('on');
      setTimeout(() => b.classList.remove('on'), ms);
    },
  };
}
