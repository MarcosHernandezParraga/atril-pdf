// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web version and desktop app: drawing text notes with the system fonts,
// converting images, and handing the finished PDF to the person: the system
// "Share" sheet (iPhone, iPad, Android, Windows and Mac browsers that have it),
// a download, or a "Save as" window in the desktop app.

import type { TextAnnotation } from '../core/model';
import { getDesktopBridge } from '../platform/desktopBridge';
import type { RasterText } from './buildPdf';

/** "send": the system share sheet (mail, messages, AirDrop, Drive…); "save": a file on this device. */
export type ShareTarget = 'send' | 'save';

const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Noto Sans Arabic", "Noto Sans CJK SC", sans-serif';

export async function rasterizeText(ann: TextAnnotation, pixelsPerPoint: number): Promise<RasterText | null> {
  if (typeof document === 'undefined') return null;
  const lines = ann.text.split('\n');
  const size = ann.fontSize * pixelsPerPoint;
  const lineHeight = size * 1.3;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = `${ann.bold ? 700 : 400} ${size}px ${FONT_STACK}`;
  ctx.font = font;
  const width = Math.ceil(Math.max(1, ...lines.map((l) => ctx.measureText(l).width)) + size * 0.1);
  const height = Math.ceil(lines.length * lineHeight);
  if (width * height > 40_000_000) return null;
  canvas.width = width;
  canvas.height = height;
  ctx.font = font;
  ctx.fillStyle = ann.color;
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, 0, i * lineHeight + lineHeight / 2));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;
  return {
    png: new Uint8Array(await blob.arrayBuffer()),
    width: width / pixelsPerPoint,
    height: height / pixelsPerPoint,
  };
}

export async function toPng(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Bytes of a page image drawn by the app (a blob: address here). */
export async function bytesOfUri(uri: string): Promise<Uint8Array> {
  return new Uint8Array(await (await fetch(uri)).arrayBuffer());
}

function canShareFiles(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
    const probe = new File([new Uint8Array([37])], 'x.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Browsers only open the share sheet, and reliably download a file, right
 * after a tap: when the PDF is ready, the person taps "Send" or "Save".
 */
export function deliveryNeedsTap(): boolean {
  return !getDesktopBridge();
}

/** What can be done with the PDF on this device, in the order shown. */
export function shareTargets(): ShareTarget[] {
  if (getDesktopBridge()) return ['save'];
  return canShareFiles() ? ['send', 'save'] : ['save'];
}

/**
 * Hands the PDF to the person. Must be called right after a tap (browsers only
 * open the share sheet in answer to one). Resolves to false if they cancel.
 */
export async function deliver(bytes: Uint8Array, fileName: string, target: ShareTarget): Promise<boolean> {
  const bridge = getDesktopBridge();
  if (bridge) {
    const path = await bridge.dialogs.saveFile({
      defaultName: fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      data: bytes,
    });
    return path !== null;
  }
  if (target === 'send') {
    const file = new File([bytes as BlobPart], fileName, { type: 'application/pdf' });
    try {
      await navigator.share({ files: [file], title: fileName.replace(/\.pdf$/i, '') });
      return true;
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return false;
      throw e;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
