// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// A folder is a concert: its pieces are numbered (1, 2, 3...) and can be
// reordered. Tapping a piece opens it alone; "Start concert" plays every piece
// in a row: turning the last page of a piece goes to the first page of the next.

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newId } from '../core/ids';
import type { DocumentRow, FolderRow } from '../db/schema';
import { getServices } from '../services';
import { cardShadow, RADIUS, SPACING, TOUCH, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { Pressable3D } from '../ui/Pressable3D';
import { AppText, Button, Icon, IconButton } from '../ui/primitives';
import { createFolder, documentMenuItems, folderMenuItems, openDocument, startConcert } from './actions';
import { contextMenuProps, entering, FolderTile, Thumbnail } from './DocumentCard';
import { SectionTitle } from './LibraryScreen';
import { useLibraryRefresh } from './libraryEvents';
import { pickFiles } from './pickFiles';
import { importAndReport } from './useExternalOpen';
import type { FolderPiece } from './repository';

export function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const version = useLibraryRefresh((s) => s.version);
  const bump = useLibraryRefresh((s) => s.bump);
  const [folder, setFolder] = useState<FolderRow | null>(null);
  const [subfolders, setSubfolders] = useState<FolderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pieces, setPieces] = useState<FolderPiece[] | null>(null);
  const [reordering, setReordering] = useState(false);
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

  const move = async (index: number, delta: -1 | 1) => {
    if (!pieces) return;
    const target = index + delta;
    if (target < 0 || target >= pieces.length) return;
    const next = [...pieces];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPieces(next);
    await getServices().repo.reorderFolder(id, next.map((p) => p.itemId));
  };

  const pieceMenu = (piece: FolderPiece) =>
    void dialogs.menu(
      documentMenuItems(piece.doc, [
        { label: t('library.openPiece'), icon: 'book-open-variant', onPress: () => openDocument(piece.doc.id) },
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
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Button label={t('common.back')} icon="arrow-left" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const color = folder?.color ?? theme.primary;
  const pad = width < 500 ? SPACING.lg : SPACING.xl;
  const subWidth = Math.min(220, (Math.min(width, 900) - pad * 2 - SPACING.md) / 2);

  const header = (
    <View>
      <Animated.View entering={ZoomIn.springify().damping(16)} style={[styles.hero, { backgroundColor: color }, cardShadow(theme, 3)]}>
        <Icon name="folder-music" size={40} color="#FFFFFF" />
        <AppText variant="title" style={{ color: '#FFFFFF', marginTop: SPACING.sm }} numberOfLines={2} testID="folder-title">
          {folder?.name ?? ''}
        </AppText>
        <AppText style={{ color: 'rgba(255,255,255,0.9)' }}>{t('library.pieces', { count: pieces?.length ?? 0 })}</AppText>
        <Button
          testID="start-concert"
          icon="play"
          label={t('library.startConcert')}
          disabled={!pieces || pieces.length === 0}
          onPress={() => pieces?.[0] && startConcert(id, pieces[0].doc.id)}
          variant="secondary"
          style={{ marginTop: SPACING.lg, alignSelf: 'flex-start', backgroundColor: '#FFFFFF' }}
        />
      </Animated.View>
      <View style={styles.actions}>
        <Button testID="add-pieces" icon="playlist-plus" label={t('library.addPieces')} variant="secondary" onPress={() => setPicking(true)} />
        <Button icon="file-plus-outline" label={t('library.importHere')} variant="secondary" onPress={() => void importHere()} />
        {pieces && pieces.length > 1 ? (
          <Button
            testID="reorder"
            icon={reordering ? 'check' : 'swap-vertical'}
            label={reordering ? t('common.done') : t('library.reorder')}
            variant={reordering ? 'primary' : 'secondary'}
            onPress={() => setReordering((r) => !r)}
          />
        ) : null}
      </View>
      {pieces && pieces.length > 0 ? (
        <AppText variant="caption" secondary style={{ marginBottom: SPACING.md }}>
          {t('library.concertHint')}
        </AppText>
      ) : null}
      {subfolders.length > 0 ? (
        <>
          <SectionTitle title={t('library.foldersConcerts')} icon="folder-outline" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg }}>
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
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.topBar, { paddingHorizontal: pad - SPACING.sm }]}>
        <IconButton icon="arrow-left" label={t('common.back')} onPress={() => router.back()} testID="folder-back" />
        <View style={{ flex: 1 }} />
        <IconButton icon="folder-plus-outline" label={t('library.newSubfolder')} onPress={() => void createFolder(id)} />
        {folder ? (
          <IconButton
            icon="dots-horizontal-circle-outline"
            label={t('library.color')}
            onPress={() => void dialogs.menu(folderMenuItems(folder, () => router.back()), folder.name)}
          />
        ) : null}
      </View>
      {pieces === null ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.xxl }} />
      ) : (
        <FlatList
          data={pieces}
          keyExtractor={(p) => p.itemId}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: pad, paddingBottom: 120, maxWidth: 900, width: '100%', alignSelf: 'center' }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="playlist-music-outline" size={48} color={theme.textSecondary} />
              <AppText secondary style={{ textAlign: 'center', marginTop: SPACING.sm, maxWidth: 420 }}>
                {t('library.emptyConcert')}
              </AppText>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={entering(index)} layout={LinearTransition.springify().damping(18)}>
              <Pressable3D
                testID={`piece-${index + 1}`}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. ${item.doc.title}`}
                onPress={() => (reordering ? undefined : openDocument(item.doc.id))}
                onLongPress={() => pieceMenu(item)}
                tilt={3}
                depth={0.98}
                style={[styles.piece, { backgroundColor: theme.surface }, cardShadow(theme, 1)]}
                contentStyle={styles.pieceContent}
                {...contextMenuProps(() => pieceMenu(item))}
              >
                <View style={[styles.number, { backgroundColor: color }]}>
                  <AppText variant="label" style={{ color: '#FFFFFF' }}>
                    {index + 1}
                  </AppText>
                </View>
                <Thumbnail doc={item.doc} width={44} height={60} radius={8} />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <AppText variant="label" numberOfLines={2}>
                    {item.doc.title}
                  </AppText>
                  <AppText variant="caption" secondary>
                    {t('common.pages', { count: item.doc.pageCount })}
                  </AppText>
                </View>
                {reordering ? (
                  <>
                    <IconButton icon="chevron-up" label={t('library.moveUp')} disabled={index === 0} onPress={() => void move(index, -1)} testID={`up-${index + 1}`} />
                    <IconButton
                      icon="chevron-down"
                      label={t('library.moveDown')}
                      disabled={index === pieces.length - 1}
                      onPress={() => void move(index, 1)}
                      testID={`down-${index + 1}`}
                    />
                  </>
                ) : (
                  <IconButton icon="dots-horizontal" label={t('common.rename')} onPress={() => pieceMenu(item)} />
                )}
              </Pressable3D>
            </Animated.View>
          )}
        />
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
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.dropHighlight }]}>
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

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const close = () => {
    setSelected([]);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]} testID="pick-documents">
          <View style={styles.sheetHeader}>
            <AppText variant="heading" style={{ flex: 1 }}>
              {t('library.choosePieces')}
            </AppText>
            <IconButton icon="close" label={t('common.close')} onPress={close} />
          </View>
          <View style={[styles.search, { backgroundColor: theme.surface }]}>
            <Icon name="magnify" color={theme.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('library.search')}
              placeholderTextColor={theme.textSecondary}
              style={{ flex: 1, color: theme.text, fontSize: 16, minHeight: TOUCH, paddingHorizontal: SPACING.sm }}
            />
          </View>
          <FlatList
            data={docs.filter((d) => !exclude.has(d.id))}
            keyExtractor={(d) => d.id}
            style={{ flexGrow: 0, maxHeight: 420 }}
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
                  <View style={[styles.check, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : 'transparent' }]}>
                    {on ? <AppText style={{ color: theme.onPrimary, fontWeight: '700' }}>{order}</AppText> : null}
                  </View>
                  <Thumbnail doc={item} width={36} height={48} radius={6} />
                  <AppText style={{ flex: 1, marginLeft: SPACING.md }} numberOfLines={2}>
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
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  hero: { borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  piece: { borderRadius: RADIUS.lg, marginBottom: SPACING.sm },
  pieceContent: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, paddingLeft: SPACING.md, gap: SPACING.sm },
  number: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 640, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  search: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.pill, paddingLeft: SPACING.lg, marginBottom: SPACING.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, gap: SPACING.sm },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
