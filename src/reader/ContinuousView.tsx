// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Vertical continuous mode: pages one under another. Free scrolling with the
// finger; the pedal, keys and taps advance one screen minus an overlap so the
// last system being read stays visible at the top.

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { PageRef } from '../core/model';
import {
  computeContinuousLayout,
  nextScroll,
  pageAtScroll,
  previousScroll,
  scrollForPage,
} from '../core/navigation';
import type { DisplayFilter } from '../settings/defaults';
import { PageView, pageHeightForWidth } from './PageView';

export interface ContinuousHandle {
  /** Returns false when there is nothing further in that direction. */
  step(direction: 1 | -1): boolean;
  goToPage(page: number): void;
}

const GAP = 8;

export const ContinuousView = forwardRef<
  ContinuousHandle,
  {
    pages: PageRef[];
    width: number;
    height: number;
    overlap: number;
    initialPage: number;
    filter: DisplayFilter;
    brightness: number;
    onPageChange: (page: number) => void;
    scrollEnabled: boolean;
  }
>(function ContinuousView(p, ref) {
  const list = useRef<FlatList<PageRef>>(null);
  const offset = useRef(0);
  const pageWidth = Math.min(p.width, 1400);
  const layout = useMemo(
    () =>
      computeContinuousLayout(
        p.pages.map((pg) => pageHeightForWidth(pg, pageWidth)),
        GAP,
      ),
    [p.pages, pageWidth],
  );

  const scrollTo = (y: number) => {
    offset.current = y;
    list.current?.scrollToOffset({ offset: y, animated: false });
    p.onPageChange(pageAtScroll(layout, y));
  };

  useImperativeHandle(ref, () => ({
    step(direction) {
      const y =
        direction === 1
          ? nextScroll(layout, offset.current, p.height, p.overlap)
          : previousScroll(layout, offset.current, p.height, p.overlap);
      if (y === null) return false;
      scrollTo(y);
      return true;
    },
    goToPage(page) {
      scrollTo(scrollForPage(layout, page, p.height));
    },
  }));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
    p.onPageChange(pageAtScroll(layout, offset.current));
  };

  return (
    <FlatList
      ref={list}
      testID="continuous"
      data={p.pages}
      keyExtractor={(pg) => pg.id}
      scrollEnabled={p.scrollEnabled}
      onScroll={onScroll}
      scrollEventThrottle={32}
      initialNumToRender={3}
      windowSize={5}
      maxToRenderPerBatch={3}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_d, index) => ({
        length: (layout.heights[index] ?? 0) + GAP,
        offset: layout.offsets[index] ?? 0,
        index,
      })}
      initialScrollIndex={Math.min(Math.max(0, p.initialPage), Math.max(0, p.pages.length - 1))}
      onLayout={() => {
        offset.current = layout.offsets[p.initialPage] ?? 0;
      }}
      renderItem={({ item }) => (
        <View style={{ width: p.width, alignItems: 'center', paddingBottom: GAP }}>
          <PageView
            page={item}
            width={pageWidth}
            filter={p.filter}
            brightness={p.brightness}
            testID={`page-${item.id}`}
          />
        </View>
      )}
    />
  );
});
