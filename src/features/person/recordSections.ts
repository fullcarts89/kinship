// What Kinship knows, organised (Phase 4B B8; founder CC-17, CC-18, CC-19,
// CC-20; brief §3, §4, §11): the same lines the page has always listed, in
// the approved sections, in the approved order:
//
//   Background    the current residence first (one composed line, B5), then
//                 work, then education, then the rest, each newest first;
//                 then quiet "Before" history (I7, §11)
//   Into          interests and tastes, the verb kept ("Loves pottery",
//                 "Doesn't like skiing"; approved: things they like or don't)
//   Hoping to     only what the source expresses as hope, desire or a goal
//   Plans         ordinary plans and dated happenings, neutral (CC-17)
//   Their people  their family, pets and people, each under who they are
//                 ("Michelle · sister", from related_people); memories shared
//                 with others in People
//   Between you   what you share, and the conversations you confirmed (I2)
//
// Where a line sits comes from the closed taxonomy (categories.ts, B1):
// computed from the line's existing fields and the user's own words, never
// stored, never from the model. Empty sections disappear. No counts,
// completeness, progress, missing-info prompts or checklists. A wrong
// section never alters, hides or deletes a line: it is still the same line,
// with its source, Edit and Not this.
//
// One display rule (brief §4, approved): a line drops the person's leading
// name and keeps the rest of the user's words ("Susan works at Meta" →
// "Works at Meta"), only when the line's mention record puts this person's
// name first, followed by a lowercase word that isn't "and" or "or". Any
// other line shows unchanged ("Susan and Mike live in Alameda"). Display
// only: Edit, the Source view and the line's own words are untouched.
//
// History (I7, CC-20): a closed line is shown under Before only when every
// live line that replaced or closed it records a change (changed, completed
// or cancelled), it isn't sensitive, and it is durable: a residence, work,
// or a life thread that ended. Never from a correction, a plain replacement
// with no cue, a progress state, a refinement, or a supersession from
// before 4B with no transition recorded. Residence history is said in the
// composer's words ("Previously lived in Alameda, California"); anything
// else is the old line in its own words. It is dated by the day the change
// was told ("You told Kinship · Jan 4"), with "Moved · Jan 4" only when the
// note that said the move gives its day; never valid_to, never "Updated".
// No "Ended" or "Started": a closing note's date describes the new state
// ("got the job at Google on Jan 4" dates the new job, not Meta's end), and
// the fields can't tell the two apart, so no end date is claimed (CC-19:
// "Started" and "Ended" only when the source establishes the real date).
import { type Categorizable, type Category, categoryOf, SECTION_LABEL, SECTION_OF, type Section, SECTIONS } from "../../../supabase/functions/_shared/semantic/categories";
import { HISTORY_TRANSITIONS, historyEligible } from "../../../supabase/functions/_shared/semantic/compose";
import { mentionsOf, shortName } from "../../../supabase/functions/_shared/extraction/names";
import { momentLabel, monthName } from "@/features/memory/format";
import type { MemoryItem, RelatedPerson } from "@/store/repositories";
import type { RecordLine, RecordSection } from "./PersonRecordView";

export { SECTION_LABEL, SECTIONS };
export type { Section };

/** The quiet label over history lines in Background (founder CC-20, decision 4). */
export const BEFORE_LABEL = "Before";

/** How a residence history line is dated when the note that told the move gives its day (§11). */
export const HISTORY_WHEN = { moved: "Moved" } as const;

/** The note's own words say a move (the cues of brief §8); only then is its date the move's. */
const MOVE_WORDS = /\b(?:moved|has moved|relocated|now lives?|lives? in\b.*\bnow)\b/iu;

/** Where a line sits, from its existing fields and the user's own words behind it (B1). */
export function sectionFor(item: Categorizable, quotes: readonly string[]): { category: Category; section: Section } {
  const category = categoryOf(item, quotes);
  return { category, section: SECTION_OF[category] };
}

/** Inside Background: the residence first, then work, then education, then the rest (brief §4). */
const BACKGROUND_ORDER: Partial<Record<Category, number>> = { residence: 0, work: 1, education: 2, other: 3 };

/**
 * The words the page shows for a line: the user's words without the
 * person's leading name, when the line's own mention record puts that name
 * first and a lowercase word that isn't "and" or "or" follows. Otherwise
 * null: the line shows unchanged.
 */
export function withoutLeadingName(
  statement: string,
  item: Pick<MemoryItem, "person_id" | "person_mentions"> & { subject_type?: unknown },
  person: { id: string; display_name: string; full_name?: unknown; nicknames?: unknown } | null,
): string | null {
  if (!person || item.subject_type === "related" || item.subject_type === "user") return null;
  const [first] = mentionsOf(item.person_mentions);
  if (!first || first.person_id !== item.person_id) return null;
  // The name as the line shows it now: the words recorded, or the name they go by (voiced, founder I12).
  const names = [...new Set([first.text, shortName(person), person.display_name.trim()])].filter(Boolean);
  for (const name of names) {
    if (!statement.startsWith(name)) continue;
    const rest = statement.slice(name.length);
    const m = /^\s+(\p{Ll}[\p{L}'’-]*)(?=[\s,.;:!?]|$)/u.exec(rest);
    if (!m) continue;
    if (m[1] === "and" || m[1] === "or") return null;
    const words = rest.trimStart();
    return words[0].toLocaleUpperCase() + words.slice(1);
  }
  return null;
}

/** "Michelle · sister", or "Sister" when the note gave no name (the heading over a related person's lines). */
export function relatedHeading(r: Pick<RelatedPerson, "name" | "relation">): string {
  const relation = String(r.relation ?? "").trim();
  if (r.name && r.name.trim()) return relation ? `${r.name.trim()} · ${relation}` : r.name.trim();
  return relation ? relation[0].toLocaleUpperCase() + relation.slice(1) : "";
}

/**
 * Whether a closed line may be shown as history (brief §11, CC-20), and
 * how: every live closer records a change; not sensitive; durable (a
 * residence, work, or a life thread that ended). `closers` are the live
 * lines that replaced or closed it.
 */
export function historyKind(
  item: Pick<MemoryItem, "kind" | "status"> & { deleted_at?: unknown; sensitivity?: unknown },
  category: Category,
  closers: readonly { transition?: unknown }[],
): "residence" | "work" | "thread" | null {
  if (item.status !== "superseded" || item.deleted_at) return null;
  if ((item.sensitivity ?? "none") !== "none") return null;
  if (!historyEligible(closers)) return null;
  if (category === "residence") return "residence";
  if (category === "work") return "work";
  if (item.kind === "thread" && closers.every((c) => c.transition === "completed" || c.transition === "cancelled")) return "thread";
  return null;
}

/** The transitions that are evidence of a change, for callers that read closers themselves. */
export const CHANGE_TRANSITIONS = HISTORY_TRANSITIONS;

/**
 * "Moved · Jan 4" when the note that said the move ("moved to Colorado on
 * Jan 4") gives the day; "Moved · January" for a month; nothing otherwise
 * (§11: never valid_to, never "Updated"). Work and threads carry no date
 * line: a closing note's date is the new state's, never proof of when the
 * old one ended (review of PR #56).
 */
export function historyWhen(kind: "residence" | "work" | "thread", closer: { statement?: unknown; detail?: unknown }, now: Date): string | null {
  if (kind !== "residence") return null;
  if (typeof closer.statement !== "string" || !MOVE_WORDS.test(closer.statement)) return null;
  const d = (closer.detail ?? {}) as Record<string, unknown>;
  const date = typeof d.date === "string" ? d.date : "";
  const precision = typeof d.date_precision === "string" ? d.date_precision : date ? "day" : "";
  if (!/^\d{4}-\d{2}-\d{2}/u.test(date)) return null;
  if (precision === "day") return `${HISTORY_WHEN.moved} · ${momentLabel(`${date.slice(0, 10)}T12:00:00`, now, false)}`;
  if (precision === "month") {
    const year = Number(date.slice(0, 4));
    return `${HISTORY_WHEN.moved} · ${monthName(Number(date.slice(5, 7)) - 1)}${year !== now.getFullYear() ? ` ${year}` : ""}`;
  }
  return null;
}

/** "You told Kinship · Jan 4": the day the change was told (the closer's note). */
export function historyProvenance(toldAt: string | null, now: Date): string {
  return toldAt ? `You told Kinship · ${momentLabel(toldAt, now, false)}` : "You told Kinship";
}

export interface SectionInput {
  /** Every current line, newest first, each with its section (and category, for Background's order). */
  lines: readonly RecordLine[];
  /** History lines for Background's Before (already eligible), newest change first. */
  history?: readonly RecordLine[];
  /** Whether the conversations trail has anything (Between you shows for it alone). */
  trail?: boolean;
}

/**
 * The page's sections, in the approved order, each with its lines in the
 * order given (newest first), empty ones left out. Background orders by
 * category then adds Before; Their people groups each related person's
 * lines under who they are, then the rest.
 */
export function sectionsFor(input: SectionInput): RecordSection[] {
  const out: RecordSection[] = [];
  for (const key of SECTIONS) {
    let rows = input.lines.filter((r) => (r.section ?? "background") === key);
    if (key === "background") {
      const rank = (r: RecordLine) => BACKGROUND_ORDER[r.category ?? "other"] ?? 3;
      rows = rows.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map((x) => x.r);
      for (const h of input.history ?? []) rows.push({ ...h, under: BEFORE_LABEL });
    } else if (key === "their_people") {
      const grouped: RecordLine[] = [];
      const seen = new Set<string>();
      for (const r of rows) {
        if (!r.under || seen.has(r.under)) continue;
        seen.add(r.under);
        grouped.push(...rows.filter((o) => o.under === r.under));
      }
      rows = [...grouped, ...rows.filter((r) => !r.under)];
    }
    if (!rows.length && !(key === "between_you" && input.trail)) continue;
    out.push({ key, label: SECTION_LABEL[key], rows });
  }
  return out;
}
