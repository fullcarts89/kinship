// The residence world for Phase 4B proofs (B5, B7, B8), through the product's
// real code: the gateway's pipeline with residence.ts and relate.ts, the write
// rules, sync, the Portrait and What Kinship knows. Only the model's reply is
// written by hand, and the place data is a few of the real rows. Nothing here
// is a mocked composition: the lines, their readings and their sources are
// what the app would hold. Test code only.
import { voiced } from "@/features/memory/statements";
import { answersFor, buildReview, type ReviewView } from "@/features/tell/reviewModel";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { earlierOf, recordFor, todayIso } from "@/hooks/useV2";
import { Gateway } from "@/store/gateway";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { testPlaces } from "@/test-utils/places";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import { setAnalyticsSink } from "@/platform/analytics";
import type { ExtractionInput, ModelProposal, ProposedItem } from "../../supabase/functions/_shared/extraction/types";

export const A = "aaaaaaaa-0000-4000-8000-0000000000b5";
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
export async function events(fn: () => Promise<unknown>): Promise<[string, Record<string, unknown>][]> {
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
export const composedOf = (lines: RecordLine[]) => lines.find((l) => l.composed)!;

export async function serverLine(w: World, statement: string) {
  return [...w.server.table("memory_items").values()].find((m) => m.statement === statement)!;
}
