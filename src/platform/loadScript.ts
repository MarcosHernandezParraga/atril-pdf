// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Loads scripts that ship with the app (public/vendor) on web and desktop.
// Nothing is ever loaded from the Internet.

const loaded = new Map<string, Promise<void>>();

export function loadScript(src: string, type: 'classic' | 'module' = 'classic'): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    if (type === 'module') el.type = 'module';
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });
  loaded.set(src, p);
  p.catch(() => loaded.delete(src));
  return p;
}

/** Simple IndexedDB key/value store (browser development mode only). */
export function idbStore(dbName: string, storeName = 'kv') {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(storeName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  const dbp = open();
  const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await dbp;
    return new Promise<T>((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const req = fn(t.objectStore(storeName));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  return {
    get: <T>(key: string) => tx<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
    set: (key: string, value: unknown) => tx('readwrite', (s) => s.put(value, key)).then(() => undefined),
    delete: (key: string) => tx('readwrite', (s) => s.delete(key)).then(() => undefined),
    keys: () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((k) => k.map(String)),
  };
}
