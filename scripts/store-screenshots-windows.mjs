// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Microsoft Store screenshots (desktop, 3840 x 2160) taken from the real app,
// with the project's own test scores, in Spanish and English:
//   npm run export:web && node e2e/serve.mjs dist 8765 &
//   node scripts/store-screenshots-windows.mjs http://localhost:8765 <output folder>
// Output: <output folder>/<lang>/1.png … 7.png

import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://localhost:8765';
const outRoot = resolve(process.argv[3] ?? 'store-screenshots-windows');
const fixtures = resolve('test-fixtures');

const LANGS = [
  {
    dir: 'es-ES',
    locale: 'es-ES',
    folders: ['Concierto de Navidad', 'Ensayo del jueves', 'Repertorio de verano'],
    pieces: [
      'Marcha procesional',
      'Suite para banda',
      'Obertura festiva',
      'Vals de primavera',
      'Coral de Navidad',
      'Danza del pueblo',
      'Estudio nº 3',
      'Himno de la escuela',
    ],
    note: 'Respirar aquí',
    twoPages: 'Dos páginas',
  },
  {
    dir: 'en-US',
    locale: 'en-US',
    folders: ['Christmas Concert', 'Thursday Rehearsal', 'Summer Repertoire'],
    pieces: [
      'Processional March',
      'Suite for Band',
      'Festive Overture',
      'Spring Waltz',
      'Christmas Chorale',
      'Village Dance',
      'Study No. 3',
      'School Anthem',
    ],
    note: 'Breathe here',
    twoPages: 'Two pages',
  },
];

const W = 1920;
const H = 1080;
const browser = await chromium.launch();

for (const lang of LANGS) {
  const out = join(outRoot, lang.dir);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  // The scores, with real-looking titles (accents included).
  const files = lang.pieces.map((name, i) => ({
    name: `${name}.pdf`,
    mimeType: 'application/pdf',
    buffer: readFileSync(join(fixtures, i % 2 === 0 ? 'partitura-prueba.pdf' : 'piano-prueba.pdf')),
  }));

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: lang.locale,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const shots = {};
  const shot = async (name) => {
    await page
      .getByTestId('toast')
      .waitFor({ state: 'detached', timeout: 8000 })
      .catch(() => undefined);
    await page.waitForTimeout(800);
    shots[name] = join(out, `${name}.png`);
    await page.screenshot({ path: shots[name] });
  };
  const center = { x: W / 2, y: H / 2 };
  const showBars = async () => {
    if (
      !(await page
        .getByTestId('reader-top-bar')
        .isVisible()
        .catch(() => false))
    ) {
      await page.mouse.click(center.x, center.y);
      await page.getByTestId('reader-top-bar').waitFor();
    }
  };
  const hideBars = async () => {
    if (
      await page
        .getByTestId('reader-top-bar')
        .isVisible()
        .catch(() => false)
    ) {
      await page.mouse.click(center.x, center.y);
      await page.getByTestId('reader-top-bar').waitFor({ state: 'detached' });
    }
  };

  await page.goto(base);
  await page.getByTestId('import-button').waitFor({ timeout: 30000 });
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('import-button').click();
  await (await chooser).setFiles([...files].reverse());
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-testid^="doc-"]').length >= n,
    files.length,
    { timeout: 120000 },
  );

  // Concert folders
  for (const name of lang.folders) {
    await page.getByTestId('new-folder').click();
    await page.getByTestId('dialog-input').fill(name);
    await page.getByTestId('dialog-ok').click();
    await page.waitForTimeout(600);
  }
  await page.getByRole('button', { name: new RegExp(`^${lang.folders[0]},`) }).click();
  await page.getByTestId('add-pieces').click();
  await page.getByTestId('pick-documents').waitFor();
  for (const t of lang.pieces.slice(0, 5)) await page.getByText(t, { exact: true }).last().click();
  await page.getByTestId('pick-confirm').click();
  await page.getByTestId('piece-5').waitFor();
  await shot('3-concierto');
  await page.getByTestId('folder-back').click();
  await page.getByTestId('import-button').waitFor();
  await page.waitForTimeout(2500);
  await shot('2-biblioteca');

  // Writing on the first piece
  // The first card is the first piece (the most recent ones go first).
  await page.locator('[data-testid^="doc-"]').first().click();
  await page.getByTestId('reader').waitFor();
  await page.waitForTimeout(1500);
  await showBars();
  await page.getByTestId('reader-annotate').click();
  await page.getByTestId('annotation-toolbar').waitFor();
  const box = await page.getByTestId('annotate-surface').boundingBox();
  const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  // Pen: a phrase arc over the first system
  await page.getByTestId('tool-pen').click();
  let p = at(0.2, 0.16);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) {
    const q = at(0.2 + i * 0.012, 0.16 - Math.sin((i / 30) * Math.PI) * 0.035);
    await page.mouse.move(q.x, q.y);
  }
  await page.mouse.up();
  // Highlighter on the fifth system
  await page.getByTestId('tool-highlighter').click();
  p = at(0.12, 0.45);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  p = at(0.6, 0.45);
  await page.mouse.move(p.x, p.y, { steps: 15 });
  await page.mouse.up();
  // A text note
  await page.getByTestId('tool-text').click();
  p = at(0.62, 0.29);
  await page.mouse.click(p.x, p.y);
  await page.getByTestId('annotation-text-input').waitFor();
  await page.keyboard.type(lang.note);
  await page.getByTestId('text-done').click();
  // A small staff to write a correction
  await page.getByTestId('insert-staff').click();
  await page.waitForTimeout(500);
  await shot('4-escribir');
  await page
    .getByTestId('object-done')
    .click()
    .catch(() => undefined);
  await page.getByTestId('annotate-done').click();
  await page.waitForTimeout(600);

  // Two pages, like an open book
  await showBars();
  await page.getByTestId('reader-mode').click();
  await page.getByText(lang.twoPages, { exact: false }).first().click();
  await page.waitForTimeout(1800);
  await hideBars();
  await page.keyboard.press('Home');
  await page.waitForTimeout(1500);
  await shot('1-dos-paginas');

  // Page panel
  await showBars();
  await page.getByTestId('reader-pages').click();
  await page.getByTestId('page-panel').waitFor();
  await page.waitForTimeout(1500);
  await shot('5-paginas');
  await page.getByTestId('page-panel-close').click();
  await page.waitForTimeout(500);

  // Share
  await showBars();
  await page.getByTestId('reader-share').click();
  await page.waitForTimeout(900);
  await shot('6-compartir');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.mouse.click(10, 10);
  await page.waitForTimeout(400);

  // Settings: 21 languages
  await showBars();
  await page.getByTestId('reader-back').click();
  await page.getByTestId('import-button').waitFor();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('language-choice').click();
  await page.waitForTimeout(900);
  await shot('7-idiomas');

  await context.close();
  console.log(`${lang.dir}: ${Object.keys(shots).length} screenshots in ${out}`);
}
await browser.close();
