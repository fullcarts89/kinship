// Core trust closure: the founder's round-three notes (H-series), through the
// product's real code: the gateway's pipeline (planExtraction), the answer
// path (resolve.ts), the write rules, sync, Understanding, the review, the
// relationship page and What Kinship knows. Only the model's reply is written
// by hand. Each case first failed on the code before this pass.
import { portraitFor, recordFor, todayIso } from "@/hooks/useV2";
import { buildReview, type ReviewView } from "@/features/tell/reviewModel";
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
});
