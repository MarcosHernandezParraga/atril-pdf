// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { create } from 'zustand';

import { applyLanguage } from '../i18n';
import type { LibraryRepository } from '../library/repository';
import { DEFAULT_SETTINGS, sanitizeSettings, type AppSettings } from './defaults';

const SETTINGS_KEY = 'app';

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load(repo: LibraryRepository): Promise<void>;
  update(recipe: (draft: AppSettings) => AppSettings): void;
  reset(): void;
}

let repoRef: LibraryRepository | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(settings: AppSettings) {
  if (!repoRef) return;
  if (saveTimer) clearTimeout(saveTimer);
  const repo = repoRef;
  saveTimer = setTimeout(() => {
    void repo.setSetting(SETTINGS_KEY, settings);
  }, 300);
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  async load(repo) {
    repoRef = repo;
    const stored = await repo.getSetting<unknown>(SETTINGS_KEY);
    const settings = sanitizeSettings(stored);
    applyLanguage(settings.language);
    set({ settings, loaded: true });
  },
  update(recipe) {
    const next = sanitizeSettings(recipe(structuredCloneSafe(get().settings)));
    applyLanguage(next.language);
    set({ settings: next });
    scheduleSave(next);
  },
  reset() {
    set({ settings: DEFAULT_SETTINGS });
    scheduleSave(DEFAULT_SETTINGS);
  },
}));

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Convenience for non-React code. */
export function getSettings(): AppSettings {
  return useSettings.getState().settings;
}
