/**
 * Season Engine
 *
 * Pure logic for Tending Seasons: rhythm windows, season naming, and
 * the guilt firewall in code form.
 *
 * THE HARD RULES (from docs/SPEC_TENDING_SEASONS.md §3.5):
 * - Rhythms are soft cadences, never deadlines. The numeric interval is
 *   internal only — UI renders the human label.
 * - A rhythm window that passes unmet ROLLS SILENTLY: the window simply
 *   reopens. There is no concept of "missed" anywhere in this module.
 * - No counts, no completion states, no overdue.
 */

import type { SeasonCommitment, Interaction, TendingRhythm } from "@/types/database";

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_TENDED_PEOPLE = 5;
export const SEASON_LENGTH_DAYS = 92;

/** Internal cadence per rhythm — never rendered. */
const RHYTHM_INTERVAL_DAYS: Record<TendingRhythm, number> = {
  often: 7,
  regularly: 17,
  now_and_then: 30,
};

/** Human labels — the only representation the UI may show. */
export const RHYTHM_LABELS: Record<TendingRhythm, string> = {
  often: "Often",
  regularly: "Regularly",
  now_and_then: "Now and then",
};

/** Gentle descriptions for the rhythm picker. */
export const RHYTHM_DESCRIPTIONS: Record<TendingRhythm, string> = {
  often: "A steady presence in each other's weeks",
  regularly: "Close, without crowding",
  now_and_then: "Deep roots that don't need constant water",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Season naming ──────────────────────────────────────────────────────────

/** Meteorological season name + year, e.g. "Summer 2026". */
export function seasonNameFor(date: Date = new Date()): string {
  const month = date.getMonth();
  const name =
    month >= 2 && month <= 4
      ? "Spring"
      : month >= 5 && month <= 7
        ? "Summer"
        : month >= 8 && month <= 10
          ? "Autumn"
          : "Winter";
  return `${name} ${date.getFullYear()}`;
}

// ─── Rhythm windows ─────────────────────────────────────────────────────────

/**
 * Whether a tended person's rhythm window is open — i.e. enough time has
 * passed since the last interaction that reaching out fits the chosen
 * cadence. Brand-new (no interactions) counts as open.
 *
 * Deliberately stateless: there is nothing to "miss". If the user
 * doesn't act, the window just stays open; once they connect, it closes
 * and reopens after the interval.
 */
export function isRhythmOpen(
  commitment: SeasonCommitment,
  interactions: Interaction[],
  now: Date = new Date()
): boolean {
  const interval = RHYTHM_INTERVAL_DAYS[commitment.rhythm];
  let lastMs = 0;
  for (const i of interactions) {
    if (i.person_id !== commitment.person_id) continue;
    const t = new Date(i.created_at).getTime();
    if (t > lastMs) lastMs = t;
  }
  if (lastMs === 0) return true;
  return now.getTime() - lastMs >= interval * DAY_MS;
}

/** Days until a commitment's rhythm next opens (0 if open now). */
export function daysUntilRhythmOpens(
  commitment: SeasonCommitment,
  interactions: Interaction[],
  now: Date = new Date()
): number {
  if (isRhythmOpen(commitment, interactions, now)) return 0;
  const interval = RHYTHM_INTERVAL_DAYS[commitment.rhythm];
  let lastMs = 0;
  for (const i of interactions) {
    if (i.person_id !== commitment.person_id) continue;
    const t = new Date(i.created_at).getTime();
    if (t > lastMs) lastMs = t;
  }
  const opensAt = lastMs + interval * DAY_MS;
  return Math.max(0, Math.ceil((opensAt - now.getTime()) / DAY_MS));
}

/** Whether a season's end date has passed. */
export function hasSeasonEnded(season: { ends_at: string }, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(season.ends_at).getTime();
}
