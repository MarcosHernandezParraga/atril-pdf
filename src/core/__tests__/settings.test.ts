// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { DEFAULT_SETTINGS, mergeSettings, sanitizeSettings } from '../../settings/defaults';

describe('settings', () => {
  it('uses the defaults when nothing is stored', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid stored values and ignores wrong types or unknown keys', () => {
    const s = sanitizeSettings({
      theme: 'dark',
      reader: { transitionMs: 'fast', defaultMode: 'half-page', unknown: 1 },
      pedal: { keymap: { next: ['b'] } },
      bogus: true,
    });
    expect(s.theme).toBe('dark');
    expect(s.reader.defaultMode).toBe('half-page');
    expect(s.reader.transitionMs).toBe(180);
    expect(s.pedal.keymap.next).toEqual(['B']);
    expect(s.pedal.keymap.previous).toEqual(DEFAULT_SETTINGS.pedal.keymap.previous);
    expect((s as unknown as Record<string, unknown>).bogus).toBeUndefined();
  });

  it('clamps numbers to their allowed ranges', () => {
    const s = sanitizeSettings({
      reader: { transitionMs: 2000, lookaheadFraction: 0.9 },
      pedal: { debounceMs: -5 },
    });
    expect(s.reader.transitionMs).toBe(400);
    expect(s.reader.lookaheadFraction).toBe(0.35);
    expect(s.pedal.debounceMs).toBe(0);
  });

  it('merges arrays as a whole', () => {
    expect(mergeSettings({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
    expect(mergeSettings({ a: [1, 2] }, { a: 'x' })).toEqual({ a: [1, 2] });
  });
});
