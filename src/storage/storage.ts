// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop storage (files in the user's application data folder, through the
// Electron bridge) and browser storage for the web version (IndexedDB).

import { getDesktopBridge, type DesktopBridge } from '../platform/desktopBridge';
import { idbStore } from '../platform/loadScript';
import { isInstalledWebApp, keepStoragePersistent } from '../platform/persistentStorage';
import type { ExternalFile, StorageAdapter } from './types';

function desktopStorage(bridge: DesktopBridge): StorageAdapter {
  return {
    read: (rel) => bridge.fs.read(rel),
    write: (rel, data) => bridge.fs.write(rel, data),
    exists: (rel) => bridge.fs.exists(rel),
    remove: (rel) => bridge.fs.remove(rel),
    size: (rel) => bridge.fs.size(rel),
    async importExternal(ext, rel) {
      if (ext.kind === 'path') return bridge.fs.importExternal(ext.path, rel);
      const bytes = await this.readExternal(ext);
      await bridge.fs.write(rel, bytes);
      return bytes.byteLength;
    },
    async readExternal(ext) {
      if (ext.kind === 'path') return bridge.fs.readExternal(ext.path);
      if (ext.kind === 'blob') return new Uint8Array(await ext.blob.arrayBuffer());
      throw new Error('Unsupported file');
    },
    nativeUri: () => null,
  };
}

/** Bytes of a stored file: a Blob, or a byte array in libraries saved by earlier versions. */
async function bytesOf(value: Blob | Uint8Array): Promise<Uint8Array> {
  return value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : value;
}

function browserStorage(): StorageAdapter {
  const store = idbStore('atril-dev-files');
  // The scores must survive when the device runs low on space.
  if (isInstalledWebApp()) keepStoragePersistent();
  // Files are kept as Blobs: the browser stores them as separate files, with no
  // size limit per score (byte arrays are limited, about 128 MB in Chrome).
  const save = async (rel: string, blob: Blob) => {
    await store.set(rel, blob);
    keepStoragePersistent();
  };
  return {
    async read(rel) {
      const v = await store.get<Blob | Uint8Array>(rel);
      if (!v) throw new Error(`File not found: ${rel}`);
      return bytesOf(v);
    },
    write: (rel, data) => save(rel, new Blob([data as BlobPart])),
    exists: async (rel) => (await store.get(rel)) !== undefined,
    remove: (rel) => store.delete(rel),
    async size(rel) {
      const v = await store.get<Blob | Uint8Array>(rel);
      return v ? (v instanceof Blob ? v.size : v.byteLength) : 0;
    },
    async importExternal(ext: ExternalFile, rel: string) {
      let blob: Blob;
      if (ext.kind === 'blob') blob = ext.blob.slice(0, ext.blob.size, ext.blob.type);
      else if (ext.kind === 'uri') blob = await (await fetch(ext.uri)).blob();
      else throw new Error('Unsupported file');
      await save(rel, blob);
      return blob.size;
    },
    async readExternal(ext) {
      if (ext.kind === 'blob') return new Uint8Array(await ext.blob.arrayBuffer());
      if (ext.kind === 'uri') return new Uint8Array(await (await fetch(ext.uri)).arrayBuffer());
      throw new Error('Unsupported file');
    },
    nativeUri: () => null,
  };
}

export function createStorage(): StorageAdapter {
  const bridge = getDesktopBridge();
  return bridge ? desktopStorage(bridge) : browserStorage();
}
