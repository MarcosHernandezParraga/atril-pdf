// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Common interface of the PDF rendering engines:
//  - native (iOS PDFKit / Android PdfRenderer) in modules/atril-native,
//  - pdf.js on desktop and web.

import type { GrayImage } from '../core/contentDetection';
import type { Size } from '../core/model';

export interface RenderedPage {
  /** Image URI usable by <Image> (file:// on mobile, blob: on desktop). */
  uri: string;
  width: number;
  height: number;
}

export interface OutlineItem {
  title: string;
  pageIndex: number | null;
  children: OutlineItem[];
}

export interface SearchHit {
  pageIndex: number;
  count: number;
}

export type PdfErrorCode = 'password' | 'invalid' | 'missing' | 'unsupported';

export class PdfError extends Error {
  constructor(
    public readonly code: PdfErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'PdfError';
  }
}

export interface PdfDocumentHandle {
  readonly pageCount: number;
  /** Size in points of each page (already honouring the page's own /Rotate). */
  readonly pageSizes: Size[];
  render(pageIndex: number, widthPx: number): Promise<RenderedPage>;
  /** Small grayscale rendering used for margin and system detection. */
  renderGray(pageIndex: number, widthPx: number): Promise<GrayImage>;
  outline(): Promise<OutlineItem[]>;
  /** Text search; null when the platform cannot search. */
  search(query: string): Promise<SearchHit[] | null>;
  close(): Promise<void>;
}

export interface PdfOpenRequest {
  /** Relative path of the file inside the library. */
  relPath: string;
  password?: string;
}

export interface PdfEngine {
  readonly name: 'native' | 'pdfjs';
  readonly canSearch: boolean;
  readonly canReadOutline: boolean;
  open(req: PdfOpenRequest): Promise<PdfDocumentHandle>;
}
