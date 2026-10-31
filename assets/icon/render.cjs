// Renders the app icons from symbol.svg (run: node assets/icon/render.cjs, needs Playwright).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const svg = fs.readFileSync(path.join(__dirname, 'symbol.svg'), 'utf8').replace(/<!--[\s\S]*?-->/, '');
const out = path.join(__dirname, '..', 'images');
const variants = [
  // full icon: warm gradient background with the symbol
  { file: 'icon.png', size: 1024, bg: 'linear-gradient(160deg,#9A5A28 0%,#6B3714 100%)', scale: 0.86, radius: 0 },
  { file: 'favicon.png', size: 196, bg: 'linear-gradient(160deg,#9A5A28 0%,#6B3714 100%)', scale: 0.9, radius: 40 },
  // Android adaptive icon layers (safe zone: central 66%)
  { file: 'android-icon-foreground.png', size: 1024, bg: 'transparent', scale: 0.62, radius: 0 },
  { file: 'android-icon-background.png', size: 1024, bg: 'linear-gradient(160deg,#9A5A28 0%,#6B3714 100%)', scale: 0, radius: 0 },
  { file: 'android-icon-monochrome.png', size: 1024, bg: 'transparent', scale: 0.62, radius: 0, mono: true },
  { file: 'splash-icon.png', size: 1024, bg: 'transparent', scale: 0.9, radius: 0, splash: true },
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const v of variants) {
    let s = svg;
    if (v.mono) s = s.replace(/#FFF8EE|#3A2312|#8A4B1C/g, '#FFFFFF');
    if (v.splash) s = s.replace(/stroke="#FFFFFF"/, 'stroke="#8A4B1C"');
    const inner = v.scale > 0 ? `<div style="width:${v.size * v.scale}px;height:${v.size * v.scale}px">${s}</div>` : '';
    await page.setViewportSize({ width: v.size, height: v.size });
    await page.setContent(`<html><body style="margin:0;background:transparent"><div id="c" style="width:${v.size}px;height:${v.size}px;display:flex;align-items:center;justify-content:center;background:${v.bg};border-radius:${v.radius}px">${inner}</div><style>svg{width:100%;height:100%}</style></body></html>`);
    await page.locator('#c').screenshot({ path: path.join(out, v.file), omitBackground: true });
    console.log('wrote', v.file);
  }
  await browser.close();
})();
