// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Document commands. Every change to a document is described by a plain,
// serialisable command object and applied by a pure function. Commands carry
// every identifier they need, so applying the same command twice to the same
// model always produces the same result. Undo/redo is handled by `history.ts`.

import type { IdGenerator } from './ids';
import {
  addRotation,
  type Annotation,
  type DocumentModel,
  type Margins,
  type PageRef,
  type Rotation,
} from './model';

export type Command =
  | { type: 'insertPages'; at: number; pages: PageRef[]; annotations?: Record<string, Annotation[]> }
  | { type: 'removePages'; pageIds: string[] }
  | { type: 'movePages'; pageIds: string[]; toIndex: number }
  | { type: 'rotatePages'; pageIds: string[]; degrees: 90 | 180 | 270 }
  | { type: 'setCrop'; pageIds: string[]; crop: Margins | null }
  | { type: 'addAnnotations'; pageId: string; annotations: Annotation[] }
  | { type: 'removeAnnotations'; pageId: string; ids: string[] }
  | { type: 'updateAnnotations'; pageId: string; annotations: Annotation[] }
  | { type: 'replaceAnnotations'; pageId: string; remove: string[]; add: Annotation[] }
  | { type: 'batch'; commands: Command[] };

export class CommandError extends Error {}

function clampIndex(i: number, length: number): number {
  return Math.max(0, Math.min(length, Math.trunc(i)));
}

function indexOfPage(model: DocumentModel, id: string): number {
  return model.pages.findIndex((p) => p.id === id);
}

export function applyCommand(model: DocumentModel, cmd: Command): DocumentModel {
  switch (cmd.type) {
    case 'insertPages': {
      const existing = new Set(model.pages.map((p) => p.id));
      for (const p of cmd.pages) {
        if (existing.has(p.id)) throw new CommandError(`Duplicate page id ${p.id}`);
      }
      const at = clampIndex(cmd.at, model.pages.length);
      const pages = [...model.pages.slice(0, at), ...cmd.pages, ...model.pages.slice(at)];
      const annotations = cmd.annotations ? { ...model.annotations, ...cmd.annotations } : model.annotations;
      return { ...model, pages, annotations };
    }
    case 'removePages': {
      const ids = new Set(cmd.pageIds);
      if (ids.size === 0) return model;
      const pages = model.pages.filter((p) => !ids.has(p.id));
      if (pages.length === model.pages.length) return model;
      const annotations = { ...model.annotations };
      for (const id of ids) delete annotations[id];
      return { ...model, pages, annotations };
    }
    case 'movePages': {
      const ids = new Set(cmd.pageIds);
      const moving = model.pages.filter((p) => ids.has(p.id));
      if (moving.length === 0) return model;
      const rest = model.pages.filter((p) => !ids.has(p.id));
      const at = clampIndex(cmd.toIndex, rest.length);
      const pages = [...rest.slice(0, at), ...moving, ...rest.slice(at)];
      if (pages.every((p, i) => p === model.pages[i])) return model;
      return { ...model, pages };
    }
    case 'rotatePages': {
      const ids = new Set(cmd.pageIds);
      const pages = model.pages.map((p) =>
        ids.has(p.id) ? { ...p, rotation: addRotation(p.rotation, cmd.degrees) as Rotation } : p,
      );
      return { ...model, pages };
    }
    case 'setCrop': {
      const ids = new Set(cmd.pageIds);
      const crop = cmd.crop ? sanitizeMargins(cmd.crop) : null;
      const pages = model.pages.map((p) => (ids.has(p.id) ? { ...p, crop } : p));
      return { ...model, pages };
    }
    case 'addAnnotations': {
      requirePage(model, cmd.pageId);
      const current = model.annotations[cmd.pageId] ?? [];
      return withPageAnnotations(model, cmd.pageId, [...current, ...cmd.annotations]);
    }
    case 'removeAnnotations': {
      const current = model.annotations[cmd.pageId];
      if (!current) return model;
      const ids = new Set(cmd.ids);
      return withPageAnnotations(
        model,
        cmd.pageId,
        current.filter((a) => !ids.has(a.id)),
      );
    }
    case 'updateAnnotations': {
      const current = model.annotations[cmd.pageId];
      if (!current) return model;
      const byId = new Map(cmd.annotations.map((a) => [a.id, a]));
      return withPageAnnotations(
        model,
        cmd.pageId,
        current.map((a) => byId.get(a.id) ?? a),
      );
    }
    case 'replaceAnnotations': {
      requirePage(model, cmd.pageId);
      const remove = new Set(cmd.remove);
      const current = model.annotations[cmd.pageId] ?? [];
      // New pieces take the place of the first removed annotation to keep the drawing order.
      const firstRemoved = current.findIndex((a) => remove.has(a.id));
      const kept = current.filter((a) => !remove.has(a.id));
      const insertAt = firstRemoved < 0 ? kept.length : firstRemoved;
      return withPageAnnotations(model, cmd.pageId, [
        ...kept.slice(0, insertAt),
        ...cmd.add,
        ...kept.slice(insertAt),
      ]);
    }
    case 'batch':
      return cmd.commands.reduce(applyCommand, model);
  }
}

function requirePage(model: DocumentModel, pageId: string): void {
  if (indexOfPage(model, pageId) < 0) throw new CommandError(`Unknown page ${pageId}`);
}

function withPageAnnotations(model: DocumentModel, pageId: string, list: Annotation[]): DocumentModel {
  const annotations = { ...model.annotations };
  if (list.length === 0) delete annotations[pageId];
  else annotations[pageId] = list;
  return { ...model, annotations };
}

export function sanitizeMargins(m: Margins): Margins {
  const c = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(0.45, v)) : 0);
  return { left: c(m.left), top: c(m.top), right: c(m.right), bottom: c(m.bottom) };
}

// ---------------------------------------------------------------------------
// Command builders: they generate the identifiers, so `applyCommand` stays pure.
// ---------------------------------------------------------------------------

export function cloneAnnotation(a: Annotation, newId: IdGenerator): Annotation {
  const copy = JSON.parse(JSON.stringify(a)) as Annotation;
  copy.id = newId();
  return copy;
}

/** Duplicates pages (with their annotations); each copy goes right after its original. */
export function buildDuplicatePages(model: DocumentModel, pageIds: string[], newId: IdGenerator): Command {
  const wanted = new Set(pageIds);
  const commands: Command[] = [];
  let offset = 0;
  model.pages.forEach((page, index) => {
    if (!wanted.has(page.id)) return;
    const copyId = newId();
    const copy: PageRef = { ...page, id: copyId };
    const anns = model.annotations[page.id];
    commands.push({
      type: 'insertPages',
      at: index + 1 + offset,
      pages: [copy],
      annotations: anns ? { [copyId]: anns.map((a) => cloneAnnotation(a, newId)) } : undefined,
    });
    offset++;
  });
  return { type: 'batch', commands };
}

/** Pages of the model, in order, whose id is in the set (keeps document order). */
export function pagesInOrder(model: DocumentModel, pageIds: Iterable<string>): PageRef[] {
  const ids = new Set(pageIds);
  return model.pages.filter((p) => ids.has(p.id));
}

/**
 * Extracts pages into a brand new model (new page and annotation ids), used for
 * "extract pages", "split document" and "combine documents".
 */
export function extractPages(
  model: DocumentModel,
  pageIds: Iterable<string>,
  newId: IdGenerator,
): DocumentModel {
  const pages: PageRef[] = [];
  const annotations: Record<string, Annotation[]> = {};
  for (const page of pagesInOrder(model, pageIds)) {
    const id = newId();
    pages.push({ ...page, id });
    const anns = model.annotations[page.id];
    if (anns) annotations[id] = anns.map((a) => cloneAnnotation(a, newId));
  }
  return { formatVersion: 1, pages, annotations, layers: model.layers.map((l) => ({ ...l })) };
}

/** Concatenates several models into one (ids are regenerated). */
export function concatModels(models: DocumentModel[], newId: IdGenerator): DocumentModel {
  const result: DocumentModel = { formatVersion: 1, pages: [], annotations: {}, layers: [] };
  const layerIds = new Set<string>();
  for (const m of models) {
    const part = extractPages(
      m,
      m.pages.map((p) => p.id),
      newId,
    );
    result.pages.push(...part.pages);
    Object.assign(result.annotations, part.annotations);
    for (const l of part.layers) {
      if (!layerIds.has(l.id)) {
        layerIds.add(l.id);
        result.layers.push(l);
      }
    }
  }
  return result;
}

/** Ids of the pages that are affected by a command (used to save only what changed). */
export function touchedPages(cmd: Command): string[] {
  switch (cmd.type) {
    case 'insertPages':
      return cmd.pages.map((p) => p.id);
    case 'removePages':
    case 'movePages':
    case 'rotatePages':
    case 'setCrop':
      return cmd.pageIds;
    case 'addAnnotations':
    case 'removeAnnotations':
    case 'updateAnnotations':
    case 'replaceAnnotations':
      return [cmd.pageId];
    case 'batch':
      return [...new Set(cmd.commands.flatMap(touchedPages))];
  }
}
