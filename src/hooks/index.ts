/**
 * Custom Hooks
 *
 * Re-export all custom hooks from this barrel file.
 */

// ─── Provider Hooks ─────────────────────────────────────────────────────────

export { useAuth } from "@/providers/AuthProvider";
export { useTheme } from "@/providers/ThemeProvider";

// ─── Data Hooks ─────────────────────────────────────────────────────────────

export { usePersons, usePerson } from "./usePersons";
export { useMemories, usePersonMemories, useCreateMemory, useMemory } from "./useMemories";
export {
  usePersonInteractions,
  useAllInteractions,
  useCreateInteraction,
} from "./useInteractions";

// ─── Growth Hooks ──────────────────────────────────────────────────────────

export { usePersonGrowth, useBootstrapGrowth } from "./useGrowth";

// ─── Vitality Hooks ────────────────────────────────────────────────────────

export { usePersonVitality, useAllVitalities } from "./useVitality";

// ─── Suggestion Hooks ─────────────────────────────────────────────────────

export { useSuggestions } from "./useSuggestions";

// ─── Orientation Hooks ───────────────────────────────────────────────────

export { useOrientation } from "./useOrientation";
