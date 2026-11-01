// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Renders document pages for the screen and keeps them in memory so turning a
// page is instantaneous: the current, previous and next pages are rendered in
// advance (see `prefetch`).

import { Platform } from 'react-native';

import type { GrayImage } from '../core/contentDetection';
import type { PageRef, Size } from '../core/model';
import type { SourceRow } from '../db/schema';
import type { StorageAdapter } from '../storage/types';
import { LruCache, widthBucket } from './lru';
import type { PdfDocumentHandle, PdfEngine, RenderedPage } from './types';

export type SourceLookup = (sourceId: string) => Promise<SourceRow | undefined>;

const isWeb = Platform.OS === 'web';

function revoke(uri: string) {
  if (isWeb && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}

const CLOSE_DELAY_MS = 5000;

/** Page sizes saved with the source when it was imported (undefined if unreadable). */
function savedPageSizes(json: string): Size[] | undefined {
  try {
    const list = JSON.parse(json) as unknown;
    if (!Array.isArray(list)) return undefined;
    const sizes = list.map((p) =>
      Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number'
        ? { width: p[0], height: p[1] }
        : null,
    );
    return sizes.every((x) => x !== null) ? (sizes as Size[]) : undefined;
  } catch {
    return undefined;
  }
}

export class PageRenderer {
  private handles = new Map<string, Promise<PdfDocumentHandle>>();
  private inflight = new Map<string, Promise<RenderedPage>>();
  private images: LruCache<string, RenderedPage>;
  private grays = new LruCache<string, GrayImage>(24);
  private imageSources = new LruCache<string, RenderedPage>(32, (_k, v) => revoke(v.uri));
  /** Small images for the page panel, kept apart so they never push out the pages being read. */
  private thumbs = new LruCache<string, RenderedPage>(160, (_k, v) => revoke(v.uri));
  private thumbQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private engine: PdfEngine,
    private storage: StorageAdapter,
    private lookup: SourceLookup,
    capacity = 14,
    /** Documents kept open at once; the least recently used one is closed. */
    private maxOpenDocuments = 4,
  ) {
    this.images = new LruCache(capacity, (_k, v) => revoke(v.uri));
  }

  private handleFor(sourceId: string): Promise<PdfDocumentHandle> {
    const hit = this.handles.get(sourceId);
    if (hit) {
      // Most recently used goes last.
      this.handles.delete(sourceId);
      this.handles.set(sourceId, hit);
      return hit;
    }
    const h = (async () => {
      const src = await this.lookup(sourceId);
      if (!src) throw new Error('missing source');
      return this.engine.open({
        relPath: src.path,
        password: src.password ?? undefined,
        pageSizes: savedPageSizes(src.pageSizesJson),
      });
    })();
    this.handles.set(sourceId, h);
    h.catch(() => {
      if (this.handles.get(sourceId) === h) this.handles.delete(sourceId);
    });
    // A library has hundreds of scores (the thumbnails open each of them): only
    // a few stay open, so memory and open files do not grow with the library.
    while (this.handles.size > this.maxOpenDocuments) {
      const [oldId, old] = this.handles.entries().next().value as [string, Promise<PdfDocumentHandle>];
      this.handles.delete(oldId);
      // A moment later, so that a page being drawn from it can finish.
      setTimeout(() => void old.then((x) => x.close()).catch(() => undefined), CLOSE_DELAY_MS);
    }
    return h;
  }

  private key(page: PageRef, widthPx: number): string | null {
    if (page.kind === 'pdf') return `${page.sourceId}:${page.pageIndex}:${widthBucket(widthPx)}`;
    if (page.kind === 'image') return `img:${page.sourceId}`;
    return null;
  }

  /** Already rendered image (synchronous), or undefined. */
  peek(page: PageRef, widthPx: number): RenderedPage | undefined {
    const k = this.key(page, widthPx);
    if (!k) return undefined;
    if (page.kind === 'image') return this.imageSources.get(k);
    const exact = this.images.get(k);
    if (exact) return exact;
    return undefined;
  }

  async render(page: PageRef, widthPx: number): Promise<RenderedPage | null> {
    const k = this.key(page, widthPx);
    if (!k) return null;
    if (page.kind === 'image') return this.renderImageSource(page.sourceId, k);
    if (page.kind !== 'pdf') return null;
    const cached = this.images.get(k);
    if (cached) return cached;
    let p = this.inflight.get(k);
    if (!p) {
      p = (async () => {
        const h = await this.handleFor(page.sourceId);
        const r = await h.render(page.pageIndex, widthBucket(widthPx));
        this.images.set(k, r);
        return r;
      })();
      this.inflight.set(k, p);
      p.finally(() => this.inflight.delete(k)).catch(() => undefined);
    }
    return p;
  }

  /** Thumbnail already available (synchronous), or undefined. */
  peekThumb(page: PageRef, widthPx: number): RenderedPage | undefined {
    if (page.kind === 'image') return this.imageSources.get(`img:${page.sourceId}`);
    if (page.kind !== 'pdf') return undefined;
    return this.thumbs.get(`${page.sourceId}:${page.pageIndex}:t${widthBucket(widthPx, 64, 512)}`);
  }

  /** Renders a thumbnail; thumbnails are made one at a time, after the pages being read. */
  renderThumb(page: PageRef, widthPx: number): Promise<RenderedPage | null> {
    if (page.kind === 'image') return this.render(page, widthPx);
    if (page.kind !== 'pdf') return Promise.resolve(null);
    const w = widthBucket(widthPx, 64, 512);
    const k = `${page.sourceId}:${page.pageIndex}:t${w}`;
    const cached = this.thumbs.get(k);
    if (cached) return Promise.resolve(cached);
    const run = this.thumbQueue.then(async () => {
      const again = this.thumbs.get(k);
      if (again) return again;
      const h = await this.handleFor(page.sourceId);
      const r = await h.render(page.pageIndex, w);
      this.thumbs.set(k, r);
      return r;
    });
    this.thumbQueue = run.catch(() => undefined);
    return run;
  }

  /** An image file of the library (images placed on a page). */
  sourceImage(sourceId: string): Promise<RenderedPage> {
    return this.renderImageSource(sourceId, `img:${sourceId}`);
  }

  peekSourceImage(sourceId: string): RenderedPage | undefined {
    return this.imageSources.get(`img:${sourceId}`);
  }

  private async renderImageSource(sourceId: string, k: string): Promise<RenderedPage> {
    const cached = this.imageSources.get(k);
    if (cached) return cached;
    const src = await this.lookup(sourceId);
    if (!src) throw new Error('missing source');
    const native = this.storage.nativeUri(src.path);
    let uri: string;
    if (native) {
      uri = native;
    } else {
      const bytes = await this.storage.read(src.path);
      uri = URL.createObjectURL(new Blob([bytes as BlobPart]));
    }
    const r = { uri, width: 0, height: 0 };
    this.imageSources.set(k, r);
    return r;
  }

  /** Renders pages in the background, in the given priority order. */
  prefetch(pages: PageRef[], widthPx: number): void {
    void (async () => {
      for (const p of pages) {
        try {
          await this.render(p, widthPx);
        } catch {
          // ignored: the page will show an error when it becomes visible
        }
      }
    })();
  }

  async gray(page: PageRef, widthPx = 420): Promise<GrayImage | null> {
    if (page.kind !== 'pdf') return null;
    const k = `${page.sourceId}:${page.pageIndex}`;
    const cached = this.grays.get(k);
    if (cached) return cached;
    const h = await this.handleFor(page.sourceId);
    const g = await h.renderGray(page.pageIndex, widthPx);
    this.grays.set(k, g);
    return g;
  }

  async handle(sourceId: string): Promise<PdfDocumentHandle> {
    return this.handleFor(sourceId);
  }

  setCapacity(n: number) {
    this.images.setCapacity(n);
  }

  async closeAll(): Promise<void> {
    const hs = [...this.handles.values()];
    this.handles.clear();
    this.images.clear();
    this.grays.clear();
    this.imageSources.clear();
    this.thumbs.clear();
    await Promise.all(hs.map((h) => h.then((x) => x.close()).catch(() => undefined)));
  }
}
