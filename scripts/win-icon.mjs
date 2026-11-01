// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Sets the app icon and version information of a Windows executable without
// Wine (useful when packaging Windows builds from Linux). Usage:
//   node scripts/win-icon.mjs "desktop/release/win-unpacked/Atril PDF.exe"
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ResEdit from 'resedit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const identity = JSON.parse(readFileSync(join(root, 'src/config/identity.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const exePath = process.argv[2];
if (!exePath) {
  console.error('Usage: node scripts/win-icon.mjs <file.exe>');
  process.exit(1);
}

const exe = ResEdit.NtExecutable.from(readFileSync(exePath), { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(readFileSync(join(root, 'desktop/build-resources/icon.ico')));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const target = groups[0] ?? { id: 1, lang: 1033 };
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries,
  target.id,
  target.lang,
  ico.icons.map((i) => i.data),
);

const versions = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const vi = versions[0] ?? ResEdit.Resource.VersionInfo.createEmpty();
const [major, minor, patch] = pkg.version.split('.').map(Number);
vi.setFileVersion(major, minor, patch, 0, 1033);
vi.setProductVersion(major, minor, patch, 0, 1033);
vi.setStringValues(
  { lang: 1033, codepage: 1200 },
  {
    ProductName: identity.name,
    FileDescription: identity.name,
    CompanyName: identity.publisher,
    LegalCopyright: `Copyright © ${identity.copyrightYear} ${identity.author}`,
    OriginalFilename: `${identity.name}.exe`,
    InternalName: identity.slug,
    ProductVersion: pkg.version,
    FileVersion: pkg.version,
  },
);
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
writeFileSync(exePath, Buffer.from(exe.generate()));
console.log(`[win-icon] icon and version info set on ${exePath}`);
