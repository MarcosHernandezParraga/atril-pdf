// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { getDesktopBridge } from '../platform/desktopBridge';
import { createDesktopExecutor } from './backends/desktop';
import { createSqlJsExecutor } from './backends/sqljs';
import { openDatabase, type OpenedDatabase } from './database';

/** Web build: desktop app (Electron) or plain browser during development. */
export async function openAppDatabase(): Promise<OpenedDatabase> {
  const bridge = getDesktopBridge();
  return openDatabase(bridge ? createDesktopExecutor(bridge) : await createSqlJsExecutor());
}
