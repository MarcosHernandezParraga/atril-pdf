// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { createExpoSqliteExecutor } from './backends/expoSqlite';
import { openDatabase, type OpenedDatabase } from './database';

export async function openAppDatabase(): Promise<OpenedDatabase> {
  return openDatabase(await createExpoSqliteExecutor());
}
