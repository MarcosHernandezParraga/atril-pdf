// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// The reader. Every way of turning pages (taps, swipes, keyboard, Bluetooth
// pedal, mouse wheel) goes through the same `turn()` function, which follows
// the stops of the current view mode (see core/navigation.ts). In concert mode
// (a folder played in a row) turning past the last page opens the next piece.

import { BlurView } from 'expo-blur';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnotateView, DEFAULT_TOOL_STATE, type ToolState } from '../annotations/AnnotateView';
import { AnnotationToolbar } from '../annotations/AnnotationToolbar';
import type { KeyAction } from '../core/keymap';
import {
  buildStops,
  primaryPage,
  step,
  stopIndexForPage,
  type Stop,
  type ViewMode,
} from '../core/navigation';
import { swipeAction, tapZoneAction } from '../core/tapZones';
import { newId } from '../core/ids';
import { useReaderKeys } from '../input/useReaderKeys';
import { importPages } from '../library/importer';
import { pickFiles } from '../library/pickFiles';
import { askPdfPassword, reportImport } from '../library/useExternalOpen';
import { getServices } from '../services';
import { READER_MODES, type DisplayFilter, type InputMode, type ReaderMode } from '../settings/defaults';
import { useSettings } from '../settings/store';
import { cardShadow, RADIUS, SPACING, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { AppText, IconButton } from '../ui/primitives';
import { ContinuousView, type ContinuousHandle } from './ContinuousView';
import { FlipStack, type Flip } from './FlipStack';
import {
  fitWidth,
  PageAnnotationsContext,
  pageHeightForWidth,
  renderPixelWidth,
  RenderZoomContext,
} from './PageView';
import { PerformanceChrome, useDesktopFullscreenSync } from './performance';
import { StopView } from './StopView';
import { analysePage } from './usePageAnalysis';
import { parseViewState, useDocument } from './useDocument';
import { PagePanel, type PagePanelActions } from './PagePanel';
import {
  blankPageLike,
  duplicatePageCommand,
  insertPagesCommand,
  movePageCommand,
  pageAfterRemoval,
  removePageCommand,
} from './pageEditing';
import { usePageZoom } from './usePageZoom';
import { renderZoom } from './zoomMath';

const BAR_HIDE_MS = 4000;

function viewModeOf(mode: ReaderMode): ViewMode {
  return mode === 'horizontal-animated' ? 'horizontal' : mode;
}

interface Piece {
  id: string;
  title: string;
}

export function ReaderScreen() {
  const params = useLocalSearchParams<{ id: string; concert?: string }>();
  const concertId = params.concert;
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const reader = settings.reader;

  // ----------------------------------------------------------------- concert
  const [currentId, setCurrentId] = useState(params.id);
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [pendingStart, setPendingStart] = useState<'first' | 'last' | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    if (!concertId) return;
    let alive = true;
    void getServices()
      .repo.folderPieces(concertId)
      .then((ps) => alive && setPieces(ps.map((p) => ({ id: p.doc.id, title: p.doc.title }))));
    return () => {
      alive = false;
    };
  }, [concertId]);
  const pieceIndex = pieces ? pieces.findIndex((p) => p.id === currentId) : -1;

  const { doc, model, history, error, execute, undo, redo, flush } = useDocument(currentId);

  const [modeChoice, setMode] = useState<ReaderMode | null>(null);
  const [nav, setNav] = useState<{ docId: string; stops: Stop[]; index: number; continuous: boolean } | null>(
    null,
  );
  const [continuousPage, setContinuousPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [flip, setFlip] = useState<Flip<Stop> | null>(null);
  const [jumpBack, setJumpBack] = useState<number | null>(null);
  const [barsVisible, setBarsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState({ width: dims.width, height: dims.height });
  const [filter, setFilter] = useState<DisplayFilter>(reader.filter);
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [tools, setTools] = useState<ToolState>(DEFAULT_TOOL_STATE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelBusy, setPanelBusy] = useState(false);
  // After a change in the page panel, the page to show (by id).
  const [showPageId, setShowPageId] = useState<string | null>(null);
  const continuousRef = useRef<ContinuousHandle>(null);
  const viewState = useMemo(() => parseViewState(doc?.viewStateJson), [doc]);
  const inputMode: InputMode =
    settings.annotations.inputMode === 'auto' ? 'both' : settings.annotations.inputMode;

  // Initial mode: as the user left this document (or the default from the settings).
  const savedMode = viewState.mode as ReaderMode | undefined;
  const mode: ReaderMode | null =
    modeChoice ??
    (doc ? (savedMode && READER_MODES.includes(savedMode) ? savedMode : reader.defaultMode) : null);

  const landscape = size.width > size.height;
  const effectiveMode: ViewMode = useMemo(() => {
    if (annotating) return 'horizontal';
    if (!mode) return 'horizontal';
    const vm = viewModeOf(mode);
    if (reader.autoTwoPageLandscape && vm === 'horizontal') return landscape ? 'two-page' : 'horizontal';
    return vm;
  }, [annotating, mode, reader.autoTwoPageLandscape, landscape]);

  const pages = useMemo(() => model?.pages ?? [], [model]);
  const pageIndices = useMemo(() => pages.map((_, i) => i), [pages]);
  const stops = useMemo(
    () => buildStops(pageIndices, effectiveMode, { twoPage: reader.twoPage }),
    [pageIndices, effectiveMode, reader.twoPage],
  );
  const isContinuous = effectiveMode === 'vertical-continuous';

  // Keep the same page when the mode or the pages change (React's "adjust state while
  // rendering" pattern). A new piece starts at its first page (or last when going back);
  // a document opened alone starts where the user left it.
  if (doc && stops.length > 0 && nav?.stops !== stops) {
    let anchor = viewState.page;
    let toLast = false;
    if (nav && nav.docId === doc.id) {
      const prev = nav.stops[Math.min(nav.index, nav.stops.length - 1)];
      anchor = nav.continuous ? continuousPage : prev ? primaryPage(prev) : 0;
      if (showPageId) {
        const shown = pages.findIndex((p) => p.id === showPageId);
        if (shown >= 0) anchor = shown;
        setShowPageId(null);
      }
    } else if (pendingStart) {
      toLast = pendingStart === 'last';
      anchor = toLast ? pages.length - 1 : 0;
      setPendingStart(null);
    }
    const clamped = Math.max(0, Math.min(anchor, pages.length - 1));
    setNav({
      docId: doc.id,
      stops,
      index: toLast ? stops.length - 1 : stopIndexForPage(stops, clamped),
      continuous: isContinuous,
    });
    setContinuousPage(clamped);
    if (nav && nav.docId !== doc.id) setFlip(null);
  }

  const stopIndex = nav?.stops === stops ? nav.index : 0;
  const currentStop = nav?.stops === stops ? stops[Math.min(stopIndex, stops.length - 1)] : undefined;
  const currentPage = isContinuous ? continuousPage : currentStop ? primaryPage(currentStop) : 0;
  const atLastStop = !isContinuous && stops.length > 0 && stopIndex >= stops.length - 1;

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
    // Same width as the one the screen will ask for (see PageView), so the cache is hit.
    const displayWidth = (p: (typeof pages)[number]) =>
      effectiveMode === 'vertical-continuous'
        ? Math.min(size.width, 1400)
        : effectiveMode === 'two-page'
          ? fitWidth(p, (size.width - 6) / 2, size.height)
          : fitWidth(p, size.width, size.height);
    const timer = setTimeout(() => {
      const renderer = getServices().renderer;
      for (const p of order) renderer.prefetch([p], renderPixelWidth(p, displayWidth(p)));
    }, 60);
    if (effectiveMode === 'half-page' || effectiveMode === 'vertical-lookahead') {
      order.slice(0, 2).forEach((p) => void analysePage(p));
    }
    return () => clearTimeout(timer);
  }, [currentPage, pages, size.width, size.height, effectiveMode]);

  // Concert: near the end of a piece, prepare the first page of the next one.
  const nextPiece = pieces && pieceIndex >= 0 ? pieces[pieceIndex + 1] : undefined;
  useEffect(() => {
    if (!nextPiece || (!atLastStop && currentPage < pages.length - 1)) return;
    let alive = true;
    void getServices()
      .repo.loadModel(nextPiece.id)
      .then((m) => {
        const first = m?.pages[0];
        if (!alive || !first) return;
        getServices().renderer.prefetch(
          [first],
          renderPixelWidth(first, fitWidth(first, size.width, size.height)),
        );
      });
    return () => {
      alive = false;
    };
  }, [nextPiece, atLastStop, currentPage, pages.length, size]);

  // ------------------------------------------------------------------ bars
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarsVisible(false), BAR_HIDE_MS);
  }, []);
  useEffect(() => {
    // The bars stay while the page panel is open.
    if (barsVisible && !fullscreen && !annotating && !panelOpen) scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [barsVisible, fullscreen, annotating, panelOpen, scheduleHide]);

  const showBanner = useCallback((text: string) => {
    setBanner(text);
    setTimeout(() => setBanner((b) => (b === text ? null : b)), 1300);
  }, []);

  // ------------------------------------------------------------- turning
  const goPiece = useCallback(
    (index: number, start: 'first' | 'last') => {
      if (!pieces) return false;
      const target = pieces[index];
      if (!target) return false;
      setPendingStart(start);
      setCurrentId(target.id);
      showBanner(t('reader.nextPiece', { title: `${index + 1}. ${target.title}` }));
      return true;
    },
    [pieces, showBanner, t],
  );

  const crossPiece = useCallback(
    (dir: 1 | -1) => {
      if (!pieces || pieceIndex < 0) return;
      if (!goPiece(pieceIndex + dir, dir === 1 ? 'first' : 'last') && dir === 1)
        showBanner(t('reader.endOfConcert'));
    },
    [pieces, pieceIndex, goPiece, showBanner, t],
  );

  const animated3d =
    mode === 'horizontal-animated' && effectiveMode === 'horizontal' && reader.transition === 'curl';

  const turn = useCallback(
    (dir: 1 | -1) => {
      setDirection(dir);
      if (!annotating) setBarsVisible(false);
      if (isContinuous) {
        const moved = continuousRef.current?.step(dir);
        if (moved === false) crossPiece(dir);
        return;
      }
      if (!nav || nav.stops !== stops) return;
      const r = step(nav.stops.length, nav.index, dir);
      if (!('index' in r)) {
        crossPiece(dir);
        return;
      }
      const from = nav.stops[nav.index];
      if (animated3d && from) {
        const key = Date.now();
        setFlip({ from, dir, key });
        setTimeout(() => setFlip((f) => (f && f.key === key ? null : f)), reader.transitionMs + 40);
      }
      setNav({ ...nav, index: r.index });
    },
    [annotating, isContinuous, nav, stops, crossPiece, animated3d, reader.transitionMs],
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
      if (next) setAnnotating(false);
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
          if (pieceIndex >= 0) goPiece(pieceIndex + 1, 'first');
          break;
        case 'previousPiece':
          if (pieceIndex >= 0) goPiece(pieceIndex - 1, 'first');
          break;
      }
    },
    [turn, goToPage, pages.length, toggleFullscreen, fullscreen, pieceIndex, goPiece],
  );
  useReaderKeys(onKeyAction, Boolean(model));

  // ------------------------------------------------------------------- zoom
  const zoomBox = useMemo(() => ({ w: size.width, h: size.height }), [size.width, size.height]);
  const singlePage = !isContinuous && currentStop?.kind === 'page' ? pages[currentStop.page] : undefined;
  const zoomContent = useMemo(() => {
    if (!singlePage) return zoomBox;
    const w = fitWidth(singlePage, zoomBox.w, zoomBox.h);
    return { w, h: pageHeightForWidth(singlePage, w) };
  }, [singlePage, zoomBox]);
  const {
    pinch: zoomPinch,
    move: zoomMove,
    style: zoomStyle,
    zoom,
    zoomed,
    reset: resetZoom,
    areaRef: zoomAreaRef,
    isZoomedNow,
  } = usePageZoom({
    box: zoomBox,
    content: zoomContent,
    enabled: !annotating && Boolean(model),
    resetKey: `${currentId}|${effectiveMode}|${isContinuous ? continuousPage : stopIndex}|${size.width}x${size.height}`,
  });

  // Mouse wheel on desktop (page modes; the continuous mode scrolls natively).
  useEffect(() => {
    if (Platform.OS !== 'web' || isContinuous || annotating) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < 4 || isZoomedNow()) return;
      const now = performance.now();
      if (now - last < 250) return;
      last = now;
      turn(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [turn, isContinuous, annotating, isZoomedNow]);

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
    enabled: reader.swipeToTurn && !isContinuous && !zoomed,
    maxPointers: 1,
    minDistance: 24,
    activeOffsetX: [-24, 24],
    failOffsetY: [-40, 40],
    onDeactivate: (e) => {
      const a = swipeAction(e.translationX, e.velocityX, size.width);
      if (a) turn(a === 'next' ? 1 : -1);
    },
  });
  const gestures = useCompetingGestures(zoomPinch, zoomMove, pan, tap);

  // -------------------------------------------------------------- page panel
  const addFiles = async (kind: 'pdf' | 'image') => {
    const files = await pickFiles(kind);
    if (files.length === 0) return;
    setPanelBusy(true);
    try {
      const s = getServices();
      const result = await importPages(
        { repo: s.repo, storage: s.storage, engine: s.engine, askPassword: askPdfPassword },
        files,
      );
      if (result.failures.length > 0) reportImport({ documentIds: [], failures: result.failures });
      const first = result.pages[0];
      if (first) {
        execute(
          insertPagesCommand(currentPage + 1, result.pages),
          t(kind === 'pdf' ? 'pages.addPdf' : 'pages.addImage'),
        );
        setShowPageId(first.id);
        dialogs.toast(t('pages.added', { count: result.pages.length }));
      }
    } finally {
      setPanelBusy(false);
    }
  };
  const pageActions: PagePanelActions = {
    goTo: (i) => goToPage(i),
    move: (from, to) => {
      const cmd = movePageCommand(pages, from, to);
      if (!cmd) return;
      const keep = pages[currentPage]?.id;
      execute(cmd, t('pages.moved'));
      if (keep) setShowPageId(keep);
    },
    duplicate: (i) => {
      const r = model ? duplicatePageCommand(model, i, newId) : null;
      if (!r) return;
      execute(r.command, t('pages.duplicate'));
      setShowPageId(r.copyId);
      dialogs.toast(t('pages.duplicated'));
    },
    remove: (i) => {
      const cmd = removePageCommand(pages, i);
      if (!cmd) return;
      const next = i === currentPage ? pageAfterRemoval(pages, i) : pages[currentPage]?.id;
      execute(cmd, t('pages.delete'));
      if (next) setShowPageId(next);
      dialogs.toast(t('pages.deleted'));
    },
    addBlank: () => {
      const page = blankPageLike(pages[currentPage], newId());
      execute(insertPagesCommand(currentPage + 1, [page]), t('pages.addBlank'));
      setShowPageId(page.id);
      dialogs.toast(t('pages.blankAdded'));
    },
    addFiles: (kind) => void addFiles(kind),
  };

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
                : m === 'horizontal-animated'
                  ? ('book-open-page-variant' as const)
                  : ('arrow-expand-horizontal' as const),
        onPress: () => setMode(m),
      })),
      t('reader.viewMode'),
    );

  const chooseDisplay = () =>
    void dialogs.menu(
      [
        ...(['normal', 'night', 'sepia'] as DisplayFilter[]).map((f) => ({
          label: `${f === filter ? '✓ ' : ''}${t(`reader.${f}`)}`,
          icon:
            f === 'night'
              ? ('weather-night' as const)
              : f === 'sepia'
                ? ('palette-outline' as const)
                : ('white-balance-sunny' as const),
          onPress: () => {
            setFilter(f);
            updateSettings((s) => ({ ...s, reader: { ...s.reader, filter: f } }));
          },
        })),
        {
          label: showAnnotations ? t('annotate.hide') : t('annotate.show'),
          icon: showAnnotations ? ('eye-off-outline' as const) : ('eye-outline' as const),
          onPress: () => setShowAnnotations((v) => !v),
        },
      ],
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
                  commands: margins.map(({ id: pid, m }) => ({
                    type: 'setCrop' as const,
                    pageIds: [pid],
                    crop: m,
                  })),
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
          onPress: () =>
            execute({ type: 'setCrop', pageIds: pages.map((p) => p.id), crop: null }, t('reader.crop')),
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
  const slideOrFade =
    mode === 'horizontal-animated' && effectiveMode === 'horizontal' && reader.transition !== 'curl';
  const ms = reader.transitionMs;
  const entering = slideOrFade
    ? reader.transition === 'fade'
      ? FadeIn.duration(Math.round(ms * 0.65))
      : direction === 1
        ? SlideInRight.duration(ms)
        : SlideInLeft.duration(ms)
    : undefined;
  const exiting = slideOrFade
    ? reader.transition === 'fade'
      ? FadeOut.duration(Math.round(ms * 0.65))
      : direction === 1
        ? SlideOutLeft.duration(ms)
        : SlideOutRight.duration(ms)
    : undefined;

  const showBars = (barsVisible || annotating) && !fullscreen;
  // Phones: fewer icons in the top bar (the rest go to a "more" menu).
  const compactBar = size.width < 560;
  const canUndo = (history?.past.length ?? 0) > 0;
  const canRedo = (history?.future.length ?? 0) > 0;
  const annotatedPage = annotating && currentStop?.kind === 'page' ? pages[currentStop.page] : undefined;
  const toolbarSpace = annotating ? 96 : 0;

  const renderStop = (stop: Stop) => (
    <StopView
      stop={stop}
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
  );

  const glass = (style: object) => [styles.glass, cardShadow(theme, 2), style];
  const glassBg = (
    <>
      <BlurView intensity={50} tint="dark" style={[StyleSheet.absoluteFill, styles.glassClip]} />
      <View style={[StyleSheet.absoluteFill, styles.glassClip, { backgroundColor: 'rgba(24,20,16,0.62)' }]} />
    </>
  );

  return (
    <View style={[styles.fill, { backgroundColor: theme.readerBackground }]} testID="reader">
      <Stack.Screen
        options={{
          statusBarHidden: fullscreen,
          navigationBarHidden: fullscreen,
          autoHideHomeIndicator: fullscreen,
        }}
      />
      <PerformanceChrome active={fullscreen} />
      <PageAnnotationsContext.Provider value={showAnnotations ? model?.annotations : undefined}>
        <View
          style={[
            styles.fill,
            { paddingTop: fullscreen ? 0 : insets.top, paddingBottom: fullscreen ? 0 : insets.bottom },
          ]}
        >
          <View style={styles.fill} onLayout={onLayout}>
            {!ready ? (
              <View style={[styles.fill, styles.center]}>
                <ActivityIndicator color={theme.primary} size="large" />
              </View>
            ) : annotatedPage ? (
              <View style={[styles.fill, { paddingTop: 64, paddingBottom: toolbarSpace }]}>
                <AnnotateView
                  key={`${doc?.id}-${annotatedPage.id}`}
                  page={annotatedPage}
                  annotations={model?.annotations[annotatedPage.id] ?? []}
                  boxWidth={size.width - 16}
                  boxHeight={size.height - 64 - toolbarSpace}
                  tools={tools}
                  inputMode={inputMode}
                  filter={filter}
                  brightness={reader.brightness}
                  onAdd={(anns) =>
                    execute(
                      { type: 'addAnnotations', pageId: annotatedPage.id, annotations: anns },
                      t('reader.annotate'),
                    )
                  }
                  onRemove={(ids) =>
                    execute(
                      { type: 'removeAnnotations', pageId: annotatedPage.id, ids },
                      t('annotate.eraser'),
                    )
                  }
                  onUpdate={(a) =>
                    execute(
                      { type: 'updateAnnotations', pageId: annotatedPage.id, annotations: [a] },
                      t('annotate.text'),
                    )
                  }
                />
              </View>
            ) : isContinuous ? (
              <GestureDetector gesture={gestures}>
                <View style={[styles.fill, styles.touchArea]} collapsable={false} ref={zoomAreaRef}>
                  <Animated.View style={[styles.fill, zoomStyle]} testID="zoom-layer">
                    <RenderZoomContext.Provider value={renderZoom(zoom)}>
                      <ContinuousView
                        key={doc?.id}
                        ref={continuousRef}
                        pages={pages}
                        width={size.width}
                        height={size.height}
                        overlap={reader.continuousOverlap}
                        initialPage={currentPage}
                        filter={filter}
                        brightness={reader.brightness}
                        onPageChange={setContinuousPage}
                        scrollEnabled={(!fullscreen || reader.swipeToTurn) && !zoomed}
                      />
                    </RenderZoomContext.Provider>
                  </Animated.View>
                </View>
              </GestureDetector>
            ) : (
              <GestureDetector gesture={gestures}>
                <View style={[styles.fill, styles.touchArea]} collapsable={false} ref={zoomAreaRef}>
                  <Animated.View style={[StyleSheet.absoluteFill, zoomStyle]} testID="zoom-layer">
                    <RenderZoomContext.Provider value={renderZoom(zoom)}>
                      {animated3d ? (
                        <FlipStack
                          current={currentStop!}
                          flip={flip}
                          render={renderStop}
                          width={size.width}
                          sheetFor={(stop) => {
                            const p = stop.kind === 'page' ? pages[stop.page] : undefined;
                            if (!p) return { left: 0, width: size.width };
                            const w = fitWidth(p, size.width, size.height);
                            return { left: (size.width - w) / 2, width: w };
                          }}
                          duration={reader.transitionMs}
                        />
                      ) : (
                        <Animated.View
                          key={`${doc?.id}-${stopIndex}`}
                          entering={entering}
                          exiting={exiting}
                          style={StyleSheet.absoluteFill}
                        >
                          {renderStop(currentStop!)}
                        </Animated.View>
                      )}
                    </RenderZoomContext.Provider>
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

          {zoomed && !annotating ? (
            // Zoom level; pressing it goes back to the whole page.
            <Animated.View
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(120)}
              style={[styles.zoomPill, { bottom: showBars ? 84 : 16 }]}
            >
              <IconButton
                icon="magnify-minus-outline"
                label={`${Math.round(zoom * 100)} %`}
                showLabel
                color="#FFFFFF"
                size={20}
                onPress={resetZoom}
                testID="zoom-reset"
              />
            </Animated.View>
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
              <AppText style={{ color: '#FFFFFF', textAlign: 'center' }}>
                {t('reader.exitFullscreenHint')}
              </AppText>
            </View>
          ) : null}

          {banner ? (
            <Animated.View
              entering={FadeInDown.springify()}
              exiting={FadeOut}
              pointerEvents="none"
              style={[styles.banner, { top: insets.top + 12 }]}
              testID="piece-banner"
            >
              <AppText style={{ color: '#FFFFFF', fontWeight: '700' }} numberOfLines={1}>
                {banner}
              </AppText>
            </Animated.View>
          ) : null}

          {showBars ? (
            <>
              <Animated.View
                entering={FadeInUp.duration(160)}
                exiting={FadeOut.duration(120)}
                style={glass({ top: insets.top + 8 })}
                testID="reader-top-bar"
              >
                {glassBg}
                <IconButton
                  icon="arrow-left"
                  label={t('common.back')}
                  color="#FFFFFF"
                  onPress={() => void close()}
                  testID="reader-back"
                />
                <View style={{ flex: 1, marginHorizontal: SPACING.sm }}>
                  <AppText style={styles.title} numberOfLines={1}>
                    {doc?.title}
                  </AppText>
                  {pieces && pieceIndex >= 0 ? (
                    <AppText
                      variant="caption"
                      style={{ color: 'rgba(255,255,255,0.8)' }}
                      testID="piece-indicator"
                    >
                      {t('reader.piece', { n: pieceIndex + 1, total: pieces.length })}
                    </AppText>
                  ) : null}
                </View>
                {!annotating ? (
                  <>
                    <IconButton
                      icon="draw"
                      label={t('reader.annotate')}
                      color="#FFFFFF"
                      onPress={() => setAnnotating(true)}
                      testID="reader-annotate"
                    />
                    <IconButton
                      icon="undo"
                      label={t('common.undo')}
                      color="#FFFFFF"
                      onPress={() => {
                        undo();
                        scheduleHide(); // undoing several times: the bar stays visible
                      }}
                      disabled={!canUndo}
                      testID="reader-undo"
                    />
                    <IconButton
                      icon="view-grid-outline"
                      label={t('pages.open')}
                      color="#FFFFFF"
                      onPress={() => setPanelOpen(true)}
                      testID="reader-pages"
                    />
                    {compactBar ? (
                      <IconButton
                        icon="dots-horizontal"
                        label={t('library.moreOptions')}
                        color="#FFFFFF"
                        onPress={() =>
                          void dialogs.menu([
                            { label: t('reader.crop'), icon: 'crop', onPress: cropMenu },
                            { label: t('reader.display'), icon: 'theme-light-dark', onPress: chooseDisplay },
                          ])
                        }
                        testID="reader-more"
                      />
                    ) : (
                      <>
                        <IconButton icon="crop" label={t('reader.crop')} color="#FFFFFF" onPress={cropMenu} />
                        <IconButton
                          icon="theme-light-dark"
                          label={t('reader.display')}
                          color="#FFFFFF"
                          onPress={chooseDisplay}
                        />
                      </>
                    )}
                    <IconButton
                      icon="book-open-variant"
                      label={t('reader.viewMode')}
                      color="#FFFFFF"
                      onPress={chooseMode}
                      testID="reader-mode"
                    />
                    <IconButton
                      icon="fullscreen"
                      label={t('reader.fullscreen')}
                      color="#FFFFFF"
                      onPress={toggleFullscreen}
                      testID="reader-fullscreen"
                    />
                  </>
                ) : (
                  <>
                    <IconButton
                      icon="chevron-left"
                      label={t('reader.previous')}
                      color="#FFFFFF"
                      onPress={() => turn(-1)}
                    />
                    <AppText style={{ color: '#FFFFFF', fontWeight: '700' }} testID="page-indicator-annotate">
                      {currentPage + 1}/{pages.length}
                    </AppText>
                    <IconButton
                      icon="chevron-right"
                      label={t('reader.next')}
                      color="#FFFFFF"
                      onPress={() => turn(1)}
                    />
                  </>
                )}
                {annotating ? (
                  <IconButton
                    icon={showAnnotations ? 'eye-outline' : 'eye-off-outline'}
                    label={showAnnotations ? t('annotate.hide') : t('annotate.show')}
                    color="#FFFFFF"
                    onPress={() => setShowAnnotations((v) => !v)}
                  />
                ) : null}
              </Animated.View>
              {annotating ? null : (
                <Animated.View
                  entering={FadeInDown.duration(160)}
                  exiting={FadeOut.duration(120)}
                  style={glass({
                    bottom: insets.bottom + 8,
                    alignSelf: 'center',
                    left: undefined,
                    right: undefined,
                    paddingHorizontal: SPACING.sm,
                  })}
                >
                  {glassBg}
                  <IconButton
                    icon="chevron-left"
                    label={t('reader.previous')}
                    color="#FFFFFF"
                    onPress={() => turn(-1)}
                  />
                  {jumpBack !== null ? (
                    <IconButton
                      icon="keyboard-return"
                      label={t('reader.back')}
                      color="#FFFFFF"
                      onPress={() => goToPage(jumpBack, false)}
                    />
                  ) : null}
                  <Pressable
                    onPress={() => void askPage()}
                    accessibilityRole="button"
                    accessibilityLabel={t('reader.goToPage')}
                    style={styles.pageLabel}
                  >
                    <AppText style={{ color: '#FFFFFF', fontWeight: '700' }} testID="page-indicator">
                      {t('reader.page', { page: currentPage + 1, total: pages.length })}
                    </AppText>
                  </Pressable>
                  <IconButton
                    icon="chevron-right"
                    label={t('reader.next')}
                    color="#FFFFFF"
                    onPress={() => turn(1)}
                  />
                </Animated.View>
              )}
            </>
          ) : null}

          {annotating && !fullscreen ? (
            <AnnotationToolbar
              tools={tools}
              onChange={setTools}
              inputMode={inputMode}
              onInputMode={(m) => {
                updateSettings((s) => ({ ...s, annotations: { ...s.annotations, inputMode: m } }));
                dialogs.toast(m === 'stylus' ? t('annotate.stylusHint') : t('annotate.fingerHint'));
              }}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onClose={() => setAnnotating(false)}
              bottom={insets.bottom + 8}
            />
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
        {panelOpen && model && !annotating ? (
          <PagePanel
            pages={pages}
            current={currentPage}
            busy={panelBusy}
            onClose={() => setPanelOpen(false)}
            actions={pageActions}
          />
        ) : null}
      </PageAnnotationsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  glass: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.xl,
  },
  glassClip: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  title: { color: '#FFFFFF', fontWeight: '700' },
  pageLabel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.md },
  exitZone: { position: 'absolute', top: 0, left: 0, right: 0, height: 40 },
  // In a browser, touches on the score are handled by the app (turning, zooming,
  // moving), never by the browser itself (it would scroll or zoom the whole page).
  touchArea: { overflow: 'hidden', ...(Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : {}) },
  zoomPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(24, 20, 16, 0.78)',
    borderRadius: 999,
    paddingHorizontal: 6,
  },
  miniPage: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    opacity: 0.45,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  hint: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    maxWidth: 420,
  },
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(24,20,16,0.85)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    maxWidth: '90%',
  },
  busy: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xl, borderRadius: RADIUS.lg },
});
