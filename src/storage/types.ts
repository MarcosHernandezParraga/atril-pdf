// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.

/** A file chosen by the user outside the library (picker, "Open with", drag and drop). */
export type ExternalFile =
  | { kind: 'uri'; uri: string; name: string; size?: number; mimeType?: string }
  | { kind: 'path'; path: string; name: string; size: number }
  | { kind: 'blob'; blob: Blob; name: string };

/**
 * Files of the library (imported PDFs and images, thumbnails, exports),
 * addressed by a path relative to the library directory.
 */
export interface StorageAdapter {
  read(relPath: string): Promise<Uint8Array>;
  write(relPath: string, data: Uint8Array): Promise<void>;
  exists(relPath: string): Promise<boolean>;
  remove(relPath: string): Promise<void>;
  size(relPath: string): Promise<number>;
  /** Copies an external file into the library and returns its size in bytes. */
  importExternal(file: ExternalFile, relPath: string): Promise<number>;
  readExternal(file: ExternalFile): Promise<Uint8Array>;
  /** Native file URI (iOS/Android) for engines that open files directly; null elsewhere. */
  nativeUri(relPath: string): string | null;
}

export function externalName(file: ExternalFile): string {
  return file.name;
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return base.replace(/[_]+/g, ' ').trim() || name;
}
