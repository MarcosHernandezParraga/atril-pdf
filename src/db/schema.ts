// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Database schema (Drizzle ORM). Keep in sync with `migrations.ts`; the test
// suite checks that both agree.

import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const folders = sqliteTable(
  'folders',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id'),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (t) => [index('folders_parent_idx').on(t.parentId)],
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    folderId: text('folder_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    lastOpenedAt: integer('last_opened_at'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    deletedAt: integer('deleted_at'),
    pageCount: integer('page_count').notNull().default(0),
    /** Page list of the document model (JSON, without annotations). */
    modelJson: text('model_json').notNull(),
    /** Page list as imported, for "Restore original". */
    originalModelJson: text('original_model_json').notNull(),
    /** Last page, zoom, view mode... (JSON). */
    viewStateJson: text('view_state_json'),
    thumbnailPath: text('thumbnail_path'),
  },
  (t) => [index('documents_folder_idx').on(t.folderId)],
);

export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['pdf', 'image'] }).notNull(),
  /** Path relative to the library directory, or an absolute path when `linked`. */
  path: text('path').notNull(),
  linked: integer('linked', { mode: 'boolean' }).notNull().default(false),
  originalName: text('original_name').notNull(),
  byteSize: integer('byte_size').notNull(),
  pageCount: integer('page_count').notNull(),
  /** [[width, height], ...] in points. */
  pageSizesJson: text('page_sizes_json').notNull(),
  sha256: text('sha256'),
  createdAt: integer('created_at').notNull(),
  password: text('password'),
});

export const annotations = sqliteTable(
  'annotations',
  {
    pageId: text('page_id').primaryKey(),
    documentId: text('document_id').notNull(),
    json: text('json').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('annotations_document_idx').on(t.documentId)],
);

/** Ordered pieces of a folder (a folder is a concert). */
export const folderItems = sqliteTable(
  'folder_items',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id').notNull(),
    documentId: text('document_id').notNull(),
    position: real('position').notNull(),
  },
  (t) => [index('folder_items_folder_idx').on(t.folderId), index('folder_items_document_idx').on(t.documentId)],
);

export const setlists = sqliteTable('setlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const setlistItems = sqliteTable(
  'setlist_items',
  {
    id: text('id').primaryKey(),
    setlistId: text('setlist_id').notNull(),
    documentId: text('document_id').notNull(),
    position: real('position').notNull(),
    pageFrom: integer('page_from'),
    pageTo: integer('page_to'),
  },
  (t) => [index('setlist_items_setlist_idx').on(t.setlistId)],
);

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    pageId: text('page_id').notNull(),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('bookmarks_document_idx').on(t.documentId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const schema = { folders, folderItems, documents, sources, annotations, setlists, setlistItems, bookmarks, settings };

export type FolderRow = typeof folders.$inferSelect;
export type FolderItemRow = typeof folderItems.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type SourceRow = typeof sources.$inferSelect;
export type SetlistRow = typeof setlists.$inferSelect;
export type SetlistItemRow = typeof setlistItems.$inferSelect;
export type BookmarkRow = typeof bookmarks.$inferSelect;
