// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Store screenshots taken from the real app (web version), with the project's
// own test scores, for phones, 7" and 10" tablets, in Spanish and English:
//   npm run export:web && node e2e/serve.mjs dist 8765 &
//   node scripts/store-screenshots.mjs http://localhost:8765
// Output: fastlane/metadata/android/<lang>/images/{phone,sevenInch,tenInch}Screenshots/

import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://localhost:8765';
const fixtures = resolve('test-fixtures');

const DEVICES = [
  // Google Play: each side 320–3840 px and the long side at most twice the short one.
  { dir: 'phoneScreenshots', width: 412, height: 732, scale: 2.625, mobile: true },
  { dir: 'sevenInchScreenshots', width: 600, height: 960, scale: 2, mobile: true },
  { dir: 'tenInchScreenshots', width: 1280, height: 800, scale: 2, mobile: false },
];
const LANGS = [
  { dir: 'es-ES', locale: 'es-ES', folder: 'Concierto de Navidad' },
  { dir: 'en-US', locale: 'en-US', folder: 'Christmas Concert' },
];

const browser = await chromium.launch();
for (const lang of LANGS) {
  for (const dev of DEVICES) {
    const out = resolve('fastlane/metadata/android', lang.dir, 'images', dev.dir);
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: dev.width, height: dev.height },
      deviceScaleFactor: dev.scale,
      isMobile: dev.mobile,
      hasTouch: true,
      locale: lang.locale,
      colorScheme: 'light',
    });
    const page = await context.newPage();
    let n = 0;
    const shot = async () => {
      // No passing notices in the pictures.
      await page
        .getByTestId('toast')
        .waitFor({ state: 'detached', timeout: 8000 })
        .catch(() => undefined);
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(out, `${++n}.png`) });
    };
    const center = { x: dev.width / 2, y: dev.height / 2 };

    await page.goto(base);
    await page.getByTestId('import-button').waitFor({ timeout: 30000 });
    for (const f of ['piano-prueba.pdf', 'partitura-prueba.pdf']) {
      const chooser = page.waitForEvent('filechooser');
      await page.getByTestId('import-button').click();
      await (await chooser).setFiles(join(fixtures, f));
      await page.getByTestId('reader').waitFor({ timeout: 30000 });
      await page.waitForTimeout(800);
      await page.mouse.click(center.x, center.y);
      await page.getByTestId('reader-back').click();
      await page.getByTestId('import-button').waitFor();
    }
    await page.getByTestId('new-folder').click();
    await page.getByTestId('dialog-input').fill(lang.folder);
    await page.getByTestId('dialog-ok').click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: new RegExp(`^${lang.folder},`) }).click();
    await page.getByTestId('add-pieces').click();
    await page.getByTestId('pick-documents').waitFor();
    for (const t of ['piano-prueba', 'partitura-prueba'])
      await page.getByText(t, { exact: true }).last().click();
    await page.getByTestId('pick-confirm').click();
    await page.getByTestId('piece-2').waitFor();
    await shot(); // concert folder
    await page.getByTestId('folder-back').click();
    await page.getByTestId('import-button').waitFor();
    await page.waitForTimeout(1200);
    await shot(); // library

    // Reader
    await page.locator('[data-testid^="doc-"]').first().click();
    await page.getByTestId('reader').waitFor();
    await page.waitForTimeout(1500);
    // Just the music: hide the bars.
    if (
      await page
        .getByTestId('reader-top-bar')
        .isVisible()
        .catch(() => false)
    ) {
      await page.mouse.click(center.x, center.y);
      await page.getByTestId('reader-top-bar').waitFor({ state: 'detached' });
    }
    await shot();
    await page.mouse.click(center.x, center.y);
    await page.getByTestId('reader-annotate').waitFor();

    // Writing on the score: a staff and a pen stroke
    await page.getByTestId('reader-annotate').click();
    await page.getByTestId('annotation-toolbar').waitFor();
    await page.getByTestId('insert-staff').click();
    await page.getByTestId('object-done').click();
    await page.getByTestId('tool-pen').click();
    const surface = await page.getByTestId('annotate-surface').boundingBox();
    const sx = surface.x + surface.width * 0.3;
    const sy = surface.y + surface.height * 0.3;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) await page.mouse.move(sx + i * 6, sy + Math.sin(i / 3) * 14);
    await page.mouse.up();
    await shot();
    await page.getByTestId('annotate-done').click();
    await page.waitForTimeout(500);

    // Page panel
    if (
      !(await page
        .getByTestId('reader-pages')
        .isVisible()
        .catch(() => false))
    ) {
      await page.mouse.click(center.x, center.y);
      await page.getByTestId('reader-pages').waitFor();
    }
    await page.getByTestId('reader-pages').click();
    await page.getByTestId('page-panel').waitFor();
    await page.waitForTimeout(1200);
    await shot();
    await context.close();
    console.log(`${lang.dir}/${dev.dir}: ${n} screenshots`);
  }
}
await browser.close();
