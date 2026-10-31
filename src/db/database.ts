// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';

import type { SqlExecutor } from './executor';
import { MIGRATIONS } from './migrations';
import { schema } from './schema';

export type AppDatabase = SqliteRemoteDatabase<typeof schema>;

export interface OpenedDatabase {
  db: AppDatabase;
  executor: SqlExecutor;
}

export async function getSchemaVersion(executor: SqlExecutor): Promise<number> {
  const r = await executor.query({ sql: 'PRAGMA user_version', params: [], method: 'get' });
  const row = r.rows as unknown[] | undefined;
  return Number(row?.[0] ?? 0);
}

export async function migrate(executor: SqlExecutor): Promise<void> {
  const current = await getSchemaVersion(executor);
  for (let v = current; v < MIGRATIONS.length; v++) {
    await executor.exec(`BEGIN;\n${MIGRATIONS[v]}\nPRAGMA user_version = ${v + 1};\nCOMMIT;`);
  }
}

export async function openDatabase(executor: SqlExecutor): Promise<OpenedDatabase> {
  await migrate(executor);
  const db = drizzle(
    async (sql, params, method) => (await executor.query({ sql, params, method })) as { rows: any[] }, 
    async (queries) =>
      (await executor.batch(queries.map((q) => ({ sql: q.sql, params: q.params, method: q.method })))) as { rows: any[] }[],
    { schema },
  );
  return { db, executor };
}
