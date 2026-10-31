// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Geometry of the page zoom (pure functions, also used on the UI thread).
// The zoomed content is drawn with `translate(x, y) scale(s)` around the centre
// of the reading area, so a point p (relative to the centre) appears at x + s·p.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

export interface Size {
  w: number;
  h: number;
}

export interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

export const NO_ZOOM: ZoomState = { scale: 1, x: 0, y: 0 };

export function clampZoom(scale: number): number {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Largest displacement that still keeps the content covering the area (or centred if smaller). */
export function panLimit(scale: number, box: Size, content: Size): { x: number; y: number } {
  'worklet';
  return {
    x: Math.max(0, (scale * content.w - box.w) / 2),
    y: Math.max(0, (scale * content.h - box.h) / 2),
  };
}

export function clampPan(state: ZoomState, box: Size, content: Size): ZoomState {
  'worklet';
  const lim = panLimit(state.scale, box, content);
  return {
    scale: state.scale,
    // `|| 0` turns -0 into 0
    x: Math.min(lim.x, Math.max(-lim.x, state.x)) || 0,
    y: Math.min(lim.y, Math.max(-lim.y, state.y)) || 0,
  };
}

/**
 * Zoom by `factor` keeping the point under (fx, fy) — coordinates in the area,
 * from its top-left corner — exactly where it is.
 */
export function zoomAt(
  state: ZoomState,
  factor: number,
  fx: number,
  fy: number,
  box: Size,
  content: Size,
): ZoomState {
  'worklet';
  const scale = clampZoom(state.scale * factor);
  const k = scale / state.scale;
  const cx = fx - box.w / 2;
  const cy = fy - box.h / 2;
  return clampPan({ scale, x: cx - (cx - state.x) * k, y: cy - (cy - state.y) * k }, box, content);
}

/**
 * Pinch: the content point that was under the fingers when the pinch began
 * (start focal point) follows the fingers (current focal point), so two fingers
 * can zoom and move the page at the same time.
 */
export function pinchState(
  start: ZoomState,
  pinchScale: number,
  startFx: number,
  startFy: number,
  fx: number,
  fy: number,
  box: Size,
  content: Size,
): ZoomState {
  'worklet';
  const scale = clampZoom(start.scale * pinchScale);
  const px = (startFx - box.w / 2 - start.x) / start.scale;
  const py = (startFy - box.h / 2 - start.y) / start.scale;
  return clampPan({ scale, x: fx - box.w / 2 - scale * px, y: fy - box.h / 2 - scale * py }, box, content);
}

/** Below this the page is considered not zoomed (it snaps back to 100 %). */
export function isZoomed(scale: number): boolean {
  'worklet';
  return scale > 1.04;
}

/**
 * Zoom used to render the pages sharper: rounded to quarter steps so small
 * changes do not render the page again and again.
 */
export function renderZoom(scale: number): number {
  return isZoomed(scale) ? Math.round(clampZoom(scale) * 4) / 4 : 1;
}
