// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Copies the runtime files that the web/desktop build loads locally (no CDN):
//  - pdf.js library, worker, character maps, standard fonts and decoders
//  - CanvasKit (Skia for web) WebAssembly binary
//  - sql.js (SQLite for the web version)
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'vendor');

function copy(from, to) {
  const src = join(nm, from);
  if (!existsSync(src)) {
    console.warn(`[copy-vendor] missing ${from} (skipped)`);
    return;
  }
  const dest = join(out, to);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

copy('pdfjs-dist/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs');
copy('pdfjs-dist/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs');
copy('pdfjs-dist/cmaps', 'pdfjs/cmaps');
copy('pdfjs-dist/standard_fonts', 'pdfjs/standard_fonts');
copy('pdfjs-dist/wasm', 'pdfjs/wasm');
copy('pdfjs-dist/iccs', 'pdfjs/iccs');
copy('canvaskit-wasm/bin/full/canvaskit.wasm', 'canvaskit/canvaskit.wasm');
copy('sql.js/dist/sql-wasm-browser.js', 'sqljs/sql-wasm-browser.js');
copy('sql.js/dist/sql-wasm-browser.wasm', 'sqljs/sql-wasm-browser.wasm');

console.log('[copy-vendor] vendor files ready in public/vendor');
