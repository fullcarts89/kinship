// The verification addendum's end-to-end matrix (13 Oct): K4's answer order,
// a cancelled review and a person added later; K5's renames and the
// question for news with no one named; K6-A…G; and the cross-feature
// adversarial cases A–E. Through the product's real code (the gateway's
// pipeline and answer path, the write rules, sync, the review and its
// answers, the Kept card, the relationship page); only the model's reply is
// written by hand. Fail open to separate lines or a question, never to a
// wrong merge, a silent loss or invented certainty.
import { acceptLink, noteFor, portraitFor, recordFor, todayIso, earlierOf } from "@/hooks/useV2";
import { voiced } from "@/features/memory/statements";
import { linkSuggestions } from "@/features/person/links";
import { answersFor, buildReview, newcomersIn, type Question, type ReviewView } from "@/features/tell/reviewModel";
import { Gateway, type HeldAnswer } from "@/store/gateway";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-0000000000e8";
const TZ = "America/Los_Angeles";
const NO_DETAIL: ProposedDetail = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};

type Over = Omit<Partial<ProposedItem>, "detail"> & Pick<ProposedItem, "kind" | "person" | "statement" | "evidence"> & { detail?: Partial<ProposedDetail> };
function item(over: Over): ProposedItem {
  return {
    person_mention: null, subject: "person", related_relation: null, related_name: null, certainty: "stated",
    sensitivity: "none", confidence: 0.93, date_text: null, date_direction: "future",
    existing: { action: "new", target: null }, ...over, detail: { ...NO_DETAIL, ...(over.detail ?? {}) },
  };
}
const key = (input: ExtractionInput, id: string) => input.roster.find((r) => r.id === id)?.key ?? "unknown";

let worlds = 0;
async function world() {
  const w = ++worlds;
  let n = 0;
  const newId = () => `${String(w).padStart(8, "0")}-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { now: () => new Date(server.clock).toISOString(), newId });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway), { clock: () => server.clock });
  return { server, gateway, store, engine, understanding, repos: repositoriesFor(store) };
}
type World = Awaited<ReturnType<typeof world>>;

async function typed(w: World, ...names: string[]): Promise<Person[]> {
  const out: Person[] = [];
  for (const name of names) out.push(await w.repos.people.add({ display_name: name }));
  await w.engine.sync();
  return out;
}
async function contacts(w: World, ...names: string[]): Promise<Person[]> {
  const out: Person[] = [];
  for (const name of names) out.push(await w.repos.people.add({ display_name: name, full_name: name }));
  await w.engine.sync();
  return out;
}

async function tell(w: World, note: string, reply: (i: ExtractionInput) => ModelProposal): Promise<{ id: string; review: ReviewView }> {
  w.gateway.propose(note, reply);
  const c = await w.repos.captures.tell(note, { aiEnabled: true, timeZone: TZ });
  await w.understanding.told(c.id);
  await w.understanding.run();
  return { id: c.id, review: await review(w, c.id) };
}

async function review(w: World, id: string): Promise<ReviewView> {
  const row = (await w.understanding.get(id))!;
  const ppl = await w.repos.people.list();
  const items = (await w.understanding.itemsFor(id, row.reading)).map((m) => voiced(m, ppl));
  const capture = await w.repos.captures.get(id);
  return buildReview({
    row,
    capture: { id, raw_text: capture!.raw_text, context_person_id: (capture?.context_person_id as string | null) ?? null, status: String(capture?.status), feedback: capture?.feedback },
    items,
    earlier: await earlierOf(w.repos, items, row.reading?.held ?? []),
    people: ppl, related: await w.repos.people.related(), offline: false, today: todayIso(new Date(w.server.clock)),
  });
}

async function done(w: World, id: string) {
  await w.understanding.finish(id, "done");
  await w.understanding.run();
  await w.engine.sync();
}

/** The user's picks, question by question, sent as the review sheet sends them. */
async function pick(w: World, id: string, questions: Question[], picks: (Omit<HeldAnswer, "index"> | "skip")[]) {
  const answers = answersFor(questions, Object.fromEntries(questions.map((q, n) => [q.key, picks[n]])));
  expect(answers).not.toBeNull();
  await w.understanding.answer(id, answers!);
  await w.understanding.run();
  await done(w, id);
}

async function page(w: World, p: Person) {
  const fresh = (await w.repos.people.list()).find((x) => x.id === p.id)!;
  const portrait = await portraitFor(w.repos, fresh, new Date(w.server.clock));
  const knows = await recordFor(w.repos, p.id, new Date(w.server.clock));
  const shown = [...portrait.lately, ...portrait.comingUp, ...portrait.youSaid, ...portrait.between].map((l) => l.statement);
  return { portrait, knows, shown, knowsLines: knows.lines.map((l) => l.line.statement) };
}

const serverItems = (w: World) => [...w.server.table("memory_items").values()] as unknown as MemoryItem[];
const live = (w: World) => serverItems(w).filter((m) => m.status === "active" && !m.deleted_at);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cardFor } = require("@/features/tell/TellFlow") as typeof import("@/features/tell/TellFlow");

// ─── K4 ──────────────────────────────────────────────────────────────────

const K4 = "Anthony and Sam love ice skating with Chris";
async function k4World() {
  const w = await world();
  const [anthony, anthonyTest, samEden, samD, chris] = await typed(w, "Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris");
  const t = await tell(w, K4, (i) => ({ needs_clarification: null, items: [
    item({ kind: "fact", person: key(i, anthony.id), person_mention: "Anthony", statement: K4, evidence: [K4], detail: { category: "interest" } }),
  ] }));
  return { w, t, anthony, anthonyTest, samEden, samD, chris };
}

describe("K4 end to end", () => {
  it("K4-C/D: answering Sam before Anthony or after gives the same answer, nothing is saved until both are answered, and Chris is on the line throughout", async () => {
    const a = await k4World();
    const [qa, qs] = a.t.review.questions;
    expect([qa.prompt, qs.prompt]).toEqual(["Which Anthony do you mean?", "Which Sam do you mean?"]);
    expect(answersFor(a.t.review.questions, { [qs.key]: { person_id: a.samEden.id } })).toBeNull();
    expect(answersFor(a.t.review.questions, { [qa.key]: { person_id: a.anthony.id } })).toBeNull();
    const samFirst = answersFor(a.t.review.questions, { [qs.key]: { person_id: a.samEden.id }, [qa.key]: { person_id: a.anthony.id } });
    const anthonyFirst = answersFor(a.t.review.questions, { [qa.key]: { person_id: a.anthony.id }, [qs.key]: { person_id: a.samEden.id } });
    expect(samFirst).toEqual(anthonyFirst);
    expect(live(a.w)).toEqual([]); // nothing saved while it waits
    const held = (await a.w.understanding.get(a.t.id))!.reading!.held as unknown as { with_person_ids?: string[] }[];
    expect(held.map((h) => h.with_person_ids)).toEqual([[a.chris.id]]);
    await a.w.understanding.answer(a.t.id, samFirst!);
    await a.w.understanding.run();
    await done(a.w, a.t.id);
    expect(live(a.w).map((m) => [m.person_id, [...(m.with_person_ids ?? [])].sort()])).toEqual([[a.anthony.id, [a.chris.id, a.samEden.id].sort()]]);
  });

  it("K4-F: Anthony → Someone else → a person added to People after the note: only that name changes", async () => {
    const a = await k4World();
    const [antonio] = await typed(a.w, "Antonio");
    await pick(a.w, a.t.id, a.t.review.questions, [{ person_id: antonio.id }, { person_id: a.samD.id }]);
    expect(live(a.w).map((m) => [m.person_id, [...(m.with_person_ids ?? [])].sort(), m.statement]))
      .toEqual([[antonio.id, [a.chris.id, a.samD.id].sort(), "Antonio and Sam love ice skating with Chris"]]);
  });

  it("K4-G: the review closed with the questions unanswered keeps no one-person memory", async () => {
    const a = await k4World();
    await done(a.w, a.t.id);
    expect(live(a.w)).toEqual([]);
  });

  it("K4-E + D: the shared memory shows each person's current name after a rename; Source keeps the note as written", async () => {
    const a = await k4World();
    await pick(a.w, a.t.id, a.t.review.questions, [{ person_id: a.anthony.id }, { person_id: a.samEden.id }]);
    await a.w.repos.people.rename(a.chris.id, "Christopher");
    await a.w.engine.sync();
    const p = await page(a.w, a.samEden);
    expect(p.knowsLines).toEqual(["Anthony and Sam love ice skating with Christopher"]);
    expect((await noteFor(a.w.store, a.t.id, new Date(a.w.server.clock)))!.runs!.map((r) => r.text).join("")).toBe(K4);
    expect(live(a.w).map((m) => m.statement)).toEqual([K4]); // nothing stored is rewritten
  });
});

// ─── K5 ──────────────────────────────────────────────────────────────────

describe("K5 end to end", () => {
  async function looLoo(w: World): Promise<Person> {
    const [p] = await contacts(w, "Wifey Liu");
    for (const name of ["Cutie Pie", "Boo Boo", "Loo Loo"]) {
      await w.repos.people.rename(p.id, name);
      await w.engine.sync();
    }
    return p;
  }

  it("K5-B/C: after Wifey Liu → Cutie Pie → Boo Boo → Loo Loo, every name she went by keeps the news for her", async () => {
    for (const name of ["Wifey", "Cutie Pie", "Boo Boo", "Loo Loo"]) {
      const w = await world();
      const loo = await looLoo(w);
      const note = `I got the job, and can't wait to tell ${name}`;
      const t = await tell(w, note, () => ({ needs_clarification: null, items: [
        item({ kind: "fact", subject: "user", person: "unknown", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
      ] }));
      expect([name, t.review.mode, t.review.questions]).toEqual([name, "card", []]);
      await done(w, t.id);
      expect([name, live(w).map((m) => m.person_id)]).toEqual([name, [loo.id]]);
    }
  });

  it("K5-E: 'I got the job.' with no one named is asked 'Who is this about?' (never 'Nothing to remember'); chosen, it is kept for them; 'Don't keep this' keeps nothing", async () => {
    for (const choice of ["ben", "skip"] as const) {
      const w = await world();
      const [ben] = await typed(w, "Ben");
      const t = await tell(w, "I got the job.", () => ({ needs_clarification: null, items: [
        item({ kind: "fact", subject: "user", person: "unknown", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
      ] }));
      expect(t.review.mode).not.toBe("nothing");
      expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label), q.skip.label])).toEqual([["Who is this about?", ["Choose who"], "Don't keep this"]]);
      await pick(w, t.id, t.review.questions, [choice === "ben" ? { person_id: ben.id } : "skip"]);
      expect(live(w).map((m) => [m.person_id, m.statement])).toEqual(choice === "ben" ? [[ben.id, "You got the job"]] : []);
    }
  });
});

// ─── K6 ──────────────────────────────────────────────────────────────────

const K6 = "Ben is thinking about reaching out to Josh about a job";
const k6Reply = (benId: string) => (i: ExtractionInput): ModelProposal => ({ needs_clarification: null, items: [
  item({ kind: "thread", person: key(i, benId), person_mention: "Ben", statement: K6, evidence: [K6], certainty: "tentative", detail: { topic: "a job" } }),
] });

describe("K6 end to end", () => {
  it("K6-B: Josh already in People: no Add Josh, and the memory is about Ben and Josh, no question", async () => {
    const w = await world();
    const [ben, josh] = await typed(w, "Ben", "Josh");
    const t = await tell(w, K6, k6Reply(ben.id));
    expect([t.review.questions, t.review.lines.flatMap((l) => l.newcomers ?? [])]).toEqual([[], []]);
    await done(w, t.id);
    expect(live(w).map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [josh.id]]]);
  });

  it("K6-C: two Joshes: kept for Ben, and 'Which Josh do you mean?' joins the one chosen", async () => {
    const w = await world();
    const [ben, , joshK] = await typed(w, "Ben", "Josh Lee", "Josh Kim");
    const t = await tell(w, K6, k6Reply(ben.id));
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Which Josh do you mean?", ["Josh Lee", "Josh Kim", "Someone else"]]]);
    expect(live(w).map((m) => m.person_id)).toEqual([ben.id]);
    await pick(w, t.id, t.review.questions, [{ person_id: joshK.id }]);
    expect(live(w).map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [joshK.id]]]);
  });

  it("K6-E: Not now: the memory stays Ben's, and no Josh is created", async () => {
    const w = await world();
    const [ben] = await typed(w, "Ben");
    const t = await tell(w, K6, k6Reply(ben.id));
    expect(cardFor(t.review)!.newcomers).toEqual([{ name: "Josh", itemIds: t.review.lines.map((l) => l.id) }]);
    await done(w, t.id); // the card's Not now settles nothing on the server; closing keeps the line as it is
    expect(live(w).map((m) => [m.person_id, m.with_person_ids ?? []])).toEqual([[ben.id, []]]);
    expect((await w.repos.people.list()).map((p) => p.display_name)).toEqual(["Ben"]);
  });

  it("K6-F: Josh added to People later: his page asks 'Is this the Josh in …?', and Yes links the same memory, never a copy", async () => {
    const w = await world();
    const [ben] = await typed(w, "Ben");
    const t = await tell(w, K6, k6Reply(ben.id));
    await done(w, t.id);
    const [josh] = await typed(w, "Josh");
    const items = (await w.store.list("memory_items")) as MemoryItem[];
    const [s] = linkSuggestions({ person: josh, people: await w.repos.people.list(), items, related: await w.repos.people.related(), answered: new Set() });
    expect(s.prompt).toMatch(/^Is this the Josh in /u);
    // Through the page's own Yes (reviewer E, r2).
    await acceptLink(w.store, josh.id, s);
    await w.engine.sync();
    expect(live(w).map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [josh.id]]]);
  });

  it("K6-G: two people new to People are both offered; adding one leaves the other offered", async () => {
    const w = await world();
    const [ben] = await typed(w, "Ben");
    const note = "Ben is thinking about reaching out to Josh and Maria about a job";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "thread", person: key(i, ben.id), person_mention: "Ben", statement: note, evidence: [note], certainty: "tentative", detail: { topic: "a job" } }),
    ] }));
    const card = cardFor(t.review)!;
    expect(card.newcomers!.map((n) => n.name)).toEqual(["Josh", "Maria"]);
    await w.understanding.addNewcomer(card.newcomers![0].itemIds, "Josh");
    await w.engine.sync();
    expect(cardFor(await review(w, t.id))!.newcomers!.map((n) => n.name)).toEqual(["Maria"]);
  });
});

// ─── Cross-feature adversarial cases (A–E) ─────────────────────────────────

describe("adversarial: nothing plausible disappears, no wrong person is chosen, ambiguity is asked narrowly", () => {
  it("A: \"Chris' brother Sam promised Anthony he'd send Josh the contractor number Friday.\" (two Sams, two Anthonys, no Josh)", async () => {
    const w = await world();
    const [, , , , chris] = await typed(w, "Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris");
    const note = "Chris' brother Sam promised Anthony he'd send Josh the contractor number Friday.";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "promise", subject: "person", person: key(i, chris.id), person_mention: "Chris' brother Sam", statement: "Sam promised Anthony he'd send Josh the contractor number",
        evidence: ["Chris' brother Sam promised Anthony he'd send Josh the contractor number Friday"], date_text: "Friday" }),
    ] }));
    // Asked narrowly ("Which Sam?", with both Sams), nothing saved on a guess, nothing dropped.
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Which Sam do you mean?", ["Sam Eden", "Sam Doughty", "Someone else"]]]);
    expect(live(w)).toEqual([]);
  });

  it("B: \"Loo Loo and Sam Eden want to call Chris' vet Friday.\" (an earlier name, a full name, a possessive)", async () => {
    const w = await world();
    const [loo] = await contacts(w, "Wifey Liu");
    await w.repos.people.rename(loo.id, "Loo Loo");
    await w.engine.sync();
    const [samEden, , chris] = await typed(w, "Sam Eden", "Sam Doughty", "Chris");
    const note = "Loo Loo and Sam Eden want to call Chris' vet Friday.";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "plan", subject: "person", person: key(i, loo.id), person_mention: "Loo Loo", statement: "Loo Loo and Sam Eden want to call Chris' vet",
        evidence: ["Loo Loo and Sam Eden want to call Chris' vet Friday"], date_text: "Friday" }),
    ] }));
    expect(t.review.questions).toEqual([]);
    await done(w, t.id);
    expect(live(w).map((m) => [m.person_id, [...(m.with_person_ids ?? [])].sort()])).toEqual([[loo.id, [chris.id, samEden.id].sort()]]);
  });

  it("C: \"Anthony and Sam promised Chris they'd call Josh Friday.\": held, asked, nothing guessed or lost", async () => {
    const w = await world();
    const [anthony] = await typed(w, "Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris");
    const note = "Anthony and Sam promised Chris they'd call Josh Friday.";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "promise", subject: "person", person: key(i, anthony.id), person_mention: "Anthony", statement: "Anthony and Sam promised Chris they'd call Josh",
        evidence: ["Anthony and Sam promised Chris they'd call Josh Friday"], date_text: "Friday" }),
    ] }));
    expect(t.review.mode).toBe("sheet");
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Which Anthony do you mean?", ["Anthony", "Anthony Test", "Someone else"]]]);
    expect(live(w)).toEqual([]);
  });

  it("E: a resolved shared memory, then Undo: nothing stays, no copy and no conversation appear", async () => {
    const a = await k4World();
    await pick(a.w, a.t.id, a.t.review.questions, [{ person_id: a.anthony.id }, { person_id: a.samEden.id }]);
    expect(live(a.w)).toHaveLength(1);
    await a.w.understanding.undo(a.t.id);
    await a.w.understanding.run();
    await a.w.engine.sync();
    expect(live(a.w)).toEqual([]);
    expect([...a.w.server.table("contact_events").values()]).toEqual([]);
  });
});

describe("reviewer E (13 Oct): the paths the first tests didn't reach", () => {
  it("E5: 'Which Sam?' → Someone else → Antonio, through the review's own answers: only the Sam changes", async () => {
    const a = await k4World();
    const [antonio] = await typed(a.w, "Antonio");
    const [qa, qs] = a.t.review.questions;
    const answers = answersFor(a.t.review.questions, { [qa.key]: { person_id: a.anthony.id }, [qs.key]: { person_id: antonio.id } });
    await a.w.understanding.answer(a.t.id, answers!);
    await a.w.understanding.run();
    await done(a.w, a.t.id);
    expect(live(a.w).map((m) => [m.person_id, [...(m.with_person_ids ?? [])].sort(), m.statement]))
      .toEqual([[a.anthony.id, [a.chris.id, antonio.id].sort(), "Anthony and Antonio love ice skating with Chris"]]);
  });

  it("E6: the page and What Kinship knows read the conversations kept in the store, in the words the page shows", async () => {
    const w = await world();
    const [tyler] = await typed(w, "Tyler");
    await w.repos.contacts.confirm({ person_id: tyler.id, channel: "call", source: "manual", occurred_at: new Date(w.server.clock).toISOString() });
    await w.engine.sync();
    const p = await page(w, tyler);
    expect(p.portrait.trail.map((t) => t.label)).toEqual([expect.stringMatching(/^You called · /u)]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { trailOf } = require("@/hooks/useV2") as typeof import("@/hooks/useV2");
    expect((await trailOf(w.repos, tyler.id, new Date(w.server.clock))).map((t) => t.label)).toEqual(p.portrait.trail.map((t) => t.label));
  });

  it("K6 (reviewer A): never a brand, a title or a relation word; and contact / email / message / got in touch with someone", () => {
    for (const s of ["Ben is reaching out to Stripe about a job", "Ben called Verizon about the bill", "Ben is seeing Dr. Patel", "Ben told Santa", "Ben texted Mama", "Ben emailed Google"]) {
      expect([s, newcomersIn(s, s, [])]).toEqual([s, []]);
    }
    for (const s of ["Ben wants to contact Josh", "Ben emailed Josh", "Ben messaged Josh", "Ben got in touch with Josh"]) {
      expect([s, newcomersIn(s, s, [])]).toEqual([s, ["Josh"]]);
    }
  });
});
