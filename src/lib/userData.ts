/**
 * User Data Reset
 *
 * On-device files and module-level caches aren't scoped to an account.
 * Whenever the signed-in user changes — sign-out, an expired session, or a
 * different account signing in — everything the previous user left behind
 * is wiped so the next person sees none of it. Device settings (the AI
 * opt-out, notification cadence) are kept.
 */

import { clearLocalPeople } from "@/hooks/usePersons";
import { clearLocalMemories } from "@/hooks/useMemories";
import { clearLocalInteractions } from "@/hooks/useInteractions";
import { clearLocalPromises } from "@/hooks/usePromises";
import { clearLocalSeasons } from "@/hooks/useSeason";
import { clearPersonPhotos } from "@/hooks/usePersonPhoto";
import { clearUserCollections } from "@/lib/localStore";
import { resetGrowthState } from "@/lib/growthEngine";
import { clearAIInsightCache } from "@/lib/aiInsightService";
import { clearAllNotifications } from "@/lib/notificationService";
import { deleteExportFile } from "@/lib/exportService";

/**
 * Wipe everything on this device that belongs to whoever was using the
 * app: garden data, caches, the last export, and pending notifications
 * (which quote names and memories). Safe to call repeatedly.
 *
 * Everything except notifications is cleared synchronously, before the
 * first await, so callers can rely on it without awaiting.
 */
export async function clearUserData(): Promise<void> {
  clearLocalPeople();
  clearLocalMemories();
  clearLocalInteractions();
  clearLocalPromises();
  clearLocalSeasons();
  clearPersonPhotos();
  clearAIInsightCache();
  resetGrowthState();
  // Files last: the resets above persist empty collections, and this
  // removes them along with anything else left on disk.
  clearUserCollections();
  deleteExportFile();
  try {
    await clearAllNotifications();
  } catch {
    // Notifications unavailable — nothing scheduled to clear.
  }
}
