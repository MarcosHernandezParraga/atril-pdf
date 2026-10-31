// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Ordered list of schema migrations. The database stores the number of
// applied migrations in `PRAGMA user_version`. Never edit a published
// migration: add a new one at the end.

export const MIGRATIONS: readonly string[] = [
  // 1: initial schema
  `
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS folders_parent_idx ON folders (parent_id);

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    folder_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_opened_at INTEGER,
    favorite INTEGER DEFAULT 0 NOT NULL,
    deleted_at INTEGER,
    page_count INTEGER DEFAULT 0 NOT NULL,
    model_json TEXT NOT NULL,
    original_model_json TEXT NOT NULL,
    view_state_json TEXT,
    thumbnail_path TEXT
  );
  CREATE INDEX IF NOT EXISTS documents_folder_idx ON documents (folder_id);

  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    path TEXT NOT NULL,
    linked INTEGER DEFAULT 0 NOT NULL,
    original_name TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    page_count INTEGER NOT NULL,
    page_sizes_json TEXT NOT NULL,
    sha256 TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS annotations (
    page_id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS annotations_document_idx ON annotations (document_id);

  CREATE TABLE IF NOT EXISTS setlists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS setlist_items (
    id TEXT PRIMARY KEY NOT NULL,
    setlist_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    position REAL NOT NULL,
    page_from INTEGER,
    page_to INTEGER
  );
  CREATE INDEX IF NOT EXISTS setlist_items_setlist_idx ON setlist_items (setlist_id);

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS bookmarks_document_idx ON bookmarks (document_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: password of protected PDFs (kept only on this device, needed to reopen them)
  `
  ALTER TABLE sources ADD COLUMN password TEXT;
  `,
  // 3: folders work as concerts: ordered references to documents (a piece can be in several).
  `
  CREATE TABLE IF NOT EXISTS folder_items (
    id TEXT PRIMARY KEY NOT NULL,
    folder_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    position REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS folder_items_folder_idx ON folder_items (folder_id);
  CREATE INDEX IF NOT EXISTS folder_items_document_idx ON folder_items (document_id);
  INSERT INTO folder_items (id, folder_id, document_id, position)
    SELECT lower(hex(randomblob(16))), folder_id, id,
           row_number() OVER (PARTITION BY folder_id ORDER BY lower(title))
    FROM documents WHERE folder_id IS NOT NULL;
  UPDATE documents SET folder_id = NULL;
  `,
];
