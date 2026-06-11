/**
 * Export Service
 *
 * Gathers all garden data (persons, memories, interactions, preferences)
 * and exports it as a JSON file via the native share sheet.
 *
 * When Supabase is configured, exports the user's server data. Otherwise
 * exports the locally persisted garden (people, memories, and interactions
 * the user actually created on this device) — never the bundled demo data.
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getPersons } from "@/services/personService";
import { getMemories } from "@/services/memoryService";
import { getAllInteractions } from "@/services/interactionService";
import { getGardenWalkPreferences } from "@/lib/notificationEngine";
import { loadCollection } from "@/lib/localStore";
import type { Person, Memory, Interaction } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExportResult {
  success: boolean;
  error?: string;
}

// ─── Export ─────────────────────────────────────────────────────────────────

export async function exportGardenData(): Promise<ExportResult> {
  try {
    // Fetch live data; fall back to the locally persisted garden when
    // Supabase is unavailable. Local data is merged in either way so
    // nothing the user created on-device is left out of their export.
    const [localPersons, localMemories, localInteractions] = await Promise.all([
      loadCollection<Person>("people"),
      loadCollection<Memory>("memories"),
      loadCollection<Interaction>("interactions"),
    ]);

    let persons: Person[];
    try {
      persons = mergeById(localPersons, await getPersons());
    } catch {
      persons = localPersons;
    }

    let memories: Memory[];
    try {
      memories = mergeById(localMemories, await getMemories());
    } catch {
      memories = localMemories;
    }

    let interactions: Interaction[];
    try {
      interactions = mergeById(localInteractions, await getAllInteractions());
    } catch {
      interactions = localInteractions;
    }

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
    const file = new File(Paths.cache, "kinship-export.json");
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

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const localIds = new Set(local.map((item) => item.id));
  return [...local, ...remote.filter((item) => !localIds.has(item.id))];
}
