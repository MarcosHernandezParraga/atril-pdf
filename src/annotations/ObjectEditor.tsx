// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Frame around the selected staff or image: drag it to move it, drag a corner
// to make it bigger or smaller (a staff stretches freely in width and height;
// an image keeps its proportions). A small bar offers duplicate, delete and,
// for a staff, a white background that hides what is underneath.

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import type { PageRef } from '../core/model';
import { viewToPage } from '../core/pageTransform';
import { RADIUS, SPACING, useTheme } from '../theme';
import { IconButton } from '../ui/primitives';
import {
  MIN_IMAGE_SIZE,
  MIN_STAFF_HEIGHT,
  MIN_STAFF_WIDTH,
  moveRect,
  objectRect,
  resizeRect,
  withRect,
  type Corner,
  type PlacedObject,
  type Rect,
} from './objects';
import { ImageShape, StaffShape, viewRect } from './PlacedObjects';

const HANDLE = 28;

type Drag = (tx: number, ty: number) => void;

/** A pan gesture whose callbacks can change without cancelling a drag in progress. */
function useDrag(onStart: () => void, onMove: Drag, onEnd: () => void) {
  const latest = useRef({ onStart, onMove, onEnd });
  useEffect(() => {
    latest.current = { onStart, onMove, onEnd };
  });
  const active = useRef(false);
  return usePanGesture({
    runOnJS: true,
    minDistance: 1,
    maxPointers: 1,
    onActivate: () => {
      active.current = true;
      latest.current.onStart();
    },
    onUpdate: (e) => latest.current.onMove(e.translationX, e.translationY),
    onFinalize: () => {
      if (!active.current) return;
      active.current = false;
      latest.current.onEnd();
    },
  });
}

/** Which corner of the object (in page orientation) is nearest to a page point. */
function nearestCorner(r: Rect, p: { x: number; y: number }): Corner {
  const left = Math.abs(p.x - r.x) < Math.abs(p.x - (r.x + r.w));
  const top = Math.abs(p.y - r.y) < Math.abs(p.y - (r.y + r.h));
  return top ? (left ? 'tl' : 'tr') : left ? 'bl' : 'br';
}

function Handle({
  x,
  y,
  testID,
  color,
  onStart,
  onMove,
  onEnd,
}: {
  x: number;
  y: number;
  testID: string;
  color: string;
  onStart: () => void;
  onMove: Drag;
  onEnd: () => void;
}) {
  const pan = useDrag(onStart, onMove, onEnd);
  return (
    <GestureDetector gesture={pan}>
      <View
        testID={testID}
        style={[
          styles.handle,
          { left: x - HANDLE / 2, top: y - HANDLE / 2 },
          Platform.OS === 'web' ? ({ cursor: 'nwse-resize', touchAction: 'none' } as object) : null,
        ]}
      >
        <View style={[styles.handleDot, { borderColor: color }]} />
      </View>
    </GestureDetector>
  );
}

export function ObjectEditor({
  page,
  viewWidth,
  viewHeight,
  object,
  draft,
  onDraft,
  onCommit,
  onDuplicate,
  onDelete,
  onToggleBackground,
  onDone,
}: {
  page: PageRef;
  viewWidth: number;
  viewHeight: number;
  object: PlacedObject;
  /** The object while it is being moved or resized (drawn here; the original is hidden). */
  draft: PlacedObject | null;
  onDraft: (d: PlacedObject | null) => void;
  onCommit: (o: PlacedObject) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleBackground: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shown = draft ?? object;
  const box = viewRect(page, viewWidth, objectRect(shown));
  const start = useRef<{ rect: Rect; corner: Corner; anchor: { x: number; y: number } } | null>(null);
  const latestDraft = useRef<PlacedObject | null>(null);

  /** A movement on screen converted to page points (works on rotated pages too). */
  const toPageDelta = (tx: number, ty: number) => {
    const a = viewToPage(page, viewWidth, { x: 0, y: 0 });
    const b = viewToPage(page, viewWidth, { x: tx, y: ty });
    return { dx: b.x - a.x, dy: b.y - a.y };
  };
  const setDraft = (d: PlacedObject) => {
    latestDraft.current = d;
    onDraft(d);
  };
  const finish = () => {
    const d = latestDraft.current;
    latestDraft.current = null;
    start.current = null;
    onDraft(null);
    if (d) onCommit(d);
  };

  const move = useDrag(
    () => {
      start.current = { rect: objectRect(object), corner: 'tl', anchor: { x: 0, y: 0 } };
    },
    (tx, ty) => {
      const s = start.current;
      if (!s) return;
      const { dx, dy } = toPageDelta(tx, ty);
      setDraft(withRect(object, moveRect(s.rect, dx, dy)));
    },
    finish,
  );

  const isStaff = object.type === 'staff';
  const corners: { key: string; x: number; y: number }[] = [
    { key: 'a', x: box.left, y: box.top },
    { key: 'b', x: box.left + box.width, y: box.top },
    { key: 'c', x: box.left, y: box.top + box.height },
    { key: 'd', x: box.left + box.width, y: box.top + box.height },
  ];

  const barAbove = box.top > 64;
  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { width: viewWidth, height: viewHeight }]}
    >
      {draft ? (
        draft.type === 'staff' ? (
          <StaffShape page={page} viewWidth={viewWidth} ann={draft} />
        ) : (
          <ImageShape page={page} viewWidth={viewWidth} ann={draft} />
        )
      ) : null}
      <GestureDetector gesture={move}>
        <View
          testID="object-frame"
          style={[
            styles.frame,
            {
              left: box.left - 6,
              top: box.top - 6,
              width: box.width + 12,
              height: box.height + 12,
              borderColor: theme.accent,
            },
            Platform.OS === 'web' ? ({ cursor: 'move', touchAction: 'none' } as object) : null,
          ]}
        />
      </GestureDetector>
      {corners.map((c) => (
        <Handle
          key={c.key}
          testID={`object-handle-${c.key}`}
          x={c.x}
          y={c.y}
          color={theme.accent}
          onStart={() => {
            const rect = objectRect(object);
            const anchor = { x: c.x, y: c.y };
            start.current = {
              rect,
              corner: nearestCorner(rect, viewToPage(page, viewWidth, anchor)),
              anchor,
            };
          }}
          onMove={(tx, ty) => {
            const s = start.current;
            if (!s) return;
            const to = viewToPage(page, viewWidth, { x: s.anchor.x + tx, y: s.anchor.y + ty });
            const r = resizeRect(s.rect, s.corner, to, {
              keepAspect: !isStaff,
              minW: isStaff ? MIN_STAFF_WIDTH : MIN_IMAGE_SIZE,
              minH: isStaff ? MIN_STAFF_HEIGHT : MIN_IMAGE_SIZE,
            });
            setDraft(withRect(object, r));
          }}
          onEnd={finish}
        />
      ))}
      {!draft ? (
        <View
          style={[
            styles.bar,
            { backgroundColor: theme.overlay, left: Math.max(0, Math.min(box.left, viewWidth - 220)) },
            barAbove ? { top: box.top - 58 } : { top: box.top + box.height + 14 },
          ]}
          testID="object-bar"
        >
          <IconButton
            icon="content-copy"
            label={t('annotate.duplicate')}
            color="#FFFFFF"
            size={20}
            onPress={onDuplicate}
            testID="object-duplicate"
          />
          {isStaff ? (
            <IconButton
              icon={object.opaque ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
              label={t('annotate.whiteBackground')}
              color="#FFFFFF"
              size={20}
              onPress={onToggleBackground}
              testID="object-background"
            />
          ) : null}
          <IconButton
            icon="trash-can-outline"
            label={t('common.delete')}
            color="#FFFFFF"
            size={20}
            onPress={onDelete}
            testID="object-delete"
          />
          <IconButton
            icon="check"
            label={t('common.done')}
            color="#FFFFFF"
            size={22}
            onPress={onDone}
            testID="object-done"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs,
  },
});
