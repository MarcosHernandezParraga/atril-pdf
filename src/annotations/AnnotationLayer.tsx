// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Draws the annotations of a page as vectors on top of it (sharp at any zoom):
// images and small staves first, then ink with Skia, then text boxes as native text.

import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Annotation, InkAnnotation, PageRef, TextAnnotation } from '../core/model';
import { pageToView, viewScale } from '../core/pageTransform';
import { hasRealPressure, penOutlinePath, polylinePath } from './ink';
import { isPlacedObject, type PlacedObject } from './objects';
import { ImageShape, StaffShape } from './PlacedObjects';

/** Images and staves, images underneath. */
export function PlacedObjectsView({
  page,
  viewWidth,
  objects,
}: {
  page: PageRef;
  viewWidth: number;
  objects: PlacedObject[];
}) {
  return (
    <>
      {objects.map((o) =>
        o.type === 'image' ? <ImageShape key={o.id} page={page} viewWidth={viewWidth} ann={o} /> : null,
      )}
      {objects.map((o) =>
        o.type === 'staff' ? <StaffShape key={o.id} page={page} viewWidth={viewWidth} ann={o} /> : null,
      )}
    </>
  );
}

export interface InkPathSpec {
  id: string;
  d: string;
  color: string;
  highlighter: boolean;
  strokeWidth: number;
}

/** View-space paths of the ink annotations of a page. */
export function inkPaths(page: PageRef, viewWidth: number, inks: InkAnnotation[]): InkPathSpec[] {
  const s = viewScale(page, viewWidth);
  return inks.map((a) => {
    const pts = a.points.map(([x, y, p]) => {
      const v = pageToView(page, viewWidth, { x, y });
      return [v.x, v.y, p] as [number, number, number];
    });
    if (a.tool === 'highlighter') {
      return {
        id: a.id,
        d: polylinePath(pts.map(([x, y]) => ({ x, y }))),
        color: a.color,
        highlighter: true,
        strokeWidth: a.width * s,
      };
    }
    return {
      id: a.id,
      d: penOutlinePath(pts, Math.max(1, a.width * s), hasRealPressure(a.points)),
      color: a.color,
      highlighter: false,
      strokeWidth: 0,
    };
  });
}

export function InkCanvas({ paths, width, height }: { paths: InkPathSpec[]; width: number; height: number }) {
  const skPaths = useMemo(
    () =>
      paths
        .map((p) => ({ ...p, path: p.d ? Skia.Path.MakeFromSVGString(p.d) : null }))
        .filter(
          (p): p is InkPathSpec & { path: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>> } =>
            p.path !== null,
        ),
    [paths],
  );
  if (skPaths.length === 0) return null;
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      {skPaths.map((p) =>
        p.highlighter ? (
          <Path
            key={p.id}
            path={p.path}
            color={p.color}
            style="stroke"
            strokeWidth={p.strokeWidth}
            strokeCap="round"
            strokeJoin="round"
            opacity={0.38}
            blendMode="multiply"
          />
        ) : (
          <Path key={p.id} path={p.path} color={p.color} />
        ),
      )}
    </Canvas>
  );
}

export function TextBox({ page, viewWidth, ann }: { page: PageRef; viewWidth: number; ann: TextAnnotation }) {
  const s = viewScale(page, viewWidth);
  const pos = pageToView(page, viewWidth, { x: ann.x, y: ann.y });
  return (
    <Text
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        color: ann.color,
        fontSize: ann.fontSize * s,
        lineHeight: ann.fontSize * s * 1.3,
        fontWeight: ann.bold ? '700' : '400',
        transform: page.rotation ? [{ rotate: `${page.rotation}deg` }] : undefined,
        transformOrigin: 'left top',
      }}
    >
      {ann.text}
    </Text>
  );
}

/** Read-only layer, placed over a page displayed at `viewWidth` x `viewHeight`. */
export const AnnotationLayer = memo(function AnnotationLayer({
  page,
  viewWidth,
  viewHeight,
  annotations,
  hiddenIds,
}: {
  page: PageRef;
  viewWidth: number;
  viewHeight: number;
  annotations: Annotation[];
  hiddenIds?: ReadonlySet<string>;
}) {
  const visible = hiddenIds ? annotations.filter((a) => !hiddenIds.has(a.id)) : annotations;
  const inks = visible.filter((a): a is InkAnnotation => a.type === 'ink');
  const texts = visible.filter((a): a is TextAnnotation => a.type === 'text');
  const objects = visible.filter(isPlacedObject);
  const paths = useMemo(() => inkPaths(page, viewWidth, inks), [page, viewWidth, inks]);
  if (visible.length === 0) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: viewWidth, height: viewHeight }]}>
      <PlacedObjectsView page={page} viewWidth={viewWidth} objects={objects} />
      <InkCanvas paths={paths} width={viewWidth} height={viewHeight} />
      {texts.map((t) => (
        <TextBox key={t.id} page={page} viewWidth={viewWidth} ann={t} />
      ))}
    </View>
  );
});
