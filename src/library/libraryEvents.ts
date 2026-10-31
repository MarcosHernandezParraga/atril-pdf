// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import { create } from 'zustand';

/** Incremented whenever the library changes, so lists reload. */
export const useLibraryRefresh = create<{ version: number; bump(): void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
