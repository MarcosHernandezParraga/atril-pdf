// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface NativeKeyEvent {
  key: string;
  repeat: boolean;
  time: number;
}

export interface NativeOpenResult {
  handle: string;
  pageCount: number;
  /** Flat list: width0, height0, width1, height1... in points. */
  sizes: number[];
}

export interface NativeOutlineItem {
  title: string;
  pageIndex: number | null;
  children: NativeOutlineItem[];
}

export interface AtrilNativeModuleType {
  platform: 'android' | 'ios';
  sdkInt: number;
  canSearch: boolean;
  canOpenProtected: boolean;
  canReadOutline: boolean;
  supportsVolumeKeys: boolean;
  openDocument(path: string, password: string | null): Promise<NativeOpenResult>;
  renderPage(handle: string, pageIndex: number, widthPx: number): Promise<{ uri: string; width: number; height: number }>;
  /** Bytes 0-3: width, 4-7: height (little endian), then one gray byte per pixel. */
  renderPageGray(handle: string, pageIndex: number, widthPx: number): Promise<Uint8Array>;
  searchText(handle: string, query: string): Promise<{ pageIndex: number; count: number }[] | null>;
  getOutline(handle: string): Promise<NativeOutlineItem[]>;
  closeDocument(handle: string): Promise<void>;
  setKeyCapture(enabled: boolean, keys: string[], captureAll: boolean): void;
  addListener(event: 'onKey', cb: (e: NativeKeyEvent) => void): EventSubscription;
}

/** Null on web/desktop, where pdf.js and DOM keyboard events are used instead. */
export const AtrilNative = requireOptionalNativeModule<AtrilNativeModuleType>('AtrilNative');
