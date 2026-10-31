// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { DocumentRow, FolderRow } from '../db/schema';
import { getServices } from '../services';
import { cardShadow, RADIUS, SPACING, useTheme } from '../theme';
import { Pressable3D } from '../ui/Pressable3D';
import { AppText, Icon, IconButton } from '../ui/primitives';

export function useThumbnail(doc: DocumentRow): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getServices()
      .thumbnails.get(doc)
      .then((u) => alive && setUri(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [doc]);
  return uri;
}

/** Right click on desktop opens the same menu as a long press on touch screens. */
export function contextMenuProps(onMenu: () => void) {
  if (Platform.OS !== 'web') return {};
  return {
    onContextMenu: (e: { preventDefault(): void }) => {
      e.preventDefault();
      onMenu();
    },
  } as object;
}

/** Staggered entrance (cards rise into place). */
export function entering(index: number) {
  return FadeInDown.delay(Math.min(index, 12) * 35)
    .springify()
    .damping(16);
}

export function Thumbnail({
  doc,
  width,
  height,
  radius = RADIUS.md,
}: {
  doc: DocumentRow;
  width: number;
  height: number;
  radius?: number;
}) {
  const t = useTheme();
  const thumb = useThumbnail(doc);
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        { borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
      ]}
    >
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={150}
        />
      ) : (
        <Icon name="file-music-outline" size={Math.min(40, width / 3)} color="#C4BBB0" />
      )}
    </View>
  );
}

/** Anything whose position on screen can be measured (drop targets). */
export interface Measurable {
  measureInWindow(cb: (x: number, y: number, width: number, height: number) => void): void;
}

/** Callbacks used to drag a document onto a folder (press and hold, then move). */
export interface DocDragHandlers {
  onStart: (doc: DocumentRow, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

function useDocDrag(doc: DocumentRow, drag?: DocDragHandlers, onOpen?: () => void) {
  // The gesture configuration must stay the same while dragging (re-creating it
  // would cancel the drag), so the latest callbacks are read through a ref.
  const latest = useRef({ doc, drag, onOpen });
  useEffect(() => {
    latest.current = { doc, drag, onOpen };
  });
  // In a browser, releasing the mouse after a drag also counts as a click on
  // the card: that click must not open the document.
  const dragged = useRef(false);
  const enabled = Boolean(drag);
  const pan = usePanGesture({
    runOnJS: true,
    enabled,
    activateAfterLongPress: 280,
    onBegin: () => {
      dragged.current = false;
    },
    onActivate: (e) => {
      dragged.current = true;
      latest.current.drag?.onStart(latest.current.doc, e.absoluteX, e.absoluteY);
    },
    onUpdate: (e) => latest.current.drag?.onMove(e.absoluteX, e.absoluteY),
    onFinalize: () => latest.current.drag?.onEnd(),
  });
  const open = useCallback(() => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    latest.current.onOpen?.();
  }, []);
  return { pan, open };
}

export function DocumentCard({
  doc,
  width,
  layout,
  onOpen,
  onMenu,
  index = 0,
  drag,
  lifted,
}: {
  doc: DocumentRow;
  width: number;
  layout: 'grid' | 'list';
  onOpen: () => void;
  onMenu: () => void;
  index?: number;
  drag?: DocDragHandlers;
  /** This card is being dragged (shown faded in place). */
  lifted?: boolean;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const pages = tr('common.pages', { count: doc.pageCount });
  const { pan, open } = useDocDrag(doc, drag, onOpen);

  if (layout === 'list') {
    return (
      <Animated.View entering={entering(index)} style={{ opacity: lifted ? 0.35 : 1 }}>
        <GestureDetector gesture={pan}>
          <Pressable3D
            testID={`doc-${doc.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${doc.title}, ${pages}`}
            onPress={open}
            tilt={3}
            depth={0.98}
            style={[styles.listRow, { backgroundColor: t.surface }, cardShadow(t, 1)]}
            contentStyle={styles.listContent}
            {...contextMenuProps(onMenu)}
          >
            <Thumbnail doc={doc} width={46} height={62} radius={8} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <AppText variant="label" numberOfLines={2}>
                {doc.title}
              </AppText>
              <AppText variant="caption" secondary>
                {pages}
              </AppText>
            </View>
            {doc.favorite ? <Icon name="star" color={t.primary} size={20} /> : null}
            <IconButton icon="dots-horizontal" label={tr('library.moreOptions')} onPress={onMenu} />
          </Pressable3D>
        </GestureDetector>
      </Animated.View>
    );
  }

  const thumbHeight = Math.round(width * 1.36);
  return (
    <Animated.View entering={entering(index)} style={{ width, opacity: lifted ? 0.35 : 1 }}>
      <GestureDetector gesture={pan}>
        <Pressable3D
          testID={`doc-${doc.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${doc.title}, ${pages}`}
          onPress={open}
          style={[{ width, borderRadius: RADIUS.lg, backgroundColor: '#FFFFFF' }, cardShadow(t, 2)]}
          {...contextMenuProps(onMenu)}
        >
          <Thumbnail doc={doc} width={width} height={thumbHeight} radius={RADIUS.lg} />
          {doc.favorite ? (
            <View style={[styles.star, { backgroundColor: t.surface }]}>
              <Icon name="star" color={t.primary} size={16} />
            </View>
          ) : null}
          <View style={styles.more}>
            <IconButton
              icon="dots-horizontal"
              label={tr('library.moreOptions')}
              onPress={onMenu}
              size={20}
              style={[styles.moreBtn, { backgroundColor: t.surface }]}
              testID={`more-${doc.id}`}
            />
          </View>
        </Pressable3D>
      </GestureDetector>
      <AppText variant="label" numberOfLines={2} style={{ marginTop: SPACING.sm }}>
        {doc.title}
      </AppText>
      <AppText variant="caption" secondary>
        {pages}
      </AppText>
    </Animated.View>
  );
}

export function FolderTile({
  folder,
  width,
  count,
  onOpen,
  onMenu,
  onPlay,
  index = 0,
  dropRef,
  highlighted,
}: {
  folder: FolderRow;
  width: number;
  count: number;
  onOpen: () => void;
  onMenu: () => void;
  onPlay: () => void;
  index?: number;
  /** Registers the tile as a place where dragged documents can be dropped. */
  dropRef?: (view: Measurable | null) => void;
  /** A document is being dragged over this tile. */
  highlighted?: boolean;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = folder.color ?? t.primary;
  return (
    <Animated.View
      entering={entering(index)}
      style={[
        { width, borderRadius: RADIUS.lg },
        highlighted && { transform: [{ scale: 1.06 }], borderWidth: 3, borderColor: t.accent },
      ]}
      testID={highlighted ? `drop-target-${folder.id}` : undefined}
    >
      <View ref={dropRef as never} collapsable={false}>
        <Pressable3D
          testID={`folder-${folder.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${folder.name}, ${tr('library.pieces', { count })}`}
          onPress={onOpen}
          onLongPress={onMenu}
          style={[{ borderRadius: RADIUS.lg, backgroundColor: color }, cardShadow(t, 2)]}
          contentStyle={styles.folderContent}
          {...contextMenuProps(onMenu)}
        >
          <LinearGradient
            colors={[`${color}F2`, `${color}B3`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.lg }]}
          />
          <View style={styles.folderTop}>
            <Icon name="folder-music" size={30} color="#FFFFFF" />
            {count > 0 ? (
              <IconButton
                icon="play-circle"
                label={tr('library.startConcert')}
                color="#FFFFFF"
                size={32}
                onPress={onPlay}
                testID={`play-${folder.id}`}
              />
            ) : null}
          </View>
          <AppText variant="label" numberOfLines={2} style={{ color: '#FFFFFF' }}>
            {folder.name}
          </AppText>
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {tr('library.pieces', { count })}
          </AppText>
        </Pressable3D>
      </View>
    </Animated.View>
  );
}

export function NewFolderTile({
  width,
  onPress,
  label,
}: {
  width: number;
  onPress: () => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable3D
      testID="new-folder"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        {
          width,
          borderRadius: RADIUS.lg,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: t.border,
          backgroundColor: t.surface,
        },
      ]}
      contentStyle={[styles.folderContent, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <View style={[styles.plus, { backgroundColor: t.surfaceAlt }]}>
        <Icon name="plus" size={26} color={t.primary} />
      </View>
      <AppText variant="label" style={{ marginTop: SPACING.sm, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', top: 8, right: 8, borderRadius: 14, padding: 4 },
  more: { position: 'absolute', bottom: 6, right: 6 },
  moreBtn: { minWidth: 34, minHeight: 34, borderRadius: 17, opacity: 0.92 },
  listRow: { borderRadius: RADIUS.lg, marginBottom: SPACING.sm },
  listContent: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, paddingLeft: SPACING.md },
  folderContent: {
    padding: SPACING.lg,
    minHeight: 124,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  folderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    minHeight: 40,
  },
  plus: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
