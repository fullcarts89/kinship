/**
 * Vitality Hooks
 *
 * React hooks that compute vitality for a single person or all persons.
 * Uses the same data sources as useMemories / useInteractions.
 *
 * Usage:
 *   const { vitalityScore, vitalityLevel } = usePersonVitality(personId);
 *   const vitalities = useAllVitalities(); // Record<personId, VitalityInfo>
 */

import { useMemo } from "react";
import {
  getVitalityInfo,
  type VitalityInfo,
  type VitalityLevel,
} from "@/lib/vitalityEngine";
import type { Memory, Interaction } from "@/types/database";

// ─── usePersonVitality ──────────────────────────────────────────────────────

/**
 * Compute vitality for a single person given their memories and interactions.
 * Memoized — only recomputes when the arrays change.
 */
export function usePersonVitality(
  memories: Memory[],
  interactions: Interaction[]
): VitalityInfo {
  return useMemo(
    () => getVitalityInfo(memories, interactions),
    [memories, interactions]
  );
}

// ─── useAllVitalities ───────────────────────────────────────────────────────

/**
 * Compute vitality for every person at once.
 *
 * Takes full arrays of all memories and interactions (all people)
 * and returns a Record keyed by personId.
 *
 * Useful for Garden tab and Home carousel where we need vitality
 * for all plants in one pass.
 */
export function useAllVitalities(
  personIds: string[],
  allMemories: Memory[],
  allInteractions: Interaction[]
): Record<string, VitalityInfo> {
  return useMemo(() => {
    const result: Record<string, VitalityInfo> = {};
    for (const personId of personIds) {
      const personMemories = allMemories.filter(
        (m) => m.person_id === personId
      );
      const personInteractions = allInteractions.filter(
        (i) => i.person_id === personId
      );
      result[personId] = getVitalityInfo(personMemories, personInteractions);
    }
    return result;
  }, [personIds, allMemories, allInteractions]);
}
