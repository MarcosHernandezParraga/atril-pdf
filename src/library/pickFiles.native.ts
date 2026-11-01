// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import * as DocumentPicker from 'expo-document-picker';

import type { ExternalFile } from '../storage/types';
import type { PickKind } from './pickFiles';

/** Opens the system file picker (no storage permission needed). */
export async function pickFiles(kind: PickKind = 'all'): Promise<ExternalFile[]> {
  const r = await DocumentPicker.getDocumentAsync({
    type:
      kind === 'pdf' ? ['application/pdf'] : kind === 'image' ? ['image/*'] : ['application/pdf', 'image/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (r.canceled) return [];
  return r.assets.map((a) => ({ kind: 'uri', uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType }));
}
