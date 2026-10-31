// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Which action a tap on the reader performs, depending on where it lands.

export type TapZoneLayout = 'thirds' | 'halves' | 'top-bottom';
export type TapAction = 'next' | 'previous' | 'center';

export function tapZoneAction(
  x: number,
  y: number,
  width: number,
  height: number,
  layout: TapZoneLayout,
  inverted: boolean,
): TapAction {
  const fx = width > 0 ? x / width : 0.5;
  const fy = height > 0 ? y / height : 0.5;
  let action: TapAction;
  switch (layout) {
    case 'thirds':
      action = fx < 1 / 3 ? 'previous' : fx > 2 / 3 ? 'next' : 'center';
      break;
    case 'halves':
      // A small central band still shows/hides the bars.
      action =
        Math.abs(fx - 0.5) < 0.08 && Math.abs(fy - 0.5) < 0.15 ? 'center' : fx < 0.5 ? 'previous' : 'next';
      break;
    case 'top-bottom':
      action =
        Math.abs(fy - 0.5) < 0.08 && Math.abs(fx - 0.5) < 0.2 ? 'center' : fy < 0.5 ? 'previous' : 'next';
      break;
  }
  if (inverted && action !== 'center') action = action === 'next' ? 'previous' : 'next';
  return action;
}

/** Horizontal swipe: finger moving left means "next". */
export function swipeAction(
  translationX: number,
  velocityX: number,
  width: number,
): 'next' | 'previous' | null {
  const far = Math.abs(translationX) > Math.max(40, width * 0.12);
  const fast = Math.abs(velocityX) > 600 && Math.abs(translationX) > 20;
  if (!far && !fast) return null;
  return translationX < 0 ? 'next' : 'previous';
}
