// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Pure helpers for handwriting: natural pen outlines (perfect-freehand),
// highlighter lines, eraser hit-testing and text hit-testing.

import { getStroke } from 'perfect-freehand';

import type { InkAnnotation, InkPoint, TextAnnotation } from '../core/model';

/** SVG path of a filled pen stroke from points already in view coordinates. */
export function penOutlinePath(points: InkPoint[], size: number, hasPressure: boolean): string {
  if (points.length === 0) return '';
  const outline = getStroke(
    points.map(([x, y, p]) => [x, y, p]),
    {
      size,
      thinning: hasPressure ? 0.6 : 0.45,
      smoothing: 0.55,
      streamline: 0.4,
      simulatePressure: !hasPressure,
      last: true,
    },
  );
  return outlineToPath(outline);
}

/** Converts a closed outline into a smooth SVG path (quadratic curves through midpoints). */
export function outlineToPath(outline: number[][]): string {
  const n = outline.length;
  if (n === 0) return '';
  if (n < 3) {
    const [x, y] = outline[0]!;
    return `M ${fmt(x!)} ${fmt(y!)} Z`;
  }
  let d = `M ${fmt(outline[0]![0]!)} ${fmt(outline[0]![1]!)} Q`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = outline[i]!;
    const [x1, y1] = outline[(i + 1) % n]!;
    d += ` ${fmt(x0!)} ${fmt(y0!)} ${fmt((x0! + x1!) / 2)} ${fmt((y0! + y1!) / 2)}`;
  }
  return `${d} Z`;
}

/** Open polyline path (highlighter: constant width, drawn as a stroke). */
export function polylinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  if (rest.length === 0) return `M ${fmt(first!.x)} ${fmt(first!.y)} L ${fmt(first!.x + 0.1)} ${fmt(first!.y)}`;
  return `M ${fmt(first!.x)} ${fmt(first!.y)} ${rest.map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`).join(' ')}`;
}

function fmt(v: number): string {
  return Number.isFinite(v) ? v.toFixed(2) : '0';
}

export function hasRealPressure(points: InkPoint[]): boolean {
  return points.some((p) => Math.abs(p[2] - 0.5) > 0.02);
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Distance (page points) from a point to a stroke's centre line. */
export function distanceToStroke(stroke: InkAnnotation, x: number, y: number): number {
  const pts = stroke.points;
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(x - pts[0]![0], y - pts[0]![1]);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    best = Math.min(best, distanceToSegment(x, y, a[0], a[1], b[0], b[1]));
  }
  return best;
}

/** Strokes touched by the eraser at (x, y) with the given radius (page points). */
export function strokesHit(strokes: InkAnnotation[], x: number, y: number, radius: number): string[] {
  return strokes.filter((s) => distanceToStroke(s, x, y) <= radius + s.width / 2).map((s) => s.id);
}

export function textHit(texts: TextAnnotation[], x: number, y: number, margin = 4): TextAnnotation | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i]!;
    if (x >= t.x - margin && x <= t.x + t.width + margin && y >= t.y - margin && y <= t.y + t.height + margin) return t;
  }
  return null;
}

/** Drops points that are almost on top of the previous one (keeps strokes light). */
export function simplify(points: InkPoint[], minDistance: number): InkPoint[] {
  const out: InkPoint[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDistance) out.push(p);
  }
  const lastIn = points[points.length - 1];
  if (lastIn && out[out.length - 1] !== lastIn) out.push(lastIn);
  return out;
}

/** Approximate text box size (page points) for a text annotation. */
export function measureText(text: string, fontSize: number): { width: number; height: number } {
  const lines = text.split('\n');
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { width: Math.max(fontSize * 2, longest * fontSize * 0.56), height: lines.length * fontSize * 1.3 };
}
