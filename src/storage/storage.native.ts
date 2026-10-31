// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// iOS / Android storage: the library lives in the app's private documents
// directory (backed up by the system, never visible to other apps).

import { Directory, File, Paths } from 'expo-file-system';

import type { ExternalFile, StorageAdapter } from './types';

const ROOT = new Directory(Paths.document, 'library');

function fileFor(rel: string): File {
  if (!rel || rel.includes('..')) throw new Error('Invalid path');
  return new File(ROOT, ...rel.split('/'));
}

function ensureParent(file: File) {
  const parent = file.parentDirectory;
  if (!parent.exists) parent.create({ intermediates: true, idempotent: true });
}

export function createStorage(): StorageAdapter {
  if (!ROOT.exists) ROOT.create({ intermediates: true, idempotent: true });
  return {
    async read(rel) {
      return fileFor(rel).bytes();
    },
    async write(rel, data) {
      const f = fileFor(rel);
      ensureParent(f);
      if (!f.exists) f.create({ intermediates: true, overwrite: true });
      await f.write(data);
    },
    async exists(rel) {
      return fileFor(rel).exists;
    },
    async remove(rel) {
      const f = fileFor(rel);
      if (f.exists) f.delete();
    },
    async size(rel) {
      return fileFor(rel).size;
    },
    async importExternal(ext: ExternalFile, rel) {
      if (ext.kind !== 'uri') throw new Error('Unsupported file');
      const dest = fileFor(rel);
      ensureParent(dest);
      if (dest.exists) dest.delete();
      try {
        await new File(ext.uri).copy(dest);
      } catch {
        // Some providers (content:// URIs) cannot be copied directly: stream the bytes instead.
        const bytes = await new File(ext.uri).bytes();
        dest.create({ intermediates: true, overwrite: true });
        await dest.write(bytes);
      }
      return dest.size;
    },
    async readExternal(ext) {
      if (ext.kind !== 'uri') throw new Error('Unsupported file');
      return new File(ext.uri).bytes();
    },
    nativeUri(rel) {
      return fileFor(rel).uri;
    },
  };
}
