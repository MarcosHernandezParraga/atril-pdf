// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  clampLookahead,
  detectContentMargins,
  detectFirstSystemEnd,
  detectSplitPoint,
  rgbaToGray,
  type GrayImage,
} from '../contentDetection';

const W = 400;
const H = 560;

function blank(): GrayImage {
  return { width: W, height: H, data: new Uint8Array(W * H).fill(255) };
}

function fillRect(img: GrayImage, x0: number, y0: number, x1: number, y1: number, value = 0) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.data[y * img.width + x] = value;
}

/** Draws a 5-line staff (each line 1 px) starting at y with the given spacing. */
function staff(img: GrayImage, y: number, spacing = 5, x0 = 40, x1 = 360) {
  for (let i = 0; i < 5; i++) fillRect(img, x0, y + i * spacing, x1, y + i * spacing + 1);
  // Bar lines and a few "notes" so the staff has some vertical structure.
  fillRect(img, x0, y, x0 + 1, y + 4 * spacing + 1);
  fillRect(img, x1 - 1, y, x1, y + 4 * spacing + 1);
  for (let n = 0; n < 8; n++) fillRect(img, x0 + 20 + n * 35, y - 6, x0 + 25 + n * 35, y + 4 * spacing + 6);
}

/** A page with `count` systems; piano systems are two staves close together. */
function scorePage(count: number, piano = false, top = 60, gap = 26): GrayImage {
  const img = blank();
  let y = top;
  for (let s = 0; s < count; s++) {
    staff(img, y);
    let h = 4 * 5 + 1;
    if (piano) {
      staff(img, y + 34);
      h += 34;
    }
    y += h + gap;
  }
  return img;
}

describe('margin detection', () => {
  it('finds the box that contains the music', () => {
    const img = blank();
    fillRect(img, 50, 80, 350, 480);
    const m = detectContentMargins(img, undefined, 0)!;
    expect(m.left).toBeCloseTo(50 / W, 3);
    expect(m.right).toBeCloseTo(50 / W, 3);
    expect(m.top).toBeCloseTo(80 / H, 3);
    expect(m.bottom).toBeCloseTo(80 / H, 3);
  });

  it('ignores isolated dust specks', () => {
    const img = blank();
    fillRect(img, 100, 100, 300, 400);
    img.data[5 * W + 5] = 0; // speck near the corner
    const m = detectContentMargins(img, undefined, 0)!;
    expect(m.left).toBeCloseTo(100 / W, 3);
    expect(m.top).toBeCloseTo(100 / H, 3);
  });

  it('returns null for a blank page', () => {
    expect(detectContentMargins(blank())).toBeNull();
  });

  it('keeps a small padding and never exceeds 45%', () => {
    const img = blank();
    fillRect(img, 199, 279, 201, 281);
    const m = detectContentMargins(img, { inkThreshold: 200, noiseFraction: 0 })!;
    expect(m.left).toBeLessThanOrEqual(0.45);
    expect(m.top).toBeLessThanOrEqual(0.45);
  });

  it('converts RGBA to gray, treating transparency as white paper', () => {
    const rgba = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 255]);
    expect(Array.from(rgbaToGray(rgba, 3, 1).data)).toEqual([0, 255, 255]);
  });
});

describe('first system detection (look-ahead strip)', () => {
  it('finds the end of the first system', () => {
    const img = scorePage(6);
    const end = detectFirstSystemEnd(img)!;
    // First staff spans roughly 54..87 px (notes stick out 6 px), gap until ~106.
    expect(end * H).toBeGreaterThan(87);
    expect(end * H).toBeLessThan(115);
  });

  it('keeps the two staves of a piano system together', () => {
    const img = scorePage(4, true);
    const end = detectFirstSystemEnd(img)! * H;
    // Second staff of the first system ends around 60+34+20+6 = 120.
    expect(end).toBeGreaterThan(120);
    expect(end).toBeLessThan(150);
  });

  it('returns null when there is nothing to detect', () => {
    expect(detectFirstSystemEnd(blank())).toBeNull();
    const one = blank();
    fillRect(one, 40, 40, 360, 540);
    expect(detectFirstSystemEnd(one)).toBeNull();
  });

  it('clamps the strip between 10% and 35%', () => {
    expect(clampLookahead(0.02)).toBe(0.1);
    expect(clampLookahead(0.5)).toBe(0.35);
    expect(clampLookahead(0.2)).toBe(0.2);
  });
});

describe('smart split point (half-page turns)', () => {
  it('splits in a blank band between systems near the middle, never through a staff', () => {
    const img = scorePage(8);
    const split = detectSplitPoint(img)!;
    expect(split).toBeGreaterThan(0.35);
    expect(split).toBeLessThan(0.65);
    const row = Math.round(split * H);
    let ink = 0;
    for (let x = 0; x < W; x++) if (img.data[row * W + x]! < 200) ink++;
    expect(ink).toBe(0);
  });

  it('returns null when there is no gap in the central area', () => {
    const img = blank();
    fillRect(img, 40, 40, 360, 540);
    expect(detectSplitPoint(img)).toBeNull();
  });
});
