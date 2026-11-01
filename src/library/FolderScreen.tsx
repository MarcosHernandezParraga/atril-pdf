// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// A folder is a concert: its pieces are numbered (1, 2, 3...). In "Reorder"
// mode they can be moved with the arrows or by dragging them with the finger.
// Tapping a piece opens it alone; "Start concert" plays every piece in a row:
// turning the last page of a piece goes to the first page of the next one.
//
// The layout is deliberately simple (plain views, fixed row heights, no layout
// animations inside lists) so it renders the same on phones, tablets and computers.

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newId } from '../core/ids';
import type { DocumentRow, FolderRow } from '../db/schema';
import { useBackIcon, useDirectionProps } from '../i18n/useDirection';
import { getServices } from '../services';
import { cardShadow, RADIUS, SPACING, TOUCH, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { DragSortList, moveItem } from '../ui/DragSortList';
import { AppText, Button, Icon, IconButton } from '../ui/primitives';
import { createFolder, documentMenuItems, folderMenuItems, openDocument, startConcert } from './actions';
import { contextMenuProps, FolderTile, Thumbnail } from './DocumentCard';
import { useLibraryRefresh } from './libraryEvents';
import { pickFiles } from './pickFiles';
import type { FolderPiece } from './repository';
import { importAndReport } from './useExternalOpen';

const ROW = 78;
const GAP = 10;

export function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const backIcon = useBackIcon();
  const { style: direction, ...dirProps } = useDirectionProps();
  const { width } = useWindowDimensions();
  const version = useLibraryRefresh((s) => s.version);
  const bump = useLibraryRefresh((s) => s.bump);
  const [folder, setFolder] = useState<FolderRow | null>(null);
  const [subfolders, setSubfolders] = useState<FolderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pieces, setPieces] = useState<FolderPiece[] | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    const { repo } = getServices();
    const all = await repo.allFolders();
    return {
      folder: all.find((f) => f.id === id) ?? null,
      subfolders: all.filter((f) => f.parentId === id),
      pieces: await repo.folderPieces(id),
      counts: await repo.folderPieceCounts(),
    };
  }, [id]);

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchAll>>) => {
    setFolder(r.folder);
    setSubfolders(r.subfolders);
    setPieces(r.pieces);
    setCounts(r.counts);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchAll().then((r) => alive && apply(r));
    return () => {
      alive = false;
    };
  }, [fetchAll, apply, version]);

  useFocusEffect(
    useCallback(() => {
      void fetchAll().then(apply);
    }, [fetchAll, apply]),
  );

  const reorder = async (from: number, to: number) => {
    if (!pieces || from === to) return;
    const next = moveItem(pieces, from, to);
    setPieces(next);
    await getServices().repo.reorderFolder(
      id,
      next.map((p) => p.itemId),
    );
  };

  const pieceMenu = (piece: FolderPiece) =>
    void dialogs.menu(
      documentMenuItems(piece.doc, [
        {
          label: t('library.openPiece'),
          icon: 'book-open-variant',
          onPress: () => openDocument(piece.doc.id),
        },
        {
          label: t('library.removeFromFolder'),
          icon: 'playlist-remove',
          onPress: () => void getServices().repo.removeFromFolder([piece.itemId]).then(bump),
        },
      ]),
      piece.doc.title,
    );

  const importHere = async () => {
    const files = await pickFiles();
    if (files.length === 0) return;
    setBusy(true);
    try {
      await importAndReport(files, id);
    } finally {
      setBusy(false);
    }
  };

  if (!folder && pieces !== null) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.background }]}>
        <Button label={t('common.back')} icon={backIcon} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const color = folder?.color ?? theme.primary;
  const pad = width < 500 ? SPACING.lg : SPACING.xl;
  const contentWidth = Math.min(width, 900) - pad * 2;
  const subWidth = Math.floor((contentWidth - SPACING.md) / 2);
  const count = pieces?.length ?? 0;

  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: theme.background }, direction]}
      edges={['top', 'left', 'right']}
      {...dirProps}
    >
      <View style={[styles.topBar, { paddingHorizontal: pad - SPACING.sm }]}>
        <IconButton
          icon={backIcon}
          label={t('common.back')}
          onPress={() => router.back()}
          testID="folder-back"
        />
        <View style={styles.fill} />
        <IconButton
          icon="folder-plus-outline"
          label={t('library.newSubfolder')}
          onPress={() => void createFolder(id)}
        />
        {folder ? (
          <IconButton
            icon="dots-horizontal-circle-outline"
            label={t('library.folderOptions')}
            onPress={() =>
              void dialogs.menu(
                folderMenuItems(folder, () => router.back()),
                folder.name,
              )
            }
          />
        ) : null}
      </View>

      {pieces === null ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.xxl }} />
      ) : (
        <ScrollView
          scrollEnabled={!dragging}
          contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.hero, { backgroundColor: color }, cardShadow(theme, 2)]}>
            <View style={styles.heroRow}>
              <Icon name="folder-music" size={36} color="#FFFFFF" />
              <View style={{ flex: 1, marginStart: SPACING.md }}>
                <AppText variant="title" style={{ color: '#FFFFFF' }} numberOfLines={2} testID="folder-title">
                  {folder?.name ?? ''}
                </AppText>
                <AppText style={{ color: 'rgba(255,255,255,0.9)' }}>{t('library.pieces', { count })}</AppText>
              </View>
            </View>
            <Pressable
              testID="start-concert"
              accessibilityRole="button"
              accessibilityLabel={t('library.startConcert')}
              disabled={count === 0}
              onPress={() => pieces[0] && startConcert(id, pieces[0].doc.id)}
              style={({ pressed }) => [
                styles.playButton,
                { opacity: count === 0 ? 0.5 : pressed ? 0.85 : 1 },
              ]}
            >
              <Icon name="play" size={24} color={color} />
              <AppText variant="label" style={{ color: '#1D1B18', marginStart: SPACING.sm }}>
                {t('library.startConcert')}
              </AppText>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button
              testID="add-pieces"
              icon="playlist-plus"
              label={t('library.addPieces')}
              variant="secondary"
              onPress={() => setPicking(true)}
            />
            <Button
              icon="file-plus-outline"
              label={t('library.importHere')}
              variant="secondary"
              onPress={() => void importHere()}
            />
            {count > 1 ? (
              <Button
                testID="reorder"
                icon={reordering ? 'check' : 'swap-vertical'}
                label={reordering ? t('common.done') : t('library.reorder')}
                variant={reordering ? 'primary' : 'secondary'}
                onPress={() => setReordering((r) => !r)}
              />
            ) : null}
          </View>

          {count > 0 ? (
            <AppText variant="caption" secondary style={{ marginBottom: SPACING.md }}>
              {reordering ? t('library.reorderHint') : t('library.concertHint')}
            </AppText>
          ) : (
            <View style={styles.empty}>
              <Icon name="playlist-music-outline" size={48} color={theme.textSecondary} />
              <AppText secondary style={{ textAlign: 'center', marginTop: SPACING.sm, maxWidth: 420 }}>
                {t('library.emptyConcert')}
              </AppText>
            </View>
          )}

          <DragSortList
            items={pieces}
            keyOf={(p) => p.itemId}
            rowHeight={ROW + GAP}
            enabled={reordering}
            onDragChange={setDragging}
            onReorder={(from, to) => void reorder(from, to)}
            testIDPrefix="piece-row"
            renderRow={(item, index, isDragging) => (
              <Pressable
                testID={`piece-${index + 1}`}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. ${item.doc.title}`}
                onPress={() => (reordering ? undefined : openDocument(item.doc.id))}
                onLongPress={reordering ? undefined : () => pieceMenu(item)}
                {...contextMenuProps(() => pieceMenu(item))}
                style={({ pressed }) => [
                  styles.piece,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isDragging ? theme.primary : theme.border,
                    opacity: pressed && !reordering ? 0.85 : 1,
                  },
                ]}
              >
                {reordering ? <Icon name="drag-vertical" size={26} color={theme.textSecondary} /> : null}
                <View style={[styles.number, { backgroundColor: color }]}>
                  <AppText variant="label" style={{ color: '#FFFFFF' }}>
                    {index + 1}
                  </AppText>
                </View>
                <Thumbnail doc={item.doc} width={42} height={58} radius={8} />
                <View style={{ flex: 1, marginStart: SPACING.sm }}>
                  <AppText variant="label" numberOfLines={2}>
                    {item.doc.title}
                  </AppText>
                  <AppText variant="caption" secondary>
                    {t('common.pages', { count: item.doc.pageCount })}
                  </AppText>
                </View>
                {reordering ? (
                  <>
                    <IconButton
                      icon="chevron-up"
                      label={t('library.moveUp')}
                      disabled={index === 0}
                      onPress={() => void reorder(index, index - 1)}
                      testID={`up-${index + 1}`}
                    />
                    <IconButton
                      icon="chevron-down"
                      label={t('library.moveDown')}
                      disabled={index === count - 1}
                      onPress={() => void reorder(index, index + 1)}
                      testID={`down-${index + 1}`}
                    />
                  </>
                ) : (
                  <IconButton
                    icon="dots-horizontal"
                    label={t('library.moreOptions')}
                    onPress={() => pieceMenu(item)}
                  />
                )}
              </Pressable>
            )}
          />

          {subfolders.length > 0 ? (
            <View style={{ marginTop: SPACING.xl }}>
              <AppText variant="heading" style={{ marginBottom: SPACING.md }}>
                {t('library.subfolders')}
              </AppText>
              <View style={styles.subGrid}>
                {subfolders.map((f, i) => (
                  <FolderTile
                    key={f.id}
                    index={i}
                    folder={f}
                    width={subWidth}
                    count={counts[f.id] ?? 0}
                    onOpen={() => router.push({ pathname: '/folder/[id]', params: { id: f.id } })}
                    onMenu={() => void dialogs.menu(folderMenuItems(f), f.name)}
                    onPlay={async () => {
                      const ps = await getServices().repo.folderPieces(f.id);
                      if (ps[0]) startConcert(f.id, ps[0].doc.id);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <PickDocuments
        visible={picking}
        exclude={new Set(pieces?.map((p) => p.doc.id) ?? [])}
        onClose={() => setPicking(false)}
        onPick={async (ids) => {
          setPicking(false);
          if (ids.length === 0) return;
          await getServices().repo.addToFolder(id, ids, newId);
          bump();
        }}
      />
      {busy ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: theme.dropHighlight }]}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** Multi-selection of documents of the library (to add pieces to a concert). */
function PickDocuments({
  visible,
  exclude,
  onClose,
  onPick,
}: {
  visible: boolean;
  exclude: Set<string>;
  onClose: () => void;
  onPick: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void getServices()
      .repo.listDocuments({ sort: 'recent', search })
      .then((d) => alive && setDocs(d));
    return () => {
      alive = false;
    };
  }, [visible, search]);

  const toggle = (docId: string) =>
    setSelected((s) => (s.includes(docId) ? s.filter((x) => x !== docId) : [...s, docId]));
  const close = () => {
    setSelected([]);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close} statusBarTranslucent>
      <View style={styles.sheetBackdrop}>
        <View
          style={[styles.sheet, { backgroundColor: theme.background, maxHeight: height * 0.88 }]}
          testID="pick-documents"
        >
          <View style={styles.sheetHeader}>
            <AppText variant="heading" style={styles.fill}>
              {t('library.choosePieces')}
            </AppText>
            <IconButton icon="close" label={t('common.close')} onPress={close} />
          </View>
          <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Icon name="magnify" color={theme.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('library.search')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <FlatList
            data={docs.filter((d) => !exclude.has(d.id))}
            keyExtractor={(d) => d.id}
            style={{ flexGrow: 0, flexShrink: 1 }}
            renderItem={({ item }) => {
              const on = selected.includes(item.id);
              const order = selected.indexOf(item.id) + 1;
              return (
                <Pressable
                  testID={`pick-${item.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(item.id)}
                  style={[styles.pickRow, { backgroundColor: on ? theme.dropHighlight : 'transparent' }]}
                >
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: on ? theme.primary : theme.border,
                        backgroundColor: on ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    {on ? (
                      <AppText style={{ color: theme.onPrimary, fontWeight: '700' }}>{order}</AppText>
                    ) : null}
                  </View>
                  <Thumbnail doc={item} width={36} height={48} radius={6} />
                  <AppText style={{ flex: 1, marginStart: SPACING.md }} numberOfLines={2}>
                    {item.title}
                  </AppText>
                </Pressable>
              );
            }}
          />
          <Button
            testID="pick-confirm"
            icon="playlist-plus"
            label={`${t('library.add')}${selected.length ? ` (${selected.length})` : ''}`}
            disabled={selected.length === 0}
            onPress={() => {
              const ids = selected;
              setSelected([]);
              setSearch('');
              onPick(ids);
            }}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  content: { paddingTop: SPACING.sm, paddingBottom: 120, width: '100%', maxWidth: 900, alignSelf: 'center' },
  hero: { borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  playButton: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xl,
    minHeight: TOUCH + 4,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  piece: {
    height: ROW,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: 40 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  sheet: { width: '100%', maxWidth: 640, borderRadius: RADIUS.xl, padding: SPACING.xl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingStart: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 16, minHeight: TOUCH, paddingHorizontal: SPACING.sm },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
