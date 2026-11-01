// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { emptyModel, type DocumentModel } from '../model';
import { keepUnsaved, restoreUnsaved } from '../../reader/unsavedChanges';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    get size() {
      return m.size;
    },
  };
}

function fakeRepo(updatedAt: number) {
  const saved: DocumentModel[] = [];
  return {
    saved,
    getDocument: async (id: string) => (id === 'doc' ? ({ id, updatedAt } as never) : undefined),
    loadModel: async (id: string) => (id === 'doc' ? emptyModel() : null),
    saveModel: async (_id: string, model: DocumentModel) => void saved.push(model),
  };
}

const edited = (): DocumentModel => ({ ...emptyModel(), annotations: { p1: [] } });

describe('changes kept when the window closes before saving (web and desktop)', () => {
  let store: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    store = fakeStorage();
    (globalThis as { localStorage?: unknown }).localStorage = store;
  });
  afterAll(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('saves the kept change the next time the app starts, once', async () => {
    keepUnsaved('doc', edited(), 2000);
    const repo = fakeRepo(1000);
    await restoreUnsaved(repo);
    expect(repo.saved).toEqual([edited()]);
    expect(store.size).toBe(0);
    await restoreUnsaved(repo);
    expect(repo.saved).toHaveLength(1);
  });

  it('does not overwrite a newer version saved meanwhile (another tab)', async () => {
    keepUnsaved('doc', edited(), 1000);
    const repo = fakeRepo(5000);
    await restoreUnsaved(repo);
    expect(repo.saved).toHaveLength(0);
    expect(store.size).toBe(0);
  });

  it('ignores documents that no longer exist and damaged data', async () => {
    keepUnsaved('gone', edited(), 2000);
    const repo = fakeRepo(1000);
    await restoreUnsaved(repo);
    store.setItem('atril-unsaved-document', '{not json');
    await restoreUnsaved(repo);
    expect(repo.saved).toHaveLength(0);
    expect(store.size).toBe(0);
  });
});
