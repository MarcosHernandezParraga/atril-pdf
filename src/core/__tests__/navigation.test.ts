// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  buildStops,
  computeContinuousLayout,
  nextScroll,
  pageAtScroll,
  pagesOfStop,
  previousScroll,
  primaryPage,
  scrollForPage,
  step,
  stepSequence,
  stopIndexForPage,
  type Stop,
} from '../navigation';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const describeStops = (stops: Stop[]) =>
  stops.map((s) => (s.kind === 'half' ? `${s.top}/${s.bottom}` : pagesOfStop(s).join('+') || '-'));

/** Walks forward from the first stop with "next" until the end. */
function walk(stops: Stop[]): string[] {
  const seen: string[] = [];
  let i = 0;
  for (;;) {
    seen.push(describeStops([stops[i]!])[0]!);
    const r = step(stops.length, i, 1);
    if (!('index' in r)) break;
    i = r.index;
  }
  return seen;
}

describe('horizontal and vertical look-ahead', () => {
  it('one stop per page', () => {
    expect(walk(buildStops(range(3), 'horizontal'))).toEqual(['0', '1', '2']);
    expect(walk(buildStops(range(3), 'vertical-lookahead'))).toEqual(['0', '1', '2']);
  });

  it('reports the boundaries', () => {
    expect(step(3, 2, 1)).toEqual({ boundary: 'end' });
    expect(step(3, 0, -1)).toEqual({ boundary: 'start' });
  });

  it('handles an empty document', () => {
    expect(buildStops([], 'half-page')).toEqual([]);
  });
});

describe('half-page turns', () => {
  const stops = buildStops(range(3), 'half-page');

  it('alternates full pages and half steps', () => {
    expect(walk(stops)).toEqual(['0', '1/0', '1', '2/1', '2']);
  });

  it('the page being read during a half step is the bottom one', () => {
    expect(primaryPage(stops[1]!)).toBe(0);
  });

  it('previous undoes the steps in reverse order', () => {
    let i = stops.length - 1;
    const back: string[] = [];
    for (;;) {
      back.push(describeStops([stops[i]!])[0]!);
      const r = step(stops.length, i, -1);
      if (!('index' in r)) break;
      i = r.index;
    }
    expect(back).toEqual(['2', '2/1', '1', '1/0', '0']);
  });

  it('jumping to a page lands on the full page, never on a half step', () => {
    expect(stops[stopIndexForPage(stops, 1)]).toEqual({ kind: 'page', page: 1 });
  });

  it('single page document has a single stop', () => {
    expect(walk(buildStops([0], 'half-page'))).toEqual(['0']);
  });
});

describe('two pages (book mode)', () => {
  it('advances two by two', () => {
    const stops = buildStops(range(5), 'two-page', { twoPage: { coverAlone: false, step: 2 } });
    expect(walk(stops)).toEqual(['0+1', '2+3', '4']);
  });

  it('cover alone on the right, like a printed book', () => {
    const stops = buildStops(range(4), 'two-page', { twoPage: { coverAlone: true, step: 2 } });
    expect(stops[0]).toEqual({ kind: 'spread', left: null, right: 0 });
    expect(walk(stops)).toEqual(['0', '1+2', '3']);
  });

  it('advances one by one for sheet music (always shows what comes next)', () => {
    const stops = buildStops(range(4), 'two-page', { twoPage: { coverAlone: false, step: 1 } });
    expect(walk(stops)).toEqual(['0+1', '1+2', '2+3']);
  });

  it('one by one with cover alone', () => {
    const stops = buildStops(range(3), 'two-page', { twoPage: { coverAlone: true, step: 1 } });
    expect(walk(stops)).toEqual(['0', '0+1', '1+2']);
  });

  it('single-page documents', () => {
    expect(walk(buildStops([0], 'two-page', { twoPage: { coverAlone: false, step: 1 } }))).toEqual(['0']);
    expect(walk(buildStops([0], 'two-page', { twoPage: { coverAlone: true, step: 1 } }))).toEqual(['0']);
    expect(walk(buildStops([0], 'two-page', { twoPage: { coverAlone: false, step: 2 } }))).toEqual(['0']);
  });

  it('jumping to a page puts it on the left when possible', () => {
    const stops = buildStops(range(5), 'two-page', { twoPage: { coverAlone: false, step: 1 } });
    expect(stops[stopIndexForPage(stops, 2)]).toEqual({ kind: 'spread', left: 2, right: 3 });
    expect(stops[stopIndexForPage(stops, 4)]).toEqual({ kind: 'spread', left: 3, right: 4 });
    const book = buildStops(range(5), 'two-page', { twoPage: { coverAlone: false, step: 2 } });
    expect(book[stopIndexForPage(book, 3)]).toEqual({ kind: 'spread', left: 2, right: 3 });
  });
});

describe('page ranges (set-list items)', () => {
  it('only uses the given pages', () => {
    expect(walk(buildStops([4, 5, 6], 'half-page'))).toEqual(['4', '5/4', '5', '6/5', '6']);
  });
});

describe('set lists', () => {
  it('jumps to the first page of the next piece at the end', () => {
    expect(stepSequence([3, 2], { item: 0, stop: 2 }, 1)).toEqual({ item: 1, stop: 0 });
  });

  it('goes back to the last page of the previous piece', () => {
    expect(stepSequence([3, 2], { item: 1, stop: 0 }, -1)).toEqual({ item: 0, stop: 2 });
  });

  it('skips empty items and stops at the ends', () => {
    expect(stepSequence([1, 0, 2], { item: 0, stop: 0 }, 1)).toEqual({ item: 2, stop: 0 });
    expect(stepSequence([1, 2], { item: 1, stop: 1 }, 1)).toBeNull();
    expect(stepSequence([1, 2], { item: 0, stop: 0 }, -1)).toBeNull();
  });

  it('moves inside a piece', () => {
    expect(stepSequence([3], { item: 0, stop: 1 }, 1)).toEqual({ item: 0, stop: 2 });
  });
});

describe('vertical continuous', () => {
  const layout = computeContinuousLayout([1000, 1000, 1000], 10);

  it('lays pages one under another', () => {
    expect(layout.offsets).toEqual([0, 1010, 2020]);
    expect(layout.total).toBe(3020);
  });

  it('advances one screen minus the overlap so the last system stays visible', () => {
    expect(nextScroll(layout, 0, 800, 0.15)).toBeCloseTo(680);
    expect(previousScroll(layout, 680, 800, 0.15)).toBeCloseTo(0);
  });

  it('clamps at the end and reports when there is nothing more', () => {
    expect(nextScroll(layout, 2100, 800, 0.15)).toBe(2220);
    expect(nextScroll(layout, 2220, 800, 0.15)).toBeNull();
    expect(previousScroll(layout, 0, 800, 0.15)).toBeNull();
  });

  it('knows which page is being read', () => {
    expect(pageAtScroll(layout, 0)).toBe(0);
    expect(pageAtScroll(layout, 500)).toBe(0);
    expect(pageAtScroll(layout, 700)).toBe(1);
    expect(pageAtScroll(layout, 1010)).toBe(1);
    expect(pageAtScroll(layout, 2220)).toBe(2);
  });

  it('scrolls to a page without passing the end', () => {
    expect(scrollForPage(layout, 1, 800)).toBe(1010);
    expect(scrollForPage(layout, 2, 1500)).toBe(1520);
  });
});
