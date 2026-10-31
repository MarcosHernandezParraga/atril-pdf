// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
// Browser smoke test: import a score, open it, turn pages with the keyboard, switch modes.
import { createRequire } from 'node:module';

// Uses the Playwright installed on the machine (global) or in the project.
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:8765';
const shots = process.argv[3] ?? 'e2e-shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, locale: 'es-ES' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const step = async (name, fn) => {
  const t0 = Date.now();
  await fn();
  console.log(`✓ ${name} (${Date.now() - t0} ms)`);
};

await step('library loads', async () => {
  await page.goto(base);
  await page.getByTestId('import-button').waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${shots}/01-biblioteca-vacia.png` });
});

await step('import a PDF', async () => {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('import-button').click();
  await (await chooser).setFiles('test-fixtures/partitura-prueba.pdf');
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  await page.getByTestId('page-indicator').waitFor();
});

const indicator = async () => (await page.getByTestId('page-indicator').textContent())?.trim();

await step('page 1 shown', async () => {
  await page.waitForTimeout(1500);
  if ((await indicator()) !== 'Página 1 de 6') throw new Error(`unexpected ${await indicator()}`);
  await page.screenshot({ path: `${shots}/02-lector-pagina-1.png` });
});

await step('turning shows the next page without a loading indicator', async () => {
  await page.waitForTimeout(1500);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  const spinners = await page.locator('[role="progressbar"]').count();
  if (spinners > 0) throw new Error('next page was not pre-rendered');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
});

await step('ArrowRight / PageDown / Space turn pages (pedal keys)', async () => {
  await page.mouse.move(5, 5);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  await page.getByTestId('reader').click({ position: { x: 640, y: 400 } });
  await page.waitForTimeout(500);
  const v = await indicator();
  if (v !== 'Página 4 de 6') throw new Error(`unexpected ${v}`);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(250);
  await page.getByTestId('reader').click({ position: { x: 640, y: 400 } });
  await page.waitForTimeout(400);
  if ((await indicator()) !== 'Página 3 de 6') throw new Error(`unexpected ${await indicator()}`);
});

await step('anti-bounce: two presses within 150 ms turn one page', async () => {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.getByTestId('reader').click({ position: { x: 640, y: 400 } });
  await page.waitForTimeout(400);
  const v = await indicator();
  if (v !== 'Página 4 de 6') throw new Error(`unexpected ${v}`);
});

async function chooseMode(label) {
  const bar = page.getByTestId('reader-mode');
  if (!(await bar.isVisible())) await page.getByTestId('reader').click({ position: { x: 640, y: 400 } });
  await page.getByTestId('reader-mode').click();
  await page.getByText(label, { exact: true }).click();
  await page.waitForTimeout(1500);
}

await step('half-page mode (music stand)', async () => {
  await page.keyboard.press('Home');
  await chooseMode('Media página');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);
  await page.getByTestId('half-page-stand').waitFor();
  await page.screenshot({ path: `${shots}/03-media-pagina.png` });
});

await step('two pages', async () => {
  await chooseMode('Dos páginas');
  await page.getByTestId('two-page').waitFor();
  await page.screenshot({ path: `${shots}/04-dos-paginas.png` });
});

await step('vertical with look-ahead', async () => {
  await chooseMode('Vertical con anticipación');
  await page.getByTestId('lookahead').waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/05-vertical-anticipacion.png` });
});

await step('vertical continuous', async () => {
  await chooseMode('Vertical continuo');
  await page.getByTestId('continuous').waitFor();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/06-vertical-continuo.png` });
});

await step('back to library shows the document with thumbnail', async () => {
  await page.getByTestId('reader').click({ position: { x: 640, y: 400 } });
  await page.getByTestId('reader-back').click();
  await page.getByTestId('import-button').waitFor();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${shots}/07-biblioteca.png` });
});

await step('settings and about', async () => {
  await page.getByTestId('open-settings').click();
  await page.getByTestId('open-pedal').waitFor();
  await page.screenshot({ path: `${shots}/08-ajustes.png` });
  await page.getByTestId('open-pedal').click();
  await page.getByTestId('key-test').waitFor();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(200);
  const k = await page.getByTestId('last-key').textContent();
  if (k?.trim() !== 'PageDown') throw new Error(`key test shows ${k}`);
  await page.screenshot({ path: `${shots}/09-pedal.png` });
  await page.getByTestId('header-back').last().click();
  await page.getByTestId('open-about').click();
  await page.getByTestId('about-author').waitFor();
  const a = await page.getByTestId('about-author').textContent();
  if (!a?.includes('Marcos Hernández Párraga')) throw new Error('author missing');
  await page.screenshot({ path: `${shots}/10-acerca-de.png` });
});

await step('password-protected PDF asks for the password', async () => {
  await page.goto(base);
  await page.getByTestId('import-button').waitFor();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('import-button').click();
  await (await chooser).setFiles('test-fixtures/protegido-prueba.pdf');
  await page.getByTestId('dialog-input').waitFor({ timeout: 20000 });
  await page.getByTestId('dialog-input').fill('mala');
  await page.getByTestId('dialog-ok').click();
  await page.getByText('La contraseña no es correcta', { exact: false }).waitFor({ timeout: 20000 });
  await page.getByTestId('dialog-input').fill('atril');
  await page.getByTestId('dialog-ok').click();
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  const v = await indicator();
  if (v !== 'Página 1 de 2') throw new Error(`unexpected ${v}`);
  await page.screenshot({ path: `${shots}/11-pdf-protegido.png` });
});

await browser.close();
const relevant = errors.filter((e) => !/favicon|DevTools/.test(e));
if (relevant.length) {
  console.log('Console errors:\n' + relevant.join('\n'));
}
console.log('ALL OK');
