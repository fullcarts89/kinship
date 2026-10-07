// Gate 0, Final Trust Closure (founder round 4, CC-18): the server side of
// each fix, through the real pipeline and answer path, with the model reply
// that went wrong written by hand.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem, type ResolveExisting } from "./resolve.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";

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

function input(note: string, roster: RosterPerson[] = ROSTER): ExtractionInput {
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

// ─── I12: a renamed person's earlier names find them; never on a guess ───────

const CUTIE = { key: "p1", id: "cutie", display_name: "Cutie Pie", full_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"], relationship_label: "wife" };

Deno.test("I12: a later note that still says 'Wifey' finds Cutie Pie, and a 'She' line names her whole", () => {
  const out = run(input("Wifey got a raise.", [CUTIE]), [item({
    person: "p1", person_mention: "Wifey", statement: "Wifey got a raise", evidence: ["Wifey got a raise"], detail: { category: "work" },
  })]);
  eq(out.items.map((i) => [i.person_id, i.tier !== "hold"]), [["cutie", true]]);
  const ctx = { ...input("She got a raise.", [CUTIE]), capture: { ...input("x").capture, raw_text: "She got a raise.", context_person_key: "p1" } };
  const she = run(ctx, [item({ person: "p1", person_mention: "She", statement: "She got a raise", evidence: ["She got a raise"], detail: { category: "work" } })]);
  eq(she.items[0].statement, "Cutie Pie got a raise");
});

Deno.test("I12: an earlier name that two people go by is asked about, never resolved silently", () => {
  const other = { key: "p2", id: "wifey-2", display_name: "Wifey", full_name: "Wifey", nicknames: [], relationship_label: null };
  const out = run(input("Wifey got a raise.", [CUTIE, other]), [item({
    person: "p1", person_mention: "Wifey", statement: "Wifey got a raise", evidence: ["Wifey got a raise"], detail: { category: "work" },
  })]);
  eq(out.items.map((i) => [i.person_id, i.tier]), [[null, "hold"]]);
  eq(out.items[0].flags.includes("person_ambiguous"), true);
});

Deno.test("I12: the answer to 'who is she?' names a renamed person whole", () => {
  const held: HeldItem = {
    kind: "fact", person_id: null, new_person_name: null, subject_type: "person", related: null, statement: "She got a raise",
    detail: { category: "work" }, certainty: "stated", sensitivity: "none", confidence: 0.8, action: { type: "new", target_id: null },
    tier: "hold", flags: ["pronoun_multiple"], spans: [{ start: 0, end: 15, quote: "She got a raise" }],
  };
  const r = resolveHeld([held], [{ index: 0, person_id: "cutie" }], {
    note: "She got a raise.", related: [], existing: [],
    people: [{ id: "cutie", display_name: "Cutie Pie", state: "active", full_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"] }],
  });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items[0].statement, "Cutie Pie got a raise");
});

// ─── I3: someone removed from People is never re-created, never guessed ─────

const REMOVED = [{ id: "kaiya", display_name: "Kaiya", full_name: null, nicknames: [] }];

Deno.test("I3: a note about removed Kaiya asks to bring her back (never 'someone new'), with her id offered", () => {
  const inp = { ...input("Kaiya lost her first tooth.", [ROSTER[3]]), archived: REMOVED };
  const out = run(inp, [item({
    kind: "moment", person: "new", person_mention: "Kaiya", statement: "Kaiya lost her first tooth", evidence: ["Kaiya lost her first tooth"],
    date_direction: "past", detail: { milestone_type: "other" },
  })]);
  eq(out.items.map((i) => [i.person_id, i.tier, i.new_person_name]), [[null, "hold", null]]);
  eq(out.items[0].flags.includes("person_archived"), true);
  eq(out.items[0].flags.includes("new_person"), false);
  eq(out.items[0].archived_ids, ["kaiya"]);
});

Deno.test("I3: a name that fits someone here and someone removed is asked about, never guessed", () => {
  const roster: RosterPerson[] = [{ key: "p1", id: "kaiya-2", display_name: "Kaiya", full_name: null, nicknames: [], relationship_label: "niece" }];
  const out = run({ ...input("Kaiya lost her first tooth.", roster), archived: REMOVED }, [item({
    kind: "moment", person: "p1", person_mention: "Kaiya", statement: "Kaiya lost her first tooth", evidence: ["Kaiya lost her first tooth"],
    date_direction: "past", detail: { milestone_type: "other" },
  })]);
  eq(out.items.map((i) => [i.person_id, i.tier]), [[null, "hold"]]);
  eq(out.items[0].flags.includes("person_ambiguous"), true);
  eq(out.items[0].archived_ids, ["kaiya"]);
});

Deno.test("I3: the answer may name the removed person it offered (brought back), and nobody else removed", () => {
  const held: HeldItem = {
    kind: "moment", person_id: null, new_person_name: null, subject_type: "person", related: null, statement: "Kaiya lost her first tooth",
    detail: {}, certainty: "stated", sensitivity: "none", confidence: 0.9, action: { type: "new", target_id: null }, tier: "hold",
    flags: ["person_archived"], spans: [{ start: 0, end: 26, quote: "Kaiya lost her first tooth" }], archived_ids: ["kaiya"], mention: "Kaiya",
  };
  const people = [{ id: "kaiya", display_name: "Kaiya", state: "archived" }, { id: "gone", display_name: "Old", state: "archived" }];
  const ok = resolveHeld([held], [{ index: 0, person_id: "kaiya" }], { note: "Kaiya lost her first tooth.", people, related: [], existing: [] });
  if ("fail" in ok) throw new Error(ok.fail);
  eq(ok.items[0].person_id, "kaiya");
  eq(resolveHeld([held], [{ index: 0, person_id: "gone" }], { note: "Kaiya lost her first tooth.", people, related: [], existing: [] }), { fail: "unknown_person" });
});

// ─── I12b: "Wifey got promoted" showed Maybe ─────────────────────────────────

const WIFEY = { key: "p1", id: "wifey", display_name: "Wifey Liu", full_name: "Wifey Liu", nicknames: [], relationship_label: "wife" };
const PROMOTED = "Wifey got promoted on Monday and said she might be moving to Seattle with her friend from work.";

Deno.test("I12b: a hedge that belongs to another line from the same note never hedges this one", () => {
  const out = run(input(PROMOTED, [WIFEY]), [
    item({
      kind: "moment", person: "p1", person_mention: "Wifey", statement: "Wifey got promoted", evidence: ["Wifey got promoted on Monday"],
      certainty: "stated", date_text: "Monday", date_direction: "past", detail: { milestone_type: "promotion" },
    }),
    item({
      kind: "thread", person: "p1", person_mention: "she", statement: "Wifey said she might be moving to Seattle with her friend from work",
      evidence: ["said she might be moving to Seattle with her friend from work"], certainty: "tentative", detail: { topic: "moving to Seattle" },
    }),
  ]);
  const by = (s: string) => out.items.find((i) => i.statement.includes(s))!;
  eq(by("promoted").certainty, "stated", "the promotion was said as fact");
  eq(by("promoted").flags.includes("certainty_lowered"), false);
  eq(by("Seattle").certainty, "tentative", "the move keeps its 'might'");
});

Deno.test("I12b: a hedge on the line itself, or outside every line, still holds", () => {
  const think = run(input("I think Wifey got promoted on Monday.", [WIFEY]), [item({
    kind: "moment", person: "p1", person_mention: "Wifey", statement: "Wifey got promoted", evidence: ["Wifey got promoted on Monday"],
    certainty: "stated", date_text: "Monday", date_direction: "past", detail: { milestone_type: "promotion" },
  })]);
  eq(think.items[0].certainty === "stated", false);
  const might = run(input("Wifey might have gotten promoted on Monday.", [WIFEY]), [item({
    kind: "moment", person: "p1", person_mention: "Wifey", statement: "Wifey got promoted", evidence: ["Wifey might have gotten promoted on Monday"],
    certainty: "stated", date_text: "Monday", date_direction: "past", detail: { milestone_type: "promotion" },
  })]);
  eq(might.items[0].certainty, "tentative");
});
