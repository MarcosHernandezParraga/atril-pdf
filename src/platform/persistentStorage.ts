// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
//
// Web version: the scores are kept inside the browser. Browsers may delete the
// data of ordinary websites when the device runs out of space. Asking for
// "persistent" storage tells the browser that this data is the person's own
// work and must be kept until they delete it. Safari grants it to the web app
// opened from the Home Screen; Chrome and Edge to installed or frequently used
// sites, without asking anything. Firefox asks the person once.

type PersistManager = Pick<StorageManager, 'persist' | 'persisted'>;

/** Asks for persistent storage. True when the data is (now) protected. */
export async function requestPersistentStorage(
  manager: Partial<PersistManager> | undefined,
): Promise<boolean> {
  if (!manager?.persist) return false;
  try {
    if (manager.persisted && (await manager.persisted())) return true;
    return await manager.persist();
  } catch {
    return false;
  }
}

/** Opened as an installed app (Home Screen icon on iPhone/iPad, "Install" in Chrome or Edge). */
export function isInstalledWebApp(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true)
  );
}

let asked = false;

/** Once per session: when the app starts installed, and after the first import. */
export function keepStoragePersistent(): void {
  if (asked || typeof navigator === 'undefined') return;
  asked = true;
  void requestPersistentStorage(navigator.storage);
}
