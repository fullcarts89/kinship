// Gate 0, Final Trust Closure (founder round 4, CC-18): the server side of
// each fix, through the real pipeline and answer path, with the model reply
// that went wrong written by hand.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem, type ResolveExisting } from "./resolve.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const ROSTER = [
  { key: "p1", id: "michelle", display_name: "Michelle Lee", full_name: "Michelle Lee", nicknames: [], relationship_label: null },
  { key: "p2", id: "sam-eden", display_name: "Sam Eden", full_name: "Sam Eden", nicknames: [], relationship_label: null },
  { key: "p3", id: "sam-d", display_name: "Sam Doughty", full_name: "Sam Doughty", nicknames: [], relationship_label: null },
  { key: "p4", id: "ben", display_name: "Ben Oxnard", full_name: "Ben Oxnard", nicknames: [], relationship_label: null },
];
const PEOPLE = ROSTER.map((p) => ({ id: p.id, display_name: p.display_name, state: "active" }));

function input(note: string, roster = ROSTER): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-07T17:00:00Z", time_zone: "America/Los_Angeles", context_person_key: null },
    roster, related: [], dossier: [],
  };
}

const NO_DETAIL = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function item(over: Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedItem["detail"]> }): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: "Michelle", subject: "person", related_relation: null, related_name: null,
    statement: "x", evidence: ["x"], certainty: "stated", sensitivity: "none", confidence: 0.95, date_text: null,
    date_direction: "future", existing: { action: "new", target: null }, ...over,
    detail: { ...NO_DETAIL, ...(over.detail ?? {}) } as ProposedItem["detail"],
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);

/** A planned item as the gateway stores it when held (handler.ts present()). */
function asHeld(p: PlannedItem): HeldItem {
  return JSON.parse(JSON.stringify(p)) as HeldItem;
}

// ─── I10 (+H13): "Michelle and Sam might be moving to Australia", two Sams ───

const AUSTRALIA = "Michelle and Sam might be moving to Australia.";
const QUOTE = "Michelle and Sam might be moving to Australia";
const mirrored = () => [
  item({
    kind: "thread", person: "p1", person_mention: "Michelle", statement: "Michelle might be moving to Australia with Sam",
    evidence: [QUOTE], certainty: "tentative", detail: { topic: "moving to Australia" },
  }),
  item({
    kind: "thread", person: "p2", person_mention: "Sam", statement: "Sam might be moving to Australia with Michelle",
    evidence: [QUOTE], certainty: "tentative", detail: { topic: "moving to Australia" },
  }),
];

Deno.test("I10: the held mirror of a kept line asks only which Sam, and knows the line it belongs to", () => {
  const out = run(input(AUSTRALIA), mirrored());
  const kept = out.items.filter((i) => i.tier !== "hold");
  const held = out.items.filter((i) => i.tier === "hold");
  eq(kept.map((i) => [i.person_id, i.statement]), [["michelle", "Michelle might be moving to Australia with Sam"]]);
  eq(held.length, 1);
  eq(held[0].person_id, null);
  eq(held[0].twin_person_id, "michelle", "the held line knows it mirrors Michelle's");
  eq(held[0].mention, "Sam", "the name in question");
  eq(out.clarification?.question, "Which Sam do you mean?");
  eq(out.clarification?.options.includes("Michelle Lee"), false, "never offers someone already resolved");
});

Deno.test("I10: answering 'which Sam' joins that Sam to Michelle's kept line: one shared memory, never a second", () => {
  const out = run(input(AUSTRALIA), mirrored());
  const held = out.items.filter((i) => i.tier === "hold").map(asHeld);
  const existing: ResolveExisting[] = [{
    id: "m-michelle", person_id: "michelle", kind: "thread", subject_type: "person", subject_related_id: null,
    statement: "Michelle might be moving to Australia with Sam", status: "active", user_state: "unreviewed",
  }];
  const r = resolveHeld(held, [{ index: 0, person_id: "sam-eden" }], { note: AUSTRALIA, people: PEOPLE, related: [], existing });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.length, 1);
  eq(r.items[0].person_id, "michelle");
  eq(r.items[0].action, { type: "merge", target_id: "m-michelle" });
  eq(r.items[0].with_person_ids, ["sam-eden"]);
  eq(r.items[0].kind, "thread");
});

Deno.test("I10: both lines waiting in one review (Michelle's for a yes): still one shared memory", () => {
  const out = run(input(AUSTRALIA), mirrored());
  const all = out.items.map((p) => asHeld({ ...p, tier: "hold" }));
  const answers = all.map((h, index) => (h.person_id ? { index, accept: true as const } : { index, person_id: "sam-d" }));
  const r = resolveHeld(all, answers, { note: AUSTRALIA, people: PEOPLE, related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.length, 1);
  eq([r.items[0].person_id, r.items[0].with_person_ids], ["michelle", ["sam-d"]]);
  eq(r.items[0].action.type, "new");
});

Deno.test("I10: Michelle's line gone by the time of the answer: the Sam line is kept on its own, shared with Michelle", () => {
  const out = run(input(AUSTRALIA), mirrored());
  const held = out.items.filter((i) => i.tier === "hold").map(asHeld);
  const r = resolveHeld(held, [{ index: 0, person_id: "sam-eden" }], { note: AUSTRALIA, people: PEOPLE, related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.map((i) => [i.person_id, i.action.type, i.with_person_ids]), [["sam-eden", "new", ["michelle"]]]);
});

Deno.test("I10: not a mirror (other words, another sentence): no twin, as before", () => {
  const note = "Michelle is moving to Australia. Sam is getting a dog.";
  const out = run(input(note), [
    item({ kind: "thread", person: "p1", person_mention: "Michelle", statement: "Michelle is moving to Australia", evidence: ["Michelle is moving to Australia"], detail: { topic: "moving to Australia" } }),
    item({ kind: "thread", person: "p2", person_mention: "Sam", statement: "Sam is getting a dog", evidence: ["Sam is getting a dog"], detail: { topic: "getting a dog" } }),
  ]);
  const held = out.items.filter((i) => i.tier === "hold");
  eq(held.length, 1);
  eq(held[0].twin_person_id ?? null, null);
});
