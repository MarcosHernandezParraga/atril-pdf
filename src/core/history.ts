// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Undo/redo history. Models are immutable and share structure, so each entry
// only stores references; keeping hundreds of steps is cheap.

export interface HistoryEntry<T> {
  state: T;
  label: string;
}

export interface History<T> {
  past: HistoryEntry<T>[];
  present: T;
  /** Label of the change that produced `present` (used for "Undo <label>"). */
  presentLabel: string;
  future: HistoryEntry<T>[];
  limit: number;
}

export function createHistory<T>(initial: T, limit = 300): History<T> {
  return { past: [], present: initial, presentLabel: '', future: [], limit };
}

export function pushHistory<T>(h: History<T>, next: T, label: string): History<T> {
  if (next === h.present) return h;
  const past = [...h.past, { state: h.present, label: h.presentLabel }];
  if (past.length > h.limit) past.splice(0, past.length - h.limit);
  return { ...h, past, present: next, presentLabel: label, future: [] };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0;
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0;
}

export function undo<T>(h: History<T>): History<T> {
  const prev = h.past[h.past.length - 1];
  if (!prev) return h;
  return {
    ...h,
    past: h.past.slice(0, -1),
    present: prev.state,
    presentLabel: prev.label,
    future: [{ state: h.present, label: h.presentLabel }, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  const next = h.future[0];
  if (!next) return h;
  return {
    ...h,
    past: [...h.past, { state: h.present, label: h.presentLabel }],
    present: next.state,
    presentLabel: next.label,
    future: h.future.slice(1),
  };
}

/** Label of the change that would be undone next. */
export function undoLabel<T>(h: History<T>): string | null {
  return h.past.length > 0 ? h.presentLabel : null;
}

export function redoLabel<T>(h: History<T>): string | null {
  return h.future[0]?.label ?? null;
}
