// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Prepares `desktop/app/` (the folder packaged by electron-builder):
//  - compiles the Electron main process and preload script with esbuild,
//  - copies the exported web interface (dist/) into desktop/app/web,
//  - writes desktop/app/package.json from the single identity file.
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'desktop', 'app');
const identity = JSON.parse(readFileSync(join(root, 'src/config/identity.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const banner = { js: '// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.' };

async function compile() {
  mkdirSync(appDir, { recursive: true });
  const common = {
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron', 'node:*'],
    sourcemap: false,
    minify: false,
    banner,
    logLevel: 'warning',
  };
  await build({ ...common, entryPoints: [join(root, 'desktop/src/main.ts')], outfile: join(appDir, 'main.js') });
  await build({ ...common, entryPoints: [join(root, 'desktop/src/preload.ts')], outfile: join(appDir, 'preload.js') });
}

function copyWeb() {
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error('dist/index.html not found: run "npm run export:web" first.');
  }
  const web = join(appDir, 'web');
  rmSync(web, { recursive: true, force: true });
  // The browser-only SQLite engine is not needed on desktop.
  cpSync(dist, web, { recursive: true, filter: (src) => !src.includes(join('vendor', 'sqljs')) });
  // electron-builder always drops folders named "node_modules", but the web export keeps
  // fonts and images of libraries in assets/node_modules. The app:// protocol maps it back.
  const nm = join(web, 'assets', 'node_modules');
  if (existsSync(nm)) renameSync(nm, join(web, 'assets', '__nm'));
}

function writePackageJson() {
  const desktopPkg = {
    name: identity.slug,
    productName: identity.name,
    version: pkg.version,
    description: pkg.description,
    author: { name: identity.author },
    license: identity.license,
    homepage: identity.repositoryUrl,
    main: 'main.js',
    private: true,
  };
  writeFileSync(join(appDir, 'package.json'), JSON.stringify(desktopPkg, null, 2) + '\n');
  cpSync(join(root, 'assets/images/icon.png'), join(appDir, 'icon.png'));
}

const command = process.argv[2] ?? 'prepare';
if (command === 'prepare') {
  await compile();
  copyWeb();
  writePackageJson();
  console.log('[desktop] desktop/app is ready');
} else if (command === 'compile') {
  await compile();
  writePackageJson();
} else {
  console.error(`Unknown command ${command}`);
  process.exit(1);
}
