// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Home screen: the library. Import button, recent documents, folders and all
// documents, with search, sorting and favourites.

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { newId } from '../core/ids';
import type { DocumentRow, FolderRow } from '../db/schema';
import { APP_NAME } from '../config/identity';
import { getServices } from '../services';
import { useSettings } from '../settings/store';
import { FOLDER_COLORS, RADIUS, SPACING, TOUCH, useTheme } from '../theme';
import { dialogs } from '../ui/dialogs';
import { AppText, Button, Icon, IconButton, Screen } from '../ui/primitives';
import { DocumentCard, FolderCard } from './DocumentCard';
import { useLibraryRefresh } from './libraryEvents';
import { pickFiles } from './pickFiles';
import { useDesktopDrop } from './useDesktopDrop';
import { importAndReport } from './useExternalOpen';

type View_ = 'all' | 'favorites' | 'trash';

export function LibraryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ folder?: string; view?: View_ }>();
  const folderId = params.folder ?? null;
  const view: View_ = params.view ?? 'all';
  const { width } = useWindowDimensions();
  const libSettings = useSettings((s) => s.settings.library);
  const update = useSettings((s) => s.update);
  const version = useLibraryRefresh((s) => s.version);
  const bump = useLibraryRefresh((s) => s.bump);

  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [recents, setRecents] = useState<DocumentRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [path, setPath] = useState<FolderRow[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    const { repo } = getServices();
    const searching = search.trim().length > 0;
    return Promise.all([
      repo.listDocuments({
        folderId: searching || view !== 'all' ? undefined : folderId,
        search,
        sort: libSettings.sort,
        favoritesOnly: view === 'favorites',
        trash: view === 'trash',
      }),
      repo.recentDocuments(10),
      repo.allFolders(),
      repo.folderPath(folderId),
    ] as const);
  }, [folderId, search, libSettings.sort, view]);

  const load = useCallback(() => {
    void fetchAll().then(([d, r, f, p]) => {
      setDocs(d);
      setRecents(r);
      setFolders(f);
      setPath(p);
    });
  }, [fetchAll]);

  useEffect(() => {
    let alive = true;
    void fetchAll().then(([d, r, f, p]) => {
      if (!alive) return;
      setDocs(d);
      setRecents(r);
      setFolders(f);
      setPath(p);
    });
    return () => {
      alive = false;
    };
  }, [fetchAll, version]);

  // Reload when coming back from the reader (recent documents, page counts, thumbnails).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const childFolders = useMemo(
    () => (view === 'all' && !search.trim() ? folders.filter((f) => f.parentId === folderId) : []),
    [folders, folderId, view, search],
  );

  const contentWidth = Math.min(width, 1400) - SPACING.lg * 2;
  const columns = Math.max(2, Math.floor(contentWidth / (width < 500 ? 150 : 180)));
  const cardWidth = Math.floor((contentWidth - SPACING.lg * (columns - 1)) / columns);
  const folderColumns = Math.max(1, Math.floor(contentWidth / 240));
  const folderWidth = Math.floor((contentWidth - SPACING.md * (folderColumns - 1)) / folderColumns);

  const doImport = async () => {
    const files = await pickFiles();
    if (files.length === 0) return;
    setBusy(t('library.importing', { name: files.length === 1 ? files[0]!.name : `${files.length}` }));
    try {
      const r = await importAndReport(files, folderId);
      if (files.length === 1 && r.documentIds[0]) open(r.documentIds[0]);
    } finally {
      setBusy(null);
    }
  };

  const dropActive = useDesktopDrop(async (files) => {
    setBusy(t('library.importing', { name: files.length === 1 ? files[0]!.name : `${files.length}` }));
    try {
      await importAndReport(files, folderId);
    } finally {
      setBusy(null);
    }
  });

  const open = (id: string) => router.push({ pathname: '/reader/[id]', params: { id } });
  const openFolder = (id: string | null) =>
    id ? router.push({ pathname: '/', params: { folder: id } }) : router.dismissTo('/');

  const chooseFolder = async (title: string, exclude?: string): Promise<string | null | undefined> =>
    new Promise((resolve) => {
      const options = folders.filter((f) => f.id !== exclude);
      void dialogs
        .menu(
          [
            { label: t('library.moveToRoot'), icon: 'home-outline', onPress: () => resolve(null) },
            ...options.map((f) => ({ label: f.name, icon: 'folder-outline' as const, onPress: () => resolve(f.id) })),
          ],
          title,
        )
        .then(() => setTimeout(() => resolve(undefined), 0));
    });

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
      [
        { label: t('library.open'), icon: 'book-open-variant', onPress: () => open(doc.id) },
        {
          label: t('common.rename'),
          icon: 'pencil-outline',
          onPress: async () => {
            const name = await dialogs.prompt(t('common.rename'), { initial: doc.title });
            if (name) await repo.renameDocument(doc.id, name);
            bump();
          },
        },
        {
          label: doc.favorite ? t('library.unfavorite') : t('library.favorite'),
          icon: doc.favorite ? 'star-off-outline' : 'star-outline',
          onPress: () => void repo.setFavorite(doc.id, !doc.favorite).then(bump),
        },
        {
          label: t('library.moveTo'),
          icon: 'folder-move-outline',
          onPress: async () => {
            const target = await chooseFolder(t('library.moveTo'));
            if (target !== undefined) await repo.moveDocuments([doc.id], target);
            bump();
          },
        },
        {
          label: t('library.duplicate'),
          icon: 'content-copy',
          onPress: async () => {
            const model = await repo.loadModel(doc.id);
            if (!model) return;
            const { extractPages } = await import('../core/commands');
            const copy = extractPages(
              model,
              model.pages.map((p) => p.id),
              newId,
            );
            await repo.createDocument({
              id: newId(),
              title: `${doc.title} (${t('library.copySuffix')})`,
              folderId: doc.folderId,
              model: copy,
              sources: [],
            });
            bump();
          },
        },
        {
          label: t('library.restoreOriginal'),
          icon: 'file-restore-outline',
          onPress: async () => {
            const ok = await dialogs.confirm(t('library.restoreOriginal'), {
              message: t('library.restoreOriginalConfirm', { name: doc.title }),
              danger: true,
            });
            if (!ok) return;
            await repo.restoreOriginal(doc.id);
            await getServices().thumbnails.invalidate(doc.id, doc.thumbnailPath);
            bump();
          },
        },
        {
          label: t('common.delete'),
          icon: 'trash-can-outline',
          danger: true,
          onPress: async () => {
            await repo.trashDocuments([doc.id]);
            bump();
            dialogs.toast(t('library.movedToTrash'), {
              label: t('common.undo'),
              onPress: () => void repo.restoreDocuments([doc.id]).then(bump),
            });
          },
        },
      ],
      doc.title,
    );
  };

  const deleteForever = async (list: DocumentRow[]) => {
    const { repo, storage } = getServices();
    const ok = await dialogs.confirm(t('library.deleteForever'), { danger: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    const orphans = await repo.deleteDocuments(list.map((d) => d.id));
    for (const s of orphans) if (!s.linked) await storage.remove(s.path).catch(() => undefined);
    for (const d of list) if (d.thumbnailPath) await storage.remove(d.thumbnailPath).catch(() => undefined);
    bump();
  };

  const folderMenu = (folder: FolderRow) => {
    const { repo } = getServices();
    void dialogs.menu(
      [
        {
          label: t('common.rename'),
          icon: 'pencil-outline',
          onPress: async () => {
            const name = await dialogs.prompt(t('common.rename'), { initial: folder.name });
            if (name) await repo.updateFolder(folder.id, { name });
            bump();
          },
        },
        {
          label: t('library.color'),
          icon: 'palette-outline',
          onPress: () =>
            void dialogs.menu(
              FOLDER_COLORS.map((c, i) => ({
                label: `● ${i + 1}`,
                icon: 'circle' as const,
                onPress: () => void repo.updateFolder(folder.id, { color: c }).then(bump),
              })),
              t('library.color'),
            ),
        },
        {
          label: t('library.moveTo'),
          icon: 'folder-move-outline',
          onPress: async () => {
            const target = await chooseFolder(t('library.moveTo'), folder.id);
            if (target !== undefined) await repo.moveFolders([folder.id], target);
            bump();
          },
        },
        {
          label: t('common.delete'),
          icon: 'trash-can-outline',
          danger: true,
          onPress: async () => {
            const ok = await dialogs.confirm(t('common.delete'), {
              message: t('library.deleteFolderConfirm', { name: folder.name }),
              danger: true,
              confirmLabel: t('common.delete'),
            });
            if (ok) await repo.trashFolder(folder.id);
            bump();
          },
        },
      ],
      folder.name,
    );
  };

  const newFolder = async () => {
    const name = await dialogs.prompt(t('library.newFolder'), { placeholder: t('library.folderName') });
    if (!name) return;
    await getServices().repo.createFolder(newId(), name, folderId);
    bump();
  };

  const title =
    view === 'trash' ? t('library.trash') : view === 'favorites' ? t('library.favorites') : (path[path.length - 1]?.name ?? APP_NAME);
  const atRoot = folderId === null && view === 'all';
  const showRecents = atRoot && !search.trim() && recents.length > 0;
  const layout = libSettings.view;

  const header = (
    <View style={{ paddingTop: SPACING.md }}>
      {atRoot ? (
        <Button
          testID="import-button"
          icon="file-plus-outline"
          label={t('library.import')}
          onPress={() => void doImport()}
          style={{ minHeight: 64, marginBottom: SPACING.lg }}
          accessibilityHint={t('library.importHint')}
        />
      ) : null}

      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="magnify" color={theme.textSecondary} />
        <TextInput
          testID="search-input"
          value={search}
          onChangeText={setSearch}
          placeholder={t('library.search')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel={t('library.search')}
        />
        {search ? <IconButton icon="close" label={t('common.close')} onPress={() => setSearch('')} /> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}>
        <Chip
          icon="star-outline"
          label={t('library.favorites')}
          active={view === 'favorites'}
          onPress={() => router.push({ pathname: '/', params: { view: view === 'favorites' ? 'all' : 'favorites' } })}
        />
        <Chip
          icon="sort"
          label={`${t('library.sort')}: ${t(libSettings.sort === 'name' ? 'library.sortName' : libSettings.sort === 'added' ? 'library.sortAdded' : 'library.sortOpened')}`}
          onPress={() =>
            update((s) => ({
              ...s,
              library: {
                ...s.library,
                sort: s.library.sort === 'name' ? 'added' : s.library.sort === 'added' ? 'opened' : 'name',
              },
            }))
          }
        />
        <Chip
          icon={layout === 'grid' ? 'view-list-outline' : 'view-grid-outline'}
          label={layout === 'grid' ? t('library.viewList') : t('library.viewGrid')}
          onPress={() => update((s) => ({ ...s, library: { ...s.library, view: s.library.view === 'grid' ? 'list' : 'grid' } }))}
        />
        {view === 'all' ? <Chip icon="folder-plus-outline" label={t('library.newFolder')} onPress={() => void newFolder()} /> : null}
        <Chip
          icon="trash-can-outline"
          label={t('library.trash')}
          active={view === 'trash'}
          onPress={() => router.push({ pathname: '/', params: { view: view === 'trash' ? 'all' : 'trash' } })}
        />
      </ScrollView>

      {folderId ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crumbs}>
          <Chip icon="home-outline" label={t('library.title')} onPress={() => openFolder(null)} />
          {path.map((f) => (
            <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="chevron-right" color={theme.textSecondary} size={18} />
              <Chip label={f.name} onPress={() => openFolder(f.id)} active={f.id === folderId} />
            </View>
          ))}
        </ScrollView>
      ) : null}

      {showRecents ? (
        <>
          <AppText variant="heading" style={styles.sectionTitle}>
            {t('library.recents')}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.lg }}>
            {recents.map((d) => (
              <DocumentCard key={d.id} doc={d} width={110} layout="recent" onOpen={() => open(d.id)} onMenu={() => docMenu(d)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      {childFolders.length > 0 ? (
        <>
          <AppText variant="heading" style={styles.sectionTitle}>
            {t('library.folders')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md }}>
            {childFolders.map((f) => (
              <FolderCard key={f.id} folder={f} width={folderWidth} onOpen={() => openFolder(f.id)} onMenu={() => folderMenu(f)} />
            ))}
          </View>
        </>
      ) : null}

      {docs && docs.length > 0 ? (
        <AppText variant="heading" style={styles.sectionTitle}>
          {atRoot ? t('library.allDocuments') : title}
        </AppText>
      ) : null}
    </View>
  );

  const empty =
    docs === null ? (
      <ActivityIndicator color={theme.primary} style={{ marginTop: SPACING.xxl }} />
    ) : (
      <View style={styles.empty} testID="library-empty">
        <Icon name={view === 'trash' ? 'trash-can-outline' : 'music-box-multiple-outline'} size={56} color={theme.textSecondary} />
        <AppText variant="heading" style={{ marginTop: SPACING.md, textAlign: 'center' }}>
          {search.trim()
            ? t('library.noResults')
            : view === 'trash'
              ? t('library.trashEmpty')
              : folderId
                ? t('library.emptyFolder')
                : t('library.empty')}
        </AppText>
        {atRoot && !search.trim() ? (
          <AppText secondary style={{ marginTop: SPACING.sm, textAlign: 'center', maxWidth: 420 }}>
            {t('library.emptyHint', { app: APP_NAME })}
          </AppText>
        ) : null}
      </View>
    );

  return (
    <Screen>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        {!atRoot ? <IconButton icon="arrow-left" label={t('common.back')} onPress={() => router.back()} /> : <View style={{ width: SPACING.sm }} />}
        <AppText variant="title" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {view === 'trash' && docs && docs.length > 0 ? (
          <IconButton icon="delete-sweep-outline" label={t('library.emptyTrash')} showLabel onPress={() => void deleteForever(docs)} />
        ) : null}
        <IconButton icon="cog-outline" label={t('library.settings')} showLabel onPress={() => router.push('/settings')} testID="open-settings" />
      </View>
      <FlatList
        key={`${layout}-${columns}`}
        data={docs ?? []}
        keyExtractor={(d) => d.id}
        numColumns={layout === 'grid' ? columns : 1}
        ListHeaderComponent={header}
        ListEmptyComponent={childFolders.length === 0 ? empty : undefined}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120, width: '100%', maxWidth: 1400, alignSelf: 'center' }}
        columnWrapperStyle={layout === 'grid' ? { gap: SPACING.lg, marginBottom: SPACING.lg } : undefined}
        renderItem={({ item }) => (
          <DocumentCard
            doc={item}
            width={cardWidth}
            layout={layout}
            onOpen={() => (view === 'trash' ? docMenu(item) : open(item.id))}
            onMenu={() => docMenu(item)}
          />
        )}
      />
      {busy || dropActive ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.dropHighlight }]} pointerEvents="none">
          <View style={[styles.busy, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {busy ? <ActivityIndicator color={theme.primary} /> : <Icon name="tray-arrow-down" size={32} color={theme.primary} />}
            <AppText style={{ marginLeft: SPACING.md }}>{busy ?? t('library.dropHere')}</AppText>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Chip({ label, icon, onPress, active }: { label: string; icon?: Parameters<typeof Icon>[0]['name']; onPress: () => void; active?: boolean }) {
  return (
    <Button
      label={label}
      icon={icon}
      onPress={onPress}
      variant={active ? 'primary' : 'secondary'}
      style={{ minHeight: TOUCH, paddingHorizontal: SPACING.md, borderRadius: RADIUS.lg }}
      testID={`chip-${label}`}
    />
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: SPACING.md,
    minHeight: TOUCH + 4,
  },
  searchInput: { flex: 1, fontSize: 16, paddingHorizontal: SPACING.sm, minHeight: TOUCH },
  toolbar: { gap: SPACING.sm, paddingVertical: SPACING.md },
  crumbs: { alignItems: 'center', paddingBottom: SPACING.sm },
  sectionTitle: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: SPACING.lg },
  overlay: { alignItems: 'center', justifyContent: 'center' },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
