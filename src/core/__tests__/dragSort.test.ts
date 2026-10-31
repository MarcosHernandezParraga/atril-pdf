// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { dropIndex, moveItem, shiftFor } from '../../ui/dragSortMath';

describe('drag to reorder', () => {
  it('computes where a dragged row lands', () => {
    expect(dropIndex(0, 0, 80, 5)).toBe(0);
    expect(dropIndex(0, 85, 80, 5)).toBe(1);
    expect(dropIndex(4, -170, 80, 5)).toBe(2);
    expect(dropIndex(1, 2000, 80, 5)).toBe(4);
    expect(dropIndex(3, -2000, 80, 5)).toBe(0);
  });

  it('other rows make room in the right direction', () => {
    // Dragging row 0 down to position 2: rows 1 and 2 move up.
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 0, 2, 80))).toEqual([0, -80, -80, 0]);
    // Dragging row 3 up to position 1: rows 1 and 2 move down.
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 3, 1, 80))).toEqual([0, 80, 80, 0]);
  });

  it('moves an element of a list', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });
});
