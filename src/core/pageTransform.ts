// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Conversion between page coordinates (PDF points of the unrotated, uncropped
// page, origin top-left) and view coordinates (pixels of the page as shown on
// screen: crop applied, then rotation, scaled to the displayed width).

import { displayedPageSize, type PageRef } from './model';

export interface Point2 {
  x: number;
  y: number;
}

function geometry(page: PageRef, viewWidth: number) {
  const W = page.size.width;
  const H = page.size.height;
  const c = page.crop ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const cw = W * Math.max(0.05, 1 - c.left - c.right);
  const ch = H * Math.max(0.05, 1 - c.top - c.bottom);
  const scale = viewWidth / displayedPageSize(page).width;
  return { W, H, c, cw, ch, scale };
}

/** Pixels per PDF point at this displayed width. */
export function viewScale(page: PageRef, viewWidth: number): number {
  return geometry(page, viewWidth).scale;
}

export function pageToView(page: PageRef, viewWidth: number, p: Point2): Point2 {
  const { W, H, c, cw, ch, scale } = geometry(page, viewWidth);
  const u = p.x - c.left * W;
  const v = p.y - c.top * H;
  let x: number;
  let y: number;
  switch (page.rotation) {
    case 90:
      x = ch - v;
      y = u;
      break;
    case 180:
      x = cw - u;
      y = ch - v;
      break;
    case 270:
      x = v;
      y = cw - u;
      break;
    default:
      x = u;
      y = v;
  }
  return { x: x * scale, y: y * scale };
}

export function viewToPage(page: PageRef, viewWidth: number, p: Point2): Point2 {
  const { W, H, c, cw, ch, scale } = geometry(page, viewWidth);
  const x = p.x / scale;
  const y = p.y / scale;
  let u: number;
  let v: number;
  switch (page.rotation) {
    case 90:
      u = y;
      v = ch - x;
      break;
    case 180:
      u = cw - x;
      v = ch - y;
      break;
    case 270:
      u = cw - y;
      v = x;
      break;
    default:
      u = x;
      v = y;
  }
  return { x: u + c.left * W, y: v + c.top * H };
}
