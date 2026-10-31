// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Desktop / web keyboard source (Bluetooth pedals are keyboards too).

import { normalizeKey, type RawKeyEvent } from '../core/keymap';

export interface KeyCaptureOptions {
  /** Keys whose default browser behaviour must be prevented. */
  consumed: string[];
  /** Learn/test mode: report and consume every key. */
  captureAll: boolean;
}

export type KeyHandler = (ev: RawKeyEvent) => void;

function isTextTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

export function keyNameFromDom(e: KeyboardEvent): string {
  if (e.key === ' ' || e.code === 'Space') return 'Space';
  if (e.key === 'Unidentified' && e.code) return e.code;
  return normalizeKey(e.key);
}

export const supportsVolumeKeys = false;

export function subscribeKeys(handler: KeyHandler, opts: KeyCaptureOptions): () => void {
  const consumed = new Set(opts.consumed);
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = keyNameFromDom(e);
    if (opts.captureAll || consumed.has(key)) e.preventDefault();
    handler({ key, repeat: e.repeat, time: performance.now() });
  };
  window.addEventListener('keydown', onKeyDown, true);
  // Media keys (some pedals send "next track"): handled through the Media Session API when available.
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
  const mediaActions: [MediaSessionAction, string][] = [
    ['nexttrack', 'MediaTrackNext'],
    ['previoustrack', 'MediaTrackPrevious'],
  ];
  if (ms) {
    for (const [action, key] of mediaActions) {
      try {
        ms.setActionHandler(action, () => handler({ key, repeat: false, time: performance.now() }));
      } catch {
        // not supported
      }
    }
  }
  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    if (ms) {
      for (const [action] of mediaActions) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // not supported
        }
      }
    }
  };
}
