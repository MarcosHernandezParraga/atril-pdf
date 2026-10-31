// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Loads a document and keeps its model with undo/redo history. Every change is
// saved automatically (debounced), so work is never lost. The id can change
// while mounted (concert mode): the previous document is saved first and keeps
// being shown until the next one is ready, so the screen never goes blank.

import { useCallback, useEffect, useRef, useState } from 'react';

import { applyCommand, type Command } from '../core/commands';
import { canRedo, canUndo, createHistory, pushHistory, redo, undo, type History } from '../core/history';
import type { DocumentModel } from '../core/model';
import type { DocumentRow } from '../db/schema';
import { getServices } from '../services';

export interface ViewState {
  page: number;
  mode?: string;
  lookahead?: number;
  splits?: Record<string, number>;
}

export function parseViewState(json: string | null | undefined): ViewState {
  try {
    const v = json ? (JSON.parse(json) as Partial<ViewState>) : {};
    return { page: typeof v.page === 'number' ? v.page : 0, mode: v.mode, lookahead: v.lookahead, splits: v.splits ?? {} };
  } catch {
    return { page: 0, splits: {} };
  }
}

interface Loaded {
  doc: DocumentRow;
  history: History<DocumentModel>;
}

export function useDocument(id: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Model and id of the document whose changes are pending, and what was last saved.
  const pending = useRef<{ id: string; model: DocumentModel; saved: DocumentModel } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    if (!p || p.model === p.saved) return;
    const previous = p.saved;
    p.saved = p.model;
    await getServices().repo.saveModel(p.id, p.model, previous);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await flush();
      const { repo } = getServices();
      const row = await repo.getDocument(id);
      const model = await repo.loadModel(id);
      if (!alive) return;
      if (!row || !model) {
        setError('missing');
        return;
      }
      pending.current = { id, model, saved: model };
      setError(null);
      setLoaded({ doc: row, history: createHistory(model) });
      void repo.markOpened(id);
    })().catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [id, flush]);

  // Save pending changes when leaving the reader.
  useEffect(() => () => void flush(), [flush]);

  const scheduleSave = useCallback(
    (docId: string, model: DocumentModel) => {
      const p = pending.current;
      if (!p || p.id !== docId) return;
      p.model = model;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 400);
    },
    [flush],
  );

  const ready = loaded !== null && loaded.doc.id === id;

  const update = useCallback(
    (fn: (h: History<DocumentModel>) => History<DocumentModel>) => {
      setLoaded((l) => {
        if (!l || l.doc.id !== id) return l; // still loading the next document: ignore edits
        const h = fn(l.history);
        if (h === l.history) return l;
        scheduleSave(l.doc.id, h.present);
        return { ...l, history: h };
      });
    },
    [id, scheduleSave],
  );

  const execute = useCallback(
    (cmd: Command, label: string) => update((h) => pushHistory(h, applyCommand(h.present, cmd), label)),
    [update],
  );
  const doUndo = useCallback(() => update((h) => (canUndo(h) ? undo(h) : h)), [update]);
  const doRedo = useCallback(() => update((h) => (canRedo(h) ? redo(h) : h)), [update]);

  return {
    doc: loaded?.doc ?? null,
    model: loaded?.history.present ?? null,
    history: loaded?.history ?? null,
    ready,
    error,
    execute,
    undo: doUndo,
    redo: doRedo,
    flush,
  };
}
