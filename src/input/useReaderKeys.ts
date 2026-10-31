// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Connects the keyboard / pedal to the reader actions, with the user's key
// map and the anti-bounce filter. The capture stays active for as long as the
// reader is mounted, whatever menus or panels are opened and closed.

import { useEffect, useRef } from 'react';

import { actionForKey, consumedKeys, effectiveKeymap, KeyFilter, type KeyAction, type RawKeyEvent } from '../core/keymap';
import { useSettings } from '../settings/store';
import { subscribeKeys } from './keySource';

export function useReaderKeys(onAction: (action: KeyAction) => void, enabled = true): void {
  const pedal = useSettings((s) => s.settings.pedal);
  const handlerRef = useRef(onAction);
  handlerRef.current = onAction;

  useEffect(() => {
    if (!enabled) return;
    const map = effectiveKeymap(pedal.keymap, { volumeKeys: pedal.volumeKeys });
    const filter = new KeyFilter(pedal.debounceMs);
    const unsubscribe = subscribeKeys(
      (ev: RawKeyEvent) => {
        const action = actionForKey(map, ev.key);
        if (action && filter.accept(action, ev)) handlerRef.current(action);
      },
      { consumed: consumedKeys(map), captureAll: false },
    );
    return unsubscribe;
  }, [enabled, pedal]);
}

/** Learn / test mode: reports every key received. */
export function useRawKeys(onKey: (ev: RawKeyEvent) => void, enabled = true): void {
  const ref = useRef(onKey);
  ref.current = onKey;
  useEffect(() => {
    if (!enabled) return;
    return subscribeKeys((ev) => ref.current(ev), { consumed: [], captureAll: true });
  }, [enabled]);
}
