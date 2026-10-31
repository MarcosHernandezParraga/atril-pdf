// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// pdf.js engine for desktop (Electron) and web. pdf.js and its worker ship
// with the app (public/vendor/pdfjs) and are loaded from the local origin.

import { rgbaToGray, type GrayImage } from '../core/contentDetection';
import type { Size } from '../core/model';
import { loadScript } from '../platform/loadScript';
import type { StorageAdapter } from '../storage/types';
import { PdfError, type OutlineItem, type PdfDocumentHandle, type PdfEngine, type RenderedPage, type SearchHit } from './types';

// Minimal typing of the parts of pdf.js used here.
interface PdfJsViewport {
  width: number;
  height: number;
}
interface PdfJsPage {
  getViewport(o: { scale: number }): PdfJsViewport;
  render(o: { canvas: HTMLCanvasElement | OffscreenCanvas; viewport: PdfJsViewport; background?: string }): {
    promise: Promise<void>;
  };
  getTextContent(): Promise<{ items: { str?: string }[] }>;
  cleanup(): void;
}
interface PdfJsOutlineNode {
  title: string;
  dest: string | unknown[] | null;
  items: PdfJsOutlineNode[];
}
interface PdfJsDocument {
  numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
  getOutline(): Promise<PdfJsOutlineNode[] | null>;
  getDestination(id: string): Promise<unknown[] | null>;
  getPageIndex(ref: unknown): Promise<number>;
  loadingTask: { destroy(): Promise<void> };
}
interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(o: Record<string, unknown>): { promise: Promise<PdfJsDocument> };
  PasswordException?: new () => Error;
}

let libPromise: Promise<PdfJsLib> | null = null;

export function loadPdfJs(): Promise<PdfJsLib> {
  if (!libPromise) {
    libPromise = loadScript('/vendor/pdfjs/pdf.min.mjs', 'module').then(() => {
      const lib = (globalThis as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
      if (!lib) throw new Error('pdf.js not available');
      lib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
      return lib;
    });
    libPromise.catch(() => {
      libPromise = null;
    });
  }
  return libPromise;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function renderToCanvas(page: PdfJsPage, widthPx: number): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const scale = widthPx / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = makeCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
  await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise;
  return canvas;
}

function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob failed'))),
      'image/png',
    );
  });
}

export async function openPdfJsDocument(data: Uint8Array, password?: string): Promise<PdfJsDocument> {
  const lib = await loadPdfJs();
  try {
    return await lib.getDocument({
      data,
      password,
      cMapUrl: '/vendor/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
      wasmUrl: '/vendor/pdfjs/wasm/',
      iccUrl: '/vendor/pdfjs/iccs/',
      isEvalSupported: false,
      enableXfa: false,
      useSystemFonts: false,
    }).promise;
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === 'PasswordException') throw new PdfError('password');
    throw new PdfError('invalid', (e as Error).message);
  }
}

async function pageSizes(doc: PdfJsDocument): Promise<Size[]> {
  const out: Size[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const v = p.getViewport({ scale: 1 });
    out.push({ width: v.width, height: v.height });
  }
  return out;
}

class PdfJsHandle implements PdfDocumentHandle {
  readonly pageCount: number;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private doc: PdfJsDocument,
    readonly pageSizes: Size[],
  ) {
    this.pageCount = doc.numPages;
  }

  /** pdf.js handles concurrency, but serialising keeps memory predictable on big scans. */
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const r = this.queue.then(task, task);
    this.queue = r.catch(() => undefined);
    return r;
  }

  render(pageIndex: number, widthPx: number): Promise<RenderedPage> {
    return this.serial(async () => {
      const page = await this.doc.getPage(pageIndex + 1);
      const canvas = await renderToCanvas(page, widthPx);
      const uri = await canvasToBlobUrl(canvas);
      const result = { uri, width: canvas.width, height: canvas.height };
      canvas.width = canvas.height = 0;
      return result;
    });
  }

  renderGray(pageIndex: number, widthPx: number): Promise<GrayImage> {
    return this.serial(async () => {
      const page = await this.doc.getPage(pageIndex + 1);
      const canvas = await renderToCanvas(page, widthPx);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const gray = rgbaToGray(img.data, canvas.width, canvas.height);
      canvas.width = canvas.height = 0;
      return gray;
    });
  }

  async outline(): Promise<OutlineItem[]> {
    const nodes = await this.doc.getOutline();
    if (!nodes) return [];
    const convert = async (n: PdfJsOutlineNode): Promise<OutlineItem> => {
      let pageIndex: number | null = null;
      try {
        const dest = typeof n.dest === 'string' ? await this.doc.getDestination(n.dest) : n.dest;
        if (Array.isArray(dest) && dest[0] != null) {
          pageIndex = typeof dest[0] === 'number' ? dest[0] : await this.doc.getPageIndex(dest[0]);
        }
      } catch {
        pageIndex = null;
      }
      return { title: n.title, pageIndex, children: await Promise.all((n.items ?? []).map(convert)) };
    };
    return Promise.all(nodes.map(convert));
  }

  async search(query: string): Promise<SearchHit[] | null> {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    const hits: SearchHit[] = [];
    for (let i = 0; i < this.pageCount; i++) {
      const page = await this.doc.getPage(i + 1);
      const text = (await page.getTextContent()).items.map((it) => it.str ?? '').join(' ').toLocaleLowerCase();
      let count = 0;
      for (let at = text.indexOf(q); at >= 0; at = text.indexOf(q, at + q.length)) count++;
      if (count > 0) hits.push({ pageIndex: i, count });
    }
    return hits;
  }

  async close(): Promise<void> {
    // pdf.js 6: the document is released through its loading task.
    await this.doc.loadingTask.destroy();
  }
}

export function createPdfJsEngine(storage: StorageAdapter): PdfEngine {
  return {
    name: 'pdfjs',
    canSearch: true,
    canReadOutline: true,
    async open(req) {
      let data: Uint8Array;
      try {
        data = await storage.read(req.relPath);
      } catch {
        throw new PdfError('missing');
      }
      const doc = await openPdfJsDocument(data, req.password);
      return new PdfJsHandle(doc, await pageSizes(doc));
    },
  };
}
