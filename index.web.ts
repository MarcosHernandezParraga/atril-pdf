// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web/desktop entry: Skia (CanvasKit) must be loaded before any component that
// draws with it. The WebAssembly file ships with the app (public/vendor).
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { assetUrl } from './src/platform/basePath';

// Images and text inside the app must never start the browser's own "drag and
// drop" (it would cancel our gestures: dragging a piece onto a folder, turning or
// moving pages). Dropping PDF files from outside the app keeps working.
document.addEventListener('dragstart', (e) => e.preventDefault(), true);
const noDrag = document.createElement('style');
noDrag.textContent = 'img { -webkit-user-drag: none; user-select: none; }';
document.head.appendChild(noDrag);

LoadSkiaWeb({ locateFile: (file: string) => assetUrl(`/vendor/canvaskit/${file}`) })
  .catch((e: unknown) => console.error('Skia could not be loaded', e))
  .finally(() => renderRootComponent(App));
