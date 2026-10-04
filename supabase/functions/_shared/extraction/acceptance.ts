// Which "look over" items must wait for the user's explicit yes (founder
// invariant, Checkpoint D1 review): if getting the interpretation wrong could
// materially damage trust, it is not memory until the user accepts it.
//
//   blocking (pending until "Remember this"):
//     * anything sensitive: sensitivity ≠ none (illness, pregnancy or loss,
//       conflict or divorce, money trouble, other private matters such as
//       addiction, legal trouble or identity), including where the wording
//       raised it (flags `sensitive`, `sensitivity_raised`);
//     * `date_ambiguous`: the day itself could be read two ways.
//   non-blocking (saved on show, unreviewed, correctable): `mid_confidence`,
//     `date_coarse`, `reported`, `certainty_lowered`, `pronoun` (one possible
//     person), `new_related`, `protected_target`, `tradition`.
//
// Held ("hold" tier) items are always pending: they wait for an answer.
// Plain TypeScript with no imports, shared by the gateway and the app.

export const BLOCKING_FLAGS = ["sensitive", "sensitivity_raised", "date_ambiguous"] as const;

export const NON_BLOCKING_FLAGS = [
  "mid_confidence", "date_coarse", "reported", "certainty_lowered", "pronoun", "new_related", "protected_target", "tradition",
] as const;

/** A "look over" item that must not become memory until the user accepts it. */
export function needsAcceptance(item: { sensitivity: string; flags: readonly string[] }): boolean {
  return item.sensitivity !== "none" || item.flags.some((f) => (BLOCKING_FLAGS as readonly string[]).includes(f));
}
