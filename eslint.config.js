// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      'desktop/app/*',
      'desktop/release/*',
      'public/vendor/*',
      'coverage/*',
      'assets/icon/render.cjs',
    ],
  },
  {
    files: ['scripts/**', 'e2e/**', 'desktop/**', '*.config.js', 'modules/atril-native/plugin/**'],
    languageOptions: { globals: { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly' } },
  },
]);
