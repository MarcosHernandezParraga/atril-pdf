// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { isAbsolute, join, normalize, sep } from 'node:path';

/**
 * Resolves a path relative to the library directory, refusing anything that
 * would escape it (absolute paths, "..", empty paths).
 */
export function libraryPath(root: string, rel: string): string {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0')) throw new Error('Invalid path');
  const cleaned = rel.replace(/\\/g, '/');
  if (isAbsolute(cleaned) || /^[a-zA-Z]:/.test(cleaned)) throw new Error('Invalid path');
  const full = normalize(join(root, cleaned));
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (!full.startsWith(rootWithSep)) throw new Error('Invalid path');
  return full;
}
