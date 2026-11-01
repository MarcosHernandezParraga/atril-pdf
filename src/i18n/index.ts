// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
/* eslint-disable import/no-named-as-default-member -- i18next is used through its default instance */
// Plural rules for every language (some devices do not include them): Russian,
// Polish or Arabic, for example, have several plural forms.
import 'intl-pluralrules';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import { pickLanguage, type LanguagePreference, type SupportedLanguage } from './languages';
import { TRANSLATIONS } from './translations';

export { isRtl, LANGUAGES, type LanguagePreference, type SupportedLanguage } from './languages';
export { TRANSLATIONS };

/** Language of the device (or of the browser), among the ones the app has. */
export function systemLanguage(): SupportedLanguage {
  try {
    return pickLanguage(getLocales());
  } catch {
    return 'en';
  }
}

export function resolveLanguage(pref: LanguagePreference): SupportedLanguage {
  return pref === 'system' ? systemLanguage() : pref;
}

/** Tells the browser the page language (screen readers, fonts, hyphenation). */
function markDocument(lang: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lang;
}

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(TRANSLATIONS).map(([k, v]) => [k, { translation: v }])),
  lng: systemLanguage(),
  // A missing text is shown in the closest language the person probably reads.
  fallbackLng: {
    ca: ['es'],
    gl: ['pt-PT', 'es'],
    eu: ['es'],
    'pt-PT': ['pt'],
    'zh-Hant': ['zh-Hans'],
    default: ['en', 'es'],
  },
  // Codes such as 'zh-Hans' and 'pt-PT' are used exactly as they are.
  load: 'currentOnly',
  interpolation: { escapeValue: false },
  returnNull: false,
});
markDocument(i18n.language);

export function applyLanguage(pref: LanguagePreference) {
  const lang = resolveLanguage(pref);
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
  markDocument(lang);
}

export default i18n;
