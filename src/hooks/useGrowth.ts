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
  clearRecentTransition,
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
/** How long the "just transitioned" flag stays set before auto-clearing. */
const TRANSITION_DISPLAY_MS = 3000;

export function usePersonGrowth(personId: string): PersonGrowth {
  const [, rerender] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToGrowth(() => {
      rerender((n) => n + 1);
    });
    return unsubscribe;
  }, [personId]);

  const info = getGrowthInfo(personId);
  const justTransitioned = hasRecentTransition(personId);

  // Auto-clear the transition flag once the celebration window has passed,
  // so plants don't stay marked "just transitioned" for the app's lifetime.
  useEffect(() => {
    if (!justTransitioned) return;
    const timer = setTimeout(
      () => clearRecentTransition(personId),
      TRANSITION_DISPLAY_MS
    );
    return () => clearTimeout(timer);
  }, [justTransitioned, personId]);

  return {
    ...info,
    justTransitioned,
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
  }, [isLoading, memories, interactions]);
}

// Re-export types for convenience
export type { GrowthStage, GrowthInfo };
