// K20 (founder device check, 14 Oct): "I need to call John tonight" never reached Today. The server half:
// whatever shape the model gives it, the line keeps today as its day. Told again the next day it is the next
// day's call, never merged into yesterday's line (which keeps yesterday's day: nothing due today), and a
// line whose day the model didn't return still has the day its own words say.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import type { DossierItem, ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const ROSTER: RosterPerson[] = [
  { key: "p1", id: "john", display_name: "John", full_name: null, nicknames: [], relationship_label: null },
  { key: "p2", id: "ben", display_name: "Ben", full_name: null, nicknames: [], relationship_label: null },
];
const NOTE = "I need to call John tonight";
// Told on Wednesday 14 Oct, 4 pm in California (the founder's device check).
const input = (dossier: DossierItem[] = []): ExtractionInput => ({
  capture: { id: "c2", raw_text: NOTE, occurred_at: "2026-10-14T23:00:00Z", time_zone: "America/Los_Angeles", context_person_key: null },
  roster: ROSTER, related: [], dossier,
});
const NO_DETAIL = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function call(over: Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedItem["detail"]> }): ProposedItem {
  return {
    kind: "promise", person: "p1", person_mention: "John", subject: "user", related_relation: null, related_name: null,
    statement: "You need to call John tonight", evidence: [NOTE], certainty: "stated", sensitivity: "none", confidence: 0.93,
    date_text: "tonight", date_direction: "future", existing: { action: "new", target: null }, ...over,
    detail: { ...NO_DETAIL, ...(over.detail ?? {}) } as ProposedItem["detail"],
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);
const kept = (items: PlannedItem[]) => items.filter((i) => i.tier !== "hold");
const dayOf = (i: PlannedItem) => (i.detail.due_date ?? i.detail.date ?? null) as string | null;

// The 13 Oct line, as the founder's account had it: the same words, due that day.
const YESTERDAY: DossierItem = {
  key: "m1", id: "call-13", person_key: "p1", kind: "promise", subject_type: "user", statement: "You need to call John tonight",
  certainty: "stated", status: "active", user_state: "unreviewed", detail: { due_date: "2026-10-13", due_hint: "tonight" },
};

const SHAPES: [string, ProposedItem][] = [
  ["promise", call({})],
  ["promise, certainty planned, time of day night (live 13 Oct)", call({ certainty: "planned", detail: { time_of_day: "night" } })],
  ["plan", call({ kind: "plan", detail: { firmness: "intended" } })],
  ["promise without date words", call({ date_text: null })],
  ["plan without date words", call({ kind: "plan", date_text: null, detail: { firmness: "intended" } })],
];

for (const [label, shape] of SHAPES) {
  Deno.test(`K20 (${label}): kept for John, due today`, () => {
    const out = kept(run(input(), [shape]).items);
    eq(out.map((i) => [i.person_id, i.kind, dayOf(i)]), [["john", shape.kind, "2026-10-14"]]);
  });

  Deno.test(`K20 (${label}), told again the day after: a new line for today, never merged into yesterday's`, () => {
    const merge = { ...shape, existing: { action: "merge" as const, target: "m1" } };
    for (const s of [shape, merge]) {
      const out = kept(run(input(shape.kind === "promise" ? [YESTERDAY] : [{ ...YESTERDAY, kind: "plan", detail: { date: "2026-10-13", firmness: "intended" } }]), [s]).items);
      eq(out.map((i) => [i.action.type, dayOf(i)]), [["new", "2026-10-14"]], `existing ${s.existing.action}:`);
    }
  });
}

Deno.test("K20: told again the same day, it is the same line (merged, as before)", () => {
  const today = { ...YESTERDAY, detail: { due_date: "2026-10-14" } };
  const out = kept(run(input([today]), [call({ existing: { action: "merge", target: "m1" } })]).items);
  eq(out.map((i) => i.action), [{ type: "merge", target_id: "call-13" }]);
});

Deno.test("K20: a day is only taken from the line's own words, one plain same-day phrase, never a guess between two", () => {
  const both = "I need to call John tonight or tomorrow";
  const two = planExtraction({ ...input(), capture: { ...input().capture, raw_text: both } },
    { items: [call({ date_text: null, evidence: [both] })], needs_clarification: null } as ModelProposal);
  eq(kept(two.items).map(dayOf), [null], "'tonight or tomorrow' is not a plain day");
  const past = planExtraction(input(), { items: [call({ kind: "plan", date_text: null, date_direction: "past", detail: { firmness: "intended" } })], needs_clarification: null } as ModelProposal);
  eq(kept(past.items).map(dayOf), [null], "something told as past is never given a day to do it");
});
