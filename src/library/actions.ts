// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Actions on documents and folders shared by the library and concert screens.

import { router } from 'expo-router';

import { extractPages } from '../core/commands';
import { newId } from '../core/ids';
import type { DocumentRow, FolderRow } from '../db/schema';
import i18n from '../i18n';
import { getServices } from '../services';
import { FOLDER_COLORS } from '../theme';
import { dialogs, type MenuItem } from '../ui/dialogs';
import { useLibraryRefresh } from './libraryEvents';

const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o);
const bump = () => useLibraryRefresh.getState().bump();

export function openDocument(id: string, concert?: { folderId: string }) {
  router.push({ pathname: '/reader/[id]', params: concert ? { id, concert: concert.folderId } : { id } });
}

export function startConcert(folderId: string, firstDocumentId: string) {
  openDocument(firstDocumentId, { folderId });
}

export async function renameDocument(doc: DocumentRow) {
  const name = await dialogs.prompt(t('common.rename'), { initial: doc.title });
  if (name) await getServices().repo.renameDocument(doc.id, name);
  bump();
}

/** Folder chosen by the user; null = "new folder"; undefined = cancelled. */
export async function chooseFolder(title: string): Promise<FolderRow | null | undefined> {
  const folders = await getServices().repo.allFolders();
  return new Promise((resolve) => {
    let chosen: FolderRow | null | undefined;
    void dialogs
      .menu(
        [
          ...folders.map((f) => ({
            label: f.name,
            icon: 'folder-music-outline' as const,
            onPress: () => (chosen = f),
          })),
          {
            label: t('library.newFolder'),
            icon: 'folder-plus-outline' as const,
            onPress: () => (chosen = null),
          },
        ],
        title,
      )
      .then(async () => {
        await Promise.resolve();
        resolve(chosen);
      });
  });
}

export async function addToFolderFlow(docIds: string[]) {
  const { repo } = getServices();
  let folder = await chooseFolder(t('library.addToFolder'));
  if (folder === undefined) return;
  if (!folder) {
    const name = await dialogs.prompt(t('library.newFolder'), { placeholder: t('library.folderName') });
    if (!name) return;
    const id = newId();
    await repo.createFolder(
      id,
      name,
      null,
      FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)] ?? null,
    );
    folder = (await repo.allFolders()).find((f) => f.id === id) ?? null;
    if (!folder) return;
  }
  await repo.addToFolder(folder.id, docIds, newId);
  bump();
  dialogs.toast(t('library.addedToFolder', { name: folder.name }));
}

export async function trashDocument(doc: DocumentRow) {
  const { repo } = getServices();
  await repo.trashDocuments([doc.id]);
  bump();
  dialogs.toast(t('library.movedToTrash'), {
    label: t('common.undo'),
    onPress: () => void repo.restoreDocuments([doc.id]).then(bump),
  });
}

export async function deleteForever(list: DocumentRow[]) {
  const { repo, storage } = getServices();
  const ok = await dialogs.confirm(t('library.deleteForever'), {
    danger: true,
    confirmLabel: t('common.delete'),
  });
  if (!ok) return;
  const orphans = await repo.deleteDocuments(list.map((d) => d.id));
  for (const s of orphans) if (!s.linked) await storage.remove(s.path).catch(() => undefined);
  for (const d of list) if (d.thumbnailPath) await storage.remove(d.thumbnailPath).catch(() => undefined);
  bump();
}

/** Main menu of a document (long press, right click or "…" button). */
export function documentMenuItems(doc: DocumentRow, extra: MenuItem[] = []): MenuItem[] {
  const { repo } = getServices();
  return [
    ...extra,
    {
      label: t('share.button'),
      icon: 'share-variant',
      onPress: () => void import('../export/shareDocument').then((m) => m.shareDocument(doc)),
    },
    { label: t('common.rename'), icon: 'pencil-outline', onPress: () => void renameDocument(doc) },
    {
      label: t('library.addToFolder'),
      icon: 'folder-plus-outline',
      onPress: () => void addToFolderFlow([doc.id]),
    },
    {
      label: doc.favorite ? t('library.unfavorite') : t('library.favorite'),
      icon: doc.favorite ? 'star-off-outline' : 'star-outline',
      onPress: () => void repo.setFavorite(doc.id, !doc.favorite).then(bump),
    },
    {
      label: t('library.duplicate'),
      icon: 'content-copy',
      onPress: async () => {
        const model = await repo.loadModel(doc.id);
        if (!model) return;
        const copy = extractPages(
          model,
          model.pages.map((p) => p.id),
          newId,
        );
        await repo.createDocument({
          id: newId(),
          title: `${doc.title} (${t('library.copySuffix')})`,
          folderId: null,
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
      onPress: () => void trashDocument(doc),
    },
  ];
}

export function folderMenuItems(folder: FolderRow, onDeleted?: () => void): MenuItem[] {
  const { repo } = getServices();
  return [
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
            label: `${i + 1}`,
            icon: 'circle' as const,
            color: c,
            onPress: () => void repo.updateFolder(folder.id, { color: c }).then(bump),
          })),
          t('library.color'),
        ),
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
        if (!ok) return;
        await repo.deleteFolder(folder.id);
        bump();
        onDeleted?.();
      },
    },
  ];
}

export async function createFolder(parentId: string | null): Promise<string | null> {
  const name = await dialogs.prompt(parentId ? t('library.newSubfolder') : t('library.newFolder'), {
    placeholder: t('library.folderName'),
  });
  if (!name) return null;
  const id = newId();
  const { repo } = getServices();
  const count = (await repo.allFolders()).length;
  await repo.createFolder(id, name, parentId, FOLDER_COLORS[count % FOLDER_COLORS.length] ?? null);
  bump();
  return id;
}
