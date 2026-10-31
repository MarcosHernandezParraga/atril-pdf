// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  applyCommand,
  buildDuplicatePages,
  CommandError,
  concatModels,
  extractPages,
  touchedPages,
  type Command,
} from '../commands';
import { canRedo, canUndo, createHistory, pushHistory, redo, undo, undoLabel } from '../history';
import { sequentialIds } from '../ids';
import { displayedPageSize, emptyModel, type Annotation, type DocumentModel, type PageRef } from '../model';

function pdfPage(id: string, pageIndex: number): PageRef {
  return {
    id,
    kind: 'pdf',
    sourceId: 'src',
    pageIndex,
    size: { width: 600, height: 800 },
    rotation: 0,
    crop: null,
  };
}

function ink(id: string): Annotation {
  return {
    id,
    layerId: 'default',
    type: 'ink',
    tool: 'pen',
    color: '#000',
    width: 2,
    points: [
      [1, 2, 0.5],
      [3, 4, 0.5],
    ],
  };
}

function model(n: number): DocumentModel {
  const m = emptyModel();
  m.pages = Array.from({ length: n }, (_, i) => pdfPage(`p${i}`, i));
  return m;
}

const ids = (m: DocumentModel) => m.pages.map((p) => p.id);

describe('page commands', () => {
  it('inserts pages at a position and clamps the index', () => {
    const m = applyCommand(model(3), { type: 'insertPages', at: 1, pages: [pdfPage('x', 9)] });
    expect(ids(m)).toEqual(['p0', 'x', 'p1', 'p2']);
    const end = applyCommand(model(2), { type: 'insertPages', at: 99, pages: [pdfPage('y', 0)] });
    expect(ids(end)).toEqual(['p0', 'p1', 'y']);
  });

  it('rejects duplicated page ids', () => {
    expect(() => applyCommand(model(2), { type: 'insertPages', at: 0, pages: [pdfPage('p1', 0)] })).toThrow(
      CommandError,
    );
  });

  it('removes pages together with their annotations', () => {
    let m = applyCommand(model(3), { type: 'addAnnotations', pageId: 'p1', annotations: [ink('a')] });
    m = applyCommand(m, { type: 'removePages', pageIds: ['p1'] });
    expect(ids(m)).toEqual(['p0', 'p2']);
    expect(m.annotations.p1).toBeUndefined();
  });

  it('moves several pages keeping their relative order', () => {
    const m = applyCommand(model(6), { type: 'movePages', pageIds: ['p4', 'p1'], toIndex: 0 });
    expect(ids(m)).toEqual(['p1', 'p4', 'p0', 'p2', 'p3', 'p5']);
    const toEnd = applyCommand(model(4), { type: 'movePages', pageIds: ['p0'], toIndex: 3 });
    expect(ids(toEnd)).toEqual(['p1', 'p2', 'p3', 'p0']);
  });

  it('returns the same object when nothing changes', () => {
    const m = model(3);
    expect(applyCommand(m, { type: 'movePages', pageIds: ['p0'], toIndex: 0 })).toBe(m);
    expect(applyCommand(m, { type: 'removePages', pageIds: ['zz'] })).toBe(m);
  });

  it('annotations follow their page when pages move', () => {
    let m = applyCommand(model(3), { type: 'addAnnotations', pageId: 'p0', annotations: [ink('a')] });
    m = applyCommand(m, { type: 'movePages', pageIds: ['p0'], toIndex: 2 });
    expect(ids(m)).toEqual(['p1', 'p2', 'p0']);
    expect(m.annotations.p0?.[0]?.id).toBe('a');
  });

  it('rotates pages and computes the displayed size', () => {
    let m = applyCommand(model(2), { type: 'rotatePages', pageIds: ['p0'], degrees: 90 });
    expect(m.pages[0]!.rotation).toBe(90);
    expect(displayedPageSize(m.pages[0]!)).toEqual({ width: 800, height: 600 });
    m = applyCommand(m, { type: 'rotatePages', pageIds: ['p0'], degrees: 270 });
    expect(m.pages[0]!.rotation).toBe(0);
  });

  it('sanitises crop margins', () => {
    const m = applyCommand(model(1), {
      type: 'setCrop',
      pageIds: ['p0'],
      crop: { left: -1, top: 0.1, right: 0.9, bottom: Number.NaN },
    });
    expect(m.pages[0]!.crop).toEqual({ left: 0, top: 0.1, right: 0.45, bottom: 0 });
    const size = displayedPageSize(m.pages[0]!);
    expect(size.width).toBeCloseTo(330);
    expect(size.height).toBeCloseTo(720);
  });

  it('duplicates pages right after the original, copying annotations with new ids', () => {
    let m = applyCommand(model(3), { type: 'addAnnotations', pageId: 'p1', annotations: [ink('a')] });
    m = applyCommand(m, buildDuplicatePages(m, ['p0', 'p1'], sequentialIds('n')));
    expect(ids(m)).toEqual(['p0', 'n1', 'p1', 'n2', 'p2']);
    expect(m.annotations.n2?.[0]?.id).toBe('n3');
    expect(m.annotations.p1?.[0]?.id).toBe('a');
  });

  it('replaces an erased stroke by its pieces at the same z-order', () => {
    let m = applyCommand(model(1), {
      type: 'addAnnotations',
      pageId: 'p0',
      annotations: [ink('a'), ink('b'), ink('c')],
    });
    m = applyCommand(m, { type: 'replaceAnnotations', pageId: 'p0', remove: ['b'], add: [ink('b1'), ink('b2')] });
    expect(m.annotations.p0!.map((a) => a.id)).toEqual(['a', 'b1', 'b2', 'c']);
  });

  it('removing the last annotation of a page clears the entry', () => {
    let m = applyCommand(model(1), { type: 'addAnnotations', pageId: 'p0', annotations: [ink('a')] });
    m = applyCommand(m, { type: 'removeAnnotations', pageId: 'p0', ids: ['a'] });
    expect(m.annotations).toEqual({});
  });

  it('extracts and concatenates documents with fresh ids', () => {
    let m = applyCommand(model(3), { type: 'addAnnotations', pageId: 'p2', annotations: [ink('a')] });
    const gen = sequentialIds('e');
    const part = extractPages(m, ['p2', 'p0'], gen);
    expect(part.pages.map((p) => (p.kind === 'pdf' ? p.pageIndex : -1))).toEqual([0, 2]);
    expect(Object.keys(part.annotations)).toHaveLength(1);
    const all = concatModels([m, part], sequentialIds('c'));
    expect(all.pages).toHaveLength(5);
    expect(new Set(all.pages.map((p) => p.id)).size).toBe(5);
  });

  it('lists touched pages', () => {
    const cmd: Command = {
      type: 'batch',
      commands: [
        { type: 'rotatePages', pageIds: ['a', 'b'], degrees: 90 },
        { type: 'addAnnotations', pageId: 'a', annotations: [] },
      ],
    };
    expect(touchedPages(cmd)).toEqual(['a', 'b']);
  });
});

describe('history', () => {
  it('undoes and redoes changes', () => {
    const m0 = model(2);
    let h = createHistory(m0);
    const m1 = applyCommand(m0, { type: 'removePages', pageIds: ['p0'] });
    h = pushHistory(h, m1, 'delete');
    expect(canUndo(h)).toBe(true);
    expect(undoLabel(h)).toBe('delete');
    h = undo(h);
    expect(h.present).toBe(m0);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present).toBe(m1);
  });

  it('a new change clears the redo stack and the limit is respected', () => {
    let h = createHistory(0, 3);
    for (let i = 1; i <= 5; i++) h = pushHistory(h, i, `s${i}`);
    expect(h.past).toHaveLength(3);
    h = undo(h);
    h = pushHistory(h, 42, 'x');
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(42);
  });

  it('ignores no-op changes', () => {
    const h = createHistory('a');
    expect(pushHistory(h, 'a', 'same')).toBe(h);
  });
});
