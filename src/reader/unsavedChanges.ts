// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web and desktop: if the window or browser tab is closed right after writing
// on a score, the save (which takes a moment) might not finish. When the page
// is being closed, the document being edited is also kept synchronously in
// localStorage, and saved the next time the app starts.

import type { DocumentModel } from '../core/model';
import type { LibraryRepository } from '../library/repository';

const KEY = 'atril-unsaved-document';

interface Kept {
  id: string;
  at: number;
  model: DocumentModel;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function keepUnsaved(id: string, model: DocumentModel, at = Date.now()): void {
  try {
    storage()?.setItem(KEY, JSON.stringify({ id, at, model } satisfies Kept));
  } catch {
    // No room (a huge document): the normal save still runs.
  }
}

/** Saves the kept document, unless the library has a newer version of it (another tab). */
export async function restoreUnsaved(
  repo: Pick<LibraryRepository, 'getDocument' | 'loadModel' | 'saveModel'>,
) {
  const s = storage();
  let raw: string | null = null;
  try {
    raw = s?.getItem(KEY) ?? null;
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const kept = JSON.parse(raw) as Partial<Kept>;
    if (typeof kept.id !== 'string' || typeof kept.at !== 'number' || kept.model?.formatVersion !== 1) return;
    const row = await repo.getDocument(kept.id);
    const current = await repo.loadModel(kept.id);
    if (!row || !current || row.updatedAt > kept.at) return;
    await repo.saveModel(kept.id, kept.model, current);
  } catch (e) {
    console.warn('[unsaved] not restored:', e);
  } finally {
    try {
      s?.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
