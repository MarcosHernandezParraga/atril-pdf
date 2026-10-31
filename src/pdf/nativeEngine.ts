// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// iOS (PDFKit) and Android (PdfRenderer) engine, implemented in
// modules/atril-native. Rendered pages are cached as files by the native side.

import { AtrilNative, type AtrilNativeModuleType } from '../../modules/atril-native';
import type { GrayImage } from '../core/contentDetection';
import type { Size } from '../core/model';
import type { StorageAdapter } from '../storage/types';
import { PdfError, type OutlineItem, type PdfDocumentHandle, type PdfEngine } from './types';

function mapError(e: unknown): PdfError {
  const code = (e as { code?: string }).code ?? '';
  if (code.includes('PASSWORD')) return new PdfError('password');
  if (code.includes('MISSING')) return new PdfError('missing');
  return new PdfError('invalid', (e as Error).message);
}

export function decodeGray(bytes: Uint8Array): GrayImage {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  return { width, height, data: bytes.subarray(8, 8 + width * height) };
}

class NativeHandle implements PdfDocumentHandle {
  constructor(
    private native: AtrilNativeModuleType,
    private handle: string,
    readonly pageCount: number,
    readonly pageSizes: Size[],
  ) {}

  async render(pageIndex: number, widthPx: number) {
    try {
      return await this.native.renderPage(this.handle, pageIndex, Math.round(widthPx));
    } catch (e) {
      throw mapError(e);
    }
  }

  async renderGray(pageIndex: number, widthPx: number) {
    try {
      return decodeGray(await this.native.renderPageGray(this.handle, pageIndex, Math.round(widthPx)));
    } catch (e) {
      throw mapError(e);
    }
  }

  async outline(): Promise<OutlineItem[]> {
    if (!this.native.canReadOutline) return [];
    return this.native.getOutline(this.handle);
  }

  async search(query: string) {
    if (!this.native.canSearch) return null;
    return this.native.searchText(this.handle, query);
  }

  async close() {
    await this.native.closeDocument(this.handle);
  }
}

export function createNativeEngine(storage: StorageAdapter): PdfEngine {
  const native = AtrilNative;
  if (!native) throw new Error('Native PDF module not available');
  return {
    name: 'native',
    canSearch: native.canSearch,
    canReadOutline: native.canReadOutline,
    async open(req) {
      const uri = storage.nativeUri(req.relPath);
      if (!uri) throw new PdfError('missing');
      try {
        const r = await native.openDocument(uri, req.password ?? null);
        const sizes: Size[] = [];
        for (let i = 0; i < r.pageCount; i++) sizes.push({ width: r.sizes[i * 2]!, height: r.sizes[i * 2 + 1]! });
        return new NativeHandle(native, r.handle, r.pageCount, sizes);
      } catch (e) {
        throw mapError(e);
      }
    },
  };
}
