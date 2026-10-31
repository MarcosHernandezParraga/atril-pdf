// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// The reader. Every way of turning pages (taps, swipes, keyboard, Bluetooth
// pedal, mouse wheel) goes through the same `turn()` function, which follows
// the stops of the current view mode (see core/navigation.ts).

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { KeyAction } from '../core/keymap';
import { buildStops, primaryPage, step, stopIndexForPage, type Stop, type ViewMode } from '../core/navigation';
import { swipeAction, tapZoneAction } from '../core/tapZones';
import { useReaderKeys } from '../input/useReaderKeys';
import { getServices } from '../services';
import { READER_MODES, type DisplayFilter, type ReaderMode } from '../settings/defaults';
import { useSettings } from '../settings/store';
import { SPACING, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { AppText, IconButton } from '../ui/primitives';
import { ContinuousView, type ContinuousHandle } from './ContinuousView';
import { PerformanceChrome, useDesktopFullscreenSync } from './performance';
import { StopView } from './StopView';
import { analysePage } from './usePageAnalysis';
import { parseViewState, useDocument } from './useDocument';

const BAR_HIDE_MS = 4000;

function viewModeOf(mode: ReaderMode): ViewMode {
  return mode === 'horizontal-animated' ? 'horizontal' : mode;
}

export function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const reader = settings.reader;
  const { doc, model, history, error, execute, undo, redo, flush } = useDocument(id);

  const [modeChoice, setMode] = useState<ReaderMode | null>(null);
  const [nav, setNav] = useState<{ stops: Stop[]; index: number; continuous: boolean } | null>(null);
  const [continuousPage, setContinuousPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [jumpBack, setJumpBack] = useState<number | null>(null);
  const [barsVisible, setBarsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState({ width: dims.width, height: dims.height });
  const [filter, setFilter] = useState<DisplayFilter>(reader.filter);
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const continuousRef = useRef<ContinuousHandle>(null);
  const viewState = useMemo(() => parseViewState(doc?.viewStateJson), [doc]);

  // Initial mode: as the user left this document (or the default from the settings).
  const savedMode = viewState.mode as ReaderMode | undefined;
  const mode: ReaderMode | null =
    modeChoice ?? (doc ? (savedMode && READER_MODES.includes(savedMode) ? savedMode : reader.defaultMode) : null);

  const landscape = size.width > size.height;
  const effectiveMode: ViewMode = useMemo(() => {
    if (!mode) return 'horizontal';
    const vm = viewModeOf(mode);
    if (reader.autoTwoPageLandscape && vm === 'horizontal') return landscape ? 'two-page' : 'horizontal';
    return vm;
  }, [mode, reader.autoTwoPageLandscape, landscape]);

  const pages = useMemo(() => model?.pages ?? [], [model]);
  const pageIndices = useMemo(() => pages.map((_, i) => i), [pages]);
  const stops = useMemo(
    () => buildStops(pageIndices, effectiveMode, { twoPage: reader.twoPage }),
    [pageIndices, effectiveMode, reader.twoPage],
  );

  const isContinuous = effectiveMode === 'vertical-continuous';

  // Keep the same page when the mode or the pages change (React's "adjust state while
  // rendering" pattern). The first time, start where the user left the document.
  if (stops.length > 0 && nav?.stops !== stops) {
    let anchor = viewState.page;
    if (nav) {
      const prev = nav.stops[Math.min(nav.index, nav.stops.length - 1)];
      anchor = nav.continuous ? continuousPage : prev ? primaryPage(prev) : 0;
    }
    const clamped = Math.max(0, Math.min(anchor, pages.length - 1));
    setNav({ stops, index: stopIndexForPage(stops, clamped), continuous: isContinuous });
    setContinuousPage(clamped);
  }

  const stopIndex = nav?.stops === stops ? nav.index : 0;
  const currentStop = nav?.stops === stops ? stops[Math.min(stopIndex, stops.length - 1)] : undefined;
  const currentPage = isContinuous ? continuousPage : currentStop ? primaryPage(currentStop) : 0;

  // Remember position and mode per document.
  useEffect(() => {
    if (!doc || !mode) return;
    const timer = setTimeout(() => {
      void getServices().repo.saveViewState(doc.id, { ...viewState, page: currentPage, mode });
    }, 600);
    return () => clearTimeout(timer);
  }, [doc, mode, currentPage, viewState]);

  // Pre-render the pages around the current one so turning is instantaneous.
  useEffect(() => {
    if (pages.length === 0) return;
    const order = [currentPage + 1, currentPage + 2, currentPage - 1, currentPage + 3]
      .filter((i) => i >= 0 && i < pages.length)
      .map((i) => pages[i]!);
    const timer = setTimeout(() => getServices().renderer.prefetch(order, Math.min(size.width, 1600) * 2), 60);
    // Analyse the next pages too (split points, first systems).
    if (effectiveMode === 'half-page' || effectiveMode === 'vertical-lookahead') {
      order.slice(0, 2).forEach((p) => void analysePage(p));
    }
    return () => clearTimeout(timer);
  }, [currentPage, pages, size.width, effectiveMode]);

  // ------------------------------------------------------------------ bars
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarsVisible(false), BAR_HIDE_MS);
  }, []);
  useEffect(() => {
    if (barsVisible && !fullscreen) scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [barsVisible, fullscreen, scheduleHide]);

  // ------------------------------------------------------------- turning
  const turn = useCallback(
    (dir: 1 | -1) => {
      setDirection(dir);
      setBarsVisible(false);
      if (isContinuous) {
        continuousRef.current?.step(dir);
        return;
      }
      setNav((n) => {
        if (!n) return n;
        const r = step(n.stops.length, n.index, dir);
        return 'index' in r ? { ...n, index: r.index } : n;
      });
    },
    [isContinuous],
  );

  const goToPage = useCallback(
    (page: number, remember = true) => {
      setJumpBack(remember ? currentPage : null);
      const p = Math.max(0, Math.min(page, pages.length - 1));
      if (isContinuous) continuousRef.current?.goToPage(p);
      else setNav((n) => (n ? { ...n, index: stopIndexForPage(n.stops, p) } : n));
    },
    [isContinuous, pages.length, currentPage],
  );

  const toggleFullscreen = useCallback(() => {
    setFullscreen((f) => {
      const next = !f;
      if (next && !settings.hints.performanceExitShown) {
        setHint(true);
        setTimeout(() => setHint(false), 2000);
        updateSettings((s) => ({ ...s, hints: { ...s.hints, performanceExitShown: true } }));
      }
      setBarsVisible(!next);
      return next;
    });
  }, [settings.hints.performanceExitShown, updateSettings]);

  useDesktopFullscreenSync((on) => {
    if (!on) setFullscreen(false);
  });

  const onKeyAction = useCallback(
    (action: KeyAction) => {
      switch (action) {
        case 'next':
          turn(1);
          break;
        case 'previous':
          turn(-1);
          break;
        case 'first':
          goToPage(0);
          break;
        case 'last':
          goToPage(pages.length - 1);
          break;
        case 'toggleFullscreen':
          toggleFullscreen();
          break;
        case 'exitFullscreen':
          if (fullscreen) toggleFullscreen();
          break;
        case 'nextPiece':
        case 'previousPiece':
          // Set lists arrive in the library phase.
          break;
      }
    },
    [turn, goToPage, pages.length, toggleFullscreen, fullscreen],
  );
  useReaderKeys(onKeyAction, Boolean(model));

  // Mouse wheel on desktop (page modes; the continuous mode scrolls natively).
  useEffect(() => {
    if (Platform.OS !== 'web' || isContinuous) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < 4) return;
      const now = performance.now();
      if (now - last < 250) return;
      last = now;
      turn(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [turn, isContinuous]);

  // --------------------------------------------------------------- gestures
  const lastCenterTap = useRef(0);
  const centerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTap = useCallback(
    (x: number, y: number) => {
      const zone = tapZoneAction(x, y, size.width, size.height, reader.tapZones, reader.invertTapZones);
      if (zone === 'next') return turn(1);
      if (zone === 'previous') return turn(-1);
      const now = Date.now();
      if (reader.doubleTapCenterFullscreen && now - lastCenterTap.current < 320) {
        if (centerTimer.current) clearTimeout(centerTimer.current);
        lastCenterTap.current = 0;
        toggleFullscreen();
        return;
      }
      lastCenterTap.current = now;
      if (fullscreen) return;
      // Side taps act immediately; the centre waits a moment for a possible double tap.
      if (centerTimer.current) clearTimeout(centerTimer.current);
      centerTimer.current = setTimeout(
        () => setBarsVisible((v) => !v),
        reader.doubleTapCenterFullscreen ? 280 : 0,
      );
    },
    [size, reader, turn, toggleFullscreen, fullscreen],
  );

  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: 12,
    onActivate: (e) => onTap(e.x, e.y),
  });
  const pan = usePanGesture({
    runOnJS: true,
    enabled: reader.swipeToTurn && !isContinuous,
    minDistance: 24,
    activeOffsetX: [-24, 24],
    failOffsetY: [-40, 40],
    onDeactivate: (e) => {
      const a = swipeAction(e.translationX, e.velocityX, size.width);
      if (a) turn(a === 'next' ? 1 : -1);
    },
  });
  const gestures = useCompetingGestures(pan, tap);

  // ------------------------------------------------------------------- menus
  const chooseMode = () =>
    void dialogs.menu(
      READER_MODES.map((m) => ({
        label: `${m === mode ? '✓ ' : ''}${t(`reader.modes.${m}`)}`,
        icon:
          m === 'vertical-continuous' || m === 'vertical-lookahead'
            ? ('arrow-expand-vertical' as const)
            : m === 'two-page'
              ? ('book-open-page-variant-outline' as const)
              : m === 'half-page'
                ? ('view-split-horizontal' as const)
                : ('arrow-expand-horizontal' as const),
        onPress: () => setMode(m),
      })),
      t('reader.viewMode'),
    );

  const chooseDisplay = () =>
    void dialogs.menu(
      (['normal', 'night', 'sepia'] as DisplayFilter[]).map((f) => ({
        label: `${f === filter ? '✓ ' : ''}${t(`reader.${f}`)}`,
        icon: f === 'night' ? ('weather-night' as const) : f === 'sepia' ? ('palette-outline' as const) : ('white-balance-sunny' as const),
        onPress: () => {
          setFilter(f);
          updateSettings((s) => ({ ...s, reader: { ...s.reader, filter: f } }));
        },
      })),
      t('reader.display'),
    );

  const cropMenu = () =>
    void dialogs.menu(
      [
        {
          label: t('reader.cropAuto'),
          icon: 'crop',
          onPress: async () => {
            setBusy(t('reader.analyzing'));
            try {
              const margins = [];
              for (const p of pages) margins.push({ id: p.id, m: (await analysePage(p)).margins });
              execute(
                {
                  type: 'batch',
                  commands: margins.map(({ id: pid, m }) => ({ type: 'setCrop' as const, pageIds: [pid], crop: m })),
                },
                t('reader.crop'),
              );
            } finally {
              setBusy(null);
            }
          },
        },
        {
          label: t('reader.cropNone'),
          icon: 'crop-free',
          onPress: () => execute({ type: 'setCrop', pageIds: pages.map((p) => p.id), crop: null }, t('reader.crop')),
        },
        {
          label: t('reader.rotate'),
          icon: 'rotate-right',
          onPress: () => {
            const p = pages[currentPage];
            if (p) execute({ type: 'rotatePages', pageIds: [p.id], degrees: 90 }, t('reader.rotate'));
          },
        },
      ],
      t('reader.crop'),
    );

  const askPage = async () => {
    const v = await dialogs.prompt(t('reader.goToPage'), { initial: String(currentPage + 1) });
    const n = v ? parseInt(v, 10) : NaN;
    if (Number.isFinite(n)) goToPage(n - 1);
  };

  const close = async () => {
    await flush();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // ------------------------------------------------------------------ render
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1) setSize({ width, height });
  };

  if (error) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.background }]}>
        <AppText variant="heading">{t('reader.openFailed')}</AppText>
        <IconButton icon="arrow-left" label={t('common.back')} showLabel onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const ready = Boolean(model && mode && currentStop);
  const animated = mode === 'horizontal-animated' && effectiveMode === 'horizontal';
  const ms = reader.transitionMs;
  const dir = direction;
  const entering = animated
    ? reader.transition === 'fade'
      ? FadeIn.duration(ms)
      : dir === 1
        ? SlideInRight.duration(ms)
        : SlideInLeft.duration(ms)
    : undefined;
  const exiting = animated
    ? reader.transition === 'fade'
      ? FadeOut.duration(ms)
      : dir === 1
        ? SlideOutLeft.duration(ms)
        : SlideOutRight.duration(ms)
    : undefined;

  const showBars = barsVisible && !fullscreen;
  const canUndo = (history?.past.length ?? 0) > 0;
  const canRedo = (history?.future.length ?? 0) > 0;

  return (
    <View style={[styles.fill, { backgroundColor: theme.readerBackground }]} testID="reader">
      <Stack.Screen options={{ statusBarHidden: fullscreen, navigationBarHidden: fullscreen, autoHideHomeIndicator: fullscreen }} />
      <PerformanceChrome active={fullscreen} />
      <View
        style={[styles.fill, { paddingTop: fullscreen ? 0 : insets.top, paddingBottom: fullscreen ? 0 : insets.bottom }]}
      >
        <View style={styles.fill} onLayout={onLayout}>
          {!ready ? (
            <View style={[styles.fill, styles.center]}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : isContinuous ? (
            <GestureDetector gesture={tap}>
              <View style={styles.fill}>
                <ContinuousView
                  ref={continuousRef}
                  pages={pages}
                  width={size.width}
                  height={size.height}
                  overlap={reader.continuousOverlap}
                  initialPage={currentPage}
                  filter={filter}
                  brightness={reader.brightness}
                  onPageChange={setContinuousPage}
                  scrollEnabled={!fullscreen || reader.swipeToTurn}
                />
              </View>
            </GestureDetector>
          ) : (
            <GestureDetector gesture={gestures}>
              <View style={[styles.fill, { overflow: 'hidden' }]} collapsable={false}>
                <Animated.View key={stopIndex} entering={entering} exiting={exiting} style={StyleSheet.absoluteFill}>
                  <StopView
                    stop={currentStop!}
                    pages={pages}
                    width={size.width}
                    height={size.height}
                    lookahead={effectiveMode === 'vertical-lookahead'}
                    halfStyle={reader.halfPageStyle}
                    lookaheadFallback={viewState.lookahead ?? reader.lookaheadFraction}
                    splits={viewState.splits ?? {}}
                    filter={filter}
                    brightness={reader.brightness}
                  />
                </Animated.View>
              </View>
            </GestureDetector>
          )}
        </View>

        {fullscreen ? (
          // Deliberate gesture to leave performance mode: press and hold the top edge.
          <Pressable
            testID="exit-fullscreen-zone"
            accessibilityRole="button"
            accessibilityLabel={t('reader.exitFullscreenHint')}
            delayLongPress={600}
            onLongPress={toggleFullscreen}
            style={styles.exitZone}
          />
        ) : null}

        {fullscreen && reader.showPageNumberInPerformance ? (
          <View pointerEvents="none" style={styles.miniPage}>
            <AppText variant="caption" style={{ color: '#FFFFFF' }}>
              {currentPage + 1}/{pages.length}
            </AppText>
          </View>
        ) : null}

        {hint ? (
          <View pointerEvents="none" style={[styles.hint, { backgroundColor: theme.overlay }]}>
            <AppText style={{ color: '#FFFFFF', textAlign: 'center' }}>{t('reader.exitFullscreenHint')}</AppText>
          </View>
        ) : null}

        {showBars ? (
          <>
            <View style={[styles.topBar, { backgroundColor: theme.overlay, top: insets.top }]} testID="reader-top-bar">
              <IconButton icon="arrow-left" label={t('common.back')} color="#FFFFFF" onPress={() => void close()} testID="reader-back" />
              <AppText style={styles.title} numberOfLines={1}>
                {doc?.title}
              </AppText>
              <IconButton icon="undo" label={t('common.undo')} color="#FFFFFF" onPress={undo} disabled={!canUndo} />
              <IconButton icon="redo" label={t('common.redo')} color="#FFFFFF" onPress={redo} disabled={!canRedo} />
              <IconButton icon="crop" label={t('reader.crop')} color="#FFFFFF" onPress={cropMenu} />
              <IconButton icon="theme-light-dark" label={t('reader.display')} color="#FFFFFF" onPress={chooseDisplay} />
              <IconButton icon="book-open-variant" label={t('reader.viewMode')} color="#FFFFFF" onPress={chooseMode} testID="reader-mode" />
              <IconButton icon="fullscreen" label={t('reader.fullscreen')} color="#FFFFFF" onPress={toggleFullscreen} testID="reader-fullscreen" />
            </View>
            <View style={[styles.bottomBar, { backgroundColor: theme.overlay, bottom: insets.bottom }]}>
              <IconButton icon="chevron-left" label={t('reader.previous')} color="#FFFFFF" onPress={() => turn(-1)} />
              {jumpBack !== null ? (
                <IconButton
                  icon="keyboard-return"
                  label={t('reader.back')}
                  color="#FFFFFF"
                  onPress={() => goToPage(jumpBack, false)}
                />
              ) : null}
              <Pressable onPress={() => void askPage()} accessibilityRole="button" accessibilityLabel={t('reader.goToPage')} style={styles.pageLabel}>
                <AppText style={{ color: '#FFFFFF', fontWeight: '700' }} testID="page-indicator">
                  {t('reader.page', { page: currentPage + 1, total: pages.length })}
                </AppText>
              </Pressable>
              <IconButton icon="chevron-right" label={t('reader.next')} color="#FFFFFF" onPress={() => turn(1)} />
            </View>
          </>
        ) : null}

        {busy ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <View style={[styles.busy, { backgroundColor: theme.surface }]}>
              <ActivityIndicator color={theme.primary} />
              <AppText style={{ marginLeft: SPACING.md }}>{busy}</AppText>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  title: { flex: 1, color: '#FFFFFF', fontWeight: '700', marginHorizontal: SPACING.sm },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  pageLabel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.md },
  exitZone: { position: 'absolute', top: 0, left: 0, right: 0, height: 40 },
  miniPage: { position: 'absolute', right: 8, bottom: 6, opacity: 0.45, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 6 },
  hint: { position: 'absolute', top: 60, alignSelf: 'center', padding: SPACING.lg, borderRadius: 12, maxWidth: 420 },
  busy: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xl, borderRadius: 12 },
});
