// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { DocumentRow, FolderRow } from '../db/schema';
import { getServices } from '../services';
import { RADIUS, SPACING, useTheme } from '../theme';
import { AppText, Icon } from '../ui/primitives';

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
function contextMenuProps(onMenu: () => void) {
  if (Platform.OS !== 'web') return {};
  return {
    onContextMenu: (e: { preventDefault(): void }) => {
      e.preventDefault();
      onMenu();
    },
  } as object;
}

export function DocumentCard({
  doc,
  width,
  layout,
  onOpen,
  onMenu,
  selected,
}: {
  doc: DocumentRow;
  width: number;
  layout: 'grid' | 'list' | 'recent';
  onOpen: () => void;
  onMenu: () => void;
  selected?: boolean;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const thumb = useThumbnail(doc);
  const pages = tr('common.pages', { count: doc.pageCount });

  if (layout === 'list') {
    return (
      <Pressable
        testID={`doc-${doc.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${doc.title}, ${pages}`}
        onPress={onOpen}
        onLongPress={onMenu}
        {...contextMenuProps(onMenu)}
        style={({ pressed }) => [
          styles.listRow,
          { borderBottomColor: t.border, backgroundColor: selected ? t.dropHighlight : pressed ? t.surfaceAlt : 'transparent' },
        ]}
      >
        <View style={[styles.listThumb, { backgroundColor: t.surface, borderColor: t.border }]}>
          {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <AppText numberOfLines={2}>{doc.title}</AppText>
          <AppText variant="caption" secondary>
            {pages}
          </AppText>
        </View>
        {doc.favorite ? <Icon name="star" color={t.primary} size={20} /> : null}
      </Pressable>
    );
  }

  const thumbHeight = Math.round(width * 1.38);
  return (
    <Pressable
      testID={`doc-${doc.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${doc.title}, ${pages}`}
      onPress={onOpen}
      onLongPress={onMenu}
      {...contextMenuProps(onMenu)}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.thumb,
          { height: thumbHeight, backgroundColor: '#FFFFFF', borderColor: selected ? t.primary : t.border },
          selected && { borderWidth: 2 },
        ]}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="contain" transition={120} />
        ) : (
          <Icon name="music-box-outline" size={40} color="#B9AFA3" />
        )}
        {doc.favorite ? (
          <View style={[styles.star, { backgroundColor: t.surface }]}>
            <Icon name="star" color={t.primary} size={18} />
          </View>
        ) : null}
      </View>
      <AppText variant={layout === 'recent' ? 'caption' : 'body'} numberOfLines={2} style={{ marginTop: SPACING.sm }}>
        {doc.title}
      </AppText>
      {layout === 'grid' ? (
        <AppText variant="caption" secondary>
          {pages}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function FolderCard({
  folder,
  width,
  onOpen,
  onMenu,
  count,
}: {
  folder: FolderRow;
  width: number;
  onOpen: () => void;
  onMenu: () => void;
  count?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      testID={`folder-${folder.id}`}
      accessibilityRole="button"
      accessibilityLabel={folder.name}
      onPress={onOpen}
      onLongPress={onMenu}
      {...contextMenuProps(onMenu)}
      style={({ pressed }) => [
        styles.folder,
        { width, backgroundColor: pressed ? t.surfaceAlt : t.surface, borderColor: t.border },
      ]}
    >
      <Icon name="folder" size={30} color={folder.color ?? t.primary} />
      <View style={{ flex: 1, marginLeft: SPACING.sm }}>
        <AppText numberOfLines={2} variant="label">
          {folder.name}
        </AppText>
        {count !== undefined ? (
          <AppText variant="caption" secondary>
            {count}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: {
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  star: { position: 'absolute', top: 6, right: 6, borderRadius: 14, padding: 3 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  listThumb: { width: 44, height: 60, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
    minHeight: 64,
  },
});
