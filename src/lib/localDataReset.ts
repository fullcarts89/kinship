/**
 * Clears every piece of user data held on this device: the on-device JSON
 * store, the in-memory caches the data hooks keep, the hidden growth
 * points, and the AI-consent copy. Used when an account is deleted and on
 * every sign-out, so the next person to sign in on this phone starts empty.
 */

import { clearLocalPeople } from "@/hooks/usePersons";
import { clearLocalMemories } from "@/hooks/useMemories";
import { clearLocalInteractions } from "@/hooks/useInteractions";
import { clearLocalPromises } from "@/hooks/usePromises";
import { clearLocalSeasons } from "@/hooks/useSeason";
import { clearAllCollections } from "@/lib/localStore";
import { resetGrowthState } from "@/lib/growthEngine";
import { resetAIPreferences } from "@/lib/aiPreferences";

export function clearAllLocalUserData(): void {
  clearLocalPeople();
  clearLocalMemories();
  clearLocalInteractions();
  clearLocalPromises();
  clearLocalSeasons();
  clearAllCollections();
  resetGrowthState();
  resetAIPreferences();
}
