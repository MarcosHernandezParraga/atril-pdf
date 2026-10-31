// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Config plugin: lets the app see hardware keys (Bluetooth page-turner pedals,
// keyboards) on Android by forwarding MainActivity.dispatchKeyEvent to the
// native module before React Native handles it.
const { withMainActivity } = require('expo/config-plugins');

const MARKER = '// atril-native: key capture';

function addKeyDispatch(src) {
  if (src.includes(MARKER)) return src;
  let out = src;
  if (!out.includes('import android.view.KeyEvent')) {
    out = out.replace(/^(package [^\n]+\n)/m, '$1\nimport android.view.KeyEvent\n');
  }
  const method = `
  ${MARKER}
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (com.marcoshernandez.atrilnative.AtrilKeyEvents.onKeyEvent(this, event)) return true
    return super.dispatchKeyEvent(event)
  }
`;
  const lastBrace = out.lastIndexOf('}');
  if (lastBrace < 0) throw new Error('withAtrilNative: unexpected MainActivity format');
  return out.slice(0, lastBrace) + method + out.slice(lastBrace);
}

module.exports = function withAtrilNative(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withAtrilNative: MainActivity must be Kotlin');
    }
    cfg.modResults.contents = addKeyDispatch(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addKeyDispatch = addKeyDispatch;
