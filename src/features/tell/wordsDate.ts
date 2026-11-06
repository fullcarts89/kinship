// A words edit that names a different day (the redesign made the contradiction loud: the Coming up
// ledger said "SUN, NOV 15" over "…moves in on November 22 · EDITED BY YOU"). After a words save, if the
// line has a day and the new words name a *different* day Kinship can read, the sheet goes on to ask
// ("Is it now Sun, Nov 22?", the day pre-set, one tap to confirm). The date is never changed silently,
// and two days are never left on one line without asking. Reading is the extraction's own resolver.
import { resolveDate } from "../../../supabase/functions/_shared/extraction/dates";

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const PATTERNS: RegExp[] = [
  new RegExp(`\\b${MONTH}\\.? \\d{1,2}(?:st|nd|rd|th)?\\b(?:,? \\d{4})?`, "iu"),
  new RegExp(`\\b(?:the )?\\d{1,2}(?:st|nd|rd|th)? of ${MONTH}\\b`, "iu"),
  /\b(?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/iu,
  /\b(?:tomorrow|today|tonight|yesterday)\b/iu,
];

/** The one day these words name, as an ISO day, or null when they name none Kinship can read. */
export function dayNamedIn(words: string, nowIso: string, timeZone: string | null): string | null {
  for (const re of PATTERNS) {
    const m = words.match(re);
    if (!m) continue;
    const r = resolveDate(m[0], nowIso, timeZone, "future");
    if (r.date && r.precision === "day") return r.date;
  }
  return null;
}

/**
 * "A day you wrote" (notebook review, PR #77 §7): the one exact day the user's own words for a line
 * name ("the 15th I think", "Thursday"), and those words, read from when the note was told. Null when
 * the words name no day Kinship can read. Offered as a choice, never applied by itself.
 */
export function dayWrittenIn(words: string, toldAtIso: string, timeZone: string | null): { date: string; words: string } | null {
  for (const re of [...PATTERNS, /\b(?:on )?the \d{1,2}(?:st|nd|rd|th)\b/iu]) {
    const m = words.match(re);
    if (!m) continue;
    const r = resolveDate(m[0], toldAtIso, timeZone, "future");
    if (r.date && r.precision === "day" && !r.date_end) return { date: r.date, words: m[0] };
  }
  return null;
}

/** The day to ask about after a words edit: only when the line has a day and the words name another. */
export function proposedDay(line: { when?: { value?: string | null } | null }, words: string, nowIso: string, timeZone: string | null): string | null {
  const current = line.when?.value ?? null;
  if (!current) return null;
  const named = dayNamedIn(words, nowIso, timeZone);
  return named && named !== current ? named : null;
}

/** The device's own zone, where the user is. */
export function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
