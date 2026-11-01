// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web version (not used by the desktop app): SQLite compiled to WebAssembly
// (sql.js), saved in IndexedDB.

import { idbStore, loadScript } from '../../platform/loadScript';
import { normalizeParams, SerialQueue, type SqlExecutor, type SqlQuery, type SqlResult } from '../executor';
import { assetUrl } from '../../platform/basePath';

interface SqlJsStatement {
  bind(params: unknown[]): void;
  step(): boolean;
  get(): unknown[];
  free(): void;
}
interface SqlJsDatabase {
  prepare(sql: string): SqlJsStatement;
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): void;
  export(): Uint8Array;
}
type InitSqlJs = (opts: { locateFile: (f: string) => string }) => Promise<{
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}>;

export async function createSqlJsExecutor(): Promise<SqlExecutor> {
  await loadScript(assetUrl('/vendor/sqljs/sql-wasm-browser.js'));
  const init = (window as unknown as { initSqlJs: InitSqlJs }).initSqlJs;
  const SQL = await init({ locateFile: (f) => assetUrl(`/vendor/sqljs/${f}`) });
  const store = idbStore('atril-dev-db');
  const saved = await store.get<Uint8Array>('db');
  const db = new SQL.Database(saved ?? undefined);
  db.exec('PRAGMA foreign_keys = ON;');
  const queue = new SerialQueue();
  // Changes are saved a moment after they happen (several quick changes are
  // saved together) and right away when the app goes to the background or is
  // closed, so that nothing is lost when the system closes it. A failed save
  // is tried again with the next change or the next time the app is hidden.
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let unsaved = false;
  const save = async () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    if (!unsaved) return;
    unsaved = false;
    try {
      await store.set('db', db.export());
    } catch (e) {
      unsaved = true;
      console.warn('[db] not saved yet:', e);
    }
  };
  const persist = () => {
    unsaved = true;
    if (saveTimer) clearTimeout(saveTimer);
    // In the background, at once: the system may close the app at any moment.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') void save();
    else saveTimer = setTimeout(() => void save(), 250);
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void save();
    });
    window.addEventListener('pagehide', () => void save());
  }

  const runOne = (q: SqlQuery): SqlResult => {
    const params = normalizeParams(q.params);
    if (q.method === 'run') {
      db.run(q.sql, params);
      return { rows: [] };
    }
    const st = db.prepare(q.sql);
    try {
      st.bind(params);
      const rows: unknown[][] = [];
      while (st.step()) rows.push(st.get());
      return { rows: q.method === 'get' ? rows[0] : rows };
    } finally {
      st.free();
    }
  };

  return {
    query: (q) =>
      queue.run(() => {
        const r = runOne(q);
        if (q.method === 'run') persist();
        return r;
      }),
    batch: (qs) =>
      queue.run(() => {
        db.exec('BEGIN');
        try {
          const out = qs.map(runOne);
          db.exec('COMMIT');
          persist();
          return out;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      }),
    exec: (script) =>
      queue.run(() => {
        try {
          db.exec(script);
          persist();
        } catch (e) {
          try {
            db.exec('ROLLBACK');
          } catch {
            // no open transaction
          }
          throw e;
        }
      }),
  };
}
