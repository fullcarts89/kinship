/**
 * Custom Hooks
 *
 * Re-export all custom hooks from this barrel file.
 */

// ─── Provider Hooks ─────────────────────────────────────────────────────────

export { useAuth } from "@/providers/AuthProvider";
export { useTheme } from "@/providers/ThemeProvider";

// ─── Data Hooks ─────────────────────────────────────────────────────────────

export { usePersons, usePerson, useUpdatePerson, useDeletePerson } from "./usePersons";
export { useMemories, usePersonMemories, useCreateMemory, useMemory, useUpdateMemory, useDeleteMemory } from "./useMemories";
export {
  usePersonInteractions,
  useAllInteractions,
  useCreateInteraction,
  useDeleteInteraction,
} from "./useInteractions";

// ─── Growth Hooks ──────────────────────────────────────────────────────────

export { usePersonGrowth, useBootstrapGrowth } from "./useGrowth";

// ─── Vitality Hooks ────────────────────────────────────────────────────────

export { usePersonVitality, useAllVitalities } from "./useVitality";

// ─── Suggestion Hooks ─────────────────────────────────────────────────────

export { useSuggestions } from "./useSuggestions";
export {
  useOpenPromises,
  usePersonPromises,
  useCreatePromise,
  useResolvePromise,
} from "./usePromises";
export {
  useGifts,
  usePersonGifts,
  useCreateGift,
  useDeleteGift,
} from "./useGifts";
export { useActiveSeason } from "./useSeason";

// ─── Orientation Hooks ───────────────────────────────────────────────────

export { useOrientation } from "./useOrientation";
