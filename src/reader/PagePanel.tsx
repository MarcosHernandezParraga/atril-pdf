// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Page panel: slides in from the right with a small numbered picture of every
// page. From here pages are reordered (press, hold and drag, or the arrows),
// duplicated and deleted, and new pages are added: a blank page, the pages of
// another PDF, or an image. Every change can be undone.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PageRef } from '../core/model';
import { cardShadow, RADIUS, SPACING, useTheme } from '../theme';
import { DragSortList } from '../ui/DragSortList';
import { AppText, Button, Icon, IconButton } from '../ui/primitives';
import { fitWidth, PageView } from './PageView';

const ROW_HEIGHT = 84;
const ROW_GAP = 8;
const THUMB_W = 50;
const THUMB_H = 68;

export interface PagePanelActions {
  goTo: (index: number) => void;
  move: (from: number, to: number) => void;
  duplicate: (index: number) => void;
  remove: (index: number) => void;
  addBlank: () => void;
  addFiles: (kind: 'pdf' | 'image') => void;
}

function Thumb({ page }: { page: PageRef }) {
  const w = fitWidth(page, THUMB_W, THUMB_H);
  return (
    <View style={styles.thumbBox}>
      <PageView page={page} width={w} thumbnail />
    </View>
  );
}

export function PagePanel({
  pages,
  current,
  busy,
  onClose,
  actions,
}: {
  pages: PageRef[];
  current: number;
  busy: boolean;
  onClose: () => void;
  actions: PagePanelActions;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();
  const width = Math.min(400, Math.round(dims.width * 0.94));
  const [dragging, setDragging] = useState(false);

  const kindLabel = (p: PageRef) =>
    p.kind === 'blank'
      ? t('pages.blank')
      : p.kind === 'image'
        ? t('pages.image')
        : p.kind === 'staff'
          ? t('pages.staffPaper')
          : t('pages.pdfPage', { n: p.pageIndex + 1 });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="page-panel">
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(140)}
        style={[StyleSheet.absoluteFill, styles.backdrop]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          testID="page-panel-backdrop"
        />
      </Animated.View>
      <Animated.View
        entering={SlideInRight.duration(240)}
        exiting={SlideOutRight.duration(180)}
        style={[
          styles.panel,
          {
            width,
            backgroundColor: theme.surface,
            paddingTop: insets.top + SPACING.md,
            paddingBottom: insets.bottom + SPACING.sm,
          },
          cardShadow(theme, 3),
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading" accessibilityRole="header">
              {t('pages.title')}
            </AppText>
            <AppText variant="caption" secondary>
              {t('common.pages', { count: pages.length })}
            </AppText>
          </View>
          <IconButton icon="close" label={t('common.close')} onPress={onClose} testID="page-panel-close" />
        </View>

        <View style={styles.addRow}>
          <Button
            icon="file-outline"
            label={t('pages.addBlank')}
            variant="secondary"
            onPress={actions.addBlank}
            disabled={busy}
            style={styles.addButton}
            testID="page-add-blank"
          />
          <Button
            icon="file-pdf-box"
            label={t('pages.addPdf')}
            variant="secondary"
            onPress={() => actions.addFiles('pdf')}
            disabled={busy}
            style={styles.addButton}
            testID="page-add-pdf"
          />
          <Button
            icon="image-plus"
            label={t('pages.addImage')}
            variant="secondary"
            onPress={() => actions.addFiles('image')}
            disabled={busy}
            style={styles.addButton}
            testID="page-add-image"
          />
        </View>
        <AppText variant="caption" secondary style={styles.hint}>
          {t('pages.hint')}
        </AppText>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}
          scrollEnabled={!dragging}
        >
          <DragSortList
            items={pages}
            keyOf={(p) => p.id}
            rowHeight={ROW_HEIGHT + ROW_GAP}
            enabled={!busy}
            longPress
            onDragChange={setDragging}
            onReorder={(from, to) => actions.move(from, to)}
            testIDPrefix="page-row"
            renderRow={(page, i, lifted, guard) => {
              const n = i + 1;
              const isCurrent = i === current;
              return (
                <Pressable
                  onPress={guard(() => actions.goTo(i))}
                  accessibilityRole="button"
                  accessibilityLabel={t('reader.page', { page: n, total: pages.length })}
                  accessibilityState={{ selected: isCurrent }}
                  testID={`page-item-${n}`}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isCurrent ? theme.dropHighlight : theme.surfaceAlt,
                      borderColor: isCurrent || lifted ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  <Icon name="drag-vertical" size={20} color={theme.textSecondary} />
                  {isCurrent ? (
                    <View
                      testID="page-current"
                      style={[styles.currentMark, { backgroundColor: theme.primary }]}
                    />
                  ) : null}
                  <Thumb page={page} />
                  <View style={styles.rowText}>
                    <AppText variant="heading" style={{ color: isCurrent ? theme.primary : theme.text }}>
                      {n}
                    </AppText>
                    <AppText variant="caption" secondary numberOfLines={1}>
                      {kindLabel(page)}
                    </AppText>
                  </View>
                  <View style={styles.rowActions}>
                    <IconButton
                      icon="chevron-up"
                      label={t('pages.moveUp')}
                      size={20}
                      disabled={i === 0 || busy}
                      onPress={guard(() => actions.move(i, i - 1))}
                      testID={`page-up-${n}`}
                    />
                    <IconButton
                      icon="chevron-down"
                      label={t('pages.moveDown')}
                      size={20}
                      disabled={i === pages.length - 1 || busy}
                      onPress={guard(() => actions.move(i, i + 1))}
                      testID={`page-down-${n}`}
                    />
                    <IconButton
                      icon="content-copy"
                      label={t('pages.duplicate')}
                      size={20}
                      disabled={busy}
                      onPress={guard(() => actions.duplicate(i))}
                      testID={`page-dup-${n}`}
                    />
                    <IconButton
                      icon="trash-can-outline"
                      label={t('pages.delete')}
                      size={20}
                      color={theme.danger}
                      disabled={pages.length <= 1 || busy}
                      onPress={guard(() => actions.remove(i))}
                      testID={`page-del-${n}`}
                    />
                  </View>
                </Pressable>
              );
            }}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.28)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    borderTopLeftRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  addButton: { flexGrow: 1 },
  hint: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.xs,
  },
  thumbBox: {
    width: THUMB_W,
    height: THUMB_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  rowText: { flex: 1, minWidth: 28, marginLeft: SPACING.xs },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  currentMark: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 4, borderRadius: 2 },
});
