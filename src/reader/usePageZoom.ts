// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Zooming the score: pinch with two fingers (tablet, phone, touch screen) or,
// on a computer, Ctrl + mouse wheel, the trackpad pinch, or Ctrl + / Ctrl − /
// Ctrl 0. While zoomed, one finger (or the wheel) moves around the page.
// Taps, the pedal and the keys keep turning pages; turning resets the zoom.
//
// The movement runs on the UI thread (smooth even with heavy pages); React is
// only told the final zoom, so the pages can be rendered again, sharper.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { usePanGesture, usePinchGesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  clampPan,
  isZoomed,
  NO_ZOOM,
  panLimit,
  pinchState,
  zoomAt,
  type Size,
  type ZoomState,
} from './zoomMath';

interface DomLike {
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
}

const SNAP_MS = 160;

export function usePageZoom({
  box,
  content,
  enabled,
  resetKey,
}: {
  /** Size of the reading area. */
  box: Size;
  /** Size of what is shown inside it (e.g. the page), to know how far it can move. */
  content: Size;
  enabled: boolean;
  /** Whenever this changes (page turned, mode changed...) the zoom goes back to 100 %. */
  resetKey: string;
}) {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0, fx: 0, fy: 0, k0: 1 });

  // Zoom known by React (final value of each gesture), reset with `resetKey`.
  const [info, setInfo] = useState({ key: resetKey, zoom: 1 });
  let zoom = info.zoom;
  if (info.key !== resetKey) {
    setInfo({ key: resetKey, zoom: 1 });
    zoom = 1;
  }
  const commit = useCallback((value: number) => {
    setInfo((prev) => (prev.zoom === value ? prev : { key: prev.key, zoom: value }));
  }, []);

  useLayoutEffect(() => {
    scale.set(1);
    tx.set(0);
    ty.set(0);
  }, [resetKey, scale, tx, ty]);

  const zoomed = isZoomed(zoom);

  const pinch = usePinchGesture({
    enabled,
    onActivate: (e) => {
      'worklet';
      start.set({ scale: scale.get(), x: tx.get(), y: ty.get(), fx: e.focalX, fy: e.focalY, k0: e.scale });
    },
    onUpdate: (e) => {
      'worklet';
      const s = start.get();
      const n = pinchState(s, e.scale / (s.k0 || 1), s.fx, s.fy, e.focalX, e.focalY, box, content);
      scale.set(n.scale);
      tx.set(n.x);
      ty.set(n.y);
    },
    onDeactivate: () => {
      'worklet';
      if (isZoomed(scale.get())) {
        scheduleOnRN(commit, scale.get());
      } else {
        scale.set(withTiming(1, { duration: SNAP_MS }));
        tx.set(withTiming(0, { duration: SNAP_MS }));
        ty.set(withTiming(0, { duration: SNAP_MS }));
        scheduleOnRN(commit, 1);
      }
    },
  });

  // One finger moves the zoomed page (with a little inertia when released).
  const move = usePanGesture({
    enabled: enabled && zoomed,
    maxPointers: 1,
    minDistance: 4,
    onActivate: () => {
      'worklet';
      start.set({ scale: scale.get(), x: tx.get(), y: ty.get(), fx: 0, fy: 0, k0: 1 });
    },
    onUpdate: (e) => {
      'worklet';
      const s = start.get();
      const n = clampPan(
        { scale: scale.get(), x: s.x + e.translationX, y: s.y + e.translationY },
        box,
        content,
      );
      tx.set(n.x);
      ty.set(n.y);
    },
    onDeactivate: (e) => {
      'worklet';
      const lim = panLimit(scale.get(), box, content);
      tx.set(withDecay({ velocity: e.velocityX, clamp: [-lim.x, lim.x] }));
      ty.set(withDecay({ velocity: e.velocityY, clamp: [-lim.y, lim.y] }));
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  /** Zoom from code (wheel, keys, buttons). Coordinates in the area; default: its centre. */
  const latest = useRef({ box, content, commit });
  useEffect(() => {
    latest.current = { box, content, commit };
  });
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apply = useCallback(
    (next: ZoomState, settle: boolean) => {
      scale.set(next.scale);
      tx.set(next.x);
      ty.set(next.y);
      if (commitTimer.current) clearTimeout(commitTimer.current);
      const done = () => {
        if (!isZoomed(next.scale)) {
          scale.set(withTiming(1, { duration: SNAP_MS }));
          tx.set(withTiming(0, { duration: SNAP_MS }));
          ty.set(withTiming(0, { duration: SNAP_MS }));
          latest.current.commit(1);
        } else latest.current.commit(next.scale);
      };
      // Wheel and trackpad send many small steps: render sharper only when they stop.
      if (settle) done();
      else commitTimer.current = setTimeout(done, 220);
    },
    [scale, tx, ty],
  );
  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );
  const current = useCallback(
    (): ZoomState => ({ scale: scale.get(), x: tx.get(), y: ty.get() }),
    [scale, tx, ty],
  );
  const zoomBy = useCallback(
    (factor: number, fx?: number, fy?: number, settle = true) => {
      const { box: b, content: c } = latest.current;
      apply(zoomAt(current(), factor, fx ?? b.w / 2, fy ?? b.h / 2, b, c), settle);
    },
    [apply, current],
  );
  const reset = useCallback(() => apply(NO_ZOOM, true), [apply]);

  // --------------------------------------------------- computer: wheel, trackpad, keys
  const area = useRef<DomLike | null>(null);
  const areaRef = useCallback((view: unknown) => {
    area.current =
      view && typeof (view as DomLike).getBoundingClientRect === 'function' ? (view as DomLike) : null;
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const local = (clientX: number, clientY: number) => {
      const r = area.current?.getBoundingClientRect();
      return r ? { x: clientX - r.left, y: clientY - r.top } : { x: undefined, y: undefined };
    };
    let safariGesture = false;
    let safariStart = 1;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl + wheel, or a two-finger pinch on a trackpad (browsers report it this way).
        e.preventDefault();
        if (safariGesture) return;
        const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
        const factor = Math.min(1.25, Math.max(0.8, Math.exp(-e.deltaY * unit * 0.01)));
        const p = local(e.clientX, e.clientY);
        zoomBy(factor, p.x, p.y, false);
        return;
      }
      const s = current();
      if (!isZoomed(s.scale)) return; // not zoomed: the wheel turns pages (ReaderScreen)
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      const { box: b, content: c } = latest.current;
      apply(clampPan({ scale: s.scale, x: s.x - e.deltaX * unit, y: s.y - e.deltaY * unit }, b, c), true);
    };
    // Safari on a Mac sends its own "gesture" events for the trackpad pinch.
    const desktopSafari = typeof navigator !== 'undefined' && navigator.maxTouchPoints === 0;
    type SafariGesture = Event & { scale: number; clientX: number; clientY: number };
    const onGestureStart = (e: Event) => {
      e.preventDefault(); // never zoom the whole web page
      if (!desktopSafari) return;
      safariGesture = true;
      safariStart = (e as SafariGesture).scale || 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      if (!desktopSafari) return;
      const g = e as SafariGesture;
      const factor = (g.scale || 1) / safariStart;
      safariStart = g.scale || 1;
      const p = local(g.clientX, g.clientY);
      zoomBy(factor, p.x, p.y, false);
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      safariGesture = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === '+' || e.key === '=' || e.key === 'Add') zoomBy(1.25);
      else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') zoomBy(0.8);
      else if (e.key === '0') reset();
      else return;
      e.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('gesturestart', onGestureStart);
    window.addEventListener('gesturechange', onGestureChange);
    window.addEventListener('gestureend', onGestureEnd);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('gesturestart', onGestureStart);
      window.removeEventListener('gesturechange', onGestureChange);
      window.removeEventListener('gestureend', onGestureEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled, zoomBy, reset, apply, current]);

  /** Zoomed right now (also in the middle of a gesture). */
  const isZoomedNow = useCallback(() => isZoomed(scale.get()), [scale]);

  return { pinch, move, style, zoom, zoomed, zoomBy, reset, areaRef, isZoomedNow };
}
