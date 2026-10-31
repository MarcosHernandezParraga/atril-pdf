// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Files received from other apps ("Open with", share) waiting to be imported.

import type { ExternalFile } from '../storage/types';

type Listener = () => void;

const queue: ExternalFile[] = [];
const listeners = new Set<Listener>();

export function isIncomingFileUrl(url: string): boolean {
  return /^(content|file):\/\//i.test(url);
}

function nameFromUrl(url: string): string {
  try {
    const last = decodeURIComponent(url.split(/[?#]/)[0]!.split('/').pop() ?? '');
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last;
  } catch {
    // ignore malformed URLs
  }
  return 'documento.pdf';
}

export function pushIncomingUrl(url: string): void {
  queue.push({ kind: 'uri', uri: url, name: nameFromUrl(url), mimeType: 'application/pdf' });
  listeners.forEach((l) => l());
}

export function takeIncoming(): ExternalFile[] {
  return queue.splice(0, queue.length);
}

export function onIncoming(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
