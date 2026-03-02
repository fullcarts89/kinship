/**
 * Vitality Engine
 *
 * Calculates a vitality score (0.0 to 1.0) for each person based on
 * time since their last interaction or memory. This score is used
 * ONLY for visual rendering — it is never displayed as a number.
 *
 * Vitality follows a gradual decay curve:
 * - 0-7 days since last activity:   1.0 (fully vibrant)
 * - 7-14 days:                       0.9
 * - 14-30 days:                      0.75
 * - 30-60 days:                      0.6
 * - 60-90 days:                      0.45
 * - 90-180 days:                     0.3
 * - 180+ days:                       0.2 (floor — never fully dead)
 *
 * The curve is intentionally generous. Most people don't talk to
 * every friend every week, and the app should not punish that.
 * The floor of 0.2 ensures plants always have life.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type VitalityLevel = "vibrant" | "healthy" | "resting" | "dormant";

export interface VitalityInfo {
  score: number;
  level: VitalityLevel;
  daysSinceLastActivity: number;
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Get a vitality score (0.0–1.0) based on days since last activity.
 * The curve is generous — the floor of 0.2 ensures plants always feel alive.
 */
export function getVitalityScore(daysSinceLastActivity: number): number {
  if (daysSinceLastActivity <= 7) return 1.0;
  if (daysSinceLastActivity <= 14) return 0.9;
  if (daysSinceLastActivity <= 30) return 0.75;
  if (daysSinceLastActivity <= 60) return 0.6;
  if (daysSinceLastActivity <= 90) return 0.45;
  if (daysSinceLastActivity <= 180) return 0.3;
  return 0.2;
}

/**
 * Map a vitality score to a human-readable level for visual modifiers.
 *
 * | Level     | Score Range | Visual Effect                    |
 * |-----------|-------------|----------------------------------|
 * | vibrant   | >= 0.85     | Full opacity, full sway          |
 * | healthy   | >= 0.6      | Full opacity, gentle sway        |
 * | resting   | >= 0.35     | Slightly faded, minimal sway     |
 * | dormant   | < 0.35      | Noticeably faded, nearly still   |
 */
export function getVitalityLevel(score: number): VitalityLevel {
  if (score >= 0.85) return "vibrant";
  if (score >= 0.6) return "healthy";
  if (score >= 0.35) return "resting";
  return "dormant";
}

/**
 * Compute days since the most recent activity (memory or interaction)
 * for a given person.
 *
 * Returns 999 if no activity exists (brand-new person with no data).
 */
export function getDaysSinceLastActivity(
  memories: { occurred_at?: string; created_at: string }[],
  interactions: { created_at: string }[]
): number {
  const allDates = [
    ...memories.map((m) => new Date(m.occurred_at || m.created_at).getTime()),
    ...interactions.map((i) => new Date(i.created_at).getTime()),
  ];
  if (allDates.length === 0) return 999;
  const mostRecent = Math.max(...allDates);
  const now = Date.now();
  return Math.floor((now - mostRecent) / (1000 * 60 * 60 * 24));
}

/**
 * Convenience: compute full VitalityInfo for a person's activity history.
 */
export function getVitalityInfo(
  memories: { created_at: string }[],
  interactions: { created_at: string }[]
): VitalityInfo {
  const days = getDaysSinceLastActivity(memories, interactions);
  const score = getVitalityScore(days);
  const level = getVitalityLevel(score);
  return { score, level, daysSinceLastActivity: days };
}

// ─── Sway Parameters ────────────────────────────────────────────────────────

/**
 * Get sway animation parameters based on vitality level.
 * Used by VitalPlant and plant carousel components.
 */
export function getSwayParams(level: VitalityLevel): {
  amplitude: number; // rotation degrees
  duration: number; // ms for half-cycle
} {
  switch (level) {
    case "vibrant":
      return { amplitude: 3, duration: 1500 };
    case "healthy":
      return { amplitude: 2, duration: 1750 };
    case "resting":
      return { amplitude: 1, duration: 2250 };
    case "dormant":
      return { amplitude: 0.5, duration: 2750 };
  }
}

/**
 * Get the cream overlay opacity for desaturation effect.
 * Lower vitality → more cream overlay → appears washed out.
 */
export function getOverlayOpacity(score: number): number {
  return (1 - score) * 0.4;
}
