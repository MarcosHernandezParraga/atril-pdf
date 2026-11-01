// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
// Test of the installable web version as published on GitHub Pages (in a sub-folder):
// manifest and icons, service worker, deep links (404.html) and use WITHOUT internet.
//   npm run export:pages && node e2e/pwa-smoke.mjs dist-pages /atril-pdf
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const dir = process.argv[2] ?? 'dist-pages';
const base = process.argv[3] ?? '/atril-pdf';
const port = 8790;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
};

// Behaves like GitHub Pages: files under the base folder, unknown paths -> 404.html.
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(`${base}/`)) {
    res.writeHead(404).end();
    return;
  }
  let file = normalize(join(dir, path.slice(base.length)));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(dir, '404.html')));
  }
}).listen(port);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'es-ES' });
const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
const check = (ok, what) => {
  if (!ok) throw new Error(what);
  console.log(`✓ ${what}`);
};

try {
  const home = `http://localhost:${port}${base}/`;
  await page.goto(home);
  await page.getByTestId('import-button').waitFor({ timeout: 30000 });
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? (await fetch(link.href)).json() : null;
  });
  check(manifest?.name === 'Atril PDF' && manifest.icons.length >= 3, 'manifest with name and icons');
  check(
    (await page.evaluate(() =>
      document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
    )) === `${base}/apple-touch-icon.png`,
    'icon for iPhone and iPad',
  );
  const sw = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL);
  check(sw?.endsWith(`${base}/sw.js`), 'service worker active');

  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('import-button').click();
  await (await chooser).setFiles('test-fixtures/partitura-prueba.pdf');
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  check(page.url().startsWith(`${home}reader/`), 'reader address inside the folder');
  await page.reload();
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  check(true, 'reloading inside a score works (404.html)');

  await page.goto(home);
  await page.getByTestId('import-button').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  await context.setOffline(true);
  await page.reload();
  await page.getByTestId('import-button').waitFor({ timeout: 30000 });
  check(
    (await page.locator('[data-testid^="doc-"]').count()) === 1,
    'without internet: the app and the library open',
  );
  await page.locator('[data-testid^="doc-"]').first().click();
  await page.getByTestId('reader').waitFor();
  await page.waitForTimeout(2500);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);
  check((await page.locator('[role="progressbar"]').count()) === 0, 'without internet: pages are drawn');
  check(problems.length === 0, `no errors${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  console.log('ALL OK');
} finally {
  await browser.close();
  server.close();
}
