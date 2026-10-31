// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Thumbnails of the first page of each document, stored in the library so the
// home screen opens instantly.

import { Platform } from 'react-native';

import type { DocumentRow } from '../db/schema';
import type { PageRenderer } from '../pdf/pageRenderer';
import type { StorageAdapter } from '../storage/types';
import { parseStoredPages, type LibraryRepository } from './repository';

const THUMB_WIDTH = 360;

export class ThumbnailService {
  private memory = new Map<string, string>();
  private pending = new Map<string, Promise<string | null>>();
  /** Limits concurrent generation so the library stays responsive. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private repo: LibraryRepository,
    private storage: StorageAdapter,
    private renderer: PageRenderer,
  ) {}

  private async uriFor(relPath: string): Promise<string> {
    const native = this.storage.nativeUri(relPath);
    if (native) return native;
    const bytes = await this.storage.read(relPath);
    return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
  }

  get(doc: Pick<DocumentRow, 'id' | 'thumbnailPath' | 'modelJson' | 'updatedAt'>): Promise<string | null> {
    const memKey = `${doc.id}:${doc.thumbnailPath ?? ''}`;
    const hit = this.memory.get(memKey);
    if (hit) return Promise.resolve(hit);
    let p = this.pending.get(memKey);
    if (!p) {
      p = this.load(doc).then((uri) => {
        if (uri) this.memory.set(memKey, uri);
        return uri;
      });
      this.pending.set(memKey, p);
      p.finally(() => this.pending.delete(memKey)).catch(() => undefined);
    }
    return p;
  }

  private async load(doc: Pick<DocumentRow, 'id' | 'thumbnailPath' | 'modelJson'>): Promise<string | null> {
    if (doc.thumbnailPath && (await this.storage.exists(doc.thumbnailPath).catch(() => false))) {
      return this.uriFor(doc.thumbnailPath);
    }
    const run = this.queue.then(() => this.generate(doc));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async generate(doc: Pick<DocumentRow, 'id' | 'modelJson'>): Promise<string | null> {
    const first = parseStoredPages(doc.modelJson).pages[0];
    if (!first) return null;
    const rendered = await this.renderer.render(first, THUMB_WIDTH).catch(() => null);
    if (!rendered) return null;
    const rel = `thumbs/${doc.id}-${Date.now()}.png`;
    try {
      let bytes: Uint8Array;
      if (Platform.OS === 'web') {
        bytes = new Uint8Array(await (await fetch(rendered.uri)).arrayBuffer());
      } else {
        const { File } = await import('expo-file-system');
        bytes = await new File(rendered.uri).bytes();
      }
      await this.storage.write(rel, bytes);
      await this.repo.setThumbnail(doc.id, rel);
      return this.uriFor(rel);
    } catch {
      return rendered.uri;
    }
  }

  /** Forget the thumbnail (after reordering pages, restoring the original...). */
  async invalidate(docId: string, oldPath: string | null): Promise<void> {
    for (const k of [...this.memory.keys()]) if (k.startsWith(`${docId}:`)) this.memory.delete(k);
    if (oldPath) await this.storage.remove(oldPath).catch(() => undefined);
    await this.repo.setThumbnail(docId, null);
  }
}
