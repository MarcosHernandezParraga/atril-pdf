// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// 3D page turn: the page rotates around its left edge (the spine) like a real
// sheet, with a soft shadow, revealing the next page underneath. Going back,
// the previous page swings in from the left over the current one.

import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface Flip<T> {
  from: T;
  dir: 1 | -1;
  key: number;
}

/** Horizontal position of the sheet (the page) on screen: it turns around its own left edge. */
export interface SheetRect {
  left: number;
  width: number;
}

function TurningSheet({
  children,
  dir,
  width,
  sheet: rect,
  duration,
}: {
  children: ReactNode;
  dir: 1 | -1;
  width: number;
  sheet: SheetRect;
  duration: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }));
  }, [progress, duration]);

  const sheet = useAnimatedStyle(() => {
    // dir 1: the current sheet leaves (0° → -100°). dir -1: the previous sheet arrives (-100° → 0°).
    const angle =
      dir === 1
        ? interpolate(progress.value, [0, 1], [0, -100])
        : interpolate(progress.value, [0, 1], [-100, 0]);
    return {
      transform: [
        { perspective: Math.max(1200, rect.width * 3) },
        { translateX: -rect.width / 2 },
        { rotateY: `${angle}deg` },
        { translateX: rect.width / 2 },
      ],
    };
  });
  const shade = useAnimatedStyle(() => {
    const p = dir === 1 ? progress.value : 1 - progress.value;
    return { opacity: interpolate(p, [0, 1], [0, 0.3]) };
  });

  return (
    <Animated.View style={[styles.sheet, { left: rect.left, width: rect.width }, sheet]} pointerEvents="none">
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: -rect.left, width }}>{children}</View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, shade]} />
    </Animated.View>
  );
}

export function FlipStack<T>({
  current,
  flip,
  render,
  width,
  sheetFor,
  duration,
}: {
  current: T;
  flip: Flip<T> | null;
  render: (item: T) => ReactNode;
  width: number;
  /** Where the turning page is (defaults to the whole width). */
  sheetFor?: (item: T) => SheetRect;
  duration: number;
}) {
  const rectOf = (item: T): SheetRect => sheetFor?.(item) ?? { left: 0, width };
  if (!flip) return <View style={StyleSheet.absoluteFill}>{render(current)}</View>;
  if (flip.dir === 1) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <View style={StyleSheet.absoluteFill}>{render(current)}</View>
        <TurningSheet key={flip.key} dir={1} width={width} sheet={rectOf(flip.from)} duration={duration}>
          {render(flip.from)}
        </TurningSheet>
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={StyleSheet.absoluteFill}>{render(flip.from)}</View>
      <TurningSheet key={flip.key} dir={-1} width={width} sheet={rectOf(current)} duration={duration}>
        {render(current)}
      </TurningSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
});
