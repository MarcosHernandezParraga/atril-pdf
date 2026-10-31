// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// SQLite backend for iOS and Android (expo-sqlite).

import * as SQLite from 'expo-sqlite';

import { normalizeParams, SerialQueue, type SqlExecutor, type SqlQuery, type SqlResult } from '../executor';

type Target = Pick<SQLite.SQLiteDatabase, 'runAsync' | 'prepareAsync'>;

async function runOne(target: Target, q: SqlQuery): Promise<SqlResult> {
  const params = normalizeParams(q.params) as SQLite.SQLiteBindValue[];
  if (q.method === 'run') {
    await target.runAsync(q.sql, params);
    return { rows: [] };
  }
  const st = await target.prepareAsync(q.sql);
  try {
    const result = await st.executeForRawResultAsync(params);
    if (q.method === 'get') return { rows: (await result.getFirstAsync()) ?? undefined };
    return { rows: await result.getAllAsync() };
  } finally {
    await st.finalizeAsync();
  }
}

export async function createExpoSqliteExecutor(name = 'atril.db'): Promise<SqlExecutor> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const queue = new SerialQueue();
  return {
    query: (q) => queue.run(() => runOne(db, q)),
    batch: (queries) =>
      queue.run(async () => {
        const out: SqlResult[] = [];
        await db.withExclusiveTransactionAsync(async (txn) => {
          for (const q of queries) out.push(await runOne(txn, q));
        });
        return out;
      }),
    exec: (script) =>
      queue.run(async () => {
        try {
          await db.execAsync(script);
        } catch (e) {
          await db.execAsync('ROLLBACK').catch(() => undefined);
          throw e;
        }
      }),
    close: () => db.closeAsync(),
  };
}
