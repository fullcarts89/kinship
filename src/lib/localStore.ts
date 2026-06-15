/**
 * Local Store
 *
 * On-device JSON persistence for mock mode. When Supabase isn't configured,
 * locally created people, memories, and interactions live in module-level
 * arrays — this module writes those arrays to the app's document directory
 * so the garden survives app restarts.
 *
 * Persistence is best-effort: read/write failures fall back to empty data
 * rather than crashing, and the in-memory arrays remain the source of truth
 * while the app is running.
 */

import { Directory, File, Paths } from "expo-file-system";

const STORE_DIR = "kinship-local";

function getFile(key: string): File {
  return new File(Paths.document, STORE_DIR, `${key}.json`);
}

/** Load a persisted collection. Returns [] if missing, corrupt, or unreadable. */
export async function loadCollection<T>(key: string): Promise<T[]> {
  try {
    const file = getFile(key);
    if (!file.exists) return [];
    const parsed = JSON.parse(await file.text());
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Persist a collection. Failures are swallowed — in-memory state still works. */
export function saveCollection<T>(key: string, items: readonly T[]): void {
  try {
    new Directory(Paths.document, STORE_DIR).create({
      idempotent: true,
      intermediates: true,
    });
    getFile(key).write(JSON.stringify(items));
  } catch {
    // best-effort
  }
}

/** Remove all persisted local data (used by delete-account / reset flows). */
export function clearAllCollections(): void {
  try {
    const dir = new Directory(Paths.document, STORE_DIR);
    if (dir.exists) dir.delete();
  } catch {
    // best-effort
  }
}
