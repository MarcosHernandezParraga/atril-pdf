// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// What the screen shows at one "stop" of the discrete view modes:
// single page, half-page turn (music stand or scroll style), two pages, and
// vertical with look-ahead (current page + first system of the next one).

import { StyleSheet, View } from 'react-native';

import { clampLookahead } from '../core/contentDetection';
import type { PageRef } from '../core/model';
import type { HalfPageStyle, Stop } from '../core/navigation';
import type { DisplayFilter } from '../settings/defaults';
import { useTheme } from '../theme';
import { fitWidth, PageView, pageHeightForWidth } from './PageView';
import { toCroppedFraction, usePageAnalysis } from './usePageAnalysis';

export interface StopViewProps {
  stop: Stop;
  pages: PageRef[];
  width: number;
  height: number;
  lookahead: boolean;
  halfStyle: HalfPageStyle;
  /** Look-ahead strip height when the first system cannot be detected. */
  lookaheadFallback: number;
  /** Manual split overrides by page id. */
  splits: Record<string, number>;
  filter: DisplayFilter;
  brightness: number;
}

const GAP = 6;

function Separator({ y, color }: { y: number; color: string }) {
  return <View pointerEvents="none" style={[styles.separator, { top: y - 1, backgroundColor: color }]} />;
}

function SinglePage({
  page,
  width,
  height,
  filter,
  brightness,
}: {
  page: PageRef;
  width: number;
  height: number;
  filter: DisplayFilter;
  brightness: number;
}) {
  const w = fitWidth(page, width, height);
  return (
    <View style={styles.center}>
      <PageView page={page} width={w} filter={filter} brightness={brightness} testID={`page-${page.id}`} />
    </View>
  );
}

function HalfPage({
  top,
  bottom,
  width,
  height,
  style,
  splits,
  filter,
  brightness,
}: {
  top: PageRef;
  bottom: PageRef;
  width: number;
  height: number;
  style: HalfPageStyle;
  splits: Record<string, number>;
  filter: DisplayFilter;
  brightness: number;
}) {
  const theme = useTheme();
  const analysis = usePageAnalysis(bottom, splits[bottom.id] === undefined);
  // Split of the page being read, so the systems being played are never cut.
  const raw =
    splits[bottom.id] ?? (analysis?.split != null ? toCroppedFraction(bottom, analysis.split) : 0.5);
  const s = Math.max(0.2, Math.min(0.8, raw));
  const w = fitWidth(bottom, width, height);
  const hBottom = pageHeightForWidth(bottom, w);
  const wTop = w;
  const hTop = pageHeightForWidth(top, wTop);
  const left = (width - w) / 2;
  const offsetY = (height - hBottom) / 2;

  if (style === 'stand') {
    // Nothing moves: the top part already shows the next page, the bottom part still the current one.
    const topBand = Math.min(1, (s * hBottom) / hTop);
    return (
      <View style={{ width, height }} testID="half-page-stand">
        <View style={{ position: 'absolute', left, top: offsetY }}>
          <PageView page={top} width={wTop} band={[0, topBand]} filter={filter} brightness={brightness} />
        </View>
        <View style={{ position: 'absolute', left, top: offsetY + s * hBottom }}>
          <PageView page={bottom} width={w} band={[s, 1]} filter={filter} brightness={brightness} />
        </View>
        <Separator y={offsetY + s * hBottom} color={theme.accent} />
      </View>
    );
  }
  // Scroll style: the bottom part of the current page moves up, the next page starts below it.
  const upperH = (1 - s) * hBottom;
  const lowerBand = Math.min(1, (height - offsetY - upperH) / hTop);
  return (
    <View style={{ width, height }} testID="half-page-scroll">
      <View style={{ position: 'absolute', left, top: offsetY }}>
        <PageView page={bottom} width={w} band={[s, 1]} filter={filter} brightness={brightness} />
      </View>
      <View style={{ position: 'absolute', left, top: offsetY + upperH }}>
        <PageView
          page={top}
          width={wTop}
          band={[0, Math.max(0.05, lowerBand)]}
          filter={filter}
          brightness={brightness}
        />
      </View>
      <Separator y={offsetY + upperH} color={theme.accent} />
    </View>
  );
}

function Spread({
  left,
  right,
  width,
  height,
  filter,
  brightness,
}: {
  left: PageRef | null;
  right: PageRef | null;
  width: number;
  height: number;
  filter: DisplayFilter;
  brightness: number;
}) {
  const half = (width - GAP) / 2;
  const wl = left ? fitWidth(left, half, height) : 0;
  const wr = right ? fitWidth(right, half, height) : 0;
  return (
    <View style={[styles.row, { width, height }]} testID="two-page">
      <View style={{ width: half, alignItems: 'flex-end', justifyContent: 'center' }}>
        {left ? (
          <PageView
            page={left}
            width={wl}
            filter={filter}
            brightness={brightness}
            testID={`page-${left.id}`}
          />
        ) : null}
      </View>
      <View style={{ width: GAP }} />
      <View style={{ width: half, alignItems: 'flex-start', justifyContent: 'center' }}>
        {right ? (
          <PageView
            page={right}
            width={wr}
            filter={filter}
            brightness={brightness}
            testID={`page-${right.id}`}
          />
        ) : null}
      </View>
    </View>
  );
}

function Lookahead({
  page,
  next,
  width,
  height,
  fallback,
  filter,
  brightness,
}: {
  page: PageRef;
  next: PageRef | undefined;
  width: number;
  height: number;
  fallback: number;
  filter: DisplayFilter;
  brightness: number;
}) {
  const theme = useTheme();
  const analysis = usePageAnalysis(next, true);
  if (!next)
    return <SinglePage page={page} width={width} height={height} filter={filter} brightness={brightness} />;
  // First try with the detected height of the next page's first system.
  let strip = clampLookahead(fallback) * height;
  if (analysis?.firstSystemEnd != null) {
    // The strip must hold the first system of the next page shown at the same width as the
    // current page, while the current page fits in the remaining height: solve both at once.
    const end = toCroppedFraction(next, analysis.firstSystemEnd);
    const k = end * (pageHeightForWidth(next, 1000) / 1000); // strip height per unit of width
    const a = 1000 / pageHeightForWidth(page, 1000); // width / height of the current page
    const w0 = Math.min(width, (a * height) / (1 + k * a));
    strip = Math.max(0.1 * height, Math.min(0.35 * height, k * w0 + 4));
  }
  const w = fitWidth(page, width, height - strip);
  const hPage = pageHeightForWidth(page, w);
  const band = Math.min(1, strip / pageHeightForWidth(next, w));
  return (
    <View style={{ width, height, alignItems: 'center' }} testID="lookahead">
      <PageView page={page} width={w} filter={filter} brightness={brightness} testID={`page-${page.id}`} />
      <View
        style={{
          height: height - hPage,
          width,
          alignItems: 'center',
          backgroundColor: theme.lookaheadTint,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: w, borderTopWidth: 2, borderTopColor: theme.accent }}>
          <PageView
            page={next}
            width={w}
            band={[0, band]}
            filter={filter}
            brightness={brightness}
            testID="lookahead-strip"
          />
        </View>
      </View>
    </View>
  );
}

export function StopView(p: StopViewProps) {
  const { stop, pages } = p;
  if (stop.kind === 'half') {
    const top = pages[stop.top];
    const bottom = pages[stop.bottom];
    if (!top || !bottom) return null;
    return (
      <HalfPage
        top={top}
        bottom={bottom}
        width={p.width}
        height={p.height}
        style={p.halfStyle}
        splits={p.splits}
        filter={p.filter}
        brightness={p.brightness}
      />
    );
  }
  if (stop.kind === 'spread') {
    return (
      <Spread
        left={stop.left !== null ? (pages[stop.left] ?? null) : null}
        right={stop.right !== null ? (pages[stop.right] ?? null) : null}
        width={p.width}
        height={p.height}
        filter={p.filter}
        brightness={p.brightness}
      />
    );
  }
  const page = pages[stop.page];
  if (!page) return null;
  if (p.lookahead) {
    return (
      <Lookahead
        page={page}
        next={pages[stop.page + 1]}
        width={p.width}
        height={p.height}
        fallback={p.lookaheadFallback}
        filter={p.filter}
        brightness={p.brightness}
      />
    );
  }
  return (
    <SinglePage page={page} width={p.width} height={p.height} filter={p.filter} brightness={p.brightness} />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  separator: { position: 'absolute', left: 0, right: 0, height: 2, opacity: 0.85 },
});
