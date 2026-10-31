// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// A PDF opened from another app arrives as a content:// or file:// URL. It is
// not a screen of the app: keep it for the importer and show the library.
import { isIncomingFileUrl, pushIncomingUrl } from '../library/incoming';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (isIncomingFileUrl(path)) {
    pushIncomingUrl(path);
    return '/';
  }
  return path;
}
