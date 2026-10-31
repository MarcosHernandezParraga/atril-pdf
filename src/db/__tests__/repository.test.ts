// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { applyCommand } from '../../core/commands';
import { emptyModel, type Annotation, type DocumentModel } from '../../core/model';
import { isInside, LibraryRepository, TRASH_RETENTION_MS } from '../../library/repository';
import { createNodeSqliteExecutor } from '../backends/nodeSqlite';
import { getSchemaVersion, openDatabase } from '../database';
import { MIGRATIONS } from '../migrations';
import { sequentialIds } from '../../core/ids';

const sequential = () => sequentialIds('item');

let clock = 1_000_000;
const now = () => clock;

async function setup() {
  const executor = createNodeSqliteExecutor(':memory:');
  const { db } = await openDatabase(executor);
  return { executor, repo: new LibraryRepository(db, now) };
}

function modelWithPages(n: number, sourceId = 's1'): DocumentModel {
  const m = emptyModel();
  m.pages = Array.from({ length: n }, (_, i) => ({
    id: `pg${i}`,
    kind: 'pdf' as const,
    sourceId,
    pageIndex: i,
    size: { width: 595, height: 842 },
    rotation: 0 as const,
    crop: null,
  }));
  return m;
}

const stroke: Annotation = {
  id: 'a1',
  layerId: 'default',
  type: 'ink',
  tool: 'pen',
  color: '#000',
  width: 1.5,
  points: [[10, 10, 0.5]],
};

async function addDoc(repo: LibraryRepository, id: string, title: string, folderId: string | null = null) {
  await repo.createDocument({
    id,
    title,
    folderId,
    model: modelWithPages(3, `src-${id}`),
    sources: [
      {
        id: `src-${id}`,
        kind: 'pdf',
        path: `sources/${id}.pdf`,
        linked: false,
        originalName: `${title}.pdf`,
        byteSize: 1234,
        pageSizes: [
          [595, 842],
          [595, 842],
          [595, 842],
        ],
      },
    ],
  });
}

describe('database', () => {
  it('applies every migration once', async () => {
    const { executor } = await setup();
    expect(await getSchemaVersion(executor)).toBe(MIGRATIONS.length);
    await openDatabase(executor); // re-opening must not fail
    expect(await getSchemaVersion(executor)).toBe(MIGRATIONS.length);
  });

  it('migration 3 turns documents of a folder into concert pieces', async () => {
    const executor = createNodeSqliteExecutor(':memory:');
    await executor.exec(`${MIGRATIONS[0]}\n${MIGRATIONS[1]}\nPRAGMA user_version = 2;`);
    await executor.exec(`
      INSERT INTO folders (id, name, created_at, updated_at) VALUES ('f', 'Concierto', 1, 1);
      INSERT INTO documents (id, title, folder_id, created_at, updated_at, model_json, original_model_json)
        VALUES ('b', 'Bach', 'f', 1, 1, '{}', '{}'), ('a', 'Albéniz', 'f', 1, 1, '{}', '{}'), ('z', 'Suelto', NULL, 1, 1, '{}', '{}');
    `);
    const { db } = await openDatabase(executor);
    const repo = new LibraryRepository(db, now);
    expect((await repo.folderPieces('f')).map((p) => p.doc.id)).toEqual(['a', 'b']);
    expect((await repo.getDocument('b'))?.folderId).toBeNull();
  });

  it('rolls back a failing batch completely', async () => {
    const { executor } = await setup();
    await expect(
      executor.batch([
        { sql: "INSERT INTO settings (key, value) VALUES ('a', '1')", params: [], method: 'run' },
        { sql: 'INSERT INTO nope VALUES (1)', params: [], method: 'run' },
      ]),
    ).rejects.toThrow();
    const r = await executor.query({ sql: 'SELECT count(*) FROM settings', params: [], method: 'get' });
    expect((r.rows as number[])[0]).toBe(0);
  });
});

describe('library repository', () => {
  it('creates, lists, searches and sorts documents', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'Sonata en Do');
    clock += 10;
    await addDoc(repo, 'd2', 'adagio');
    expect((await repo.listDocuments()).map((d) => d.title)).toEqual(['adagio', 'Sonata en Do']);
    expect((await repo.listDocuments({ sort: 'added' })).map((d) => d.id)).toEqual(['d2', 'd1']);
    expect((await repo.listDocuments({ search: 'SONA' })).map((d) => d.id)).toEqual(['d1']);
    const doc = await repo.getDocument('d1');
    expect(doc?.pageCount).toBe(3);
  });

  it('keeps recents and favourites', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'A');
    await addDoc(repo, 'd2', 'B');
    clock += 5;
    await repo.markOpened('d2');
    clock += 5;
    await repo.markOpened('d1');
    expect((await repo.recentDocuments()).map((d) => d.id)).toEqual(['d1', 'd2']);
    await repo.setFavorite('d2', true);
    expect((await repo.listDocuments({ favoritesOnly: true })).map((d) => d.id)).toEqual(['d2']);
  });

  it('saves the model and only rewrites changed annotations', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'A');
    const m0 = (await repo.loadModel('d1'))!;
    const m1 = applyCommand(m0, { type: 'addAnnotations', pageId: 'pg1', annotations: [stroke] });
    const m2 = applyCommand(m1, { type: 'movePages', pageIds: ['pg1'], toIndex: 0 });
    await repo.saveModel('d1', m2, m0);
    const loaded = (await repo.loadModel('d1'))!;
    expect(loaded.pages.map((p) => p.id)).toEqual(['pg1', 'pg0', 'pg2']);
    expect(loaded.annotations.pg1).toEqual([stroke]);
    // Erasing everything removes the stored row.
    const m3 = applyCommand(m2, { type: 'removeAnnotations', pageId: 'pg1', ids: ['a1'] });
    await repo.saveModel('d1', m3, m2);
    expect((await repo.loadModel('d1'))!.annotations).toEqual({});
  });

  it('restores the original document', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'A');
    const m0 = (await repo.loadModel('d1'))!;
    let m = applyCommand(m0, { type: 'removePages', pageIds: ['pg0', 'pg1'] });
    m = applyCommand(m, { type: 'addAnnotations', pageId: 'pg2', annotations: [stroke] });
    await repo.saveModel('d1', m, m0);
    await repo.restoreOriginal('d1');
    const restored = (await repo.loadModel('d1'))!;
    expect(restored.pages).toHaveLength(3);
    expect(restored.annotations).toEqual({});
  });

  it('moves documents to the trash, restores them and purges expired ones', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'A');
    await repo.trashDocuments(['d1']);
    expect(await repo.listDocuments()).toHaveLength(0);
    expect(await repo.listDocuments({ trash: true })).toHaveLength(1);
    await repo.restoreDocuments(['d1']);
    expect(await repo.listDocuments()).toHaveLength(1);
    await repo.trashDocuments(['d1']);
    clock += TRASH_RETENTION_MS + 1;
    expect(await repo.expiredTrash()).toEqual(['d1']);
    const orphans = await repo.deleteDocuments(['d1']);
    expect(orphans.map((s) => s.id)).toEqual(['src-d1']);
    expect(await repo.allSources()).toHaveLength(0);
  });

  it('keeps sources shared by another document', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'A');
    const model = (await repo.loadModel('d1'))!;
    await repo.createDocument({ id: 'copy', title: 'A (copia)', folderId: null, model, sources: [] });
    expect(await repo.deleteDocuments(['d1'])).toEqual([]);
  });

  it('organises nested folders and refuses cycles', async () => {
    const { repo } = await setup();
    await repo.createFolder('f1', 'Orquesta', null);
    await repo.createFolder('f2', 'Violín', 'f1');
    await repo.createFolder('f3', 'Estudios', 'f2');
    expect((await repo.folderPath('f3')).map((f) => f.name)).toEqual(['Orquesta', 'Violín', 'Estudios']);
    expect(await repo.moveFolders(['f1'], 'f3')).toBe(false);
    expect(await repo.moveFolders(['f3'], null)).toBe(true);
  });

  it('folders work as concerts: ordered pieces, reorder, remove, several concerts', async () => {
    const { repo } = await setup();
    const ids = sequential();
    await addDoc(repo, 'd1', 'Allegro');
    await addDoc(repo, 'd2', 'Adagio');
    await addDoc(repo, 'd3', 'Rondó');
    await repo.createFolder('c1', 'Concierto de Navidad', null);
    await repo.createFolder('c2', 'Ensayo', null);
    expect(await repo.addToFolder('c1', ['d1', 'd2', 'd3', 'd1'], ids)).toBe(3);
    expect(await repo.addToFolder('c1', ['d2'], ids)).toBe(0);
    await repo.addToFolder('c2', ['d2'], ids);
    let pieces = await repo.folderPieces('c1');
    expect(pieces.map((p) => p.doc.id)).toEqual(['d1', 'd2', 'd3']);
    await repo.reorderFolder('c1', [pieces[2]!.itemId, pieces[0]!.itemId, pieces[1]!.itemId]);
    pieces = await repo.folderPieces('c1');
    expect(pieces.map((p) => p.doc.id)).toEqual(['d3', 'd1', 'd2']);
    expect(await repo.folderPieceCounts()).toEqual({ c1: 3, c2: 1 });
    expect((await repo.foldersOfDocument('d2')).sort()).toEqual(['c1', 'c2']);
    await repo.removeFromFolder([pieces[0]!.itemId]);
    expect((await repo.folderPieces('c1')).map((p) => p.doc.id)).toEqual(['d1', 'd2']);
    // Pieces in the trash are skipped; deleting a folder keeps the documents.
    await repo.trashDocuments(['d1']);
    expect((await repo.folderPieces('c1')).map((p) => p.doc.id)).toEqual(['d2']);
    await repo.deleteFolder('c1');
    expect(await repo.folderPieces('c1')).toEqual([]);
    expect((await repo.listDocuments()).map((d) => d.id).sort()).toEqual(['d2', 'd3']);
    // Deleting a document forever removes it from every concert.
    await repo.deleteDocuments(['d2']);
    expect(await repo.folderPieces('c2')).toEqual([]);
  });

  it('lists all documents from the most recent', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'old', 'Old');
    clock += 10;
    await addDoc(repo, 'new', 'New');
    clock += 10;
    await repo.markOpened('old');
    expect((await repo.listDocuments({ sort: 'recent' })).map((d) => d.id)).toEqual(['old', 'new']);
  });

  it('isInside detects ancestors', () => {
    const all = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ];
    expect(isInside(all, 'c', 'a')).toBe(true);
    expect(isInside(all, 'a', 'c')).toBe(false);
    expect(isInside(all, null, 'a')).toBe(false);
  });

  it('stores bookmarks and set lists', async () => {
    const { repo } = await setup();
    await addDoc(repo, 'd1', 'A');
    await addDoc(repo, 'd2', 'B');
    await repo.addBookmark({ id: 'b1', documentId: 'd1', pageId: 'pg2', name: 'Coda' });
    expect((await repo.listBookmarks('d1'))[0]?.name).toBe('Coda');
    await repo.createSetlist('s1', 'Concierto');
    await repo.addToSetlist({ id: 'i1', setlistId: 's1', documentId: 'd1', pageFrom: null, pageTo: null });
    await repo.addToSetlist({ id: 'i2', setlistId: 's1', documentId: 'd2', pageFrom: 1, pageTo: 2 });
    await repo.reorderSetlist('s1', ['i2', 'i1']);
    expect((await repo.setlistItemsOf('s1')).map((i) => i.documentId)).toEqual(['d2', 'd1']);
    await repo.deleteDocuments(['d2']);
    expect((await repo.setlistItemsOf('s1')).map((i) => i.id)).toEqual(['i1']);
  });

  it('stores settings as JSON', async () => {
    const { repo } = await setup();
    await repo.setSetting('reader.mode', 'half-page');
    await repo.setSetting('reader.mode', 'two-page');
    await repo.setSetting('pedal.debounce', 200);
    expect(await repo.getSetting('reader.mode')).toBe('two-page');
    expect(await repo.allSettings()).toEqual({ 'reader.mode': 'two-page', 'pedal.debounce': 200 });
  });
});
