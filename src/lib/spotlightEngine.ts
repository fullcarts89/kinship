/**
 * Spotlight Engine
 *
 * Weighted selection for "A Moment Worth Revisiting" — the Home screen
 * memory spotlight and the memory-resurfacing notification.
 *
 * Random rotation wastes the app's strongest retention surface. Instead,
 * each eligible memory (7+ days old, so it feels like a rediscovery) is
 * scored on warmth signals:
 *
 *   - Anniversary: same calendar day as today, a year or more later  (+50)
 *   - Near-anniversary: within 3 days of the date it happened        (+20)
 *   - Season match: same meteorological season, a previous year      (+8)
 *   - Has a photo                                                    (+10)
 *   - Has an emotion tag                                             (+6)
 *   - Long-unseen: log-scaled age boost, so old gems resurface       (0–10)
 *
 * Selection is deterministic per day (top-scored, with a daily-rotating
 * tiebreak) so the spotlight doesn't shuffle on every render.
 */

import type { Memory } from "@/types/database";
import { simpleHash } from "@/lib/suggestionEngine";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Memories younger than this never resurface — they aren't memories yet. */
const MIN_AGE_DAYS = 7;

export interface SpotlightPick {
  memory: Memory;
  /**
   * Optional warm caption for why this memory surfaced today,
   * e.g. "One year ago today" — null when there's no special reason.
   */
  reason: string | null;
}

function memoryDate(m: Memory): Date {
  return new Date(m.occurred_at || m.created_at);
}

/** Meteorological season index (0=spring, 1=summer, 2=autumn, 3=winter). */
function seasonOf(d: Date): number {
  const month = d.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 0;
  if (month >= 5 && month <= 7) return 1;
  if (month >= 8 && month <= 10) return 2;
  return 3;
}

/**
 * Days between today and the memory's month/day anniversary,
 * ignoring year (0 = the anniversary is today).
 */
function daysFromAnniversary(memDate: Date, today: Date): number {
  const thisYear = new Date(
    today.getFullYear(),
    memDate.getMonth(),
    memDate.getDate()
  );
  const diff = Math.abs(thisYear.getTime() - today.getTime());
  const wrapped = Math.min(diff, 365 * DAY_MS - diff); // handle year boundary
  return Math.round(wrapped / DAY_MS);
}

function scoreMemory(m: Memory, today: Date): { score: number; reason: string | null } {
  const date = memoryDate(m);
  const ageDays = Math.floor((today.getTime() - date.getTime()) / DAY_MS);

  let score = 0;
  let reason: string | null = null;

  // Anniversary signals (only meaningful once a memory is months old)
  if (ageDays >= 300) {
    const annDays = daysFromAnniversary(date, today);
    const yearsAgo = Math.round(ageDays / 365);
    if (annDays === 0) {
      score += 50;
      reason =
        yearsAgo <= 1 ? "One year ago today" : `${yearsAgo} years ago today`;
    } else if (annDays <= 3) {
      score += 20;
      reason =
        yearsAgo <= 1
          ? "Around this time last year"
          : `Around this time, ${yearsAgo} years ago`;
    } else if (seasonOf(date) === seasonOf(today)) {
      score += 8;
    }
  }

  // Rich memories resurface better
  if (m.photo_url) score += 10;
  if (m.emotion) score += 6;

  // Gentle boost for long-unseen memories (log-scaled, capped)
  score += Math.min(10, Math.log2(Math.max(1, ageDays / MIN_AGE_DAYS)) * 3);

  return { score, reason };
}

/**
 * Pick today's spotlight memory, or null when nothing is eligible.
 * Deterministic for a given day.
 */
export function selectSpotlightMemory(
  memories: Memory[],
  now: Date = new Date()
): SpotlightPick | null {
  const eligible = memories.filter(
    (m) => now.getTime() - memoryDate(m).getTime() >= MIN_AGE_DAYS * DAY_MS
  );
  if (eligible.length === 0) return null;

  const dayIdx = Math.floor(now.getTime() / DAY_MS);

  let best: { memory: Memory; score: number; reason: string | null } | null =
    null;
  for (const memory of eligible) {
    const { score, reason } = scoreMemory(memory, now);
    // Daily-rotating tiebreak so equal-scored memories take turns
    const tiebreak = ((simpleHash(memory.id) + dayIdx) % 997) / 997;
    const total = score + tiebreak;
    if (!best || total > best.score) {
      best = { memory, score: total, reason };
    }
  }

  return best ? { memory: best.memory, reason: best.reason } : null;
}
