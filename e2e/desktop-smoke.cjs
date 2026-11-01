// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
// Desktop smoke test: launches the Electron app with a PDF as argument ("Open with"),
// checks it is imported and opened, turns pages with the keyboard and goes full screen.
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

(async () => {
  const shots = process.argv[2] || 'e2e-shots';
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'atril-e2e-'));
  // ATRIL_EXECUTABLE: test another build of the app. Published builds cannot be driven by
  // this test on purpose: their "fuses" switch off the debugging hooks it needs.
  const packaged = process.env.ATRIL_EXECUTABLE;
  const app = await electron.launch({
    executablePath: packaged || require('electron'),
    args: [
      '--no-sandbox',
      `--user-data-dir=${userData}`,
      ...(packaged ? [] : [path.resolve('desktop/app')]),
      path.resolve('test-fixtures/piano-prueba.pdf'),
    ],
  });
  const win = await app.firstWindow();
  const logs = [];
  win.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  win.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  await win.setViewportSize?.({ width: 1280, height: 860 });
  const bridge = await win.evaluate(
    () => typeof window.atrilDesktop === 'object' && Object.keys(window.atrilDesktop),
  );
  console.log('bridge:', bridge);
  const node = await win.evaluate(() => typeof require);
  console.log('require in page:', node);
  await win.getByTestId('reader').waitFor({ timeout: 30000 });
  await win.waitForTimeout(1500);
  const indicator = async () => (await win.getByTestId('page-indicator').textContent())?.trim();
  console.log('opened:', await indicator());
  await win.screenshot({ path: `${shots}/d1-escritorio-lector.png` });
  await win.keyboard.press('PageDown');
  await win.waitForTimeout(300);
  await win.getByTestId('reader').click({ position: { x: 600, y: 400 } });
  await win.waitForTimeout(400);
  console.log('after PageDown:', await indicator());
  // Network must be blocked (offline app).
  const net = await win.evaluate(() =>
    fetch('https://example.com').then(
      () => 'reachable',
      () => 'blocked',
    ),
  );
  console.log('network:', net);
  await win.keyboard.press('F11');
  await win.waitForTimeout(800);
  const fs1 = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
  console.log('fullscreen after F11:', fs1);
  await win.screenshot({ path: `${shots}/d2-escritorio-pantalla-completa.png` });
  await win.keyboard.press('Escape');
  await win.waitForTimeout(800);
  const fs2 = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
  console.log('fullscreen after Esc:', fs2);
  const dbFile = path.join(userData, 'atril.db');
  console.log('database file exists:', fs.existsSync(dbFile));
  console.log(
    'library files:',
    fs.readdirSync(path.join(userData, 'library'), { recursive: true }).join(', '),
  );
  await app.close();
  const bad = logs.filter((l) => l.startsWith('error') || l.startsWith('pageerror'));
  if (bad.length) console.log('LOGS:\n' + bad.join('\n'));
})().catch((e) => {
  console.error('FAILED', e);
  process.exit(1);
});
