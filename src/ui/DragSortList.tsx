// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Vertical list whose rows can be reordered by dragging them with a finger, a
// pencil or the mouse. The dragged row lifts and follows the pointer while the
// other rows make room smoothly. Used for the pieces of a concert and the
// pages of a document.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { dropIndex, shiftFor } from './dragSortMath';

export { dropIndex, moveItem, shiftFor } from './dragSortMath';

const SPRING = { damping: 20, stiffness: 260, mass: 0.6 };

function SortRow({
  index,
  rowHeight,
  shift,
  dragging,
  dy,
  enabled,
  onStart,
  onMove,
  onEnd,
  children,
  testID,
}: {
  index: number;
  rowHeight: number;
  shift: number;
  dragging: boolean;
  dy: number;
  enabled: boolean;
  onStart: (index: number) => void;
  onMove: (dy: number) => void;
  onEnd: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const offset = useSharedValue(0);
  const lift = useSharedValue(0);
  useEffect(() => {
    offset.set(dragging ? dy : withTiming(shift, { duration: 160 }));
  }, [offset, dragging, dy, shift]);
  useEffect(() => {
    lift.set(withSpring(dragging ? 1 : 0, SPRING));
  }, [lift, dragging]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }, { scale: 1 + lift.value * 0.03 }],
    zIndex: lift.value > 0.01 ? 100 : 1,
    shadowOpacity: lift.value * 0.25,
    elevation: lift.value * 12,
  }));

  // Stable gesture configuration (re-creating it while dragging would cancel the drag).
  const latest = useRef({ index, onStart, onMove, onEnd });
  useEffect(() => {
    latest.current = { index, onStart, onMove, onEnd };
  });
  const pan = usePanGesture({
    runOnJS: true,
    enabled,
    minDistance: 3,
    onActivate: () => latest.current.onStart(latest.current.index),
    onUpdate: (e) => latest.current.onMove(e.translationY),
    onFinalize: () => latest.current.onEnd(),
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={testID}
        style={[
          styles.row,
          {
            top: index * rowHeight,
            height: rowHeight,
            shadowColor: '#000',
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export function DragSortList<T>({
  items,
  keyOf,
  rowHeight,
  renderRow,
  onReorder,
  enabled,
  onDragChange,
  testIDPrefix,
}: {
  items: T[];
  keyOf: (item: T) => string;
  /** Height of each row including the gap below it. */
  rowHeight: number;
  renderRow: (item: T, index: number, dragging: boolean) => ReactNode;
  onReorder: (from: number, to: number) => void;
  /** Dragging is only possible when enabled (e.g. "Reorder" mode). */
  enabled: boolean;
  /** Lets the parent stop scrolling while a row is dragged. */
  onDragChange?: (dragging: boolean) => void;
  testIDPrefix?: string;
}) {
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const to = drag ? dropIndex(drag.from, drag.dy, rowHeight, items.length) : -1;

  return (
    <View style={{ height: items.length * rowHeight }}>
      {items.map((item, i) => (
        <SortRow
          key={keyOf(item)}
          testID={testIDPrefix ? `${testIDPrefix}-${i + 1}` : undefined}
          index={i}
          rowHeight={rowHeight}
          shift={drag ? shiftFor(i, drag.from, to, rowHeight) : 0}
          dragging={drag?.from === i}
          dy={drag?.from === i ? drag.dy : 0}
          enabled={enabled}
          onStart={(index) => {
            setDrag({ from: index, dy: 0 });
            onDragChange?.(true);
          }}
          onMove={(dy) => setDrag((d) => (d ? { ...d, dy } : d))}
          onEnd={() => {
            setDrag((d) => {
              if (d) {
                const target = dropIndex(d.from, d.dy, rowHeight, items.length);
                if (target !== d.from) setTimeout(() => onReorder(d.from, target), 0);
              }
              return null;
            });
            onDragChange?.(false);
          }}
        >
          {renderRow(item, i, drag?.from === i)}
        </SortRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0 },
});
