// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  clampPan,
  clampZoom,
  isZoomed,
  MAX_ZOOM,
  NO_ZOOM,
  panLimit,
  pinchState,
  renderZoom,
  zoomAt,
} from '../../reader/zoomMath';

const box = { w: 1000, h: 800 };
const page = { w: 560, h: 800 }; // portrait page centred in a landscape area

/** Where a content point (relative to the centre) appears on screen. */
const onScreen = (s: { scale: number; x: number; y: number }, px: number, py: number) => ({
  x: box.w / 2 + s.x + s.scale * px,
  y: box.h / 2 + s.y + s.scale * py,
});

describe('page zoom', () => {
  it('keeps the zoom between 100 % and the maximum', () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(50)).toBe(MAX_ZOOM);
  });

  it('cannot move a page that is not zoomed', () => {
    expect(panLimit(1, box, page)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ scale: 1, x: 120, y: -50 }, box, page)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('a zoomed page can move only as far as its edges', () => {
    // 2x: the page is 1120 x 1600, the area 1000 x 800.
    expect(panLimit(2, box, page)).toEqual({ x: 60, y: 400 });
    expect(clampPan({ scale: 2, x: 500, y: -900 }, box, page)).toEqual({ scale: 2, x: 60, y: -400 });
  });

  it('zooming with the wheel keeps the point under the pointer still', () => {
    // Pointer at the top of the page, where the first system is.
    const fx = 500;
    const fy = 100;
    const before = { px: fx - box.w / 2, py: fy - box.h / 2 };
    const z = zoomAt(NO_ZOOM, 2, fx, fy, box, page);
    expect(z.scale).toBe(2);
    const p = onScreen(z, before.px, before.py);
    expect(p.x).toBeCloseTo(fx);
    expect(p.y).toBeCloseTo(fy);
  });

  it('pinch: the music under the fingers follows the fingers', () => {
    const start = { scale: 1, x: 0, y: 0 };
    // Fingers start at (500, 300) and, while spreading, move to (520, 330).
    const z = pinchState(start, 2, 500, 300, 520, 330, box, page);
    const contentPoint = { px: 500 - box.w / 2, py: 300 - box.h / 2 };
    const p = onScreen(z, contentPoint.px, contentPoint.py);
    expect(z.scale).toBe(2);
    // Horizontally the page edge stops it (limit 60 px); vertically it follows exactly.
    expect(p.y).toBeCloseTo(330);
    expect(Math.abs(z.x)).toBeLessThanOrEqual(60);
  });

  it('snaps back below 104 % and renders sharper in quarter steps', () => {
    expect(isZoomed(1.02)).toBe(false);
    expect(isZoomed(1.3)).toBe(true);
    expect(renderZoom(1.02)).toBe(1);
    expect(renderZoom(1.6)).toBe(1.5);
    expect(renderZoom(2.2)).toBe(2.25);
    expect(renderZoom(9)).toBe(MAX_ZOOM);
  });
});
