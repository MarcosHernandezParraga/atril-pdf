// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Data access for the library: documents, folders, sources, annotations,
// bookmarks, set lists and settings. Platform independent (works on top of
// any SqlExecutor through Drizzle).

import { and, asc, desc, eq, inArray, isNotNull, isNull, like, lt, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';

import type { Annotation, AnnotationLayer, DocumentModel, PageRef } from '../core/model';
import { DEFAULT_LAYER_ID } from '../core/model';
import type { AppDatabase } from '../db/database';
import {
  annotations,
  bookmarks,
  documents,
  folders,
  settings,
  setlistItems,
  setlists,
  sources,
  type BookmarkRow,
  type DocumentRow,
  type FolderRow,
  type SetlistItemRow,
  type SetlistRow,
  type SourceRow,
} from '../db/schema';

export type DocumentSort = 'name' | 'added' | 'opened';

export interface StoredPages {
  formatVersion: 1;
  pages: PageRef[];
  layers: AnnotationLayer[];
}

export interface NewSource {
  id: string;
  kind: 'pdf' | 'image';
  path: string;
  linked: boolean;
  originalName: string;
  byteSize: number;
  pageSizes: [number, number][];
  sha256?: string | null;
  password?: string | null;
}

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function pagesJson(model: DocumentModel): string {
  const stored: StoredPages = { formatVersion: 1, pages: model.pages, layers: model.layers };
  return JSON.stringify(stored);
}

export function parseStoredPages(json: string): StoredPages {
  const parsed = JSON.parse(json) as Partial<StoredPages>;
  return {
    formatVersion: 1,
    pages: Array.isArray(parsed.pages) ? parsed.pages : [],
    layers:
      Array.isArray(parsed.layers) && parsed.layers.length > 0
        ? parsed.layers
        : [{ id: DEFAULT_LAYER_ID, name: '', visible: true }],
  };
}

/** True if `folderId` is `ancestorId` or lies somewhere inside it. */
export function isInside(all: Pick<FolderRow, 'id' | 'parentId'>[], folderId: string | null, ancestorId: string): boolean {
  const byId = new Map(all.map((f) => [f.id, f]));
  let cur = folderId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === ancestorId) return true;
    seen.add(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}

export class LibraryRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  /** Runs several statements atomically (one transaction). */
  private async batch(items: BatchItem<'sqlite'>[]): Promise<void> {
    if (items.length === 0) return;
    await this.db.batch(items as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  }

  // ----------------------------------------------------------------- documents

  async createDocument(input: {
    id: string;
    title: string;
    folderId: string | null;
    model: DocumentModel;
    sources: NewSource[];
  }): Promise<void> {
    const t = this.now();
    const json = pagesJson(input.model);
    const sourceInserts = input.sources.map((s) =>
      this.db.insert(sources).values({
        id: s.id,
        kind: s.kind,
        path: s.path,
        linked: s.linked,
        originalName: s.originalName,
        byteSize: s.byteSize,
        pageCount: s.pageSizes.length,
        pageSizesJson: JSON.stringify(s.pageSizes),
        sha256: s.sha256 ?? null,
        password: s.password ?? null,
        createdAt: t,
      }),
    );
    const docInsert = this.db.insert(documents).values({
      id: input.id,
      title: input.title,
      folderId: input.folderId,
      createdAt: t,
      updatedAt: t,
      pageCount: input.model.pages.length,
      modelJson: json,
      originalModelJson: json,
    });
    const annInserts = Object.entries(input.model.annotations).map(([pageId, list]) =>
      this.db
        .insert(annotations)
        .values({ pageId, documentId: input.id, json: JSON.stringify(list), updatedAt: t }),
    );
    await this.batch([docInsert, ...sourceInserts, ...annInserts]);
  }

  async addSources(list: NewSource[]): Promise<void> {
    if (list.length === 0) return;
    const t = this.now();
    await this.batch(
      list.map((s) =>
        this.db.insert(sources).values({
          id: s.id,
          kind: s.kind,
          path: s.path,
          linked: s.linked,
          originalName: s.originalName,
          byteSize: s.byteSize,
          pageCount: s.pageSizes.length,
          pageSizesJson: JSON.stringify(s.pageSizes),
          sha256: s.sha256 ?? null,
          password: s.password ?? null,
          createdAt: t,
        }),
      ),
    );
  }

  async getDocument(id: string): Promise<DocumentRow | undefined> {
    return this.db.select().from(documents).where(eq(documents.id, id)).get();
  }

  async listDocuments(opts: {
    folderId?: string | null;
    search?: string;
    sort?: DocumentSort;
    favoritesOnly?: boolean;
    trash?: boolean;
  } = {}): Promise<DocumentRow[]> {
    const conds = [opts.trash ? isNotNull(documents.deletedAt) : isNull(documents.deletedAt)];
    if (opts.folderId !== undefined) {
      conds.push(opts.folderId === null ? isNull(documents.folderId) : eq(documents.folderId, opts.folderId));
    }
    if (opts.search?.trim()) {
      conds.push(like(sql`lower(${documents.title})`, `%${opts.search.trim().toLowerCase()}%`));
    }
    if (opts.favoritesOnly) conds.push(eq(documents.favorite, true));
    const order =
      opts.sort === 'added'
        ? desc(documents.createdAt)
        : opts.sort === 'opened'
          ? desc(sql`coalesce(${documents.lastOpenedAt}, 0)`)
          : asc(sql`lower(${documents.title})`);
    return this.db
      .select()
      .from(documents)
      .where(and(...conds))
      .orderBy(order);
  }

  async recentDocuments(limit = 12): Promise<DocumentRow[]> {
    return this.db
      .select()
      .from(documents)
      .where(and(isNull(documents.deletedAt), isNotNull(documents.lastOpenedAt)))
      .orderBy(desc(documents.lastOpenedAt))
      .limit(limit);
  }

  async renameDocument(id: string, title: string): Promise<void> {
    await this.db
      .update(documents)
      .set({ title: title.trim() || title, updatedAt: this.now() })
      .where(eq(documents.id, id));
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    await this.db.update(documents).set({ favorite }).where(eq(documents.id, id));
  }

  async moveDocuments(ids: string[], folderId: string | null): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(documents)
      .set({ folderId, updatedAt: this.now() })
      .where(inArray(documents.id, ids));
  }

  async markOpened(id: string): Promise<void> {
    await this.db.update(documents).set({ lastOpenedAt: this.now() }).where(eq(documents.id, id));
  }

  async saveViewState(id: string, state: unknown): Promise<void> {
    await this.db
      .update(documents)
      .set({ viewStateJson: JSON.stringify(state) })
      .where(eq(documents.id, id));
  }

  async setThumbnail(id: string, path: string | null): Promise<void> {
    await this.db.update(documents).set({ thumbnailPath: path }).where(eq(documents.id, id));
  }

  async trashDocuments(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.update(documents).set({ deletedAt: this.now() }).where(inArray(documents.id, ids));
  }

  async restoreDocuments(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const rows = await this.db.select().from(documents).where(inArray(documents.id, ids));
    const live = new Set((await this.allFolders()).map((f) => f.id));
    await this.batch(
      rows.map((r) =>
        this.db
          .update(documents)
          .set({ deletedAt: null, folderId: r.folderId && live.has(r.folderId) ? r.folderId : null })
          .where(eq(documents.id, r.id)),
      ),
    );
  }

  /** Permanently deletes documents. Returns the sources no longer used by any document. */
  async deleteDocuments(ids: string[]): Promise<SourceRow[]> {
    if (ids.length === 0) return [];
    await this.batch([
      this.db.delete(annotations).where(inArray(annotations.documentId, ids)),
      this.db.delete(bookmarks).where(inArray(bookmarks.documentId, ids)),
      this.db.delete(setlistItems).where(inArray(setlistItems.documentId, ids)),
      this.db.delete(documents).where(inArray(documents.id, ids)),
    ]);
    return this.collectOrphanSources();
  }

  /** Documents in the trash for longer than the retention period. */
  async expiredTrash(): Promise<string[]> {
    const rows = await this.db
      .select({ id: documents.id })
      .from(documents)
      .where(and(isNotNull(documents.deletedAt), lt(documents.deletedAt, this.now() - TRASH_RETENTION_MS)));
    return rows.map((r) => r.id);
  }

  /** Removes source rows not referenced by any document and returns them (files must be deleted too). */
  async collectOrphanSources(): Promise<SourceRow[]> {
    const used = new Set<string>();
    const docs = await this.db
      .select({ modelJson: documents.modelJson, originalModelJson: documents.originalModelJson })
      .from(documents);
    const annRows = await this.db.select({ json: annotations.json }).from(annotations);
    for (const d of docs) {
      for (const json of [d.modelJson, d.originalModelJson]) {
        for (const p of parseStoredPages(json).pages) if ('sourceId' in p) used.add(p.sourceId);
      }
    }
    for (const a of annRows) {
      for (const ann of JSON.parse(a.json) as Annotation[]) if (ann.type === 'image') used.add(ann.sourceId);
    }
    const all = await this.db.select().from(sources);
    const orphans = all.filter((s) => !used.has(s.id));
    if (orphans.length > 0) {
      await this.db.delete(sources).where(
        inArray(
          sources.id,
          orphans.map((s) => s.id),
        ),
      );
    }
    return orphans;
  }

  // -------------------------------------------------------------------- model

  async loadModel(id: string): Promise<DocumentModel | null> {
    const doc = await this.getDocument(id);
    if (!doc) return null;
    const stored = parseStoredPages(doc.modelJson);
    const rows = await this.db.select().from(annotations).where(eq(annotations.documentId, id));
    const pageIds = new Set(stored.pages.map((p) => p.id));
    const anns: Record<string, Annotation[]> = {};
    for (const r of rows) if (pageIds.has(r.pageId)) anns[r.pageId] = JSON.parse(r.json) as Annotation[];
    return { formatVersion: 1, pages: stored.pages, layers: stored.layers, annotations: anns };
  }

  /**
   * Saves the model. Only the annotation lists that changed (by reference
   * compared with `previous`) are written.
   */
  async saveModel(id: string, model: DocumentModel, previous?: DocumentModel | null): Promise<void> {
    const t = this.now();
    const statements: unknown[] = [
      this.db
        .update(documents)
        .set({ modelJson: pagesJson(model), pageCount: model.pages.length, updatedAt: t })
        .where(eq(documents.id, id)),
    ];
    const prev = previous?.annotations ?? null;
    const pageIds = new Set(model.pages.map((p) => p.id));
    for (const [pageId, list] of Object.entries(model.annotations)) {
      if (!pageIds.has(pageId)) continue;
      if (prev && prev[pageId] === list) continue;
      statements.push(
        this.db
          .insert(annotations)
          .values({ pageId, documentId: id, json: JSON.stringify(list), updatedAt: t })
          .onConflictDoUpdate({ target: annotations.pageId, set: { json: JSON.stringify(list), updatedAt: t } }),
      );
    }
    // Annotation lists that disappeared (all erased, or page deleted).
    const removed = prev
      ? Object.keys(prev).filter((k) => !model.annotations[k])
      : (await this.db.select({ pageId: annotations.pageId }).from(annotations).where(eq(annotations.documentId, id)))
          .map((r) => r.pageId)
          .filter((k) => !model.annotations[k]);
    if (removed.length > 0) statements.push(this.db.delete(annotations).where(inArray(annotations.pageId, removed)));
    await this.batch(statements as BatchItem<'sqlite'>[]);
  }

  /** "Restore original": back to the pages as imported, without annotations. */
  async restoreOriginal(id: string): Promise<void> {
    const doc = await this.getDocument(id);
    if (!doc) return;
    await this.batch([
      this.db.delete(annotations).where(eq(annotations.documentId, id)),
      this.db
        .update(documents)
        .set({
          modelJson: doc.originalModelJson,
          pageCount: parseStoredPages(doc.originalModelJson).pages.length,
          updatedAt: this.now(),
        })
        .where(eq(documents.id, id)),
    ]);
  }

  // ------------------------------------------------------------------ sources

  async getSources(ids: string[]): Promise<SourceRow[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(sources).where(inArray(sources.id, ids));
  }

  async allSources(): Promise<SourceRow[]> {
    return this.db.select().from(sources);
  }

  // ------------------------------------------------------------------ folders

  async allFolders(): Promise<FolderRow[]> {
    return this.db.select().from(folders).where(isNull(folders.deletedAt)).orderBy(asc(sql`lower(${folders.name})`));
  }

  async createFolder(id: string, name: string, parentId: string | null, color: string | null = null): Promise<void> {
    const t = this.now();
    await this.db.insert(folders).values({ id, name, parentId, color, createdAt: t, updatedAt: t });
  }

  async updateFolder(id: string, patch: { name?: string; color?: string | null }): Promise<void> {
    await this.db
      .update(folders)
      .set({ ...patch, updatedAt: this.now() })
      .where(eq(folders.id, id));
  }

  /** Moves folders into another folder. Refuses (returns false) to move a folder inside itself. */
  async moveFolders(ids: string[], parentId: string | null): Promise<boolean> {
    const all = await this.allFolders();
    if (parentId && ids.some((id) => isInside(all, parentId, id))) return false;
    if (ids.length === 0) return true;
    await this.db
      .update(folders)
      .set({ parentId, updatedAt: this.now() })
      .where(inArray(folders.id, ids));
    return true;
  }

  /** Breadcrumb from the root to the folder. */
  async folderPath(id: string | null): Promise<FolderRow[]> {
    const all = await this.allFolders();
    const byId = new Map(all.map((f) => [f.id, f]));
    const path: FolderRow[] = [];
    let cur = id ? byId.get(id) : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      path.unshift(cur);
      seen.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
  }

  /** Moves a folder (and everything inside it) to the trash. */
  async trashFolder(id: string): Promise<void> {
    const all = await this.allFolders();
    const ids = all.filter((f) => isInside(all, f.id, id)).map((f) => f.id);
    const t = this.now();
    await this.batch([
      this.db.update(folders).set({ deletedAt: t }).where(inArray(folders.id, ids)),
      this.db
        .update(documents)
        .set({ deletedAt: t })
        .where(and(inArray(documents.folderId, ids), isNull(documents.deletedAt))),
    ]);
  }

  // ---------------------------------------------------------------- bookmarks

  async listBookmarks(documentId: string): Promise<BookmarkRow[]> {
    return this.db.select().from(bookmarks).where(eq(bookmarks.documentId, documentId)).orderBy(asc(bookmarks.createdAt));
  }

  async addBookmark(row: Omit<BookmarkRow, 'createdAt'>): Promise<void> {
    await this.db.insert(bookmarks).values({ ...row, createdAt: this.now() });
  }

  async renameBookmark(id: string, name: string): Promise<void> {
    await this.db.update(bookmarks).set({ name }).where(eq(bookmarks.id, id));
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.db.delete(bookmarks).where(eq(bookmarks.id, id));
  }

  // ---------------------------------------------------------------- set lists

  async listSetlists(): Promise<SetlistRow[]> {
    return this.db.select().from(setlists).orderBy(asc(sql`lower(${setlists.name})`));
  }

  async createSetlist(id: string, name: string): Promise<void> {
    const t = this.now();
    await this.db.insert(setlists).values({ id, name, createdAt: t, updatedAt: t });
  }

  async renameSetlist(id: string, name: string): Promise<void> {
    await this.db.update(setlists).set({ name, updatedAt: this.now() }).where(eq(setlists.id, id));
  }

  async deleteSetlist(id: string): Promise<void> {
    await this.batch([
      this.db.delete(setlistItems).where(eq(setlistItems.setlistId, id)),
      this.db.delete(setlists).where(eq(setlists.id, id)),
    ]);
  }

  async setlistItemsOf(setlistId: string): Promise<SetlistItemRow[]> {
    return this.db
      .select()
      .from(setlistItems)
      .where(eq(setlistItems.setlistId, setlistId))
      .orderBy(asc(setlistItems.position));
  }

  async addToSetlist(row: Omit<SetlistItemRow, 'position'>): Promise<void> {
    const items = await this.setlistItemsOf(row.setlistId);
    const position = (items[items.length - 1]?.position ?? 0) + 1;
    await this.db.insert(setlistItems).values({ ...row, position });
  }

  /** Rewrites the order of a set list. */
  async reorderSetlist(setlistId: string, orderedItemIds: string[]): Promise<void> {
    if (orderedItemIds.length === 0) return;
    await this.batch(
      orderedItemIds.map((id, i) =>
        this.db
          .update(setlistItems)
          .set({ position: i + 1 })
          .where(and(eq(setlistItems.id, id), eq(setlistItems.setlistId, setlistId))),
      ),
    );
    await this.db.update(setlists).set({ updatedAt: this.now() }).where(eq(setlists.id, setlistId));
  }

  async removeSetlistItem(id: string): Promise<void> {
    await this.db.delete(setlistItems).where(eq(setlistItems.id, id));
  }

  // ----------------------------------------------------------------- settings

  async getSetting<T>(key: string): Promise<T | undefined> {
    const row = await this.db.select().from(settings).where(eq(settings.key, key)).get();
    if (!row) return undefined;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return undefined;
    }
  }

  async allSettings(): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(settings);
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        // ignore corrupted values: defaults will be used
      }
    }
    return out;
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    const json = JSON.stringify(value);
    await this.db
      .insert(settings)
      .values({ key, value: json })
      .onConflictDoUpdate({ target: settings.key, set: { value: json } });
  }
}
