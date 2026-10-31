// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { swipeAction, tapZoneAction } from '../tapZones';

describe('tap zones', () => {
  it('thirds: right = next, left = previous, centre = bars', () => {
    expect(tapZoneAction(900, 500, 1000, 1000, 'thirds', false)).toBe('next');
    expect(tapZoneAction(100, 500, 1000, 1000, 'thirds', false)).toBe('previous');
    expect(tapZoneAction(500, 900, 1000, 1000, 'thirds', false)).toBe('center');
  });

  it('can be inverted for left-handed players', () => {
    expect(tapZoneAction(900, 500, 1000, 1000, 'thirds', true)).toBe('previous');
    expect(tapZoneAction(500, 500, 1000, 1000, 'thirds', true)).toBe('center');
  });

  it('halves and top/bottom layouts', () => {
    expect(tapZoneAction(600, 100, 1000, 1000, 'halves', false)).toBe('next');
    expect(tapZoneAction(400, 900, 1000, 1000, 'halves', false)).toBe('previous');
    expect(tapZoneAction(500, 500, 1000, 1000, 'halves', false)).toBe('center');
    expect(tapZoneAction(100, 900, 1000, 1000, 'top-bottom', false)).toBe('next');
    expect(tapZoneAction(900, 100, 1000, 1000, 'top-bottom', false)).toBe('previous');
  });
});

describe('swipes', () => {
  it('a long or fast swipe to the left goes to the next page', () => {
    expect(swipeAction(-200, 0, 1000)).toBe('next');
    expect(swipeAction(30, 900, 1000)).toBe('previous');
  });

  it('small movements are ignored', () => {
    expect(swipeAction(-10, 100, 1000)).toBeNull();
  });
});
