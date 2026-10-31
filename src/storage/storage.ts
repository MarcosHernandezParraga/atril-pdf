// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop storage (files in the user's application data folder, through the
// Electron bridge) and plain-browser development storage (IndexedDB).

import { getDesktopBridge, type DesktopBridge } from '../platform/desktopBridge';
import { idbStore } from '../platform/loadScript';
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

function browserStorage(): StorageAdapter {
  const store = idbStore('atril-dev-files');
  return {
    async read(rel) {
      const v = await store.get<Uint8Array>(rel);
      if (!v) throw new Error(`File not found: ${rel}`);
      return v;
    },
    write: (rel, data) => store.set(rel, data),
    exists: async (rel) => (await store.get(rel)) !== undefined,
    remove: (rel) => store.delete(rel),
    size: async (rel) => (await store.get<Uint8Array>(rel))?.byteLength ?? 0,
    async importExternal(ext: ExternalFile, rel: string) {
      const bytes = await this.readExternal(ext);
      await store.set(rel, bytes);
      return bytes.byteLength;
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
