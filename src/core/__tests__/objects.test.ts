// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  duplicateObject,
  newImage,
  newStaff,
  objectHit,
  objectRect,
  resizeRect,
  staffHeight,
  staffLines,
  withRect,
} from '../../annotations/objects';

const A4 = { width: 595, height: 842 };

describe('staff and image placed on a page', () => {
  it('a new staff: five lines, no clef, centred', () => {
    const s = newStaff('s', A4);
    expect(s.clef).toBeNull();
    expect(staffLines(s)).toEqual([0, 6, 12, 18, 24]);
    expect(staffHeight(s)).toBe(24);
    const r = objectRect(s);
    expect(Math.abs(r.x + r.w / 2 - A4.width / 2)).toBeLessThanOrEqual(1);
  });

  it('stretching a staff changes its width and the space between lines', () => {
    const s = newStaff('s', A4);
    const bigger = withRect(s, { x: 10, y: 20, w: 300, h: 48 });
    expect(bigger.width).toBe(300);
    expect(bigger.lineSpacing).toBe(12);
    expect(staffLines(bigger)).toEqual([0, 12, 24, 36, 48]);
  });

  it('dragging a corner: the opposite corner stays still', () => {
    const r = { x: 100, y: 100, w: 200, h: 40 };
    expect(resizeRect(r, 'br', { x: 400, y: 160 }, { keepAspect: false, minW: 24, minH: 8 })).toEqual({
      x: 100,
      y: 100,
      w: 300,
      h: 60,
    });
    expect(resizeRect(r, 'tl', { x: 50, y: 90 }, { keepAspect: false, minW: 24, minH: 8 })).toEqual({
      x: 50,
      y: 90,
      w: 250,
      h: 50,
    });
    // Never smaller than the minimum.
    const tiny = resizeRect(r, 'br', { x: 101, y: 101 }, { keepAspect: false, minW: 24, minH: 8 });
    expect(tiny.w).toBe(24);
    expect(tiny.h).toBe(8);
  });

  it('images keep their proportions', () => {
    const r = { x: 0, y: 0, w: 100, h: 50 };
    const out = resizeRect(r, 'br', { x: 300, y: 60 }, { keepAspect: true, minW: 16, minH: 16 });
    expect(out.w / out.h).toBeCloseTo(2);
    expect(out.w).toBe(300);
    // Dragging mostly inwards makes it smaller, even if it moved a little outwards.
    const smaller = resizeRect(r, 'br', { x: 60, y: 52 }, { keepAspect: true, minW: 16, minH: 16 });
    expect(smaller.w).toBe(60);
    expect(smaller.h).toBe(30);
  });

  it('a new image fits the page with its proportions', () => {
    const img = newImage('i', 'src', { width: 1000, height: 500 }, A4);
    expect(img.width / img.height).toBeCloseTo(2, 1);
    const tall = newImage('i', 'src', { width: 100, height: 1000 }, A4);
    expect(tall.height).toBeLessThanOrEqual(A4.height * 0.6 + 1);
  });

  it('finds the object under the finger (topmost first) and duplicates it', () => {
    const s = newStaff('s', A4);
    const img = { ...newImage('i', 'src', { width: 100, height: 100 }, A4), x: s.x, y: s.y };
    expect(objectHit([s, img], s.x + 5, s.y + 5, 4)?.id).toBe('i');
    expect(objectHit([s], s.x + 5, s.y - 3, 4)?.id).toBe('s');
    expect(objectHit([s], 1, 1, 4)).toBeNull();
    const copy = duplicateObject(s, 'c');
    expect(copy.id).toBe('c');
    expect(copy.x).toBe(s.x + 12);
  });
});
