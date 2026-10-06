// Core trust closure: the founder's round-three notes (H-series), through the
// product's real code: the gateway's pipeline (planExtraction), the answer
// path (resolve.ts), the write rules, sync, Understanding, the review, the
// relationship page and What Kinship knows. Only the model's reply is written
// by hand. Each case first failed on the code before this pass.
import { earlierOf, noteFor, portraitFor, recordFor, todayIso } from "@/hooks/useV2";
import { buildReview, newcomersIn, type ReviewView } from "@/features/tell/reviewModel";
import { linkSuggestions } from "@/features/person/links";
import { voiced } from "@/features/memory/statements";
import { Gateway, type HeldAnswer } from "@/store/gateway";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { RemoteError } from "@/store/remote";
import type { MirroredTable } from "@/store/tables";
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
    earlier: await earlierOf(w.repos, await w.understanding.itemsFor(id, row.reading), row.reading?.held ?? []),
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

describe("core trust closure", () => {
  it("H28: Tyler's promise to you is Tyler's, labelled so, and 'Whose promise?' can change it without losing the source", async () => {
    const w = await world();
    const [tyler] = await people(w, "Tyler Shaffer");
    const note = "Tyler promised to send me his contractor's number Friday.";
    const { id, review: r } = await tell(w, note, (i) => ({
      items: [item({
        kind: "promise", person: key(i, "Tyler"), person_mention: "Tyler", subject: "user",
        statement: "Tyler promised to send you his contractor's number", evidence: ["Tyler promised to send me his contractor's number Friday"], date_text: "Friday",
      })],
      needs_clarification: null,
    }));
    const [line] = r.lines;
    expect(line.kind.label).toBe("Tyler's promise");
    expect(line.kind.owner).toEqual({ value: "person", name: "Tyler" });
    expect(line.statement).not.toMatch(/^You said you'd/);
    // Never under "You said you'd" on Tyler's page.
    expect((await page(w, tyler)).portrait.youSaid.map((l) => l.statement)).toEqual([]);

    // The user says it was theirs after all: the meaning changes, the note stays the source.
    await w.understanding.correct(line.id, { owner: "user" });
    await w.understanding.finish(id, "done");
    await w.understanding.run();
    const stored = serverItems(w).find((m) => m.id === line.id)!;
    expect([stored.kind, stored.subject_type, stored.user_state]).toEqual(["promise", "user", "edited"]);
    const kinds = sourcesOf(w, line.id).map((s) => s.source_kind).sort();
    expect(kinds).toEqual(["capture", "user_edit"]);
  });

  it("H12: once 'which Sam?' is answered, the other Sam's page never asks about it", async () => {
    const w = await world();
    const [eden, doughty] = await people(w, "Sam Eden", "Sam Doughty");
    const ask = (i: ExtractionInput, statement: string, extra: Partial<Over> = {}): ModelProposal => ({
      needs_clarification: { about: "person", mention: "Sam" },
      items: [item({ kind: "fact", person: key(i, "Sam Eden"), person_mention: "Sam", statement, evidence: [statement], confidence: 0.6, ...extra })],
    });
    const job = await tell(w, "Sam got the Stripe job!", (i) => ask(i, "Sam got the Stripe job", { detail: { category: "work" } }));
    await answer(w, job.id, [{ index: 0, person_id: eden.id }]);
    const wed = await tell(w, "Sam is married to Michelle.", (i) => ask(i, "Sam is married to Michelle"));
    await answer(w, wed.id, [{ index: 0, person_id: eden.id }]);
    const house = await tell(w, "Sam bought a house in Oakland.", (i) => ask(i, "Sam bought a house in Oakland"));
    await answer(w, house.id, [{ index: 0, person_id: doughty.id }]);

    const suggestionsFor = async (p: Person) => {
      const ppl = await w.repos.people.list();
      const items = ((await w.store.list("memory_items")) as MemoryItem[]).map((m) => voiced(m, ppl));
      return linkSuggestions({ person: p, people: ppl, items, related: await w.repos.people.related(), answered: new Set() })
        .map((s) => s.prompt);
    };
    expect(await suggestionsFor(doughty)).toEqual([]);
    expect(await suggestionsFor(eden)).toEqual([]);
    // Someone genuinely new to a memory is still asked about, once.
    const [michelle] = await people(w, "Michelle Lee");
    expect(await suggestionsFor(michelle)).toEqual(["Is this the Michelle in “Sam is married to Michelle”?"]);
  });

  it("H20: 'My daughter Kaiya and I…' files to the Kaiya you already have; a newcomer is added as 'Kaiya', your daughter", async () => {
    const w = await world();
    const [kaiya] = await people(w, "Kaiya");
    await w.store.update("people", kaiya.id, { relationship_label: "daughter" });
    await w.engine.sync();
    const note = "My daughter Kaiya and I are going to the zoo on Sunday.";
    const zoo = (i: ExtractionInput): ModelProposal => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: "new", person_mention: "My daughter Kaiya", subject: "shared",
        statement: "My daughter Kaiya and I are going to the zoo", evidence: ["My daughter Kaiya and I are going to the zoo on Sunday"],
        date_text: "Sunday", detail: { event_type: "other" } })],
    });
    const t = await tell(w, note, zoo);
    expect(t.review.questions).toEqual([]);
    expect(t.review.lines.map((l) => [l.statement, l.person?.label])).toEqual([["You and your daughter Kaiya are going to the zoo", "Kaiya"]]);
    expect((await w.repos.people.list()).map((p) => p.display_name)).toEqual(["Kaiya"]);

    // Someone not yet in People: "Add Kaiya", never "Add My daughter Kaiya".
    const w2 = await world();
    await people(w2, "Ben Oxnard");
    const t2 = await tell(w2, note, zoo);
    const [q] = t2.review.questions;
    expect(q.prompt).toBe("Is Kaiya someone new?");
    const add = q.choices.find((c) => c.label === "Add Kaiya")!;
    await answer(w2, t2.id, [{ index: 0, ...("answer" in add ? add.answer : {}) }]);
    const added = (await w2.repos.people.list()).find((p) => p.display_name !== "Ben Oxnard")!;
    expect([added.display_name, added.relationship_label]).toEqual(["Kaiya", "daughter"]);
  });

  it("H25: a sensitive 'no longer interviewing' confirmed by you replaces the old line, linked; one current truth; both sources stay", async () => {
    const w = await world();
    const [natalia] = await people(w, "Natalia Ruiz");
    const first = await tell(w, "Natalia is interviewing with Box", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "thread", person: key(i, "Natalia"), person_mention: "Natalia", statement: "Natalia is interviewing with Box",
        evidence: ["Natalia is interviewing with Box"], detail: { topic: "interviewing with Box" } })],
    }));
    await w.understanding.finish(first.id, "done");
    await w.understanding.run();
    // The model's actual reading (founder's data): a fact, money-sensitive, the model proposing "resolves".
    const second = await tell(w, "Natalia is no longer interviewing with Box because she got rejected", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Natalia"), person_mention: "Natalia", sensitivity: "money",
        statement: "Natalia is no longer interviewing with Box because she got rejected",
        evidence: ["Natalia is no longer interviewing with Box because she got rejected"], detail: { category: "work" },
        existing: { action: "resolves", target: i.dossier[0]?.key ?? null } })],
    }));
    // Held for the user's yes (personal), and it says what it replaces.
    // Held: nothing changes until the user's yes; the question says what a yes replaces.
    expect(second.review.lines).toEqual([]);
    expect(second.review.questions.map((q) => [q.type, q.replaces])).toEqual([["keep", "Natalia is interviewing with Box"]]);
    expect(serverItems(w).find((m) => m.statement === "Natalia is interviewing with Box")!.status).toBe("active");
    await answer(w, second.id, [{ index: 0, accept: true }]);

    const items = serverItems(w).filter((m) => m.person_id === natalia.id);
    const old = items.find((m) => m.statement === "Natalia is interviewing with Box")!;
    const now = items.find((m) => m.statement.startsWith("Natalia is no longer"))!;
    expect([old.status, now.status, now.supersedes_id]).toEqual(["superseded", "active", old.id]);
    const knows = await recordFor(w.repos, natalia.id, new Date(w.server.clock));
    expect(knows.lines.map((l) => [l.line.statement, l.line.replaces])).toEqual([
      ["Natalia is no longer interviewing with Box because she got rejected", "Natalia is interviewing with Box"],
    ]);
    // The first note still shows what came of it, marked as since updated.
    const src = await noteFor(w.store, first.id, new Date(w.server.clock));
    expect(src!.items.map((i) => [i.statement, i.updated ?? false])).toEqual([["Natalia is interviewing with Box", true]]);
  });

  it("H13: 'John and Ben went to Tahoe' then 'Ben and John went to Tahoe' is one shared memory, on both pages once", async () => {
    const w = await world();
    const [ben, john] = await people(w, "Ben Oxnard", "John Oxnard");
    const trip = (who: "Ben" | "John", statement: string) => (i: ExtractionInput): ModelProposal => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, who), person_mention: who, statement, evidence: [statement],
        date_direction: "past", detail: { event_type: "trip" } })],
    });
    const a = await tell(w, "John and Ben went to Tahoe.", trip("John", "John and Ben went to Tahoe"));
    await w.understanding.finish(a.id, "done");
    await w.understanding.run();
    const b = await tell(w, "Ben and John went to Tahoe.", trip("Ben", "Ben and John went to Tahoe"), ben);
    await w.understanding.finish(b.id, "done");
    await w.understanding.run();
    await w.engine.sync();
    const live = serverItems(w).filter((m) => /Tahoe/.test(m.statement) && m.status === "active" && !m.deleted_at);
    expect(live).toHaveLength(1);
    // Both notes are its sources.
    expect(sourcesOf(w, live[0].id).map((s) => s.capture_id).sort()).toEqual([a.id, b.id].sort());
    for (const p of [ben, john]) {
      const { knows } = await page(w, p);
      expect(knows.lines.filter((l) => /Tahoe/.test(l.line.statement))).toHaveLength(1);
    }
  });

  it("H21: 'Susan is getting married to Pedro' keeps Pedro: 'Add Pedro' adds him by name and the memory is about both", async () => {
    const w = await world();
    const [susan] = await people(w, "Susan Oxnard");
    const t = await tell(w, "Susan is getting married to Pedro in the fall", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, "Susan"), person_mention: "Susan", statement: "Susan is getting married to Pedro in the fall",
        evidence: ["Susan is getting married to Pedro in the fall"], date_text: "in the fall", detail: { event_type: "wedding" } })],
    }));
    const [line] = t.review.lines;
    expect(line.statement).toMatch(/Pedro/); // the name is kept on the memory before Pedro exists
    expect(line.newcomers).toEqual(["Pedro"]);
    await w.understanding.addParticipant(line.id, "Pedro");
    await w.understanding.finish(t.id, "done");
    await w.understanding.run();
    await w.engine.sync();
    const pedro = (await w.repos.people.list()).find((p) => p.display_name === "Pedro")!;
    expect(pedro).toBeTruthy();
    expect(serverItems(w).find((m) => m.id === line.id)!.with_person_ids).toEqual([pedro.id]);
    expect((await page(w, pedro)).knows.lines.map((l) => l.line.statement)).toEqual([line.statement]);
    expect((await page(w, susan)).knows.lines.map((l) => l.line.statement)).toEqual([line.statement]);
    // Never a place or a company.
    expect(newcomersIn("Natalia is interviewing with Box", "Natalia is interviewing with Box", [])).toEqual([]);
    expect(newcomersIn("Susan is moving to Oakland in August", "Susan is moving to Oakland in August", [])).toEqual([]);
  });

  it("H5: 'Anthony and Natalia are getting married', and 'Sam and Meesh are moving', are one memory on both pages", async () => {
    for (const [a, b, note, sa, sb] of [
      ["Anthony Lopez", "Natalia Ruiz", "Anthony and Natalia are getting married next summer", "Anthony and Natalia are getting married", "Natalia and Anthony are getting married"],
      ["Sam Eden", "Meesh Eden", "Sam and Meesh are moving to Australia", "Sam is moving to Australia with Meesh", "Meesh is moving to Australia with Sam"],
    ] as const) {
      const w = await world();
      const [pa, pb] = await people(w, a, b);
      // The model's actual reading in the founder's data: one line for each of them.
      const t = await tell(w, note, (i) => ({
        needs_clarification: null,
        items: [
          item({ kind: "event", person: key(i, a.split(" ")[0]), person_mention: a.split(" ")[0], statement: sa, evidence: [note], detail: { event_type: "other" } }),
          item({ kind: "event", person: key(i, b.split(" ")[0]), person_mention: b.split(" ")[0], statement: sb, evidence: [note], detail: { event_type: "other" } }),
        ],
      }));
      expect(t.review.lines).toHaveLength(1);
      await w.understanding.finish(t.id, "done");
      await w.understanding.run();
      for (const p of [pa, pb]) expect((await page(w, p)).knows.lines).toHaveLength(1);
      const [m] = serverItems(w).filter((x) => x.status === "active");
      expect([m.person_id, ...(m.with_person_ids ?? [])].sort()).toEqual([pa.id, pb.id].sort());
    }
  });

  it("H14: killed before a memory's source reaches the phone, the line says 'Source syncing…', then 'You told Kinship' — never source-less", async () => {
    // A phone whose sync is cut off after memories and before their sources.
    class CutOff extends FakeRemote {
      cut = false;
      async changedSince(name: MirroredTable, ...rest: Parameters<FakeRemote["changedSince"]> extends [MirroredTable, ...infer R] ? R : never) {
        if (this.cut && name === "memory_item_sources") throw new RemoteError("network", "the app was closed");
        return super.changedSince(name, ...rest);
      }
    }
    const w = await world();
    const remote = new CutOff(w.server, A);
    const engine = new SyncEngine(w.store, remote);
    const understanding = new Understanding(w.store, () => engine.sync(), new Gateway(w.gateway), { clock: () => w.server.clock });
    const [john] = await people(w, "John Oxnard");
    await engine.sync();
    w.gateway.propose("John is the second tallest in my family.", (i) => {
      // The note is understood and written; the phone is closed before its sources sync.
      remote.cut = true;
      return {
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "John"), person_mention: "John", statement: "John is the second tallest in your family",
        evidence: ["John is the second tallest in my family"], detail: { category: "family" } })],
      };
    });
    const c = await w.repos.captures.tell("John is the second tallest in my family.", { aiEnabled: true, timeZone: TZ });
    await understanding.told(c.id);
    await understanding.run();
    const before = await portraitFor(w.repos, john, new Date(w.server.clock));
    expect(before.lately.map((l) => [l.statement, l.provenance])).toEqual([["John is the second tallest in your family", "Source syncing…"]]);
    // Reopened, online: the source arrives.
    remote.cut = false;
    await engine.sync();
    const after = await portraitFor(w.repos, john, new Date(w.server.clock));
    expect(after.lately[0].provenance).toMatch(/^You told Kinship · /);
    expect(after.lately[0].noteId).toBe(c.id);
  });

  it("H30: editing a kept line is a correction: original Tell, earlier words, new words and when are all kept", async () => {
    const w = await world();
    const [ben] = await people(w, "Ben Oxnard");
    const t = await tell(w, "Ben is really happy about his promotion and is no longer nervous about managing people.", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Ben"), person_mention: "Ben",
        statement: "Ben is really happy about his promotion and is no longer nervous about managing people",
        evidence: ["Ben is really happy about his promotion and is no longer nervous about managing people"], detail: { category: "work" } })],
    }));
    await w.understanding.finish(t.id, "done");
    await w.understanding.run();
    const [line] = t.review.lines;
    await w.understanding.correct(line.id, { statement: "Ben is really not happy about his promotion but is no longer nervous about managing people" });
    await w.engine.sync();
    const sources = sourcesOf(w, line.id);
    expect(sources.map((s) => s.source_kind).sort()).toEqual(["capture", "user_edit"]); // the original Tell stays a source
    expect(sources.find((s) => s.source_kind === "user_edit")!.meta).toEqual({
      before: "Ben is really happy about his promotion and is no longer nervous about managing people",
    });
    const { knows } = await page(w, ben);
    const [r] = knows.lines;
    expect(r.line.statement).toBe("Ben is really not happy about his promotion but is no longer nervous about managing people");
    expect(r.line.editedFrom).toBe("Ben is really happy about his promotion and is no longer nervous about managing people");
    expect(r.provenance).toMatch(/^Edited by you · .* · from your note, /);
    expect(r.noteId).toBe(t.id); // the source opens the original note
  });

  it("H17: 'John and Ben are my brothers' when Kinship already knows: 'Already known', no duplicate fact", async () => {
    const w = await world();
    const [ben, john] = await people(w, "Ben Oxnard", "John Oxnard");
    for (const p of [ben, john]) await w.store.update("people", p.id, { relationship_label: "brother" });
    await w.engine.sync();
    const t = await tell(w, "John and Ben are my brothers.", (i) => ({
      needs_clarification: null,
      items: [
        item({ kind: "fact", person: key(i, "John"), person_mention: "John", statement: "John is your brother", evidence: ["John and Ben are my brothers"], detail: { category: "family" } }),
        item({ kind: "fact", person: key(i, "Ben"), person_mention: "Ben", statement: "Ben is your brother", evidence: ["John and Ben are my brothers"], detail: { category: "family" } }),
      ],
    }));
    expect(t.review.status).toBe("Already known: John is your brother; Ben is your brother.");
    expect(serverItems(w)).toEqual([]);
  });

  it("H23: 'not moving to Oakland anymore' reads as a change on Susan's page: was: the move", async () => {
    const w = await world();
    const [susan] = await people(w, "Susan Oxnard");
    const move = await tell(w, "Susan is moving to Oakland in August", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "event", person: key(i, "Susan"), person_mention: "Susan", statement: "Susan is moving to Oakland in August",
        evidence: ["Susan is moving to Oakland in August"], date_text: "in August", detail: { event_type: "move" } })],
    }));
    await w.understanding.finish(move.id, "done");
    await w.understanding.run();
    const off = await tell(w, "Susan is not moving to Oakland anymore", (i) => ({
      needs_clarification: null,
      items: [item({ kind: "fact", person: key(i, "Susan"), person_mention: "Susan", statement: "Susan is not moving to Oakland anymore",
        evidence: ["Susan is not moving to Oakland anymore"], detail: { category: "home" } })],
    }));
    expect(off.review.lines[0].replaces).toBe("Susan is moving to Oakland in August");
    await w.understanding.finish(off.id, "done");
    await w.understanding.run();
    const { portrait } = await page(w, susan);
    const shown = [...portrait.lately, ...portrait.comingUp];
    expect(shown.map((l) => [l.statement, l.was ?? null])).toEqual([["Susan is not moving to Oakland anymore", "Susan is moving to Oakland in August"]]);
  });
});
