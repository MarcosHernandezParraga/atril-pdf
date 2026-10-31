// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Application services, created once at start-up.

import { openAppDatabase } from './db/openAppDatabase';
import type { SourceRow } from './db/schema';
import { LibraryRepository } from './library/repository';
import { ThumbnailService } from './library/thumbnails';
import { createPdfEngine } from './pdf/createEngine';
import { PageRenderer } from './pdf/pageRenderer';
import type { PdfEngine } from './pdf/types';
import { createStorage } from './storage/storage';
import type { StorageAdapter } from './storage/types';

export interface Services {
  repo: LibraryRepository;
  storage: StorageAdapter;
  engine: PdfEngine;
  renderer: PageRenderer;
  thumbnails: ThumbnailService;
}

let services: Services | null = null;
let starting: Promise<Services> | null = null;

export function initServices(): Promise<Services> {
  if (services) return Promise.resolve(services);
  if (!starting) {
    starting = (async () => {
      const { db } = await openAppDatabase();
      const repo = new LibraryRepository(db);
      const storage = createStorage();
      const engine = createPdfEngine(storage);
      const sourceCache = new Map<string, SourceRow>();
      const lookup = async (id: string) => {
        const hit = sourceCache.get(id);
        if (hit) return hit;
        const [row] = await repo.getSources([id]);
        if (row) sourceCache.set(id, row);
        return row;
      };
      const renderer = new PageRenderer(engine, storage, lookup);
      const thumbnails = new ThumbnailService(repo, storage, new PageRenderer(engine, storage, lookup, 6));
      services = { repo, storage, engine, renderer, thumbnails };
      return services;
    })();
    starting.catch(() => {
      starting = null;
    });
  }
  return starting;
}

export function getServices(): Services {
  if (!services) throw new Error('Services not initialised');
  return services;
}
