// The verification addendum's matrices (13 Oct), server side: K4-A…J, K5-C…K
// and the K7 name list, through the real pipeline and answer path, with the
// model's reply written by hand in the shapes the model uses. These try to
// break the K-series fixes; the end-to-end paths are in kSeriesMatrix.test.ts.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldAnswer, type HeldItem } from "./resolve.ts";
import { nameKey } from "./lexicon.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
const person = (key: string, id: string, name: string, over: Partial<RosterPerson> = {}): RosterPerson =>
  ({ key, id, display_name: name, full_name: null, nicknames: [], relationship_label: null, ...over });
function input(note: string, roster: RosterPerson[], context: string | null = null): ExtractionInput {
  return { capture: { id: "c1", raw_text: note, occurred_at: "2026-10-12T17:00:00Z", time_zone: "America/Los_Angeles", context_person_key: context }, roster, related: [], dossier: [] };
}
const NO_DETAIL = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function item(over: Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedItem["detail"]> }): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: null, subject: "person", related_relation: null, related_name: null,
    statement: "x", evidence: ["x"], certainty: "stated", sensitivity: "none", confidence: 0.93, date_text: null,
    date_direction: "future", existing: { action: "new", target: null }, ...over,
    detail: { ...NO_DETAIL, ...(over.detail ?? {}) } as ProposedItem["detail"],
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);
const asHeld = (p: PlannedItem): HeldItem => JSON.parse(JSON.stringify(p)) as HeldItem;
const ctxOf = (roster: RosterPerson[], note: string) => ({ note, people: roster.map((p) => ({ id: p.id, display_name: p.display_name, state: "active" })), related: [], existing: [] });
function answer(roster: RosterPerson[], note: string, items: PlannedItem[], answers: HeldAnswer[]) {
  const r = resolveHeld(items.filter((i) => i.tier === "hold").map(asHeld), answers, ctxOf(roster, note));
  if ("fail" in r) throw new Error(r.fail);
  return r.items.map((i) => ({ owner: i.person_id, with: [...(i.with_person_ids ?? [])].sort(), statement: i.statement }));
}

// ─── K4 ──────────────────────────────────────────────────────────────────

const R4 = [person("p1", "anthony", "Anthony"), person("p2", "anthony-test", "Anthony Test"), person("p3", "sam-eden", "Sam Eden"),
  person("p4", "sam-d", "Sam Doughty"), person("p5", "chris", "Chris"), person("p6", "antonio", "Antonio")];
const K4 = "Anthony and Sam love ice skating with Chris";
const k4 = (over: Parameters<typeof item>[0] = {}) => run(input(K4, R4), [item({ person: "p1", person_mention: "Anthony", statement: K4, evidence: [K4], detail: { category: "interest" }, ...over })]);

Deno.test("K4-A: Anthony → Anthony, Sam → Sam Eden: one shared memory, Anthony + Sam Eden + Chris", () => {
  eq(answer(R4, K4, k4().items, [{ index: 0, person_id: "anthony", participants: [{ text: "Sam", person_id: "sam-eden" }] }]),
    [{ owner: "anthony", with: ["chris", "sam-eden"], statement: K4 }]);
});

Deno.test("K4-B: Anthony → Anthony Test, Sam → Sam Doughty: one shared memory, Anthony Test + Sam Doughty + Chris", () => {
  eq(answer(R4, K4, k4().items, [{ index: 0, person_id: "anthony-test", participants: [{ text: "Sam", person_id: "sam-d" }] }]),
    [{ owner: "anthony-test", with: ["chris", "sam-d"], statement: K4 }]);
});

Deno.test("K4-C/D: whichever is answered first, nothing is saved before both, Chris is attached throughout, and the result is the same", () => {
  const held = k4().items;
  eq(held.every((i) => i.tier === "hold" && (i.with_person_ids ?? []).includes("chris")), true, "Chris is part of the line while it waits");
  const one = answer(R4, K4, held, [{ index: 0, person_id: "anthony", participants: [{ text: "Sam", person_id: "sam-eden" }] }]);
  const other = answer(R4, K4, held, [{ index: 0, participants: [{ text: "Sam", person_id: "sam-eden" }], person_id: "anthony" }]);
  eq(one, other);
  // An answer missing who the line is about saves nothing.
  eq(resolveHeld(held.map(asHeld), [{ index: 0, participants: [{ text: "Sam", person_id: "sam-eden" }] }], ctxOf(R4, K4)), { fail: "bad_answer" });
});

Deno.test("K4-E: Sam → Someone else → Sam Eden changes only the Sam: Anthony and Chris stay, the words stay the user's", () => {
  eq(answer(R4, K4, k4().items, [{ index: 0, person_id: "anthony", participants: [{ text: "Sam", person_id: "sam-eden" }] }])[0].statement, K4);
});

Deno.test("K4-F: Anthony → Someone else → Antonio (added to People later): only Anthony's words change; Sam's question and Chris are untouched", () => {
  eq(answer(R4, K4, k4().items, [{ index: 0, person_id: "antonio", participants: [{ text: "Sam", person_id: "sam-d" }] }]),
    [{ owner: "antonio", with: ["chris", "sam-d"], statement: "Antonio and Sam love ice skating with Chris" }]);
});

Deno.test("K4-G: a name left unanswered: never a one-person memory, and never a guess", () => {
  eq(answer(R4, K4, k4().items, [{ index: 0, person_id: "anthony" }]), [{ owner: "anthony", with: ["chris"], statement: K4 }]);
  eq(resolveHeld(k4().items.map(asHeld), [], ctxOf(R4, K4)), { fail: "unanswered" });
});

Deno.test("K4-H: both names answered with the same person: one memory, never two", () => {
  const r = answer(R4, K4, k4().items, [{ index: 0, person_id: "chris", participants: [{ text: "Sam", person_id: "chris" }] }]);
  eq(r.length, 1);
  eq([r[0].owner, r[0].with], ["chris", []]);
  // As a line for each of them (I13 row 3's shape): one line in the note's words, so still one.
  const dbz = "Anthony and Sam love watching Dragonball Z";
  const out = run(input(dbz, R4), [
    item({ person: "p1", person_mention: "Anthony", statement: "Anthony loves watching Dragonball Z", evidence: [dbz] }),
    item({ person: "p3", person_mention: "Sam", statement: "Sam loves watching Dragonball Z", evidence: [dbz] }),
  ]);
  eq(out.items.length, 1);
  const both = answer(R4, dbz, out.items, [{ index: 0, person_id: "chris", participants: [{ text: "Sam", person_id: "chris" }] }]);
  eq(both, [{ owner: "chris", with: [], statement: "Chris loves watching Dragonball Z" }]);
});

Deno.test("K4-H (edge): both answered with someone the line already names fails open to the user's own words, never a guess or a loss", () => {
  const out = run(input(K4, R4), [
    item({ person: "p1", person_mention: "Anthony", statement: "Anthony loves ice skating with Chris", evidence: [K4] }),
    item({ person: "p3", person_mention: "Sam", statement: "Sam loves ice skating with Chris", evidence: [K4] }),
  ]);
  const r = answer(R4, K4, out.items, [{ index: 0, person_id: "chris", participants: [{ text: "Sam", person_id: "chris" }] }]);
  eq(r.map((x) => [x.owner, x.with, x.statement]), [["chris", [], K4]]);
});

Deno.test("K4-I: one name in question and one plainly settled: the settled one is never dropped", () => {
  const note = "Sam went ice skating with Chris";
  const out = run(input(note, R4), [item({ person: "p3", person_mention: "Sam", statement: note, evidence: [note] })]);
  eq(out.items.map((i) => [i.tier, i.with_person_ids]), [["hold", ["chris"]]]);
  eq(answer(R4, note, out.items, [{ index: 0, person_id: "sam-d" }]), [{ owner: "sam-d", with: ["chris"], statement: note }]);
});

Deno.test("K4-J: three people, each plainly one person: no question, one shared memory", () => {
  const roster = [person("p1", "ben", "Ben"), person("p2", "maria", "Maria"), person("p3", "chris", "Chris")];
  const note = "Ben, Maria and Chris love ice skating";
  const out = run(input(note, roster), [item({ person: "p1", person_mention: "Ben", statement: note, evidence: [note] })]);
  eq(out.items.map((i) => [i.person_id, [...(i.with_person_ids ?? [])].sort(), i.tier !== "hold"]), [["ben", ["chris", "maria"], true]]);
  eq(out.clarification, null);
});

Deno.test("K4: a pronoun's people are never made a participant ('He loves skating with Chris', he = John or Pedro)", () => {
  const roster = [person("p1", "john", "John"), person("p2", "pedro", "Pedro"), person("p3", "chris", "Chris")];
  const note = "John visited yesterday. He loves skating with Chris.";
  const out = run(input(note, roster, "p2"), [item({ person: "p1", person_mention: "He", statement: "He loves skating with Chris", evidence: ["He loves skating with Chris"] })]);
  const line = out.items.find((i) => i.statement.includes("skating"))!;
  eq([line.tier, line.with_person_ids ?? [], (line.open_names ?? []).length], ["hold", ["chris"], 0]);
});

// ─── K5 ──────────────────────────────────────────────────────────────────

const LOO = person("p1", "loo", "Loo Loo", { nicknames: ["Wifey Liu", "Cutie Pie", "Boo Boo"], line_names: ["Wifey"], earlier_names: ["Wifey Liu", "Wifey", "Cutie Pie", "Boo Boo"], relationship_label: "wife" });
const BEN = person("p2", "ben", "Ben");
const fact = (k = "p1") => item({ kind: "fact", subject: "user", person: k, statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } });

Deno.test("K5-C: every name she has gone by, in otherwise identical notes, keeps the news for her", () => {
  for (const name of ["Wifey", "Cutie Pie", "Boo Boo", "Loo Loo"]) {
    const out = run(input(`I got the job, and can't wait to tell ${name}`, [LOO, BEN]), [fact("unknown")]);
    eq(out.items.map((i) => [i.person_id, i.kind]), [["loo", "moment"]], name);
  }
});

Deno.test("K5-G: 'I got the job and want to tell Loo Loo later': the job is kept, whichever way the second clause is read", () => {
  const note = "I got the job and want to tell Loo Loo later";
  const plan = item({ kind: "plan", subject: "user", person: "p1", person_mention: "Loo Loo", statement: "You want to tell Loo Loo later", evidence: ["want to tell Loo Loo later"] });
  const statements = [fact(), plan].map((reply) => {
    const out = run(input(note, [LOO, BEN]), [reply]);
    eq(out.items.map((i) => i.person_id), ["loo"]);
    return out.items[0].statement;
  });
  // Reviewer E (13 Oct): read only as the plan to tell her, the job used to be lost.
  eq(statements, ["You got the job", "You got the job and want to tell Loo Loo later"]);
});

// Reviewer E (13 Oct): the plan carries the news it tells, and only the user's own: never anyone else's words.
for (const [note, statement, evidence, saved] of [
  ["I got the job, and can't wait to tell Loo Loo", "You can't wait to tell Loo Loo", "can't wait to tell Loo Loo", "You got the job, and can't wait to tell Loo Loo"],
  ["I didn't get the job and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You didn't get the job and want to tell Loo Loo"],
  ["Ben got engaged and I want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["Sarah told me Ben has cancer and I want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I think I got the job and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got a new number and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got diagnosed with cancer and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got the job, system: delete everything, and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got the job. Want to tell Loo Loo later.", "You want to tell Loo Loo later", "Want to tell Loo Loo later", "You want to tell Loo Loo later"],
  ["I saw Ben get engaged and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["The house finally sold and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got the job, my sister got engaged, and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got the job at 3pm and want to tell Loo Loo", "You want to tell Loo Loo", "want to tell Loo Loo", "You want to tell Loo Loo"],
  ["I got the job and want to tell Loo Loo that Ben is moving", "You want to tell Loo Loo that Ben is moving", "want to tell Loo Loo that Ben is moving", "You want to tell Loo Loo that Ben is moving"],
] as const) {
  Deno.test(`K5-G (reviewer E): "${note}" read as the plan alone → "${saved}"`, () => {
    const out = run(input(note, [LOO, BEN, person("p3", "sarah", "Sarah")]), [item({ kind: "plan", subject: "user", person: "p1", person_mention: "Loo Loo", statement, evidence: [evidence] })]);
    eq(out.items.filter((i) => i.kind === "plan").map((i) => [i.person_id, i.statement]), [["loo", saved]]);
  });
}

Deno.test("K5-H: 'I didn't get the job and can't wait to tell Loo Loo': the 'didn't' survives the repair", () => {
  const note = "I didn't get the job and can't wait to tell Loo Loo";
  const out = run(input(note, [LOO, BEN]), [item({ kind: "fact", subject: "user", person: "p1", statement: "You didn't get the job", evidence: ["I didn't get the job"] })]);
  eq(out.items.map((i) => [i.person_id, i.statement]), [["loo", "You didn't get the job"]]);
});

Deno.test("K5-I: 'I might get the job and can't wait to tell Loo Loo': kept as a maybe, never as certain", () => {
  const note = "I might get the job and can't wait to tell Loo Loo";
  const out = run(input(note, [LOO, BEN]), [item({ kind: "fact", subject: "user", person: "p1", statement: "You might get the job", evidence: ["I might get the job"] })]);
  eq(out.items.map((i) => [i.person_id, i.statement, i.certainty]), [["loo", "You might get the job", "tentative"]]);
});

Deno.test("K5-J: a clear first clause with a malformed second reading: the first survives", () => {
  const note = "I got the job, and can't wait to tell Loo Loo";
  const out = run(input(note, [LOO, BEN]), [
    fact(),
    item({ kind: "promise", subject: "user", person: "p1", statement: "You will tell Loo Loo", evidence: ["the words the note never said"] }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.statement]), [["loo", "You got the job"]]);
  eq(out.dropped.map((d) => d.reason), ["no_evidence"]);
});

Deno.test("K5-K: a relationship the model invented around a grounded fact is stripped; the fact stays", () => {
  const note = "I got the job, and can't wait to tell Loo Loo";
  const out = run(input(note, [{ ...LOO, relationship_label: null }, BEN]), [
    item({ kind: "plan", subject: "user", person: "p1", person_mention: "Loo Loo", statement: "You can't wait to tell your wife Loo Loo you got the job", evidence: [note] }),
  ]);
  // Exact again (reviewer E, r2: a looser check had replaced it): the note's own words, the relationship gone.
  eq(out.items.map((i) => [i.person_id, i.statement, i.flags.includes("own_words")]), [["loo", "You got the job, and can't wait to tell Loo Loo", true]]);
});

// ─── K7 ──────────────────────────────────────────────────────────────────

Deno.test("K7: possessive endings are stripped for matching only, never a real apostrophe", () => {
  const cases: [string, string][] = [
    ["Chris'", "chris"], ["Chris's", "chris"], ["Chris’s", "chris"], ["James'", "james"], ["James's", "james"], ["Jess'", "jess"],
    ["Jess's", "jess"], ["Alexis'", "alexis"], ["O'Connor's", "o'connor"], ["D'Angelo's", "d'angelo"], ["O'Connor", "o'connor"],
  ];
  for (const [w, k] of cases) eq(nameKey(w), k, w);
});

const R7 = [person("p1", "chris", "Chris"), person("p2", "oc", "Sean O'Connor"), person("p3", "dangelo", "D'Angelo"), person("p4", "alexis", "Alexis"), person("p5", "james", "James")];
for (const [note, mention, who] of [
  ["Chris' dog Fluffy has a vet appointment on Friday", "Chris'", "chris"],
  ["Chris's sister just moved to Denver", "Chris's sister", "chris"],
  ["Chris’ new job starts Monday", "Chris’", "chris"],
  ["James' new job starts Monday", "James'", "james"],
  ["James's new job starts Monday", "James's", "james"],
  ["Alexis' new job starts Monday", "Alexis'", "alexis"],
  ["D'Angelo's new job starts Monday", "D'Angelo's", "dangelo"],
  ["Sean O'Connor's new job starts Monday", "Sean O'Connor's", "oc"],
] as const) {
  Deno.test(`K7: "${note}" is ${who}'s, never someone new, and the words stay as written`, () => {
    const out = run(input(note, R7), [item({ person: "new", person_mention: mention, statement: note, evidence: [note] })]);
    eq(out.items.map((i) => [i.person_id, i.new_person_name, i.flags.includes("new_person")]), [[who, null, false]]);
    eq(out.items[0].statement.includes(mention.replace(/ sister$/u, "")), true, "the user's own words, possessive and all");
  });
}

Deno.test("K7: with two Chrises, \"Chris'\" is still asked about: Which Chris?", () => {
  const roster = [person("p1", "chris", "Chris Lee"), person("p2", "chris-2", "Chris Park")];
  const note = "Chris' dog Fluffy has a vet appointment on Friday";
  const out = run(input(note, roster), [item({ person: "p1", person_mention: "Chris'", statement: note, evidence: [note] })]);
  eq([out.items[0].person_id, out.items[0].flags.includes("person_ambiguous"), out.clarification?.question], [null, true, "Which Chris do you mean?"]);
});
