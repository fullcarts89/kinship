/**
 * Growth Hooks
 *
 * React hooks wrapping the module-level growth engine.
 * Provides reactive access to growth state for components.
 *
 * - usePersonGrowth(personId) — returns stage, label, and
 *   justTransitioned flag for a single person. Re-renders
 *   whenever the growth store changes.
 *
 * - useBootstrapGrowth(memories, interactions, isLoading) —
 *   seeds the growth store from existing data on first load.
 */

import { useState, useEffect } from "react";
import {
  getGrowthInfo,
  subscribeToGrowth,
  bootstrapGrowthFromData,
  hasRecentTransition,
} from "@/lib/growthEngine";
import type { GrowthStage, GrowthInfo } from "@/lib/growthEngine";
import type { Memory, Interaction } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonGrowth extends GrowthInfo {
  /** True if this person just crossed a stage boundary (trigger micro-animation). */
  justTransitioned: boolean;
}

// ─── usePersonGrowth ────────────────────────────────────────────────────────

/**
 * Reactive hook for a single person's growth info.
 * Re-renders whenever the module-level growth store changes.
 */
export function usePersonGrowth(personId: string): PersonGrowth {
  const [, rerender] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToGrowth(() => {
      rerender((n) => n + 1);
    });
    return unsubscribe;
  }, [personId]);

  const info = getGrowthInfo(personId);
  return {
    ...info,
    justTransitioned: hasRecentTransition(personId),
  };
}

// ─── useBootstrapGrowth ─────────────────────────────────────────────────────

/**
 * Seeds the growth store from existing memories and interactions.
 * Call once from a top-level screen (home or garden tab) after
 * data finishes loading. Idempotent — safe to call multiple times.
 */
export function useBootstrapGrowth(
  memories: Memory[],
  interactions: Interaction[],
  isLoading: boolean
): void {
  useEffect(() => {
    if (!isLoading) {
      bootstrapGrowthFromData(memories, interactions);
    }
  }, [isLoading]);
}

// Re-export types for convenience
export type { GrowthStage, GrowthInfo };
