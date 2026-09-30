/**
 * Export Service
 *
 * Gathers all garden data (persons, memories, interactions, preferences)
 * and exports it as a JSON file via the native share sheet.
 *
 * When Supabase is configured, exports the signed-in account's server data
 * and fails if it can't be fetched — never a partial or on-device copy.
 * Otherwise (demo mode) exports the locally persisted garden (people,
 * memories, and interactions the user actually created on this device) —
 * never the bundled demo data.
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getPersons } from "@/services/personService";
import { getMemories } from "@/services/memoryService";
import { getAllInteractions } from "@/services/interactionService";
import { getGardenWalkPreferences } from "@/lib/notificationEngine";
import { loadCollection } from "@/lib/localStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Person, Memory, Interaction } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExportResult {
  success: boolean;
  error?: string;
}

// ─── Export ─────────────────────────────────────────────────────────────────

const EXPORT_FILE_NAME = "kinship-export.json";

export async function exportGardenData(): Promise<ExportResult> {
  try {
    const { persons, memories, interactions } = isSupabaseConfigured
      ? await loadAccountGarden()
      : await loadDeviceGarden();

    const gardenWalk = getGardenWalkPreferences();

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      persons,
      memories,
      interactions,
      preferences: {
        gardenWalk,
      },
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const file = new File(Paths.cache, EXPORT_FILE_NAME);
    file.write(json);

    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      dialogTitle: "Export your garden",
      UTI: "public.json",
    });

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown export error";
    return { success: false, error: message };
  }
}

/** Delete the last export written to the cache (sign-out cleanup). */
export function deleteExportFile(): void {
  try {
    const file = new File(Paths.cache, EXPORT_FILE_NAME);
    if (file.exists) file.delete();
  } catch {
    // best-effort
  }
}

interface GardenData {
  persons: Person[];
  memories: Memory[];
  interactions: Interaction[];
}

/** Signed in: the account's server data. Throws if it can't be fetched. */
async function loadAccountGarden(): Promise<GardenData> {
  const [persons, memories, interactions] = await Promise.all([
    getPersons(),
    getMemories(),
    getAllInteractions(),
  ]);
  return { persons, memories, interactions };
}

/** Demo mode: what was created on this device. */
async function loadDeviceGarden(): Promise<GardenData> {
  const [persons, memories, interactions] = await Promise.all([
    loadCollection<Person>("people"),
    loadCollection<Memory>("memories"),
    loadCollection<Interaction>("interactions"),
  ]);
  return { persons, memories, interactions };
}
