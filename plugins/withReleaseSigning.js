// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Android release signing with the project's own key. The key never lives in
// the repository: it is read from android/app/release.keystore (written by the
// CI from a GitHub secret, or copied by hand) and the passwords from
// environment variables. Without them the build falls back to the debug key,
// which is enough to try the app but not to publish it.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// atril: release signing';

function addReleaseSigning(src) {
  if (src.includes(MARKER)) return src;
  let out = src.replace(
    /signingConfigs \{\n(\s+)debug \{/,
    `signingConfigs {
        ${MARKER}
        release {
            if (System.getenv('ATRIL_KEYSTORE_PASSWORD')) {
                storeFile file(System.getenv('ATRIL_KEYSTORE_FILE') ?: 'release.keystore')
                storePassword System.getenv('ATRIL_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ATRIL_KEY_ALIAS')
                keyPassword System.getenv('ATRIL_KEY_PASSWORD')
            }
        }
$1debug {`,
  );
  out = out.replace(
    /(release \{\n(?:\s+\/\/[^\n]*\n)*\s+)signingConfig signingConfigs\.debug/,
    "$1signingConfig System.getenv('ATRIL_KEYSTORE_PASSWORD') ? signingConfigs.release : signingConfigs.debug",
  );
  if (!out.includes(MARKER) || !out.includes('signingConfigs.release :')) {
    throw new Error('withReleaseSigning: unexpected build.gradle format');
  }
  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addReleaseSigning = addReleaseSigning;
