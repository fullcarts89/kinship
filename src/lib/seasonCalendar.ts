/**
 * Season Calendar Echoes — opt-in, off by default.
 *
 * When enabled, writes ONE all-day, free-time event per rhythm window
 * opening across the season ("🌱 A good week to reach out to Priya").
 * Deliberately NOT recurring time blocks — the snoozed-reminder
 * graveyard is the failure mode this product exists to avoid.
 *
 * Uses the lazy-require pattern for expo-calendar (matching
 * calendarEngine) so the module loads even where the native module
 * is unavailable.
 */

import type { SeasonCommitment, Season, Person, TendingRhythm } from "@/types/database";

const RHYTHM_INTERVAL_DAYS: Record<TendingRhythm, number> = {
  often: 7,
  regularly: 17,
  now_and_then: 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCalendar(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-calendar");
  } catch {
    return null;
  }
}

/**
 * Write all-day echo events for a season. Returns the number written,
 * or null when calendar access is unavailable/denied. Safe to call
 * once at season creation; events carry a recognizable title prefix.
 */
export async function writeSeasonEchoes(
  season: Season,
  commitments: SeasonCommitment[],
  persons: Person[]
): Promise<number | null> {
  const Calendar = getCalendar();
  if (!Calendar) return null;

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return null;

    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    if (!defaultCalendar) return null;

    const personsById = new Map(persons.map((p) => [p.id, p]));
    const start = new Date(season.starts_at).getTime();
    const end = new Date(season.ends_at).getTime();
    let written = 0;

    for (const commitment of commitments) {
      const person = personsById.get(commitment.person_id);
      if (!person) continue;
      const firstName = person.name.split(" ")[0];
      const interval = RHYTHM_INTERVAL_DAYS[commitment.rhythm] * DAY_MS;

      for (let t = start + interval; t < end; t += interval) {
        await Calendar.createEventAsync(defaultCalendar.id, {
          title: `\u{1F331} A good week to reach out to ${firstName}`,
          startDate: new Date(t),
          endDate: new Date(t + DAY_MS),
          allDay: true,
          availability: Calendar.Availability?.FREE ?? "free",
          notes: "From your Kinship tending season — just an echo, never an obligation.",
        });
        written++;
      }
    }
    return written;
  } catch {
    return null;
  }
}
