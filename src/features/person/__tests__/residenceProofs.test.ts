// Phase 4B B3 (residence semantics), through the product's real code: the
// gateway's pipeline with residence.ts and relate.ts, its answer path, the
// write rules, sync, Understanding and the review. Only the model's reply is
// written by hand, and the place data is a few of the real rows. Undo's
// exact restore and the edited-line rule run in the database (pgTAP 68, 69)
// and through the acceptance harness.
import { voiced } from "@/features/memory/statements";
import { answersFor, buildReview, type ReviewView } from "@/features/tell/reviewModel";
import { earlierOf, portraitFor, recordFor, todayIso } from "@/hooks/useV2";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { testPlaces } from "@/test-utils/places";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ExtractionInput, ModelProposal, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-0000000000b3";
const TZ = "America/Los_Angeles";

let worlds = 0;
async function world() {
  const w = ++worlds;
  let n = 0;
  const newId = () => `${String(w).padStart(8, "0")}-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  gateway.places = testPlaces();
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { now: () => new Date(server.clock).toISOString(), newId });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway), { clock: () => server.clock });
  const repos = repositoriesFor(store);
  const susan = await repos.people.add({ display_name: "Susan" });
  await engine.sync();
  return { server, gateway, store, engine, understanding, repos, susan };
}
type World = Awaited<ReturnType<typeof world>>;

/** The model's reply for a note about where Susan lives, as a correct model would phrase it. */
const home = (w: World, statement: string, existing: ProposedItem["existing"] = { action: "new", target: null }) =>
  (i: ExtractionInput): ModelProposal => ({
    needs_clarification: null,
    items: [{
      kind: "fact", person: i.roster.find((r) => r.id === w.susan.id)!.key, person_mention: "Susan", subject: "person",
      related_relation: null, related_name: null, statement, evidence: [statement], certainty: "stated", sensitivity: "none",
      confidence: 0.95, date_text: null, date_direction: "past",
      detail: {
        event_type: null, event_goal: null, category: "home", attribute: null, value: null, firmness: null, topic: null, place: null,
        milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
      },
      existing,
    }],
  });

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
    row, capture: { id, raw_text: capture!.raw_text, context_person_id: null, status: String(capture?.status) }, items,
    earlier: await earlierOf(w.repos, items, row.reading?.held ?? []), people: ppl, related: await w.repos.people.related(),
    offline: false, today: todayIso(new Date(w.server.clock)),
  });
}

async function done(w: World, id: string) {
  await w.understanding.finish(id, "done");
  await w.understanding.run();
  await w.engine.sync();
}

async function pick(w: World, id: string, label: string) {
  const v = await review(w, id);
  const [q] = v.questions;
  const c = q.choices.find((x) => x.label === label)!;
  await w.understanding.answer(id, answersFor([q], { [q.key]: "answer" in c ? c.answer : "skip" })!);
  await w.understanding.run();
  await done(w, id);
}

/** Susan's lines on the phone: current, and replaced. */
async function lines(w: World) {
  const items = ((await w.store.list("memory_items")) as MemoryItem[]).filter((m) => m.person_id === w.susan.id);
  return {
    current: items.filter((m) => m.status === "active").map((m) => m.statement).sort(),
    replaced: items.filter((m) => m.status === "superseded").map((m) => m.statement).sort(),
    facets: ((await w.store.list("memory_item_facets")) as { value_text: string }[]).map((f) => f.value_text).sort(),
  };
}

describe("B3: residence semantics through the app", () => {
  it("California, then Alameda: both kept, nothing replaced (case A); the Portrait says the head once (B7)", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    const t = await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"));
    expect(t.review.mode).toBe("card");
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan lives in Alameda", []]]);
    await done(w, t.id);
    expect(await lines(w)).toEqual({ current: ["Susan lives in Alameda", "Susan lives in California"], replaced: [], facets: ["Alameda", "California"] });
    const fresh = (await w.repos.people.list()).find((p) => p.id === w.susan.id) as Person;
    const portrait = await portraitFor(w.repos, fresh, new Date(w.server.clock));
    // The Portrait shows the chain once, as the head's own words (B7, brief §13); both lines stay in What Kinship knows.
    expect(portrait.lately.map((l) => l.statement)).toEqual(["Susan lives in Alameda"]);
  });

  it("Alameda, then 'moved to Colorado': the Kept card says what it replaces (case C)", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to Colorado.", home(w, "Susan moved to Colorado"));
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan moved to Colorado", ["Susan lives in Alameda"]]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan moved to Colorado"], replaced: ["Susan lives in Alameda"] });
    const closer = [...w.server.table("memory_items").values()].find((m) => m.statement === "Susan moved to Colorado")!;
    expect((closer.detail as Record<string, unknown>).transition).toBe("changed");
  });

  it("Alameda, then 'moved to California': one question; 'Susan moved' replaces Alameda (case E)", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to California.", home(w, "Susan moved to California"));
    expect(t.review.mode).toBe("sheet");
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label), q.skip.label]))
      .toEqual([["Is Susan still in Alameda?", ["Still there", "Susan moved"], "Don't keep this"]]);
    expect((await lines(w)).current).toEqual(["Susan lives in Alameda"]);
    await pick(w, t.id, "Susan moved");
    expect(await lines(w)).toMatchObject({ current: ["Susan moved to California"], replaced: ["Susan lives in Alameda"] });
    const closer = [...w.server.table("memory_items").values()].find((m) => m.statement === "Susan moved to California")!;
    expect((closer.detail as Record<string, unknown>).transition).toBe("changed");
  });

  it("'Still there' keeps both, and nothing is replaced", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to California.", home(w, "Susan moved to California"));
    await pick(w, t.id, "Still there");
    expect(await lines(w)).toEqual({
      current: ["Susan lives in Alameda", "Susan moved to California"], replaced: [], facets: ["Alameda", "California"],
    });
  });

  it("Don't keep this: the note stays, nothing about Susan changes", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to California.", home(w, "Susan moved to California"));
    const [q] = t.review.questions;
    await w.understanding.answer(t.id, answersFor([q], { [q.key]: "skip" })!);
    await w.understanding.run();
    await done(w, t.id);
    expect(await lines(w)).toEqual({ current: ["Susan lives in Alameda"], replaced: [], facets: ["Alameda"] });
    expect(await w.repos.captures.get(t.id)).toBeTruthy();
  });

  it("the B2 finding: 'Pilsen' after 'lives in Illinois' never replaces Illinois, whatever the model says", async () => {
    const w = await world();
    const ill = await tell(w, "Susan lives in Illinois.", home(w, "Susan lives in Illinois"));
    await done(w, ill.id);
    const illinois = [...w.server.table("memory_items").values()].find((m) => m.statement === "Susan lives in Illinois")!;
    const t = await tell(w, "Susan lives in Pilsen.", (i) => home(w, "Susan lives in Pilsen", {
      action: "supersede", target: i.dossier.find((d) => d.id === illinois.id)?.key ?? null,
    })(i));
    expect(t.review.lines.map((l) => l.replaces)).toEqual([[]]);
    await done(w, t.id);
    expect((await lines(w)).current).toEqual(["Susan lives in Illinois", "Susan lives in Pilsen"]);
  });

  it("a stay is a line of its own, never where Susan lives (case F)", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    await done(w, (await tell(w, "Susan is staying in Denver this week.", home(w, "Susan is staying in Denver this week"))).id);
    expect(await lines(w)).toEqual({
      current: ["Susan is staying in Denver this week", "Susan lives in Alameda"], replaced: [], facets: ["Alameda"],
    });
  });
});

describe("N13: a line the user edited is read again (brief §5)", () => {
  /** "Susan lives in California", edited by the user in What Kinship knows to "Susan lives in Alameda". */
  async function edited(w: World, opts: { reported?: boolean } = {}) {
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    const line = ((await w.store.list("memory_items")) as MemoryItem[]).find((m) => m.statement === "Susan lives in California")!;
    // Unreported: the gateway refuses the report (it is best effort, never retried).
    if (opts.reported === false) w.gateway.failNext = { status: 503, error: "try_later" };
    await w.understanding.correct(line.id, { statement: "Susan lives in Alameda" });
    await w.understanding.run();
    await w.engine.sync();
    if (opts.reported === false) expect(w.gateway.calls.at(-1)).toBe("rederive");
    return line.id;
  }

  it("edit California → Alameda: the app reports it, and the reading is Alameda (provenance kept)", async () => {
    const w = await world();
    const id = await edited(w);
    expect(w.gateway.rereads).toEqual([id]);
    expect(await lines(w)).toEqual({ current: ["Susan lives in Alameda"], replaced: [], facets: ["Alameda"] });
    const row = w.server.table("memory_items").get(id)!;
    expect(row.user_state).toBe("edited");
    const sources = [...w.server.table("memory_item_sources").values()].filter((s) => s.memory_item_id === id).map((s) => s.source_kind).sort();
    expect(sources).toEqual(["capture", "user_edit"]);
  });

  it("then 'Susan moved to Colorado': the edited Alameda is replaced, as a change", async () => {
    const w = await world();
    const id = await edited(w);
    const t = await tell(w, "Susan moved to Colorado.", home(w, "Susan moved to Colorado"));
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan moved to Colorado", ["Susan lives in Alameda"]]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan moved to Colorado"], replaced: ["Susan lives in Alameda"] });
    const closer = [...w.server.table("memory_items").values()].find((m) => m.statement === "Susan moved to Colorado")!;
    expect([closer.supersedes_id, (closer.detail as Record<string, unknown>).transition]).toEqual([id, "changed"]);
  });

  it("then a bare 'Susan lives in Colorado': never a silent replacement of the user's words; one question", async () => {
    const w = await world();
    await edited(w);
    const t = await tell(w, "Susan lives in Colorado.", home(w, "Susan lives in Colorado"));
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Is Susan still in Alameda?", ["Still there", "Susan moved"]]]);
    await pick(w, t.id, "Still there");
    expect((await lines(w)).current).toEqual(["Susan lives in Alameda", "Susan lives in Colorado"]);
    expect((await lines(w)).replaced).toEqual([]);
  });

  it("an edit whose report was refused is read at the next Tell (the safety net)", async () => {
    const w = await world();
    const id = await edited(w, { reported: false });
    expect(w.gateway.rereads).toEqual([]);
    expect((await lines(w)).facets).toEqual([]);
    const t = await tell(w, "Susan moved to Colorado.", home(w, "Susan moved to Colorado"));
    expect(w.gateway.rereads).toEqual([id]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan moved to Colorado"], replaced: ["Susan lives in Alameda"] });
  });
});

describe("N14: a bare locality never silently replaces a broader residence", () => {
  it("'lives in California', then 'lives in Hollywood': both kept, whatever the model proposes", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    const ca = [...w.server.table("memory_items").values()].find((m) => m.statement === "Susan lives in California")!;
    const t = await tell(w, "Susan lives in Hollywood.", (i) => home(w, "Susan lives in Hollywood", {
      action: "supersede", target: i.dossier.find((d) => d.id === ca.id)?.key ?? null,
    })(i));
    expect(t.review.lines.map((l) => l.replaces)).toEqual([[]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan lives in California", "Susan lives in Hollywood"], replaced: [] });
  });

  it("'moved to Hollywood': asks 'Is Susan still in California?'", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    const t = await tell(w, "Susan moved to Hollywood.", home(w, "Susan moved to Hollywood"));
    expect(t.review.questions.map((q) => q.prompt)).toEqual(["Is Susan still in California?"]);
  });

  it("at city level: 'lives in Los Angeles', then 'lives in Hollywood': both kept, whatever the model proposes", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Los Angeles.", home(w, "Susan lives in Los Angeles"))).id);
    const la = [...w.server.table("memory_items").values()].find((m) => m.statement === "Susan lives in Los Angeles")!;
    const t = await tell(w, "Susan lives in Hollywood.", (i) => home(w, "Susan lives in Hollywood", {
      action: "supersede", target: i.dossier.find((d) => d.id === la.id)?.key ?? null,
    })(i));
    expect(t.review.lines.map((l) => l.replaces)).toEqual([[]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan lives in Hollywood", "Susan lives in Los Angeles"], replaced: [] });
  });

  it("at city level: 'lives in Alameda', then a bare 'lives in Portland' (read as Oregon): both kept", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    await done(w, (await tell(w, "Susan lives in Portland.", home(w, "Susan lives in Portland"))).id);
    expect(await lines(w)).toMatchObject({ current: ["Susan lives in Alameda", "Susan lives in Portland"], replaced: [] });
  });

  it("'lives in Alameda', then 'lives in Portland, OR': the user's qualifier; replaced as current truth", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan lives in Portland, OR.", home(w, "Susan lives in Portland, OR"));
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan lives in Portland, OR", ["Susan lives in Alameda"]]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan lives in Portland, OR"], replaced: ["Susan lives in Alameda"] });
  });
});

describe("B4: a note closes every line it can't be true with, and says so (brief §8 rule 2, §10)", () => {
  /** The user's own edit of a line that keeps its words (the repository's correct(), as the harness does): the line is theirs, its reading stays. */
  async function editKeepingWords(w: World, statement: string): Promise<MemoryItem> {
    const line = ((await w.store.list("memory_items")) as MemoryItem[]).find((m) => m.statement === statement)!;
    await w.repos.memory.correct(line.id, { statement });
    await w.engine.sync();
    const after = (await w.store.get("memory_items", line.id)) as MemoryItem;
    expect(after.user_state).toBe("edited");
    return after;
  }
  const serverLine = (w: World, statement: string) => [...w.server.table("memory_items").values()].find((m) => m.statement === statement)!;

  it("California, Alameda, then 'moved to Colorado': the Kept card says both lines it replaces, and both are closed (res-006)", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to Colorado.", home(w, "Susan moved to Colorado"));
    expect(t.review.mode).toBe("card");
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan moved to Colorado", ["Susan lives in Alameda", "Susan lives in California"]]]);
    await done(w, t.id);
    expect(await lines(w)).toEqual({
      current: ["Susan moved to Colorado"], replaced: ["Susan lives in Alameda", "Susan lives in California"], facets: ["Alameda", "California", "Colorado"],
    });
    const closer = serverLine(w, "Susan moved to Colorado");
    expect([closer.supersedes_id, closer.closes_ids, (closer.detail as Record<string, unknown>).transition])
      .toEqual([serverLine(w, "Susan lives in Alameda").id, [serverLine(w, "Susan lives in California").id], "changed"]);
    // What Kinship knows keeps everything it replaced traceable (Gate E), in the same order.
    const fresh = (await w.repos.people.list()).find((p) => p.id === w.susan.id) as Person;
    const knows = await recordFor(w.repos, fresh.id, new Date(w.server.clock));
    expect(knows.lines.find((l) => l.line.statement === "Susan moved to Colorado")!.line.replaces).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  });

  it("California, an edited Alameda, then 'lives in Colorado': one question; 'Susan moved' replaces both, 'Still there' nothing", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const alameda = await editKeepingWords(w, "Susan lives in Alameda");
    const t = await tell(w, "Susan lives in Colorado.", home(w, "Susan lives in Colorado"));
    expect(t.review.questions.map((q) => [q.prompt, q.choices.map((c) => c.label)])).toEqual([["Is Susan still in Alameda?", ["Still there", "Susan moved"]]]);
    expect((await lines(w)).replaced).toEqual([]);
    // The answer, then the Kept card: it says both lines the answer replaced.
    const [q] = t.review.questions;
    const moved = q.choices.find((c) => c.label === "Susan moved")!;
    await w.understanding.answer(t.id, answersFor([q], { [q.key]: "answer" in moved ? moved.answer : "skip" })!);
    await w.understanding.run();
    await w.engine.sync();
    expect((await review(w, t.id)).lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan lives in Colorado", ["Susan lives in Alameda", "Susan lives in California"]]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan lives in Colorado"], replaced: ["Susan lives in Alameda", "Susan lives in California"] });
    const closer = serverLine(w, "Susan lives in Colorado");
    expect([closer.supersedes_id, closer.closes_ids, (closer.detail as Record<string, unknown>).transition])
      .toEqual([alameda.id, [serverLine(w, "Susan lives in California").id], "changed"]);

    const stay = await world();
    await done(stay, (await tell(stay, "Susan lives in California.", home(stay, "Susan lives in California"))).id);
    await done(stay, (await tell(stay, "Susan lives in Alameda.", home(stay, "Susan lives in Alameda"))).id);
    await editKeepingWords(stay, "Susan lives in Alameda");
    const s = await tell(stay, "Susan lives in Colorado.", home(stay, "Susan lives in Colorado"));
    await pick(stay, s.id, "Still there");
    expect(await lines(stay)).toMatchObject({ current: ["Susan lives in Alameda", "Susan lives in California", "Susan lives in Colorado"], replaced: [] });
    expect(serverLine(stay, "Susan lives in Colorado").closes_ids).toEqual([]);
  });

  it("an edited California among the closures closes on the user's own cue (§21); the question's answer never reaches a second edited line", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    const california = await editKeepingWords(w, "Susan lives in California");
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to Colorado.", home(w, "Susan moved to Colorado"));
    expect(t.review.lines.map((l) => l.replaces)).toEqual([["Susan lives in Alameda", "Susan lives in California"]]);
    await done(w, t.id);
    expect(await lines(w)).toMatchObject({ current: ["Susan moved to Colorado"], replaced: ["Susan lives in Alameda", "Susan lives in California"] });
    expect(serverLine(w, "Susan moved to Colorado").closes_ids).toEqual([california.id]);

    // Both edited, no cue: "Susan moved" answers the question about Alameda alone. California, the user's own
    // words that no question named, stays current (fail open; a choice for the founder's review, brief §23).
    const both = await world();
    await done(both, (await tell(both, "Susan lives in California.", home(both, "Susan lives in California"))).id);
    await editKeepingWords(both, "Susan lives in California");
    await done(both, (await tell(both, "Susan lives in Alameda.", home(both, "Susan lives in Alameda"))).id);
    await editKeepingWords(both, "Susan lives in Alameda");
    const b = await tell(both, "Susan lives in Colorado.", home(both, "Susan lives in Colorado"));
    expect(b.review.questions.map((q) => q.prompt)).toEqual(["Is Susan still in Alameda?"]);
    await pick(both, b.id, "Susan moved");
    expect(await lines(both)).toMatchObject({ current: ["Susan lives in California", "Susan lives in Colorado"], replaced: ["Susan lives in Alameda"] });
    expect(serverLine(both, "Susan lives in Colorado").closes_ids).toEqual([]);
  });
});
