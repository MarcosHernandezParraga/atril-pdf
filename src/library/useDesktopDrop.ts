// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop: dragging files from the system file manager onto the window imports them.

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { getDesktopBridge } from '../platform/desktopBridge';
import type { ExternalFile } from '../storage/types';
import { fileKind } from './importer';

export function useDesktopDrop(onFiles: (files: ExternalFile[]) => void): boolean {
  const [active, setActive] = useState(false);
  const cb = useRef(onFiles);
  cb.current = onFiles;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setActive(true);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setActive(false);
      const bridge = getDesktopBridge();
      const files: ExternalFile[] = [];
      for (const f of [...(e.dataTransfer?.files ?? [])]) {
        if (!fileKind(f.name, f.type)) continue;
        if (bridge) {
          const picked = await bridge.files.registerDropped(f);
          if (picked) files.push({ kind: 'path', path: picked.path, name: picked.name, size: picked.size });
        } else {
          files.push({ kind: 'blob', blob: f, name: f.name });
        }
      }
      if (files.length > 0) cb.current(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  return active;
}
