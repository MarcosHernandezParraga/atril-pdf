// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Builds a PDF of a document as it is shown in the app: its pages in the
// current order, with cropped margins and rotation, and (if asked) every
// annotation drawn on them. Original PDF pages are copied as they are (vector,
// full quality); pen, highlighter and staves are drawn as vector lines; text
// notes are drawn with the system fonts (any language) as high-resolution images.

import * as lib from '@cantoo/pdf-lib';
import type { PDFDocument, PDFImage, PDFPage } from '@cantoo/pdf-lib';

import { hasRealPressure, penOutlinePath, polylinePath } from '../annotations/ink';
import { isPlacedObject, staffHeight, staffLines } from '../annotations/objects';
import {
  displayedPageSize,
  type Annotation,
  type DocumentModel,
  type ImageAnnotation,
  type InkAnnotation,
  type PageRef,
  type StaffAnnotation,
  type TextAnnotation,
} from '../core/model';
import {
  compose,
  containRect,
  pageMatrix,
  parseColor,
  parsePath,
  sourcePageMatrix,
  translate,
  type Matrix,
} from './pdfMath';

export interface SourceBytes {
  bytes: Uint8Array;
  kind: 'pdf' | 'image';
  password: string | null;
}

export interface RasterText {
  png: Uint8Array;
  /** Size of the image on the page, in points. */
  width: number;
  height: number;
}

export interface ExportDeps {
  /** The whole file of a source (an imported PDF or image). */
  readSource(sourceId: string): Promise<SourceBytes | null>;
  /** The page drawn by the app (PNG or JPEG), for PDF files that cannot be copied. */
  renderPage(page: PageRef, widthPx: number): Promise<Uint8Array | null>;
  /** A text note drawn with the system fonts. */
  rasterizeText(ann: TextAnnotation, pixelsPerPoint: number): Promise<RasterText | null>;
  /** PNG version of an image in a format that PDF cannot hold (WebP, HEIC…). */
  toPng(bytes: Uint8Array): Promise<Uint8Array | null>;
  onProgress?(done: number, total: number): void;
}

export interface BuildOptions {
  annotations: boolean;
  title: string;
}

const HIGHLIGHTER_OPACITY = 0.38;
const TEXT_PIXELS_PER_POINT = 4;
const FALLBACK_PAGE_WIDTH_PX = 1800;

function isPng(b: Uint8Array) {
  return b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}
function isJpeg(b: Uint8Array) {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export async function buildPdf(
  model: DocumentModel,
  deps: ExportDeps,
  opts: BuildOptions,
): Promise<Uint8Array> {
  const {
    PDFDocument,
    pushGraphicsState,
    popGraphicsState,
    concatTransformationMatrix,
    drawObject,
    moveTo,
    lineTo,
    appendBezierCurve,
    closePath,
    fill,
    stroke,
    rectangle,
    setLineWidth,
    setLineCap,
    setLineJoin,
    setGraphicsState,
    setFillingColor,
    setStrokingColor,
    LineCapStyle,
    LineJoinStyle,
    rgb,
  } = lib;

  const out = await PDFDocument.create();
  out.setTitle(opts.title);
  out.setCreator('Atril PDF');
  out.setProducer('Atril PDF');

  const pdfSources = new Map<string, Promise<PDFDocument | null>>();
  const imageSources = new Map<string, Promise<PDFImage | null>>();
  const embeddedPages = new Map<string, Promise<Awaited<ReturnType<PDFDocument['embedPage']>> | null>>();

  const loadPdf = (sourceId: string) => {
    let p = pdfSources.get(sourceId);
    if (!p) {
      p = (async () => {
        const src = await deps.readSource(sourceId);
        if (!src || src.kind !== 'pdf') return null;
        try {
          return await PDFDocument.load(src.bytes, {
            password: src.password ?? undefined,
            updateMetadata: false,
            ignoreEncryption: !src.password,
          });
        } catch {
          return null;
        }
      })();
      pdfSources.set(sourceId, p);
    }
    return p;
  };

  const embedImageBytes = async (bytes: Uint8Array): Promise<PDFImage | null> => {
    try {
      if (isPng(bytes)) return await out.embedPng(bytes);
      if (isJpeg(bytes)) return await out.embedJpg(bytes);
      const png = await deps.toPng(bytes);
      return png ? await out.embedPng(png) : null;
    } catch {
      return null;
    }
  };

  const loadImage = (sourceId: string) => {
    let p = imageSources.get(sourceId);
    if (!p) {
      p = (async () => {
        const src = await deps.readSource(sourceId);
        return src ? embedImageBytes(src.bytes) : null;
      })();
      imageSources.set(sourceId, p);
    }
    return p;
  };

  const rgbOf = (color: string) => {
    const c = parseColor(color);
    return { color: rgb(c.r, c.g, c.b), alpha: c.a };
  };

  let gsCount = 0;
  const graphicsState = (page: PDFPage, values: { CA?: number; ca?: number; BM?: string }) => {
    const dict = out.context.obj({ Type: 'ExtGState', ...values });
    return page.node.newExtGState(`AtrilGS${gsCount++}-`, out.context.register(dict));
  };

  const cm = (m: Matrix) => concatTransformationMatrix(m[0], m[1], m[2], m[3], m[4], m[5]);

  /** Image covering a rectangle given in page coordinates (y downwards). */
  const drawImage = (
    page: PDFPage,
    M: Matrix,
    image: PDFImage,
    r: { x: number; y: number; w: number; h: number },
  ) => {
    const name = page.node.newXObject('AtrilIm', image.ref);
    page.pushOperators(
      pushGraphicsState(),
      cm(M),
      cm([r.w, 0, 0, -r.h, r.x, r.y + r.h]),
      drawObject(name),
      popGraphicsState(),
    );
  };

  const pathOps = (d: string) =>
    parsePath(d).map((s) =>
      s.op === 'M'
        ? moveTo(s.x, s.y)
        : s.op === 'L'
          ? lineTo(s.x, s.y)
          : s.op === 'C'
            ? appendBezierCurve(s.x1, s.y1, s.x2, s.y2, s.x, s.y)
            : closePath(),
    );

  const drawInk = (page: PDFPage, M: Matrix, a: InkAnnotation) => {
    const { color, alpha } = rgbOf(a.color);
    if (a.tool === 'highlighter') {
      const d = polylinePath(a.points.map(([x, y]) => ({ x, y })));
      if (!d) return;
      const gs = graphicsState(page, { CA: HIGHLIGHTER_OPACITY * alpha, BM: 'Multiply' });
      page.pushOperators(
        pushGraphicsState(),
        cm(M),
        setGraphicsState(gs),
        setStrokingColor(color),
        setLineWidth(a.width),
        setLineCap(LineCapStyle.Round),
        setLineJoin(LineJoinStyle.Round),
        ...pathOps(d),
        stroke(),
        popGraphicsState(),
      );
      return;
    }
    const d = penOutlinePath(a.points, Math.max(0.5, a.width), hasRealPressure(a.points));
    if (!d) return;
    const ops = [pushGraphicsState(), cm(M)];
    if (alpha < 1) ops.push(setGraphicsState(graphicsState(page, { ca: alpha })));
    page.pushOperators(...ops, setFillingColor(color), ...pathOps(d), fill(), popGraphicsState());
  };

  const drawStaff = (page: PDFPage, M: Matrix, a: StaffAnnotation) => {
    const ops = [pushGraphicsState(), cm(M)];
    if (a.opaque) {
      const pad = a.lineSpacing / 2;
      ops.push(
        setFillingColor(rgb(1, 1, 1)),
        rectangle(a.x - pad, a.y - pad, a.width + 2 * pad, staffHeight(a) + 2 * pad),
        fill(),
      );
    }
    ops.push(setFillingColor(rgb(0x11 / 255, 0x11 / 255, 0x11 / 255)));
    for (const y of staffLines(a)) ops.push(rectangle(a.x, a.y + y - a.lineWidth / 2, a.width, a.lineWidth));
    ops.push(fill(), popGraphicsState());
    page.pushOperators(...ops);
  };

  const drawPlacedImage = async (page: PDFPage, M: Matrix, a: ImageAnnotation) => {
    const image = await loadImage(a.sourceId);
    if (image) drawImage(page, M, image, { x: a.x, y: a.y, w: a.width, h: a.height });
  };

  const drawText = async (page: PDFPage, M: Matrix, a: TextAnnotation) => {
    if (!a.text.trim()) return;
    const raster = await deps.rasterizeText(a, TEXT_PIXELS_PER_POINT).catch(() => null);
    if (raster) {
      const image = await out.embedPng(raster.png).catch(() => null);
      if (image) {
        drawImage(page, M, image, { x: a.x, y: a.y, w: raster.width, h: raster.height });
        return;
      }
    }
    // Without system fonts: a standard font, for the characters it has.
    const font = await out.embedFont(a.bold ? lib.StandardFonts.HelveticaBold : lib.StandardFonts.Helvetica);
    const { color } = rgbOf(a.color);
    const lines = a.text.split('\n');
    page.pushOperators(pushGraphicsState(), cm(M), cm([1, 0, 0, -1, a.x, a.y]));
    lines.forEach((line, i) => {
      try {
        page.drawText(line, { x: 0, y: -(a.fontSize * (0.95 + i * 1.3)), size: a.fontSize, font, color });
      } catch {
        // characters the standard font does not have
      }
    });
    page.pushOperators(popGraphicsState());
  };

  const drawStaffPaper = (page: PDFPage, M: Matrix, p: Extract<PageRef, { kind: 'staff' }>) => {
    // The same layout as the staff paper shown in the reader.
    const width = p.size.width;
    const height = p.size.height;
    const { staves, piano } = p.staff;
    const blocks = Math.max(1, staves);
    const marginX = width * 0.07;
    const top = height * 0.06;
    const blockH = (height * 0.9) / blocks;
    const spacing = Math.max(2, (piano ? blockH / 2 : blockH) * 0.09);
    const lw = width / 900;
    const ops = [pushGraphicsState(), cm(M), setFillingColor(rgb(0x1a / 255, 0x1a / 255, 0x1a / 255))];
    for (let b = 0; b < blocks; b++) {
      const staffCount = piano ? 2 : 1;
      for (let s = 0; s < staffCount; s++) {
        const y0 =
          top +
          b * blockH +
          (blockH - (staffCount * 4 * spacing + (staffCount - 1) * spacing * 5)) / 2 +
          s * spacing * 9;
        for (let l = 0; l < 5; l++) ops.push(rectangle(marginX, y0 + l * spacing, width - 2 * marginX, lw));
      }
    }
    ops.push(fill(), popGraphicsState());
    page.pushOperators(...ops);
  };

  const visibleLayers = new Set(model.layers.filter((l) => l.visible).map((l) => l.id));
  const total = model.pages.length;

  for (let index = 0; index < total; index++) {
    const pageRef = model.pages[index]!;
    const size = displayedPageSize(pageRef);
    const page = out.addPage([size.width, size.height]);
    const M = pageMatrix(pageRef);
    const full = { x: 0, y: 0, w: pageRef.size.width, h: pageRef.size.height };

    if (pageRef.kind === 'pdf') {
      let drawn = false;
      const src = await loadPdf(pageRef.sourceId);
      if (src && pageRef.pageIndex < src.getPageCount()) {
        try {
          const key = `${pageRef.sourceId}:${pageRef.pageIndex}`;
          const srcPage = src.getPage(pageRef.pageIndex);
          const mb = srcPage.getMediaBox();
          const cb = srcPage.getCropBox();
          const x0 = Math.max(mb.x, cb.x);
          const y0 = Math.max(mb.y, cb.y);
          const x1 = Math.min(mb.x + mb.width, cb.x + cb.width);
          const y1 = Math.min(mb.y + mb.height, cb.y + cb.height);
          const view: [number, number, number, number] =
            x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : [mb.x, mb.y, mb.x + mb.width, mb.y + mb.height];
          let emb = embeddedPages.get(key);
          if (!emb) {
            emb = out
              .embedPage(srcPage, { left: view[0], bottom: view[1], right: view[2], top: view[3] })
              .catch(() => null);
            embeddedPages.set(key, emb);
          }
          const embedded = await emb;
          if (embedded) {
            const S = sourcePageMatrix(view, srcPage.getRotation().angle);
            const name = page.node.newXObject('AtrilPg', embedded.ref);
            page.pushOperators(
              pushGraphicsState(),
              cm(compose(M, compose(S, translate(view[0], view[1])))),
              drawObject(name),
              popGraphicsState(),
            );
            drawn = true;
          }
        } catch {
          drawn = false;
        }
      }
      if (!drawn) {
        // A file that cannot be copied (damaged, unusual encryption…): the page as the app draws it.
        const bytes = await deps.renderPage(pageRef, FALLBACK_PAGE_WIDTH_PX).catch(() => null);
        const image = bytes ? await embedImageBytes(bytes) : null;
        if (image) drawImage(page, M, image, full);
      }
    } else if (pageRef.kind === 'image') {
      const image = await loadImage(pageRef.sourceId);
      if (image) {
        const r = containRect(
          { width: full.w, height: full.h },
          { width: image.width, height: image.height },
        );
        drawImage(page, M, image, { x: r.x, y: r.y, w: r.width, h: r.height });
      }
    } else if (pageRef.kind === 'staff') {
      drawStaffPaper(page, M, pageRef);
    }

    if (opts.annotations) {
      const list = (model.annotations[pageRef.id] ?? []).filter((a) => visibleLayers.has(a.layerId));
      // Same order as the reader: placed objects, then handwriting, then text.
      for (const a of list.filter(isPlacedObject)) {
        if (a.type === 'staff') drawStaff(page, M, a);
        else await drawPlacedImage(page, M, a);
      }
      for (const a of list) if (a.type === 'ink') drawInk(page, M, a);
      for (const a of list) if (a.type === 'text') await drawText(page, M, a);
    }
    deps.onProgress?.(index + 1, total);
  }

  return out.save({ useObjectStreams: true });
}

/** True when the document is still exactly its original PDF (no pages moved, cropped, rotated or added). */
export function isOriginalPdf(
  model: DocumentModel,
  sourcePageCount: (sourceId: string) => number | null,
): string | null {
  const first = model.pages[0];
  if (!first || first.kind !== 'pdf') return null;
  const count = sourcePageCount(first.sourceId);
  if (count === null || count !== model.pages.length) return null;
  const same = model.pages.every(
    (p, i) =>
      p.kind === 'pdf' && p.sourceId === first.sourceId && p.pageIndex === i && p.rotation === 0 && !p.crop,
  );
  return same ? first.sourceId : null;
}

/** Whether the document has annotations that are shown (visible layers). */
export function hasVisibleAnnotations(model: DocumentModel): boolean {
  const visible = new Set(model.layers.filter((l) => l.visible).map((l) => l.id));
  const pageIds = new Set(model.pages.map((p) => p.id));
  return Object.entries(model.annotations).some(
    ([pageId, list]: [string, Annotation[]]) =>
      pageIds.has(pageId) && list.some((a) => visible.has(a.layerId)),
  );
}
