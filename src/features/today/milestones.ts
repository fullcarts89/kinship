// Milestones as Today moments (founder H16; CC-17, CC-18, CC-19): an
// engagement, a wedding, a new job, a promotion, a baby, a graduation, a new
// home, a retirement, a move.
//
// Recognised, never interrogated, and never inferred:
//   * only from explicit words in the user's own note (the source quote; the
//     words the user typed when they edited or wrote the line themselves) and
//     in the line as kept; a residence that changed is never a "move";
//   * only with a day-precise date: a month, a year or no date is remembered
//     quietly, and nothing ever asks for one;
//   * eligible from about three days before through the day itself; Today's
//     ranking decides whether it speaks, and it speaks once (freshness and the
//     one-per-person-per-week cap do the rest);
//   * anchored to an established person: the person's own milestone or one
//     shared with them, never a relative's ("Ben's sister's wedding"); someone
//     not in People keeps their name in the words ("Anthony and Natalia's
//     wedding is Saturday").
//
// Deterministic and closed: nine types, fixed word lists, no model.

import type { MemoryItem } from "@/store/repositories";

export type MilestoneType =
  | "engagement" | "wedding" | "new_job" | "promotion" | "baby" | "graduation" | "new_home" | "retirement" | "move";

/** Words that name each milestone outright. Order matters: the first that fits names it. */
const WORDS: [MilestoneType, RegExp][] = [
  ["engagement", /\b(?:getting engaged|get engaged|gets engaged|engagement|propos(?:e|es|ed|ing))\b/iu],
  ["wedding", /\b(?:wedding|getting married|get married|gets married|marry|marrying|marries)\b/iu],
  ["baby", /\b(?:baby|babies|due date|giving birth|gives birth|birth of|newborn)\b/iu],
  ["graduation", /\bgraduat(?:es|ed|ing|ion)\b|\b(?:will|to|gonna) graduate\b/iu],
  ["retirement", /\bretir(?:e|es|ed|ing|ement)\b/iu],
  ["promotion", /\bpromot(?:ed|ion)\b/iu],
  ["new_job", /\b(?:new job|starts? (?:a |her |his |their |the )?(?:new )?job|starting (?:a |her |his |their |the )?(?:new )?job|first day (?:at|of)|start(?:s|ing)? work(?:ing)? at)\b/iu],
  ["new_home", /\b(?:new (?:home|house|place|apartment|flat)|closing on|closes on|moving in|moves in|move in|housewarming)\b/iu],
  ["move", /\b(?:moving|moves|move) (?:to|out|away|back|across)\b|\brelocat(?:e|es|ing)\b/iu],
];

/** A negation or a cancellation in the words: never a milestone. */
const NOT = /\b(?:not|no longer|never|isn['’]?t|aren['’]?t|wasn['’]?t|won['’]?t|didn['’]?t|doesn['’]?t|cancel+ed|called off|off)\b/iu;

/** The milestone the words name, or null. */
export function milestoneIn(words: string): MilestoneType | null {
  if (!words.trim() || NOT.test(words)) return null;
  for (const [type, re] of WORDS) if (re.test(words)) return type;
  return null;
}

/**
 * The milestone a memory explicitly names: the kept line must name it, and so
 * must the user's own words behind it (the note's quotes; the line itself when
 * the user wrote or edited it). Null otherwise.
 */
export function milestoneOf(item: MemoryItem, quotes: string[]): MilestoneType | null {
  const kept = milestoneIn(item.statement);
  if (!kept) return null;
  const own = item.user_state === "user_authored" || item.user_state === "edited" ? [item.statement, ...quotes] : quotes;
  return own.some((q) => milestoneIn(q) === kept) ? kept : null;
}

/** How sure the line is: a milestone moment needs it said, planned or heard, never a maybe or a wish. */
export function firmEnough(item: MemoryItem): boolean {
  return item.certainty === "stated" || item.certainty === "planned" || item.certainty === "reported";
}

/** Days before the day it becomes eligible (and through the day itself). */
export const MILESTONE_DAYS_BEFORE = 3;
/** Its weight in Today's ranking (plan §13): with a birthday's, below an event's follow-up. */
export const MILESTONE_WEIGHT = 80;
