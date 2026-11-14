// Frequency of use (founder, 14 Nov 2026; audits/2026-11-13-ux-motion-principles.md §5.2): Today is
// opened many times a day and is meant to be read and left, so its hero arrives in full (the 520 ms
// rise) only the first time it appears on a given day. Later the same day it fades in (150 ms), the
// way it does with Reduce Motion on.
//
// Kept in memory for this run of the app: a fresh launch counts as a new arrival. Nothing is stored,
// and nothing here is about the user or their people.

let lastFullDay: string | null = null;

/** The local calendar day, YYYY-MM-DD. */
export function localDay(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** True when the hero hasn't yet arrived in full today. Pure: safe to call while rendering. */
export function isFirstArrivalToday(now: Date = new Date()): boolean {
  return lastFullDay !== localDay(now);
}

/** Records that the hero arrived in full today (call when the arrival starts). */
export function markArrivedToday(now: Date = new Date()): void {
  lastFullDay = localDay(now);
}

/** Tests only. */
export function resetDailyArrivalForTests(): void {
  lastFullDay = null;
}
