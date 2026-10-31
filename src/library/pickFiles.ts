// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { getDesktopBridge } from '../platform/desktopBridge';
import type { ExternalFile } from '../storage/types';
import { IMAGE_EXTENSIONS, PDF_EXTENSIONS } from './importer';

export async function pickFiles(): Promise<ExternalFile[]> {
  const bridge = getDesktopBridge();
  if (bridge) {
    const files = await bridge.dialogs.openFiles({
      multiple: true,
      filters: [
        { name: 'PDF', extensions: PDF_EXTENSIONS },
        { name: 'Images', extensions: IMAGE_EXTENSIONS },
      ],
    });
    return files.map((f) => ({ kind: 'path', path: f.path, name: f.name, size: f.size }));
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'application/pdf,image/*';
    input.style.display = 'none';
    const done = (files: ExternalFile[]) => {
      input.remove();
      resolve(files);
    };
    input.onchange = () =>
      done([...(input.files ?? [])].map((f) => ({ kind: 'blob', blob: f, name: f.name })));
    input.addEventListener('cancel', () => done([]));
    document.body.appendChild(input);
    input.click();
  });
}
