// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Connects the keyboard / pedal to the reader actions, with the user's key
// map and the anti-bounce filter. The capture stays active for as long as the
// reader is mounted, whatever menus or panels are opened and closed.

import { useEffect, useEffectEvent } from 'react';

import {
  actionForKey,
  consumedKeys,
  effectiveKeymap,
  KeyFilter,
  type KeyAction,
  type RawKeyEvent,
} from '../core/keymap';
import { useSettings } from '../settings/store';
import { subscribeKeys } from './keySource';

export function useReaderKeys(onAction: (action: KeyAction) => void, enabled = true): void {
  const pedal = useSettings((s) => s.settings.pedal);
  const dispatch = useEffectEvent((action: KeyAction) => onAction(action));

  useEffect(() => {
    if (!enabled) return;
    const map = effectiveKeymap(pedal.keymap, { volumeKeys: pedal.volumeKeys });
    const filter = new KeyFilter(pedal.debounceMs);
    const unsubscribe = subscribeKeys(
      (ev: RawKeyEvent) => {
        const action = actionForKey(map, ev.key);
        if (action && filter.accept(action, ev)) dispatch(action);
      },
      { consumed: consumedKeys(map), captureAll: false },
    );
    return unsubscribe;
  }, [enabled, pedal]);
}

/** Learn / test mode: reports every key received. */
export function useRawKeys(onKey: (ev: RawKeyEvent) => void, enabled = true): void {
  const report = useEffectEvent((ev: RawKeyEvent) => onKey(ev));
  useEffect(() => {
    if (!enabled) return;
    return subscribeKeys((ev) => report(ev), { consumed: [], captureAll: true });
  }, [enabled]);
}
