// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
/* eslint-disable import/no-named-as-default-member -- i18next is used through its default instance */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { LanguagePreference } from '../settings/defaults';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function systemLanguage(): SupportedLanguage {
  try {
    const code = getLocales()[0]?.languageCode ?? 'es';
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? (code as SupportedLanguage) : 'en';
  } catch {
    return 'es';
  }
}

export function resolveLanguage(pref: LanguagePreference): SupportedLanguage {
  return pref === 'system' ? systemLanguage() : pref;
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: systemLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function applyLanguage(pref: LanguagePreference) {
  const lang = resolveLanguage(pref);
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
}

export default i18n;
