// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Home screen. From top to bottom: title and author, "Open / Import", search,
// "Folders · Concerts" (with "New folder") and all documents, most recent first.

import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { APP_AUTHOR, APP_NAME } from '../config/identity';
import { getDesktopBridge } from '../platform/desktopBridge';
import type { DocumentRow, FolderRow } from '../db/schema';
import { useBackIcon, useIsRtl } from '../i18n/useDirection';
import { getServices } from '../services';
import { useSettings } from '../settings/store';
import { cardShadow, RADIUS, SPACING, TOUCH, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { AppText, Button, Icon, IconButton, Screen, type IconName } from '../ui/primitives';
import {
  createFolder,
  deleteForever,
  documentMenuItems,
  folderMenuItems,
  openDocument,
  startConcert,
} from './actions';
import { DocumentCard, FolderTile, NewFolderTile, Thumbnail } from './DocumentCard';
import { InstallHint } from './InstallHint';
import { useDragToFolder } from './useDragToFolder';
import { useLibraryRefresh } from './libraryEvents';
import { pickFiles } from './pickFiles';
import { useDesktopDrop } from './useDesktopDrop';
import { importAndReport } from './useExternalOpen';
import { newId } from '../core/ids';

type LibraryView = 'all' | 'favorites' | 'trash';

export function LibraryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const backIcon = useBackIcon();
  const rtl = useIsRtl();
  const params = useLocalSearchParams<{ view?: LibraryView }>();
  const view: LibraryView = params.view ?? 'all';
  const { width } = useWindowDimensions();
  const libSettings = useSettings((s) => s.settings.library);
  const update = useSettings((s) => s.update);
  const version = useLibraryRefresh((s) => s.version);
  const bump = useLibraryRefresh((s) => s.bump);

  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    const { repo } = getServices();
    return Promise.all([
      repo.listDocuments({
        search,
        sort: libSettings.sort,
        favoritesOnly: view === 'favorites',
        trash: view === 'trash',
      }),
      repo.allFolders(),
      repo.folderPieceCounts(),
    ] as const);
  }, [search, libSettings.sort, view]);

  const apply = useCallback(([d, f, c]: Awaited<ReturnType<typeof fetchAll>>) => {
    setDocs(d);
    setFolders(f);
    setCounts(c);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchAll().then((r) => alive && apply(r));
    return () => {
      alive = false;
    };
  }, [fetchAll, apply, version]);

  // Reload when coming back from the reader (most recent first, thumbnails...).
  useFocusEffect(
    useCallback(() => {
      void fetchAll().then(apply);
    }, [fetchAll, apply]),
  );

  const topFolders = useMemo(
    () => (view === 'all' && !search.trim() ? folders.filter((f) => f.parentId === null) : []),
    [folders, view, search],
  );

  const pagePad = width < 500 ? SPACING.lg : SPACING.xl;
  const contentWidth = Math.min(width, 1400) - pagePad * 2;
  const columns = Math.max(2, Math.floor(contentWidth / (width < 500 ? 150 : 190)));
  const cardWidth = Math.floor((contentWidth - SPACING.lg * (columns - 1)) / columns);
  const folderColumns = Math.max(2, Math.floor(contentWidth / (width < 500 ? 160 : 220)));
  const folderWidth = Math.floor((contentWidth - SPACING.md * (folderColumns - 1)) / folderColumns);

  const doImport = async () => {
    const files = await pickFiles();
    if (files.length === 0) return;
    setBusy(t('library.importing', { name: files.length === 1 ? files[0]!.name : `${files.length}` }));
    try {
      const r = await importAndReport(files, null);
      if (files.length === 1 && r.documentIds[0]) openDocument(r.documentIds[0]);
    } finally {
      setBusy(null);
    }
  };

  const dropActive = useDesktopDrop(async (files) => {
    setBusy(t('library.importing', { name: files.length === 1 ? files[0]!.name : `${files.length}` }));
    try {
      await importAndReport(files, null);
    } finally {
      setBusy(null);
    }
  });

  const play = async (folder: FolderRow) => {
    const pieces = await getServices().repo.folderPieces(folder.id);
    if (pieces[0]) startConcert(folder.id, pieces[0].doc.id);
  };

  const docMenu = (doc: DocumentRow) => {
    const { repo } = getServices();
    if (view === 'trash') {
      void dialogs.menu(
        [
          {
            label: t('library.restore'),
            icon: 'restore',
            onPress: () => void repo.restoreDocuments([doc.id]).then(bump),
          },
          {
            label: t('library.deleteForever'),
            icon: 'delete-forever',
            danger: true,
            onPress: () => void deleteForever([doc]),
          },
        ],
        doc.title,
      );
      return;
    }
    void dialogs.menu(
      documentMenuItems(doc, [
        { label: t('library.open'), icon: 'book-open-variant', onPress: () => openDocument(doc.id) },
      ]),
      doc.title,
    );
  };

  // Press and hold a document, then drop it on a folder to add it to that concert.
  const {
    drag: dragging,
    handlers: dragHandlers,
    target: dropTarget,
    lateTarget: lateDropTarget,
    layerRef: dragLayerRef,
  } = useDragToFolder({
    onDrop: (doc, folderId) => {
      const folder = folders.find((f) => f.id === folderId);
      void getServices()
        .repo.addToFolder(folderId, [doc.id], newId)
        .then((added) => {
          bump();
          dialogs.toast(
            added > 0
              ? t('library.addedToFolder', { name: folder?.name ?? '' })
              : t('library.alreadyInFolder', { name: folder?.name ?? '' }),
          );
        });
    },
    onHoldWithoutMoving: (doc) => docMenu(doc),
  });
  const canDrag = view === 'all' && folders.some((f) => f.parentId === null);

  const title =
    view === 'trash' ? t('library.trash') : view === 'favorites' ? t('library.favorites') : APP_NAME;
  const layout = libSettings.view;
  const sortLabel =
    libSettings.sort === 'name'
      ? t('library.sortName')
      : libSettings.sort === 'added'
        ? t('library.sortAdded')
        : t('library.sortRecent');

  const header = (
    <View style={{ paddingTop: SPACING.lg }}>
      {view === 'all' ? (
        <>
          <Button
            testID="import-button"
            icon="file-plus-outline"
            label={t('library.import')}
            onPress={() => void doImport()}
            style={{ marginBottom: SPACING.lg }}
            accessibilityHint={t('library.importHint')}
          />
          <InstallHint />
          <View style={[styles.search, { backgroundColor: theme.surface }, cardShadow(theme, 1)]}>
            <Icon name="magnify" color={theme.textSecondary} />
            <TextInput
              testID="search-input"
              value={search}
              onChangeText={setSearch}
              placeholder={t('library.search')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text, textAlign: rtl ? 'right' : 'left' }]}
              accessibilityLabel={t('library.search')}
            />
            {search ? (
              <IconButton icon="close-circle" label={t('common.close')} onPress={() => setSearch('')} />
            ) : null}
          </View>

          {!search.trim() ? (
            <>
              <SectionTitle title={t('library.foldersConcerts')} icon="folder-music-outline" />
              <View style={styles.folderGrid}>
                <NewFolderTile
                  width={folderWidth}
                  label={t('library.newFolder')}
                  onPress={() => void createFolder(null)}
                />
                {topFolders.map((f, i) => (
                  <FolderTile
                    key={f.id}
                    index={i}
                    folder={f}
                    width={folderWidth}
                    count={counts[f.id] ?? 0}
                    onOpen={() => router.push({ pathname: '/folder/[id]', params: { id: f.id } })}
                    onMenu={() => void dialogs.menu(folderMenuItems(f), f.name)}
                    onPlay={() => void play(f)}
                    dropRef={dropTarget(f.id)}
                    highlighted={dragging?.overId === f.id}
                  />
                ))}
              </View>
              {topFolders.length === 0 ? (
                <AppText variant="caption" secondary style={{ marginTop: SPACING.sm }}>
                  {t('library.noFoldersHint')}
                </AppText>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <SectionTitle
        title={view === 'all' ? t('library.allDocuments') : title}
        icon="file-document-multiple-outline"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}>
        <Chip
          icon="sort"
          label={sortLabel}
          onPress={() =>
            update((s) => ({
              ...s,
              library: {
                ...s.library,
                sort: s.library.sort === 'recent' ? 'name' : s.library.sort === 'name' ? 'added' : 'recent',
              },
            }))
          }
        />
        <Chip
          icon={layout === 'grid' ? 'view-list-outline' : 'view-grid-outline'}
          label={layout === 'grid' ? t('library.viewList') : t('library.viewGrid')}
          onPress={() =>
            update((s) => ({
              ...s,
              library: { ...s.library, view: s.library.view === 'grid' ? 'list' : 'grid' },
            }))
          }
        />
        <Chip
          icon="star-outline"
          label={t('library.favorites')}
          active={view === 'favorites'}
          onPress={() =>
            router.push({ pathname: '/', params: { view: view === 'favorites' ? 'all' : 'favorites' } })
          }
        />
        <Chip
          icon="trash-can-outline"
          label={t('library.trash')}
          active={view === 'trash'}
          onPress={() => router.push({ pathname: '/', params: { view: view === 'trash' ? 'all' : 'trash' } })}
        />
        {view === 'trash' && docs && docs.length > 0 ? (
          <Chip
            icon="delete-sweep-outline"
            label={t('library.emptyTrash')}
            onPress={() => void deleteForever(docs)}
          />
        ) : null}
      </ScrollView>
    </View>
  );

  const empty =
    docs === null ? (
      <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.xxl }} />
    ) : (
      <View style={styles.empty} testID="library-empty">
        <Icon
          name={view === 'trash' ? 'trash-can-outline' : 'file-music-outline'}
          size={56}
          color={theme.textSecondary}
        />
        <AppText variant="heading" style={{ marginTop: SPACING.md, textAlign: 'center' }}>
          {search.trim()
            ? t('library.noResults')
            : view === 'trash'
              ? t('library.trashEmpty')
              : t('library.empty')}
        </AppText>
        {view === 'all' && !search.trim() ? (
          <AppText secondary style={{ marginTop: SPACING.sm, textAlign: 'center', maxWidth: 420 }}>
            {t(Platform.OS === 'web' && !getDesktopBridge() ? 'library.emptyHintWeb' : 'library.emptyHint', {
              app: APP_NAME,
            })}
          </AppText>
        ) : null}
      </View>
    );

  return (
    <Screen>
      <View ref={dragLayerRef as never} collapsable={false} style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingHorizontal: pagePad }]}>
          {view !== 'all' ? (
            <IconButton icon={backIcon} label={t('common.back')} onPress={() => router.back()} />
          ) : null}
          {view === 'all' ? (
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <View style={{ flex: 1, marginStart: SPACING.md }}>
            <AppText variant="title" numberOfLines={1} accessibilityRole="header">
              {title}
            </AppText>
            {view === 'all' ? (
              <AppText variant="caption" secondary testID="made-by">
                {t('library.madeBy', { author: APP_AUTHOR })}
              </AppText>
            ) : null}
          </View>
          <IconButton
            icon="cog-outline"
            label={t('library.settings')}
            onPress={() => router.push('/settings')}
            testID="open-settings"
            style={{ backgroundColor: theme.surface, ...cardShadow(theme, 1) }}
          />
        </View>
        <FlatList
          key={`${layout}-${columns}`}
          data={docs ?? []}
          keyExtractor={(d) => d.id}
          numColumns={layout === 'grid' ? columns : 1}
          // Libraries of hundreds of scores: only the cards near the screen are
          // kept, so memory does not grow with the number of scores.
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{
            paddingHorizontal: pagePad,
            paddingBottom: 120,
            width: '100%',
            maxWidth: 1400,
            alignSelf: 'center',
          }}
          columnWrapperStyle={layout === 'grid' ? { gap: SPACING.lg, marginBottom: SPACING.xl } : undefined}
          renderItem={({ item, index }) => (
            <DocumentCard
              doc={item}
              index={index}
              width={cardWidth}
              layout={layout}
              onOpen={() => (view === 'trash' ? docMenu(item) : openDocument(item.id))}
              onMenu={() => docMenu(item)}
              drag={canDrag ? dragHandlers : undefined}
              lifted={dragging?.doc.id === item.id}
            />
          )}
          scrollEnabled={!dragging}
        />
        {dragging ? (
          <View
            pointerEvents="box-none"
            // Positions follow the finger on screen: always measured left to right.
            style={[StyleSheet.absoluteFill, { direction: 'ltr' }]}
            {...(Platform.OS === 'web' ? ({ dir: 'ltr' } as object) : {})}
            testID="drag-layer"
          >
            {/* Every folder, always reachable while dragging (even if scrolled away). */}
            <View
              pointerEvents="none"
              style={[styles.dropBar, { backgroundColor: theme.surface }, cardShadow(theme, 3)]}
            >
              <AppText variant="caption" secondary style={{ marginBottom: SPACING.xs }}>
                {t('library.dragToFolder')}
              </AppText>
              <View style={styles.dropChips}>
                {topFolders.map((f) => {
                  const over = dragging?.overId === f.id;
                  return (
                    <View
                      key={f.id}
                      ref={lateDropTarget(f.id) as never}
                      collapsable={false}
                      testID={`drop-chip-${f.id}`}
                      style={[
                        styles.dropChip,
                        { backgroundColor: f.color ?? theme.primary },
                        over && { transform: [{ scale: 1.08 }], borderColor: theme.accent, borderWidth: 3 },
                      ]}
                    >
                      <Icon name="folder-music" size={18} color="#FFFFFF" />
                      <AppText variant="label" style={{ color: '#FFFFFF', marginStart: 6 }} numberOfLines={1}>
                        {f.name}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
            <View
              pointerEvents="none"
              style={[styles.ghost, { left: dragging.x - 44, top: dragging.y - 60 }, cardShadow(theme, 3)]}
            >
              <Thumbnail doc={dragging.doc} width={88} height={120} radius={RADIUS.md} />
            </View>
          </View>
        ) : null}
        {busy || dropActive ? (
          <View
            style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.dropHighlight }]}
            pointerEvents="none"
          >
            <View style={[styles.busy, { backgroundColor: theme.surface }, cardShadow(theme, 3)]}>
              {busy ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Icon name="tray-arrow-down" size={32} color={theme.primary} />
              )}
              <AppText style={{ marginStart: SPACING.md }}>{busy ?? t('library.dropHere')}</AppText>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export function SectionTitle({
  title,
  icon,
  right,
}: {
  title: string;
  icon: IconName;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} size={22} color={theme.primary} />
      <AppText variant="heading" style={{ flex: 1, marginStart: SPACING.sm }}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

export function Chip({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Button
      label={label}
      icon={icon}
      onPress={onPress}
      variant={active ? 'primary' : 'secondary'}
      style={{ minHeight: TOUCH - 4 }}
      testID={`chip-${label}`}
    />
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  logo: { width: 48, height: 48, borderRadius: 14 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    paddingStart: SPACING.lg,
    minHeight: TOUCH + 4,
  },
  searchInput: { flex: 1, fontSize: 16, paddingHorizontal: SPACING.sm, minHeight: TOUCH },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  toolbar: { gap: SPACING.sm, paddingBottom: SPACING.lg },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: SPACING.lg },
  overlay: { alignItems: 'center', justifyContent: 'center' },
  busy: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xl, borderRadius: RADIUS.xl },
  dropBar: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  dropChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  dropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
    maxWidth: 260,
  },
  ghost: {
    position: 'absolute',
    width: 88,
    height: 120,
    borderRadius: RADIUS.md,
    transform: [{ rotate: '-4deg' }, { scale: 1.05 }],
  },
});
