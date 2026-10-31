// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop backend: queries run in the Electron main process (SQLite built into
// Electron) and travel through the preload bridge.

import type { DesktopBridge } from '../../platform/desktopBridge';
import { normalizeParams, type SqlExecutor } from '../executor';

export function createDesktopExecutor(bridge: DesktopBridge): SqlExecutor {
  return {
    query: (q) => bridge.db.query({ ...q, params: normalizeParams(q.params) }),
    batch: (qs) => bridge.db.batch(qs.map((q) => ({ ...q, params: normalizeParams(q.params) }))),
    exec: (s) => bridge.db.exec(s),
  };
}
