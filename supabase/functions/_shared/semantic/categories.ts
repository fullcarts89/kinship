// The closed organizational taxonomy (founder CC-19, CC-20; Phase 4B, B1;
// docs/product/phase4-implementation-brief.md §3).
//
// Categorization is not semantic normalization: this only says where an
// existing memory sits in What Kinship knows. It reads the memory's existing
// fields (kind, fact category, event type, subject, certainty, who else it's
// about) and, where those don't say, a few fixed words. It's computed every
// time and never stored; it never changes a memory's words, source,
// certainty, sensitivity, status or supersession, never hides one, and never
// links one memory to another. The model never labels anything, and the user
// is never asked for a category. When nothing fits, a memory goes to
// Background: placement can be wrong, but nothing is ever lost.
//
// Words count only when the user's own words say it (the note's quotes; the
// line itself when the user wrote or edited it) and the line as kept says it
// too: a note's other sentence never places a line, and neither does a
// phrasing the user didn't use. Ordinary plans and dated happenings are
// placed by their kind and event type, never by words in passing ("lunch
// near Ben's office" is still a plan).
//
// Interests stay natural language: no carbonara → Italian, no basketball →
// sports. Nothing here reads a surname as a family role, a name as a gender,
// or one person's relative as another's.
//
// Shared by the app (H15's sections) and the gateway. Plain TypeScript.

/** The closed set. Work, education and residence stay distinct inside Background. */
export const CATEGORIES = [
  "work", "education", "residence", "interest", "preference", "aspiration", "plan", "their_people", "between_you", "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** What Kinship knows, in this order (H15). Empty sections disappear. */
export const SECTIONS = ["background", "into", "hoping_to", "plans", "their_people", "between_you"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_OF: Record<Category, Section> = {
  work: "background",
  education: "background",
  residence: "background",
  other: "background",
  interest: "into",
  preference: "into",
  aspiration: "hoping_to",
  plan: "plans",
  their_people: "their_people",
  between_you: "between_you",
};

/** The headings as the page says them. */
export const SECTION_LABEL: Record<Section, string> = {
  background: "Background",
  into: "Into",
  hoping_to: "Hoping to",
  plans: "Plans",
  their_people: "Their people",
  between_you: "Between you",
};

/** What categorization reads: a memory's existing fields, never anything new. */
export interface Categorizable {
  kind: string;
  statement: string;
  subject_type?: string | null;
  certainty?: string | null;
  user_state?: string | null;
  detail?: Record<string, unknown> | null;
  with_person_ids?: readonly string[] | null;
}

/** Wanting, hoping, aiming: the words express an aspiration (CC-17: never every plan). */
const DESIRE =
  /\b(?:wants? to|wanted to|hop(?:e|es|ing) to|would (?:really )?love to|['’]d (?:really )?love to|dreams? (?:of|about)|dreaming (?:of|about)|dream (?:is|was) to|trying to|working (?:towards?|on becoming)|aims? to|aiming to|longs? to|would (?:really )?like to|['’]d (?:really )?like to|goal is to)\b/iu;
/** Not wanting to is not an aspiration. */
const NOT_DESIRE =
  /\b(?:doesn['’]?t|don['’]?t|didn['’]?t|does not|do not|did not|isn['’]?t|is not|never|no longer)\s+(?:\S+\s+){0,2}?(?:wants?|wanted|hop(?:e|es|ing)|wish(?:es)?|trying|dreams?|aim(?:s|ing)?)\b/iu;
/** Work, said outright. */
const WORK =
  /\b(?:job|jobs|works? (?:at|for|as|in)|working (?:at|for|as)|hired|promot(?:ed|ion)|company|boss|co-?workers?|colleagues?|career|employer|laid off|quit (?:his|her|their|the) job|retir(?:e|es|ed|ing|ement))\b/iu;
/** School and study, said outright. */
const EDUCATION =
  /\b(?:graduat(?:e|es|ed|ing|ion)|college|university|grad school|high school|phd|master['’]?s|bachelor['’]?s|degree|diploma|major(?:s|ed|ing)? in|stud(?:ies|ied|ying) (?:at|in)|students? (?:at|in)|grad student|semester|thesis|dissertation|class of|alma mater|enrolled)\b/iu;

const EVENT_WORK = new Set(["interview", "job_start"]);
const EVENT_EDUCATION = new Set(["school_start", "exam"]);
/** Dated happenings shown with Plans (brief §3 rule 9; an event of no type is "other"); other event types sit in Background. */
const EVENT_PLAN = new Set(["trip", "other"]);

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * The category of a memory: the first rule that fits (brief §3).
 * `quotes` are the user's own words behind it: its sources' quotes.
 */
export function categoryOf(item: Categorizable, quotes: readonly string[] = []): Category {
  const detail = item.detail ?? {};
  const kind = item.kind;
  const subject = item.subject_type ?? "person";
  const factCategory = kind === "fact" ? str(detail.category) : "";
  const eventType = kind === "event" ? str(detail.event_type) : "";
  const theirs = item.user_state === "user_authored" || item.user_state === "edited";
  const own = theirs ? [item.statement, ...quotes] : [...quotes];
  // Words count when the kept line and the user's own words both say it.
  const fits = (w: string, re: RegExp, not?: RegExp) => re.test(w) && !(not && not.test(w));
  const said = (re: RegExp, not?: RegExp) => fits(item.statement, re, not) && own.some((w) => fits(w, re, not));
  // Plans and dated happenings are placed by kind and event type alone.
  const dated = kind === "plan" || kind === "event";

  // 1. Between you: what you share, and what's said between you.
  if (subject === "shared" || subject === "user" || kind === "context" || kind === "tradition" || kind === "moment" || kind === "promise") {
    return "between_you";
  }
  // 2. Their people: someone of theirs, their family and pets, or a memory with someone else in People.
  if (subject === "related" || factCategory === "family" || factCategory === "pet" || (item.with_person_ids?.length ?? 0) > 0) {
    return "their_people";
  }
  // 3. Hoping to: only when the source expresses it, or the event carries their goal (before Into on purpose:
  //    "wants to learn pottery" is Hoping to, "loves pottery" is Into).
  if (item.certainty === "wished" || str(detail.event_goal).trim() !== "" || said(DESIRE, NOT_DESIRE)) {
    return "aspiration";
  }
  // 4–5. Into: interests and tastes, in the line's own words.
  if (factCategory === "interest") return "interest";
  if (factCategory === "preference") return "preference";
  // 6. Work.
  if (factCategory === "work" || EVENT_WORK.has(eventType) || (!dated && said(WORK))) return "work";
  // 7. School and study.
  if (EVENT_EDUCATION.has(eventType) || (!dated && said(EDUCATION))) return "education";
  // 8. Where they live. (B2 adds the residence facet here.)
  if (factCategory === "home" || eventType === "move") return "residence";
  // 9. Plain plans, and trips and other dated happenings.
  if (kind === "plan" || (kind === "event" && EVENT_PLAN.has(eventType || "other"))) return "plan";
  // 10. Everything else (other, health, life events, milestones, threads): Background.
  return "other";
}

export function sectionOf(item: Categorizable, quotes: readonly string[] = []): Section {
  return SECTION_OF[categoryOf(item, quotes)];
}
