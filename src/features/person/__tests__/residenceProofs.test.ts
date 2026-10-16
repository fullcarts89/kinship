// Phase 4B B3 (residence semantics), through the product's real code: the
// gateway's pipeline with residence.ts and relate.ts, its answer path, the
// write rules, sync, Understanding and the review. Only the model's reply is
// written by hand, and the place data is a few of the real rows. Undo's
// exact restore and the edited-line rule run in the database (pgTAP 68, 69)
// and through the acceptance harness.
import { voiced } from "@/features/memory/statements";
import { answersFor, buildReview, type ReviewView } from "@/features/tell/reviewModel";
import { earlierOf, portraitFor, todayIso } from "@/hooks/useV2";
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
  it("California, then Alameda: both kept, nothing replaced (case A); the page is unchanged until B7", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in California.", home(w, "Susan lives in California"))).id);
    const t = await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"));
    expect(t.review.mode).toBe("card");
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan lives in Alameda", null]]);
    await done(w, t.id);
    expect(await lines(w)).toEqual({ current: ["Susan lives in Alameda", "Susan lives in California"], replaced: [], facets: ["Alameda", "California"] });
    const fresh = (await w.repos.people.list()).find((p) => p.id === w.susan.id) as Person;
    const portrait = await portraitFor(w.repos, fresh, new Date(w.server.clock));
    expect(portrait.lately.map((l) => l.statement).sort()).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  });

  it("Alameda, then 'moved to Colorado': the Kept card says what it replaces (case C)", async () => {
    const w = await world();
    await done(w, (await tell(w, "Susan lives in Alameda.", home(w, "Susan lives in Alameda"))).id);
    const t = await tell(w, "Susan moved to Colorado.", home(w, "Susan moved to Colorado"));
    expect(t.review.lines.map((l) => [l.statement, l.replaces])).toEqual([["Susan moved to Colorado", "Susan lives in Alameda"]]);
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
    expect(t.review.lines.map((l) => l.replaces)).toEqual([null]);
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
