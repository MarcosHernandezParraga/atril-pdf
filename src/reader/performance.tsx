// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Performance (full screen) mode on desktop: real full-screen window and the
// display is prevented from sleeping (Electron powerSaveBlocker).

import { useEffect, useEffectEvent } from 'react';

import { getDesktopBridge } from '../platform/desktopBridge';

export function PerformanceChrome({ active }: { active: boolean }) {
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      void bridge.window.setFullScreen(active);
      void bridge.power.keepScreenOn(active);
      return () => {
        if (active) {
          void bridge.window.setFullScreen(false);
          void bridge.power.keepScreenOn(false);
        }
      };
    }
    // Plain browser (development): Fullscreen API + Screen Wake Lock.
    let lock: { release(): Promise<void> } | null = null;
    if (active) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
      const wl = (navigator as unknown as { wakeLock?: { request(t: string): Promise<{ release(): Promise<void> }> } }).wakeLock;
      void wl?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    return () => {
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
  return null;
}

/** Keeps the reader in sync when the user leaves full screen with the window controls. */
export function useDesktopFullscreenSync(onChange: (on: boolean) => void) {
  const notify = useEffectEvent((on: boolean) => onChange(on));
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) return bridge.window.onFullScreenChange((on) => notify(on));
    const handler = () => notify(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
}
