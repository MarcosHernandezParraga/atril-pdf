// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web/desktop entry: Skia (CanvasKit) must be loaded before any component that
// draws with it. The WebAssembly file ships with the app (public/vendor).
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

LoadSkiaWeb({ locateFile: (file: string) => `/vendor/canvaskit/${file}` })
  .catch((e: unknown) => console.error('Skia could not be loaded', e))
  .finally(() => renderRootComponent(App));
