// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop shell (Windows, macOS, Linux). Loads the exported web interface from
// the local `app://` protocol, never from the network, and exposes a minimal,
// validated API through the preload script.

import { app, BrowserWindow, dialog, ipcMain, Menu, powerSaveBlocker, session, shell } from 'electron';
import { promises as fsp, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

import type { SqlQuery } from '../../src/db/executor';
import { createNodeSqliteExecutor } from '../../src/db/backends/nodeSqlite';
import type { FileFilter, PickedFile } from '../../src/platform/desktopBridge';
import { registerAppProtocol, registerAppScheme, APP_ORIGIN } from './protocol';
import { libraryPath } from './safePath';
import identity from '../../src/config/identity.json';

registerAppScheme();
app.setName(identity.name);
if (process.platform === 'win32') app.setAppUserModelId(identity.appId);

const OPENABLE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.atril']);
/** Largest piece of a library file sent to the window at once. */
const MAX_READ_RANGE = 16 * 1024 * 1024;

let mainWindow: BrowserWindow | null = null;
let pendingFiles: PickedFile[] = [];
const allowedExternal = new Set<string>();
let blockerId: number | null = null;

function libraryRoot(): string {
  return join(app.getPath('userData'), 'library');
}

function toPicked(path: string): PickedFile | null {
  try {
    const st = statSync(path);
    if (!st.isFile() || !OPENABLE_EXTENSIONS.has(extname(path).toLowerCase())) return null;
    allowedExternal.add(path);
    return { path, name: basename(path), size: st.size };
  } catch {
    return null;
  }
}

function filesFromArgv(argv: string[]): PickedFile[] {
  return argv
    .slice(app.isPackaged ? 1 : 2)
    .filter((a) => !a.startsWith('-'))
    .map(toPicked)
    .filter((f): f is PickedFile => f !== null);
}

function deliverFiles(files: PickedFile[]) {
  if (files.length === 0) return;
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('files:open', files);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingFiles.push(...files);
  }
}

// Only one instance: opening a PDF while the app is running sends it to the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    deliverFiles(filesFromArgv(argv));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  // macOS sends files through this event (it may arrive before "ready").
  app.on('open-file', (e, path) => {
    e.preventDefault();
    const f = toPicked(path);
    if (f) deliverFiles([f]);
  });
  pendingFiles = filesFromArgv(process.argv);
  app.whenReady().then(start);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 480,
    title: identity.name,
    backgroundColor: '#1B1712',
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, 'icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      webviewTag: false,
      // The developer tools only exist while developing, never in the published app.
      devTools: !app.isPackaged,
      additionalArguments: [`--atril-version=${app.getVersion()}`],
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('enter-full-screen', () => mainWindow?.webContents.send('window:fullscreen', true));
  mainWindow.on('leave-full-screen', () => mainWindow?.webContents.send('window:fullscreen', false));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  void mainWindow.loadURL(`${APP_ORIGIN}/`);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'editMenu' },
    {
      label: 'View',
      // No window zoom here: Ctrl + / Ctrl − / Ctrl 0 zoom the score in the reader.
      submenu: [{ role: 'togglefullscreen' }],
    },
    { role: 'windowMenu' },
  ];
  if (!app.isPackaged) {
    (template[template.length - 2]!.submenu as Electron.MenuItemConstructorOptions[]).push({
      role: 'toggleDevTools',
    });
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function start() {
  const webRoot = join(__dirname, 'web');
  registerAppProtocol(webRoot);

  // No permission is ever needed (no camera, microphone, location, notifications...).
  const allowedPermission = (permission: string) =>
    permission === 'clipboard-sanitized-write' || permission === 'fullscreen';
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(allowedPermission(permission)),
  );
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowedPermission(permission));
  // Block any network access: the app works 100% offline.
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (_d, cb) => cb({ cancel: true }),
  );

  await fsp.mkdir(libraryRoot(), { recursive: true });
  const executor = createNodeSqliteExecutor(join(app.getPath('userData'), 'atril.db'));
  registerIpc(executor);
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

/** Only the project's own page may be opened in the browser (from "About"). */
function isAllowedExternal(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'github.com';
  } catch {
    return false;
  }
}

app.on('web-contents-created', (_e, contents) => {
  // No new windows: allowed links open in the normal browser instead.
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // The window can never leave the app's own pages.
  contents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) e.preventDefault();
  });
  contents.on('will-redirect', (e, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) e.preventDefault();
  });
  // Embedded web views are never allowed.
  contents.on('will-attach-webview', (e) => e.preventDefault());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function toElectronFilters(filters: FileFilter[]) {
  return filters.map((f) => ({ name: f.name, extensions: f.extensions }));
}

function checkExternal(path: string): string {
  if (!allowedExternal.has(path) || !OPENABLE_EXTENSIONS.has(extname(path).toLowerCase())) {
    throw new Error('Access denied');
  }
  return path;
}

/**
 * Like ipcMain.handle, but only answers the app's own interface (never another
 * page or frame, even if one were somehow loaded).
 */
function handle<A extends unknown[], R>(
  channel: string,
  fn: (e: Electron.IpcMainInvokeEvent, ...args: A) => R | Promise<R>,
) {
  ipcMain.handle(channel, (e, ...args) => {
    const url = e.senderFrame?.url ?? '';
    if (!url.startsWith(`${APP_ORIGIN}/`) || e.senderFrame !== mainWindow?.webContents.mainFrame) {
      throw new Error('Access denied');
    }
    return fn(e, ...(args as A));
  });
}

function registerIpc(executor: ReturnType<typeof createNodeSqliteExecutor>) {
  const root = libraryRoot();

  handle('db:query', (_e, q: SqlQuery) => executor.query(q));
  handle('db:batch', (_e, qs: SqlQuery[]) => executor.batch(qs));
  handle('db:exec', (_e, script: string) => executor.exec(script));

  handle('fs:read', async (_e, rel: string) => new Uint8Array(await fsp.readFile(libraryPath(root, rel))));
  // Large scores are read in pieces, only the pages being shown.
  handle('fs:readRange', async (_e, rel: string, start: number, end: number) => {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
      throw new Error('Invalid range');
    }
    if (end - start > MAX_READ_RANGE) throw new Error('Range too large');
    const file = await fsp.open(libraryPath(root, rel), 'r');
    try {
      const buffer = Buffer.alloc(end - start);
      const { bytesRead } = await file.read(buffer, 0, end - start, start);
      return new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
    } finally {
      await file.close();
    }
  });
  handle('fs:write', async (_e, rel: string, data: Uint8Array) => {
    const p = libraryPath(root, rel);
    await fsp.mkdir(join(p, '..'), { recursive: true });
    const tmp = `${p}.tmp`;
    await fsp.writeFile(tmp, data);
    await fsp.rename(tmp, p);
  });
  handle('fs:exists', async (_e, rel: string) =>
    fsp
      .access(libraryPath(root, rel))
      .then(() => true)
      .catch(() => false),
  );
  handle('fs:remove', async (_e, rel: string) =>
    fsp.rm(libraryPath(root, rel), { force: true, recursive: true }),
  );
  handle('fs:size', async (_e, rel: string) => (await fsp.stat(libraryPath(root, rel))).size);
  handle('fs:list', async (_e, rel: string) =>
    fsp.readdir(libraryPath(root, rel)).catch(() => [] as string[]),
  );
  handle(
    'fs:readExternal',
    async (_e, abs: string) => new Uint8Array(await fsp.readFile(checkExternal(abs))),
  );
  handle('fs:importExternal', async (_e, abs: string, rel: string) => {
    const dest = libraryPath(root, rel);
    await fsp.mkdir(join(dest, '..'), { recursive: true });
    await fsp.copyFile(checkExternal(abs), dest);
    return (await fsp.stat(dest)).size;
  });
  handle('fs:allowDropped', (_e, abs: string) => toPicked(abs));

  handle('dialog:openFiles', async (_e, opts: { filters: FileFilter[]; multiple: boolean }) => {
    if (!mainWindow) return [];
    const r = await dialog.showOpenDialog(mainWindow, {
      properties: opts.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: toElectronFilters(opts.filters),
    });
    if (r.canceled) return [];
    return r.filePaths.map(toPicked).filter((f): f is PickedFile => f !== null);
  });
  handle(
    'dialog:saveFile',
    async (_e, opts: { defaultName: string; filters: FileFilter[]; data: Uint8Array }) => {
      if (!mainWindow) return null;
      const r = await dialog.showSaveDialog(mainWindow, {
        defaultPath: opts.defaultName,
        filters: toElectronFilters(opts.filters),
      });
      if (r.canceled || !r.filePath) return null;
      await fsp.writeFile(r.filePath, opts.data);
      return r.filePath;
    },
  );
  const allowedDirs = new Set<string>();
  handle('dialog:chooseDirectory', async () => {
    if (!mainWindow) return null;
    const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    allowedDirs.add(r.filePaths[0]);
    return r.filePaths[0];
  });
  handle('dialog:writeFilesTo', async (_e, dir: string, files: { name: string; data: Uint8Array }[]) => {
    if (!allowedDirs.has(dir)) throw new Error('Access denied');
    for (const f of files) await fsp.writeFile(join(dir, basename(f.name)), f.data);
  });

  handle('window:setFullScreen', (_e, on: boolean) => mainWindow?.setFullScreen(Boolean(on)));
  handle('window:isFullScreen', () => mainWindow?.isFullScreen() ?? false);

  handle('power:keepScreenOn', (_e, on: boolean) => {
    if (on && blockerId === null) blockerId = powerSaveBlocker.start('prevent-display-sleep');
    if (!on && blockerId !== null) {
      powerSaveBlocker.stop(blockerId);
      blockerId = null;
    }
  });

  handle('files:takePending', () => {
    const files = pendingFiles;
    pendingFiles = [];
    return files;
  });

  handle('print:pdf', async () => false);

  handle('shell:openExternal', async (_e, url: string) => {
    if (isAllowedExternal(url)) await shell.openExternal(url);
  });
}
