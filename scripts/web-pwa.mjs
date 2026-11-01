// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Turns the web export into an installable app ("PWA") that works offline:
//   node scripts/web-pwa.mjs <dist> [/base-path]
// - manifest with the app icons (Android/Chrome "Install", iPhone/iPad "Add to Home Screen")
// - Apple tags so it opens full screen, with its own icon and name
// - strict Content Security Policy (only the app's own files)
// - service worker that keeps every file of the app on the device (offline use)
// - 404.html (deep links on GitHub Pages) and .nojekyll (keeps the _expo folder)

import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv[2] ?? 'dist';
const base = (process.argv[3] ?? process.env.EXPO_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');
const identity = JSON.parse(readFileSync(join(root, 'src/config/identity.json'), 'utf8'));

const THEME = '#B5622A';
const BACKGROUND = '#1B1712';

// ------------------------------------------------------------------ icons
const icons = ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png'];
for (const f of icons) copyFileSync(join(root, 'assets/web', f), join(dist, f));

// --------------------------------------------------------------- manifest
const manifest = {
  id: `${base}/`,
  name: identity.name,
  short_name: identity.shortName ?? identity.name,
  description: 'Tu atril digital: lector de partituras PDF libre y gratuito. Funciona sin conexión.',
  lang: 'es',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'any',
  background_color: BACKGROUND,
  theme_color: THEME,
  categories: ['music', 'education', 'productivity'],
  icons: [
    { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${base}/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// -------------------------------------------------------- service worker
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}
const skip = (rel) =>
  rel.endsWith('.map') ||
  rel === 'sw.js' ||
  rel === '404.html' ||
  rel === 'metadata.json' ||
  rel === '.nojekyll';

writeFileSync(
  join(dist, 'register-sw.js'),
  `// Keeps the app on the device so it works without internet, and asks the
// browser not to delete the library when space is short.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('${base}/sw.js', { scope: '${base}/' }).catch(() => {});
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
`,
);

// ------------------------------------------------------------- index.html
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');
const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
const head = `
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="description" content="Tu atril digital: lector de partituras PDF libre y gratuito, hecho por un músico para todos los músicos." />
    <meta name="theme-color" content="${THEME}" />
    <link rel="manifest" href="${base}/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="${identity.name}" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <script src="${base}/register-sw.js" defer></script>
    <style>html, body { touch-action: manipulation; overscroll-behavior: none; -webkit-user-select: none; user-select: none; } input, textarea { -webkit-user-select: text; user-select: text; }</style>
`;
if (!html.includes('rel="manifest"')) {
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  );
  html = html.replace('</head>', `${head}</head>`);
  writeFileSync(indexPath, html);
}
copyFileSync(indexPath, join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');

const files = listFiles(dist)
  .map((p) => relative(dist, p).split('\\').join('/'))
  .filter((rel) => !skip(rel))
  .sort();
const version = createHash('sha256');
for (const rel of files) version.update(rel).update(readFileSync(join(dist, rel)));
const cacheName = `atril-${version.digest('hex').slice(0, 16)}`;
const urls = files.map((rel) => (rel === 'index.html' ? `${base}/` : `${base}/${rel}`));

writeFileSync(
  join(dist, 'sw.js'),
  `// Atril PDF — offline support. Generated by scripts/web-pwa.mjs.
const CACHE = ${JSON.stringify(cacheName)};
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify(urls)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('atril-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Every page of the app is the same single page (index.html).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE + '/').then((cached) => cached || fetch(request)),
    );
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request)));
});
`,
);

const total = files.reduce((n, rel) => n + statSync(join(dist, rel)).size, 0);
console.log(
  `[pwa] ${files.length} files (${(total / 1024 / 1024).toFixed(1)} MB) kept offline, cache ${cacheName}, base "${base || '/'}"`,
);
