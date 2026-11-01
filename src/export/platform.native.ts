// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Android and iPhone/iPad app: drawing text notes with the system fonts (Skia),
// converting images, and handing the finished PDF to the person: the system
// share sheet (mail, WhatsApp, Drive, "Save to Files"…) or, on Android, a
// folder chosen on the device.

import { ImageFormat, Skia } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { TextAnnotation } from '../core/model';
import type { RasterText } from './buildPdf';

export type ShareTarget = 'send' | 'save';

export async function rasterizeText(ann: TextAnnotation, pixelsPerPoint: number): Promise<RasterText | null> {
  try {
    const size = ann.fontSize * pixelsPerPoint;
    // Without a font provider, the paragraph uses the system fonts (every language).
    const builder = Skia.ParagraphBuilder.Make();
    builder.pushStyle({
      color: Skia.Color(ann.color),
      fontSize: size,
      fontStyle: { weight: ann.bold ? 700 : 400 },
      heightMultiplier: 1.3,
    });
    builder.addText(ann.text);
    builder.pop();
    const paragraph = builder.build();
    paragraph.layout(1_000_000);
    const width = Math.ceil(paragraph.getLongestLine() + size * 0.1);
    const height = Math.ceil(paragraph.getHeight());
    if (width <= 0 || height <= 0 || width * height > 40_000_000) return null;
    const surface = Skia.Surface.MakeOffscreen(width, height) ?? Skia.Surface.Make(width, height);
    if (!surface) return null;
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    paragraph.paint(canvas, 0, 0);
    surface.flush();
    const png = surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG);
    return { png, width: width / pixelsPerPoint, height: height / pixelsPerPoint };
  } catch {
    return null;
  }
}

export async function toPng(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const image = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));
    return image ? image.encodeToBytes(ImageFormat.PNG) : null;
  } catch {
    return null;
  }
}

/** Bytes of a page image drawn by the app (a file:// address here). */
export async function bytesOfUri(uri: string): Promise<Uint8Array> {
  return new File(uri).bytes();
}

/** The app can open the share sheet at any moment. */
export function deliveryNeedsTap(): boolean {
  return false;
}

/** What can be done with the PDF on this device, in the order shown. */
export function shareTargets(): ShareTarget[] {
  // On iPhone and iPad the share sheet already has "Save to Files".
  return Platform.OS === 'android' ? ['send', 'save'] : ['send'];
}

export async function deliver(bytes: Uint8Array, fileName: string, target: ShareTarget): Promise<boolean> {
  if (target === 'save' && Platform.OS === 'android') {
    let folder: Directory;
    try {
      folder = await Directory.pickDirectoryAsync();
    } catch {
      return false;
    }
    const file = folder.createFile(fileName, 'application/pdf');
    await file.write(bytes);
    return true;
  }
  const dir = new Directory(Paths.cache, 'compartir');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, fileName);
  if (file.exists) file.delete();
  file.create({ intermediates: true, overwrite: true });
  await file.write(bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: fileName.replace(/\.pdf$/i, ''),
  });
  return true;
}
