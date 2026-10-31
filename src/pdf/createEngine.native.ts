// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import type { StorageAdapter } from '../storage/types';
import { createNativeEngine } from './nativeEngine';
import type { PdfEngine } from './types';

export function createPdfEngine(storage: StorageAdapter): PdfEngine {
  return createNativeEngine(storage);
}
