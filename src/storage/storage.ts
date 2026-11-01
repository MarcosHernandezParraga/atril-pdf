// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop storage (files in the user's application data folder, through the
// Electron bridge) and browser storage for the web version (IndexedDB).

import { getDesktopBridge, type DesktopBridge } from '../platform/desktopBridge';
import { idbStore } from '../platform/loadScript';
import { isInstalledWebApp, keepStoragePersistent } from '../platform/persistentStorage';
import { chunkedFiles } from './chunkedFiles';
import type { ExternalFile, RangedFile, StorageAdapter } from './types';

/** Largest piece asked to the desktop app at once. */
const DESKTOP_PIECE = 8 * 1024 * 1024;

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
    async openRanged(rel): Promise<RangedFile> {
      const length = await bridge.fs.size(rel);
      return {
        length,
        async read(begin, end) {
          const stop = Math.min(end, length);
          const out = new Uint8Array(Math.max(0, stop - begin));
          for (let at = begin; at < stop; at += DESKTOP_PIECE) {
            out.set(await bridge.fs.readRange(rel, at, Math.min(stop, at + DESKTOP_PIECE)), at - begin);
          }
          return out;
        },
      };
    },
  };
}

function browserStorage(): StorageAdapter {
  const files = chunkedFiles(idbStore('atril-dev-files'));
  // The scores must survive when the device runs low on space.
  if (isInstalledWebApp()) keepStoragePersistent();
  return {
    read: (rel) => files.read(rel),
    async write(rel, data) {
      await files.write(rel, data);
      keepStoragePersistent();
    },
    exists: (rel) => files.exists(rel),
    remove: (rel) => files.remove(rel),
    size: (rel) => files.size(rel),
    async importExternal(ext: ExternalFile, rel: string) {
      let blob: Blob;
      if (ext.kind === 'blob') blob = ext.blob;
      else if (ext.kind === 'uri') blob = await (await fetch(ext.uri)).blob();
      else throw new Error('Unsupported file');
      // Copied piece by piece: a score of any size, without loading it whole.
      await files.saveFrom(
        rel,
        blob.size,
        async (b, e) => new Uint8Array(await blob.slice(b, e).arrayBuffer()),
      );
      keepStoragePersistent();
      return blob.size;
    },
    async readExternal(ext) {
      if (ext.kind === 'blob') return new Uint8Array(await ext.blob.arrayBuffer());
      if (ext.kind === 'uri') return new Uint8Array(await (await fetch(ext.uri)).arrayBuffer());
      throw new Error('Unsupported file');
    },
    nativeUri: () => null,
    openRanged: (rel) => files.open(rel),
  };
}

export function createStorage(): StorageAdapter {
  const bridge = getDesktopBridge();
  return bridge ? desktopStorage(bridge) : browserStorage();
}
