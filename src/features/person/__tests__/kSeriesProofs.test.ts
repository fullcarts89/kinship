// K-series (the founder's native pass of 12 Oct, on the build of main
// 90a5cf0), through the product's real code: the gateway's pipeline and
// answer path, the write rules, sync, Understanding, the review and its
// answers, the Kept card and the relationship page. Only the model's reply is
// written by hand, in each shape the model uses for the founder's own words.
import { portraitFor, recordFor, todayIso, earlierOf } from "@/hooks/useV2";
import { voiced } from "@/features/memory/statements";
import { answersFor, buildReview, newcomersIn, type Question, type ReviewView } from "@/features/tell/reviewModel";
import { buildToday } from "@/features/today/todayModel";
import { categoryOf, sectionOf } from "../../../../supabase/functions/_shared/semantic/categories";
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

const A = "aaaaaaaa-0000-4000-8000-0000000000e7";
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
const asked = (r: ReviewView) => r.questions.map((q) => [q.prompt, q.choices.map((c) => c.label), q.skip.label]);

// ─── K4 ──────────────────────────────────────────────────────────────────

const K4 = "Anthony and Sam love ice skating with Chris";

describe("K4: 'Anthony and Sam love ice skating with Chris', with two Anthonys and two Sams in People", () => {
  async function setup() {
    const w = await world();
    const [anthony, anthonyTest, samEden, samD, chris] = await typed(w, "Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris");
    return { w, anthony, anthonyTest, samEden, samD, chris };
  }
  const oneLine = (owner: (i: ExtractionInput) => string, mention: string | null) => (i: ExtractionInput): ModelProposal => ({
    needs_clarification: null,
    items: [item({ kind: "fact", person: owner(i), person_mention: mention, statement: K4, evidence: [K4], detail: { category: "interest" } })],
  });

  it("one line on Anthony: 'Which Anthony?' with both Anthonys, then 'Which Sam?' with both Sams; never a five-person 'Who is this about?'", async () => {
    const { w, anthony } = await setup();
    const t = await tell(w, K4, oneLine((i) => key(i, anthony.id), "Anthony"));
    expect(asked(t.review)).toEqual([
      ["Which Anthony do you mean?", ["Anthony", "Anthony Test", "Someone else"], "Don't keep this"],
      ["Which Sam do you mean?", ["Sam Eden", "Sam Doughty", "Someone else"], "Not sure"],
    ]);
  });

  it("answered Anthony Test, and Sam → Someone else → Sam Eden: one memory on Anthony Test, Sam Eden and Chris, nobody dropped, never on Anthony", async () => {
    const { w, anthony, anthonyTest, samEden, samD, chris } = await setup();
    const t = await tell(w, K4, oneLine((i) => key(i, anthony.id), "Anthony"));
    const answers = answersFor(t.review.questions, { [t.review.questions[0].key]: { person_id: anthonyTest.id }, [t.review.questions[1].key]: { person_id: samEden.id } });
    await w.understanding.answer(t.id, answers!);
    await w.understanding.run();
    // The Kept card names everyone it's about.
    expect((await review(w, t.id)).lines.map((l) => [l.person?.label, l.also])).toEqual([["Anthony Test", ["Sam Eden", "Chris"]]]);
    await done(w, t.id);
    const items = serverItems(w).filter((m) => m.status === "active");
    expect(items).toHaveLength(1);
    expect([items[0].person_id, [...(items[0].with_person_ids ?? [])].sort()]).toEqual([anthonyTest.id, [chris.id, samEden.id].sort()]);
    expect(items[0].statement).toBe(K4);
    for (const p of [anthonyTest, samEden, chris]) expect((await page(w, p)).knowsLines).toEqual([K4]);
    for (const p of [anthony, samD]) expect((await page(w, p)).knowsLines).toEqual([]);
  });

  it("filed on no one: the same two questions, and Anthony answered Anthony keeps it on Anthony (never Anthony Test)", async () => {
    const { w, anthony, anthonyTest, samD, chris } = await setup();
    const t = await tell(w, K4, oneLine(() => "unknown", null));
    expect(asked(t.review).map((q) => q[0])).toEqual(["Which Anthony do you mean?", "Which Sam do you mean?"]);
    await pick(w, t.id, t.review.questions, [{ person_id: anthony.id }, { person_id: samD.id }]);
    expect((await page(w, anthony)).knowsLines).toEqual([K4]);
    expect((await page(w, anthonyTest)).knowsLines).toEqual([]);
    expect((await page(w, chris)).knowsLines).toEqual([K4]);
  });

  it("'Not sure' about Sam: the line is kept for Anthony and Chris, in the user's words, with no Sam guessed", async () => {
    const { w, anthony, samEden, samD, chris } = await setup();
    const t = await tell(w, K4, oneLine((i) => key(i, anthony.id), "Anthony"));
    await pick(w, t.id, t.review.questions, [{ person_id: anthony.id }, "skip"]);
    const [m] = serverItems(w).filter((x) => x.status === "active");
    expect([m.person_id, m.with_person_ids, m.statement]).toEqual([anthony.id, [chris.id], K4]);
    for (const p of [samEden, samD]) expect((await page(w, p)).knowsLines).toEqual([]);
  });

  it("a line for each of them: Chris's is kept, 'Which Anthony?' and 'Which Sam?' are asked once each, and the answers join it: one memory on all three", async () => {
    const { w, anthony, anthonyTest, samEden, chris } = await setup();
    const t = await tell(w, K4, (i) => ({
      needs_clarification: null,
      items: [
        item({ kind: "fact", person: key(i, anthony.id), person_mention: "Anthony", statement: "Anthony loves ice skating with Sam and Chris", evidence: [K4], detail: { category: "interest" } }),
        item({ kind: "fact", person: key(i, samEden.id), person_mention: "Sam", statement: "Sam loves ice skating with Anthony and Chris", evidence: [K4], detail: { category: "interest" } }),
        item({ kind: "fact", person: key(i, chris.id), person_mention: "Chris", statement: "Chris loves ice skating with Anthony and Sam", evidence: [K4], detail: { category: "interest" } }),
      ],
    }));
    expect(asked(t.review).map((q) => [q[0], q[1]])).toEqual([
      ["Which Anthony do you mean?", ["Anthony", "Anthony Test", "Someone else"]],
      ["Which Sam do you mean?", ["Sam Eden", "Sam Doughty", "Someone else"]],
    ]);
    await pick(w, t.id, t.review.questions, [{ person_id: anthonyTest.id }, { person_id: samEden.id }]);
    const items = serverItems(w).filter((m) => m.status === "active");
    expect(items).toHaveLength(1);
    expect([items[0].person_id, [...(items[0].with_person_ids ?? [])].sort()]).toEqual([chris.id, [anthonyTest.id, samEden.id].sort()]);
    for (const p of [anthonyTest, samEden, chris]) expect((await page(w, p)).knowsLines).toHaveLength(1);
  });
});

describe("reviewer A, round 2 (13 Oct): a name asked about never brings back a memory the user turned down", () => {
  it("'Michelle and Sam are getting divorced', a line for each: 'Don't keep this' on Michelle's keeps nothing, whichever Sam is chosen", async () => {
    for (const keep of [false, true]) {
      const w = await world();
      const [michelle, samEden] = await typed(w, "Michelle", "Sam Eden", "Sam Doughty");
      const note = "Michelle and Sam are getting divorced";
      const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
        item({ kind: "fact", person: key(i, michelle.id), person_mention: "Michelle", statement: "Michelle and Sam are getting divorced", evidence: [note], sensitivity: "conflict" }),
        item({ kind: "fact", person: key(i, samEden.id), person_mention: "Sam", statement: "Sam and Michelle are getting divorced", evidence: [note], sensitivity: "conflict" }),
      ] }));
      expect(serverItems(w).filter((m) => m.status === "active")).toHaveLength(0);
      const picks = t.review.questions.map((q) => (q.type === "keep" ? (keep ? {} : "skip") : { person_id: samEden.id })) as (Omit<HeldAnswer, "index"> | "skip")[];
      await pick(w, t.id, t.review.questions, picks);
      const live = serverItems(w).filter((m) => m.status === "active" && !m.deleted_at);
      expect(live.map((m) => [m.person_id, m.with_person_ids])).toEqual(keep ? [[michelle.id, [samEden.id]]] : []);
    }
  });

  it("the kept line replaced by a later note, then 'Which Anthony?' and 'Which Sam?' answered: its old words never come back (reviewer A, r4)", async () => {
    const w = await world();
    const [anthony, , samEden, , chris] = await typed(w, "Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris");
    const t = await tell(w, K4, (i) => ({ needs_clarification: null, items: [
      item({ kind: "fact", person: key(i, chris.id), person_mention: "Chris", statement: K4, evidence: [K4], detail: { category: "interest" } }),
    ] }));
    const [kept] = serverItems(w).filter((m) => m.status === "active");
    w.server.serverWrite("memory_items", kept.id, A, { status: "superseded" });
    await w.engine.sync();
    const picks = t.review.questions.map((q) => (q.prompt.includes("Anthony") ? { person_id: anthony.id } : { person_id: samEden.id }));
    await pick(w, t.id, t.review.questions, picks);
    expect(serverItems(w).filter((m) => m.status === "active" && !m.deleted_at)).toEqual([]);
  });

  it("the kept line removed with 'Not this', then 'Which Anthony?' and 'Which Sam?' answered: nothing comes back", async () => {
    const w = await world();
    const [anthony, , samEden, , chris] = await typed(w, "Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris");
    const t = await tell(w, K4, (i) => ({ needs_clarification: null, items: [
      item({ kind: "fact", person: key(i, chris.id), person_mention: "Chris", statement: K4, evidence: [K4], detail: { category: "interest" } }),
    ] }));
    await w.understanding.reject(t.review.lines[0].id, t.id);
    await w.engine.sync();
    const after = await review(w, t.id);
    const picks = after.questions.map((q) => (q.prompt.includes("Anthony") ? { person_id: anthony.id } : { person_id: samEden.id }));
    await pick(w, t.id, after.questions, picks);
    expect(serverItems(w).filter((m) => m.status === "active" && !m.deleted_at)).toEqual([]);
  });
});

describe("reviewer A, round 2 (13 Oct): who else a line names is never lost to case, script or a removed namesake", () => {
  it("a note typed in lower case still keeps Chris on Ben's line", async () => {
    const w = await world();
    const [ben, chris] = await typed(w, "Ben", "Chris");
    const note = "ben went to tahoe with chris last weekend";
    await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "fact", person: key(i, ben.id), person_mention: "ben", statement: "Ben went to Tahoe with Chris", evidence: ["ben went to tahoe with chris"] }),
    ] }));
    expect(serverItems(w).filter((m) => m.status === "active").map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [chris.id]]]);
  });

  it("someone removed from People also called Chris: 'Which Chris?' is asked, and the answer joins Ben's line", async () => {
    const w = await world();
    const [ben, chris, old] = await typed(w, "Ben", "Chris", "Chris Old");
    await w.repos.people.archive(old.id);
    await w.engine.sync();
    const note = "Ben went to Tahoe with Chris";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "fact", person: key(i, ben.id), person_mention: "Ben", statement: note, evidence: [note] }),
    ] }));
    expect(serverItems(w).filter((m) => m.status === "active").map((m) => [m.person_id, m.with_person_ids ?? []])).toEqual([[ben.id, []]]);
    expect(asked(t.review).map((q) => [q[0], q[1]])).toEqual([["Which Chris do you mean?", ["Chris", "Bring back Chris Old", "Someone else"]]]);
    await pick(w, t.id, t.review.questions, [{ person_id: chris.id }]);
    expect(serverItems(w).filter((m) => m.status === "active").map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [chris.id]]]);
  });
});

// ─── K5 ──────────────────────────────────────────────────────────────────

describe("K5: 'I got the job, and can't wait to tell Loo Loo' is never 'Nothing to remember'", () => {
  async function looLoo(w: World): Promise<Person> {
    const [p] = await contacts(w, "Wifey Liu");
    for (const name of ["Cutie Pie", "Boo Boo", "Loo Loo"]) {
      await w.repos.people.rename(p.id, name);
      await w.engine.sync();
    }
    return p;
  }

  for (const [shape, reply, line, section] of [
    ["a fact about the user", (k: string) => item({ kind: "fact", subject: "user", person: k, statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
      "You got the job", "between"],
    ["the user's milestone", (k: string) => item({ kind: "milestone", subject: "user", person: k, person_mention: "Loo Loo", statement: "You got the job and can't wait to tell Loo Loo",
      evidence: ["I got the job, and can't wait to tell Loo Loo"], detail: { milestone_type: "new_job" } }), "You got the job and can't wait to tell Loo Loo", "comingUp"],
    ["filed on no one", () => item({ kind: "fact", subject: "user", person: "unknown", statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
      "You got the job", "between"],
  ] as const) {
    it(`read as ${shape}: kept on Loo Loo's page in the line's own words, never 'Nothing to remember'`, async () => {
      const w = await world();
      const loo = await looLoo(w);
      const note = "I got the job, and can't wait to tell Loo Loo";
      const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [reply(key(i, loo.id))] }));
      expect(t.review.mode).toBe("card");
      expect(t.review.lines.map((l) => [l.statement, l.person?.label])).toEqual([[line, "Loo Loo"]]);
      await done(w, t.id);
      const p = await page(w, loo);
      expect(p.portrait[section].map((l) => l.statement)).toEqual([line]);
      expect(p.portrait.youSaid).toEqual([]);
    });
  }

  // Founder (13 Oct, CC-22 §1): kept with Loo Loo, the user's news stays the user's. Subject truth (the user),
  // person association (Loo Loo), relationship context (between you) and display eligibility are separate: it is
  // never "Loo Loo got the job", never her Background (H15/B1), never a Today congratulation for her.
  it("kept with Loo Loo, 'You got the job' is the user's news: never her biography, Background or good news", async () => {
    const w = await world();
    const loo = await looLoo(w);
    const note = "I got the job, and can't wait to tell Loo Loo";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "fact", subject: "user", person: key(i, loo.id), statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
    ] }));
    await done(w, t.id);
    const [kept] = serverItems(w).filter((m) => m.status === "active");
    expect([kept.person_id, kept.subject_type, kept.statement]).toEqual([loo.id, "user", "You got the job"]);
    const quotes = (await w.repos.memory.sourcesFor(kept.id)).map((s) => String(s.quote ?? ""));
    expect([categoryOf(kept, quotes), sectionOf(kept, quotes)]).toEqual(["between_you", "between_you"]);
    const p = await page(w, loo);
    expect([p.portrait.lately, p.portrait.comingUp, p.portrait.youSaid].flat().map((l) => l.statement)).toEqual([]);
    expect(p.knowsLines).toEqual(["You got the job"]);
    expect(p.knowsLines.some((l) => /Loo Loo got|Loo Loo has/u.test(l))).toBe(false);
    const today = buildToday({
      now: new Date(w.server.clock), today: todayIso(new Date(w.server.clock)), reasons: [], items: serverItems(w), people: await w.repos.people.list(),
      local: {}, primaries: [], handoff: null, told: 1, questions: 0, toLookAt: 0, provenance: () => null, activated: true, contacts: [],
    });
    expect(today.moment).toBeNull();
  });

  it("the same with Ben, and with her old name 'Wifey'", async () => {
    for (const name of ["Ben", "Wifey"]) {
      const w = await world();
      const [p] = name === "Ben" ? await typed(w, "Ben") : [await looLoo(w)];
      const note = `I got the job, and can't wait to tell ${name}`;
      const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
        item({ kind: "fact", subject: "user", person: key(i, p.id), statement: "You got the job", evidence: ["I got the job"], detail: { category: "work" } }),
      ] }));
      expect([name, t.review.mode]).toEqual([name, "card"]);
      await done(w, t.id);
      expect((await page(w, p)).knowsLines).toHaveLength(1);
    }
  });
});

// ─── K7 ──────────────────────────────────────────────────────────────────

describe("K7: \"Chris' dog Fluffy has a vet appointment on Friday\"", () => {
  it("is Chris's, with no question: never 'Who is Chris'?' and never only 'Someone already here'", async () => {
    for (const form of ["Chris'", "Chris's", "Chris’s"]) {
      const w = await world();
      const [chris] = await typed(w, "Chris", "Ben");
      const note = `${form} dog Fluffy has a vet appointment on Friday`;
      const t = await tell(w, note, () => ({ needs_clarification: null, items: [
        item({ kind: "event", person: "new", person_mention: form, statement: note, evidence: [note], date_text: "Friday",
          sensitivity: "health", detail: { event_type: "medical" } }),
      ] }));
      expect([form, t.review.questions]).toEqual([form, []]);
      expect(t.review.lines.map((l) => l.person?.label)).toEqual(["Chris"]);
      await done(w, t.id);
      // The day is kept as the date ("Friday" goes stale), as for any dated line.
      expect((await page(w, chris)).portrait.comingUp.map((l) => l.statement)).toEqual([`${form} dog Fluffy has a vet appointment`]);
      expect((await w.repos.people.list()).map((p) => p.display_name).sort()).toEqual(["Ben", "Chris"]);
    }
  });

  it("a possessive on someone not in People asks 'Who is Jess?' with Add Jess (the apostrophe is never part of a name)", async () => {
    const w = await world();
    await typed(w, "Chris");
    const note = "Jess' dog Fluffy has a vet appointment on Friday";
    const t = await tell(w, note, () => ({ needs_clarification: null, items: [
      item({ kind: "event", person: "new", person_mention: "Jess'", statement: note, evidence: [note], date_text: "Friday", detail: { event_type: "medical" } }),
    ] }));
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Who is Jess?", ["Add Jess", "Someone already here"]]]);
  });
});

// ─── K6 ──────────────────────────────────────────────────────────────────

describe("K6: someone a kept line names who isn't in People yet", () => {
  it("'Ben is thinking about reaching out to Josh about a job': kept for Ben, and the Kept card offers Add Josh; Add links the same memory, never a copy", async () => {
    const w = await world();
    const [ben] = await typed(w, "Ben");
    const note = "Ben is thinking about reaching out to Josh about a job";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "thread", person: key(i, ben.id), person_mention: "Ben", statement: note, evidence: [note], certainty: "tentative", detail: { topic: "reaching out to Josh about a job" } }),
    ] }));
    expect(t.review.lines.map((l) => [l.person?.label, l.newcomers])).toEqual([["Ben", ["Josh"]]]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cardFor } = require("@/features/tell/TellFlow") as typeof import("@/features/tell/TellFlow");
    const card = cardFor(t.review)!;
    expect(card.newcomers).toEqual([{ name: "Josh", itemIds: t.review.lines.map((l) => l.id) }]);
    await w.understanding.addNewcomer(card.newcomers![0].itemIds, "Josh");
    await done(w, t.id);
    const josh = (await w.repos.people.list()).find((p) => p.display_name === "Josh")!;
    expect(serverItems(w).filter((m) => m.status === "active").map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [josh.id]]]);
    expect((await page(w, josh)).knowsLines).toEqual([note]);
    expect((await page(w, ben)).knowsLines).toEqual([note]);
  });

  it("two people new to People are both offered; someone already in People, a relation word, a place or a company never are", () => {
    expect(newcomersIn("Ben is thinking about reaching out to Josh and Maria about a job", "Ben is thinking about reaching out to Josh and Maria about a job", [])).toEqual(["Josh", "Maria"]);
    const josh = { id: "j", display_name: "Josh", state: "active" } as unknown as Person;
    expect(newcomersIn("Ben is thinking about reaching out to Josh about a job", "Ben is thinking about reaching out to Josh about a job", [josh])).toEqual([]);
    expect(newcomersIn("Ben wants to tell Mom about the job", "Ben wants to tell Mom about the job", [])).toEqual([]);
    expect(newcomersIn("Ben is interviewing with Box", "Ben is interviewing with Box", [])).toEqual([]);
    expect(newcomersIn("Ben is moving to Austin", "Ben is moving to Austin", [])).toEqual([]);
    expect(newcomersIn("Ben met Dana at the game", "Ben met Dana at the game", [])).toEqual(["Dana"]);
  });

  it("reviewer A r2 (N5): a service reached out to is never offered as someone new; a person with a service's name still is, where the words say person", () => {
    for (const s of ["Ben contacted Airbnb about the booking", "Ben called Tesla about his car", "Ben emailed Target about a refund", "Ben messaged Support about his account"]) {
      expect(newcomersIn(s, s, [])).toEqual([]);
    }
    expect(newcomersIn("Susan is getting married to Siri", "Susan is getting married to Siri", [])).toEqual(["Siri"]);
    // Reviewer C, r3: "…with Uber" and "Ben and Google are…" fit a service as well as "called Tesla" does.
    const ben = [{ id: "b", display_name: "Ben", state: "active" }] as unknown as Person[];
    // Reviewer A, r4: an assistant's name is also a given name: never someone asked or told, still someone to move with.
    expect(newcomersIn("Ben asked Alexa to play music", "Ben asked Alexa to play music", ben)).toEqual([]);
    for (const s of ["Ben and Alexa are moving to Denver", "Ben is moving to Denver with Alexa", "Ben and Alexa got engaged"]) {
      expect([s, newcomersIn(s, s, ben)]).toEqual([s, ["Alexa"]]);
    }
    for (const s of ["Ben is traveling with Delta to Paris", "Ben is going to the airport with Uber", "Ben and Google are talking about a job"]) {
      expect([s, newcomersIn(s, s, ben)]).toEqual([s, []]);
    }
  });

  it("a name two people in People share is asked about ('Which Sam?'), never offered as someone new", async () => {
    const w = await world();
    const [ben, samEden] = await typed(w, "Ben", "Sam Eden", "Sam Doughty");
    const note = "Ben is thinking about reaching out to Sam about a job";
    const t = await tell(w, note, (i) => ({ needs_clarification: null, items: [
      item({ kind: "thread", person: key(i, ben.id), person_mention: "Ben", statement: note, evidence: [note], certainty: "tentative", detail: { topic: "a job" } }),
    ] }));
    expect(t.review.lines.flatMap((l) => l.newcomers ?? [])).toEqual([]);
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Which Sam do you mean?", ["Sam Eden", "Sam Doughty", "Someone else"]]]);
    // The line itself is already Ben's: kept, and the answer joins it.
    expect(serverItems(w).filter((m) => m.status === "active").map((m) => m.person_id)).toEqual([ben.id]);
    await pick(w, t.id, t.review.questions, [{ person_id: samEden.id }]);
    expect(serverItems(w).filter((m) => m.status === "active").map((m) => [m.person_id, m.with_person_ids])).toEqual([[ben.id, [samEden.id]]]);
  });
});
