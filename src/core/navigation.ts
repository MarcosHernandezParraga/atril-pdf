// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Page-turning logic for every view mode. Discrete modes are modelled as an
// ordered list of "stops" (what the screen shows after each turn); next and
// previous simply move along that list. This is the single place used by
// screen taps, swipes, the keyboard and Bluetooth pedals, so all of them always
// behave the same way.

export type ViewMode = 'horizontal' | 'half-page' | 'two-page' | 'vertical-lookahead' | 'vertical-continuous';

export type HalfPageStyle = 'stand' | 'scroll';

export interface TwoPageOptions {
  /** Show the first page alone on the right, like a printed book. */
  coverAlone: boolean;
  /** Advance two pages (book) or one page (sheet music: the right page moves to the left). */
  step: 1 | 2;
}

export type Stop =
  /** A single full page. */
  | { kind: 'page'; page: number }
  /**
   * Half-page turn: the top part of the screen already shows the top of `top`
   * (the next page) while the bottom still shows the bottom of `bottom` (the
   * page being played).
   */
  | { kind: 'half'; top: number; bottom: number }
  /** Two pages side by side; `null` is an empty slot. */
  | { kind: 'spread'; left: number | null; right: number | null };

export interface StopOptions {
  twoPage: TwoPageOptions;
}

export const DEFAULT_STOP_OPTIONS: StopOptions = { twoPage: { coverAlone: false, step: 2 } };

/**
 * Builds the stops for a list of page indices (normally 0..n-1, or the page
 * range of a set-list item). Not used for 'vertical-continuous'.
 */
export function buildStops(
  pages: readonly number[],
  mode: ViewMode,
  opts: StopOptions = DEFAULT_STOP_OPTIONS,
): Stop[] {
  const n = pages.length;
  if (n === 0) return [];
  switch (mode) {
    case 'horizontal':
    case 'vertical-lookahead':
    case 'vertical-continuous':
      return pages.map((page) => ({ kind: 'page', page }));
    case 'half-page': {
      const stops: Stop[] = [];
      for (let i = 0; i < n; i++) {
        stops.push({ kind: 'page', page: pages[i]! });
        if (i + 1 < n) stops.push({ kind: 'half', top: pages[i + 1]!, bottom: pages[i]! });
      }
      return stops;
    }
    case 'two-page':
      return buildSpreads(pages, opts.twoPage);
  }
}

function buildSpreads(pages: readonly number[], o: TwoPageOptions): Stop[] {
  const n = pages.length;
  const at = (i: number): number | null => (i >= 0 && i < n ? pages[i]! : null);
  const stops: Stop[] = [];
  if (o.step === 1) {
    if (o.coverAlone) stops.push({ kind: 'spread', left: null, right: at(0) });
    if (n === 1) {
      if (!o.coverAlone) stops.push({ kind: 'spread', left: at(0), right: null });
      return stops;
    }
    for (let i = 0; i + 1 < n; i++) stops.push({ kind: 'spread', left: at(i), right: at(i + 1) });
    return stops;
  }
  let i = 0;
  if (o.coverAlone) {
    stops.push({ kind: 'spread', left: null, right: at(0) });
    i = 1;
  }
  for (; i < n; i += 2) stops.push({ kind: 'spread', left: at(i), right: at(i + 1) });
  return stops;
}

/** Pages visible in a stop, top/left first. */
export function pagesOfStop(stop: Stop): number[] {
  switch (stop.kind) {
    case 'page':
      return [stop.page];
    case 'half':
      return [stop.top, stop.bottom];
    case 'spread':
      return [stop.left, stop.right].filter((p): p is number => p !== null);
  }
}

/** The page the musician is reading at this stop (used for page numbers and resume). */
export function primaryPage(stop: Stop): number {
  switch (stop.kind) {
    case 'page':
      return stop.page;
    case 'half':
      return stop.bottom;
    case 'spread':
      return (stop.left ?? stop.right)!;
  }
}

/** Index of the stop to show when jumping to `page`. */
export function stopIndexForPage(stops: readonly Stop[], page: number): number {
  const primary = stops.findIndex((s) => s.kind !== 'half' && primaryPage(s) === page);
  if (primary >= 0) return primary;
  const containing = stops.findIndex((s) => s.kind !== 'half' && pagesOfStop(s).includes(page));
  if (containing >= 0) return containing;
  // Page outside the list: closest page before it.
  let best = 0;
  stops.forEach((s, i) => {
    if (s.kind !== 'half' && primaryPage(s) <= page) best = i;
  });
  return best;
}

export type StepResult = { index: number } | { boundary: 'start' | 'end' };

export function step(stopCount: number, index: number, direction: 1 | -1): StepResult {
  const next = index + direction;
  if (next < 0) return { boundary: 'start' };
  if (next >= stopCount) return { boundary: 'end' };
  return { index: next };
}

// ---------------------------------------------------------------------------
// Set lists: several documents (or page ranges) played one after another.
// ---------------------------------------------------------------------------

export interface SequencePosition {
  item: number;
  stop: number;
}

/**
 * Moves through a set list. `stopCounts[i]` is the number of stops of item i.
 * When the end of a piece is reached, "next" goes to the first stop of the
 * following piece; "previous" at the start goes to the last stop of the previous one.
 * Returns null when there is nothing further in that direction.
 */
export function stepSequence(
  stopCounts: readonly number[],
  pos: SequencePosition,
  direction: 1 | -1,
): SequencePosition | null {
  const r = step(stopCounts[pos.item] ?? 0, pos.stop, direction);
  if ('index' in r) return { item: pos.item, stop: r.index };
  let item = pos.item + direction;
  while (item >= 0 && item < stopCounts.length) {
    const count = stopCounts[item]!;
    if (count > 0) return { item, stop: direction === 1 ? 0 : count - 1 };
    item += direction;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Vertical continuous mode.
// ---------------------------------------------------------------------------

export interface ContinuousLayout {
  /** Top of each page, in layout units. */
  offsets: number[];
  heights: number[];
  total: number;
}

export function computeContinuousLayout(heights: readonly number[], gap: number): ContinuousLayout {
  const offsets: number[] = [];
  let y = 0;
  heights.forEach((h, i) => {
    offsets.push(y);
    y += h + (i < heights.length - 1 ? gap : 0);
  });
  return { offsets, heights: [...heights], total: y };
}

export function maxScroll(layout: ContinuousLayout, viewport: number): number {
  return Math.max(0, layout.total - viewport);
}

/**
 * Next scroll position for a pedal/tap "next": one screen minus an overlap, so the
 * last system that was being read stays visible at the top.
 * Returns null when already at the end.
 */
export function nextScroll(
  layout: ContinuousLayout,
  offset: number,
  viewport: number,
  overlap: number,
): number | null {
  const max = maxScroll(layout, viewport);
  if (offset >= max - 0.5) return null;
  const advance = Math.max(1, viewport * (1 - clampOverlap(overlap)));
  return Math.min(max, offset + advance);
}

export function previousScroll(
  layout: ContinuousLayout,
  offset: number,
  viewport: number,
  overlap: number,
): number | null {
  if (offset <= 0.5) return null;
  const advance = Math.max(1, viewport * (1 - clampOverlap(overlap)));
  return Math.max(0, offset - advance);
}

function clampOverlap(o: number): number {
  return Math.max(0, Math.min(0.6, o));
}

/** Page shown at the top of the viewport (the one being read). */
export function pageAtScroll(layout: ContinuousLayout, offset: number): number {
  if (layout.offsets.length === 0) return 0;
  // A page counts as current once less than 40% of it remains hidden above.
  for (let i = layout.offsets.length - 1; i >= 0; i--) {
    const top = layout.offsets[i]!;
    if (offset + 1 >= top) {
      const h = layout.heights[i]!;
      if (offset - top > h * 0.6 && i + 1 < layout.offsets.length) return i + 1;
      return i;
    }
  }
  return 0;
}

export function scrollForPage(layout: ContinuousLayout, page: number, viewport: number): number {
  const top = layout.offsets[Math.max(0, Math.min(page, layout.offsets.length - 1))] ?? 0;
  return Math.min(top, maxScroll(layout, viewport));
}
