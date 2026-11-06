// Person states (D13, PER-06): one answer, for everything that speaks on its
// own, to "may Kinship bring this person up?" Today's moments and Coming up
// lines, birthdays, notifications and the server's candidates all ask here,
// so a person whose reminders are paused is never surfaced by any of them.
// Pure; no store, no time.
//
//   active       in People; Kinship may bring them back when it matters
//   paused       in People; Kinship keeps what it knows and brings nothing
//                back until the user turns reminders on again
//   remembered   the same, and no longer offered (founder, 5 Nov 2026: one
//                "Pause reminders" control replaced Pause and Hold as
//                remembered). An older row can still hold it, and reads the same
//   archived     removed from People (founder I3); restorable from Settings
//
// Only the user pauses reminders, from the person's page. Nothing here, in
// extraction or on the server ever sets them (contract §7.10).

import type { PersonState } from "./repositories";

/** The states that hold someone (D13); the user sets only `paused` now. */
export type HoldState = Extract<PersonState, "paused" | "remembered">;

/** What the helpers read of a person: the state, and whether the row is deleted. */
export interface StateLike {
  state: unknown;
  deleted_at?: unknown;
}

/** Someone Kinship may speak of on its own: in People, not held, not deleted. */
export function isProactiveEligible(person: StateLike | null | undefined): boolean {
  return !!person && person.state === "active" && !person.deleted_at;
}

/** Someone whose reminders are paused (still in People). */
export function isHeld<T extends StateLike>(person: T | null | undefined): person is T & { state: HoldState } {
  return !!person && !person.deleted_at && (person.state === "paused" || person.state === "remembered");
}

/** In People at all (held or not), as the list shows them. */
export function isInPeople(person: StateLike | null | undefined): boolean {
  return !!person && !person.deleted_at && person.state !== "archived";
}

/**
 * What the control says, in Kinship's words. `name` is how Kinship says the
 * person's name (names.ts shortName). No counts, no scores: one line.
 */
export const PAUSE_COPY = {
  action: "Pause reminders",
  line: "Reminders paused",
  explain: (name: string) => `Kinship keeps everything about ${name}, but won't bring ${name} up on Today or mention a birthday until you turn this off.`,
  resume: "Resume",
} as const;

/** The quiet line on a held person's page, or null. */
export function stateLine(person: StateLike | null | undefined): string | null {
  return isHeld(person) ? PAUSE_COPY.line : null;
}
