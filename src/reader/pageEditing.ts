// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Building the commands of the page panel: add a blank page, insert pages,
// move, duplicate and delete. Every change is a command, so it can be undone.

import { buildDuplicatePages, type Command } from '../core/commands';
import {
  displayedPageSize,
  PAPER_SIZES,
  type BlankPageRef,
  type DocumentModel,
  type PageRef,
} from '../core/model';

/** A blank page with the same size as `like` (A4 when there is none). */
export function blankPageLike(like: PageRef | undefined, id: string): BlankPageRef {
  const s = like ? displayedPageSize(like) : PAPER_SIZES.a4;
  return {
    id,
    kind: 'blank',
    size: { width: Math.round(s.width), height: Math.round(s.height) },
    rotation: 0,
    crop: null,
  };
}

export function insertPagesCommand(at: number, pages: PageRef[]): Command {
  return { type: 'insertPages', at, pages };
}

/** Moves the page at `from` so it ends up at position `to`. */
export function movePageCommand(pages: PageRef[], from: number, to: number): Command | null {
  const page = pages[from];
  if (!page || from === to || to < 0 || to >= pages.length) return null;
  return { type: 'movePages', pageIds: [page.id], toIndex: to };
}

/** A document always keeps at least one page. */
export function canRemovePage(pages: PageRef[]): boolean {
  return pages.length > 1;
}

export function removePageCommand(pages: PageRef[], index: number): Command | null {
  const page = pages[index];
  if (!page || !canRemovePage(pages)) return null;
  return { type: 'removePages', pageIds: [page.id] };
}

/** Page to show after deleting the one at `index`: the next one, or the previous if it was the last. */
export function pageAfterRemoval(pages: PageRef[], index: number): string | null {
  return pages[index + 1]?.id ?? pages[index - 1]?.id ?? null;
}

/** Duplicates one page (with its annotations); the copy goes right after it. */
export function duplicatePageCommand(
  model: DocumentModel,
  index: number,
  newId: () => string,
): { command: Command; copyId: string } | null {
  const page = model.pages[index];
  if (!page) return null;
  let copyId = '';
  let first = true;
  const command = buildDuplicatePages(model, [page.id], () => {
    const id = newId();
    if (first) {
      copyId = id;
      first = false;
    }
    return id;
  });
  return { command, copyId };
}
