// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Performance (full screen) mode on iOS and Android: hides the status bar and
// the Android navigation bar (immersive) and keeps the screen awake.

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const TAG = 'atril-performance';

export function PerformanceChrome({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    void activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(TAG).catch(() => undefined);
    };
  }, [active]);
  return (
    <>
      <StatusBar hidden={active} animated />
      {Platform.OS === 'android' ? <NavigationBar hidden={active} /> : null}
    </>
  );
}

export function useDesktopFullscreenSync(_onChange: (on: boolean) => void) {
  // Only meaningful on desktop.
}
