// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.

/** Index where a row dragged from `from` by `dy` pixels would land. */
export function dropIndex(from: number, dy: number, rowHeight: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(from + dy / Math.max(1, rowHeight))));
}

/** Vertical offset of row `i` while another row is being dragged. */
export function shiftFor(i: number, from: number, to: number, rowHeight: number): number {
  if (from < 0 || i === from) return 0;
  if (from < to && i > from && i <= to) return -rowHeight;
  if (from > to && i < from && i >= to) return rowHeight;
  return 0;
}

/** Moves an element of a list (returns a new list). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [it] = next.splice(from, 1);
  if (it === undefined) return next;
  next.splice(Math.max(0, Math.min(next.length, to)), 0, it);
  return next;
}
