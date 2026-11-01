// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Drawing of the objects placed on a page: the small staff (vector lines, sharp
// at any zoom) and images.

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ImageAnnotation, PageRef, StaffAnnotation } from '../core/model';
import { pageToView, viewScale } from '../core/pageTransform';
import { getServices } from '../services';
import { staffHeight, staffLines, type Rect } from './objects';

/** Box on screen (view pixels) of a rectangle given in page points. */
export function viewRect(page: PageRef, viewWidth: number, r: Rect) {
  const pts = [
    pageToView(page, viewWidth, { x: r.x, y: r.y }),
    pageToView(page, viewWidth, { x: r.x + r.w, y: r.y }),
    pageToView(page, viewWidth, { x: r.x, y: r.y + r.h }),
    pageToView(page, viewWidth, { x: r.x + r.w, y: r.y + r.h }),
  ];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/** Position of an object drawn in page orientation, turned with the page if it is rotated. */
function placement(page: PageRef, viewWidth: number, x: number, y: number) {
  const pos = pageToView(page, viewWidth, { x, y });
  return {
    position: 'absolute' as const,
    left: pos.x,
    top: pos.y,
    transform: page.rotation ? [{ rotate: `${page.rotation}deg` }] : undefined,
    transformOrigin: 'left top',
  };
}

export function StaffShape({
  page,
  viewWidth,
  ann,
}: {
  page: PageRef;
  viewWidth: number;
  ann: StaffAnnotation;
}) {
  const s = viewScale(page, viewWidth);
  const w = ann.width * s;
  const h = staffHeight(ann) * s;
  const lw = Math.max(StyleSheet.hairlineWidth, ann.lineWidth * s);
  const pad = (ann.lineSpacing * s) / 2;
  return (
    <View pointerEvents="none" style={[placement(page, viewWidth, ann.x, ann.y), { width: w, height: h }]}>
      {ann.opaque ? (
        <View
          style={{
            position: 'absolute',
            left: -pad,
            right: -pad,
            top: -pad,
            bottom: -pad,
            backgroundColor: '#FFFFFF',
          }}
        />
      ) : null}
      {staffLines(ann).map((y, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y * s - lw / 2,
            height: lw,
            backgroundColor: '#111111',
          }}
        />
      ))}
    </View>
  );
}

function useSourceImage(sourceId: string): string | null {
  const renderer = getServices().renderer;
  const cached = renderer.peekSourceImage(sourceId)?.uri ?? null;
  const [loaded, setLoaded] = useState<{ id: string; uri: string } | null>(null);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    renderer
      .sourceImage(sourceId)
      .then((r) => alive && setLoaded({ id: sourceId, uri: r.uri }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [renderer, sourceId, cached]);
  return cached ?? (loaded?.id === sourceId ? loaded.uri : null);
}

export function ImageShape({
  page,
  viewWidth,
  ann,
}: {
  page: PageRef;
  viewWidth: number;
  ann: ImageAnnotation;
}) {
  const s = viewScale(page, viewWidth);
  const uri = useSourceImage(ann.sourceId);
  const style = [placement(page, viewWidth, ann.x, ann.y), { width: ann.width * s, height: ann.height * s }];
  if (!uri) return <View pointerEvents="none" style={[style, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />;
  return (
    <Image
      pointerEvents="none"
      source={{ uri }}
      style={style}
      contentFit="fill"
      cachePolicy="none"
      transition={0}
      accessibilityIgnoresInvertColors
    />
  );
}
