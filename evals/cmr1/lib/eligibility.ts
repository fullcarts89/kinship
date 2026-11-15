// Showing Up eligibility at the extraction boundary, from docs/product/today-eligibility.md.
//
// Today's own selection has windows, scores and a freshness rule that belong to the phone; this asks
// the structural question the extraction decides: given the line as planned (kind, subject, sensitivity,
// date shape, wording), could Today ever use it as a Moment or a quiet line? The ledger's `eligible`
// answers the same question from the product rules, so a mismatch is a line the extraction has put on
// the wrong side of the rules (a relative's event made the person's own, a sensitive line left plain,
// a day lost, a promise without its due day).

import { FOLLOWUP_POLICY } from "../../../supabase/functions/_shared/extraction/pipeline.ts";
import { wordingSensitivities } from "../../../supabase/functions/_shared/extraction/lexicon.ts";
import type { PlannedItem } from "../../../supabase/functions/_shared/extraction/types.ts";

export interface Eligibility {
  eligible: boolean;
  why: string;
}

/** Good news said outright (today-eligibility.md, "Good news"). */
const GOOD_NEWS = /\b(promot(?:ed|ion)|got (?:the|a|an|her|his|their) (?:\w+ ){0,3}(?:job|role|offer|position|promotion|grant|fellowship|part|place)|new job|got engaged|engaged|got married|married|had the baby|baby (?:was |is )?born|graduated|passed (?:her|his|their) (?:\w+ ){0,2}(?:exam|exams|test|bar|boards|defense|defence)|got into (?:the |a |an )?(?:\w+ ){0,2}(?:residency|program|programme|school|college|university|fellowship)|bought (?:a|the|their|her|his) (?:house|home|flat|apartment)|closed on (?:the|a|their) (?:house|home)|retired|accepted (?:the|an|a) offer|signed (?:the|a) (?:lease|contract|deal)|won)\b/iu;
const NAMED_MILESTONE = /\b(engag\w+|wedding|married|marry|new job|got the job|promot\w+|baby|born|graduat\w+|new (?:house|home|flat|apartment)|bought (?:a|the|their|her|his) (?:house|home|flat|apartment)|retir\w+|mov(?:ed|ing|es) (?:to|in|house|out)|move)\b/iu;
const NEGATED =/\b(?:not|n't|never|no|didn't|doesn't|isn't|wasn't|hasn't|haven't)\b/iu;
const BIRTHDAY = /\bbirthday\b/iu;

function day(it: PlannedItem): string | null {
  const d = it.detail as Record<string, unknown>;
  const s = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : null);
  if (it.kind === "promise") return s("due_date");
  if (it.kind === "event" || it.kind === "plan") return s("date_precision") === "day" || (s("date") && !s("date_precision")) ? s("date") : null;
  return (s("date_precision") ?? (s("date") ? "day" : null)) === "day" ? s("date") : null;
}

function coarse(it: PlannedItem): boolean {
  const d = it.detail as Record<string, unknown>;
  const p = typeof d.date_precision === "string" ? d.date_precision : typeof d.season === "string" && d.season ? "season" : null;
  return p !== null && p !== "day";
}

export function eligibility(it: PlannedItem): Eligibility {
  if (it.tier === "hold") return { eligible: false, why: "held for a question" };
  if (it.sensitivity !== "none") return { eligible: false, why: `sensitive (${it.sensitivity})` };
  if (it.subject_type === "related") return { eligible: false, why: "a relative's line" };
  if (it.kind === "thread" && wordingSensitivities(it.statement).length) return { eligible: false, why: "a thread with sensitive wording" };
  const exact = day(it);
  switch (it.kind) {
    case "event":
      if (exact) return { eligible: true, why: FOLLOWUP_POLICY[(it.detail as { event_type?: keyof typeof FOLLOWUP_POLICY }).event_type ?? "other"] === "none" ? "exact-day event (Coming up)" : "exact-day event (follow-up and Coming up)" };
      return { eligible: false, why: coarse(it) ? "an event with a coarse date" : "an event with no day" };
    case "plan":
      return exact ? { eligible: true, why: "a plan with its exact day (Coming up)" } : { eligible: false, why: "a plan without an exact day" };
    case "promise":
      if (exact) return { eligible: true, why: it.subject_type === "user" ? "your promise with its due day" : "their promise to you with its day (Waiting on)" };
      return { eligible: false, why: "a promise without its due day" };
    case "thread":
      if (coarse(it)) return { eligible: false, why: "a thread with a month or a season" };
      return { eligible: true, why: exact ? "an open thread with its day" : "an open thread, asked once after 42 days" };
    case "milestone":
      // Named outright: an engagement, wedding, new job, promotion, baby, graduation, new home, retirement or move (H16).
      if (exact && NAMED_MILESTONE.test(it.statement) && (it.certainty === "stated" || it.certainty === "planned")) return { eligible: true, why: "a named milestone with its day" };
      if (GOOD_NEWS.test(it.statement) && !NEGATED.test(it.statement) && !coarse(it)) return { eligible: true, why: "good news said outright" };
      return { eligible: false, why: exact ? "a milestone that is a maybe or hearsay" : "a milestone without its day" };
    case "fact":
    case "moment":
      if (BIRTHDAY.test(it.statement) && exact) return { eligible: true, why: "a birthday from a note" };
      if (GOOD_NEWS.test(it.statement) && !NEGATED.test(it.statement) && !coarse(it) && (it.certainty === "stated" || it.certainty === "planned")) {
        return { eligible: true, why: "good news said outright" };
      }
      return { eligible: false, why: "page only" };
    default:
      return { eligible: false, why: "page only" };
  }
}
