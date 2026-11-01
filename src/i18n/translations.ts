// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// All the translation files of the app, by language code.

import type { SupportedLanguage } from './languages';
import ar from './locales/ar.json';
import ca from './locales/ca.json';
import de from './locales/de.json';
import el from './locales/el.json';
import en from './locales/en.json';
import es from './locales/es.json';
import eu from './locales/eu.json';
import fr from './locales/fr.json';
import gl from './locales/gl.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ptPT from './locales/pt-PT.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, unknown>> = {
  es,
  en,
  pt,
  'pt-PT': ptPT,
  fr,
  de,
  it,
  ca,
  gl,
  eu,
  nl,
  pl,
  ro,
  el,
  ru,
  uk,
  ar,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ja,
  ko,
};
