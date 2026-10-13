// K-series (founder native pass, 12 Oct, on the build of main 90a5cf0): the
// server side of K4, K5, K7 and K1, through the real pipeline and answer
// path, with the model reply written by hand in each shape the model uses.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem } from "./resolve.ts";
import { nameKey, wordsOf } from "./lexicon.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const person = (key: string, id: string, name: string): RosterPerson =>
  ({ key, id, display_name: name, full_name: null, nicknames: [], relationship_label: null });

function input(note: string, roster: RosterPerson[], context: string | null = null): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-12T17:00:00Z", time_zone: "America/Los_Angeles", context_person_key: context },
    roster, related: [], dossier: [],
  };
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
const peopleOf = (roster: RosterPerson[]) => roster.map((p) => ({ id: p.id, display_name: p.display_name, state: "active" }));
const kept = (items: PlannedItem[]) => items.filter((i) => i.tier !== "hold");
const held = (items: PlannedItem[]) => items.filter((i) => i.tier === "hold");
const asked = (i: PlannedItem) => (i.person_mentions ?? []).filter((m) => m.person_id === null).map((m) => m.text);

// ─── K4: "Anthony and Sam love ice skating with Chris", two Anthonys, two Sams ─

const K4_ROSTER = [
  person("p1", "anthony", "Anthony"),
  person("p2", "anthony-test", "Anthony Test"),
  person("p3", "sam-eden", "Sam Eden"),
  person("p4", "sam-d", "Sam Doughty"),
  person("p5", "chris", "Chris"),
];
const K4 = "Anthony and Sam love ice skating with Chris";
const k4 = () => input(K4, K4_ROSTER);
const skating = (over: Parameters<typeof item>[0]) =>
  item({ kind: "fact", statement: K4, evidence: [K4], detail: { category: "interest" }, ...over });

Deno.test("K4 (one line, filed on Anthony): which Anthony and which Sam are two questions on one shared line, and Chris is never lost", () => {
  const out = run(k4(), [skating({ person: "p1", person_mention: "Anthony" })]);
  eq(kept(out.items).length, 0);
  eq(held(out.items).length, 1);
  const [line] = out.items;
  eq(line.person_id, null, "who it is about is asked, never guessed");
  eq(line.with_person_ids, ["chris"], "Chris, named once and in People, stays part of it");
  eq(asked(line).sort(), ["Anthony", "Sam"], "each name in question keeps its own words");
  eq((line.open_names ?? []).map((o) => [o.text, o.candidate_ids]), [["Sam", ["sam-eden", "sam-d"]]], "every Sam, never narrowed");
});

Deno.test("K4 (one line, no one named as its owner): the same two questions, never 'Who is this about?' for the whole line", () => {
  const out = run(k4(), [skating({ person: "unknown", person_mention: null })]);
  const [line] = held(out.items);
  eq(out.items.length, 1);
  eq(line.with_person_ids, ["chris"]);
  eq(asked(line).sort(), ["Anthony", "Sam"]);
  eq((line.open_names ?? []).map((o) => o.text), ["Sam"]);
});

Deno.test("K4 answered: Anthony Test, and Sam → Someone else → Sam Eden: one memory on Anthony Test, also about Sam Eden and Chris, in the note's words", () => {
  const out = run(k4(), [skating({ person: "p1", person_mention: "Anthony" })]);
  const r = resolveHeld(out.items.map(asHeld), [{ index: 0, person_id: "anthony-test", participants: [{ text: "Sam", person_id: "sam-eden" }] }],
    { note: K4, people: peopleOf(K4_ROSTER), related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.length, 1);
  eq([r.items[0].person_id, [...(r.items[0].with_person_ids ?? [])].sort()], ["anthony-test", ["chris", "sam-eden"]]);
  eq(r.items[0].statement, K4, "a Sam answered with a Sam keeps the user's words");
  eq((r.items[0].person_mentions ?? []).every((m) => m.person_id !== null), true, "every name now belongs to someone");
});

Deno.test("K4 answered: one name resolved never collapses the line onto that one person", () => {
  const out = run(k4(), [skating({ person: "p1", person_mention: "Anthony" })]);
  const r = resolveHeld(out.items.map(asHeld), [{ index: 0, person_id: "anthony", participants: [{ text: "Sam", person_id: "sam-d" }] }],
    { note: K4, people: peopleOf(K4_ROSTER), related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq([r.items[0].person_id, [...(r.items[0].with_person_ids ?? [])].sort()], ["anthony", ["chris", "sam-d"]]);
});

Deno.test("K4 answered by an older build that only answers who: the line is kept for that person and Chris; the unanswered Sam is left out, never guessed", () => {
  const out = run(k4(), [skating({ person: "p1", person_mention: "Anthony" })]);
  const r = resolveHeld(out.items.map(asHeld), [{ index: 0, person_id: "anthony" }], { note: K4, people: peopleOf(K4_ROSTER), related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq([r.items[0].person_id, r.items[0].with_person_ids], ["anthony", ["chris"]]);
});

Deno.test("K4: a participant answer must be one of the names held, and one of the user's people", () => {
  const out = run(k4(), [skating({ person: "p1", person_mention: "Anthony" })]);
  const ctx = { note: K4, people: peopleOf(K4_ROSTER), related: [], existing: [] };
  eq(resolveHeld(out.items.map(asHeld), [{ index: 0, person_id: "anthony", participants: [{ text: "Chris", person_id: "sam-d" }] }], ctx), { fail: "bad_answer" });
  eq(resolveHeld(out.items.map(asHeld), [{ index: 0, person_id: "anthony", participants: [{ text: "Sam", person_id: "nobody" }] }], ctx), { fail: "unknown_person" });
});

Deno.test("K4 (a line for each of them): Chris's is kept, Anthony's and Sam's are asked once each and join it: one memory", () => {
  const out = run(k4(), [
    skating({ person: "p1", person_mention: "Anthony", statement: "Anthony loves ice skating with Sam and Chris" }),
    skating({ person: "p3", person_mention: "Sam", statement: "Sam loves ice skating with Anthony and Chris" }),
    skating({ person: "p5", person_mention: "Chris", statement: "Chris loves ice skating with Anthony and Sam" }),
  ]);
  eq(kept(out.items).map((i) => i.person_id), ["chris"]);
  const waiting = held(out.items);
  eq(waiting.map((h) => [h.mention, h.twin_person_id]).sort(), [["Anthony", "chris"], ["Sam", "chris"]], "one question per name, each joining Chris's line");
  eq(waiting.every((h) => !(h.open_names ?? []).length), true, "never asked twice about the same Sam");
  const all = out.items.map((p) => asHeld({ ...p, tier: "hold" }));
  const answers = all.map((h, index) =>
    h.person_id ? { index, accept: true as const } : { index, person_id: h.mention === "Anthony" ? "anthony-test" : "sam-eden" }
  );
  const r = resolveHeld(all, answers, { note: K4, people: peopleOf(K4_ROSTER), related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items.length, 1, "one shared memory, never one per person");
  eq([r.items[0].person_id, [...(r.items[0].with_person_ids ?? [])].sort()], ["chris", ["anthony-test", "sam-eden"]]);
});

Deno.test("K4 (the same words filed once on each of them): never merged into one person's line by accident", () => {
  const out = run(k4(), [
    skating({ person: "p1", person_mention: "Anthony" }),
    skating({ person: "p3", person_mention: "Sam" }),
  ]);
  eq(out.items.length, 1, "one shared line");
  eq(asked(out.items[0]).sort(), ["Anthony", "Sam"], "both names still asked about");
  eq(out.items[0].with_person_ids, ["chris"]);
});

Deno.test("K4 (a line for Anthony and a line for Sam, each 'with Chris'): Chris stays on both", () => {
  const out = run(k4(), [
    skating({ person: "p1", person_mention: "Anthony", statement: "Anthony loves ice skating with Chris" }),
    skating({ person: "p3", person_mention: "Sam", statement: "Sam loves ice skating with Chris" }),
  ]);
  eq(held(out.items).map((h) => [asked(h), h.with_person_ids]), [[["Anthony"], ["chris"]], [["Sam"], ["chris"]]]);
});

Deno.test("K4: a settled line with one name two people share keeps the line and asks only which one (I10 shape), never holds the whole memory", () => {
  const roster = [person("p1", "ben", "Ben"), person("p2", "sam-eden", "Sam Eden"), person("p3", "sam-d", "Sam Doughty")];
  const note = "Ben and Sam went to Tahoe last weekend.";
  const out = run(input(note, roster), [item({ person: "p1", person_mention: "Ben", statement: "Ben and Sam went to Tahoe", evidence: ["Ben and Sam went to Tahoe"] })]);
  eq(kept(out.items).map((i) => [i.person_id, i.with_person_ids ?? []]), [["ben", []]]);
  eq(held(out.items).map((h) => [h.mention, h.twin_person_id, h.person_id]), [["Sam", "ben", null]]);
});

// ─── K1: the mirrored "brothers" line, kept twice ────────────────────────────

Deno.test("K1: 'Anthony and Tyler are brothers', told once and mirrored by the model: one shared line, on both, with one source", () => {
  const roster = [person("p1", "anthony", "Anthony"), person("p2", "tyler", "Tyler Shaffer")];
  const note = "Anthony and Tyler are brothers.";
  const out = run(input(note, roster), [
    item({ person: "p1", person_mention: "Anthony", statement: "Anthony and Tyler are brothers", evidence: ["Anthony and Tyler are brothers"], detail: { category: "family" } }),
    item({ person: "p2", person_mention: "Tyler", statement: "Tyler and Anthony are brothers", evidence: ["Anthony and Tyler are brothers"], detail: { category: "family" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.with_person_ids, i.tier !== "hold"]), [["anthony", ["tyler"], true]]);
  eq(out.items[0].spans.length, 1, "one source");
});

Deno.test("K1: mirrored lines where one name was missed as a participant still become one line", () => {
  const roster = [person("p1", "anthony", "Anthony"), person("p2", "tyler", "Tyler Shaffer"), person("p3", "tyler-2", "Tyler Ng")];
  const note = "Anthony and Tyler Shaffer are brothers.";
  const out = run(input(note, roster), [
    item({ person: "p1", person_mention: "Anthony", statement: "Anthony and Tyler Shaffer are brothers", evidence: ["Anthony and Tyler Shaffer are brothers"], detail: { category: "family" } }),
    item({ person: "p2", person_mention: "Tyler Shaffer", statement: "Tyler Shaffer and Anthony are brothers", evidence: ["Anthony and Tyler Shaffer are brothers"], detail: { category: "family" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.with_person_ids]), [["anthony", ["tyler"]]]);
});

// ─── K5: "I got the job, and can't wait to tell Loo Loo" ─────────────────────

const LOO = { ...person("p1", "loo", "Loo Loo"), nicknames: ["Wifey Liu"], line_names: ["Wifey"], earlier_names: ["Wifey Liu", "Wifey", "Cutie Pie", "Boo Boo"], relationship_label: "wife" };
const BEN = person("p2", "ben", "Ben");
const job = (name: string) => `I got the job, and can't wait to tell ${name}`;

for (const [label, who, key] of [["Loo Loo", LOO, "p1"], ["Ben", BEN, "p2"]] as const) {
  Deno.test(`K5 (${label}): the user's news, read as a fact about the user, is kept on ${label}'s page in the note's words, never 'nothing'`, () => {
    const out = run(input(job(label), [LOO, BEN]), [
      item({ kind: "fact", subject: "user", person: key, statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
    ]);
    eq(out.tier === "nothing", false);
    eq(out.items.map((i) => [i.person_id, i.kind, i.subject_type, i.statement]), [[who.id, "plan", "user", `You got the job, and can't wait to tell ${label}`]]);
    eq(out.items[0].flags.includes("own_words"), true, "shown for a glance");
  });

  Deno.test(`K5 (${label}): read as the user's milestone, the same`, () => {
    const out = run(input(job(label), [LOO, BEN]), [
      item({ kind: "milestone", subject: "user", person: key, person_mention: label, statement: `You got the job and can't wait to tell ${label}`, evidence: [job(label)], detail: { milestone_type: "new_job" } }),
    ]);
    eq(out.items.map((i) => [i.person_id, i.kind, i.subject_type]), [[who.id, "plan", "user"]]);
  });

  Deno.test(`K5 (${label}): filed on no one, the person the sentence names is who it's kept for`, () => {
    const out = run(input(job(label), [LOO, BEN]), [
      item({ kind: "fact", subject: "user", person: "unknown", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
    ]);
    eq(out.items.map((i) => [i.person_id, i.kind]), [[who.id, "plan"]]);
  });
}

Deno.test("K5: an earlier name after a rename ('Wifey') finds Loo Loo, and the news is kept for her", () => {
  const out = run(input(job("Wifey"), [LOO, BEN]), [
    item({ kind: "fact", subject: "user", person: "p1", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.kind]), [["loo", "plan"]]);
});

Deno.test("K5: the user's own news with a second clause about someone (a past moment, no plan) is kept as a moment with them", () => {
  const note = "I finally finished the quilt for Ben.";
  const out = run(input(note, [LOO, BEN]), [
    item({ kind: "fact", subject: "user", person: "p2", statement: "You finished the quilt for Ben", evidence: ["I finally finished the quilt for Ben"], detail: { category: "other" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.kind, i.subject_type]), [["ben", "moment", "user"]]);
});

Deno.test("K5: a durable fact about someone, with an irrelevant second clause, keeps the fact", () => {
  const note = "Ben got the job, and the weather was lovely today.";
  const out = run(input(note, [LOO, BEN]), [
    item({ kind: "fact", person: "p2", person_mention: "Ben", statement: "Ben got the job", evidence: ["Ben got the job"], detail: { category: "work" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.statement]), [["ben", "Ben got the job"]]);
});

Deno.test("K5: news about only the user, with no one named and no page, is asked 'Who is this about?', never 'nothing'", () => {
  for (const note of ["I got the job!", "I got the job and I'm excited."]) {
    const out = run(input(note, [LOO, BEN]), [
      item({ kind: "fact", subject: "user", person: "unknown", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
    ]);
    eq(out.tier, "clarify", note);
    eq(out.items.map((i) => [i.person_id, i.tier, i.flags.includes("person_ambiguous"), i.statement]), [[null, "hold", true, note.startsWith("I got the job!") ? "You got the job" : "You got the job and you're excited"]], note);
  }
});

Deno.test("K5: told on someone's page, the user's news is kept for them", () => {
  const out = run(input("I got the job!", [LOO, BEN], "p2"), [
    item({ kind: "fact", subject: "user", person: "unknown", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.tier !== "hold"]), [["ben", true]]);
});

// ─── K7: "Chris' dog Fluffy has a vet appointment on Friday" ─────────────────

Deno.test("K7: possessive forms are the name, never part of it; a real apostrophe stays", () => {
  for (const w of ["Chris'", "Chris's", "Chris’s", "Chris’"]) eq(nameKey(w), "chris", w);
  eq(nameKey("James'"), "james");
  eq(nameKey("Jess'"), "jess");
  eq(nameKey("O'Connor"), "o'connor");
  eq(wordsOf("Chris' dog and James' cat"), ["chris", "dog", "and", "james", "cat"]);
});

const K7_ROSTER = [person("p1", "chris", "Chris"), person("p2", "ben", "Ben")];
for (const form of ["Chris'", "Chris's", "Chris’s"]) {
  const note = `${form} dog Fluffy has a vet appointment on Friday`;
  Deno.test(`K7 (${form}): resolves to the one Chris in People, no question, and a pet's vet visit needs no yes`, () => {
    for (const reply of [
      item({ kind: "event", person: "new", person_mention: form, statement: note, evidence: [note], date_text: "Friday", detail: { event_type: "medical" }, sensitivity: "health" }),
      item({ kind: "event", person: "p1", person_mention: form, statement: note, evidence: [note], date_text: "Friday", detail: { event_type: "medical" } }),
      item({ kind: "event", person: "p1", person_mention: `${form} dog Fluffy`, statement: note, evidence: [note], date_text: "Friday", detail: { event_type: "medical" } }),
    ]) {
      const out = run(input(note, K7_ROSTER), [reply]);
      eq(out.items.map((i) => [i.person_id, i.tier !== "hold", i.new_person_name]), [["chris", true, null]], `${reply.person}/${reply.person_mention}`);
    }
  });

  Deno.test(`K7 (${form}): filed on no one, it is held for a yes about Chris (as for any name the model didn't commit to), asked as Chris, never as "${form}"`, () => {
    const out = run(input(note, K7_ROSTER), [
      item({ kind: "event", person: "unknown", person_mention: `${form} dog Fluffy`, statement: note, evidence: [note], date_text: "Friday", detail: { event_type: "medical" } }),
    ]);
    eq(out.items.map((i) => [i.person_id, i.new_person_name, i.subject_words, i.flags.includes("new_person")]), [[null, null, "Chris", false]]);
  });
}

Deno.test("K7: O'Connor is a name with an apostrophe in it, found as it is", () => {
  const roster = [person("p1", "oc", "Sean O'Connor")];
  const note = "Sean O'Connor got promoted.";
  const out = run(input(note, roster), [item({ person: "p1", person_mention: "Sean O'Connor", statement: "Sean O'Connor got promoted", evidence: ["Sean O'Connor got promoted"], detail: { category: "work" } })]);
  eq(out.items.map((i) => [i.person_id, i.tier !== "hold"]), [["oc", true]]);
});

Deno.test("K7: a possessive on a name that is no one in People asks who they are, by the name alone", () => {
  const note = "Jess' dog Fluffy has a vet appointment on Friday";
  const out = run(input(note, K7_ROSTER), [item({ kind: "event", person: "new", person_mention: "Jess'", statement: note, evidence: [note], date_text: "Friday", detail: { event_type: "medical" } })]);
  eq(out.items.map((i) => [i.person_id, i.new_person_name]), [[null, "Jess"]]);
});
