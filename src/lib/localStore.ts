/**
 * Local Store
 *
 * On-device JSON persistence. In demo mode (Supabase not configured),
 * locally created people, memories, and interactions live in module-level
 * arrays — this module writes those arrays to the app's document directory
 * so the garden survives app restarts. It also holds small caches and
 * device settings (AI insights, the AI opt-out, notification cadence).
 *
 * Files are not scoped to an account, so everything but device settings
 * is wiped whenever the signed-in user changes (see lib/userData).
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

/**
 * Collections that hold device settings rather than anyone's garden. They
 * survive sign-out so, for example, turning AI off can't silently flip
 * back on when someone signs in again.
 */
const DEVICE_COLLECTIONS = new Set(["ai-preferences", "notification-log"]);

/**
 * Remove every persisted collection except device settings — people,
 * memories, interactions, promises, seasons, and cached AI insights.
 * Used on sign-out and account deletion.
 */
export function clearUserCollections(): void {
  let entries: (Directory | File)[];
  try {
    const dir = new Directory(Paths.document, STORE_DIR);
    if (!dir.exists) return;
    entries = dir.list();
  } catch {
    return;
  }
  for (const entry of entries) {
    if (DEVICE_COLLECTIONS.has(entry.name.replace(/\.json$/, ""))) continue;
    try {
      entry.delete();
    } catch {
      // best-effort — keep going so one stuck file can't shield the rest
    }
  }
}
