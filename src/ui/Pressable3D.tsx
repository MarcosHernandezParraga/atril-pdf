// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Pressable with a subtle 3D response: on press the element sinks and tilts
// towards the finger (perspective + rotation), then springs back.

import { useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING = { damping: 14, stiffness: 220, mass: 0.6 };

export interface Pressable3DProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  /** Style of the pressable content (padding, layout...). */
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Maximum tilt in degrees. */
  tilt?: number;
  /** Scale while pressed. */
  depth?: number;
}

export function Pressable3D({ style, contentStyle, children, tilt = 8, depth = 0.95, onPressIn, onPressOut, ...rest }: Pressable3DProps) {
  const scale = useSharedValue(1);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const [size, setSize] = useState({ w: 1, h: 1 });

  const animated = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { scale: scale.value }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }],
  }));

  const pressIn = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const fx = Math.max(-1, Math.min(1, (locationX / size.w) * 2 - 1));
    const fy = Math.max(-1, Math.min(1, (locationY / size.h) * 2 - 1));
    scale.set(withSpring(depth, SPRING));
    rx.set(withSpring(-fy * tilt, SPRING));
    ry.set(withSpring(fx * tilt, SPRING));
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    scale.set(withSpring(1, SPRING));
    rx.set(withSpring(0, SPRING));
    ry.set(withSpring(0, SPRING));
    onPressOut?.(e);
  };

  return (
    <Animated.View style={[style, animated]} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width || 1, h: e.nativeEvent.layout.height || 1 })}>
      <Pressable {...rest} onPressIn={pressIn} onPressOut={pressOut} style={[{ flexGrow: 1 }, contentStyle]}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
