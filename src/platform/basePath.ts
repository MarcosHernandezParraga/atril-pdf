// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Folder where the web version is published: '' at the root of a site (the
// desktop app), '/atril-pdf' on GitHub Pages. Set when building with
// EXPO_PUBLIC_BASE_PATH.

export const BASE_PATH = (process.env.EXPO_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/** URL of a file shipped with the app (e.g. '/vendor/pdfjs/pdf.min.mjs'). */
export function assetUrl(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
