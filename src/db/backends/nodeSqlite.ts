// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Backend for Node.js environments: the Electron main process (desktop app)
// and the automated tests. Uses the SQLite engine built into Node/Electron
// (`node:sqlite`), so no native module has to be compiled.

import type { SqlExecutor, SqlQuery, SqlResult } from '../executor';
import { normalizeParams } from '../executor';

interface StatementSync {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
  setReturnArrays(enabled: boolean): void;
}

interface DatabaseSync {
  prepare(sql: string): StatementSync;
  exec(sql: string): void;
  close(): void;
}

type DatabaseSyncCtor = new (path: string) => DatabaseSync;

function loadSqlite(): DatabaseSyncCtor {
  // Loaded lazily so bundlers for other platforms never see this module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('node:sqlite') as { DatabaseSync: DatabaseSyncCtor }).DatabaseSync;
}

export function createNodeSqliteExecutor(path: string): SqlExecutor & { raw: DatabaseSync } {
  const DatabaseSync = loadSqlite();
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  const cache = new Map<string, StatementSync>();

  const prepare = (sql: string) => {
    let st = cache.get(sql);
    if (!st) {
      st = db.prepare(sql);
      st.setReturnArrays(true);
      if (cache.size > 200) cache.clear();
      cache.set(sql, st);
    }
    return st;
  };

  const runOne = (q: SqlQuery): SqlResult => {
    const st = prepare(q.sql);
    const params = normalizeParams(q.params);
    switch (q.method) {
      case 'run':
        st.run(...params);
        return { rows: [] };
      case 'get':
        return { rows: st.get(...params) };
      default:
        return { rows: st.all(...params) };
    }
  };

  return {
    raw: db,
    async query(q) {
      return runOne(q);
    },
    async batch(queries) {
      db.exec('BEGIN');
      try {
        const out = queries.map(runOne);
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(script) {
      try {
        db.exec(script);
      } catch (e) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // no transaction was open
        }
        throw e;
      }
    },
    async close() {
      cache.clear();
      db.close();
    },
  };
}
