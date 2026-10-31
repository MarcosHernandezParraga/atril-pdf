// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Which pointers may draw, depending on the input mode chosen by the user.

import type { InputMode } from '../settings/defaults';

/** Same values as react-native-gesture-handler's PointerType. */
export const POINTER = { TOUCH: 0, STYLUS: 1, MOUSE: 2, KEY: 3, OTHER: 4 } as const;

export function pointerAllowed(mode: InputMode, pointer: number): boolean {
  if (mode === 'off') return false;
  if (pointer === POINTER.MOUSE || pointer === POINTER.OTHER) return true;
  if (mode === 'stylus') return pointer === POINTER.STYLUS;
  if (mode === 'finger') return pointer === POINTER.TOUCH;
  return true;
}
