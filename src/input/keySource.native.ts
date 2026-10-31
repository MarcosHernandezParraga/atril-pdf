// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// iOS / Android hardware key source, captured natively by modules/atril-native
// (React Native does not report physical keyboard keys by itself).

import { AtrilNative } from '../../modules/atril-native';
import { normalizeKey } from '../core/keymap';
import type { KeyCaptureOptions, KeyHandler } from './keySource';

export type { KeyCaptureOptions, KeyHandler } from './keySource';

export const supportsVolumeKeys = AtrilNative?.supportsVolumeKeys ?? false;

let active = 0;

export function subscribeKeys(handler: KeyHandler, opts: KeyCaptureOptions): () => void {
  const native = AtrilNative;
  if (!native) return () => undefined;
  active++;
  native.setKeyCapture(true, opts.consumed, opts.captureAll);
  const sub = native.addListener('onKey', (e) => handler({ key: normalizeKey(e.key), repeat: e.repeat, time: e.time }));
  return () => {
    sub.remove();
    active = Math.max(0, active - 1);
    if (active === 0) native.setKeyCapture(false, [], false);
  };
}

export function keyNameFromDom(): string {
  return '';
}
