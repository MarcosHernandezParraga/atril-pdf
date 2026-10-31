// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import type { ConfigContext, ExpoConfig } from 'expo/config';

import packageJson from './package.json';
import identity from './src/config/identity.json';

const PERMISSION_TEXTS = {
  camera:
    'La cámara se usa solo si tú lo pides, para añadir una foto de una partitura como página. / The camera is only used when you ask, to add a photo of sheet music as a page.',
  photos:
    'El acceso a tus fotos se usa solo para insertar imágenes que tú elijas o guardar páginas exportadas. / Photo access is only used to insert images you choose or to save exported pages.',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: identity.name,
  slug: identity.slug,
  version: packageJson.version,
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: identity.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: identity.appId,
    supportsTablet: true,
    requireFullScreen: false,
    infoPlist: {
      CFBundleDisplayName: identity.name,
      LSSupportsOpeningDocumentsInPlace: true,
      UIFileSharingEnabled: false,
      UIStatusBarHidden: false,
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: PERMISSION_TEXTS.camera,
      NSPhotoLibraryUsageDescription: PERMISSION_TEXTS.photos,
      NSPhotoLibraryAddUsageDescription: PERMISSION_TEXTS.photos,
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'PDF',
          CFBundleTypeRole: 'Viewer',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['com.adobe.pdf'],
        },
      ],
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
    },
  },
  android: {
    package: identity.appId,
    adaptiveIcon: {
      backgroundColor: '#F4EBDD',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Only what is strictly needed: files are always chosen through system pickers.
    permissions: [],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.MANAGE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      // Published builds work 100% offline: no Internet permission at all. (Development
      // builds keep it, because they load the code from the development server.)
      ...(process.env.ATRIL_OFFLINE_BUILD === '1'
        ? ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE']
        : []),
    ],
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: [
          { scheme: 'content', mimeType: 'application/pdf' },
          { scheme: 'file', mimeType: 'application/pdf' },
        ],
      },
    ],
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/images/favicon.png',
    name: identity.name,
    shortName: identity.shortName,
    lang: 'es',
  },
  plugins: [
    ['expo-router', { asyncRoutes: { web: false } }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4EBDD',
        image: './assets/images/splash-icon.png',
        imageWidth: 160,
        dark: { backgroundColor: '#1B1712', image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-sqlite',
    'expo-localization',
    'expo-sharing',
    'expo-screen-orientation',
    './modules/atril-native/plugin/withAtrilNative.js',
    './plugins/withReleaseSigning.js',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    author: identity.author,
  },
});
