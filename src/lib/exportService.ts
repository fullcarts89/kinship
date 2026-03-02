/**
 * Export Service
 *
 * Gathers all garden data (persons, memories, interactions, preferences)
 * and exports it as a JSON file via the native share sheet.
 *
 * Falls back to mock data when Supabase is not configured or the fetch fails.
 */

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getPersons } from "@/services/personService";
import { getMemories } from "@/services/memoryService";
import { getAllInteractions } from "@/services/interactionService";
import { getGardenWalkPreferences } from "@/lib/notificationEngine";
import {
  mockPeople,
  mockMemories,
  mockInteractions,
} from "@/data/mock";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExportResult {
  success: boolean;
  error?: string;
}

// ─── Export ─────────────────────────────────────────────────────────────────

export async function exportGardenData(): Promise<ExportResult> {
  try {
    // Fetch live data, falling back to mock if Supabase is unavailable
    let persons;
    try {
      persons = await getPersons();
    } catch {
      persons = mockPeople;
    }

    let memories;
    try {
      memories = await getMemories();
    } catch {
      memories = mockMemories;
    }

    let interactions;
    try {
      interactions = await getAllInteractions();
    } catch {
      interactions = mockInteractions;
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
    const fileUri = `${FileSystem.cacheDirectory}kinship-export.json`;

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri, {
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
