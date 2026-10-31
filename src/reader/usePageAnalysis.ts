// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Asynchronous analysis of pages (smart split point between systems, end of
// the first system for the look-ahead strip, content margins), cached per page.

import { useEffect, useState } from 'react';

import {
  detectContentMargins,
  detectFirstSystemEnd,
  detectSplitPoint,
  type GrayImage,
} from '../core/contentDetection';
import type { Margins, PageRef } from '../core/model';
import { getServices } from '../services';

export interface PageAnalysis {
  split: number | null;
  firstSystemEnd: number | null;
  margins: Margins | null;
}

const cache = new Map<string, Promise<PageAnalysis>>();

function keyOf(page: PageRef): string {
  return page.kind === 'pdf' ? `${page.sourceId}:${page.pageIndex}` : page.id;
}

/** Analysis is done on the uncropped page; convert a fraction of it to a fraction of the cropped page. */
export function toCroppedFraction(page: PageRef, y: number): number {
  const c = page.crop;
  if (!c) return y;
  const h = 1 - c.top - c.bottom;
  return Math.max(0, Math.min(1, (y - c.top) / Math.max(0.05, h)));
}

export function analysePage(page: PageRef): Promise<PageAnalysis> {
  const k = keyOf(page);
  let p = cache.get(k);
  if (!p) {
    p = getServices()
      .renderer.gray(page)
      .then((g: GrayImage | null) =>
        g
          ? {
              split: detectSplitPoint(g),
              firstSystemEnd: detectFirstSystemEnd(g),
              margins: detectContentMargins(g),
            }
          : { split: null, firstSystemEnd: null, margins: null },
      )
      .catch(() => ({ split: null, firstSystemEnd: null, margins: null }));
    cache.set(k, p);
  }
  return p;
}

export function usePageAnalysis(page: PageRef | undefined, enabled: boolean): PageAnalysis | null {
  const [result, setResult] = useState<{ page: PageRef; analysis: PageAnalysis } | null>(null);
  useEffect(() => {
    if (!page || !enabled) return;
    let alive = true;
    void analysePage(page).then((analysis) => alive && setResult({ page, analysis }));
    return () => {
      alive = false;
    };
  }, [page, enabled]);
  return result && result.page === page && enabled ? result.analysis : null;
}
