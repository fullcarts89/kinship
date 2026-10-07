// Gate 0, Final Trust Closure: the founder's round-four notes (I-series,
// CC-18), through the product's real code: the gateway's pipeline
// (planExtraction), the answer path (resolve.ts), the write rules, sync,
// Understanding, the review, the relationship page and What Kinship knows.
// Only the model's reply is written by hand. Each case first failed on the
// code before this pass.
import { earlierOf, noteFor, portraitFor, recordFor, todayIso } from "@/hooks/useV2";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";
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

const A = "aaaaaaaa-0000-4000-8000-0000000000e4";
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

/** The review as the app builds it (useReview): items read the way the user reads them. */
async function review(w: World, id: string): Promise<ReviewView> {
  const row = (await w.understanding.get(id))!;
  const ppl = await w.repos.people.list();
  const items = (await w.understanding.itemsFor(id, row.reading)).map((m) => voiced(m, ppl));
  return buildReview({
    row,
    capture: { id, raw_text: (await w.repos.captures.get(id))!.raw_text, context_person_id: null, status: String((await w.repos.captures.get(id))?.status), feedback: (await w.repos.captures.get(id))?.feedback },
    items,
    earlier: await earlierOf(w.repos, items, row.reading?.held ?? []),
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

describe("Gate 0", () => {
  it("I10 (+H13): 'Michelle and Sam might be moving to Australia' with two Sams: one line on Michelle, one 'Which Sam?' that never offers Michelle, and the answer adds that Sam to the same memory", async () => {
    const w = await world();
    const [michelle, samEden, samD] = await people(w, "Michelle Lee", "Sam Eden", "Sam Doughty");
    const note = "Michelle and Sam might be moving to Australia.";
    const quote = "Michelle and Sam might be moving to Australia";
    // The model's actual reading in the founder's screenshot: one line for each of them.
    const t = await tell(w, note, (i) => ({
      needs_clarification: null,
      items: [
        item({ kind: "thread", person: key(i, "Michelle"), person_mention: "Michelle", statement: "Michelle might be moving to Australia with Sam",
          evidence: [quote], certainty: "tentative", detail: { topic: "moving to Australia" } }),
        item({ kind: "thread", person: key(i, "Sam Eden"), person_mention: "Sam", statement: "Sam might be moving to Australia with Michelle",
          evidence: [quote], certainty: "tentative", detail: { topic: "moving to Australia" } }),
      ],
    }));
    // One line, kept on Michelle.
    expect(t.review.lines.map((l) => l.statement)).toEqual(["Michelle might be moving to Australia with Sam"]);
    // One question: which Sam. Never Michelle, never "I couldn't tell who".
    expect(t.review.questions).toHaveLength(1);
    const q = t.review.questions[0];
    expect(q.prompt).toBe("Which Sam do you mean?");
    expect(q.reason).toBe("You have more than one Sam.");
    expect(q.choices.map((c) => c.label)).not.toContain("Michelle Lee");
    expect(q.choices.filter((c) => "answer" in c && c.answer.person_id).map((c) => c.label).sort()).toEqual(["Sam Doughty", "Sam Eden"]);
    // What it shows is the note's own words, not a second memory.
    expect(q.about).toEqual([quote]);

    await answer(w, t.id, [{ index: 0, person_id: samEden.id }]);
    const active = serverItems(w).filter((m) => m.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0].person_id).toBe(michelle.id);
    expect(active[0].with_person_ids).toEqual([samEden.id]);
    for (const p of [michelle, samEden]) expect((await page(w, p)).knows.lines).toHaveLength(1);
    expect((await page(w, samD)).knows.lines).toHaveLength(0);
  });

  it("I13: moving 'Wifey has a new job…' from Wifey to Kaiya reads 'Kaiya has a new job…', keeps 'was: Wifey has…' as history, and the note is untouched", async () => {
    const w = await world();
    const [wifey] = await people(w, "Wifey Liu");
    const kaiya = await w.repos.people.add({ display_name: "Kaiya", relationship_label: "daughter" });
    await w.engine.sync();
    const note = "Wifey has a new job she's really excited about.";
    const said = "Wifey has a new job she's really excited about";
    const t = await tell(w, note, (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Wifey"), person_mention: "Wifey", statement: said, evidence: [said], detail: { category: "work" } })],
    }));
    const [line] = t.review.lines;
    await w.understanding.correct(line.id, { person_id: kaiya.id });
    await w.understanding.run();
    await w.engine.sync();

    const row = w.server.table("memory_items").get(line.id)!;
    expect(row).toMatchObject({ person_id: kaiya.id, statement: "Kaiya has a new job she's really excited about", user_state: "edited" });
    const k = await page(w, kaiya);
    expect(k.shown).toContain("Kaiya has a new job she's really excited about");
    expect(k.knows.lines[0].line.editedFrom).toBe(said);
    expect((await page(w, wifey)).knows.lines).toHaveLength(0);
    // The note itself is never rewritten.
    expect((await w.repos.captures.get(t.id))!.raw_text).toBe(note);
  });

  it("I13: the wrong person's name is moved where they are the subject: 'Ben's new job', 'Ben and Sarah went…'", async () => {
    const w = await world();
    const [ben, josh] = await people(w, "Ben Oxnard", "Josh Patel");
    const cases: { note: string; said: string; from: Person; to: Person; expect: string }[] = [
      { note: "Ben's new job starts Monday.", said: "Ben's new job starts Monday", from: ben, to: josh, expect: "Josh's new job starts Monday" },
      { note: "Ben and Sarah went to Tahoe.", said: "Ben and Sarah went to Tahoe", from: ben, to: josh, expect: "Josh and Sarah went to Tahoe" },
    ];
    for (const c of cases) {
      const fromKey = c.from.display_name.split(" ")[0];
      const t = await tell(w, c.note, (i) => ({
        needs_clarification: null,
        items: [item({ kind: "fact", person: key(i, fromKey), person_mention: fromKey, statement: c.said, evidence: [c.said], detail: { category: "other" } })],
      }));
      const [line] = t.review.lines;
      await w.understanding.finish(t.id, "done");
      await w.understanding.correct(line.id, { person_id: c.to.id });
      await w.engine.sync();
      expect(w.server.table("memory_items").get(line.id)).toMatchObject({ person_id: c.to.id, statement: c.expect });
    }
  });

  it("I12 (option A): after renaming Wifey Liu → Cutie Pie, her lines show 'Cutie Pie' wherever 'Wifey' was written; Source keeps the note's words; titles use the whole chosen name", async () => {
    const w = await world();
    const [wifey, ben] = await people(w, "Wifey Liu", "Ben Oxnard");
    const note = "Wifey has a new job she's really excited about. Wifey got promoted Monday.";
    const t = await tell(w, note, (i) => ({
      needs_clarification: null,
      items: [
        item({ kind: "fact", person: key(i, "Wifey"), person_mention: "Wifey", statement: "Wifey has a new job she's really excited about",
          evidence: ["Wifey has a new job she's really excited about"], detail: { category: "work" } }),
        item({ kind: "fact", person: key(i, "Wifey"), person_mention: "Wifey", statement: "Wifey's promotion was Monday",
          evidence: ["Wifey got promoted Monday"], detail: { category: "work" } }),
      ],
    }));
    await w.understanding.finish(t.id, "done");
    await w.understanding.run();
    expect(shortName((await w.repos.people.get(wifey.id))!)).toBe("Wifey");

    await w.repos.people.rename(wifey.id, "Cutie Pie");
    await w.engine.sync();
    const renamed = w.server.table("people").get(wifey.id)!;
    // The earlier full name, and the short name her lines actually used: other names she goes by.
    expect(renamed).toMatchObject({ display_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"] });
    expect(shortName((await w.repos.people.get(wifey.id))!)).toBe("Cutie Pie");

    const p = await page(w, wifey);
    expect(p.shown.sort()).toEqual(["Cutie Pie has a new job she's really excited about", "Cutie Pie's promotion was Monday"]);
    expect(p.knows.lines.map((l) => l.line.statement).sort()).toEqual(["Cutie Pie has a new job she's really excited about", "Cutie Pie's promotion was Monday"]);
    // Nothing stored was rewritten, and Source keeps the note's own words.
    expect(serverItems(w).map((m) => m.statement).sort()).toEqual(["Wifey has a new job she's really excited about", "Wifey's promotion was Monday"]);
    const source = (await noteFor(w.store, t.id, new Date(w.server.clock)))!;
    expect(source.runs!.map((r) => r.text).join("")).toBe(note);
    // Someone else's memory is never renamed.
    expect((await page(w, ben)).knows.lines).toHaveLength(0);
  });

  it("I12: a later note that still says 'Wifey' finds Cutie Pie, and shows her current name", async () => {
    const w = await world();
    const [wifey] = await people(w, "Wifey Liu");
    const first = await tell(w, "Wifey has a new job.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Wifey"), person_mention: "Wifey", statement: "Wifey has a new job", evidence: ["Wifey has a new job"], detail: { category: "work" } })],
    }));
    await w.understanding.finish(first.id, "done");
    await w.understanding.run();
    await w.repos.people.rename(wifey.id, "Cutie Pie");
    await w.engine.sync();
    const later = await tell(w, "Wifey got a raise.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: i.roster.find((r) => r.id === wifey.id)?.key ?? "unknown", person_mention: "Wifey",
        statement: "Wifey got a raise", evidence: ["Wifey got a raise"], detail: { category: "work" } })],
    }));
    expect(later.review.lines.map((l) => [l.statement, l.person?.id])).toEqual([["Cutie Pie got a raise", wifey.id]]);
  });

  it("I11: correcting who 'Susan and Michelle went to Disneyland' is about to both makes one shared memory, on both pages once", async () => {
    const w = await world();
    const [susan] = await people(w, "Susan Oxnard");
    const said = "Susan and Michelle went to Disneyland";
    // Told before Michelle was in People: kept on Susan alone.
    const t = await tell(w, `${said}.`, (i) => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, "Susan"), person_mention: "Susan", statement: said, evidence: [said], date_direction: "past", detail: { event_type: "trip" } })],
    }));
    await w.understanding.finish(t.id, "done");
    const [line] = t.review.lines;
    const [michelle] = await people(w, "Michelle Lee");
    expect(w.server.table("memory_items").get(line.id)).toMatchObject({ person_id: susan.id, with_person_ids: [] });
    // Now its words name two people in People: the correction offers both.
    expect((await page(w, susan)).knows.lines[0].line.named).toEqual([susan.id, michelle.id]);
    await w.understanding.correct(line.id, { person_ids: [susan.id, michelle.id] });
    await w.understanding.run();
    await w.engine.sync();
    expect(w.server.table("memory_items").get(line.id)).toMatchObject({ person_id: susan.id, with_person_ids: [michelle.id], statement: said });
    for (const p of [susan, michelle]) expect((await page(w, p)).knows.lines.map((l) => l.line.statement)).toEqual([said]);
  });
});
