/**
 * Growth Engine
 *
 * Single source of truth for plant growth points, stage thresholds,
 * daily caps, and stage-transition detection.
 *
 * Growth is purely additive (never regresses). Memories are the
 * primary driver; reflections contribute modestly; reach-outs
 * alone do not grow the plant.
 *
 * Module-level shared state (matching useOrientation / locallyCreatedMemories
 * pattern) ensures all screens see the same growth data in real time.
 *
 * Growth weights (v1):
 *   Meaningful Memory: +3  (has emotion OR content >= 140 chars)
 *   Simple Memory:     +2
 *   Reflection:        +1  (interaction saved via ReflectSheet)
 *   Reach-out alone:   +0  (caller should NOT invoke growth functions)
 *
 * Daily cap: max 4 points per person per calendar day.
 * Growth never regresses even if data is re-bootstrapped.
 */

import type { Memory, Interaction } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GrowthStage =
  | "seed"
  | "sprout"
  | "youngPlant"
  | "mature"
  | "blooming"
  | "tree";

export interface GrowthInfo {
  stage: GrowthStage;
  label: string;
  points: number;
}

export interface GrowthTransition {
  previousStage: GrowthStage;
  newStage: GrowthStage;
  /** Caller fills this in — the engine doesn't know person names. */
  personName: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Points awarded per event type. */
const POINTS_MEANINGFUL_MEMORY = 3;
const POINTS_SIMPLE_MEMORY = 2;
const POINTS_REFLECTION = 1;

/** Max growth points awarded to a single person in one calendar day. */
const DAILY_CAP = 4;

/**
 * Stage thresholds — ordered highest-first for easy lookup.
 * A person's stage is the first entry whose `min` they meet or exceed.
 */
const STAGE_THRESHOLDS: { min: number; stage: GrowthStage; label: string }[] = [
  { min: 27, stage: "tree", label: "Established" },
  { min: 17, stage: "blooming", label: "Blooming" },
  { min: 10, stage: "mature", label: "Thriving" },
  { min: 5, stage: "youngPlant", label: "Growing" },
  { min: 2, stage: "sprout", label: "Sprouting" },
  { min: 0, stage: "seed", label: "Seed" },
];

/** Friendly labels for each growth stage. */
export const growthStageLabels: Record<GrowthStage, string> = {
  seed: "Seed",
  sprout: "Sprouting",
  youngPlant: "Growing",
  mature: "Thriving",
  blooming: "Blooming",
  tree: "Established",
};

/**
 * Stage ordering for comparison (higher = more advanced).
 * Used by didStageAdvance to avoid string comparison.
 */
const STAGE_ORDER: Record<GrowthStage, number> = {
  seed: 0,
  sprout: 1,
  youngPlant: 2,
  mature: 3,
  blooming: 4,
  tree: 5,
};

// ─── Module-level Shared State ──────────────────────────────────────────────

/** personId → accumulated growth points (never decreases). */
const _growthPoints = new Map<string, number>();

/**
 * personId → { "YYYY-MM-DD" → points awarded that day }.
 * Used to enforce the daily cap.
 */
const _dailyPoints = new Map<string, Map<string, number>>();

/**
 * personIds that just crossed a stage boundary.
 * Components read this to trigger a micro-animation,
 * then call clearRecentTransition when the animation ends.
 */
const _recentTransitions = new Set<string>();

/** Guard to ensure bootstrapGrowthFromData only runs once. */
let _isBootstrapped = false;

/** Subscriber callbacks — notified on any state change. */
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

/** Get today's date as "YYYY-MM-DD" in local timezone. */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Derive growth stage from total accumulated points. */
export function getStageFromPoints(points: number): GrowthStage {
  for (const { min, stage } of STAGE_THRESHOLDS) {
    if (points >= min) return stage;
  }
  return "seed";
}

/**
 * Determine whether a memory is "meaningful".
 * Meaningful = has a non-null emotion OR content length >= 140.
 */
export function isMeaningfulMemory(memory: {
  emotion: string | null;
  content: string;
}): boolean {
  return memory.emotion !== null || memory.content.length >= 140;
}

/**
 * Calculate the raw point value for a memory
 * (before daily cap is applied).
 */
export function computeMemoryPoints(memory: {
  emotion: string | null;
  content: string;
}): number {
  return isMeaningfulMemory(memory)
    ? POINTS_MEANINGFUL_MEMORY
    : POINTS_SIMPLE_MEMORY;
}

/** Check whether a stage transition is an advancement. */
export function didStageAdvance(
  prev: GrowthStage,
  next: GrowthStage
): boolean {
  return STAGE_ORDER[next] > STAGE_ORDER[prev];
}

/** Get a warm toast message for a stage transition. */
export function getTransitionToastMessage(transition: GrowthTransition): {
  text: string;
  emoji: string;
} {
  const name = transition.personName;
  switch (transition.newStage) {
    case "sprout":
      return { text: `A new leaf for you and ${name}`, emoji: "\uD83C\uDF3F" };
    case "youngPlant":
      return {
        text: `Your garden with ${name} is growing`,
        emoji: "\uD83E\uDEB4",
      };
    case "mature":
      return { text: `A strong bond with ${name}`, emoji: "\uD83C\uDF33" };
    case "blooming":
      return {
        text: `Blooming beautifully with ${name}`,
        emoji: "\uD83C\uDF38",
      };
    case "tree":
      return { text: `Deeply rooted with ${name}`, emoji: "\uD83C\uDFE1" };
    default:
      return { text: `Growing with ${name}`, emoji: "\uD83C\uDF3F" };
  }
}

// ─── State Accessors ────────────────────────────────────────────────────────

/** Get growth info for a specific person. */
export function getGrowthInfo(personId: string): GrowthInfo {
  const points = _growthPoints.get(personId) ?? 0;
  const stage = getStageFromPoints(points);
  return { stage, label: growthStageLabels[stage], points };
}

/** Get the remaining daily growth budget for a person today. */
function getDailyBudget(personId: string): number {
  const day = todayKey();
  const personDaily = _dailyPoints.get(personId);
  const usedToday = personDaily?.get(day) ?? 0;
  return Math.max(0, DAILY_CAP - usedToday);
}

/** Record daily point usage for a person. */
function recordDailyUsage(personId: string, points: number): void {
  const day = todayKey();
  if (!_dailyPoints.has(personId)) {
    _dailyPoints.set(personId, new Map());
  }
  const personDaily = _dailyPoints.get(personId)!;
  personDaily.set(day, (personDaily.get(day) ?? 0) + points);
}

/** Check if a person recently crossed a stage boundary. */
export function hasRecentTransition(personId: string): boolean {
  return _recentTransitions.has(personId);
}

/** Clear the "just transitioned" flag (call after micro-animation ends). */
export function clearRecentTransition(personId: string): void {
  _recentTransitions.delete(personId);
  notifyListeners();
}

// ─── Mutation Functions ─────────────────────────────────────────────────────

/**
 * Apply growth points for a person, respecting the daily cap.
 * Returns a GrowthTransition if a stage boundary was crossed, else null.
 *
 * Growth NEVER regresses — if the old points are somehow higher
 * (shouldn't happen), the delta is clamped to 0.
 */
function applyGrowth(
  personId: string,
  rawDelta: number
): GrowthTransition | null {
  const budget = getDailyBudget(personId);
  const awarded = Math.min(rawDelta, budget);
  if (awarded <= 0) return null;

  const oldPoints = _growthPoints.get(personId) ?? 0;
  const oldStage = getStageFromPoints(oldPoints);
  const newPoints = oldPoints + awarded;

  // Growth never regresses
  _growthPoints.set(personId, Math.max(oldPoints, newPoints));
  recordDailyUsage(personId, awarded);

  const newStage = getStageFromPoints(newPoints);
  notifyListeners();

  if (didStageAdvance(oldStage, newStage)) {
    _recentTransitions.add(personId);
    notifyListeners();
    return {
      previousStage: oldStage,
      newStage,
      personName: "", // Caller fills this in
    };
  }

  return null;
}

/**
 * Record growth from a saved memory.
 * Returns a GrowthTransition if stage advanced, else null.
 */
export function recordMemoryGrowth(
  personId: string,
  memory: { emotion: string | null; content: string }
): GrowthTransition | null {
  const rawDelta = computeMemoryPoints(memory);
  return applyGrowth(personId, rawDelta);
}

/**
 * Record growth from a reflection (interaction via ReflectSheet).
 * Returns a GrowthTransition if stage advanced, else null.
 *
 * IMPORTANT: Reach-out interactions (from reach-out/[id].tsx)
 * should NOT call this function.
 */
export function recordReflectionGrowth(
  personId: string
): GrowthTransition | null {
  return applyGrowth(personId, POINTS_REFLECTION);
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────

/**
 * Seed growth points from existing data arrays (mock or fetched).
 *
 * Called once on app init. Iterates all memories and interactions,
 * computes points for each, and populates the store.
 *
 * Rules:
 * - No daily cap applied retroactively (historical data)
 * - Bare interactions (no note AND no emotion) get +0 (reach-outs)
 * - Interactions with note or emotion get +1 (reflections)
 * - Growth never regresses — if already bootstrapped with higher
 *   points, they are preserved.
 *
 * Idempotent: runs at most once.
 */
export function bootstrapGrowthFromData(
  memories: Memory[],
  interactions: Interaction[]
): void {
  if (_isBootstrapped) return;
  _isBootstrapped = true;

  // Accumulate points per person from memories
  const pointsByPerson = new Map<string, number>();

  for (const memory of memories) {
    const personId = memory.person_id;
    const pts = computeMemoryPoints({
      emotion: memory.emotion,
      content: memory.content,
    });
    pointsByPerson.set(personId, (pointsByPerson.get(personId) ?? 0) + pts);
  }

  // Accumulate points per person from reflections
  for (const interaction of interactions) {
    // Only count as reflection if it has note or emotion (not bare reach-outs)
    const isReflection =
      interaction.note !== null || interaction.emotion !== null;
    if (isReflection) {
      const personId = interaction.person_id;
      pointsByPerson.set(
        personId,
        (pointsByPerson.get(personId) ?? 0) + POINTS_REFLECTION
      );
    }
  }

  // Apply to store (growth never regresses)
  for (const [personId, points] of pointsByPerson) {
    const existing = _growthPoints.get(personId) ?? 0;
    _growthPoints.set(personId, Math.max(existing, points));
  }

  notifyListeners();
}

// ─── Subscription ───────────────────────────────────────────────────────────

/**
 * Subscribe to growth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToGrowth(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}
