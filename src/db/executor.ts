// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Minimal contract every SQLite backend implements (expo-sqlite on iOS and
// Android, SQLite built into Electron on desktop, sql.js in a plain browser,
// node:sqlite in tests). Drizzle ORM talks to it through its sqlite-proxy
// driver, so the schema and the queries are identical everywhere.

export type SqlMethod = 'run' | 'all' | 'values' | 'get';

export interface SqlQuery {
  sql: string;
  params: unknown[];
  method: SqlMethod;
}

/**
 * `all`/`values` must return an array of rows, each row an array of column
 * values; `get` returns a single row array (or undefined).
 */
export interface SqlResult {
  rows: unknown;
}

export interface SqlExecutor {
  query(q: SqlQuery): Promise<SqlResult>;
  /** Runs all the queries atomically, inside one transaction. */
  batch(queries: SqlQuery[]): Promise<SqlResult[]>;
  /** Runs a script with several statements (migrations). */
  exec(script: string): Promise<void>;
  close?(): Promise<void>;
}

/** Serialises calls so concurrent awaits never interleave inside a transaction. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T> | T): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

/** Converts values that SQLite cannot bind (booleans, undefined) to supported ones. */
export function normalizeParams(params: unknown[]): (string | number | null | Uint8Array)[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'bigint') return Number(p);
    if (p instanceof Uint8Array) return p;
    if (typeof p === 'number' || typeof p === 'string') return p;
    return JSON.stringify(p);
  });
}
