// SPDX-License-Identifier: MIT
// The LIBRARY window: liked songs and the exports saved in this browser.
import { store, usage, fmtBytes } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const when = (t) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export class Library {
  // opts: { playLike(rec), playWav(blob, name), loadJson(obj, name), download(blob, name),
  //         tasteInfo() -> string, resetTaste(), changed() (likes or skips changed) }
  constructor(root, opts) {
    this.root = root;
    this.o = opts;
    this.tab = 'likes';
    root.innerHTML = `
      <div class="save-card" role="dialog" aria-label="Library">
        <button class="help-close" data-act="close" aria-label="Close">×</button>
        <h2>LIBRARY</h2>
        <p class="save-hint">Kept in this browser only (IndexedDB). Liked songs teach TASTE what to play more of.</p>
        <div class="lib-tabs"><button data-tab="likes">♥ LIKED</button><button data-tab="library">SAVED</button></div>
        <div class="lib-list"></div>
        <div class="lib-foot">
          <span data-out="taste"></span>
          <span class="save-grow"></span>
          <span data-out="usage"></span>
          <button data-act="export-likes">EXPORT LIKES .JSON</button>
          <button data-act="reset">RESET TASTE</button>
        </div>
      </div>`;
    this.list = root.querySelector('.lib-list');
    root.addEventListener('click', (e) => {
      if (e.target === root) return this.close();
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      if (tab) {
        this.tab = tab;
        return this.render();
      }
      const b = e.target.closest('[data-act]');
      if (b) this.act(b.dataset.act, b.closest('[data-id]')?.dataset.id).catch((err) => this.o.toast?.(err.message));
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      e.stopPropagation();
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(tab) {
    if (tab) this.tab = tab;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.root.hidden = true;
  }

  async render() {
    for (const b of this.root.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === this.tab);
    this.root.querySelector('[data-out=taste]').textContent = this.o.tasteInfo();
    let rows;
    try {
      rows = (await store.all(this.tab)).sort((a, b) => b.time - a.time);
    } catch (err) {
      this.list.innerHTML = `<div class="lib-empty">${esc(err.message)}</div>`;
      return;
    }
    if (!rows.length) {
      this.list.innerHTML = `<div class="lib-empty">${this.tab === 'likes' ? 'No liked songs yet. Press ♥ LIKE while something you like is playing.' : 'Nothing saved here yet. In SAVE, pick BROWSER as the place.'}</div>`;
    } else if (this.tab === 'likes') {
      this.list.innerHTML = rows
        .map(
          (r) => `<div class="lib-row" data-id="${r.id}">
            <div class="lib-main"><b>♥ ${esc(r.name)}</b><small>${when(r.time)} · seed ${r.seed}${r.info ? ` · ${esc(r.info.key)} · ${r.info.bpm} BPM` : ''}</small></div>
            <button data-act="play">▶ PLAY</button><button data-act="json">.JSON</button><button data-act="del">DELETE</button></div>`,
        )
        .join('');
    } else {
      this.list.innerHTML = rows
        .map(
          (r) => `<div class="lib-row" data-id="${r.id}">
            <div class="lib-main"><b>${esc(r.name)}</b><small>${when(r.time)} · .${r.kind} · ${fmtBytes(r.size || r.blob?.size || 0)}${r.meta?.length ? ` · ${r.meta.length.toFixed(1)} s` : ''}</small></div>
            <button data-act="play">${r.kind === 'wav' ? '▶ PLAY' : 'LOAD'}</button><button data-act="dl">DOWNLOAD</button><button data-act="del">DELETE</button></div>`,
        )
        .join('');
    }
    const u = await usage();
    this.root.querySelector('[data-out=usage]').textContent = u && u.quota ? `${fmtBytes(u.used)} used of ${fmtBytes(u.quota)}` : '';
  }

  async act(a, idStr) {
    if (a === 'close') return this.close();
    if (a === 'reset') {
      if (!confirm('Forget what TASTE has learned? Liked songs stay in the list; the skips and the trained model are cleared.')) return;
      for (const s of await store.all('skips')) await store.remove('skips', s.id);
      this.o.resetTaste();
      return this.render();
    }
    if (a === 'export-likes') {
      const likes = await store.all('likes');
      const skips = await store.all('skips');
      const data = { app: 'ranger-music-creator', kind: 'taste-data', saved: new Date().toISOString(), likes, skips };
      return this.o.download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `ranger-likes-${likes.length}.json`);
    }
    const id = Number(idStr);
    const rec = await store.get(this.tab, id);
    if (!rec) return this.render();
    if (a === 'del') {
      await store.remove(this.tab, id);
      if (this.tab === 'likes') this.o.changed();
      return this.render();
    }
    if (this.tab === 'likes') {
      if (a === 'play') {
        this.close();
        return this.o.playLike(rec);
      }
      if (a === 'json') return this.o.download(new Blob([JSON.stringify(rec)], { type: 'application/json' }), `${rec.name.replace(/[^\w.-]+/g, '-')}.json`);
    }
    if (a === 'dl') return this.o.download(rec.blob, `${rec.name}.${rec.kind}`);
    if (a === 'play') {
      if (rec.kind === 'wav') return this.o.playWav(rec.blob, rec.name);
      this.close();
      return this.o.loadJson(JSON.parse(await rec.blob.text()), rec.name);
    }
  }
}
