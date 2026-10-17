// The residence dry run (Phase 4B B6; brief §14): what the report says of an
// account's existing lines, over the real place data, without writing
// anything. Run: deno test supabase/functions
import { placeIndex } from "./places/dataset.ts";
import { type Bucket, looksResidential, type ReportFacet, type ReportItem, residenceReport } from "./report.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const PLACES = placeIndex();
const SUSAN = "person-susan";
const DANA = "person-dana";
let n = 0;

function line(statement: string, over: Partial<ReportItem> = {}): ReportItem {
  n++;
  return {
    id: `item-${String(n).padStart(3, "0")}`, person_id: SUSAN, kind: "fact", subject_type: "person", subject_related_id: null, statement,
    certainty: "stated", sensitivity: "none", status: "active", user_state: "unreviewed", detail: { category: "home" }, with_person_ids: [],
    supersedes_id: null, closes_ids: [], created_at: `2026-10-${String(n).padStart(2, "0")}T12:00:00Z`, ...over,
  };
}
/** The quotes of a line's notes: its statement, unless said otherwise. */
function report(items: ReportItem[], over: { quotes?: Record<string, string[]>; facets?: ReportFacet[] } = {}) {
  const quotes = Object.fromEntries(items.map((it) => [it.id, over.quotes?.[it.id] ?? [it.statement]]));
  return residenceReport({ items, quotes, facets: over.facets ?? [], places: PLACES });
}
const bucketsOf = (r: ReturnType<typeof report>, id: string): Bucket[] => r.rows.filter((row) => row.memory_item_id === id).map((row) => row.bucket);

Deno.test("(1, 2) a plain current residence with an unambiguous place: eligible and resolved… no: candidates with a usual reading", () => {
  const a = line("Susan lives in Alameda");
  const r = report([a]);
  // "Alameda" alone is read by its usual reading, never pinned (§7): candidates, not resolved.
  eq(bucketsOf(r, a.id), ["eligible", "candidates"]);
  const b = line("Susan lives in Alameda, CA");
  eq(bucketsOf(report([b]), b.id), ["eligible", "resolved"], "a qualifier pins it");
  eq([r.summary.total, r.summary.examined, r.summary.eligible, r.summary.rule_version, r.summary.dataset_version], [1, 1, 1, "residence/v1", "places-2026.10"]);
});

Deno.test("(3) an unknown place is eligible but unknown; a plain line that isn't about a home is never examined", () => {
  const bay = line("Susan lives in the Bay Area");
  const pottery = line("Susan loves pottery", { detail: { category: "interest" } });
  const r = report([bay, pottery]);
  eq(bucketsOf(r, bay.id), ["eligible", "unknown_place"]);
  eq(bucketsOf(r, pottery.id), []);
  eq([r.summary.total, r.summary.examined], [2, 1]);
  eq(looksResidential({ statement: "Susan loves pottery", detail: null }), false);
  eq(looksResidential({ statement: "Susan is based in Denver", detail: null }), true);
});

Deno.test("(4) California then Alameda, both current: one would_compose group, no contradiction", () => {
  const ca = line("Susan lives in California");
  const al = line("Susan lives in Alameda");
  const r = report([ca, al]);
  eq(bucketsOf(r, ca.id), ["eligible", "candidates", "would_compose"]);
  eq(bucketsOf(r, al.id), ["eligible", "candidates", "would_compose"]);
  eq(r.summary.groups.would_compose, [[al.id, ca.id]]);
  eq(r.summary.groups.contradiction, []);
});

Deno.test("(5) Alameda then Colorado without a cue, both still current: a contradiction, each line its own", () => {
  const al = line("Susan lives in Alameda");
  const co = line("Susan lives in Colorado");
  const r = report([al, co]);
  eq(bucketsOf(r, al.id), ["eligible", "candidates", "contradiction"]);
  eq(bucketsOf(r, co.id), ["eligible", "candidates", "contradiction"]);
  eq(r.summary.groups.contradiction, [[al.id, co.id]]);
  eq(r.summary.groups.would_compose, []);
  // A bare city told after a broader place is read as the comparator read it (N14, one-way): no contradiction.
  const ca = line("Susan lives in California");
  const hw = line("Susan lives in Hollywood");
  eq(report([ca, hw]).summary.groups.contradiction, []);
  // The other way round, the comparator would have closed Hollywood: a contradiction.
  const hw2 = line("Susan lives in Hollywood");
  const ca2 = line("Susan lives in California");
  eq(report([hw2, ca2]).summary.groups.contradiction, [[hw2.id, ca2.id]]);
});

Deno.test("(6) Alameda closed by an explicit move to Colorado: history-eligible, no suspect, no history_unknown", () => {
  const al = line("Susan lives in Alameda", { status: "superseded" });
  const co = line("Susan moved to Colorado", { supersedes_id: al.id, detail: { category: "home", transition: "changed" } });
  const r = report([al, co]);
  eq(bucketsOf(r, al.id), ["eligible", "candidates"]);
  eq(r.summary.closed, { history_eligible: 1, never_history: 0, history_unknown: 0, no_live_closer: 0 });
  eq(r.summary.cross_person_closers, 0);
  eq(r.summary.groups.false_supersession_suspect, []);
});

Deno.test("(7) a possible false supersession: California closed by Alameda (a refinement) with no cue, before the comparator existed", () => {
  const ca = line("Susan lives in California", { status: "superseded" });
  const al = line("Susan lives in Alameda", { supersedes_id: ca.id, detail: { category: "home" } });
  const r = report([ca, al]);
  eq(bucketsOf(r, ca.id), ["eligible", "candidates", "false_supersession_suspect", "history_unknown"]);
  eq(r.summary.groups.false_supersession_suspect, [{ item: ca.id, closer: al.id, why: "refines" }]);
  // The same place told again, recorded as a replacement: suspect too.
  const a1 = line("Susan lives in Alameda", { status: "superseded" });
  const a2 = line("Susan lives in Alameda", { supersedes_id: a1.id, detail: { category: "home" } });
  eq(report([a1, a2]).summary.groups.false_supersession_suspect, [{ item: a1.id, closer: a2.id, why: "same" }]);
  // A correction in the closer's words recorded as a plain replacement: a suspect of its own kind.
  const b1 = line("Susan lives in Alameda", { status: "superseded" });
  const b2 = line("Actually Susan lives in Oakland, not Alameda", { supersedes_id: b1.id, detail: { category: "home" } });
  eq(report([b1, b2]).summary.groups.false_supersession_suspect, [{ item: b1.id, closer: b2.id, why: "correction_unrecorded" }]);
  // A real change that refines ("moved to Alameda" after California): the cue says a move; not a suspect.
  const c1 = line("Susan lives in California", { status: "superseded" });
  const c2 = line("Susan moved to Alameda", { supersedes_id: c1.id, detail: { category: "home", transition: "changed" } });
  eq(report([c1, c2]).summary.groups.false_supersession_suspect, []);
});

Deno.test("(8) a closed line whose closer records no transition: history_unknown, never history", () => {
  const al = line("Susan lives in Alameda", { status: "superseded" });
  const co = line("Susan lives in Colorado", { supersedes_id: al.id, detail: { category: "home" } });
  const r = report([al, co]);
  eq(bucketsOf(r, al.id), ["eligible", "candidates", "history_unknown"]);
  eq(r.summary.groups.history_unknown, [{ item: al.id, closers: [co.id] }]);
  eq(r.summary.groups.false_supersession_suspect, [], "a plain replacement of a disjoint place is what the comparator does");
  // No live closer at all: counted, no bucket.
  const lone = line("Susan lives in Alameda", { status: "superseded" });
  const r2 = report([lone]);
  eq(r2.summary.closed.no_live_closer, 1);
  eq(bucketsOf(r2, lone.id), ["eligible", "candidates"]);
});

Deno.test("(9) a correction recorded as such is never history and never a suspect", () => {
  const al = line("Susan lives in Alameda", { status: "superseded" });
  const oak = line("Actually Susan lives in Oakland, not Alameda", { supersedes_id: al.id, detail: { category: "home", transition: "corrected" } });
  const r = report([al, oak]);
  eq(bucketsOf(r, al.id), ["eligible", "candidates"]);
  eq(r.summary.closed, { history_eligible: 0, never_history: 1, history_unknown: 0, no_live_closer: 0 });
  eq(r.summary.groups.false_supersession_suspect, []);
});

Deno.test("(10) stays, plans, the past and an address are examined and excluded as wording, never a reading", () => {
  const items = [
    line("Susan is staying in Denver this week"),
    line("Susan is moving to Oakland in August", { kind: "plan", detail: { category: null } }),
    line("Susan grew up in Austin"),
    line("Susan used to live in Austin"),
    line("Susan lives at 12 Main Street"),
    line("Susan doesn't live in Alameda anymore"),
  ];
  const r = report(items);
  for (const it of items) eq(bucketsOf(r, it.id), ["not_residence"], it.statement);
  eq(r.summary.excluded, { kind_or_subject: 1, hedged: 0, sensitive: 0, shared: 0, wording: 5 });
  eq(r.summary.eligible, 0);
});

Deno.test("(11) protected lines read from their own words; edited, shared, hedged and sensitive lines as the rules say", () => {
  // Edited: the user's words now, not the note's.
  const edited = line("Susan lives in Oakland", { user_state: "edited" });
  const r = report([edited], { quotes: { [edited.id]: ["Susan lives in Alameda"] } });
  eq(bucketsOf(r, edited.id), ["eligible", "candidates"]);
  eq(r.rows.length, 2);
  const hedged = line("Susan might be living in Alameda", { certainty: "tentative" });
  const sensitive = line("Susan lives in Alameda", { sensitivity: "health" });
  const shared = line("Susan and Ben live in Alameda", { with_person_ids: [DANA] });
  const r2 = report([hedged, sensitive, shared]);
  for (const it of [hedged, sensitive, shared]) eq(bucketsOf(r2, it.id), ["not_residence"], it.statement);
  eq(r2.summary.excluded, { kind_or_subject: 0, hedged: 1, sensitive: 1, shared: 1, wording: 0 });
  // A live reading the line already carries is used as it is (B3 read it; the user may have pinned it).
  const pinned = line("Susan lives in Paris");
  const facet: ReportFacet = {
    memory_item_id: pinned.id, value_text: "Paris", value_norm: "paris", place_ref: "city:4717560",
    candidates: [{ ref: "city:4717560", level: "city", ancestors: ["region:US.TX", "country:US"] }], usual_ref: "city:4717560", decided_by: "user",
  };
  const r3 = report([pinned], { facets: [facet] });
  eq(bucketsOf(r3, pinned.id), ["eligible", "resolved"]);
  eq(r3.summary.already_read, 1);
});

Deno.test("(12) never across people or subjects: Susan's California and Dana's Alameda, and a sister's Alameda, stay apart", () => {
  const ca = line("Susan lives in California");
  const dana = line("Dana lives in Alameda", { person_id: DANA });
  const sister = line("Susan's sister lives in Alameda", { subject_type: "related", subject_related_id: "rel-1" });
  const r = report([ca, dana, sister]);
  eq(r.summary.groups.would_compose, []);
  eq(r.summary.groups.contradiction, []);
  for (const it of [ca, dana, sister]) eq(bucketsOf(r, it.id), ["eligible", "candidates"], it.statement);
  // A closer of someone else's line is never read against it either.
  const closed = line("Susan lives in California", { status: "superseded" });
  const other = line("Dana lives in Alameda", { person_id: DANA, supersedes_id: closed.id, detail: { category: "home" } });
  const r2 = report([closed, other]);
  eq(r2.summary.groups.false_supersession_suspect, [], "cross-person");
  eq(r2.summary.cross_person_closers, 1);
});

Deno.test("(15) an account with nothing residential: no rows, honest counts; removed and retracted lines are never examined", () => {
  const r = report([line("Susan loves pottery", { detail: null }), line("Susan lives in Alameda", { deleted_at: "2026-10-16" }), line("Susan lives in Alameda", { status: "retracted" })]);
  eq(r.rows, []);
  eq([r.summary.total, r.summary.examined, r.summary.eligible], [1, 0, 0]);
  eq(residenceReport({ items: [], quotes: {}, facets: [], places: PLACES }).rows, []);
});

Deno.test("(13) the same lines give the same rows, in the same order, every time; nothing in a row but an id and a bucket", () => {
  const items = [line("Susan lives in California"), line("Susan lives in Alameda"), line("Susan is staying in Denver this week")];
  const a = report(items);
  const b = report([...items].reverse());
  eq(a.rows, b.rows);
  for (const row of a.rows) eq(Object.keys(row).sort(), ["bucket", "memory_item_id"]);
  eq(JSON.stringify(a).includes("Susan"), false, "no content anywhere in the result");
  eq(JSON.stringify(a).includes("Alameda"), false);
});
