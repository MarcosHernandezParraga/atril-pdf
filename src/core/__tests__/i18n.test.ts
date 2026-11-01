// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { LANGUAGE_CODES, pickLanguage } from '../../i18n/languages';
import { TRANSLATIONS } from '../../i18n/translations';

const locales: Record<string, unknown> = TRANSLATIONS;

const PLURAL = /_(zero|one|two|few|many|other)$/;

/** Flat list of key → text. */
function flat(obj: unknown, prefix = ''): [string, string][] {
  if (typeof obj === 'string') return [[prefix, obj]];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  );
}

/** Keys without their plural ending, and the endings each one has. */
function shape(obj: unknown) {
  const plain = new Set<string>();
  const plurals = new Map<string, Set<string>>();
  for (const [k] of flat(obj)) {
    const m = PLURAL.exec(k);
    if (m) {
      const base = k.slice(0, -m[0].length);
      if (!plurals.has(base)) plurals.set(base, new Set());
      plurals.get(base)!.add(m[1]!);
    } else plain.add(k);
  }
  return { plain, plurals };
}

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const source = shape(locales.es);
const sourceTexts = new Map(flat(locales.es));

describe('translations', () => {
  it('there is one translation for each language of the app, and no other', () => {
    expect(Object.keys(locales).sort()).toEqual([...LANGUAGE_CODES].sort());
  });

  describe.each(LANGUAGE_CODES.map((c) => [c]))('%s', (code) => {
    const data = locales[code];
    const s = shape(data);

    it('has every text of the app, and nothing else', () => {
      expect([...s.plain].sort()).toEqual([...source.plain].sort());
      expect([...s.plurals.keys()].sort()).toEqual([...source.plurals.keys()].sort());
    });

    it('has exactly the plural forms of its language', () => {
      const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories.slice().sort();
      for (const [base, forms] of s.plurals) {
        expect({ base, forms: [...forms].sort() }).toEqual({ base, forms: categories });
      }
    });

    it('keeps the blanks ({{name}}, {{count}}…) of every text', () => {
      for (const [k, v] of flat(data)) {
        expect(v.trim().length).toBeGreaterThan(0);
        const base = k.replace(PLURAL, '');
        const ref = sourceTexts.get(k) ?? sourceTexts.get(`${base}_other`) ?? '';
        const expected = placeholders(ref).filter((p) => p !== 'count');
        const got = placeholders(v).filter((p) => p !== 'count');
        expect({ key: k, blanks: got }).toEqual({ key: k, blanks: expected });
      }
    });
  });
});

describe('language of the device', () => {
  it('uses the first preferred language the app has', () => {
    expect(pickLanguage([{ languageCode: 'es', regionCode: 'ES' }])).toBe('es');
    expect(pickLanguage([{ languageCode: 'sw' }, { languageCode: 'fr' }])).toBe('fr');
    expect(pickLanguage([{ languageCode: 'de', languageTag: 'de-AT' }])).toBe('de');
  });

  it('Portuguese of Brazil or of Portugal', () => {
    expect(pickLanguage([{ languageCode: 'pt', regionCode: 'BR' }])).toBe('pt');
    expect(pickLanguage([{ languageCode: 'pt', regionCode: 'PT' }])).toBe('pt-PT');
    expect(pickLanguage([{ languageTag: 'pt-PT' }])).toBe('pt-PT');
  });

  it('simplified or traditional Chinese', () => {
    expect(pickLanguage([{ languageCode: 'zh', regionCode: 'CN' }])).toBe('zh-Hans');
    expect(pickLanguage([{ languageCode: 'zh', languageScriptCode: 'Hant', regionCode: 'US' }])).toBe(
      'zh-Hant',
    );
    expect(pickLanguage([{ languageCode: 'zh', regionCode: 'TW' }])).toBe('zh-Hant');
    expect(pickLanguage([{ languageTag: 'zh-HK' }])).toBe('zh-Hant');
  });

  it('Valencian uses Catalan; unknown languages use English', () => {
    expect(pickLanguage([{ languageCode: 'ca', languageTag: 'ca-ES-valencia' }])).toBe('ca');
    expect(pickLanguage([{ languageCode: 'sw' }])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });
});
