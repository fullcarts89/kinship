/**
 * Growth Stage Utility (Legacy Adapter)
 *
 * Re-exports from the canonical growthEngine module.
 * Keeps the old `getGrowthStage(memoriesCount, interactionsCount)`
 * signature as a backward-compat adapter for any remaining callers.
 *
 * New code should import directly from `@/lib/growthEngine`.
 */

// Re-export canonical types and labels
export type { GrowthStage } from "./growthEngine";
export { growthStageLabels, getStageFromPoints } from "./growthEngine";

import { getStageFromPoints } from "./growthEngine";
import type { GrowthStage } from "./growthEngine";

/**
 * Legacy adapter: estimate growth stage from raw counts.
 *
 * Approximates points as 2 per memory + 1 per interaction,
 * then delegates to the canonical `getStageFromPoints`.
 *
 * New code should use `usePersonGrowth(personId)` hook
 * or `getGrowthInfo(personId)` from growthEngine instead.
 */
export function getGrowthStage(
  memoriesCount: number,
  interactionsCount: number
): GrowthStage {
  const estimatedPoints = memoriesCount * 2 + interactionsCount;
  return getStageFromPoints(estimatedPoints);
}
