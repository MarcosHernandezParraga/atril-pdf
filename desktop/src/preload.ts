// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Runs in an isolated context before the interface loads and exposes the
// minimal desktop API as `window.atrilDesktop`.

import { contextBridge, ipcRenderer, webUtils } from 'electron';

import type { DesktopBridge, PickedFile } from '../../src/platform/desktopBridge';

const appVersion = process.argv.find((a) => a.startsWith('--atril-version='))?.split('=')[1] ?? '';

function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const bridge: DesktopBridge = {
  platform: process.platform,
  versions: {
    app: appVersion,
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
  },
  db: {
    query: (q) => ipcRenderer.invoke('db:query', q),
    batch: (q) => ipcRenderer.invoke('db:batch', q),
    exec: (s) => ipcRenderer.invoke('db:exec', s),
  },
  fs: {
    read: (p) => ipcRenderer.invoke('fs:read', p),
    write: (p, d) => ipcRenderer.invoke('fs:write', p, d),
    exists: (p) => ipcRenderer.invoke('fs:exists', p),
    remove: (p) => ipcRenderer.invoke('fs:remove', p),
    size: (p) => ipcRenderer.invoke('fs:size', p),
    list: (p) => ipcRenderer.invoke('fs:list', p),
    readExternal: (p) => ipcRenderer.invoke('fs:readExternal', p),
    importExternal: (abs, rel) => ipcRenderer.invoke('fs:importExternal', abs, rel),
  },
  dialogs: {
    openFiles: (o) => ipcRenderer.invoke('dialog:openFiles', o),
    saveFile: (o) => ipcRenderer.invoke('dialog:saveFile', o),
    chooseDirectory: () => ipcRenderer.invoke('dialog:chooseDirectory'),
    writeFilesTo: (dir, files) => ipcRenderer.invoke('dialog:writeFilesTo', dir, files),
  },
  window: {
    setFullScreen: (on) => ipcRenderer.invoke('window:setFullScreen', on),
    isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),
    onFullScreenChange: (cb) => subscribe<boolean>('window:fullscreen', cb),
  },
  power: {
    keepScreenOn: (on) => ipcRenderer.invoke('power:keepScreenOn', on),
  },
  files: {
    takePending: () => ipcRenderer.invoke('files:takePending'),
    onOpen: (cb) => subscribe<PickedFile[]>('files:open', cb),
    registerDropped: async (file) => {
      const path = webUtils.getPathForFile(file);
      return path ? ipcRenderer.invoke('fs:allowDropped', path) : null;
    },
  },
  print: (pdf) => ipcRenderer.invoke('print:pdf', pdf),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
};

contextBridge.exposeInMainWorld('atrilDesktop', bridge);
