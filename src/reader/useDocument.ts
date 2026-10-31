// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Loads a document and keeps its model with undo/redo history. Every change is
// saved automatically (debounced), so work is never lost.

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

export function useDocument(id: string) {
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [history, setHistory] = useState<History<DocumentModel> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef<DocumentModel | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<DocumentModel | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { repo } = getServices();
      const row = await repo.getDocument(id);
      const model = await repo.loadModel(id);
      if (!alive) return;
      if (!row || !model) {
        setError('missing');
        return;
      }
      savedRef.current = model;
      latest.current = model;
      setDoc(row);
      setHistory(createHistory(model));
      void repo.markOpened(id);
    })().catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const model = latest.current;
    if (!model || model === savedRef.current) return;
    const previous = savedRef.current;
    savedRef.current = model;
    await getServices().repo.saveModel(id, model, previous);
  }, [id]);

  const scheduleSave = useCallback(
    (model: DocumentModel) => {
      latest.current = model;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 400);
    },
    [flush],
  );

  // Save pending changes when leaving the reader.
  useEffect(() => () => void flush(), [flush]);

  const execute = useCallback(
    (cmd: Command, label: string) => {
      setHistory((h) => {
        if (!h) return h;
        const next = applyCommand(h.present, cmd);
        scheduleSave(next);
        return pushHistory(h, next, label);
      });
    },
    [scheduleSave],
  );

  const doUndo = useCallback(() => {
    setHistory((h) => {
      if (!h || !canUndo(h)) return h;
      const n = undo(h);
      scheduleSave(n.present);
      return n;
    });
  }, [scheduleSave]);

  const doRedo = useCallback(() => {
    setHistory((h) => {
      if (!h || !canRedo(h)) return h;
      const n = redo(h);
      scheduleSave(n.present);
      return n;
    });
  }, [scheduleSave]);

  return {
    doc,
    model: history?.present ?? null,
    history,
    error,
    execute,
    undo: doUndo,
    redo: doRedo,
    flush,
  };
}
