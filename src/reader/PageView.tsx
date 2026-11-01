// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Displays one page (or a horizontal band of it) at a given width, applying
// the non-destructive crop and rotation of the model. PDF and image pages are
// raster images from the engine; blank and staff-paper pages are drawn as
// vector shapes.

import { Image } from 'expo-image';
import { createContext, memo, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, PixelRatio, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { AnnotationLayer } from '../annotations/AnnotationLayer';
import { displayedPageSize, type Annotation, type PageRef } from '../core/model';
import type { RenderedPage } from '../pdf/types';
import { getServices } from '../services';
import type { DisplayFilter } from '../settings/defaults';

/**
 * Current zoom of the reader (1 = not zoomed). Pages are rendered with more
 * pixels while zoomed so the music stays sharp.
 */
export const RenderZoomContext = createContext(1);

/** Most pixels a zoomed page may use (about 64 MB in memory). */
const ZOOM_MAX_PIXELS = 16_000_000;

/** Annotations of the open document by page id; undefined when they are hidden. */
export const PageAnnotationsContext = createContext<Record<string, Annotation[]> | undefined>(undefined);

/** Height of a page displayed at `width` (crop and rotation applied). */
export function pageHeightForWidth(page: PageRef, width: number): number {
  const s = displayedPageSize(page);
  return (width * s.height) / s.width;
}

/** Largest width at which the page fits in the box. */
export function fitWidth(page: PageRef, boxW: number, boxH: number): number {
  const s = displayedPageSize(page);
  return Math.max(1, Math.min(boxW, (boxH * s.width) / s.height));
}

/**
 * Pixel width used to render a page displayed at `width`. Pre-rendering must use the
 * same value as the screen, otherwise the cached image is not reused.
 */
export function renderPixelWidth(page: PageRef, width: number, zoom = 1): number {
  const crop = page.crop ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const rotated = page.rotation === 90 || page.rotation === 270;
  const cw = rotated ? pageHeightForWidth(page, width) : width;
  const fullW = cw / Math.max(0.05, 1 - crop.left - crop.right);
  const base = Math.min(4096, fullW * PixelRatio.get());
  if (zoom <= 1) return base;
  // Zoomed: more pixels, within a memory budget (important on tablets and phones).
  const s = displayedPageSize(page);
  const aspect = Math.max(0.2, s.height / Math.max(1, s.width));
  const byMemory = Math.sqrt(ZOOM_MAX_PIXELS / aspect);
  return Math.max(base, Math.min(4096, base * zoom, byMemory));
}

export function filterStyle(filter: DisplayFilter, brightness = 1): ViewStyle {
  const parts: string[] = [];
  if (filter === 'night') parts.push('invert(1) hue-rotate(180deg)');
  if (filter === 'sepia') parts.push('sepia(0.55)');
  if (brightness < 1) parts.push(`brightness(${brightness})`);
  if (parts.length === 0) return {};
  if (Platform.OS === 'web') return { filter: parts.join(' ') } as ViewStyle;
  if (Platform.OS === 'android') return { filter: parts.join(' ') } as unknown as ViewStyle;
  // iOS: React Native only supports brightness/opacity filters; night/sepia use an overlay instead.
  return {};
}

function usePageImage(page: PageRef, pixelWidth: number, thumbnail = false): RenderedPage | null | 'error' {
  const renderer = getServices().renderer;
  const cached =
    pixelWidth > 0
      ? thumbnail
        ? renderer.peekThumb(page, pixelWidth)
        : renderer.peek(page, pixelWidth)
      : undefined;
  const [loaded, setLoaded] = useState<{ page: PageRef; width: number; img: RenderedPage | 'error' } | null>(
    null,
  );
  useEffect(() => {
    if (cached || pixelWidth <= 0) return;
    let alive = true;
    (thumbnail ? renderer.renderThumb(page, pixelWidth) : renderer.render(page, pixelWidth))
      .then((r) => alive && r && setLoaded({ page, width: pixelWidth, img: r }))
      .catch(() => alive && setLoaded({ page, width: pixelWidth, img: 'error' }));
    return () => {
      alive = false;
    };
  }, [renderer, page, pixelWidth, cached, thumbnail]);
  if (cached) return cached;
  if (loaded && loaded.page === page && loaded.width === pixelWidth) return loaded.img;
  return null;
}

/** Five-line staves drawn as vectors (staff paper pages). */
function StaffPaper({
  page,
  width,
  height,
}: {
  page: Extract<PageRef, { kind: 'staff' }>;
  width: number;
  height: number;
}) {
  const { staves, piano } = page.staff;
  const blocks = Math.max(1, staves);
  const marginX = width * 0.07;
  const top = height * 0.06;
  const usable = height * 0.9;
  const blockH = usable / blocks;
  const spacing = Math.max(2, (piano ? blockH / 2 : blockH) * 0.09);
  const lines: { y: number }[] = [];
  for (let b = 0; b < blocks; b++) {
    const staffCount = piano ? 2 : 1;
    for (let s = 0; s < staffCount; s++) {
      const y0 =
        top +
        b * blockH +
        (blockH - (staffCount * 4 * spacing + (staffCount - 1) * spacing * 5)) / 2 +
        s * spacing * 9;
      for (let l = 0; l < 5; l++) lines.push({ y: y0 + l * spacing });
    }
  }
  const lw = Math.max(StyleSheet.hairlineWidth, width / 900);
  return (
    <View style={{ width, height, backgroundColor: '#FFFFFF' }}>
      {lines.map((l, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: marginX,
            right: marginX,
            top: l.y,
            height: lw,
            backgroundColor: '#1A1A1A',
          }}
        />
      ))}
    </View>
  );
}

export interface PageViewProps {
  page: PageRef;
  /** Displayed width of the (cropped, rotated) page. */
  width: number;
  /** Visible band, as fractions of the displayed height. Default: whole page. */
  band?: [number, number];
  filter?: DisplayFilter;
  brightness?: number;
  testID?: string;
  /** Annotations drawn on top of the page (vectors). */
  annotations?: Annotation[];
  hiddenIds?: ReadonlySet<string>;
  /** Small picture for lists (page panel): own cache, no annotations, no zoom. */
  thumbnail?: boolean;
}

export const PageView = memo(function PageView({
  page,
  width,
  band,
  filter = 'normal',
  brightness = 1,
  testID,
  annotations,
  hiddenIds,
  thumbnail = false,
}: PageViewProps) {
  const height = pageHeightForWidth(page, width);
  const fromContext = useContext(PageAnnotationsContext);
  const pageAnnotations = thumbnail ? undefined : (annotations ?? fromContext?.[page.id]);
  const [b0, b1] = band ?? [0, 1];
  const visibleH = Math.max(1, (b1 - b0) * height);

  const crop = page.crop ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const rotated = page.rotation === 90 || page.rotation === 270;
  // Size of the cropped page before rotation.
  const cw = rotated ? height : width;
  const ch = rotated ? width : height;
  // Size of the full (uncropped) page at this scale.
  const fullW = cw / Math.max(0.05, 1 - crop.left - crop.right);
  const fullH = ch / Math.max(0.05, 1 - crop.top - crop.bottom);
  const zoomContext = useContext(RenderZoomContext);
  const zoom = thumbnail ? 1 : zoomContext;
  const basePixelWidth = renderPixelWidth(page, width);
  const pixelWidth = renderPixelWidth(page, width, zoom);

  const isRaster = page.kind === 'pdf' || page.kind === 'image';
  const sharp = usePageImage(page, isRaster ? pixelWidth : 0, thumbnail);
  // While the sharper (zoomed) image is being prepared, keep showing the normal one.
  const img =
    sharp ??
    (isRaster && pixelWidth !== basePixelWidth ? getServices().renderer.peek(page, basePixelWidth) : null) ??
    null;

  let content: React.ReactNode;
  if (page.kind === 'blank') {
    content = <View style={{ width: fullW, height: fullH, backgroundColor: '#FFFFFF' }} />;
  } else if (page.kind === 'staff') {
    content = <StaffPaper page={page} width={fullW} height={fullH} />;
  } else if (img === 'error') {
    content = <View style={{ width: fullW, height: fullH, backgroundColor: '#F3E9E9' }} />;
  } else if (img) {
    content = (
      <Image
        source={{ uri: img.uri }}
        style={{ width: fullW, height: fullH, backgroundColor: '#FFFFFF' }}
        contentFit={page.kind === 'image' ? 'contain' : 'fill'}
        cachePolicy="none"
        transition={0}
        allowDownscaling={false}
      />
    );
  } else {
    content = (
      <View
        style={{
          width: fullW,
          height: fullH,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#8A4B1C" />
      </View>
    );
  }

  const iosOverlay =
    Platform.OS === 'ios' && filter !== 'normal' ? (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          filter === 'night'
            ? { backgroundColor: '#FFFFFF', mixBlendMode: 'difference' }
            : { backgroundColor: 'rgba(112, 66, 20, 0.18)', mixBlendMode: 'multiply' },
        ]}
      />
    ) : null;

  return (
    <View
      testID={testID}
      style={[
        { width, height: visibleH, overflow: 'hidden', backgroundColor: '#FFFFFF' },
        filterStyle(filter, brightness),
      ]}
    >
      <View style={{ position: 'absolute', left: 0, top: -b0 * height, width, height }}>
        <View
          style={{
            position: 'absolute',
            width: cw,
            height: ch,
            left: (width - cw) / 2,
            top: (height - ch) / 2,
            overflow: 'hidden',
            transform: page.rotation ? [{ rotate: `${page.rotation}deg` }] : undefined,
          }}
        >
          <View style={{ position: 'absolute', left: -crop.left * fullW, top: -crop.top * fullH }}>
            {content}
          </View>
        </View>
        {pageAnnotations && pageAnnotations.length > 0 ? (
          <AnnotationLayer
            page={page}
            viewWidth={width}
            viewHeight={height}
            annotations={pageAnnotations}
            hiddenIds={hiddenIds}
          />
        ) : null}
      </View>
      {iosOverlay}
    </View>
  );
});
