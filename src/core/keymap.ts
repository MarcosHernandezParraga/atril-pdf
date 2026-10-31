// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Keyboard and page-turner pedal mapping. Bluetooth pedals behave like a
// keyboard: every platform (Android, iOS, desktop) translates its native key
// event into the same normalised key name (W3C `KeyboardEvent.key` style),
// then this module decides which reader action to perform.

export type KeyAction =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'nextPiece'
  | 'previousPiece'
  | 'toggleFullscreen'
  | 'exitFullscreen';

export const KEY_ACTIONS: readonly KeyAction[] = [
  'next',
  'previous',
  'first',
  'last',
  'nextPiece',
  'previousPiece',
  'toggleFullscreen',
  'exitFullscreen',
];

/** Normalised key name, e.g. "ArrowRight", "PageDown", "Space", "Enter", "A", "5", "MediaTrackNext". */
export type KeyName = string;

export type KeyMap = Record<KeyAction, KeyName[]>;

export const VOLUME_KEYS = { up: 'AudioVolumeUp', down: 'AudioVolumeDown' } as const;

export const DEFAULT_KEYMAP: KeyMap = {
  next: ['ArrowRight', 'ArrowDown', 'PageDown', 'Space', 'Enter', 'MediaTrackNext'],
  previous: ['ArrowLeft', 'ArrowUp', 'PageUp', 'MediaTrackPrevious'],
  first: ['Home'],
  last: ['End'],
  nextPiece: [],
  previousPiece: [],
  toggleFullscreen: ['F11'],
  exitFullscreen: ['Escape'],
};

/** Actions that move through the score (subject to the anti-bounce filter). */
const NAVIGATION_ACTIONS = new Set<KeyAction>([
  'next',
  'previous',
  'first',
  'last',
  'nextPiece',
  'previousPiece',
]);

const ALIASES: Record<string, KeyName> = {
  ' ': 'Space',
  Spacebar: 'Space',
  Right: 'ArrowRight',
  Left: 'ArrowLeft',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Esc: 'Escape',
  Return: 'Enter',
  MediaNextTrack: 'MediaTrackNext',
  MediaPreviousTrack: 'MediaTrackPrevious',
  VolumeUp: 'AudioVolumeUp',
  VolumeDown: 'AudioVolumeDown',
};

/** Normalises a key name coming from any platform. */
export function normalizeKey(key: string): KeyName {
  if (key in ALIASES) return ALIASES[key]!;
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export interface KeymapOptions {
  /** Android only: also use the volume buttons as a pedal. */
  volumeKeys: boolean;
}

export function effectiveKeymap(map: KeyMap, opts: KeymapOptions): KeyMap {
  if (!opts.volumeKeys) return map;
  return {
    ...map,
    next: unique([...map.next, VOLUME_KEYS.down]),
    previous: unique([...map.previous, VOLUME_KEYS.up]),
  };
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}

export function actionForKey(map: KeyMap, key: KeyName): KeyAction | null {
  const k = normalizeKey(key);
  for (const action of KEY_ACTIONS) {
    if (map[action].includes(k)) return action;
  }
  return null;
}

/** Assigns a key to an action ("learn" mode). The key is removed from any other action. */
export function assignKey(map: KeyMap, action: KeyAction, key: KeyName): KeyMap {
  const k = normalizeKey(key);
  const next = {} as KeyMap;
  for (const a of KEY_ACTIONS) {
    const list = map[a].filter((x) => x !== k);
    next[a] = a === action ? [...list, k] : list;
  }
  return next;
}

export function removeKey(map: KeyMap, action: KeyAction, key: KeyName): KeyMap {
  return { ...map, [action]: map[action].filter((k) => k !== normalizeKey(key)) };
}

/** Keys that the reader consumes (so the system does not also act on them). */
export function consumedKeys(map: KeyMap): KeyName[] {
  return unique(KEY_ACTIONS.flatMap((a) => map[a]));
}

export function sanitizeKeymap(value: unknown): KeyMap {
  const out = { ...DEFAULT_KEYMAP };
  if (value && typeof value === 'object') {
    for (const a of KEY_ACTIONS) {
      const list = (value as Record<string, unknown>)[a];
      if (Array.isArray(list))
        out[a] = unique(list.filter((k): k is string => typeof k === 'string').map(normalizeKey));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Anti-bounce filter
// ---------------------------------------------------------------------------

export interface RawKeyEvent {
  key: KeyName;
  /** True when the OS reports an auto-repeat (key held down). */
  repeat: boolean;
  /** Milliseconds, monotonic. */
  time: number;
}

/**
 * Ignores auto-repeat and mechanical bounce: one press of a pedal must turn
 * exactly one page. The same navigation action is accepted at most once per
 * `debounceMs`.
 */
export class KeyFilter {
  private lastAccepted = new Map<KeyAction, number>();

  constructor(private debounceMs: number) {}

  setDebounce(ms: number): void {
    this.debounceMs = Math.max(0, ms);
  }

  accept(action: KeyAction, ev: RawKeyEvent): boolean {
    if (ev.repeat) return false;
    if (!NAVIGATION_ACTIONS.has(action)) return true;
    const last = this.lastAccepted.get(action);
    if (last !== undefined && ev.time - last < this.debounceMs && ev.time >= last) return false;
    this.lastAccepted.set(action, ev.time);
    return true;
  }

  reset(): void {
    this.lastAccepted.clear();
  }
}

export const DEFAULT_DEBOUNCE_MS = 150;
