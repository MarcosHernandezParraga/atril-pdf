// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web version: the library files are kept in IndexedDB in pieces of 1 MB.
// - Any browser accepts pieces of that size (Chrome refuses single values of
//   more than about 128 MB, and Safari on iPhone and iPad has had problems
//   reading back stored Blobs after a restart).
// - A score of any size is imported piece by piece, never whole in memory.
// - The reader asks only for the pieces of the pages it is showing.
// Small files (thumbnails, most PDFs) are a single value, as in version 1.0.0,
// whose libraries keep working as they are.

import type { RangedFile } from './types';

/** The key/value operations needed (IndexedDB in the app, a Map in the tests). */
export interface KeyValue {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  setMany(entries: [string, unknown][]): Promise<void>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
}

export const CHUNK_SIZE = 1024 * 1024;
/** Pieces saved together in one transaction while importing. */
const CHUNKS_PER_WRITE = 8;
/** Pieces kept in memory per open file (16 MB). */
const CACHED_CHUNKS = 16;

interface Manifest {
  atrilChunks: 1;
  size: number;
  chunkSize: number;
  count: number;
}

const chunkKey = (rel: string, i: number) => `${rel}#chunk${i}`;

function isManifest(v: unknown): v is Manifest {
  return typeof v === 'object' && v !== null && (v as Partial<Manifest>).atrilChunks === 1;
}

function isBlob(v: unknown): v is Blob {
  return typeof Blob !== 'undefined' && v instanceof Blob;
}

const keysOf = (rel: string, m: Manifest, from = 0) =>
  Array.from({ length: Math.max(0, m.count - from) }, (_, i) => chunkKey(rel, from + i));

export function chunkedFiles(kv: KeyValue, chunkSize = CHUNK_SIZE) {
  async function remove(rel: string): Promise<void> {
    const v = await kv.get<unknown>(rel);
    // The file disappears first; its pieces after it.
    await kv.delete(rel);
    if (isManifest(v)) await kv.deleteMany(keysOf(rel, v));
  }

  /**
   * Saves a file read piece by piece. The file only exists once every piece is
   * saved: if anything fails (for example, no space left), nothing is left half
   * written and the error is reported.
   */
  async function saveFrom(
    rel: string,
    size: number,
    readPiece: (begin: number, end: number) => Promise<Uint8Array>,
  ): Promise<void> {
    if ((await kv.get<unknown>(rel)) !== undefined) await remove(rel);
    if (size <= chunkSize) {
      await kv.set(rel, await readPiece(0, size));
      return;
    }
    const m: Manifest = { atrilChunks: 1, size, chunkSize, count: Math.ceil(size / chunkSize) };
    try {
      for (let i = 0; i < m.count; i += CHUNKS_PER_WRITE) {
        const batch: [string, unknown][] = [];
        for (let j = i; j < Math.min(m.count, i + CHUNKS_PER_WRITE); j++) {
          batch.push([chunkKey(rel, j), await readPiece(j * chunkSize, Math.min(size, (j + 1) * chunkSize))]);
        }
        await kv.setMany(batch);
      }
      await kv.set(rel, m);
    } catch (e) {
      await kv.deleteMany(keysOf(rel, m)).catch(() => undefined);
      throw e;
    }
  }

  async function open(rel: string): Promise<RangedFile> {
    const v = await kv.get<unknown>(rel);
    if (v === undefined) throw new Error(`File not found: ${rel}`);
    if (v instanceof Uint8Array) {
      return { length: v.byteLength, read: async (b, e) => v.slice(b, Math.min(e, v.byteLength)) };
    }
    if (isBlob(v)) {
      return { length: v.size, read: async (b, e) => new Uint8Array(await v.slice(b, e).arrayBuffer()) };
    }
    if (!isManifest(v)) throw new Error(`Unknown file format: ${rel}`);
    const m = v;
    // The most recently used pieces stay in memory: the reader asks for many
    // small ranges, usually inside the same piece.
    const cache = new Map<number, Promise<Uint8Array>>();
    const chunk = (i: number): Promise<Uint8Array> => {
      const hit = cache.get(i);
      if (hit) {
        cache.delete(i);
        cache.set(i, hit);
        return hit;
      }
      const p = kv.get<Uint8Array>(chunkKey(rel, i)).then((c) => {
        if (!c) throw new Error(`Missing piece ${i} of ${rel}`);
        return c;
      });
      cache.set(i, p);
      p.catch(() => cache.delete(i));
      while (cache.size > CACHED_CHUNKS) cache.delete(cache.keys().next().value as number);
      return p;
    };
    return {
      length: m.size,
      async read(begin, end) {
        const stop = Math.min(end, m.size);
        const out = new Uint8Array(Math.max(0, stop - begin));
        for (let i = Math.floor(begin / m.chunkSize); i * m.chunkSize < stop; i++) {
          const c = await chunk(i);
          const start = i * m.chunkSize;
          const from = Math.max(begin, start);
          const to = Math.min(stop, start + c.byteLength);
          out.set(c.subarray(from - start, to - start), from - begin);
        }
        return out;
      },
    };
  }

  return {
    open,
    saveFrom,
    remove,
    async read(rel: string): Promise<Uint8Array> {
      const f = await open(rel);
      return f.read(0, f.length);
    },
    write: (rel: string, data: Uint8Array) =>
      saveFrom(rel, data.byteLength, async (b, e) =>
        b === 0 && e === data.byteLength ? data : data.slice(b, e),
      ),
    exists: async (rel: string) => (await kv.get<unknown>(rel)) !== undefined,
    async size(rel: string): Promise<number> {
      const v = await kv.get<unknown>(rel);
      if (v instanceof Uint8Array) return v.byteLength;
      if (isManifest(v)) return v.size;
      if (isBlob(v)) return v.size;
      return 0;
    },
  };
}
