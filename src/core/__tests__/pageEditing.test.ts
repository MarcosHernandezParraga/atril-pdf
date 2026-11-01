// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { applyCommand } from '../commands';
import { emptyModel, type DocumentModel, type PageRef } from '../model';
import {
  blankPageLike,
  canRemovePage,
  duplicatePageCommand,
  insertPagesCommand,
  movePageCommand,
  pageAfterRemoval,
  removePageCommand,
} from '../../reader/pageEditing';

const pdf = (id: string, i: number): PageRef => ({
  id,
  kind: 'pdf',
  sourceId: 's1',
  pageIndex: i,
  size: { width: 595, height: 842 },
  rotation: 0,
  crop: null,
});

function model(): DocumentModel {
  return {
    ...emptyModel(),
    pages: [pdf('a', 0), pdf('b', 1), pdf('c', 2)],
    annotations: {
      b: [{ id: 'n1', layerId: 'default', type: 'stamp', stamp: 'p', x: 10, y: 10, size: 20, color: '#000' }],
    },
  };
}
const ids = (m: DocumentModel) => m.pages.map((p) => p.id).join('');

describe('page panel commands', () => {
  it('blank page with the size of the current page (A4 if none)', () => {
    const landscape: PageRef = { ...pdf('x', 0), rotation: 90 };
    expect(blankPageLike(landscape, 'n').size).toEqual({ width: 842, height: 595 });
    expect(blankPageLike(undefined, 'n').size.width).toBeGreaterThan(500);
    expect(blankPageLike(undefined, 'n').kind).toBe('blank');
  });

  it('inserts pages after the current one', () => {
    const m = applyCommand(model(), insertPagesCommand(1, [blankPageLike(undefined, 'n')]));
    expect(ids(m)).toBe('anbc');
  });

  it('moves a page up and down', () => {
    const m = model();
    expect(ids(applyCommand(m, movePageCommand(m.pages, 0, 2)!))).toBe('bca');
    expect(ids(applyCommand(m, movePageCommand(m.pages, 2, 0)!))).toBe('cab');
    expect(ids(applyCommand(m, movePageCommand(m.pages, 1, 2)!))).toBe('acb');
    expect(movePageCommand(m.pages, 1, 1)).toBeNull();
    expect(movePageCommand(m.pages, 1, 7)).toBeNull();
  });

  it('deletes a page but never the last one', () => {
    const m = model();
    expect(ids(applyCommand(m, removePageCommand(m.pages, 1)!))).toBe('ac');
    expect(pageAfterRemoval(m.pages, 1)).toBe('c');
    expect(pageAfterRemoval(m.pages, 2)).toBe('b');
    const one = { ...m, pages: [pdf('a', 0)] };
    expect(canRemovePage(one.pages)).toBe(false);
    expect(removePageCommand(one.pages, 0)).toBeNull();
  });

  it('duplicates a page with its annotations, right after it', () => {
    let n = 0;
    const m = model();
    const r = duplicatePageCommand(m, 1, () => `id${++n}`)!;
    const out = applyCommand(m, r.command);
    expect(r.copyId).toBe('id1');
    expect(ids(out)).toBe('abid1c');
    expect(out.annotations.id1).toHaveLength(1);
    expect(out.annotations.id1![0]!.id).not.toBe('n1');
  });
});
