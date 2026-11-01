// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Geometry for exporting a document to PDF: where each page and each
// annotation goes on the exported page, so that it looks exactly as in the
// reader (margins cropped and rotation applied).

import { displayedPageSize, type PageRef } from '../core/model';
import { pageToView } from '../core/pageTransform';

/** Affine matrix in PDF order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `outer ∘ inner`: first `inner`, then `outer`. */
export function compose(outer: Matrix, inner: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function apply(m: Matrix, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

export const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];

/**
 * From page coordinates (points of the page as imported: origin top-left, y
 * downwards, before cropping and before the rotation chosen in the app) to the
 * exported page (PDF points, origin bottom-left, y upwards).
 */
export function pageMatrix(page: PageRef): Matrix {
  const out = displayedPageSize(page);
  const o = pageToView(page, out.width, { x: 0, y: 0 });
  const px = pageToView(page, out.width, { x: 1, y: 0 });
  const py = pageToView(page, out.width, { x: 0, y: 1 });
  return [px.x - o.x, -(px.y - o.y), py.x - o.x, -(py.y - o.y), o.x, out.height - o.y];
}

/**
 * From the user space of a source PDF page to page coordinates, as pdf.js shows
 * the page at scale 1 (which is how page sizes and annotations were measured):
 * `view` is the visible box of the page and `rotate` its /Rotate value.
 */
export function sourcePageMatrix(view: [number, number, number, number], rotate: number): Matrix {
  const x0 = Math.min(view[0], view[2]);
  const x1 = Math.max(view[0], view[2]);
  const y0 = Math.min(view[1], view[3]);
  const y1 = Math.max(view[1], view[3]);
  const r = (((rotate % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const [A, B, C, D] =
    r === 90 ? [0, 1, 1, 0] : r === 180 ? [-1, 0, 0, 1] : r === 270 ? [0, -1, -1, 0] : [1, 0, 0, -1];
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const offX = A === 0 ? Math.abs(cy - y0) : Math.abs(cx - x0);
  const offY = A === 0 ? Math.abs(cx - x0) : Math.abs(cy - y0);
  return [A, B, C, D, offX - A * cx - C * cy, offY - B * cx - D * cy];
}

/** A colour as written in the app (#rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba()) to 0..1 values. */
export function parseColor(input: string): { r: number; g: number; b: number; a: number } {
  const s = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(s)?.[1];
  if (hex && [3, 4, 6, 8].includes(hex.length)) {
    const full = hex.length <= 4 ? [...hex].map((ch) => ch + ch).join('') : hex;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) : 1 };
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(s)?.[1];
  if (fn) {
    const parts = fn
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((v) => Number.isFinite(v))) {
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      return {
        r: clamp(parts[0]! / 255),
        g: clamp(parts[1]! / 255),
        b: clamp(parts[2]! / 255),
        a: parts[3] !== undefined && Number.isFinite(parts[3]) ? clamp(parts[3]) : 1,
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export type PathSegment =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

/**
 * Reads the paths made by the handwriting code (absolute M, L, Q and Z, with
 * repeated coordinates after a command). Quadratic curves become cubic ones,
 * which is what PDF supports.
 */
export function parsePath(d: string): PathSegment[] {
  const tokens = d.match(/[MLQZmlqz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: PathSegment[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const num = () => Number(tokens[i++]);
  const isNum = () => i < tokens.length && !/^[A-Za-z]$/.test(tokens[i]!);
  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i]!)) cmd = tokens[i++]!.toUpperCase();
    if (cmd === 'Z') {
      out.push({ op: 'Z' });
      cx = sx;
      cy = sy;
      cmd = '';
      continue;
    }
    if (!isNum()) {
      i++;
      continue;
    }
    if (cmd === 'M' || cmd === 'L') {
      const x = num();
      const y = num();
      out.push({ op: cmd, x, y });
      if (cmd === 'M') {
        sx = x;
        sy = y;
        cmd = 'L'; // further pairs after a move are lines
      }
      cx = x;
      cy = y;
    } else if (cmd === 'Q') {
      const qx = num();
      const qy = num();
      const x = num();
      const y = num();
      out.push({
        op: 'C',
        x1: cx + (2 / 3) * (qx - cx),
        y1: cy + (2 / 3) * (qy - cy),
        x2: x + (2 / 3) * (qx - x),
        y2: y + (2 / 3) * (qy - y),
        x,
        y,
      });
      cx = x;
      cy = y;
    } else {
      i++;
    }
  }
  return out;
}

/** Image placed inside a box keeping its proportions (like "contain"). */
export function containRect(
  box: { width: number; height: number },
  image: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  if (image.width <= 0 || image.height <= 0) return { x: 0, y: 0, ...box };
  const k = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * k;
  const height = image.height * k;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

/** A file name that every system accepts. */
export function safeFileName(title: string, ext = 'pdf'): string {
  const base = title
    .normalize('NFC')
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 120);
  return `${base || 'Atril PDF'}.${ext}`;
}
