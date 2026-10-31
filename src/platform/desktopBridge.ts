// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Contract between the desktop shell (Electron preload script) and the
// interface. The preload exposes exactly this object as `window.atrilDesktop`;
// nothing else from Node.js or Electron is reachable from the interface.

import type { SqlQuery, SqlResult } from '../db/executor';

export interface PickedFile {
  path: string;
  name: string;
  size: number;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface DesktopBridge {
  platform: 'win32' | 'darwin' | 'linux' | string;
  versions: { app: string; electron: string; chrome: string };
  db: {
    query(q: SqlQuery): Promise<SqlResult>;
    batch(q: SqlQuery[]): Promise<SqlResult[]>;
    exec(script: string): Promise<void>;
  };
  /** Files inside the library directory, addressed by relative path. */
  fs: {
    read(relPath: string): Promise<Uint8Array>;
    write(relPath: string, data: Uint8Array): Promise<void>;
    exists(relPath: string): Promise<boolean>;
    remove(relPath: string): Promise<void>;
    size(relPath: string): Promise<number>;
    list(relDir: string): Promise<string[]>;
    /** Reads a file chosen by the user anywhere on disk (only paths previously returned by a dialog or "Open with"). */
    readExternal(absPath: string): Promise<Uint8Array>;
    /** Copies an external file into the library. */
    importExternal(absPath: string, relPath: string): Promise<number>;
  };
  dialogs: {
    openFiles(opts: { filters: FileFilter[]; multiple: boolean }): Promise<PickedFile[]>;
    saveFile(opts: { defaultName: string; filters: FileFilter[]; data: Uint8Array }): Promise<string | null>;
    chooseDirectory(): Promise<string | null>;
    /** Writes several files into a directory chosen with chooseDirectory(). */
    writeFilesTo(dir: string, files: { name: string; data: Uint8Array }[]): Promise<void>;
  };
  window: {
    setFullScreen(on: boolean): Promise<void>;
    isFullScreen(): Promise<boolean>;
    onFullScreenChange(cb: (on: boolean) => void): () => void;
  };
  power: {
    keepScreenOn(on: boolean): Promise<void>;
  };
  /** PDF files opened from outside ("Open with", double click, drag onto the icon). */
  files: {
    takePending(): Promise<PickedFile[]>;
    onOpen(cb: (files: PickedFile[]) => void): () => void;
    /** Registers a file dropped from the system file manager so it can be imported. */
    registerDropped(file: File): Promise<PickedFile | null>;
  };
  print(pdf: Uint8Array): Promise<boolean>;
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    atrilDesktop?: DesktopBridge;
  }
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.atrilDesktop ?? null;
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== null;
}
