// SPDX-License-Identifier: MIT
// The browser library: liked songs, skipped songs and saved exports, kept in
// IndexedDB on this computer only (nothing leaves the browser).
//
//   likes   { id, time, seed, style, name, features, material, snapshot, voice, kit, info }
//   skips   { id, time, seed, style, features, heardSeconds }
//   library { id, time, name, kind: 'wav' | 'json', blob, size, meta }

const DB = 'ranger';
const VERSION = 1;
const STORES = ['likes', 'skips', 'library'];

let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('this browser has no IndexedDB'));
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbp.catch(() => (dbp = null));
  }
  return dbp;
}

async function run(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('storage was full or blocked'));
  });
}

export const store = {
  add: (s, rec) => run(s, 'readwrite', (o) => o.add({ time: Date.now(), ...rec })),
  put: (s, rec) => run(s, 'readwrite', (o) => o.put(rec)),
  get: (s, id) => run(s, 'readonly', (o) => o.get(id)),
  all: (s) => run(s, 'readonly', (o) => o.getAll()),
  count: (s) => run(s, 'readonly', (o) => o.count()),
  remove: (s, id) => run(s, 'readwrite', (o) => o.delete(id)),
};

// How much the browser lets this page keep, for the library footer.
export async function usage() {
  try {
    const e = await navigator.storage.estimate();
    return { used: e.usage || 0, quota: e.quota || 0 };
  } catch {
    return null;
  }
}

export function fmtBytes(n) {
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} kB`;
}
