// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { PDFDocument, degrees } from '@cantoo/pdf-lib';

import { buildPdf, hasVisibleAnnotations, isOriginalPdf, type ExportDeps } from '../../export/buildPdf';
import {
  apply,
  compose,
  pageMatrix,
  parseColor,
  parsePath,
  safeFileName,
  sourcePageMatrix,
} from '../../export/pdfMath';
import { emptyModel, type DocumentModel, type PageRef } from '../model';

const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe('export geometry', () => {
  it('places a page as in the reader (no crop, no rotation)', () => {
    const page: PageRef = {
      id: 'p',
      kind: 'blank',
      size: { width: 600, height: 800 },
      rotation: 0,
      crop: null,
    };
    const m = pageMatrix(page);
    close(apply(m, 0, 0), { x: 0, y: 800 });
    close(apply(m, 600, 800), { x: 600, y: 0 });
  });

  it('applies the crop and the rotation chosen in the app', () => {
    const page: PageRef = {
      id: 'p',
      kind: 'blank',
      size: { width: 600, height: 800 },
      rotation: 90,
      crop: { left: 0.1, top: 0, right: 0, bottom: 0 },
    };
    const m = pageMatrix(page);
    // Displayed page: 800 x 540. The top-left of the cropped page goes to the top-right.
    close(apply(m, 60, 0), { x: 800, y: 540 });
    close(apply(m, 600, 800), { x: 0, y: 0 });
  });

  it('reads source pages like pdf.js, for every /Rotate', () => {
    const view: [number, number, number, number] = [0, 0, 600, 800];
    close(apply(sourcePageMatrix(view, 0), 0, 800), { x: 0, y: 0 });
    close(apply(sourcePageMatrix(view, 0), 600, 0), { x: 600, y: 800 });
    close(apply(sourcePageMatrix(view, 90), 0, 0), { x: 0, y: 0 });
    close(apply(sourcePageMatrix(view, 90), 0, 800), { x: 800, y: 0 });
    close(apply(sourcePageMatrix(view, 180), 600, 0), { x: 0, y: 0 });
    close(apply(sourcePageMatrix(view, 270), 600, 800), { x: 0, y: 0 });
    close(apply(sourcePageMatrix([10, 20, 610, 820], 0), 10, 820), { x: 0, y: 0 });
  });

  it('composes matrices in the right order', () => {
    const scale2: [number, number, number, number, number, number] = [2, 0, 0, 2, 0, 0];
    const move: [number, number, number, number, number, number] = [1, 0, 0, 1, 5, 0];
    close(apply(compose(scale2, move), 1, 1), { x: 12, y: 2 });
  });

  it('reads colours and handwriting paths', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseColor('#0f08').a).toBeCloseTo(0x88 / 255);
    expect(parseColor('rgba(0, 0, 255, 0.5)')).toEqual({ r: 0, g: 0, b: 1, a: 0.5 });
    expect(parseColor('nonsense')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    const segs = parsePath('M 0 0 Q 10 0 10 10 20 20 30 20 Z');
    expect(segs.map((s) => s.op)).toEqual(['M', 'C', 'C', 'Z']);
    expect(parsePath('M 1 2 L 3 4 L 5 6').map((s) => s.op)).toEqual(['M', 'L', 'L']);
  });

  it('makes file names every system accepts', () => {
    expect(safeFileName('Sinfonía nº 5: «Allegro»/parte?')).toBe('Sinfonía nº 5 «Allegro» parte.pdf');
    expect(safeFileName('   ')).toBe('Atril PDF.pdf');
  });
});

async function sourcePdf(rotate = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const p = doc.addPage([600, 800]);
    p.setRotation(degrees(rotate));
    p.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 30 });
  }
  return doc.save();
}

function deps(bytes: Uint8Array): ExportDeps & { rendered: number } {
  const d = {
    rendered: 0,
    readSource: async (id: string) => (id === 'src' ? { bytes, kind: 'pdf' as const, password: null } : null),
    renderPage: async () => {
      d.rendered++;
      return null;
    },
    rasterizeText: async () => null,
    toPng: async () => null,
  };
  return d;
}

const pdfPage = (i: number, extra: Partial<PageRef> = {}): PageRef =>
  ({
    id: `p${i}`,
    kind: 'pdf',
    sourceId: 'src',
    pageIndex: i,
    size: { width: 600, height: 800 },
    rotation: 0,
    crop: null,
    ...extra,
  }) as PageRef;

describe('exporting a document to PDF', () => {
  it('keeps the pages, their order, crop and rotation, and adds new pages', async () => {
    const model: DocumentModel = {
      ...emptyModel(),
      pages: [
        pdfPage(2),
        pdfPage(0, { rotation: 90 }),
        pdfPage(1, { crop: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 } }),
        { id: 'b', kind: 'blank', size: { width: 595, height: 842 }, rotation: 0, crop: null },
        {
          id: 's',
          kind: 'staff',
          size: { width: 595, height: 842 },
          rotation: 0,
          crop: null,
          staff: { staves: 10, piano: false },
        },
      ],
    };
    const d = deps(await sourcePdf());
    const bytes = await buildPdf(model, d, { annotations: true, title: 'Prueba' });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(5);
    const sizes = out.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
    expect(sizes).toEqual([
      [600, 800],
      [800, 600],
      [480, 640],
      [595, 842],
      [595, 842],
    ]);
    expect(out.getTitle()).toBe('Prueba');
    expect(d.rendered).toBe(0);
  });

  it('draws pen, highlighter, staves and text on the page', async () => {
    const model: DocumentModel = {
      ...emptyModel(),
      pages: [pdfPage(0)],
      annotations: {
        p0: [
          {
            id: 'a',
            layerId: 'default',
            type: 'ink',
            tool: 'pen',
            color: '#c62828',
            width: 2,
            points: [
              [10, 10, 0.5],
              [50, 60, 0.5],
              [90, 30, 0.5],
            ],
          },
          {
            id: 'b',
            layerId: 'default',
            type: 'ink',
            tool: 'highlighter',
            color: '#ffeb3b',
            width: 12,
            points: [
              [10, 100, 0.5],
              [200, 100, 0.5],
            ],
          },
          {
            id: 'c',
            layerId: 'default',
            type: 'staff',
            x: 50,
            y: 300,
            width: 300,
            staves: 1,
            piano: false,
            clef: null,
            lineSpacing: 6,
            lineWidth: 0.8,
            staffGap: 30,
            opaque: true,
          },
          {
            id: 'd',
            layerId: 'default',
            type: 'text',
            x: 40,
            y: 500,
            width: 100,
            height: 20,
            text: 'Respirar aquí',
            fontSize: 14,
            color: '#000000',
            bold: false,
          },
        ],
      },
    };
    expect(hasVisibleAnnotations(model)).toBe(true);
    const withNotes = await buildPdf(model, deps(await sourcePdf()), { annotations: true, title: 'x' });
    const without = await buildPdf(model, deps(await sourcePdf()), { annotations: false, title: 'x' });
    expect(withNotes.length).toBeGreaterThan(without.length);
    const out = await PDFDocument.load(withNotes);
    expect(out.getPageCount()).toBe(1);
  });

  it('hidden layers are not exported', () => {
    const model: DocumentModel = {
      ...emptyModel(),
      pages: [pdfPage(0)],
      layers: [{ id: 'default', name: '', visible: false }],
      annotations: {
        p0: [
          {
            id: 'a',
            layerId: 'default',
            type: 'ink',
            tool: 'pen',
            color: '#000',
            width: 2,
            points: [[1, 1, 0.5]],
          },
        ],
      },
    };
    expect(hasVisibleAnnotations(model)).toBe(false);
  });

  it('copies source pages that have their own rotation', async () => {
    const model: DocumentModel = {
      ...emptyModel(),
      pages: [pdfPage(0, { size: { width: 800, height: 600 } })],
    };
    const out = await PDFDocument.load(
      await buildPdf(model, deps(await sourcePdf(90)), { annotations: true, title: 'x' }),
    );
    expect([Math.round(out.getPage(0).getWidth()), Math.round(out.getPage(0).getHeight())]).toEqual([
      800, 600,
    ]);
  });

  it('draws the page as the app does when the file cannot be copied', async () => {
    const d = deps(new Uint8Array([1, 2, 3]));
    const out = await PDFDocument.load(
      await buildPdf({ ...emptyModel(), pages: [pdfPage(0)] }, d, { annotations: true, title: 'x' }),
    );
    expect(out.getPageCount()).toBe(1);
    expect(d.rendered).toBe(1);
  });

  it('recognises an untouched document, to share the original file as it is', () => {
    const pages = [pdfPage(0), pdfPage(1), pdfPage(2)];
    expect(isOriginalPdf({ ...emptyModel(), pages }, () => 3)).toBe('src');
    expect(isOriginalPdf({ ...emptyModel(), pages: [pages[1]!, pages[0]!, pages[2]!] }, () => 3)).toBeNull();
    expect(isOriginalPdf({ ...emptyModel(), pages: pages.slice(0, 2) }, () => 3)).toBeNull();
    expect(
      isOriginalPdf(
        { ...emptyModel(), pages: [pdfPage(0, { rotation: 90 }), pages[1]!, pages[2]!] },
        () => 3,
      ),
    ).toBeNull();
  });
});
