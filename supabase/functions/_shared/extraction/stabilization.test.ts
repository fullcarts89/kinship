// Native trust and memory stabilization (founder's second native pass): the
// round-two notes through the real pipeline and answer path, each with the
// model reply that went wrong (or a plain one), checking what Kinship keeps.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem } from "./resolve.ts";
import { threadTarget, transitionOf } from "./threads.ts";
import { inventedRelations, statedSelfRelations } from "./lexicon.ts";
import type { DossierItem, ExtractionInput, ModelProposal, ProposedItem } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const ROSTER = [
  { key: "p1", id: "ben", display_name: "Ben Oxnard", full_name: "Ben Oxnard", nicknames: [], relationship_label: null },
  { key: "p2", id: "john", display_name: "John Oxnard", full_name: "John Oxnard", nicknames: [], relationship_label: null },
  { key: "p3", id: "susan", display_name: "Susan Oxnard", full_name: "Susan Oxnard", nicknames: [], relationship_label: null },
  { key: "p4", id: "tyler", display_name: "Tyler Shaffer", full_name: "Tyler Shaffer", nicknames: [], relationship_label: null },
  { key: "p5", id: "sam-eden", display_name: "Sam Eden", full_name: "Sam Eden", nicknames: [], relationship_label: null },
  { key: "p6", id: "sam-d", display_name: "Sam Doughty", full_name: "Sam Doughty", nicknames: [], relationship_label: null },
  { key: "p7", id: "amanda", display_name: "Amanda Rose-Shaffer", full_name: "Amanda Rose-Shaffer", nicknames: [], relationship_label: null },
];

function input(note: string, dossier: DossierItem[] = [], context: string | null = null): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-05T20:00:00Z", time_zone: "America/Los_Angeles", context_person_key: context },
    roster: ROSTER, related: [], dossier,
  };
}

const NO_DETAIL = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function item(over: Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedItem["detail"]> }): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: "Ben", subject: "person", related_relation: null, related_name: null,
    statement: "x", evidence: ["x"], certainty: "stated", sensitivity: "none", confidence: 0.95, date_text: null,
    date_direction: "future", existing: { action: "new", target: null }, ...over,
    detail: { ...NO_DETAIL, ...(over.detail ?? {}) } as ProposedItem["detail"],
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);
const mem = (key: string, person_key: string, kind: DossierItem["kind"], statement: string, detail: Record<string, unknown> = {}): DossierItem => ({
  key, id: `id-${key}`, person_key, kind, subject_type: "person", statement, certainty: "stated", status: "active", user_state: "unreviewed", detail,
});

Deno.test("C1: 'not moving anymore' closes the plan it cancels, though one is a fact and the other an event", () => {
  const plan = mem("m1", "p3", "event", "Susan is planning on moving to Alameda next summer", { event_type: "move" });
  const out = run(input("Susan is not moving to Alameda anymore.", [plan]), [item({
    person: "p3", person_mention: "Susan", statement: "Susan is not moving to Alameda anymore",
    evidence: ["Susan is not moving to Alameda anymore"], detail: { category: "home" },
  })]);
  eq(out.items[0].action, { type: "supersede", target_id: "id-m1" });
  eq(out.items[0].detail.transition, "cancelled");
  // The model proposing it across kinds is honoured too.
  const proposed = run(input("Susan is not moving to Alameda anymore.", [plan]), [item({
    person: "p3", person_mention: "Susan", statement: "Susan is not moving to Alameda anymore",
    evidence: ["Susan is not moving to Alameda anymore"], detail: { category: "home" }, existing: { action: "supersede", target: "m1" },
  })]);
  eq(proposed.items[0].action, { type: "supersede", target_id: "id-m1" });
});

Deno.test("C1: nothing is cancelled on a guess: unrelated words, or a hedge, leave everything as it is", () => {
  const loves = mem("m1", "p3", "fact", "Susan loves Alameda's farmers market", { category: "interest" });
  const out = run(input("Susan is not moving to Oakland anymore.", [loves]), [item({
    person: "p3", person_mention: "Susan", statement: "Susan is not moving to Oakland anymore",
    evidence: ["Susan is not moving to Oakland anymore"], detail: { category: "home" },
  })]);
  eq(out.items[0].action, { type: "new", target_id: null });
  const plan = mem("m2", "p3", "event", "Susan is moving to Alameda next summer", { event_type: "move" });
  const hedge = run(input("Susan might not move to Alameda anymore.", [plan]), [item({
    person: "p3", person_mention: "Susan", statement: "Susan might not move to Alameda anymore", certainty: "tentative",
    evidence: ["Susan might not move to Alameda anymore"], detail: { category: "home" },
  })]);
  eq(hedge.items[0].action, { type: "new", target_id: null });
});

Deno.test("E: the knee story moves: bothering → getting better → better", () => {
  const knee = mem("m1", "p2", "thread", "John's knee has been bothering him", { topic: "knee" });
  const better = run(input("John said his knee is getting better.", [knee]), [item({
    kind: "thread", person: "p2", person_mention: "John", statement: "John said his knee is getting better", certainty: "reported",
    evidence: ["John said his knee is getting better"], detail: { topic: "knee" },
  })]);
  eq(better.items[0].action, { type: "supersede", target_id: "id-m1" });
  eq(better.items[0].detail.transition, "progress");
  const healed = mem("m2", "p2", "thread", "John said his knee is getting better", { topic: "knee" });
  const done = run(input("John's knee is better now.", [healed]), [item({
    kind: "fact", person: "p2", person_mention: "John", statement: "John's knee is better now",
    evidence: ["John's knee is better now"], detail: { category: "health" },
  })]);
  eq(done.items[0].action, { type: "resolves", target_id: "id-m2" });
  eq(done.items[0].detail.transition, "completed");
});

Deno.test("E: two equally good matches: the user says which one it replaces", () => {
  const a = mem("m1", "p3", "event", "Susan is moving to Alameda in June", { event_type: "move" });
  const b = mem("m2", "p3", "plan", "Susan is moving to Alameda with Tom", { firmness: "idea" });
  const out = run(input("Susan isn't moving to Alameda anymore.", [a, b]), [item({
    person: "p3", person_mention: "Susan", statement: "Susan isn't moving to Alameda anymore",
    evidence: ["Susan isn't moving to Alameda anymore"], detail: { category: "home" },
  })]);
  eq(out.items[0].tier, "hold");
  eq(out.items[0].flags.includes("update_check"), true);
  eq((out.items[0].detail._replaces as { id: string }[]).map((r) => r.id), ["id-m1", "id-m2"]);
});

Deno.test("E: after \"which Sam?\", the answer is compared with that Sam's memories (interviewing → got the job)", () => {
  const held: HeldItem = {
    kind: "fact", person_id: null, new_person_name: null, subject_type: "person", related: null,
    statement: "Sam got the Stripe job", detail: { category: "work" }, certainty: "stated", sensitivity: "none",
    confidence: 0.9, action: { type: "new", target_id: null }, tier: "hold", flags: ["person_ambiguous"],
    spans: [{ start: 0, end: 22, quote: "Sam got the Stripe job" }],
  };
  const r = resolveHeld([held], [{ index: 0, person_id: "sam-eden" }], {
    note: "Sam got the Stripe job!",
    people: ROSTER.map((p) => ({ id: p.id, display_name: p.display_name, state: "active" })),
    related: [],
    existing: [
      { id: "stripe", person_id: "sam-eden", kind: "event", subject_type: "person", subject_related_id: null,
        statement: "Sam is starting a new job at Stripe next week", status: "active", user_state: "unreviewed" },
      { id: "other", person_id: "sam-d", kind: "thread", subject_type: "person", subject_related_id: null,
        statement: "Sam is interviewing at Stripe", status: "active", user_state: "unreviewed" },
    ],
  });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items[0].action, { type: "supersede", target_id: "stripe" });
  eq(r.items[0].detail.transition, "completed");
});

Deno.test("F: 'John and Ben are brothers' is kept (no longer dropped for 'brother'), on both, and says what they are to you", () => {
  eq(inventedRelations("John is Ben's brother", "John and Ben are brothers", []), []);
  const out = run(input("John and Ben are my brothers."), [item({
    person: "p2", person_mention: "John", statement: "John and Ben are your brothers", evidence: ["John and Ben are my brothers"],
    detail: { category: "family" },
  })]);
  eq(out.dropped, []);
  eq(out.items[0].with_person_ids, ["ben"]);
  eq(out.items[0].self_relations, { john: "brother", ben: "brother" });
});

Deno.test("F: 'Ben and John went to Tahoe' is one memory on both, even told once for each", () => {
  const out = run(input("Ben and John went to Tahoe."), [
    item({ kind: "moment", person: "p1", person_mention: "Ben", statement: "Ben and John went to Tahoe", evidence: ["Ben and John went to Tahoe"] }),
    item({ kind: "moment", person: "p2", person_mention: "John", statement: "Ben and John went to Tahoe", evidence: ["Ben and John went to Tahoe"] }),
  ]);
  eq(out.items.length, 1);
  eq([out.items[0].person_id, out.items[0].with_person_ids], ["ben", ["john"]]);
});

Deno.test("F: two Sams are never both guessed onto a shared memory", () => {
  const out = run(input("Ben and Sam went climbing."), [item({
    kind: "moment", person: "p1", person_mention: "Ben", statement: "Ben and Sam went climbing", evidence: ["Ben and Sam went climbing"],
  })]);
  eq(out.items[0].with_person_ids, undefined);
});

Deno.test("F: 'Tyler said he'd send me his contractor's number Wednesday' is Tyler's promise, with its day", () => {
  const out = run(input("Tyler said he'd send me his contractor's number on Wednesday."), [item({
    kind: "thread", person: "p4", person_mention: "Tyler", statement: "Tyler said he'd send you his contractor's number on Wednesday",
    evidence: ["Tyler said he'd send me his contractor's number on Wednesday"], date_text: "Wednesday", detail: { topic: "contractor's number" },
  })]);
  eq([out.items[0].kind, out.items[0].subject_type], ["promise", "person"]);
  eq(out.items[0].detail.due_date, "2026-10-07");
});

Deno.test("F: a pet's vet visit isn't held as a person's health; a person's surgery still is", () => {
  const pet = run(input("Ben's dog Mochi has a vet appointment on Friday."), [item({
    kind: "event", statement: "Ben's dog Mochi has a vet appointment on Friday", evidence: ["Ben's dog Mochi has a vet appointment on Friday"],
    sensitivity: "health", date_text: "Friday", detail: { event_type: "medical" },
  })]);
  eq([pet.items[0].sensitivity, pet.items[0].flags.includes("sensitive")], ["none", false]);
  const person = run(input("Ben has surgery on Friday."), [item({
    kind: "event", statement: "Ben has surgery on Friday", evidence: ["Ben has surgery on Friday"],
    sensitivity: "health", date_text: "Friday", detail: { event_type: "surgery" },
  })]);
  eq(person.items[0].sensitivity, "health");
});

Deno.test("F: 'Amanda and I watch every Warriors playoff game together' is kept (was dropped for its anchor)", () => {
  const out = run(input("Amanda and I watch every Warriors playoff game together."), [item({
    kind: "tradition", person: "p7", person_mention: "Amanda", subject: "shared",
    statement: "You and Amanda watch every Warriors playoff game together", evidence: ["Amanda and I watch every Warriors playoff game together"],
    detail: { recurrence: "yearly", anchor: "Warriors playoffs" },
  })]);
  eq(out.dropped, []);
  eq(out.items[0].kind === "tradition" ? out.items[0].detail.anchor : out.items[0].kind, "Warriors playoff game");
});

Deno.test("temporal: 'in two weeks' leaves the statement once the date is kept; a hedge stays", () => {
  const out = run(input("Ben is going to his friend Dan's wedding in two weeks."), [item({
    kind: "event", statement: "Ben is going to his friend Dan's wedding in two weeks", evidence: ["Ben is going to his friend Dan's wedding in two weeks"],
    date_text: "in two weeks", detail: { event_type: "wedding" },
  })]);
  eq(out.items[0].statement, "Ben is going to his friend Dan's wedding");
  ok(typeof out.items[0].detail.date === "string", "the date is kept");
});

Deno.test("relationships to the user are only ever what the note states", () => {
  eq(statedSelfRelations("Ben's mom is visiting"), []);
  eq(statedSelfRelations("Every Christmas, my daughter Kaiya and I watch Spirited Away."), [{ name: "Kaiya", relation: "daughter" }]);
  eq(transitionOf("Sam is starting a new job at Stripe next week"), null);
  eq(threadTarget("Ben loves jazz", [], []), null);
});

function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

Deno.test("v6 wording: 'We' is the user, never a new person; 'You're…' is grounded", () => {
  // Told on Ben's page: "We" means you and Ben, never someone called "We".
  const onBen = run(input("We're skiing Tahoe February 18.", [], "p1"), [item({
    kind: "event", person: "p1", person_mention: "We", subject: "shared", statement: "You and Ben are skiing Tahoe February 18",
    evidence: ["We're skiing Tahoe February 18."], date_text: "February 18", detail: { event_type: "trip" },
  })]);
  eq([onBen.items[0].person_id, onBen.items[0].new_person_name, onBen.items[0].flags.includes("new_person")], ["ben", null, false]);
  // Nowhere to point: it's asked about, not filed under a person called "We".
  const nowhere = run(input("We're skiing Tahoe February 18."), [item({
    kind: "event", person: "unknown", person_mention: "We", subject: "shared", statement: "You're skiing Tahoe February 18",
    evidence: ["We're skiing Tahoe February 18."], date_text: "February 18", detail: { event_type: "trip" },
  })]);
  eq(nowhere.items[0]?.new_person_name ?? null, null);
  // A promise in v6's words is kept, not dropped as an invented name.
  const promise = run(input("Dropping off a lasagna for John tomorrow."), [item({
    kind: "promise", person: "p2", person_mention: "John", subject: "user", statement: "You're dropping off a lasagna for John",
    evidence: ["Dropping off a lasagna for John tomorrow"], date_text: "tomorrow",
  })]);
  eq([promise.items.length, promise.dropped.length], [1, 0]);
});

// ─── Core trust closure ────────────────────────────────────────────────────

Deno.test("H28: someone else's commitment to you is theirs, in every common phrasing, with its day", () => {
  const notes = [
    "Tyler promised to send me his contractor's number Friday.",
    "Tyler promised me his contractor's number Friday.",
    "Tyler will send me his contractor's number Friday.",
    "Tyler is going to send me his contractor's number Friday.",
    "Tyler said he'd send me his contractor's number Friday.",
  ];
  for (const note of notes) {
    // The model's usual reading: a promise, filed as the user's.
    const out = run(input(note), [item({
      kind: "promise", person: "p4", person_mention: "Tyler", subject: "user", statement: note.replace(/\.$/, ""),
      evidence: [note.replace(/\.$/, "")], date_text: "Friday", detail: {},
    })]);
    eq([out.items[0]?.kind, out.items[0]?.subject_type, out.items[0]?.detail.due_date], ["promise", "person", "2026-10-09"], note);
  }
  // The user's own promise stays theirs.
  const mine = run(input("I'll send Tyler the restaurant Wednesday."), [item({
    kind: "promise", person: "p4", person_mention: "Tyler", subject: "user", statement: "You'll send Tyler the restaurant",
    evidence: ["I'll send Tyler the restaurant Wednesday"], date_text: "Wednesday",
  })]);
  eq([mine.items[0]?.subject_type, mine.items[0]?.detail.due_date], ["user", "2026-10-07"]);
});
