// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Objects placed on a page that can be moved and resized: a small staff
// (five lines, no clef) and an image. All sizes are in page points, so they
// stay sharp at any zoom, like the PDF itself.

import {
  DEFAULT_LAYER_ID,
  type Annotation,
  type ImageAnnotation,
  type Size,
  type StaffAnnotation,
} from '../core/model';

export type PlacedObject = StaffAnnotation | ImageAnnotation;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export const MIN_STAFF_WIDTH = 24;
export const MIN_STAFF_HEIGHT = 8;
export const MIN_IMAGE_SIZE = 16;

export function isPlacedObject(a: Annotation): a is PlacedObject {
  return a.type === 'staff' || a.type === 'image';
}

/** Height of a staff block: its staves and the gaps between them. */
export function staffHeight(a: StaffAnnotation): number {
  const n = Math.max(1, a.staves) * (a.piano ? 2 : 1);
  return n * 4 * a.lineSpacing + (n - 1) * a.staffGap;
}

/** Y of every line of a staff, relative to its top. */
export function staffLines(a: StaffAnnotation): number[] {
  const n = Math.max(1, a.staves) * (a.piano ? 2 : 1);
  const ys: number[] = [];
  for (let s = 0; s < n; s++) {
    const top = s * (4 * a.lineSpacing + a.staffGap);
    for (let l = 0; l < 5; l++) ys.push(top + l * a.lineSpacing);
  }
  return ys;
}

export function objectRect(a: PlacedObject): Rect {
  if (a.type === 'staff') return { x: a.x, y: a.y, w: a.width, h: staffHeight(a) };
  return { x: a.x, y: a.y, w: a.width, h: a.height };
}

/** The object with a new position and size (a staff stretches its line spacing). */
export function withRect<T extends PlacedObject>(a: T, r: Rect): T {
  if (a.type === 'staff') {
    const k = r.h / Math.max(0.001, staffHeight(a));
    return { ...a, x: r.x, y: r.y, width: r.w, lineSpacing: a.lineSpacing * k, staffGap: a.staffGap * k };
  }
  return { ...a, x: r.x, y: r.y, width: r.w, height: r.h };
}

export function moveRect(r: Rect, dx: number, dy: number): Rect {
  return { ...r, x: r.x + dx, y: r.y + dy };
}

export function cornerPoint(r: Rect, c: Corner): { x: number; y: number } {
  return { x: c === 'tl' || c === 'bl' ? r.x : r.x + r.w, y: c === 'tl' || c === 'tr' ? r.y : r.y + r.h };
}

export function oppositeCorner(c: Corner): Corner {
  return c === 'tl' ? 'br' : c === 'br' ? 'tl' : c === 'tr' ? 'bl' : 'tr';
}

/**
 * New rectangle when the corner `c` is dragged to `to` (page points): the
 * opposite corner stays fixed. Images keep their proportions.
 */
export function resizeRect(
  r: Rect,
  c: Corner,
  to: { x: number; y: number },
  opts: { keepAspect: boolean; minW: number; minH: number },
): Rect {
  const fixed = cornerPoint(r, oppositeCorner(c));
  let w = Math.max(opts.minW, Math.abs(to.x - fixed.x));
  let h = Math.max(opts.minH, Math.abs(to.y - fixed.y));
  if (opts.keepAspect && r.w > 0 && r.h > 0) {
    // Follow the direction in which the corner moved the most (bigger or smaller).
    const kx = w / r.w;
    const ky = h / r.h;
    let k = Math.abs(Math.log(kx)) >= Math.abs(Math.log(ky)) ? kx : ky;
    k = Math.max(k, opts.minW / r.w, opts.minH / r.h);
    w = r.w * k;
    h = r.h * k;
  }
  // The dragged corner stays on its side of the fixed one.
  const left = c === 'tl' || c === 'bl';
  const top = c === 'tl' || c === 'tr';
  return { x: left ? fixed.x - w : fixed.x, y: top ? fixed.y - h : fixed.y, w, h };
}

/** Topmost object under a point (with a small margin, so thin staves are easy to grab). */
export function objectHit(
  objects: PlacedObject[],
  x: number,
  y: number,
  margin: number,
): PlacedObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i]!;
    const r = objectRect(o);
    if (x >= r.x - margin && x <= r.x + r.w + margin && y >= r.y - margin && y <= r.y + r.h + margin)
      return o;
  }
  return null;
}

/** A new small staff in the middle of the page. */
export function newStaff(id: string, page: Size): StaffAnnotation {
  const width = Math.round(page.width * 0.42);
  const lineSpacing = 6;
  return {
    id,
    layerId: DEFAULT_LAYER_ID,
    type: 'staff',
    x: Math.round((page.width - width) / 2),
    y: Math.round(page.height / 2 - 2 * lineSpacing),
    width,
    staves: 1,
    piano: false,
    clef: null,
    lineSpacing,
    lineWidth: 0.8,
    staffGap: 24,
    opaque: false,
  };
}

/** A new image in the middle of the page, at most 40 % of its width, with its own proportions. */
export function newImage(id: string, sourceId: string, pixels: Size, page: Size): ImageAnnotation {
  const aspect = pixels.height / Math.max(1, pixels.width);
  let width = page.width * 0.4;
  let height = width * aspect;
  if (height > page.height * 0.6) {
    height = page.height * 0.6;
    width = height / aspect;
  }
  return {
    id,
    layerId: DEFAULT_LAYER_ID,
    type: 'image',
    x: Math.round((page.width - width) / 2),
    y: Math.round((page.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
    rotation: 0,
    sourceId,
  };
}

/** Copy placed a little lower and to the right of the original. */
export function duplicateObject<T extends PlacedObject>(a: T, id: string): T {
  return { ...a, id, x: a.x + 12, y: a.y + 12 };
}
