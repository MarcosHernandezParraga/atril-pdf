// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { chunkedFiles, type KeyValue } from '../../storage/chunkedFiles';

function memoryKv(failOnBatch = -1) {
  const map = new Map<string, unknown>();
  let batches = 0;
  const kv: KeyValue = {
    get: async <T>(k: string) => map.get(k) as T | undefined,
    set: async (k, v) => void map.set(k, v),
    async setMany(entries) {
      if (batches++ === failOnBatch) throw new Error('no space left');
      for (const [k, v] of entries) map.set(k, v);
    },
    delete: async (k) => void map.delete(k),
    deleteMany: async (keys) => keys.forEach((k) => map.delete(k)),
  };
  return { kv, map };
}

const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 7 + 3) % 251);

describe('library files kept in pieces (web version)', () => {
  it('keeps a small file as a single value', async () => {
    const { kv, map } = memoryKv();
    const files = chunkedFiles(kv, 16);
    await files.write('thumbs/a.png', bytes(10));
    expect(map.size).toBe(1);
    expect(await files.read('thumbs/a.png')).toEqual(bytes(10));
    expect(await files.size('thumbs/a.png')).toBe(10);
  });

  it('splits a large file and reads any range of it', async () => {
    const { kv, map } = memoryKv();
    const files = chunkedFiles(kv, 16);
    const data = bytes(1000);
    await files.saveFrom('sources/big.pdf', data.length, async (b, e) => data.slice(b, e));
    expect(map.size).toBe(1 + Math.ceil(1000 / 16));
    expect(await files.size('sources/big.pdf')).toBe(1000);
    expect(await files.read('sources/big.pdf')).toEqual(data);
    const f = await files.open('sources/big.pdf');
    expect(f.length).toBe(1000);
    for (const [b, e] of [
      [0, 1],
      [15, 17],
      [16, 32],
      [100, 563],
      [990, 1000],
      [990, 5000],
    ] as const) {
      expect(await f.read(b, e)).toEqual(data.slice(b, e));
    }
  });

  it('removes a large file with all its pieces', async () => {
    const { kv, map } = memoryKv();
    const files = chunkedFiles(kv, 16);
    await files.write('sources/big.pdf', bytes(100));
    await files.write('thumbs/keep.png', bytes(5));
    await files.remove('sources/big.pdf');
    expect([...map.keys()]).toEqual(['thumbs/keep.png']);
    expect(await files.exists('sources/big.pdf')).toBe(false);
  });

  it('leaves nothing half saved when saving fails (for example, no space left)', async () => {
    const { kv, map } = memoryKv(1);
    const files = chunkedFiles(kv, 4);
    await expect(files.write('sources/big.pdf', bytes(200))).rejects.toThrow('no space left');
    expect(map.size).toBe(0);
    expect(await files.exists('sources/big.pdf')).toBe(false);
  });

  it('replacing a large file with a small one removes the old pieces', async () => {
    const { kv, map } = memoryKv();
    const files = chunkedFiles(kv, 16);
    await files.write('sources/x.pdf', bytes(100));
    await files.write('sources/x.pdf', bytes(3));
    expect([...map.keys()]).toEqual(['sources/x.pdf']);
    expect(await files.read('sources/x.pdf')).toEqual(bytes(3));
  });

  it('reads files saved by version 1.0.0 (a single byte array)', async () => {
    const { kv, map } = memoryKv();
    map.set('sources/old.pdf', bytes(50));
    const files = chunkedFiles(kv, 16);
    const f = await files.open('sources/old.pdf');
    expect(f.length).toBe(50);
    expect(await f.read(10, 20)).toEqual(bytes(50).slice(10, 20));
    expect(await files.size('sources/old.pdf')).toBe(50);
  });

  it('reports a missing file', async () => {
    const files = chunkedFiles(memoryKv().kv, 16);
    await expect(files.open('sources/none.pdf')).rejects.toThrow('File not found');
  });
});
