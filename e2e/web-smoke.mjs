// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
// Browser test of the main user journeys: import, read, turn pages with pedal keys,
// zoom (wheel, keys, pinch), view modes, write on the PDF (pen and text), concert
// folders, dragging pieces onto folders and reordering them, settings, protected PDFs.
import { createRequire } from 'node:module';

// Uses the Playwright installed in the project (or on the machine).
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

const indicator = async () => (await page.getByTestId('page-indicator').textContent())?.trim();
const showBars = async () => {
  if (
    !(await page
      .getByTestId('reader-top-bar')
      .isVisible()
      .catch(() => false))
  ) {
    await page.getByTestId('reader').click({ position: { x: 640, y: 430 } });
    await page.getByTestId('reader-top-bar').waitFor();
  }
};
async function importFile(file) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('import-button').click();
  await (await chooser).setFiles(file);
}
async function backToLibrary() {
  await showBars();
  await page.getByTestId('reader-back').click();
  await page.getByTestId('import-button').waitFor();
}

await step('home: title, author and folders section', async () => {
  await page.goto(base);
  await page.getByTestId('import-button').waitFor({ timeout: 30000 });
  const by = await page.getByTestId('made-by').textContent();
  if (!by?.includes('Marcos Hernández Párraga')) throw new Error('author missing');
  await page.getByTestId('new-folder').waitFor();
  await page.screenshot({ path: `${shots}/01-inicio.png` });
});

await step('import a PDF and open it', async () => {
  await importFile('test-fixtures/partitura-prueba.pdf');
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  if ((await indicator()) !== 'Página 1 de 6') throw new Error(`unexpected ${await indicator()}`);
  await page.screenshot({ path: `${shots}/02-lector.png` });
});

await step('turning shows the next page without a loading indicator', async () => {
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  if ((await page.locator('[role="progressbar"]').count()) > 0) throw new Error('loading indicator visible');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${shots}/03-pasar-hoja-3d.png` });
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);
});

await step('ArrowRight / PageDown / Space turn pages (pedal keys)', async () => {
  for (const k of ['ArrowRight', 'PageDown', 'Space']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(300);
  }
  await showBars();
  if ((await indicator()) !== 'Página 4 de 6') throw new Error(`unexpected ${await indicator()}`);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  await showBars();
  if ((await indicator()) !== 'Página 3 de 6') throw new Error(`unexpected ${await indicator()}`);
});

await step('anti-bounce: two presses within 150 ms turn one page', async () => {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await showBars();
  if ((await indicator()) !== 'Página 4 de 6') throw new Error(`unexpected ${await indicator()}`);
});

await step('write on the PDF: pen stroke and text', async () => {
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
  await showBars();
  await page.getByTestId('reader-annotate').click();
  await page.getByTestId('annotate-surface').waitFor();
  const box = await page.getByTestId('annotate-surface').boundingBox();
  // Pen: a wavy line
  await page.mouse.move(box.x + 80, box.y + 120);
  await page.mouse.down();
  for (let i = 0; i <= 30; i++) await page.mouse.move(box.x + 80 + i * 8, box.y + 120 + Math.sin(i / 3) * 18);
  await page.mouse.up();
  await page.waitForTimeout(300);
  // Text
  await page.getByTestId('tool-text').click();
  await page.mouse.click(box.x + 120, box.y + 220);
  await page.getByTestId('annotation-text-input').waitFor();
  await page.keyboard.type('Respirar aquí');
  await page.getByTestId('text-done').click();
  await page.getByText('Respirar aquí', { exact: true }).waitFor();
  // Pencil only toggle is available
  await page.getByTestId('toggle-finger').waitFor();
  await page.screenshot({ path: `${shots}/04-anotar.png` });
  await page.getByTestId('annotate-done').click();
  await page.waitForTimeout(500);
  await page.getByText('Respirar aquí', { exact: true }).waitFor();
});

const zoomOf = async () =>
  page
    .getByTestId('zoom-layer')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform))
    .then((m) => ({ scale: m.a, x: m.e, y: m.f }));
/** Two-finger pinch on a touch screen, from `from` to `to` pixels between the fingers. */
async function pinch(cx, cy, from, to) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touch = (type, pts) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })),
    });
  await touch('touchStart', [
    [cx - from / 2, cy],
    [cx + from / 2, cy],
  ]);
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const d = (from + ((to - from) * i) / steps) / 2;
    await touch('touchMove', [
      [cx - d, cy],
      [cx + d, cy],
    ]);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd', []);
  // one finger moves the zoomed page
  await touch('touchStart', [[cx, cy]]);
  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', [[cx, cy + i * 12]]);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd', []);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await cdp.detach();
}

async function chooseMode(label) {
  await showBars();
  await page.getByTestId('reader-mode').click();
  await page.getByText(label, { exact: true }).click();
  await page.waitForTimeout(1200);
}

await step('view modes: half page, two pages, look-ahead, continuous', async () => {
  await chooseMode('Media página');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1200);
  await page.getByTestId('half-page-stand').waitFor();
  await page.screenshot({ path: `${shots}/05-media-pagina.png` });
  await chooseMode('Dos páginas');
  await page.getByTestId('two-page').waitFor();
  await chooseMode('Vertical con anticipación');
  await page.getByTestId('lookahead').waitFor();
  await chooseMode('Vertical continuo');
  await page.getByTestId('continuous').waitFor();
  await pinch(640, 430, 80, 300);
  await page.waitForTimeout(800);
  if ((await zoomOf()).scale < 2) throw new Error('continuous mode pinch');
  await page.getByTestId('zoom-reset').click();
  await page.waitForTimeout(300);
  await chooseMode('Página a página con animación');
});

await step('zoom: Ctrl + wheel, keys, pinch with two fingers, then turning resets it', async () => {
  await page.keyboard.press('Home');
  await page.waitForTimeout(800);
  await page.mouse.move(500, 250);
  await page.keyboard.down('Control');
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await page.waitForTimeout(600);
  if ((await zoomOf()).scale < 1.9) throw new Error(`ctrl+wheel: ${JSON.stringify(await zoomOf())}`);
  // While zoomed the wheel moves the page instead of turning it.
  const y0 = (await zoomOf()).y;
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(400);
  if ((await zoomOf()).y >= y0) throw new Error('wheel did not move the zoomed page');
  await showBars();
  if ((await indicator()) !== 'Página 1 de 6') throw new Error(`the wheel turned: ${await indicator()}`);
  await page.screenshot({ path: `${shots}/04b-zoom.png` });
  await page.getByTestId('zoom-reset').click();
  await page.waitForTimeout(400);
  if ((await zoomOf()).scale !== 1) throw new Error('reset');
  await page.keyboard.press('Control+Equal');
  await page.waitForTimeout(300);
  if ((await zoomOf()).scale !== 1.25) throw new Error('ctrl +');
  await page.keyboard.press('Control+Digit0');
  await page.waitForTimeout(300);
  await pinch(640, 430, 80, 360);
  await page.waitForTimeout(900);
  const z = await zoomOf();
  if (z.scale < 2.5) throw new Error(`pinch: ${JSON.stringify(z)}`);
  if (z.y <= 0) throw new Error(`one finger did not move the page: ${JSON.stringify(z)}`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800);
  if ((await zoomOf()).scale !== 1) throw new Error('turning did not reset the zoom');
  await page.keyboard.press('Home');
  await page.waitForTimeout(600);
});

await step('annotations are saved: reopening shows them', async () => {
  await backToLibrary();
  await page.locator('[data-testid^="doc-"]').first().click();
  await page.getByTestId('reader').waitFor();
  await page.keyboard.press('Home');
  await page.waitForTimeout(1200);
  await page.getByText('Respirar aquí', { exact: true }).waitFor();
  await backToLibrary();
});

await step('concert folder: create, add pieces, reorder, play in a row', async () => {
  await importFile('test-fixtures/piano-prueba.pdf');
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await backToLibrary();
  await page.getByTestId('new-folder').click();
  await page.getByTestId('dialog-input').fill('Concierto de Navidad');
  await page.getByTestId('dialog-ok').click();
  await page.getByText('Concierto de Navidad', { exact: true }).click();
  await page.getByTestId('folder-title').waitFor();
  await page.getByTestId('add-pieces').click();
  await page.getByTestId('pick-documents').waitFor();
  await page.getByText('partitura-prueba', { exact: true }).last().click();
  await page.getByText('piano-prueba', { exact: true }).last().click();
  await page.getByTestId('pick-confirm').click();
  await page.getByTestId('piece-2').waitFor();
  await page.getByTestId('reorder').click();
  await page.getByTestId('down-1').click();
  await page.waitForTimeout(500);
  const first = await page.getByTestId('piece-1').textContent();
  if (!first?.includes('piano-prueba')) throw new Error(`reorder failed: ${first}`);
  await page.getByTestId('reorder').click();
  await page.screenshot({ path: `${shots}/06-concierto.png` });
  await page.getByTestId('start-concert').click();
  await page.getByTestId('reader').waitFor();
  await page.waitForTimeout(1200);
  await showBars();
  const piece = await page.getByTestId('piece-indicator').textContent();
  if (piece !== 'Obra 1 de 2') throw new Error(`unexpected ${piece}`);
  // Last page of the first piece, then "next": the next piece opens at its first page.
  await page.keyboard.press('End');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/07-siguiente-obra.png` });
  await showBars();
  const piece2 = await page.getByTestId('piece-indicator').textContent();
  if (piece2 !== 'Obra 2 de 2') throw new Error(`unexpected ${piece2}`);
  if ((await indicator()) !== 'Página 1 de 6') throw new Error(`unexpected ${await indicator()}`);
  // Going back from the first page returns to the last page of the previous piece.
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(1500);
  await showBars();
  if ((await page.getByTestId('piece-indicator').textContent()) !== 'Obra 1 de 2')
    throw new Error('previous piece');
  if ((await indicator()) !== 'Página 3 de 3') throw new Error(`unexpected ${await indicator()}`);
  await page.getByTestId('reader-back').click();
  await page.getByTestId('folder-title').waitFor();
  await page.getByTestId('folder-back').click();
  await page.getByTestId('import-button').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/08-inicio-con-carpeta.png` });
});

/** Press and hold on an element, then move the mouse to (x, y) and release. */
async function holdAndDrag(box, x, y) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 - 8, { steps: 3 });
  await page.mouse.move(x, y, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(700);
}

await step('drag pieces from home onto a folder, then reorder them by dragging', async () => {
  await page.getByTestId('new-folder').click();
  await page.getByTestId('dialog-input').fill('Ensayo');
  await page.getByTestId('dialog-ok').click();
  const folder = page.getByRole('button', { name: /^Ensayo,/ });
  await folder.waitFor();
  await page.waitForTimeout(600);
  for (const title of ['partitura-prueba', 'piano-prueba']) {
    const card = page.getByRole('button', { name: new RegExp(`^${title},`) }).first();
    const fb = await folder.boundingBox();
    await holdAndDrag(await card.boundingBox(), fb.x + fb.width / 2, fb.y + fb.height / 2);
    const toast = await page.getByTestId('toast').textContent();
    if (toast !== 'Añadido a «Ensayo»') throw new Error(`drop: ${toast}`);
    if (await page.getByTestId('reader').count()) throw new Error('the drop opened the document');
  }
  await page.screenshot({ path: `${shots}/08b-arrastrar-a-carpeta.png` });
  if (!(await folder.textContent())?.includes('2 obras')) throw new Error(await folder.textContent());
  await folder.click();
  await page.getByTestId('folder-title').waitFor();
  const firstTitle = (await page.getByTestId('piece-1').textContent())?.includes('partitura-prueba')
    ? 'partitura-prueba'
    : 'piano-prueba';
  await page.getByTestId('reorder').click();
  await page.waitForTimeout(300);
  const row = await page.getByTestId('piece-row-1').boundingBox();
  await page.mouse.move(row.x + 200, row.y + row.height / 2);
  await page.mouse.down();
  await page.mouse.move(row.x + 200, row.y + row.height / 2 + 30, { steps: 4 });
  await page.mouse.move(row.x + 200, row.y + row.height * 1.6, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await page.getByTestId('piece-2').textContent();
  if (!after?.includes(firstTitle)) throw new Error(`drag reorder: ${firstTitle} is not second (${after})`);
  await page.getByTestId('reorder').click();
  await page.getByTestId('folder-back').click();
  await page.getByTestId('import-button').waitFor();
});

await step('settings, pedal test and about', async () => {
  await page.getByTestId('open-settings').click();
  await page.getByTestId('open-pedal').waitFor();
  await page.getByTestId('open-pedal').click();
  await page.getByTestId('key-test').waitFor();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(200);
  if ((await page.getByTestId('last-key').textContent())?.trim() !== 'PageDown') throw new Error('key test');
  await page.getByTestId('header-back').last().click();
  await page.getByTestId('open-about').click();
  await page.getByTestId('about-author').waitFor();
  if (!(await page.getByTestId('about-author').textContent())?.includes('Marcos Hernández Párraga'))
    throw new Error('author');
  await page.screenshot({ path: `${shots}/09-acerca-de.png` });
});

await step('password-protected PDF asks for the password', async () => {
  await page.goto(base);
  await page.getByTestId('import-button').waitFor();
  await importFile('test-fixtures/protegido-prueba.pdf');
  await page.getByTestId('dialog-input').waitFor({ timeout: 20000 });
  await page.getByTestId('dialog-input').fill('mala');
  await page.getByTestId('dialog-ok').click();
  await page.getByText('La contraseña no es correcta', { exact: false }).waitFor({ timeout: 20000 });
  await page.getByTestId('dialog-input').fill('atril');
  await page.getByTestId('dialog-ok').click();
  await page.getByTestId('reader').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  await showBars();
  if ((await indicator()) !== 'Página 1 de 2') throw new Error(`unexpected ${await indicator()}`);
});

await browser.close();
const relevant = errors.filter((e) => !/favicon|DevTools/.test(e));
if (relevant.length) console.log('Console errors:\n' + relevant.join('\n'));
console.log('ALL OK');
