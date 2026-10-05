// Trust proofs for the founder's native pass (F4, F5, F6): every memory on
// the right person, said as "you", correctable without losing where it came
// from. Each step runs the product's real code: the gateway's input builder
// and pipeline (planExtraction), the write rules, sync, Understanding, the
// review model, the relationship page (portraitFor), What Kinship knows
// (recordFor) and the Source view (noteFor). Only the model's reply is
// written by hand, in relationship_extract's exact output shape, and it is
// the reply that produced the founder's bug: the brother fact filed on Ben,
// in the prompt's internal "the writer" wording.
import { noteFor, portraitFor, recordFor, todayIso } from "@/hooks/useV2";
import { buildReview } from "@/features/tell/reviewModel";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-00000000a077";
const TZ = "America/Los_Angeles";
const NOTE = "Ben wants to play the new warhammer game with me and my brother John on weekends.";
const NO_DETAIL: ProposedDetail = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
const WRITER = /\bthe (writer|user|author)\b/i;

function item(over: Omit<Partial<ProposedItem>, "detail"> & Pick<ProposedItem, "kind" | "person" | "statement" | "evidence"> & { detail?: Partial<ProposedDetail> }): ProposedItem {
  return {
    person_mention: null, subject: "person", related_relation: null, related_name: null, certainty: "stated",
    sensitivity: "none", confidence: 0.92, date_text: null, date_direction: "unclear",
    existing: { action: "new", target: null }, ...over, detail: { ...NO_DETAIL, ...(over.detail ?? {}) },
  };
}

/** The reading that reached the founder's phone: both items filed on Ben, in "the writer" wording. */
function foundersReply(input: ExtractionInput): ModelProposal {
  const ben = input.roster.find((r) => r.display_name.startsWith("Ben"))!.key;
  return {
    needs_clarification: null,
    items: [
      item({
        kind: "plan", subject: "shared", person: ben, person_mention: "Ben", certainty: "wished", confidence: 0.8,
        statement: "Ben wants to play the new warhammer game with the writer and John on weekends",
        evidence: ["Ben wants to play the new warhammer game with me and my brother John on weekends"],
        detail: { firmness: "idea" },
      }),
      item({ kind: "fact", person: ben, person_mention: "Ben", statement: "John is the writer's brother", evidence: ["my brother John"], confidence: 0.9 }),
    ],
  };
}

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

async function person(w: World, name: string): Promise<Person> {
  const p = await w.repos.people.add({ display_name: name, full_name: name });
  await w.engine.sync();
  return p;
}

async function tell(w: World, reply: (i: ExtractionInput) => ModelProposal) {
  w.gateway.propose(NOTE, reply);
  const c = await w.repos.captures.tell(NOTE, { aiEnabled: true, timeZone: TZ });
  await w.understanding.told(c.id);
  await w.understanding.run();
  const row = (await w.understanding.get(c.id))!;
  const review = buildReview({
    row,
    capture: { id: c.id, raw_text: NOTE, context_person_id: null, status: String((await w.repos.captures.get(c.id))?.status) },
    items: await w.understanding.itemsFor(c.id, row.reading),
    people: await w.repos.people.list(),
    related: await w.repos.people.related(),
    offline: false,
    today: todayIso(new Date(w.server.clock)),
  });
  return { captureId: c.id, row, review };
}

const now = (w: World) => new Date(w.server.clock);

describe("the founder's note, through the real pipeline", () => {
  it("files the brother fact on John, says 'your', and leaves Ben's page with only what's about Ben", async () => {
    const w = await world();
    const ben = await person(w, "Ben Oxnard");
    const john = await person(w, "John Oxnard");
    await person(w, "Tyler Shaffer");
    const { captureId, row, review } = await tell(w, foundersReply);

    // The Kept card shows the move (never silently): John's line, John's name on it.
    expect(review.mode).toBe("card");
    const lines = review.lines.map((l) => [l.statement, l.person?.label]);
    expect(lines).toEqual(expect.arrayContaining([
      ["Ben wants to play the new warhammer game with you and John on weekends", "Ben Oxnard"],
      ["John is your brother", "John Oxnard"],
    ]));
    await w.understanding.finish(row.capture_id, "done");
    await w.understanding.run();
    await w.engine.sync();

    const benPage = await portraitFor(w.repos, ben, now(w));
    const johnPage = await portraitFor(w.repos, john, now(w));
    const shown = [...benPage.lately, ...benPage.comingUp, ...benPage.youSaid, ...benPage.between].map((l) => l.statement);
    expect(shown).toEqual(["Ben wants to play the new warhammer game with you and John on weekends"]);
    // The plan names John too, so it's one shared memory, on his page as well (stabilization Gate F).
    expect([...johnPage.lately, ...johnPage.comingUp].map((l) => l.statement)).toEqual([
      "John is your brother", "Ben wants to play the new warhammer game with you and John on weekends"]);

    // Nothing anywhere says "the writer": pages, records, the Source view, the stored rows.
    const benKnows = await recordFor(w.repos, ben.id, now(w));
    const johnKnows = await recordFor(w.repos, john.id, now(w));
    const source = (await noteFor(w.store, captureId, now(w)))!;
    const stored = [...w.server.table("memory_items").values()].map((m) => String(m.statement));
    for (const s of [...shown, ...benKnows.lines.map((l) => l.line.statement), ...johnKnows.lines.map((l) => l.line.statement), ...source.items.map((i) => i.statement), ...stored]) {
      expect(s).not.toMatch(WRITER);
    }
    // Both memories still point at the note, with the note's own words marked.
    expect(source.items.map((i) => [i.statement, i.person])).toEqual(expect.arrayContaining([["John is your brother", "John Oxnard"]]));
    expect(source.runs?.map((r) => r.text).join("")).toBe(NOTE);
  });

  it("when John isn't in People yet, nothing goes on Ben: the review asks to add John", async () => {
    const w = await world();
    const ben = await person(w, "Ben Oxnard");
    const { row, review } = await tell(w, foundersReply);
    const q = review.questions.find((x) => x.type === "new_person");
    expect(q?.choices.map((o) => o.label)).toContain("Add John");
    const benPage = await portraitFor(w.repos, ben, now(w));
    expect(benPage.lately.map((l) => l.statement)).not.toContain("John is your brother");

    // "Add John": John joins People with the fact on his page.
    const held = row.reading!.held.findIndex((h) => h.new_person_name === "John");
    await w.understanding.answer(row.capture_id, [{ index: held, new_person: true }]);
    await w.understanding.run();
    await w.engine.sync();
    const john = (await w.repos.people.list()).find((p) => p.display_name === "John")!;
    expect(john).toBeTruthy();
    const johnPage = await portraitFor(w.repos, john, now(w));
    expect(johnPage.lately.map((l) => l.statement)).toEqual(["John is your brother"]);
  });
});

describe("what's already stored from the founder build", () => {
  async function legacy() {
    const w = await world();
    const ben = await person(w, "Ben Oxnard");
    const john = await person(w, "John Oxnard");
    const c = await w.repos.captures.tell(NOTE, { aiEnabled: false, timeZone: TZ });
    // The row as the old gateway wrote it: about John, filed on Ben, in "the writer" wording.
    const it = await w.repos.memory.remember({ kind: "fact", person_id: ben.id, statement: "John is the writer's brother" }, { captureId: c.id, quote: "my brother John" });
    await w.engine.sync();
    return { w, ben, john, captureId: c.id, itemId: it.id };
  }

  it("is read as 'your', kept off Ben's page, and still listed in What Kinship knows for correcting", async () => {
    const { w, ben } = await legacy();
    const page = await portraitFor(w.repos, ben, now(w));
    expect([...page.lately, ...page.comingUp].map((l) => l.statement)).toEqual([]);
    const knows = await recordFor(w.repos, ben.id, now(w));
    expect(knows.lines.map((l) => [l.line.statement, l.line.person?.label])).toEqual([["John is your brother", "Ben Oxnard"]]);
  });

  it("moving it to John (Edit → person) puts it on John's page; its source stays the note", async () => {
    const { w, ben, john, captureId, itemId } = await legacy();
    await w.understanding.correct(itemId, { person_id: john.id });
    await w.engine.sync();
    expect((await recordFor(w.repos, ben.id, now(w))).lines).toHaveLength(0);
    const johnPage = await portraitFor(w.repos, john, now(w));
    expect(johnPage.lately.map((l) => l.statement)).toEqual(["John is your brother"]);
    const source = (await noteFor(w.store, captureId, now(w)))!;
    expect(source.items.map((i) => i.person)).toEqual(["John Oxnard"]);
  });

  it("editing the words corrects the memory and marks it edited; the note itself is never rewritten", async () => {
    const { w, john, captureId, itemId } = await legacy();
    await w.understanding.correct(itemId, { person_id: john.id });
    await w.understanding.correct(itemId, { statement: "John and Ben are your brothers" });
    await w.engine.sync();
    const row = w.server.table("memory_items").get(itemId)!;
    expect(row.statement).toBe("John and Ben are your brothers");
    expect(row.user_state).toBe("edited");
    const sources = [...w.server.table("memory_item_sources").values()].filter((s) => s.memory_item_id === itemId);
    expect(sources.map((s) => s.source_kind).sort()).toEqual(["capture", "user_edit", "user_edit"]);
    expect((await w.repos.captures.get(captureId))!.raw_text).toBe(NOTE);
    const knows = await recordFor(w.repos, john.id, now(w));
    expect(knows.lines[0].line.edited).toBe(true);
  });
});
