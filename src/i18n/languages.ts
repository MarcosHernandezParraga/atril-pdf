// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Languages of the app. Each one has a file in ./locales with exactly the same
// keys as es.json (checked by a test). The app follows the language of the
// device; it can be changed in Settings.

export const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ca', name: 'Català' },
  { code: 'gl', name: 'Galego' },
  { code: 'eu', name: 'Euskara' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'ro', name: 'Română' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'zh-Hant', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
] as const;

export type SupportedLanguage = (typeof LANGUAGES)[number]['code'];
export type LanguagePreference = 'system' | SupportedLanguage;

export const LANGUAGE_CODES: readonly SupportedLanguage[] = LANGUAGES.map((l) => l.code);

/** Written from right to left. */
export const RTL_LANGUAGES: readonly SupportedLanguage[] = ['ar'];

export function isRtl(lang: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(lang);
}

export function isSupportedLanguage(code: unknown): code is SupportedLanguage {
  return typeof code === 'string' && (LANGUAGE_CODES as readonly string[]).includes(code);
}

/** A locale of the device (as reported by the system). */
export interface DeviceLocale {
  languageCode?: string | null;
  languageScriptCode?: string | null;
  regionCode?: string | null;
  languageTag?: string | null;
}

/**
 * The app language for the device's preferred languages, in order: the first
 * one the app has. Chinese is split into simplified (mainland China, Singapore)
 * and traditional (Taiwan, Hong Kong, Macao); Portuguese into Brazil and
 * Portugal. Unknown languages: English.
 */
export function pickLanguage(locales: readonly DeviceLocale[]): SupportedLanguage {
  for (const loc of locales) {
    const tag = (loc.languageTag ?? '').toLowerCase();
    const code = (loc.languageCode ?? tag.split(/[-_]/)[0] ?? '').toLowerCase();
    if (code === 'zh') {
      const script = (loc.languageScriptCode ?? '').toLowerCase();
      const region = (loc.regionCode ?? '').toUpperCase();
      const traditional =
        script === 'hant' ||
        tag.includes('hant') ||
        ['TW', 'HK', 'MO'].includes(region) ||
        /-(tw|hk|mo)\b/.test(tag);
      return traditional ? 'zh-Hant' : 'zh-Hans';
    }
    if (code === 'pt') {
      // European Portuguese in Portugal and in the African countries that follow its spelling.
      const region = (loc.regionCode ?? tag.split(/[-_]/)[1] ?? '').toUpperCase();
      return ['PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'].includes(region) ? 'pt-PT' : 'pt';
    }
    // Valencian (ca-ES-valencia) and other variants use their main language.
    if (isSupportedLanguage(code)) return code;
  }
  return 'en';
}
