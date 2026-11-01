// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// "Share": makes a PDF of a score (with the annotations or as the original)
// and hands it over: the system share sheet to send it (mail, WhatsApp,
// AirDrop, Drive…) or a file saved on the device.

import type { DocumentModel } from '../core/model';
import type { SourceRow } from '../db/schema';
import i18n from '../i18n';
import { getServices } from '../services';
import { dialogs } from '../ui/dialogs';
import type { IconName } from '../ui/primitives';
import type { ExportDeps } from './buildPdf';
import { safeFileName } from './pdfMath';
import {
  bytesOfUri,
  deliver,
  deliveryNeedsTap,
  rasterizeText,
  shareTargets,
  toPng,
  type ShareTarget,
} from './platform';

/** Asks a question with a menu; null when the menu is closed without choosing. */
function choose<T>(title: string, options: { value: T; label: string; icon: IconName }[]): Promise<T | null> {
  return new Promise((resolve) => {
    void dialogs
      .menu(
        options.map((o) => ({ label: o.label, icon: o.icon, onPress: () => resolve(o.value) })),
        title,
      )
      .then(() => resolve(null));
  });
}

async function makePdf(title: string, model: DocumentModel, withNotes: boolean): Promise<Uint8Array> {
  const { repo, storage, renderer } = getServices();
  const { buildPdf, isOriginalPdf } = await import('./buildPdf');
  const ids = [
    ...new Set(
      model.pages
        .flatMap((p) => ('sourceId' in p ? [p.sourceId] : []))
        .concat(
          Object.values(model.annotations)
            .flat()
            .flatMap((a) => (a.type === 'image' ? [a.sourceId] : [])),
        ),
    ),
  ];
  const rows = new Map<string, SourceRow>((await repo.getSources(ids)).map((s) => [s.id, s]));

  // Nothing changed and no notes wanted: the original file, exactly as it was imported.
  if (!withNotes) {
    const original = isOriginalPdf(model, (id) => rows.get(id)?.pageCount ?? null);
    const row = original ? rows.get(original) : undefined;
    if (row && !row.password) return storage.read(row.path);
  }

  let lastPercent = -1;
  const deps: ExportDeps = {
    async readSource(id) {
      const row = rows.get(id);
      if (!row) return null;
      return { bytes: await storage.read(row.path), kind: row.kind, password: row.password ?? null };
    },
    async renderPage(page, widthPx) {
      const r = await renderer.render(page, widthPx);
      return r ? bytesOfUri(r.uri) : null;
    },
    rasterizeText,
    toPng,
    onProgress(done, total) {
      const percent = Math.floor((done / total) * 10) * 10;
      if (total > 4 && percent !== lastPercent && percent < 100) {
        lastPercent = percent;
        dialogs.toast(i18n.t('share.progress', { name: title, percent }));
      }
    },
  };
  return buildPdf(model, deps, { annotations: withNotes, title });
}

/**
 * Shares a document. `model` is the one being edited in the reader (the latest
 * changes, even those not saved yet); from the library it is read from storage.
 */
export async function shareDocument(doc: { id: string; title: string }, model?: DocumentModel | null) {
  const t = i18n.t.bind(i18n);
  const current = model ?? (await getServices().repo.loadModel(doc.id));
  if (!current || current.pages.length === 0) return;

  const { hasVisibleAnnotations } = await import('./buildPdf');
  let withNotes = false;
  if (hasVisibleAnnotations(current)) {
    const choice = await choose(t('share.title'), [
      { value: true, label: t('share.withNotes'), icon: 'draw' },
      { value: false, label: t('share.withoutNotes'), icon: 'file-pdf-box' },
    ]);
    if (choice === null) return;
    withNotes = choice;
  }

  dialogs.toast(t('share.progress', { name: doc.title, percent: 0 }));
  let bytes: Uint8Array;
  try {
    bytes = await makePdf(doc.title, current, withNotes);
  } catch (e) {
    console.warn('[share]', e);
    dialogs.toast(t('share.failed'));
    return;
  }

  const fileName = safeFileName(doc.title);
  const run = async (target: ShareTarget) => {
    try {
      const done = await deliver(bytes, fileName, target);
      if (done && target === 'save') dialogs.toast(t('share.saved', { name: fileName }));
    } catch (e) {
      console.warn('[share]', e);
      dialogs.toast(t('share.failed'));
    }
  };

  const targets = shareTargets();
  // In a browser the person taps once more when the PDF is ready (see
  // deliveryNeedsTap). The desktop app and the mobile apps go straight on.
  const needsTap = deliveryNeedsTap();
  if (targets.length === 1 && !needsTap) {
    dialogs.toast(t('share.ready', { name: doc.title }));
    await run(targets[0]!);
    return;
  }
  void dialogs.menu(
    targets.map((target) => ({
      label: t(target === 'send' ? 'share.send' : 'share.save'),
      icon: target === 'send' ? ('share-variant' as const) : ('download' as const),
      onPress: () => void run(target),
    })),
    t('share.ready', { name: doc.title }),
  );
}
