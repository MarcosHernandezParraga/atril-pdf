// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
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

export function DocumentCard({
  doc,
  width,
  layout,
  onOpen,
  onMenu,
  index = 0,
}: {
  doc: DocumentRow;
  width: number;
  layout: 'grid' | 'list';
  onOpen: () => void;
  onMenu: () => void;
  index?: number;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const pages = tr('common.pages', { count: doc.pageCount });

  if (layout === 'list') {
    return (
      <Animated.View entering={entering(index)}>
        <Pressable3D
          testID={`doc-${doc.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${doc.title}, ${pages}`}
          onPress={onOpen}
          onLongPress={onMenu}
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
          <IconButton icon="dots-horizontal" label={tr('common.close')} onPress={onMenu} />
        </Pressable3D>
      </Animated.View>
    );
  }

  const thumbHeight = Math.round(width * 1.36);
  return (
    <Animated.View entering={entering(index)} style={{ width }}>
      <Pressable3D
        testID={`doc-${doc.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${doc.title}, ${pages}`}
        onPress={onOpen}
        onLongPress={onMenu}
        style={[{ width, borderRadius: RADIUS.lg }, cardShadow(t, 2)]}
        {...contextMenuProps(onMenu)}
      >
        <Thumbnail doc={doc} width={width} height={thumbHeight} radius={RADIUS.lg} />
        {doc.favorite ? (
          <View style={[styles.star, { backgroundColor: t.surface }]}>
            <Icon name="star" color={t.primary} size={16} />
          </View>
        ) : null}
      </Pressable3D>
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
}: {
  folder: FolderRow;
  width: number;
  count: number;
  onOpen: () => void;
  onMenu: () => void;
  onPlay: () => void;
  index?: number;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = folder.color ?? t.primary;
  return (
    <Animated.View entering={entering(index)} style={{ width }}>
      <Pressable3D
        testID={`folder-${folder.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${folder.name}, ${tr('library.pieces', { count })}`}
        onPress={onOpen}
        onLongPress={onMenu}
        style={[{ borderRadius: RADIUS.lg }, cardShadow(t, 2)]}
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
