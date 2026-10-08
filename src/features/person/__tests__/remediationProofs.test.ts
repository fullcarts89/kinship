// Gate 0 remediation (the founder's native findings of 7 Oct on the Gate 0
// build; decisions of 8 Oct), through the product's real code: the gateway's
// pipeline and answer path, the write rules, sync, Understanding, the review,
// the relationship page, What Kinship knows and Source. Only the model's
// reply is written by hand.
import { noteFor, portraitFor, recordFor, todayIso, earlierOf } from "@/hooks/useV2";
import { voiced } from "@/features/memory/statements";
import { buildReview, type ReviewView } from "@/features/tell/reviewModel";
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

const A = "aaaaaaaa-0000-4000-8000-0000000000e5";
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

async function contacts(w: World, ...names: string[]): Promise<Person[]> {
  const out: Person[] = [];
  for (const name of names) out.push(await w.repos.people.add({ display_name: name, full_name: name }));
  await w.engine.sync();
  return out;
}
async function typed(w: World, ...names: string[]): Promise<Person[]> {
  const out: Person[] = [];
  for (const name of names) out.push(await w.repos.people.add({ display_name: name }));
  await w.engine.sync();
  return out;
}

async function tell(w: World, note: string, reply: (i: ExtractionInput) => ModelProposal, context?: Person): Promise<{ id: string; review: ReviewView }> {
  w.gateway.propose(note, reply);
  const c = await w.repos.captures.tell(note, { aiEnabled: true, timeZone: TZ, contextPersonId: context?.id });
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

async function answer(w: World, id: string, answers: HeldAnswer[]) {
  await w.understanding.answer(id, answers);
  await w.understanding.run();
  await done(w, id);
}

async function page(w: World, p: Person) {
  const fresh = (await w.repos.people.list()).find((x) => x.id === p.id)!;
  const portrait = await portraitFor(w.repos, fresh, new Date(w.server.clock));
  const knows = await recordFor(w.repos, p.id, new Date(w.server.clock));
  const shown = [...portrait.lately, ...portrait.comingUp, ...portrait.youSaid, ...portrait.between].map((l) => l.statement);
  return { portrait, knows, shown };
}

const serverItems = (w: World) => [...w.server.table("memory_items").values()] as unknown as MemoryItem[];

describe("I12 (re-seen): a rename shows on every line, with no manual step", () => {
  it("lines told while she was 'Wifey Liu' read 'Loo Loo …' after Cutie Pie → Boo Boo → Loo Loo; Source keeps 'Wifey'; nothing stored is rewritten", async () => {
    const w = await world();
    const [wifey] = await contacts(w, "Wifey Liu");
    const note = "Wifey got promoted on Monday. Wifey is thinking about moving to Marin next summer.";
    const t = await tell(w, note, (i) => ({
      needs_clarification: null,
      items: [
        item({ kind: "fact", person: key(i, wifey.id), person_mention: "Wifey", statement: "Wifey got promoted", evidence: ["Wifey got promoted on Monday"], detail: { category: "work" } }),
        item({ kind: "fact", person: key(i, wifey.id), person_mention: "Wifey", statement: "Wifey is thinking about moving to Marin next summer",
          evidence: ["Wifey is thinking about moving to Marin next summer"], certainty: "tentative", detail: { category: "home" } }),
      ],
    }));
    await done(w, t.id);
    // While she is still Wifey Liu, the words are exactly as told.
    expect((await page(w, wifey)).shown.sort()).toEqual(["Wifey got promoted", "Wifey is thinking about moving to Marin next summer"]);

    for (const name of ["Cutie Pie", "Boo Boo", "Loo Loo"]) {
      await w.repos.people.rename(wifey.id, name);
      await w.engine.sync();
    }
    const p = await page(w, wifey);
    expect(p.shown.sort()).toEqual(["Loo Loo got promoted", "Loo Loo is thinking about moving to Marin next summer"]);
    expect(p.knows.lines.map((l) => l.line.statement).sort()).toEqual(["Loo Loo got promoted", "Loo Loo is thinking about moving to Marin next summer"]);
    expect(serverItems(w).map((m) => m.statement).sort()).toEqual(["Wifey got promoted", "Wifey is thinking about moving to Marin next summer"]);
    const source = (await noteFor(w.store, t.id, new Date(w.server.clock)))!;
    expect(source.runs!.map((r) => r.text).join("")).toBe(note);
  });

  it("the founder's own lines from before: as the migration's backfill leaves them ('Wifey', an earlier name), they read 'Loo Loo'", async () => {
    const w = await world();
    const [loo] = await contacts(w, "Wifey Liu");
    const t = await tell(w, "Wifey got promoted.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, loo.id), person_mention: "Wifey", statement: "Wifey got promoted", evidence: ["Wifey got promoted"], detail: { category: "work" } })],
    }));
    await done(w, t.id);
    // The build before this one: renamed with no record of the earlier name, and lines with no mentions…
    const line = serverItems(w)[0];
    w.server.serverWrite("people", loo.id, A, { display_name: "Cutie Pie", full_name: "Cutie Pie", nicknames: [] });
    w.server.serverWrite("memory_items", line.id, A, { person_mentions: [] });
    // …then Boo Boo and Loo Loo on the Gate 0 build, and the migration's backfill.
    w.server.serverWrite("people", loo.id, A, { display_name: "Loo Loo", full_name: "Loo Loo", nicknames: ["Cutie Pie", "Boo Boo"] });
    w.server.serverWrite("memory_items", line.id, A, { person_mentions: [{ person_id: loo.id, text: "Wifey", name: null }] });
    await w.engine.sync();
    expect((await page(w, loo)).shown).toEqual(["Loo Loo got promoted"]);
  });

  it("decision 1b: 'Liz got promoted' stays the user's words while she is Elizabeth Chen; renamed Lizzie, it reads 'Lizzie got promoted'; Source keeps 'Liz'", async () => {
    const w = await world();
    const [liz] = await contacts(w, "Elizabeth Chen");
    const note = "Liz got promoted.";
    const t = await tell(w, note, (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: "new", person_mention: "Liz", statement: "Liz got promoted", evidence: ["Liz got promoted"], detail: { category: "work" } })],
    }));
    // Nobody in People is "Liz": asked, and the user says it's Elizabeth.
    expect(t.review.questions.length).toBe(1);
    await answer(w, t.id, [{ index: 0, person_id: liz.id }]);
    expect((await page(w, liz)).shown).toEqual(["Liz got promoted"]);
    await w.repos.people.rename(liz.id, "Lizzie");
    await w.engine.sync();
    expect((await page(w, liz)).shown).toEqual(["Lizzie got promoted"]);
    expect(serverItems(w).map((m) => m.statement)).toEqual(["Liz got promoted"]);
    expect((await noteFor(w.store, t.id, new Date(w.server.clock)))!.runs!.map((r) => r.text).join("")).toBe(note);
  });
});

describe("I13 (re-seen): every path that says who a line is about", () => {
  it("'Anthony and Sam love watching Dragonball Z' with two of each, both answered Someone else → Chris: one line, 'Chris loves watching Dragonball Z', on Chris; the note untouched", async () => {
    const w = await world();
    const [, , samEden, samD, chris] = await typed(w, "Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris");
    const note = "Anthony and Sam love watching Dragonball Z.";
    const quote = "Anthony and Sam love watching Dragonball Z";
    const t = await tell(w, note, (i) => ({
      needs_clarification: null,
      items: [
        item({ kind: "fact", person: i.roster.find((r) => r.display_name === "Anthony")!.key, person_mention: "Anthony", statement: "Anthony loves watching Dragonball Z", evidence: [quote], detail: { category: "interest" } }),
        item({ kind: "fact", person: key(i, samEden.id), person_mention: "Sam", statement: "Sam loves watching Dragonball Z", evidence: [quote], detail: { category: "interest" } }),
      ],
    }));
    // Two questions, each offering only the people its name can mean (never one "Who is this about?" for both).
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([
      ["Which Anthony do you mean?", ["Anthony", "Anthony Lopez", "Someone else"]],
      ["Which Sam do you mean?", ["Sam Eden", "Sam Doughty", "Someone else"]],
    ]);
    await answer(w, t.id, [{ index: 0, person_id: chris.id }, { index: 1, person_id: chris.id }]);
    expect((await page(w, chris)).shown).toEqual(["Chris loves watching Dragonball Z"]);
    expect(serverItems(w).map((m) => [m.person_id, m.statement])).toEqual([[chris.id, "Chris loves watching Dragonball Z"]]);
    expect((await noteFor(w.store, t.id, new Date(w.server.clock)))!.runs!.map((r) => r.text).join("")).toBe(note);
    // Neither Sam's page says anything about it.
    expect((await page(w, samEden)).shown).toEqual([]);
    expect((await page(w, samD)).shown).toEqual([]);
  });

  it("a saved line moved to the right person: 'Ben starts a new job' → Josh reads 'Josh starts a new job', with 'was:' history", async () => {
    const w = await world();
    const [ben, josh] = await contacts(w, "Ben Oxnard", "Josh Patel");
    const t = await tell(w, "Ben starts a new job Monday.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, ben.id), person_mention: "Ben", statement: "Ben starts a new job", evidence: ["Ben starts a new job"], detail: { category: "work" } })],
    }));
    await done(w, t.id);
    const line = serverItems(w)[0];
    await w.understanding.correct(line.id, { person_id: josh.id });
    await w.engine.sync();
    const p = await page(w, josh);
    expect(p.shown).toEqual(["Josh starts a new job"]);
    const record = p.knows.lines[0];
    expect(record.line.statement).toBe("Josh starts a new job");
    expect(JSON.stringify(record)).toContain("Ben starts a new job");
    expect((await page(w, ben)).shown).toEqual([]);
  });

  it("a line with no recorded words for the wrong person keeps its words when moved (an older line the backfill couldn't fill)", async () => {
    const w = await world();
    const [wifey, kaiya] = await contacts(w, "Wifey Liu", "Kaiya");
    const t = await tell(w, "Wifey has a new job.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, wifey.id), person_mention: "Wifey", statement: "Wifey has a new job", evidence: ["Wifey has a new job"], detail: { category: "work" } })],
    }));
    await done(w, t.id);
    const line = serverItems(w)[0];
    w.server.serverWrite("memory_items", line.id, A, { person_mentions: [] });
    await w.engine.sync();
    await w.understanding.correct(line.id, { person_id: kaiya.id });
    await w.engine.sync();
    expect(serverItems(w)[0]).toMatchObject({ person_id: kaiya.id, statement: "Wifey has a new job" });
  });
});

describe("J4: a memory is never dropped as 'nothing' because who or what it names couldn't be placed", () => {
  // The model's reading of 7 Oct: "Wifey" taken as the word "wife".
  const asWife = (person: string) => (): ModelProposal => ({
    needs_clarification: null,
    items: [item({ kind: "fact", person, person_mention: "Wifey", statement: "Your wife got a raise", evidence: ["Wifey got a raise"], detail: { category: "work" } })],
  });

  it("'Wifey got a raise' with Wifey known to nothing: 'Who is Wifey?'; answered Loo Loo, it's hers in the user's words, and later notes find her", async () => {
    const w = await world();
    const [loo] = await typed(w, "Loo Loo");
    const t = await tell(w, "Wifey got a raise.", asWife("new"));
    expect(t.review.mode).toBe("sheet");
    const [q] = t.review.questions;
    expect([q.prompt, q.about, q.choices.map((c) => c.label), q.skip.label])
      .toEqual(["Who is Wifey?", ["Wifey got a raise"], ["Add Wifey", "Someone already here"], "Don't keep this"]);
    await answer(w, t.id, [{ index: 0, person_id: loo.id }]);
    expect((await page(w, loo)).shown).toEqual(["Wifey got a raise"]);
    // Source keeps the note as told.
    expect((await noteFor(w.store, t.id, new Date(w.server.clock)))!.runs!.map((r) => r.text).join("")).toBe("Wifey got a raise.");

    // "Wifey" is now one of the words for her: the next note finds her, no question.
    const later = await tell(w, "Wifey got promoted.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, loo.id), person_mention: "Wifey", statement: "Wifey got promoted", evidence: ["Wifey got promoted"], detail: { category: "work" } })],
    }));
    expect(later.review.questions).toEqual([]);
    expect(later.review.lines.map((l) => [l.statement, l.person?.id])).toEqual([["Wifey got promoted", loo.id]]);
  });

  it("'Zed got a raise': 'Who is Zed?' → Add Zed: a new person Zed, with the line, never 'Nothing to remember'", async () => {
    const w = await world();
    await typed(w, "Loo Loo");
    const t = await tell(w, "Zed got a raise.", () => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: "new", person_mention: "Zed", statement: "Zed got a raise", evidence: ["Zed got a raise"], detail: { category: "work" } })],
    }));
    const [q] = t.review.questions;
    expect(q.prompt).toBe("Who is Zed?");
    const add = q.choices.find((c) => c.label === "Add Zed")!;
    await answer(w, t.id, [{ index: 0, ...("answer" in add ? add.answer : {}) }]);
    const zed = (await w.repos.people.list()).find((p) => p.display_name === "Zed")!;
    expect((await page(w, zed)).shown).toEqual(["Zed got a raise"]);
  });

  it("'Don't keep this' keeps nothing and says so, never 'Nothing to remember'", async () => {
    const w = await world();
    await typed(w, "Loo Loo");
    const t = await tell(w, "Wifey got a raise.", asWife("unknown"));
    await w.understanding.answer(t.id, [{ index: 0, skip: true }]);
    await w.understanding.run();
    const after = await review(w, t.id);
    expect([after.mode, after.status]).toEqual(["nothing", "Nothing kept from that one."]);
    expect(serverItems(w)).toEqual([]);
  });
});
