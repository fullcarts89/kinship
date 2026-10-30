// Person states (D13, PER-06): one answer, for everything that speaks on its
// own, to "may Kinship bring this person up?" Today's moments and Coming up
// lines, birthdays, notifications and the server's candidates all ask here,
// so a person the user paused or holds as remembered is never surfaced by
// any of them. Pure; no store, no time.
//
//   active       in People; Kinship may bring them back when it matters
//   paused       in People; Kinship keeps what it knows and brings nothing
//                back for now ("not now", estrangement). Reversible: Resume
//   remembered   in People; Kinship keeps their memories and never brings
//                them back (grief, an ex). Reversible, asked once more
//   archived     removed from People (founder I3); restorable from Settings
//
// Only the user sets paused and remembered, from the person's page. Nothing
// here, in extraction or on the server ever sets them (contract §7.10).

import type { Person, PersonState } from "./repositories";

/** The two states the user sets to hold someone (D13). */
export type HoldState = Extract<PersonState, "paused" | "remembered">;

/** Someone Kinship may speak of on its own: in People, not held, not deleted. */
export function isProactiveEligible(person: Pick<Person, "state" | "deleted_at"> | null | undefined): boolean {
  return !!person && person.state === "active" && !person.deleted_at;
}

/** Someone the user is holding: paused or remembered (both still in People). */
export function isHeld(person: Pick<Person, "state" | "deleted_at"> | null | undefined): person is Person & { state: HoldState } {
  return !!person && !person.deleted_at && (person.state === "paused" || person.state === "remembered");
}

/** In People at all (held or not), as the list shows them. */
export function isInPeople(person: Pick<Person, "state" | "deleted_at"> | null | undefined): boolean {
  return !!person && !person.deleted_at && person.state !== "archived";
}

/**
 * What each control says, in Kinship's words. `name` is how Kinship says the
 * person's name (names.ts shortName). No counts, no scores: one line.
 */
export const HOLD_COPY = {
  paused: {
    action: "Pause",
    line: "Paused",
    explain: (name: string) => `Kinship keeps what it knows about ${name} and brings nothing back for now.`,
    confirmTitle: (name: string) => `Pause ${name}?`,
    confirmBody: (name: string) => `${name} stays in People. Nothing about ${name} will come up on Today, and no birthday will be mentioned, until you resume.`,
    confirm: "Pause",
    resume: "Resume",
  },
  remembered: {
    action: "Hold as remembered",
    line: "Remembered",
    explain: (name: string) => `Kinship keeps ${name}'s memories and never brings them back.`,
    confirmTitle: (name: string) => `Hold ${name} as remembered?`,
    confirmBody: (name: string) => `Everything you've told Kinship about ${name} stays, and ${name}'s page stays. Kinship won't bring ${name} up on Today or mention a birthday. You can change this later.`,
    confirm: "Hold as remembered",
    resume: "Resume",
    // Leaving the state is asked once more (grief deserves a second thought).
    resumeTitle: (name: string) => `Resume ${name}?`,
    resumeBody: (name: string) => `Kinship would bring ${name} up again when there's a reason to. ${name}'s memories don't change either way.`,
  },
  cancel: "Cancel",
} as const;

/** The quiet line on a held person's page ("Paused", "Remembered"), or null. */
export function stateLine(person: Pick<Person, "state" | "deleted_at"> | null | undefined): string | null {
  return isHeld(person) ? HOLD_COPY[person.state].line : null;
}
