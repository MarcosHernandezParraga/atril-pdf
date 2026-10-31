// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Every PDF opened from outside the app is added to the library automatically
// and opened directly in the reader.

import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';

import i18n from '../i18n';
import { getDesktopBridge } from '../platform/desktopBridge';
import { getServices } from '../services';
import type { ExternalFile } from '../storage/types';
import { dialogs } from '../ui/dialogs';
import { onIncoming, takeIncoming } from './incoming';
import { importFiles, type ImportResult } from './importer';
import { useLibraryRefresh } from './libraryEvents';

export function reportImport(result: ImportResult) {
  for (const f of result.failures) {
    const reason =
      f.reason === 'password' ? i18n.t('library.passwordProtected') : i18n.t('library.notPdf');
    dialogs.toast(i18n.t('library.importFailed', { name: f.name, reason }));
  }
  if (result.documentIds.length > 0 && result.failures.length === 0) {
    dialogs.toast(i18n.t('library.imported', { count: result.documentIds.length }));
  }
}

export async function importAndReport(files: ExternalFile[], folderId: string | null): Promise<ImportResult> {
  const s = getServices();
  const result = await importFiles({ repo: s.repo, storage: s.storage, engine: s.engine }, files, folderId);
  useLibraryRefresh.getState().bump();
  reportImport(result);
  return result;
}

export function useExternalOpen() {
  const handle = useCallback(async (files: ExternalFile[]) => {
    if (files.length === 0) return;
    const result = await importAndReport(files, null);
    if (files.length === 1 && result.documentIds[0]) {
      router.push({ pathname: '/reader/[id]', params: { id: result.documentIds[0] } });
    }
  }, []);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      const toExternal = (fs: { path: string; name: string; size: number }[]): ExternalFile[] =>
        fs.map((f) => ({ kind: 'path', path: f.path, name: f.name, size: f.size }));
      void bridge.files.takePending().then((fs) => handle(toExternal(fs)));
      return bridge.files.onOpen((fs) => void handle(toExternal(fs)));
    }
    void handle(takeIncoming());
    return onIncoming(() => void handle(takeIncoming()));
  }, [handle]);
}
