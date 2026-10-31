// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Drag a document (press and hold, then move) and drop it on a folder.
// Folder tiles register themselves as drop targets; their position on screen
// is measured when the drag starts, and the pointer is hit-tested against them.

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { DocumentRow } from '../db/schema';
import type { DocDragHandlers, Measurable } from './DocumentCard';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DragState {
  doc: DocumentRow;
  /** Pointer position relative to the drag layer. */
  x: number;
  y: number;
  overId: string | null;
}

/** Folder id under a point, if any (pure, used by tests too). */
export function hitTarget(rects: Map<string, Rect>, x: number, y: number): string | null {
  for (const [id, r] of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return id.replace(/^bar:/, '');
  }
  return null;
}

function haptic(kind: 'start' | 'over' | 'drop') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'start') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (kind === 'over') void Haptics.selectionAsync();
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // haptics are optional
  }
}

export function useDragToFolder({
  onDrop,
  onHoldWithoutMoving,
}: {
  onDrop: (doc: DocumentRow, folderId: string) => void;
  /** Long press released without moving: show the document menu instead. */
  onHoldWithoutMoving: (doc: DocumentRow) => void;
}) {
  const targets = useRef(new Map<string, Measurable>());
  const rects = useRef(new Map<string, Rect>());
  const layer = useRef<Measurable | null>(null);
  const layerOrigin = useRef({ x: 0, y: 0 });
  const startPoint = useRef({ x: 0, y: 0 });
  const lastOver = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const callbacks = useRef({ onDrop, onHoldWithoutMoving });
  useEffect(() => {
    callbacks.current = { onDrop, onHoldWithoutMoving };
  });

  const measure = (key: string, view: Measurable) =>
    view.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) rects.current.set(key, { x, y, w, h });
    });

  const handlers = useMemo<DocDragHandlers>(
    () => ({
      onStart: (doc, x, y) => {
        rects.current.clear();
        for (const [key, view] of targets.current) measure(key, view);
        layer.current?.measureInWindow((lx, ly) => (layerOrigin.current = { x: lx, y: ly }));
        startPoint.current = { x, y };
        lastOver.current = null;
        haptic('start');
        setDrag({ doc, x: x - layerOrigin.current.x, y: y - layerOrigin.current.y, overId: null });
      },
      onMove: (x, y) => {
        const overId = hitTarget(rects.current, x, y);
        if (overId && overId !== lastOver.current) haptic('over');
        lastOver.current = overId;
        setDrag((d) =>
          d ? { ...d, x: x - layerOrigin.current.x, y: y - layerOrigin.current.y, overId } : d,
        );
      },
      onEnd: () => {
        setDrag((d) => {
          if (!d) return null;
          const target = lastOver.current;
          const moved =
            Math.hypot(
              d.x + layerOrigin.current.x - startPoint.current.x,
              d.y + layerOrigin.current.y - startPoint.current.y,
            ) > 12;
          if (target) {
            haptic('drop');
            setTimeout(() => callbacks.current.onDrop(d.doc, target), 0);
          } else if (!moved) {
            setTimeout(() => callbacks.current.onHoldWithoutMoving(d.doc), 0);
          }
          return null;
        });
      },
    }),
    [],
  );

  // Ref callbacks are cached per folder: a new function on every render would
  // make React detach and re-attach the tile, forgetting its measured position.
  const refCache = useRef(new Map<string, (view: Measurable | null) => void>());
  const cachedRef = (key: string, make: () => (view: Measurable | null) => void) => {
    let fn = refCache.current.get(key);
    if (!fn) {
      fn = make();
      refCache.current.set(key, fn);
    }
    return fn;
  };

  /** Ref callback for a folder tile (drop target). */
  const target = useCallback(
    (folderId: string) =>
      cachedRef(folderId, () => (view: Measurable | null) => {
        if (view) targets.current.set(folderId, view);
        else {
          targets.current.delete(folderId);
          rects.current.delete(folderId);
        }
      }),
    [],
  );

  /** Targets that only appear while dragging (the floating folder bar): measured when laid out. */
  const lateTarget = useCallback((folderId: string) => {
    const key = `bar:${folderId}`;
    return cachedRef(key, () => (view: Measurable | null) => {
      if (view) {
        targets.current.set(key, view);
        setTimeout(() => measure(key, view), 30);
      } else {
        targets.current.delete(key);
        rects.current.delete(key);
      }
    });
  }, []);

  const layerRef = useCallback((view: Measurable | null) => {
    layer.current = view;
  }, []);

  return { drag, handlers, target, lateTarget, layerRef };
}
