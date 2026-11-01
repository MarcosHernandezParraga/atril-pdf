// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Plain-browser development mode only (not used by the desktop app): SQLite
// compiled to WebAssembly (sql.js), saved in IndexedDB.

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
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void store.set('db', db.export()), 250);
  };

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
