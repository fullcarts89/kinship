// Phase 4B B5, step 8 (the composer; brief §9, §11, §15), through the
// product's real code: the gateway's pipeline with residence.ts and
// relate.ts, the write rules, sync, and What Kinship knows read by recordFor
// with compose.ts. Only the model's reply is written by hand, and the place
// data is a few of the real rows. Nothing here is a mocked composition: the
// lines, their readings and their sources are what the app would hold.
import { voiced } from "@/features/memory/statements";
import { answersFor, buildReview, type ReviewView } from "@/features/tell/reviewModel";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { earlierOf, recordFor, todayIso } from "@/hooks/useV2";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type MemoryItem } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { testPlaces } from "@/test-utils/places";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import { setAnalyticsSink } from "@/platform/analytics";
import type { ExtractionInput, ModelProposal, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-0000000000b5";
const TZ = "America/Los_Angeles";

let worlds = 0;
export async function world() {
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
  const dana = await repos.people.add({ display_name: "Dana" });
  await engine.sync();
  return { server, gateway, store, engine, understanding, repos, susan, dana };
}
export type World = Awaited<ReturnType<typeof world>>;

/** The model's reply for a note about where someone lives, as a correct model would phrase it. */
export const home = (w: World, statement: string, opts: { person?: string; existing?: ProposedItem["existing"]; certainty?: ProposedItem["certainty"]; evidence?: string } = {}) =>
  (i: ExtractionInput): ModelProposal => {
    const pid = opts.person ?? w.susan.id;
    const name = pid === w.dana.id ? "Dana" : "Susan";
    return {
      needs_clarification: null,
      items: [{
        kind: "fact", person: i.roster.find((r) => r.id === pid)!.key, person_mention: name, subject: "person",
        related_relation: null, related_name: null, statement, evidence: [opts.evidence ?? statement], certainty: opts.certainty ?? "stated", sensitivity: "none",
        confidence: 0.95, date_text: null, date_direction: "past",
        detail: {
          event_type: null, event_goal: null, category: "home", attribute: null, value: null, firmness: null, topic: null, place: null,
          milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
        },
        existing: opts.existing ?? { action: "new", target: null },
      }],
    };
  };

export async function tell(w: World, note: string, reply: (i: ExtractionInput) => ModelProposal): Promise<{ id: string; review: ReviewView }> {
  w.gateway.propose(note, reply);
  const c = await w.repos.captures.tell(note, { aiEnabled: true, timeZone: TZ });
  await w.understanding.told(c.id);
  await w.understanding.run();
  return { id: c.id, review: await review(w, c.id) };
}

export async function review(w: World, id: string): Promise<ReviewView> {
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

export async function done(w: World, id: string) {
  await w.understanding.finish(id, "done");
  await w.understanding.run();
  await w.engine.sync();
}

/** Tells and keeps a note, one step. */
export async function kept(w: World, note: string, statement: string, opts: Parameters<typeof home>[2] = {}): Promise<string> {
  const t = await tell(w, note, home(w, statement, opts));
  await done(w, t.id);
  return t.id;
}

export async function pick(w: World, id: string, label: string) {
  const v = await review(w, id);
  const [q] = v.questions;
  const c = q.choices.find((x) => x.label === label)!;
  await w.understanding.answer(id, answersFor([q], { [q.key]: "answer" in c ? c.answer : "skip" })!);
  await w.understanding.run();
  await done(w, id);
}

/** Every event sent while `fn` runs (content-free; the sink is the product's). */
async function events(fn: () => Promise<unknown>): Promise<[string, Record<string, unknown>][]> {
  const out: [string, Record<string, unknown>][] = [];
  setAnalyticsSink({ send: (e, p) => out.push([e, p]) });
  try {
    await fn();
  } finally {
    setAnalyticsSink();
  }
  return out;
}

/** What Kinship knows, as the screen reads it. */
export async function knows(w: World, personId = w.susan.id): Promise<RecordLine[]> {
  return (await recordFor(w.repos, personId, new Date(w.server.clock))).lines;
}

/** The page in words: a composed line as its text, every other line as its statement. */
export const shown = (lines: RecordLine[]) => lines.map((l) => l.composed ? l.composed.text : l.line.statement);
const composedOf = (lines: RecordLine[]) => lines.find((l) => l.composed)!;

export async function serverLine(w: World, statement: string) {
  return [...w.server.table("memory_items").values()].find((m) => m.statement === statement)!;
}

describe("B5 step 8: the composer on What Kinship knows (brief §9)", () => {
  it("(1) California, then Alameda: one line, 'Lives in Alameda, California', its members both notes, its provenance their union", async () => {
    const w = await world();
    const cal = await kept(w, "Susan lives in California.", "Susan lives in California");
    w.server.clock += 36 * 3600 * 1000;
    const ala = await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Lives in Alameda, California"]);
    const c = composedOf(lines);
    expect(c.composed!.members.map((m) => m.row.line.statement)).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    expect(c.composed!.memberIds).toEqual([(await serverLine(w, "Susan lives in Alameda")).id, (await serverLine(w, "Susan lives in California")).id]);
    // The union of the sources, in the existing words; the newest note opens from it.
    expect(c.provenance).toMatch(/^You told Kinship · Oct \d+ · and 1 other note$/u);
    expect(c.noteId).toBe(ala);
    expect(c.composed!.members.map((m) => m.row.noteId)).toEqual([ala, cal]);
    // Each member keeps its own provenance line.
    expect(c.composed!.members.map((m) => m.row.provenance)).toEqual([expect.stringMatching(/^You told Kinship · Oct \d+$/u), expect.stringMatching(/^You told Kinship · Oct \d+$/u)]);
  });

  it("(2) Alameda, then California: the same composition, whichever was told first", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    await kept(w, "Susan lives in California.", "Susan lives in California");
    expect(shown(await knows(w))).toEqual(["Lives in Alameda, California"]);
  });

  it("(3) one line, 'Alameda, CA': shown as the line itself, in its exact words, never composed or expanded", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda, CA.", "Susan lives in Alameda, CA");
    const lines = await knows(w);
    expect(lines.map((l) => [l.line.statement, !!l.composed])).toEqual([["Susan lives in Alameda, CA", false]]);
    expect(JSON.stringify(lines)).not.toMatch(/California/u);
  });

  it("(4) the same place from two notes: one phrase, both notes behind it, neither lost", async () => {
    const w = await world();
    const first = await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    // The second note merges into the first line (SAME: another source); the page shows one line from two notes.
    const target = await serverLine(w, "Susan lives in Alameda");
    const second = await kept(w, "Susan lives in Alameda these days.", "Susan lives in Alameda", {
      existing: { action: "merge", target: null },
    });
    const lines = await knows(w);
    expect(lines.map((l) => l.line.statement)).toEqual(["Susan lives in Alameda"]);
    expect(lines[0].provenance).toMatch(/and 1 other note/u);
    const sources = await w.repos.memory.sourcesFor(String(target.id));
    expect(sources.map((s) => s.capture_id).sort()).toEqual([first, second].sort());
    // And beside a broader line: still one phrase per place, and three notes.
    await kept(w, "Susan lives in California.", "Susan lives in California");
    const after = await knows(w);
    expect(shown(after)).toEqual(["Lives in Alameda, California"]);
    expect(composedOf(after).provenance).toMatch(/and 2 other notes/u);
  });

  it("(5) a place the data doesn't know never composes: separate lines, nothing reported", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in the Bay Area.", "Susan lives in the Bay Area");
    const sent = await events(async () => expect(shown(await knows(w)).sort()).toEqual(["Susan lives in California", "Susan lives in the Bay Area"]));
    expect(sent.filter((e) => e[0] === "compose_degraded")).toEqual([]);
  });

  it("(5b) an ambiguous pair never composes: 'Hollywood' beside 'California' stays two lines, nothing reported", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in Hollywood.", "Susan lives in Hollywood");
    const sent = await events(async () => expect(shown(await knows(w)).sort()).toEqual(["Susan lives in California", "Susan lives in Hollywood"]));
    expect(sent.filter((e) => e[0] === "compose_degraded")).toEqual([]);
  });

  it("(6) two current places that can't both be true fail open, apart, with a content-free report", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    await kept(w, "Susan lives in Colorado.", "Susan lives in Colorado");
    // The comparator closed Alameda (a plain replacement, no history). Bring it back by hand, as only a
    // broken invariant could: the composer never merges the two, and says so without their words.
    expect((await serverLine(w, "Susan lives in Alameda")).status).toBe("superseded");
    const alameda = await serverLine(w, "Susan lives in Alameda");
    w.server.serverWrite("memory_items", String(alameda.id), A, { status: "active", valid_to: null });
    await w.engine.sync();
    let lines: RecordLine[] = [];
    const sent = await events(async () => {
      lines = await knows(w);
    });
    expect(shown(lines).sort()).toEqual(["Susan lives in Alameda", "Susan lives in Colorado"]);
    expect(lines.some((l) => l.composed)).toBe(false);
    expect(sent.filter((e) => e[0] === "compose_degraded")).toEqual([["compose_degraded", { slot: "residence", lines_n: 1 }]]);
    expect(JSON.stringify(sent)).not.toMatch(/Alameda|Colorado/u);
  });

  it("(7) never across people: Susan's California and Dana's Alameda stay on their own pages, uncomposed", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Dana lives in Alameda.", "Dana lives in Alameda", { person: w.dana.id });
    expect(shown(await knows(w, w.susan.id))).toEqual(["Susan lives in California"]);
    expect(shown(await knows(w, w.dana.id))).toEqual(["Dana lives in Alameda"]);
    expect(JSON.stringify(await knows(w, w.susan.id))).not.toMatch(/Alameda/u);
  });

  it("(7b) never across subjects: Susan's sister's Alameda never joins Susan's California", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    const t = await tell(w, "Susan's sister lives in Alameda.", (i) => {
      const p = home(w, "Susan's sister lives in Alameda")(i);
      p.items[0] = { ...p.items[0], subject: "related", related_relation: "sister", related_name: null, person_mention: null };
      return p;
    });
    await done(w, t.id);
    const lines = await knows(w);
    expect(shown(lines).sort()).toEqual(["Susan lives in California", "Susan's sister lives in Alameda"]);
    expect(lines.some((l) => l.composed)).toBe(false);
  });

  it("(8) current and history never mix: after 'moved to Colorado', the page says Colorado, never a composed Alameda", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Susan moved to Colorado"]);
    expect(lines[0].line.replaces).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    expect(JSON.stringify(lines)).not.toMatch(/Lives in|Previously/u);
  });

  it("(9) a correction records no change: 'Actually … Oakland, not Alameda' leaves nothing history-eligible", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    // The model's evidence is the whole sentence, as the live model quotes it (b3.blackbox): the cue lies in the span.
    await kept(w, "Actually Susan lives in Oakland, not Alameda.", "Susan lives in Oakland", { evidence: "Actually Susan lives in Oakland, not Alameda" });
    const oak = await serverLine(w, "Susan lives in Oakland");
    expect((oak.detail as Record<string, unknown>).transition).toBe("corrected");
    expect(shown(await knows(w))).toEqual(["Susan lives in Oakland"]);
    // And a plain replacement records none at all.
    const d = await world();
    await kept(d, "Dana lives in Alameda.", "Dana lives in Alameda", { person: d.dana.id });
    await kept(d, "Dana lives in Colorado.", "Dana lives in Colorado", { person: d.dana.id });
    const col = await serverLine(d, "Dana lives in Colorado");
    expect((col.detail as Record<string, unknown>).transition ?? null).toBeNull();
  });

  it("(14) a line with no reading shows as today: nothing composes without the server's facet", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    // The readings never reached this phone (an older gateway, or a sync that hasn't): two plain lines, fail open.
    for (const f of [...w.server.table("memory_item_facets").values()]) w.server.serverWrite("memory_item_facets", String(f.id), A, { deleted_at: w.server.tick(0) });
    await w.engine.sync();
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    expect(lines.some((l) => l.composed)).toBe(false);
    // A hedge never composes either (certainty is never upgraded): "might live in Alameda" beside California.
    const h = await world();
    await kept(h, "Susan lives in California.", "Susan lives in California");
    await kept(h, "Susan might be living in Alameda.", "Susan might be living in Alameda", { certainty: "tentative" });
    expect((await knows(h)).some((l) => l.composed)).toBe(false);
  });

  it("(15) a composed line is never a memory, never a dossier line, never written anywhere", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    expect(shown(await knows(w))).toEqual(["Lives in Alameda, California"]);
    // The store and the server hold the two lines the user told, and no third.
    const local = ((await w.store.list("memory_items")) as MemoryItem[]).map((m) => m.statement).sort();
    const remote = [...w.server.table("memory_items").values()].map((m) => String(m.statement)).sort();
    expect(local).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    expect(remote).toEqual(local);
    expect(JSON.stringify([...w.server.table("memory_items").values(), ...w.server.table("memory_item_sources").values()])).not.toMatch(/Lives in/u);
    // The next note's dossier carries the member lines, in the user's words, and nothing composed.
    let seen: string[] = [];
    const t = await tell(w, "Susan loves pottery.", (i) => {
      seen = i.dossier.map((d) => d.statement);
      return home(w, "Susan loves pottery")(i);
    });
    await done(w, t.id);
    expect(seen.sort()).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  });
});
