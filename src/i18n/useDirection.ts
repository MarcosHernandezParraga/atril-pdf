// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Right-to-left languages (Arabic): the menus, the library and the settings are
// mirrored, as people who read Arabic expect. The score and the reader always
// stay left to right, because sheet music is read from left to right.

import { useTranslation } from 'react-i18next';
import { Platform, type ViewStyle } from 'react-native';

import { isRtl } from './languages';

export function useIsRtl(): boolean {
  const { i18n } = useTranslation();
  return isRtl(i18n.language);
}

/** Style for a container whose content follows the reading direction of the language. */
export function useDirectionStyle(): ViewStyle {
  return { direction: useIsRtl() ? 'rtl' : 'ltr' };
}

/**
 * Props for such a container: the style, plus (in a browser) the `dir`
 * attribute, which "start/end" margins and text alignment need there.
 */
export function useDirectionProps(): { style: ViewStyle } {
  const rtl = useIsRtl();
  const dir = rtl ? 'rtl' : 'ltr';
  return { style: { direction: dir }, ...(Platform.OS === 'web' ? ({ dir } as object) : {}) };
}

/** "Back" points to where the reader comes from. */
export function useBackIcon(): 'arrow-left' | 'arrow-right' {
  return useIsRtl() ? 'arrow-right' : 'arrow-left';
}
