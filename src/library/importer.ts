// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Imports PDF files and images into the library. The original file is copied
// into the library (the app keeps its own copy) and never modified.

import { Image, Platform } from 'react-native';

import { newId } from '../core/ids';
import { emptyModel, PAPER_SIZES, type DocumentModel, type PageRef } from '../core/model';
import type { PdfEngine } from '../pdf/types';
import { PdfError } from '../pdf/types';
import { extensionOf, titleFromFileName, type ExternalFile, type StorageAdapter } from '../storage/types';
import type { LibraryRepository, NewSource } from './repository';

export const PDF_EXTENSIONS = ['pdf'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

export type ImportFailureReason = 'invalid' | 'password' | 'unsupported' | 'io';

export interface ImportResult {
  documentIds: string[];
  failures: { name: string; reason: ImportFailureReason }[];
}

export function fileKind(name: string, mimeType?: string): 'pdf' | 'image' | null {
  const ext = extensionOf(name);
  if (PDF_EXTENSIONS.includes(ext) || mimeType === 'application/pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext) || mimeType?.startsWith('image/')) return 'image';
  return null;
}

async function imageSize(
  storage: StorageAdapter,
  relPath: string,
): Promise<{ width: number; height: number }> {
  const native = storage.nativeUri(relPath);
  if (native && Platform.OS !== 'web') {
    return new Promise((resolve, reject) =>
      Image.getSize(native, (width, height) => resolve({ width, height }), reject),
    );
  }
  const bytes = await storage.read(relPath);
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/** A4-width page with the image's proportions. */
export function pageSizeForImage(w: number, h: number): { width: number; height: number } {
  const width = PAPER_SIZES.a4.width;
  return { width, height: Math.round((width * h) / Math.max(1, w)) };
}

export interface ImporterDeps {
  repo: LibraryRepository;
  storage: StorageAdapter;
  engine: PdfEngine;
  /** Asks the user for the password of a protected PDF (null = cancel). */
  askPassword?: (fileName: string, retry: boolean) => Promise<string | null>;
}

async function openWithPassword(deps: ImporterDeps, relPath: string, fileName: string) {
  let password: string | undefined;
  for (let attempt = 0; ; attempt++) {
    try {
      return { handle: await deps.engine.open({ relPath, password }), password };
    } catch (e) {
      if (!(e instanceof PdfError) || e.code !== 'password' || !deps.askPassword || attempt >= 3) throw e;
      const answer = await deps.askPassword(fileName, attempt > 0);
      if (answer === null) throw e;
      password = answer;
    }
  }
}

/** Copies one external file into the library and returns its source + pages. */
export async function importSource(
  deps: ImporterDeps,
  file: ExternalFile,
): Promise<{ source: NewSource; pages: PageRef[] }> {
  const mime = file.kind === 'uri' ? file.mimeType : undefined;
  const kind = fileKind(file.name, mime);
  if (!kind) throw new PdfError('unsupported');
  const id = newId();
  const ext = kind === 'pdf' ? 'pdf' : extensionOf(file.name) || 'jpg';
  const relPath = `sources/${id}.${ext}`;
  let byteSize: number;
  try {
    byteSize = await deps.storage.importExternal(file, relPath);
  } catch {
    throw new PdfError('missing');
  }
  try {
    if (kind === 'pdf') {
      const { handle, password } = await openWithPassword(deps, relPath, file.name);
      const sizes = handle.pageSizes;
      await handle.close();
      if (sizes.length === 0) throw new PdfError('invalid');
      const pages: PageRef[] = sizes.map((size, pageIndex) => ({
        id: newId(),
        kind: 'pdf',
        sourceId: id,
        pageIndex,
        size,
        rotation: 0,
        crop: null,
      }));
      return {
        source: {
          id,
          kind: 'pdf',
          path: relPath,
          linked: false,
          originalName: file.name,
          byteSize,
          pageSizes: sizes.map((s) => [s.width, s.height]),
          password: password ?? null,
        },
        pages,
      };
    }
    const px = await imageSize(deps.storage, relPath);
    const size = pageSizeForImage(px.width, px.height);
    return {
      source: {
        id,
        kind: 'image',
        path: relPath,
        linked: false,
        originalName: file.name,
        byteSize,
        pageSizes: [[px.width, px.height]],
      },
      pages: [{ id: newId(), kind: 'image', sourceId: id, size, rotation: 0, crop: null }],
    };
  } catch (e) {
    await deps.storage.remove(relPath).catch(() => undefined);
    throw e;
  }
}

function reasonOf(e: unknown): ImportFailureReason {
  if (e instanceof PdfError) {
    if (e.code === 'password') return 'password';
    if (e.code === 'unsupported') return 'unsupported';
    if (e.code === 'missing') return 'io';
  }
  return 'invalid';
}

/** Imports each file as a new document of the library. */
export async function importFiles(
  deps: ImporterDeps,
  files: ExternalFile[],
  folderId: string | null,
  onProgress?: (name: string) => void,
): Promise<ImportResult> {
  const result: ImportResult = { documentIds: [], failures: [] };
  for (const file of files) {
    onProgress?.(file.name);
    try {
      const { source, pages } = await importSource(deps, file);
      const model: DocumentModel = { ...emptyModel(), pages };
      const id = newId();
      await deps.repo.createDocument({
        id,
        title: titleFromFileName(file.name),
        folderId,
        model,
        sources: [source],
      });
      result.documentIds.push(id);
    } catch (e) {
      console.warn(`[import] ${file.name}:`, e);
      result.failures.push({ name: file.name, reason: reasonOf(e) });
    }
  }
  return result;
}
