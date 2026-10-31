// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import {
  actionForKey,
  assignKey,
  consumedKeys,
  DEFAULT_KEYMAP,
  effectiveKeymap,
  KeyFilter,
  normalizeKey,
  removeKey,
  sanitizeKeymap,
} from '../keymap';

describe('default pedal and keyboard mapping', () => {
  it.each(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Space', 'Enter', 'MediaTrackNext', 'MediaNextTrack'])(
    '%s turns to the next page',
    (key) => {
      expect(actionForKey(DEFAULT_KEYMAP, key)).toBe('next');
    },
  );

  it.each(['ArrowLeft', 'ArrowUp', 'PageUp', 'MediaTrackPrevious'])('%s turns to the previous page', (key) => {
    expect(actionForKey(DEFAULT_KEYMAP, key)).toBe('previous');
  });

  it('Home/End go to the first/last page, F11 and Escape control full screen', () => {
    expect(actionForKey(DEFAULT_KEYMAP, 'Home')).toBe('first');
    expect(actionForKey(DEFAULT_KEYMAP, 'End')).toBe('last');
    expect(actionForKey(DEFAULT_KEYMAP, 'F11')).toBe('toggleFullscreen');
    expect(actionForKey(DEFAULT_KEYMAP, 'Esc')).toBe('exitFullscreen');
  });

  it('unknown keys do nothing', () => {
    expect(actionForKey(DEFAULT_KEYMAP, 'Q')).toBeNull();
  });

  it('volume keys are only used when enabled', () => {
    expect(actionForKey(DEFAULT_KEYMAP, 'AudioVolumeDown')).toBeNull();
    const map = effectiveKeymap(DEFAULT_KEYMAP, { volumeKeys: true });
    expect(actionForKey(map, 'AudioVolumeDown')).toBe('next');
    expect(actionForKey(map, 'VolumeUp')).toBe('previous');
  });

  it('normalises letters and aliases', () => {
    expect(normalizeKey('a')).toBe('A');
    expect(normalizeKey(' ')).toBe('Space');
    expect(normalizeKey('Right')).toBe('ArrowRight');
  });
});

describe('learn mode', () => {
  it('assigns a key to an action and removes it from any other action', () => {
    const map = assignKey(DEFAULT_KEYMAP, 'previous', 'Space');
    expect(actionForKey(map, 'Space')).toBe('previous');
    expect(map.next).not.toContain('Space');
  });

  it('allows several keys per action', () => {
    let map = assignKey(DEFAULT_KEYMAP, 'nextPiece', 'b');
    map = assignKey(map, 'nextPiece', 'N');
    expect(map.nextPiece).toEqual(['B', 'N']);
    expect(removeKey(map, 'nextPiece', 'b').nextPiece).toEqual(['N']);
  });

  it('lists the keys the reader must capture', () => {
    expect(consumedKeys(DEFAULT_KEYMAP)).toEqual(expect.arrayContaining(['ArrowRight', 'Space', 'PageUp']));
  });

  it('sanitises stored values', () => {
    const m = sanitizeKeymap({ next: ['x', 3, 'x'], bogus: ['A'] });
    expect(m.next).toEqual(['X']);
    expect(m.previous).toEqual(DEFAULT_KEYMAP.previous);
    expect(sanitizeKeymap(null)).toEqual(DEFAULT_KEYMAP);
  });
});

describe('anti-bounce filter', () => {
  it('ignores auto-repeat of a held key', () => {
    const f = new KeyFilter(150);
    expect(f.accept('next', { key: 'ArrowRight', repeat: false, time: 0 })).toBe(true);
    expect(f.accept('next', { key: 'ArrowRight', repeat: true, time: 500 })).toBe(false);
  });

  it('one press of the pedal turns only one page', () => {
    const f = new KeyFilter(150);
    expect(f.accept('next', { key: 'PageDown', repeat: false, time: 1000 })).toBe(true);
    expect(f.accept('next', { key: 'PageDown', repeat: false, time: 1060 })).toBe(false);
    expect(f.accept('next', { key: 'PageDown', repeat: false, time: 1200 })).toBe(true);
  });

  it('different actions are independent', () => {
    const f = new KeyFilter(150);
    expect(f.accept('next', { key: 'ArrowRight', repeat: false, time: 0 })).toBe(true);
    expect(f.accept('previous', { key: 'ArrowLeft', repeat: false, time: 20 })).toBe(true);
  });

  it('non-navigation actions are never debounced', () => {
    const f = new KeyFilter(150);
    expect(f.accept('toggleFullscreen', { key: 'F11', repeat: false, time: 0 })).toBe(true);
    expect(f.accept('toggleFullscreen', { key: 'F11', repeat: false, time: 10 })).toBe(true);
  });

  it('the debounce time can be changed and reset', () => {
    const f = new KeyFilter(150);
    f.setDebounce(0);
    expect(f.accept('next', { key: 'A', repeat: false, time: 0 })).toBe(true);
    expect(f.accept('next', { key: 'A', repeat: false, time: 1 })).toBe(true);
    f.setDebounce(500);
    f.reset();
    expect(f.accept('next', { key: 'A', repeat: false, time: 2 })).toBe(true);
  });
});
