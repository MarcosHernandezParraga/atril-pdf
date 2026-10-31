// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Quick "page swipe": like turning a book page by its bottom-right corner,
// the sheet slides away to the left with a slight tilt and a soft shadow on
// its edge, revealing the next page underneath. Going back, the previous page
// slides in from the left over the current one. It is meant to be almost
// imperceptible: just enough to see that the page has changed.

import { LinearGradient } from 'expo-linear-gradient';
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

/** Horizontal position of the sheet (the page) on screen. */
export interface SheetRect {
  left: number;
  width: number;
}

function SwipingSheet({
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
    progress.set(withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [progress, duration]);

  // Distance needed to take the sheet completely off the left side of the screen.
  const travel = rect.left + rect.width + 24;

  const sheet = useAnimatedStyle(() => {
    // 0 = sheet in place, 1 = sheet gone to the left.
    const p = dir === 1 ? progress.value : 1 - progress.value;
    return {
      transform: [
        { translateX: -travel * p },
        // Pulled by the bottom-right corner: the bottom leads, the page tilts slightly.
        { rotateZ: `${interpolate(p, [0, 1], [0, -5])}deg` },
      ],
    };
  });
  const edgeShadow = useAnimatedStyle(() => {
    const p = dir === 1 ? progress.value : 1 - progress.value;
    return { opacity: interpolate(p, [0, 0.15, 1], [0, 0.35, 0.1]) };
  });

  return (
    <Animated.View
      style={[styles.sheet, { left: rect.left, width: rect.width, transformOrigin: 'left bottom' }, sheet]}
      pointerEvents="none"
    >
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: -rect.left, width }}>{children}</View>
      {/* Soft shadow on the right edge, where the page is held. */}
      <Animated.View style={[styles.edge, edgeShadow]}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

/** Shadow that the moving sheet casts on the page underneath. */
function Underlay({ dir, duration }: { dir: 1 | -1; duration: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [progress, duration]);
  const style = useAnimatedStyle(() => {
    const p = dir === 1 ? progress.value : 1 - progress.value;
    return { opacity: interpolate(p, [0, 1], [0.12, 0]) };
  });
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.underlay, style]} />;
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
  /** Where the moving page is (defaults to the whole width). */
  sheetFor?: (item: T) => SheetRect;
  duration: number;
}) {
  const rectOf = (item: T): SheetRect => sheetFor?.(item) ?? { left: 0, width };
  if (!flip) return <View style={StyleSheet.absoluteFill}>{render(current)}</View>;
  if (flip.dir === 1) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <View style={StyleSheet.absoluteFill}>{render(current)}</View>
        <Underlay key={`u${flip.key}`} dir={1} duration={duration} />
        <SwipingSheet key={flip.key} dir={1} width={width} sheet={rectOf(flip.from)} duration={duration}>
          {render(flip.from)}
        </SwipingSheet>
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={StyleSheet.absoluteFill}>{render(flip.from)}</View>
      <Underlay key={`u${flip.key}`} dir={-1} duration={duration} />
      <SwipingSheet key={flip.key} dir={-1} width={width} sheet={rectOf(current)} duration={duration}>
        {render(current)}
      </SwipingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  edge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 22,
  },
  underlay: { backgroundColor: '#000000' },
});
