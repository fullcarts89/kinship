// Gate 0 remediation (founder native findings of 7 Oct, decisions of 8 Oct):
// the server side of each fix, through the real context builder, pipeline
// and answer path, with the model reply written by hand.
// Run: deno test supabase/functions
import { buildInput, type PersonRow, withLineNames } from "./context.ts";
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem, type ResolvePerson } from "./resolve.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";
import { buildUserContent } from "../prompts/relationship_extract/v1.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const NO_DETAIL = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function item(over: Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedItem["detail"]> }): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: null, subject: "person", related_relation: null, related_name: null,
    statement: "x", evidence: ["x"], certainty: "stated", sensitivity: "none", confidence: 0.95, date_text: null,
    date_direction: "future", existing: { action: "new", target: null }, ...over,
    detail: { ...NO_DETAIL, ...(over.detail ?? {}) } as ProposedItem["detail"],
  };
}
function input(note: string, roster: RosterPerson[], contextKey: string | null = null): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-08T17:00:00Z", time_zone: "America/Los_Angeles", context_person_key: contextKey },
    roster, related: [], dossier: [],
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);
const asHeld = (p: PlannedItem): HeldItem => JSON.parse(JSON.stringify(p)) as HeldItem;

const person = (id: string, display_name: string, over: Partial<PersonRow> = {}): PersonRow => ({
  id, display_name, full_name: display_name, nicknames: [], relationship_label: null, state: "active", ...over,
});

// ─── I12: the words a line used for someone, kept with the line ─────────────

const LOO = person("looloo", "Loo Loo", { nicknames: ["Cutie Pie", "Boo Boo"], relationship_label: "wife" });
// Her lines from before, as the migration's backfill fills them: "Wifey" is an earlier name.
const HER_LINES = [{ person_mentions: [{ person_id: "looloo", text: "Wifey", name: null }] }];

Deno.test("I12: the words her own lines use for her ('Wifey') reach the roster as another name, never her record's names changed", () => {
  const [loo] = withLineNames([LOO], HER_LINES);
  eq([loo.mention_names, loo.earlier_names], [["Wifey"], ["Wifey"]]);
  const inp = buildInput({ id: "c1", raw_text: "Wifey got a raise.", occurred_at: "2026-10-08T17:00:00Z", time_zone: null, context_person_id: null }, [loo], [], []);
  eq(inp.roster.map((r) => [r.display_name, r.nicknames, r.line_names, r.earlier_names]),
    [["Loo Loo", ["Cutie Pie", "Boo Boo"], ["Wifey"], ["Cutie Pie", "Boo Boo", "Wifey"]]], "on the roster: her record's names, then her lines'");
  const message = buildUserContent(inp);
  if (!message.includes("also called Cutie Pie, Boo Boo, Wifey")) throw new Error(`the model is told she's also called Wifey: ${message}`);
  if (message.includes("earlier")) throw new Error("which names are earlier ones is code's, never the model's");
});

Deno.test("I12/J4: 'Wifey got a raise' is filed on Loo Loo, and the line records 'Wifey' as her earlier name (it reads 'Loo Loo got a raise')", () => {
  const [loo] = withLineNames([LOO], HER_LINES);
  const inp = buildInput({ id: "c1", raw_text: "Wifey got a raise.", occurred_at: "2026-10-08T17:00:00Z", time_zone: null, context_person_id: null }, [loo], [], []);
  const out = run(inp, [item({ person: "p1", person_mention: "Wifey", statement: "Wifey got a raise", evidence: ["Wifey got a raise"], detail: { category: "work" } })]);
  eq(out.items.map((i) => [i.person_id, i.statement, i.tier !== "hold"]), [["looloo", "Wifey got a raise", true]]);
  eq(out.items[0].person_mentions, [{ person_id: "looloo", text: "Wifey", name: null }]);
});

Deno.test("I12, decision 1b: 'Liz got promoted' for Elizabeth Chen, never renamed: recorded under her name now, so the words stay", () => {
  const liz = withLineNames([person("liz", "Elizabeth Chen")], [{ person_mentions: [{ person_id: "liz", text: "Liz", name: "Elizabeth Chen" }] }]);
  const inp = buildInput({ id: "c1", raw_text: "Liz got promoted.", occurred_at: "2026-10-08T17:00:00Z", time_zone: null, context_person_id: null }, liz, [], []);
  eq(inp.roster[0].earlier_names ?? null, null, "a word she goes by now is not an earlier name");
  const out = run(inp, [item({ person: "p1", person_mention: "Liz", statement: "Liz got promoted", evidence: ["Liz got promoted"], detail: { category: "work" } })]);
  eq(out.items[0].person_mentions, [{ person_id: "liz", text: "Liz", name: "Elizabeth Chen" }]);
});

Deno.test("I12: a line names each of its people by their own words; a name written twice is never recorded", () => {
  const roster: RosterPerson[] = [
    { key: "p1", id: "susan", display_name: "Susan Oxnard", full_name: "Susan Oxnard", nicknames: [], relationship_label: null },
    { key: "p2", id: "michelle", display_name: "Michelle Lee", full_name: "Michelle Lee", nicknames: [], relationship_label: null },
  ];
  const note = "Susan and Michelle went to Disneyland.";
  const out = run(input(note, roster), [item({
    kind: "moment", person: "p1", person_mention: "Susan", statement: "Susan and Michelle went to Disneyland",
    evidence: ["Susan and Michelle went to Disneyland"], date_direction: "past",
  })]);
  eq(out.items[0].person_mentions, [
    { person_id: "susan", text: "Susan", name: "Susan Oxnard" },
    { person_id: "michelle", text: "Michelle", name: "Michelle Lee" },
  ]);
  const twice = run(input("Susan told Susan's mom.", roster), [item({
    kind: "moment", person: "p1", person_mention: "Susan", statement: "Susan told Susan's mom", evidence: ["Susan told Susan's mom"], date_direction: "past",
  })]);
  eq(twice.items[0].person_mentions ?? [], []);
});

// ─── I13: the answer to "which person?" is who the line names ───────────────

const DBZ_ROSTER: RosterPerson[] = [
  { key: "p1", id: "anthony", display_name: "Anthony", full_name: null, nicknames: [], relationship_label: null },
  { key: "p2", id: "anthony-l", display_name: "Anthony Lopez", full_name: "Anthony Lopez", nicknames: [], relationship_label: null },
  { key: "p3", id: "sam-eden", display_name: "Sam Eden", full_name: "Sam Eden", nicknames: [], relationship_label: null },
  { key: "p4", id: "sam-d", display_name: "Sam Doughty", full_name: "Sam Doughty", nicknames: [], relationship_label: null },
  { key: "p5", id: "chris", display_name: "Chris", full_name: null, nicknames: [], relationship_label: null },
];
const DBZ_PEOPLE: ResolvePerson[] = DBZ_ROSTER.map((p) => ({ id: p.id, display_name: p.display_name, full_name: p.full_name, nicknames: [], state: "active" }));
const DBZ = "Anthony and Sam love watching Dragonball Z.";
const dbzHeld = () => {
  const out = run(input(DBZ, DBZ_ROSTER), [
    item({ kind: "fact", person: "p1", person_mention: "Anthony", statement: "Anthony loves watching Dragonball Z", evidence: ["Anthony and Sam love watching Dragonball Z"], detail: { category: "interest" } }),
    item({ kind: "fact", person: "p3", person_mention: "Sam", statement: "Sam loves watching Dragonball Z", evidence: ["Anthony and Sam love watching Dragonball Z"], detail: { category: "interest" } }),
  ]);
  return out.items.filter((i) => i.tier === "hold");
};

Deno.test("I13: a line held for 'which Anthony / which Sam' keeps the asked-about words for no one yet", () => {
  const held = dbzHeld();
  eq(held.map((h) => [h.person_id, h.person_mentions]), [
    [null, [{ person_id: null, text: "Anthony", name: null }]],
    [null, [{ person_id: null, text: "Sam", name: null }]],
  ]);
});

Deno.test("I13 (re-seen): both answered Someone else → Chris: one line on Chris that names Chris, from both parts of the note", () => {
  const held = dbzHeld().map(asHeld);
  const r = resolveHeld(held, [{ index: 0, person_id: "chris" }, { index: 1, person_id: "chris" }], { note: DBZ, people: DBZ_PEOPLE, related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.map((i) => [i.person_id, i.statement]), [["chris", "Chris loves watching Dragonball Z"]]);
  eq(r.items[0].person_mentions, [{ person_id: "chris", text: "Chris", name: "Chris" }]);
  eq(r.items[0].spans.length, 1, "the same words of the note, once");
});

Deno.test("I13: answered with a Sam: the words stay ('Sam' is his name), recorded as his", () => {
  const held = dbzHeld().map(asHeld);
  const r = resolveHeld(held, [{ index: 0, skip: true }, { index: 1, person_id: "sam-eden" }], { note: DBZ, people: DBZ_PEOPLE, related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.map((i) => [i.person_id, i.statement, i.person_mentions]), [["sam-eden", "Sam loves watching Dragonball Z", [{ person_id: "sam-eden", text: "Sam", name: "Sam Eden" }]]]);
});

Deno.test("I13: the chosen person goes by the name (a Samantha called Sam): the words stay", () => {
  const sammy: ResolvePerson = { id: "samantha", display_name: "Samantha Reyes", full_name: "Samantha Reyes", nicknames: [], state: "active", mention_names: ["Sam"] };
  const held = dbzHeld().map(asHeld);
  const r = resolveHeld(held, [{ index: 0, skip: true }, { index: 1, person_id: "samantha" }], { note: DBZ, people: [...DBZ_PEOPLE, sammy], related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.map((i) => [i.statement, i.person_mentions]), [["Sam loves watching Dragonball Z", [{ person_id: "samantha", text: "Sam", name: "Samantha Reyes" }]]]);
});

Deno.test("I13 with 1b: 'Who is Liz?' answered Elizabeth: 'Liz' is the user's own word for her, kept and recorded as hers", () => {
  const roster: RosterPerson[] = [{ key: "p1", id: "liz", display_name: "Elizabeth Chen", full_name: "Elizabeth Chen", nicknames: [], relationship_label: null }];
  const out = run(input("Liz got promoted.", roster), [item({ person: "new", person_mention: "Liz", statement: "Liz got promoted", evidence: ["Liz got promoted"], detail: { category: "work" } })]);
  const held = out.items.filter((i) => i.tier === "hold").map(asHeld);
  eq(held.length, 1, "someone not in People is asked about");
  const people: ResolvePerson[] = [{ id: "liz", display_name: "Elizabeth Chen", full_name: "Elizabeth Chen", nicknames: [], state: "active" }];
  const r = resolveHeld(held, [{ index: 0, person_id: "liz" }], { note: "Liz got promoted.", people, related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.map((i) => [i.person_id, i.statement, i.person_mentions]), [["liz", "Liz got promoted", [{ person_id: "liz", text: "Liz", name: "Elizabeth Chen" }]]]);
});

Deno.test("I13: Add Zed names the new person by the words the note used", () => {
  const out = run(input("Zed got a raise.", DBZ_ROSTER), [item({ person: "new", person_mention: "Zed", statement: "Zed got a raise", evidence: ["Zed got a raise"], detail: { category: "work" } })]);
  const held = out.items.filter((i) => i.tier === "hold").map(asHeld);
  const r = resolveHeld(held, [{ index: 0, new_person: true }], { note: "Zed got a raise.", people: DBZ_PEOPLE, related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.map((i) => [i.person_id, i.statement, i.person_mentions]), [["new:0", "Zed got a raise", [{ person_id: "new:0", text: "Zed", name: "Zed" }]]]);
});
