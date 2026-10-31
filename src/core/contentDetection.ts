// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Image analysis used by the reader, working on a small grayscale rendering of
// a page (about 300-600 px wide is enough):
//  - automatic margin crop (bounding box of the "ink"),
//  - end of the first system of a page (for the look-ahead strip),
//  - best split point between systems near the middle (for half-page turns).
// Pure functions: easy to test with synthetic images.

import type { Margins } from './model';

export interface GrayImage {
  width: number;
  height: number;
  /** One byte per pixel, 0 = black, 255 = white. */
  data: Uint8Array;
}

export interface DetectionOptions {
  /** Pixels darker than this count as ink. */
  inkThreshold: number;
  /** Fraction of a row/column that must be ink to count as content (ignores dust). */
  noiseFraction: number;
}

export const DEFAULT_DETECTION: DetectionOptions = { inkThreshold: 200, noiseFraction: 0.004 };

/** Converts RGBA pixels (e.g. from a canvas) to luminance. Transparent pixels count as white. */
export function rgbaToGray(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let i = 0, j = 0; j < data.length; i += 4, j++) {
    const a = rgba[i + 3]! / 255;
    const lum = 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
    data[j] = Math.round(lum * a + 255 * (1 - a));
  }
  return { width, height, data };
}

export function rowInkProfile(img: GrayImage, opts = DEFAULT_DETECTION, x0 = 0, x1 = img.width): Uint32Array {
  const out = new Uint32Array(img.height);
  for (let y = 0; y < img.height; y++) {
    let count = 0;
    const base = y * img.width;
    for (let x = x0; x < x1; x++) if (img.data[base + x]! < opts.inkThreshold) count++;
    out[y] = count;
  }
  return out;
}

export function columnInkProfile(
  img: GrayImage,
  opts = DEFAULT_DETECTION,
  y0 = 0,
  y1 = img.height,
): Uint32Array {
  const out = new Uint32Array(img.width);
  for (let y = y0; y < y1; y++) {
    const base = y * img.width;
    for (let x = 0; x < img.width; x++) if (img.data[base + x]! < opts.inkThreshold) out[x]!++;
  }
  return out;
}

function firstAbove(profile: Uint32Array, min: number): number {
  for (let i = 0; i < profile.length; i++) if (profile[i]! > min) return i;
  return -1;
}

function lastAbove(profile: Uint32Array, min: number): number {
  for (let i = profile.length - 1; i >= 0; i--) if (profile[i]! > min) return i;
  return -1;
}

/**
 * Margins (fractions of the page) that can be removed without losing content.
 * Returns null for a blank page. A small padding is kept around the content.
 */
export function detectContentMargins(
  img: GrayImage,
  opts = DEFAULT_DETECTION,
  padding = 0.012,
): Margins | null {
  const rows = rowInkProfile(img, opts);
  const rowNoise = Math.max(1, Math.floor(img.width * opts.noiseFraction));
  const top = firstAbove(rows, rowNoise);
  const bottom = lastAbove(rows, rowNoise);
  if (top < 0 || bottom < top) return null;
  const cols = columnInkProfile(img, opts, top, bottom + 1);
  const colNoise = Math.max(1, Math.floor((bottom - top + 1) * opts.noiseFraction));
  const left = firstAbove(cols, colNoise);
  const right = lastAbove(cols, colNoise);
  if (left < 0 || right < left) return null;
  const clamp = (v: number) => Math.max(0, Math.min(0.45, v));
  return {
    left: clamp(left / img.width - padding),
    top: clamp(top / img.height - padding),
    right: clamp(1 - (right + 1) / img.width - padding),
    bottom: clamp(1 - (bottom + 1) / img.height - padding),
  };
}

export interface Gap {
  /** First blank row. */
  start: number;
  /** Last blank row (inclusive). */
  end: number;
}

/** Blank horizontal bands strictly between content rows. */
export function findGaps(rows: Uint32Array, noise: number): Gap[] {
  const gaps: Gap[] = [];
  const first = firstAbove(rows, noise);
  const last = lastAbove(rows, noise);
  if (first < 0) return gaps;
  let start = -1;
  for (let y = first; y <= last; y++) {
    const blank = rows[y]! <= noise;
    if (blank && start < 0) start = y;
    if (!blank && start >= 0) {
      gaps.push({ start, end: y - 1 });
      start = -1;
    }
  }
  return gaps;
}

export interface SystemOptions extends DetectionOptions {
  /** Minimum blank band between two systems, as a fraction of the page height. */
  minGap: number;
  /** Minimum height of a system, as a fraction of the page height. */
  minSystem: number;
}

export const DEFAULT_SYSTEM_OPTIONS: SystemOptions = { ...DEFAULT_DETECTION, minGap: 0.012, minSystem: 0.04 };

function profileFor(img: GrayImage, opts: SystemOptions) {
  // Ignore the outer 3% on each side (scanner borders, page numbers in the margin).
  const x0 = Math.floor(img.width * 0.03);
  const x1 = Math.ceil(img.width * 0.97);
  const rows = rowInkProfile(img, opts, x0, x1);
  const noise = Math.max(1, Math.floor((x1 - x0) * opts.noiseFraction));
  return { rows, noise };
}

/**
 * Bottom of the first system of a page, as a fraction (0..1) of the page height,
 * placed in the middle of the blank band that follows it. Null when not found.
 */
export function detectFirstSystemEnd(img: GrayImage, opts = DEFAULT_SYSTEM_OPTIONS): number | null {
  const { rows, noise } = profileFor(img, opts);
  const top = firstAbove(rows, noise);
  if (top < 0) return null;
  const minGapPx = Math.max(2, img.height * opts.minGap);
  const minSystemPx = img.height * opts.minSystem;
  for (const g of findGaps(rows, noise)) {
    if (g.end - g.start + 1 < minGapPx) continue;
    if (g.start - top < minSystemPx) continue;
    const y = (g.start + g.end + 1) / 2 / img.height;
    return y < 0.9 ? y : null;
  }
  return null;
}

/**
 * Best place to split a page between two systems, as close as possible to
 * `target` (default: the middle). Never cuts through a staff. Null when there
 * is no suitable blank band between 25% and 75% of the page.
 */
export function detectSplitPoint(img: GrayImage, target = 0.5, opts = DEFAULT_SYSTEM_OPTIONS): number | null {
  const { rows, noise } = profileFor(img, opts);
  const minGapPx = Math.max(2, img.height * opts.minGap);
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const g of findGaps(rows, noise)) {
    if (g.end - g.start + 1 < minGapPx) continue;
    const y = (g.start + g.end + 1) / 2 / img.height;
    if (y < 0.25 || y > 0.75) continue;
    const d = Math.abs(y - target);
    if (d < bestDistance) {
      bestDistance = d;
      best = y;
    }
  }
  return best;
}

/** Look-ahead strip height clamp (10% - 35% of the screen), as required by the reader. */
export function clampLookahead(fraction: number): number {
  return Math.max(0.1, Math.min(0.35, fraction));
}
