/**
 * Clears every piece of user data held on this device: the on-device JSON
 * store (including cached AI insights and the notification log), the
 * in-memory caches the data hooks and services keep, the hidden growth
 * points, session photos, the AI-consent copy, any export file, and every
 * scheduled notification (they carry people's names). Used when an account
 * is deleted and on every sign-out, so the next person to sign in on this
 * phone starts empty.
 *
 * Kept on purpose: device-level flags that hold no personal data
 * (onboarding / orientation seen), and the account's photos, which exist
 * only on this phone in 1.0 (see photoStorage.ts). They are deleted when a
 * different account claims the device or the account is deleted. The auth
 * session itself is removed by Supabase's signOut.
 */

import { clearLocalPeople } from "@/hooks/usePersons";
import { clearLocalMemories } from "@/hooks/useMemories";
import { clearLocalInteractions } from "@/hooks/useInteractions";
import { clearLocalPromises } from "@/hooks/usePromises";
import { clearLocalSeasons } from "@/hooks/useSeason";
import { clearSessionPhotos } from "@/hooks/usePersonPhoto";
import { clearAllCollections, loadCollection, saveCollection } from "@/lib/localStore";
import { resetGrowthState } from "@/lib/growthEngine";
import { resetAIPreferences } from "@/lib/aiPreferences";
import { resetAIInsightCache } from "@/lib/aiInsightService";
import { resetNotificationLog } from "@/lib/notificationEngine";
import { cancelAllNotifications } from "@/lib/notificationService";
import { removeExportFile } from "@/lib/exportService";
import { removePhotosExcept } from "@/lib/photoStorage";
import { resetAnalyticsInstallId } from "@/platform/posthogSink";
import { wipeAllStores } from "@/store/session";

export async function clearAllLocalUserData(): Promise<void> {
  clearLocalPeople();
  clearLocalMemories();
  clearLocalInteractions();
  clearLocalPromises();
  clearLocalSeasons();
  clearAllCollections();
  clearSessionPhotos();
  resetGrowthState();
  resetAIPreferences();
  resetAIInsightCache();
  resetNotificationLog();
  removeExportFile();
  resetAnalyticsInstallId(); // the stored id goes with the on-device store
  try {
    await cancelAllNotifications();
  } catch {
    // Nothing scheduled, or notifications unavailable on this device.
  }
  try {
    // Kinship 2.0's encrypted per-user stores and their keys (plan §11).
    await wipeAllStores();
  } catch {
    // No 2.0 store was ever opened on this device.
  }
}

const OWNER_KEY = "device-owner";

/**
 * Makes sure this device holds data for `userId` only. If the data on the
 * device belongs to anyone else, or to no recorded account (a fresh install,
 * or a build from before this was tracked), it is wiped first. Survives app
 * restarts, so a session that ended while the app was closed still can't
 * leak into the next account.
 */
export async function claimDeviceFor(userId: string): Promise<void> {
  const [owner] = await loadCollection<string>(OWNER_KEY);
  if (owner === userId) return;
  await clearAllLocalUserData();
  removePhotosExcept(userId);
  saveCollection(OWNER_KEY, [userId]);
}
