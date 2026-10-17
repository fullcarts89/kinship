// The residence dry run (Phase 4B B6; brief §14; founder CC-19 "existing
// wrong supersessions: report only", CC-20, CC-25). What the approved
// residence semantics would make of an account's existing lines, as a
// report: an item id and a bucket per reading, never a word of content.
// Pure, deterministic and model-free; nothing here writes.
//
//   examined   every live line (not removed, not retracted) whose own words
//              or category look residential; everything else is left alone
//   eligible   a line residence.ts reads as a current residence (§5), from
//              the user's own words (the quotes of its notes; the line itself
//              when the user wrote or edited it), that may carry a reading
//              (a stated, unshared, non-sensitive fact about the person or a
//              related person). A live reading already on the line is used as
//              it is (B3 read it)
//   resolved · candidates · unknown_place   what the place data makes of the
//              words (§7): pinned, several readings, or none
//   would_compose   current eligible lines of one person, subject and related
//              person that the composer (compose.ts) says as one line
//   contradiction   two current eligible lines that can't both be true, read
//              as the comparator reads them (the newer as N; N14 is one-way):
//              its invariant, broken before it existed
//   false_supersession_suspect   a closed eligible line whose live closer the
//              comparator would not have let close it: the same place or a
//              refinement with no change cue, or a correction in the closer's
//              words recorded as a plain replacement. A review candidate,
//              never proof: older lines lack the transitions and readings newer
//              ones carry
//   history_unknown   a closed eligible line with a live closer that records no
//              transition (and none that records a correction): never history
//              (CC-20), whatever happened. History needs every live closer to
//              record a change, as the composer decides it
//   not_residence   examined, and excluded by the rules: the reason is counted
//              in the summary, never stored
//
// The summary that goes with the rows is content-free too: counts, versions,
// and groups of ids (what composes together, what contradicts what, which
// closer closed which line). The founder reads the words through an
// owner-scoped join in the SQL editor (docs/product/b6-dry-run-report.md).

import { type ComposeMember, composeResidence, currentResidence, residenceGroupKey } from "./compose.ts";
import type { PlaceIndex } from "./placeIndex.ts";
import { wordsOf } from "./rederive.ts";
import { type FacetLike, pairClass } from "./relate.ts";
import { type Cue, residenceEligible, residenceOf, RULE_VERSION } from "./residence.ts";

export type Bucket =
  | "eligible" | "resolved" | "candidates" | "unknown_place" | "would_compose" | "contradiction"
  | "false_supersession_suspect" | "history_unknown" | "not_residence";

export const BUCKETS: readonly Bucket[] = [
  "eligible", "resolved", "candidates", "unknown_place", "would_compose", "contradiction",
  "false_supersession_suspect", "history_unknown", "not_residence",
];

/** Why an examined line gets no reading (counted, never stored). */
export type Exclusion = "kind_or_subject" | "hedged" | "sensitive" | "shared" | "wording";

/** A line as the report reads it (the owner's rows, loaded under their RLS). */
export interface ReportItem {
  id: string;
  person_id: string;
  kind: string;
  subject_type: string;
  subject_related_id: string | null;
  statement: string;
  certainty: string;
  sensitivity: string;
  status: string;
  user_state: string;
  detail: Record<string, unknown> | null;
  with_person_ids: string[] | null;
  supersedes_id: string | null;
  closes_ids: string[] | null;
  created_at: string;
  deleted_at?: string | null;
}

/** A live residence reading already on a line (memory_item_facets). */
export interface ReportFacet extends FacetLike {
  memory_item_id: string;
  decided_by?: string;
}

export interface ReportInput {
  items: readonly ReportItem[];
  /** The live quotes of each examined line's notes, by line id. */
  quotes: Readonly<Record<string, readonly string[]>>;
  facets: readonly ReportFacet[];
  places: PlaceIndex;
}

export interface ReportRow {
  memory_item_id: string;
  bucket: Bucket;
}

export interface ReportSummary {
  rule_version: string;
  dataset_version: string;
  /** Live lines in the account. */
  total: number;
  /** Lines whose words or category looked residential. */
  examined: number;
  /** Of the examined, read as a current residence. */
  eligible: number;
  /** Of the eligible, lines that already carry a live reading (B3 read them). */
  already_read: number;
  buckets: Record<Bucket, number>;
  excluded: Record<Exclusion, number>;
  /** Closed eligible lines by what their closers record. */
  closed: { history_eligible: number; never_history: number; history_unknown: number; no_live_closer: number };
  /** Closers filed on another person or subject than the line they close: never read against it (counted). */
  cross_person_closers: number;
  groups: {
    /** Each group of current lines the composer says as one line (ids, most specific first). */
    would_compose: string[][];
    /** Pairs of current lines that can't both be true. */
    contradiction: [string, string][];
    /** A closed line and the live closer the comparator would not have let close it. */
    false_supersession_suspect: { item: string; closer: string; why: "same" | "refines" | "correction_unrecorded" }[];
    history_unknown: { item: string; closers: string[] }[];
  };
}

/** Words that make a line worth examining; the rules then decide (never the model's category alone). */
const RESIDENTIAL = /\b(?:lives?|living|lived|moved?|moving|relocat\w*|based\s+in|resides?|residing|stay(?:s|ed|ing)?|grew\s+up|is\s+from|born\s+in|address|hometown|home\s+town)\b/iu;

export function looksResidential(item: Pick<ReportItem, "statement" | "detail">, words: readonly string[] = []): boolean {
  const category = item.detail && typeof item.detail.category === "string" ? item.detail.category : null;
  // The user's own words count as much as the model's statement: a note that says where someone lives
  // behind a statement that doesn't is examined too (the reading itself is always from the words).
  return category === "home" || RESIDENTIAL.test(item.statement) || words.some((w) => RESIDENTIAL.test(w));
}

const live = (it: ReportItem) => !it.deleted_at && it.status !== "retracted";

function exclusionOf(it: ReportItem): Exclusion | null {
  if (it.kind !== "fact" || (it.subject_type !== "person" && it.subject_type !== "related")) return "kind_or_subject";
  if (it.certainty !== "stated") return "hedged";
  if (it.sensitivity !== "none") return "sensitive";
  if ((it.with_person_ids?.length ?? 0) > 0) return "shared";
  return null;
}

interface Read {
  item: ReportItem;
  facet: FacetLike;
  cues: readonly Cue[];
  alreadyRead: boolean;
}

/** The line's reading: the live one it carries, else read now from the user's own words. */
function readLine(it: ReportItem, quotes: readonly string[], facets: Map<string, ReportFacet>, places: PlaceIndex): Read | null {
  let cues: readonly Cue[] = [];
  let derived: FacetLike | null = null;
  for (const words of wordsOf(it, quotes)) {
    const text = words.normalize("NFC");
    const found = residenceOf(text, [{ start: 0, end: Array.from(text).length }], places);
    if (found) {
      derived = found.facet;
      cues = found.cues;
      break;
    }
  }
  const stored = facets.get(it.id);
  if (stored) return { item: it, facet: stored, cues, alreadyRead: true };
  return derived ? { item: it, facet: derived, cues, alreadyRead: false } : null;
}

const historyTransition = (t: unknown) => t === "changed" || t === "completed" || t === "cancelled";

export function residenceReport(input: ReportInput): { rows: ReportRow[]; summary: ReportSummary } {
  const items = input.items.filter(live);
  const facets = new Map(input.facets.map((f) => [f.memory_item_id, f]));
  const rows: ReportRow[] = [];
  const add = (id: string, bucket: Bucket) => rows.push({ memory_item_id: id, bucket });
  const buckets = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  const excluded: Record<Exclusion, number> = { kind_or_subject: 0, hedged: 0, sensitive: 0, shared: 0, wording: 0 };
  const summary: ReportSummary = {
    rule_version: RULE_VERSION,
    dataset_version: input.places.version,
    total: items.length,
    examined: 0,
    eligible: 0,
    already_read: 0,
    buckets,
    excluded,
    closed: { history_eligible: 0, never_history: 0, history_unknown: 0, no_live_closer: 0 },
    cross_person_closers: 0,
    groups: { would_compose: [], contradiction: [], false_supersession_suspect: [], history_unknown: [] },
  };

  // ── Each examined line: a reading, or why not ──
  const reads = new Map<string, Read>();
  for (const it of items) {
    if (!looksResidential(it, input.quotes[it.id] ?? [])) continue;
    summary.examined++;
    const why = exclusionOf(it);
    const read = why ? null : readLine(it, input.quotes[it.id] ?? [], facets, input.places);
    if (why || !read) {
      excluded[why ?? "wording"]++;
      add(it.id, "not_residence");
      continue;
    }
    reads.set(it.id, read);
    summary.eligible++;
    if (read.alreadyRead) summary.already_read++;
    add(it.id, "eligible");
    add(it.id, read.facet.place_ref ? "resolved" : read.facet.candidates.length ? "candidates" : "unknown_place");
  }

  // ── Current lines, by person, subject and related person: what composes, what contradicts ──
  const groups = new Map<string, Read[]>();
  for (const r of reads.values()) {
    if (!currentResidence({ ...r.item, deleted_at: r.item.deleted_at ?? null, with_person_ids: r.item.with_person_ids ?? [] }, { slot: "residence" })) continue;
    const key = residenceGroupKey(r.item);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const members: ComposeMember[] = group.map((r) => ({ id: r.item.id, facet: r.facet, told: r.item.created_at }));
    for (const line of composeResidence(members).lines) {
      if (line.memberIds.length < 2) continue;
      summary.groups.would_compose.push(line.memberIds);
      for (const id of line.memberIds) add(id, "would_compose");
    }
    const flagged = new Set<string>();
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const [a, b] = [group[i], group[j]];
        // As the comparator read them when the newer was told (N14 is one-way): the newer line as N.
        const [newer, older] = a.item.created_at >= b.item.created_at ? [a, b] : [b, a];
        if (pairClass(newer.facet, older.facet) === "DISJOINT") {
          summary.groups.contradiction.push([a.item.id, b.item.id]);
          flagged.add(a.item.id);
          flagged.add(b.item.id);
        }
      }
    }
    for (const id of flagged) add(id, "contradiction");
  }

  // ── Closed lines: what their live closers say ──
  const closersOf = new Map<string, ReportItem[]>();
  for (const it of items) {
    for (const id of [it.supersedes_id, ...(it.closes_ids ?? [])]) {
      if (typeof id !== "string") continue;
      closersOf.set(id, [...(closersOf.get(id) ?? []), it]);
    }
  }
  for (const r of reads.values()) {
    if (r.item.status !== "superseded") continue;
    const closers = closersOf.get(r.item.id) ?? [];
    if (!closers.length) {
      summary.closed.no_live_closer++;
      continue;
    }
    const transitions = closers.map((c) => c.detail?.transition ?? null);
    // As the composer decides it (compose.ts historyEligible, CC-20): every live closer must record a
    // change. A correction or progress on any closer settles it as never history; otherwise a closer with
    // no transition leaves it unknown.
    if (transitions.every(historyTransition)) summary.closed.history_eligible++;
    else if (transitions.some((t) => t === "corrected" || t === "progress")) summary.closed.never_history++;
    else {
      summary.closed.history_unknown++;
      summary.groups.history_unknown.push({ item: r.item.id, closers: closers.map((c) => c.id) });
      add(r.item.id, "history_unknown");
    }
    // A closer the comparator reads: would it have closed this line?
    let suspect = false;
    for (const c of closers) {
      // Never across people or subjects (§8 guard): such a closure is counted, never read.
      if (residenceGroupKey(c) !== residenceGroupKey(r.item)) {
        summary.cross_person_closers++;
        continue;
      }
      const n = reads.get(c.id);
      if (!n) continue;
      const cls = pairClass(n.facet, r.facet);
      const kinds = new Set(n.cues.map((cue) => cue.kind));
      const correction = kinds.has("correction") || kinds.has("not");
      const change = kinds.has("change");
      let why: "same" | "refines" | "correction_unrecorded" | null = null;
      if (cls === "SAME") why = "same";
      else if ((cls === "E_CONTAINS_N" || cls === "N_CONTAINS_E") && !change && !correction) why = "refines";
      else if (correction && c.detail?.transition !== "corrected") why = "correction_unrecorded";
      if (why) {
        summary.groups.false_supersession_suspect.push({ item: r.item.id, closer: c.id, why });
        suspect = true;
      }
    }
    if (suspect) add(r.item.id, "false_supersession_suspect");
  }

  for (const row of rows) buckets[row.bucket]++;
  // One row per line and bucket (the table's key), in a stable order.
  const seen = new Set<string>();
  const unique = rows.filter((row) => {
    const k = `${row.memory_item_id}|${row.bucket}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a, b) => a.memory_item_id.localeCompare(b.memory_item_id) || BUCKETS.indexOf(a.bucket) - BUCKETS.indexOf(b.bucket));
  for (const b of BUCKETS) buckets[b] = unique.filter((row) => row.bucket === b).length;
  return { rows: unique, summary };
}
