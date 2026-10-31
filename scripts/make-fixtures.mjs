// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Generates the test scores in test-fixtures/ (original content, free of rights):
//  - partitura-prueba.pdf: 6 A4 pages with title, systems of staves and notes.
//  - piano-prueba.pdf: 3 pages of grand-staff (piano) systems.
//  - protegido-prueba.pdf: 2 pages, protected with the password "atril".
import { PDFDocument, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'test-fixtures');
mkdirSync(out, { recursive: true });

const A4 = [595.28, 841.89];
const black = rgb(0.08, 0.08, 0.08);

function staff(page, x0, x1, yTop, spacing) {
  for (let i = 0; i < 5; i++) {
    const y = yTop - i * spacing;
    page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 0.7, color: black });
  }
  // bar lines
  const bars = 4;
  for (let b = 0; b <= bars; b++) {
    const x = x0 + ((x1 - x0) * b) / bars;
    page.drawLine({
      start: { x, y: yTop },
      end: { x, y: yTop - 4 * spacing },
      thickness: b === bars ? 1.6 : 0.8,
      color: black,
    });
  }
}

function notes(page, x0, x1, yTop, spacing, seed) {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let x = x0 + 18; x < x1 - 10; x += 22) {
    const step = Math.floor(rand() * 9) - 1;
    const y = yTop - 4 * spacing + step * (spacing / 2);
    page.drawEllipse({
      x,
      y,
      xScale: spacing * 0.62,
      yScale: spacing * 0.45,
      color: black,
      rotate: { type: 'degrees', angle: -20 },
    });
    const up = y < yTop - 2 * spacing;
    page.drawLine({
      start: { x: up ? x + spacing * 0.58 : x - spacing * 0.58, y },
      end: { x: up ? x + spacing * 0.58 : x - spacing * 0.58, y: up ? y + spacing * 3.4 : y - spacing * 3.4 },
      thickness: 0.9,
      color: black,
    });
  }
}

async function score(file, pages, piano, password) {
  const doc = await PDFDocument.create();
  doc.setTitle(piano ? 'Piano de prueba' : 'Partitura de prueba');
  doc.setAuthor('Marcos Hernández Párraga');
  doc.setCreator('Atril PDF test fixtures');
  doc.setProducer('Atril PDF');
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage(A4);
    const [w, h] = A4;
    let y = h - 70;
    if (p === 0) {
      const title = piano ? 'Estudio para piano' : 'Melodía de prueba';
      page.drawText(title, {
        x: w / 2 - bold.widthOfTextAtSize(title, 22) / 2,
        y: h - 70,
        size: 22,
        font: bold,
      });
      page.drawText('M. H. P.', { x: w - 110, y: h - 100, size: 11, font });
      y = h - 140;
    }
    const spacing = 6.2;
    const systemGap = piano ? 46 : 40;
    let i = 0;
    while (y > 90) {
      staff(page, 50, w - 45, y, spacing);
      notes(page, 50, w - 45, y, spacing, p * 100 + i * 7 + 1);
      if (piano) {
        const y2 = y - 4 * spacing - 34;
        staff(page, 50, w - 45, y2, spacing);
        notes(page, 50, w - 45, y2, spacing, p * 100 + i * 7 + 3);
        page.drawLine({
          start: { x: 50, y },
          end: { x: 50, y: y2 - 4 * spacing },
          thickness: 1.2,
          color: black,
        });
        y = y2 - 4 * spacing - systemGap;
      } else {
        y -= 4 * spacing + systemGap;
      }
      i++;
    }
    page.drawText(String(p + 1), { x: w / 2 - 4, y: 40, size: 10, font });
  }
  if (password) doc.encrypt({ userPassword: password, ownerPassword: `${password}-owner` });
  const bytes = await doc.save();
  writeFileSync(join(out, file), bytes);
  console.log(`[fixtures] ${file}: ${pages} pages, ${bytes.length} bytes`);
}

await score('partitura-prueba.pdf', 6, false);
await score('piano-prueba.pdf', 3, true);
// Password protected (password: atril)
await score('protegido-prueba.pdf', 2, false, 'atril');
