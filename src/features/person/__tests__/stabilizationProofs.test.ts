// Native trust and memory stabilization: the founder's round-two notes,
// through the product's real code. Each Tell runs the gateway's input builder
// and pipeline (planExtraction), the answer path (resolve.ts), the write rules,
// sync, Understanding, the review, the relationship page (portraitFor) and
// What Kinship knows (recordFor). Only the model's reply is written by hand,
// in relationship_extract's exact shape, and where round two showed what the
// model actually said, that reply is used ("Writer told Michelle they'd…",
// "the writer and their daughter Kaiya", the knee as a second thread).
//
// For each: what was understood, who it's about, whether the user is "you",
// what is current, what was superseded, that the source remains, and what the
// relationship page shows.
import { portraitFor, recordFor, todayIso } from "@/hooks/useV2";
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

const A = "aaaaaaaa-0000-4000-8000-0000000000e2";
const TZ = "America/Los_Angeles";
const NO_DETAIL: ProposedDetail = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
const WRITER = /\b(the )?(writer|user|author|narrator)\b/i;

type Over = Omit<Partial<ProposedItem>, "detail"> & Pick<ProposedItem, "kind" | "person" | "statement" | "evidence"> & { detail?: Partial<ProposedDetail> };
function item(over: Over): ProposedItem {
  return {
    person_mention: null, subject: "person", related_relation: null, related_name: null, certainty: "stated",
    sensitivity: "none", confidence: 0.93, date_text: null, date_direction: "future",
    existing: { action: "new", target: null }, ...over, detail: { ...NO_DETAIL, ...(over.detail ?? {}) },
  };
}
const key = (input: ExtractionInput, name: string) => input.roster.find((r) => r.display_name.startsWith(name))!.key;

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

async function people(w: World, ...names: string[]): Promise<Person[]> {
  const out: Person[] = [];
  for (const name of names) out.push(await w.repos.people.add({ display_name: name, full_name: name }));
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
  return buildReview({
    row,
    capture: { id, raw_text: (await w.repos.captures.get(id))!.raw_text, context_person_id: null, status: String((await w.repos.captures.get(id))?.status) },
    items: await w.understanding.itemsFor(id, row.reading),
    people: ppl, related: await w.repos.people.related(), offline: false, today: todayIso(new Date(w.server.clock)),
  });
}

async function answer(w: World, id: string, answers: HeldAnswer[]) {
  await w.understanding.answer(id, answers);
  await w.understanding.run();
  await w.understanding.finish(id, "done");
  await w.understanding.run();
  await w.engine.sync();
}

async function page(w: World, p: Person) {
  const fresh = (await w.repos.people.list()).find((x) => x.id === p.id)!;
  const portrait = await portraitFor(w.repos, fresh, new Date(w.server.clock));
  const knows = await recordFor(w.repos, p.id, new Date(w.server.clock));
  const shown = [...portrait.lately, ...portrait.comingUp, ...portrait.youSaid, ...portrait.between].map((l) => l.statement);
  return { portrait, knows, shown, label: portrait.label };
}

const serverItems = (w: World) => [...w.server.table("memory_items").values()] as unknown as MemoryItem[];
const sourcesOf = (w: World, itemId: string) => [...w.server.table("memory_item_sources").values()].filter((s) => s.memory_item_id === itemId);

describe("round two, end to end", () => {
  it("7, 15: which Sam → Sam Eden; then 'got the Stripe job' updates his 'starting at Stripe', history kept", async () => {
    const w = await world();
    const [eden] = await people(w, "Sam Eden", "Sam Doughty");
    const sam = (i: ExtractionInput, statement: string, quote: string, extra: Partial<Over> = {}): ModelProposal => ({
      needs_clarification: { about: "person", mention: "Sam" },
      items: [item({ kind: "event", person: key(i, "Sam Eden"), person_mention: "Sam", statement, evidence: [quote], confidence: 0.6, ...extra })],
    });
    const first = await tell(w, "Sam is starting a new job at Stripe next week.", (i) =>
      sam(i, "Sam is starting a new job at Stripe next week", "Sam is starting a new job at Stripe next week",
        { date_text: "next week", detail: { event_type: "job_start" } }));
    expect(first.review.questions[0].prompt).toBe("Which Sam do you mean?");
    await answer(w, first.id, [{ index: 0, person_id: eden.id }]);

    const second = await tell(w, "Sam got the Stripe job!", (i) => ({
      ...sam(i, "Sam got the Stripe job", "Sam got the Stripe job"),
      items: [item({ kind: "fact", person: key(i, "Sam Eden"), person_mention: "Sam", statement: "Sam got the Stripe job", evidence: ["Sam got the Stripe job"], confidence: 0.6, detail: { category: "work" } })],
    }));
    expect(second.review.questions[0].prompt).toBe("Which Sam do you mean?");
    await answer(w, second.id, [{ index: 0, person_id: eden.id }]);

    const { shown, knows } = await page(w, eden);
    expect(shown).toEqual(["Sam got the Stripe job"]); // current: one line, no contradiction
    const old = serverItems(w).find((m) => m.statement.startsWith("Sam is starting"))!;
    expect(old.status).toBe("superseded"); // history kept
    expect(sourcesOf(w, old.id)).toHaveLength(1); // its source too
    const now = serverItems(w).find((m) => m.statement === "Sam got the Stripe job")!;
    expect([now.supersedes_id, (now.detail as Record<string, unknown>).transition]).toEqual([old.id, "completed"]);
    // "next week" was kept as a date, not words that go stale.
    expect(knows.lines[0].line.replaces).toBe("Sam is starting a new job at Stripe");
  });

  it("8, 9: 'Ben is my brother' and 'Ben and John are my brothers': kept without a question; what they are to you, on each", async () => {
    const w = await world();
    const [ben, john] = await people(w, "Ben Oxnard", "John Oxnard");
    const one = await tell(w, "Ben is my brother.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Ben"), person_mention: "Ben", statement: "Ben is your brother", evidence: ["Ben is my brother"], detail: { category: "family" } })],
    }));
    expect([one.review.mode, one.review.questions]).toEqual(["card", []]);
    const two = await tell(w, "Ben and John are my brothers.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "John"), person_mention: "John", statement: "Ben and John are your brothers", evidence: ["Ben and John are my brothers"], detail: { category: "family" } })],
    }));
    expect(two.review.mode).toBe("card");
    expect((await page(w, ben)).label).toBe("brother");
    expect((await page(w, john)).label).toBe("brother");
    // One memory, on both.
    expect((await page(w, ben)).shown).toContain("Ben and John are your brothers");
    expect((await page(w, john)).shown).toContain("Ben and John are your brothers");
    expect(serverItems(w).filter((m) => m.statement === "Ben and John are your brothers")).toHaveLength(1);
  });

  it("10, 11: a shared trip on both pages, no question; 'He wants to go back' asks Ben, John or Both, quoting the sentence", async () => {
    const w = await world();
    const [ben, john] = await people(w, "Ben Oxnard", "John Oxnard");
    const note = "Ben and John went to Tahoe. He wants to go back in December.";
    const t = await tell(w, note, (i) => ({
      needs_clarification: { about: "person", mention: "He" },
      items: [
        item({ kind: "moment", person: key(i, "Ben"), person_mention: "Ben", statement: "Ben and John went to Tahoe", evidence: ["Ben and John went to Tahoe"] }),
        item({ kind: "plan", person: key(i, "John"), person_mention: "He", statement: "He wants to go back to Tahoe in December", evidence: ["He wants to go back in December"], date_text: "in December", confidence: 0.55, detail: { firmness: "idea" } }),
      ],
    }));
    const [q] = t.review.questions;
    expect(q.prompt).toBe("Who is “he”?");
    expect(q.about).toEqual(["He wants to go back in December"]);
    expect(q.choices.map((c) => c.label)).toEqual(["Ben Oxnard", "John Oxnard", "Both", "Someone else"]);
    const both = q.choices.find((c) => c.key === "both")!;
    await answer(w, t.id, [{ index: 0, ...("answer" in both ? both.answer : {}) }]);
    for (const p of [ben, john]) {
      const { shown } = await page(w, p);
      expect(shown).toEqual(expect.arrayContaining(["Ben and John went to Tahoe", "Ben and John want to go back to Tahoe in December"]));
    }
  });

  it("12: 'my daughter Kaiya': Add Kaiya, as your daughter; the tradition reads as yours, never 'their'", async () => {
    const w = await world();
    await people(w, "Ben Oxnard");
    const note = "Every Christmas, my daughter Kaiya and I watch Spirited Away.";
    const t = await tell(w, note, () => ({
      needs_clarification: null,
      items: [item({ kind: "tradition", person: "", person_mention: null, subject: "shared",
        statement: "The writer and their daughter Kaiya watch Spirited Away every Christmas",
        evidence: ["Every Christmas, my daughter Kaiya and I watch Spirited Away"], confidence: 0.9,
        detail: { recurrence: "yearly", anchor: "Christmas" } })],
    }));
    const [q] = t.review.questions;
    expect(q.reason).toBe("Kaiya isn't in your people yet.");
    const add = q.choices.find((c) => c.label === "Add Kaiya")!;
    expect(q.about[0]).not.toMatch(WRITER);
    expect(q.about[0]).toBe("You and your daughter Kaiya watch Spirited Away every Christmas");
    await answer(w, t.id, [{ index: 0, ...("answer" in add ? add.answer : {}) }]);
    const kaiya = (await w.repos.people.list()).find((p) => p.display_name === "Kaiya")!;
    const { shown, label } = await page(w, kaiya);
    expect(label).toBe("daughter");
    expect(shown).toEqual(["You and your daughter Kaiya watch Spirited Away every Christmas"]);
  });

  it("13: Michelle's sister Ana had a baby: about Ana, said with her name, on Michelle's page", async () => {
    const w = await world();
    const [michelle] = await people(w, "Michelle Lee");
    await tell(w, "Michelle's sister Ana just had a baby.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, "Michelle"), person_mention: "Michelle", subject: "related", related_relation: "sister", related_name: "Ana",
        statement: "Michelle's sister Ana just had a baby", evidence: ["Michelle's sister Ana just had a baby"], date_text: "just", date_direction: "past", detail: { event_type: "birth" } })],
    }));
    await w.engine.sync();
    const stored = serverItems(w).find((m) => m.statement.includes("Ana"))!;
    expect([stored.subject_type, stored.statement]).toEqual(["related", "Michelle's sister Ana just had a baby"]);
    const { knows } = await page(w, michelle);
    expect(knows.lines[0].line.about).toBe("Ana (Michelle Lee's sister)");
  });

  it("14: the knee: bothering → getting better → better: one current line, the earlier ones history", async () => {
    const w = await world();
    const [john] = await people(w, "John Oxnard");
    const say = (note: string, statement: string, kind: "thread" | "fact", certainty: "stated" | "reported" = "stated") =>
      tell(w, note, (i) => ({
        needs_clarification: null,
        items: [item({ kind, person: key(i, "John"), person_mention: "John", statement, evidence: [note.replace(/\.$/, "")], certainty,
          detail: kind === "thread" ? { topic: "knee" } : { category: "health" } })],
      }));
    await say("John's knee has been bothering him.", "John's knee has been bothering him", "thread");
    await say("John said his knee is getting better.", "John said his knee is getting better", "thread", "reported");
    await say("John's knee is better now.", "John's knee is better now", "fact");
    await w.engine.sync();
    const { shown } = await page(w, john);
    expect(shown.filter((s) => /knee/.test(s))).toEqual(["John's knee is better now"]);
    const statuses = Object.fromEntries(serverItems(w).map((m) => [m.statement, m.status]));
    expect(statuses).toEqual({
      "John's knee has been bothering him": "superseded",
      "John said his knee is getting better": "resolved",
      "John's knee is better now": "active",
    });
  });

  it("16: planning to move → not moving anymore: the plan is closed; never both as current", async () => {
    const w = await world();
    const [susan] = await people(w, "Susan Oxnard");
    await tell(w, "Susan is planning on moving to Alameda next summer.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, "Susan"), person_mention: "Susan", statement: "Susan is planning on moving to Alameda next summer",
        evidence: ["Susan is planning on moving to Alameda next summer"], certainty: "planned", date_text: "next summer", detail: { event_type: "move" } })],
    }));
    await tell(w, "Susan is not moving to Alameda anymore.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Susan"), person_mention: "Susan", statement: "Susan is not moving to Alameda anymore",
        evidence: ["Susan is not moving to Alameda anymore"], detail: { category: "home" } })],
    }));
    await w.engine.sync();
    const { shown, knows } = await page(w, susan);
    expect(shown).toEqual(["Susan is not moving to Alameda anymore"]);
    expect(knows.lines.map((l) => l.line.statement)).toEqual(["Susan is not moving to Alameda anymore"]);
    expect(knows.lines[0].line.replaces).toMatch(/^Susan is planning on moving to Alameda/);
  });

  it("17, 18: your promise reads as your to-do; Tyler's promise to you is his, coming up, never 'You said you'd'", async () => {
    const w = await world();
    const [michelle, tyler] = await people(w, "Michelle Lee", "Tyler Shaffer");
    await tell(w, "I told Michelle I'd send her that restaurant.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "promise", person: key(i, "Michelle"), person_mention: "Michelle", subject: "user",
        statement: "Writer told Michelle they'd send her that restaurant", evidence: ["I told Michelle I'd send her that restaurant"] })],
    }));
    await tell(w, "Tyler said he'd send me his contractor's number on Wednesday.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "thread", person: key(i, "Tyler"), person_mention: "Tyler",
        statement: "Tyler said he'd send you his contractor's number on Wednesday", evidence: ["Tyler said he'd send me his contractor's number on Wednesday"],
        date_text: "Wednesday", detail: { topic: "contractor's number" } })],
    }));
    await w.engine.sync();
    const m = await page(w, michelle);
    expect(m.portrait.youSaid.map((l) => l.statement)).toEqual(["Send Michelle that restaurant"]);
    for (const s of serverItems(w).map((x) => x.statement)) expect(s).not.toMatch(WRITER);
    const t = await page(w, tyler);
    expect(t.portrait.youSaid).toEqual([]);
    expect(t.portrait.comingUp.map((l) => l.statement)).toEqual(["Tyler said he'd send you his contractor's number"]);
    expect(t.portrait.comingUp[0].when).toMatch(/Oct 7/);
  });

  it("21: a pet's vet visit is kept without a question; 'Amanda and I watch every Warriors playoff game' is kept", async () => {
    const w = await world();
    const [ben, amanda] = await people(w, "Ben Oxnard", "Amanda Rose-Shaffer");
    const vet = await tell(w, "Ben's dog Mochi has a vet appointment on Friday.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, "Ben"), person_mention: "Ben", statement: "Ben's dog Mochi has a vet appointment on Friday",
        evidence: ["Ben's dog Mochi has a vet appointment on Friday"], sensitivity: "health", date_text: "Friday", detail: { event_type: "medical" } })],
    }));
    expect([vet.review.mode, vet.review.questions]).toEqual(["card", []]);
    const game = await tell(w, "Amanda and I watch every Warriors playoff game together.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "tradition", person: key(i, "Amanda"), person_mention: "Amanda", subject: "shared",
        statement: "You and Amanda watch every Warriors playoff game together", evidence: ["Amanda and I watch every Warriors playoff game together"],
        detail: { recurrence: "yearly", anchor: "Warriors playoffs" } })],
    }));
    expect(game.review.mode).not.toBe("nothing");
    await w.engine.sync();
    expect((await page(w, amanda)).shown).toContain("You and Amanda watch every Warriors playoff game together");
    expect((await page(w, ben)).shown.some((s) => /Mochi/.test(s))).toBe(true);
  });
});
