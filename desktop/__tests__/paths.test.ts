// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { libraryPath } from '../src/safePath';

jest.mock('electron', () => ({ net: {}, protocol: {} }), { virtual: true });
// eslint-disable-next-line import/first
import { resolveWebPath } from '../src/protocol';

describe('library paths (desktop)', () => {
  const root = '/data/library';
  it('accepts relative paths inside the library', () => {
    expect(libraryPath(root, 'sources/a.pdf')).toBe('/data/library/sources/a.pdf');
  });
  it.each(['../x', 'sources/../../x', '/etc/passwd', 'C:/Windows/x', '', 'a\0b'])('refuses %p', (p) => {
    expect(() => libraryPath(root, p)).toThrow();
  });
});

describe('app:// protocol paths', () => {
  const web = mkdtempSync(join(tmpdir(), 'atril-web-'));
  writeFileSync(join(web, 'index.html'), '<html></html>');
  mkdirSync(join(web, 'assets', '__nm', 'icons'), { recursive: true });
  writeFileSync(join(web, 'assets', '__nm', 'icons', 'font.ttf'), 'x');

  it('serves existing files and falls back to index.html for routes', () => {
    expect(resolveWebPath(web, '/index.html')).toBe(join(web, 'index.html'));
    expect(resolveWebPath(web, '/reader/123')).toBe(join(web, 'index.html'));
  });
  it('maps library assets to their renamed folder', () => {
    expect(resolveWebPath(web, '/assets/node_modules/icons/font.ttf')).toBe(
      join(web, 'assets', '__nm', 'icons', 'font.ttf'),
    );
  });
  it('never escapes the web root', () => {
    expect(resolveWebPath(web, '/../../etc/passwd')).toBe(join(web, 'index.html'));
    expect(resolveWebPath(web, '/%2e%2e/%2e%2e/etc/passwd')).toBe(join(web, 'index.html'));
  });
});
