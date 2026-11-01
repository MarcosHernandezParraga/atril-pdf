// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// pdf.js engine for desktop (Electron) and web. pdf.js and its worker ship
// with the app (public/vendor/pdfjs) and are loaded from the local origin.

import { rgbaToGray, type GrayImage } from '../core/contentDetection';
import type { Size } from '../core/model';
import { loadScript } from '../platform/loadScript';
import type { RangedFile, StorageAdapter } from '../storage/types';
import {
  PdfError,
  type OutlineItem,
  type PdfDocumentHandle,
  type PdfEngine,
  type RenderedPage,
  type SearchHit,
} from './types';
import { assetUrl } from '../platform/basePath';

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
interface PdfJsRangeTransport {
  requestDataRange(begin: number, end: number): void;
  onDataRange(begin: number, chunk: Uint8Array): void;
}
interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
  destroy(): Promise<void>;
}
interface PdfJsWorker {
  destroyed: boolean;
}
interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  PDFWorker: new (o?: { name?: string }) => PdfJsWorker;
  getDocument(o: Record<string, unknown>): PdfJsLoadingTask;
  PDFDataRangeTransport: new (length: number, initialData: Uint8Array | null) => PdfJsRangeTransport;
  PasswordException?: new () => Error;
}

/** Larger files are read in pieces: only the parts of the pages being shown. */
const RANGED_FROM = 4 * 1024 * 1024;

let libPromise: Promise<PdfJsLib> | null = null;
let sharedWorker: PdfJsWorker | null = null;

/**
 * One pdf.js worker for every document. Otherwise each document starts its own
 * (a new copy of pdf.js in memory): importing or showing the thumbnails of a
 * library of hundreds of scores would use a lot of memory and time.
 */
function workerFor(lib: PdfJsLib): PdfJsWorker {
  if (!sharedWorker || sharedWorker.destroyed) sharedWorker = new lib.PDFWorker({ name: 'atril-pdf' });
  return sharedWorker;
}

export function loadPdfJs(): Promise<PdfJsLib> {
  if (!libPromise) {
    libPromise = loadScript(assetUrl('/vendor/pdfjs/pdf.min.mjs'), 'module').then(() => {
      const lib = (globalThis as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
      if (!lib) throw new Error('pdf.js not available');
      lib.GlobalWorkerOptions.workerSrc = assetUrl('/vendor/pdfjs/pdf.worker.min.mjs');
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
  const canvas = makeCanvas(
    Math.max(1, Math.round(viewport.width)),
    Math.max(1, Math.round(viewport.height)),
  );
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

async function loadDocument(
  source: (lib: PdfJsLib) => {
    options: Record<string, unknown>;
    onTask?: (task: PdfJsLoadingTask) => void;
    failed?: () => boolean;
  },
  password?: string,
): Promise<PdfJsDocument> {
  const lib = await loadPdfJs();
  const { options, onTask, failed } = source(lib);
  try {
    const task = lib.getDocument({
      ...options,
      worker: workerFor(lib),
      password,
      cMapUrl: assetUrl('/vendor/pdfjs/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: assetUrl('/vendor/pdfjs/standard_fonts/'),
      wasmUrl: assetUrl('/vendor/pdfjs/wasm/'),
      iccUrl: assetUrl('/vendor/pdfjs/iccs/'),
      isEvalSupported: false,
      enableXfa: false,
      useSystemFonts: false,
    });
    onTask?.(task);
    return await task.promise;
  } catch (e) {
    if (failed?.()) throw new PdfError('missing');
    const name = (e as { name?: string }).name;
    if (name === 'PasswordException') throw new PdfError('password');
    throw new PdfError('invalid', (e as Error).message);
  }
}

export function openPdfJsDocument(data: Uint8Array, password?: string): Promise<PdfJsDocument> {
  return loadDocument(() => ({ options: { data } }), password);
}

/**
 * Opens a stored file without loading it whole: pdf.js asks for the byte
 * ranges it needs (the index of the file, then the pages that are shown).
 * Memory stays low with scores of hundreds of pages and hundreds of megabytes.
 */
function openPdfJsRanged(file: RangedFile, password?: string): Promise<PdfJsDocument> {
  return loadDocument((lib) => {
    const transport = new lib.PDFDataRangeTransport(file.length, null);
    let readFailed = false;
    let task: PdfJsLoadingTask | null = null;
    transport.requestDataRange = (begin, end) => {
      file.read(begin, end).then(
        (chunk) => {
          try {
            transport.onDataRange(begin, chunk);
          } catch {
            // The document was closed meanwhile.
          }
        },
        () => {
          readFailed = true;
          void task?.destroy();
        },
      );
    };
    return {
      options: { range: transport, length: file.length, disableAutoFetch: true, disableStream: true },
      onTask: (t) => (task = t),
      failed: () => readFailed,
    };
  }, password);
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
      const text = (await page.getTextContent()).items
        .map((it) => it.str ?? '')
        .join(' ')
        .toLocaleLowerCase();
      let count = 0;
      for (let at = text.indexOf(q); at >= 0; at = text.indexOf(q, at + q.length)) count++;
      if (count > 0) hits.push({ pageIndex: i, count });
    }
    return hits;
  }

  async close(): Promise<void> {
    // After the pages already being drawn. pdf.js 6: the document is released
    // through its loading task.
    await this.queue;
    await this.doc.loadingTask.destroy();
  }
}

export function createPdfJsEngine(storage: StorageAdapter): PdfEngine {
  return {
    name: 'pdfjs',
    canSearch: true,
    canReadOutline: true,
    async open(req) {
      let doc: PdfJsDocument;
      if (storage.openRanged) {
        let file: RangedFile;
        try {
          file = await storage.openRanged(req.relPath);
        } catch {
          throw new PdfError('missing');
        }
        doc =
          file.length > RANGED_FROM
            ? await openPdfJsRanged(file, req.password)
            : await openPdfJsDocument(await file.read(0, file.length), req.password);
      } else {
        let data: Uint8Array;
        try {
          data = await storage.read(req.relPath);
        } catch {
          throw new PdfError('missing');
        }
        doc = await openPdfJsDocument(data, req.password);
      }
      // Page sizes saved when importing: no need to read every page again.
      const known = req.pageSizes;
      return new PdfJsHandle(doc, known && known.length === doc.numPages ? known : await pageSizes(doc));
    },
  };
}
