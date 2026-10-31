// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  distanceToStroke,
  measureText,
  outlineToPath,
  penOutlinePath,
  polylinePath,
  simplify,
  strokesHit,
  textHit,
} from '../../annotations/ink';
import type { InkAnnotation, PageRef, Rotation, TextAnnotation } from '../model';
import { pageToView, viewScale, viewToPage } from '../pageTransform';
import { POINTER, pointerAllowed } from '../../annotations/input';

function page(rotation: Rotation, crop: PageRef['crop'] = null): PageRef {
  return {
    id: 'p',
    kind: 'pdf',
    sourceId: 's',
    pageIndex: 0,
    size: { width: 600, height: 800 },
    rotation,
    crop,
  };
}

describe('page ↔ view coordinates', () => {
  it('scales an unrotated page', () => {
    const p = page(0);
    expect(viewScale(p, 300)).toBeCloseTo(0.5);
    expect(pageToView(p, 300, { x: 100, y: 200 })).toEqual({ x: 50, y: 100 });
  });

  it.each([0, 90, 180, 270] as Rotation[])('round-trips with rotation %i and crop', (r) => {
    const p = page(r, { left: 0.1, top: 0.05, right: 0.2, bottom: 0.1 });
    for (const pt of [
      { x: 70, y: 50 },
      { x: 300, y: 400 },
      { x: 470, y: 710 },
    ]) {
      const v = pageToView(p, 500, pt);
      const back = viewToPage(p, 500, v);
      expect(back.x).toBeCloseTo(pt.x, 6);
      expect(back.y).toBeCloseTo(pt.y, 6);
    }
  });

  it('rotating 90° clockwise puts the top-left corner at the top-right', () => {
    const p = page(90);
    // Displayed size: 800 x 600 points; at width 800 the scale is 1.
    expect(pageToView(p, 800, { x: 0, y: 0 })).toEqual({ x: 800, y: 0 });
    expect(pageToView(p, 800, { x: 600, y: 800 })).toEqual({ x: 0, y: 600 });
  });

  it('crop moves the origin', () => {
    const p = page(0, { left: 0.1, top: 0.1, right: 0, bottom: 0 });
    expect(pageToView(p, 540, { x: 60, y: 80 })).toEqual({ x: 0, y: 0 });
  });
});

const stroke = (id: string, pts: [number, number][], width = 2): InkAnnotation => ({
  id,
  layerId: 'default',
  type: 'ink',
  tool: 'pen',
  color: '#000',
  width,
  points: pts.map(([x, y]) => [x, y, 0.5]),
});

describe('ink', () => {
  it('builds smooth closed outlines for pen strokes', () => {
    const d = penOutlinePath(
      [
        [0, 0, 0.5],
        [10, 5, 0.5],
        [20, 0, 0.5],
      ],
      4,
      false,
    );
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(penOutlinePath([], 4, false)).toBe('');
    expect(outlineToPath([[1, 2]])).toBe('M 1.00 2.00 Z');
  });

  it('builds polylines for the highlighter', () => {
    expect(
      polylinePath([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ]),
    ).toBe('M 0.00 0.00 L 5.00 5.00');
  });

  it('eraser finds the strokes it touches', () => {
    const a = stroke('a', [
      [0, 0],
      [100, 0],
    ]);
    const b = stroke('b', [
      [0, 50],
      [100, 50],
    ]);
    expect(distanceToStroke(a, 50, 3)).toBeCloseTo(3);
    expect(strokesHit([a, b], 50, 4, 4)).toEqual(['a']);
    expect(strokesHit([a, b], 50, 25, 4)).toEqual([]);
  });

  it('simplifies dense point lists but keeps the last point', () => {
    const pts: [number, number, number][] = [
      [0, 0, 0.5],
      [0.1, 0, 0.5],
      [0.2, 0, 0.5],
      [5, 0, 0.5],
      [5.1, 0, 0.5],
    ];
    const out = simplify(pts, 1);
    expect(out.map((p) => p[0])).toEqual([0, 5, 5.1]);
  });

  it('finds the text box under a point', () => {
    const t: TextAnnotation = {
      id: 't',
      layerId: 'default',
      type: 'text',
      x: 10,
      y: 10,
      width: 50,
      height: 20,
      text: 'Coda',
      fontSize: 14,
      color: '#000',
      bold: false,
    };
    expect(textHit([t], 30, 20)?.id).toBe('t');
    expect(textHit([t], 100, 100)).toBeNull();
    expect(measureText('ab\ncdef', 10).height).toBeCloseTo(26);
  });
});

describe('pencil / finger input mode', () => {
  it('"pencil and finger": both draw', () => {
    expect(pointerAllowed('both', POINTER.TOUCH)).toBe(true);
    expect(pointerAllowed('both', POINTER.STYLUS)).toBe(true);
  });
  it('"pencil only": the finger (and a resting palm) never draws', () => {
    expect(pointerAllowed('stylus', POINTER.TOUCH)).toBe(false);
    expect(pointerAllowed('stylus', POINTER.STYLUS)).toBe(true);
  });
  it('the mouse always draws on a computer; "off" disables everything', () => {
    expect(pointerAllowed('stylus', POINTER.MOUSE)).toBe(true);
    expect(pointerAllowed('off', POINTER.STYLUS)).toBe(false);
  });
});
