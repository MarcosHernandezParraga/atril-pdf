// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Packaging for Windows (NSIS installer + AppX/MSIX for the Microsoft Store),
// macOS (universal DMG) and Linux (AppImage + deb). Flatpak is built from the
// manifest in packaging/flatpak (Flathub builds it from source).
const identity = require('../src/config/identity.json');
const electronVersion = require('electron/package.json').version;

const copyright = `Copyright © ${identity.copyrightYear} ${identity.author}`;

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: identity.appId,
  productName: identity.name,
  copyright,
  electronVersion,
  directories: {
    app: 'desktop/app',
    output: 'desktop/release',
    buildResources: 'desktop/build-resources',
  },
  files: ['**/*'],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  fileAssociations: [
    {
      ext: 'pdf',
      name: 'PDF',
      description: 'PDF',
      mimeType: 'application/pdf',
      role: 'Viewer',
      rank: 'Alternate',
    },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }, { target: 'appx', arch: ['x64', 'arm64'] }],
    publisherName: identity.author,
    legalTrademarks: identity.name,
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: identity.name,
    uninstallDisplayName: identity.name,
    // File association is registered but the app is NOT forced as the default PDF reader.
  },
  appx: {
    displayName: identity.name,
    publisherDisplayName: identity.author,
    // Replace these two values with the ones shown in Microsoft Partner Center
    // (Product identity) before uploading to the Microsoft Store.
    identityName: process.env.MS_STORE_IDENTITY_NAME || 'MarcosHernandezParraga.AtrilMusical',
    publisher: process.env.MS_STORE_PUBLISHER || 'CN=00000000-0000-0000-0000-000000000000',
    languages: ['es-ES', 'en-US'],
    backgroundColor: '#1B1712',
  },
  mac: {
    target: [{ target: 'dmg', arch: ['universal'] }],
    category: 'public.app-category.music',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    // Signing and notarisation are only used when the Apple secrets are configured.
    identity: process.env.CSC_LINK ? undefined : null,
    extendInfo: {
      NSHumanReadableCopyright: copyright,
      LSApplicationCategoryType: 'public.app-category.music',
    },
  },
  dmg: {
    title: identity.name,
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64', 'arm64'] }, { target: 'deb', arch: ['x64', 'arm64'] }],
    category: 'AudioVideo',
    maintainer: identity.author,
    vendor: identity.author,
    synopsis: 'Lector de partituras PDF / PDF sheet music reader',
    mimeTypes: ['application/pdf'],
    executableName: identity.slug,
    desktop: {
      entry: {
        Name: identity.name,
        GenericName: 'Sheet music reader',
        'GenericName[es]': 'Lector de partituras',
        Comment: 'Free PDF sheet music reader for musicians',
        'Comment[es]': 'Lector de partituras PDF libre y gratuito para músicos',
        Categories: 'AudioVideo;Audio;Music;Viewer;Office;',
        Keywords: 'pdf;music;score;sheet;partitura;atril;',
        StartupWMClass: identity.name,
      },
    },
  },
  deb: {
    packageCategory: 'sound',
    priority: 'optional',
  },
  publish: null,
};
