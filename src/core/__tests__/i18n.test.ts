// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import en from '../../i18n/locales/en.json';
import es from '../../i18n/locales/es.json';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('translations', () => {
  it('Spanish and English have exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it('no translation is empty', () => {
    for (const k of keys(es)) expect(k.length).toBeGreaterThan(0);
    const values = (o: unknown): string[] =>
      typeof o === 'string' ? [o] : Object.values(o as object).flatMap(values);
    expect(values(es).every((v) => v.trim().length > 0)).toBe(true);
    expect(values(en).every((v) => v.trim().length > 0)).toBe(true);
  });
});
