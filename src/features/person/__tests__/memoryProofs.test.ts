// Proofs that the memory architecture holds up under real use (activation
// pass): a dense note, information that changes, and a relationship page at
// low and high density. Every step runs the product's real code:
//
//   the gateway's input builder and pipeline (planExtraction), the gateway's
//   write rules (merge / supersede / resolves), sync, Understanding, the
//   review model, the relationship page (portraitFor → buildPortrait),
//   What Kinship knows (recordFor) and the Source view (noteFor).
//
// The one thing written by hand is the model's reply (there is no model in
// tests): src/dev/fixtures/denseTell.ts, in relationship_extract's exact
// output shape. What the screens show comes out of the code, and is saved to
// src/dev/fixtures/generated/proofs.json so the lab renders exactly this.
// Run with UPDATE_PROOFS=1 to rewrite that file after an intended change.
import fs from "fs";
import path from "path";
import { noteFor, portraitFor, recordFor, todayIso } from "@/hooks/useV2";
import { buildReview } from "@/features/tell/reviewModel";
import { PORTRAIT_RULES } from "@/features/person/portraitModel";
import { Gateway } from "@/store/gateway";
import { repositoriesFor, type Person } from "@/store/repositories";
// The proof builds a real store, as the app's session does.
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import {
  ANNA_1, ANNA_2, anna1, anna2, KNEE_1, KNEE_2, knee1, knee2, keyFor, MATT_NOTE, mattProposal,
} from "@/dev/fixtures/denseTell";
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

const A = "aaaaaaaa-0000-4000-8000-00000000a011";
const TZ = "America/Los_Angeles";
const OUT = path.join(__dirname, "../../../dev/fixtures/generated/proofs.json");

let worlds = 0;
async function world() {
  // Deterministic ids, so the generated file only changes when the product does.
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

/** Tell a note the way the app does, let it be understood, and return its review as the sheet would show it. */
async function tell(w: World, note: string, reply: (i: ExtractionInput) => ModelProposal, opts: { accept?: boolean } = {}) {
  w.gateway.propose(note, reply);
  const c = await w.repos.captures.tell(note, { aiEnabled: true, timeZone: TZ });
  await w.understanding.told(c.id);
  await w.understanding.run();
  const row = (await w.understanding.get(c.id))!;
  const review = buildReview({
    row,
    capture: { id: c.id, raw_text: note, context_person_id: null, status: String((await w.repos.captures.get(c.id))?.status) },
    items: await w.understanding.itemsFor(c.id, row.reading),
    people: await w.repos.people.list(),
    related: await w.repos.people.related(),
    offline: false,
    today: todayIso(new Date(w.server.clock)),
  });
  if (row.state === "review") {
    const held = row.reading?.held ?? [];
    // "Remember" on a sensitive reading (the user's yes), or Done.
    if (held.length && opts.accept) await w.understanding.answer(c.id, held.map((_, index) => ({ index, accept: true })));
    else await w.understanding.finish(c.id, "done");
    await w.understanding.run();
  }
  await w.engine.sync();
  return { captureId: c.id, review };
}

async function person(w: World, name: string): Promise<Person> {
  const p = await w.repos.people.add({ display_name: name });
  await w.engine.sync();
  return p;
}

const days = (w: World, n: number) => {
  w.server.clock += n * 86_400_000;
};
const now = (w: World) => new Date(w.server.clock);
const proofs: Record<string, unknown> = {};

// ─── 4. Dense Tell ──────────────────────────────────────────────────────

describe("a dense note: Matt", () => {
  it("is read into four grounded memories, looked over once, and lands in the right places on Matt's page", async () => {
    const w = await world();
    const matt = await person(w, "Matt");
    const { captureId, review } = await tell(w, MATT_NOTE, mattProposal);

    // The Kept card: a look-over (everything already saved), no question.
    expect(review.mode).toBe("card");
    expect(review.questions).toHaveLength(0);
    const kept = (await w.repos.memory.forPerson(matt.id)).map((m) => [m.kind, m.statement, m.certainty]);
    expect(kept).toEqual(expect.arrayContaining([
      ["fact", "Matt was promoted", "stated"],
      ["fact", "Matt is excited but nervous about managing people", "stated"],
      // The hedge stays; "next summer" is kept as a season, not words that go stale (stabilization).
      ["plan", "Matt and Jess are thinking about moving to Marin", "tentative"],
      // A promise said firmly; the Marin plan's "thinking about" is that line's own word (founder I12b).
      ["promise", "Introduce Matt to Alex", "stated"],
    ]));
    expect(kept).toHaveLength(4);

    // Matt's page: what's going on, what's coming, what you said you'd do.
    const portrait = await portraitFor(w.repos, (await w.repos.people.get(matt.id))!, now(w));
    // In the note's own order.
    expect(portrait.lately.map((l) => l.statement)).toEqual(["Matt was promoted", "Matt is excited but nervous about managing people"]);
    expect(portrait.comingUp.map((l) => [l.statement, l.when])).toEqual([["Matt and Jess are thinking about moving to Marin", "Summer 2027"]]);
    expect(portrait.youSaid.map((l) => l.statement)).toEqual(["Introduce Matt to Alex"]);
    expect(portrait.between).toEqual([]);
    for (const l of [...portrait.lately, ...portrait.comingUp, ...portrait.youSaid]) {
      expect(l.provenance).toMatch(/^You told Kinship · /);
      expect(l.noteId).toBe(captureId);
    }

    // What Kinship knows: the same four, with sources. The Source: the note, the understood words marked.
    const knows = await recordFor(w.repos, matt.id, now(w));
    expect(knows.lines).toHaveLength(4);
    const note = (await noteFor(w.store, captureId, now(w)))!;
    expect(note.runs!.map((r) => r.text).join("")).toBe(MATT_NOTE);
    expect(note.runs!.filter((r) => r.marked).map((r) => r.text)).toEqual([
      "Matt just got promoted", "He's excited but nervous about managing people",
      "He and Jess are thinking about moving to Marin next summer", "I told him I'd introduce him to Alex",
    ]);
    // Nobody was invented: Jess and Alex are in the note's words only, not new people.
    expect((await w.repos.people.list()).map((p) => p.display_name)).toEqual(["Matt"]);

    proofs.matt = { note: MATT_NOTE, review, portrait: { ...portrait, person: { id: matt.id, display_name: "Matt" } }, knows: knows.lines, source: note, personId: matt.id };
  });
});

// ─── 5. Information that changes ────────────────────────────────────────

describe("information that changes", () => {
  it("Anna: an open thread is closed by what happened; the page moves on, the source stays", async () => {
    const w = await world();
    const anna = await person(w, "Anna");
    const first = await tell(w, ANNA_1, anna1);
    const before = await portraitFor(w.repos, anna, now(w));
    expect(before.lately.map((l) => l.statement)).toEqual(["Anna is interviewing at Stripe"]);

    days(w, 21);
    const second = await tell(w, ANNA_2, anna2);
    const items = [...w.server.table("memory_items").values()].filter((m) => m.person_id === anna.id);
    const thread = items.find((m) => m.kind === "thread")!;
    const job = items.find((m) => m.kind === "fact")!;
    expect(thread.status).toBe("superseded"); // replaced, not deleted: history (H25)
    expect(job.supersedes_id).toBe(thread.id); // and linked, so the change shows
    expect(job).toMatchObject({ statement: "Anna got the job at Stripe", status: "active" });

    const after = await portraitFor(w.repos, anna, now(w));
    expect(after.lately.map((l) => l.statement)).toEqual(["Anna got the job at Stripe"]); // the open question has left Lately
    const knows = await recordFor(w.repos, anna.id, now(w));
    // One current line, saying what it replaced (H25): never both as current.
    expect(knows.lines.map((l) => [l.line.statement, l.line.replaces])).toEqual([["Anna got the job at Stripe", "Anna is interviewing at Stripe"]]);
    // Both notes still say where each came from.
    expect((await noteFor(w.store, first.captureId, now(w)))!.items.map((i) => i.statement)).toEqual(["Anna is interviewing at Stripe"]);
    expect((await noteFor(w.store, second.captureId, now(w)))!.items.map((i) => i.statement)).toEqual(["Anna got the job at Stripe"]);
    proofs.anna = { notes: [ANNA_1, ANNA_2], before, after, knowsAfter: knows.lines, personId: anna.id };
  });

  it("Ben's knee: a newer statement replaces the older one; the older is kept as history, not shown", async () => {
    const w = await world();
    const ben = await person(w, "Ben");
    const r1 = await tell(w, KNEE_1, knee1, { accept: true });
    expect(r1.review.mode).toBe("sheet"); // health: not memory until "Remember"
    const before = await portraitFor(w.repos, ben, now(w));
    expect(before.lately.map((l) => l.statement)).toEqual(["Ben's knee has been bothering him"]);

    days(w, 30);
    await tell(w, KNEE_2, knee2, { accept: true });
    const items = [...w.server.table("memory_items").values()].filter((m) => m.person_id === ben.id);
    const old = items.find((m) => m.statement === "Ben's knee has been bothering him")!;
    const now2 = items.find((m) => m.statement === "Ben's knee is better")!;
    expect(old.status).toBe("superseded");
    expect(old.valid_to).toBeTruthy();
    expect(now2.supersedes_id).toBe(old.id);
    const oldSources = [...w.server.table("memory_item_sources").values()].filter((s) => s.memory_item_id === old.id);
    expect(oldSources).toHaveLength(1); // its source is kept with it

    const after = await portraitFor(w.repos, ben, now(w));
    expect(after.lately.map((l) => l.statement)).toEqual(["Ben's knee is better"]);
    const knows = await recordFor(w.repos, ben.id, now(w));
    expect(knows.lines.map((l) => l.line.statement)).toEqual(["Ben's knee is better"]);
    proofs.knee = { notes: [KNEE_1, KNEE_2], before, after, knowsAfter: knows.lines, personId: ben.id };
  });
});

// ─── 5. Density: new, lightly known, richly known ───────────────────────


/** One item of a written model reply (detail fields left out are null). */
type ReplyItem = Omit<Partial<ProposedItem>, "detail"> & { detail?: Partial<ProposedDetail> };

function reply(name: string, items: ReplyItem[]) {
  return (input: ExtractionInput): ModelProposal => ({
    needs_clarification: null,
    items: items.map((it) => ({
      kind: "fact", person: keyFor(input, name), person_mention: name, subject: "person", related_relation: null, related_name: null,
      statement: "", evidence: [], certainty: "stated", sensitivity: "none", confidence: 0.93, date_text: null, date_direction: "unclear",
      existing: { action: "new", target: null }, ...it,
      detail: {
        event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null, place: null,
        milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null, ...(it.detail ?? {}),
      },
    })) as ProposedItem[],
  });
}

// About ten months of notes about Priya: what a well-used page looks like.
const PRIYA: [number, string, ReplyItem[]][] = [
  [-300, "Priya and I met at the Stanford reading group.", [{ kind: "context", statement: "You met Priya at the Stanford reading group", evidence: ["Priya and I met at the Stanford reading group"], subject: "shared", detail: { aspect: "how_met" } }]],
  [-280, "Priya loves the Moth podcast.", [{ kind: "fact", statement: "Priya loves the Moth podcast", evidence: ["Priya loves the Moth podcast"], detail: { category: "interest" } }]],
  [-260, "Priya hates cilantro.", [{ kind: "fact", statement: "Priya hates cilantro", evidence: ["Priya hates cilantro"], detail: { category: "preference" } }]],
  [-240, "Priya and I always get dumplings at Yank Sing.", [{ kind: "context", statement: "You and Priya always get dumplings at Yank Sing", evidence: ["Priya and I always get dumplings at Yank Sing"], subject: "shared", detail: { aspect: "place" } }]],
  [-200, "Priya's dog Miso is twelve.", [{ kind: "fact", statement: "Priya's dog Miso is twelve", evidence: ["Priya's dog Miso is twelve"], detail: { category: "pet" } }]],
  [-170, "Priya is training for the Big Sur half.", [{ kind: "thread", statement: "Priya is training for the Big Sur half", evidence: ["Priya is training for the Big Sur half"], detail: { topic: "Big Sur half" } }]],
  [-150, "Priya and I did the Dipsea hike together.", [{ kind: "moment", statement: "You and Priya did the Dipsea hike", evidence: ["Priya and I did the Dipsea hike together"], subject: "shared" }]],
  [-110, "Priya's sister Ana moved to Lisbon.", [{ kind: "fact", statement: "Priya's sister Ana moved to Lisbon", evidence: ["Priya's sister Ana moved to Lisbon"], subject: "related", related_relation: "sister", related_name: "Ana", detail: { category: "home" } }]],
  [-90, "Priya is learning ceramics.", [{ kind: "thread", statement: "Priya is learning ceramics", evidence: ["Priya is learning ceramics"], detail: { topic: "ceramics" } }]],
  [-75, "I said I'd send Priya the Lisbon restaurant list.", [{ kind: "promise", statement: "Send Priya the Lisbon restaurant list", evidence: ["I said I'd send Priya the Lisbon restaurant list"], subject: "user" }]],
  [-60, "Priya started at Figma.", [{ kind: "fact", statement: "Priya started at Figma", evidence: ["Priya started at Figma"], detail: { category: "work" } }]],
  [-45, "Priya's book club is reading Middlemarch.", [{ kind: "fact", statement: "Priya's book club is reading Middlemarch", evidence: ["Priya's book club is reading Middlemarch"], detail: { category: "interest" } }]],
  [-40, "I told Priya I'd lend her my tent.", [{ kind: "promise", statement: "Lend Priya your tent", evidence: ["I told Priya I'd lend her my tent"], subject: "user" }]],
  [-30, "Priya and Dev are thinking about a trip to Japan in the spring.", [{ kind: "plan", statement: "Priya and Dev are thinking about a trip to Japan in the spring", evidence: ["Priya and Dev are thinking about a trip to Japan in the spring"], certainty: "tentative", date_text: "in the spring", date_direction: "future", detail: { firmness: "idea" } }]],
  [-25, "Priya is redoing her kitchen.", [{ kind: "thread", statement: "Priya is redoing her kitchen", evidence: ["Priya is redoing her kitchen"], detail: { topic: "kitchen" } }]],
  [-20, "Priya's team at Figma shipped the new editor.", [{ kind: "fact", statement: "Priya's team at Figma shipped the new editor", evidence: ["Priya's team at Figma shipped the new editor"], detail: { category: "work" } }]],
  [-14, "I promised Priya I'd come to her pottery show.", [{ kind: "promise", statement: "Come to Priya's pottery show", evidence: ["I promised Priya I'd come to her pottery show"], subject: "user" }]],
  [-10, "Priya and I talked about doing Dipsea again.", [{ kind: "plan", statement: "You and Priya talked about doing the Dipsea hike again", evidence: ["Priya and I talked about doing Dipsea again"], subject: "shared", certainty: "wished", detail: { firmness: "idea" } }]],
  [-7, "Priya's pottery show is on October 24.", [{ kind: "event", statement: "Priya's pottery show is on October 24", evidence: ["Priya's pottery show is on October 24"], date_text: "October 24", date_direction: "future", detail: { event_type: "celebration" } }]],
  [-5, "Priya's mom is visiting from Pune next week.", [{ kind: "event", statement: "Priya's mom is visiting from Pune next week", evidence: ["Priya's mom is visiting from Pune next week"], subject: "related", related_relation: "mom", date_text: "next week", date_direction: "future", detail: { event_type: "trip" } }]],
  [-3, "Priya is reading Piranesi now.", [{ kind: "fact", statement: "Priya is reading Piranesi", evidence: ["Priya is reading Piranesi now"], detail: { category: "interest" } }]],
  [-2, "Priya and I have watched every Ghibli film together.", [{ kind: "context", statement: "You and Priya have watched every Ghibli film together", evidence: ["Priya and I have watched every Ghibli film together"], subject: "shared", detail: { aspect: "shared_interest" } }]],
  [-1, "I said I'd send Priya the Piranesi audiobook link.", [{ kind: "promise", statement: "Send Priya the Piranesi audiobook link", evidence: ["I said I'd send Priya the Piranesi audiobook link"], subject: "user" }]],
  [0, "Priya's dog Miso had a good vet checkup.", [{ kind: "fact", statement: "Priya's dog Miso had a good vet checkup", evidence: ["Priya's dog Miso had a good vet checkup"], detail: { category: "pet" } }]],
];

describe("the relationship page at every density", () => {
  it("new, lightly known and richly known: the same quiet page, never a dump; everything stays in What Kinship knows", async () => {
    const w = await world();
    const start = w.server.clock;
    const sam = await person(w, "Sam");
    const lena = await person(w, "Lena");
    const priya = await person(w, "Priya");


    // Richly known: ten months of notes about Priya, told on their own days.
    for (const [day, text, items] of PRIYA) {
      w.server.clock = start + (day + 300) * 86_400_000;
      // She says "Remember" to anything that asks (a relative, a health word).
      await tell(w, text, reply("Priya", items), { accept: true });
    }

    // Lightly known: two notes this week.
    await tell(w, "Lena just moved to Oakland.", reply("Lena", [{ kind: "fact", statement: "Lena moved to Oakland", evidence: ["Lena just moved to Oakland"], detail: { category: "home" } }]));
    await tell(w, "I told Lena I'd help her hang shelves.", reply("Lena", [{ kind: "promise", statement: "Help Lena hang shelves", evidence: ["I told Lena I'd help her hang shelves"], subject: "user" }]));

    const at = now(w);
    const fresh = await portraitFor(w.repos, sam, at);
    const light = await portraitFor(w.repos, lena, at);
    const rich = await portraitFor(w.repos, priya, at);
    const richKnows = await recordFor(w.repos, priya.id, at);

    expect([fresh.lately, fresh.comingUp, fresh.youSaid, fresh.between].flat()).toEqual([]);
    expect(light.lately.map((l) => l.statement)).toEqual(["Lena moved to Oakland"]);
    expect(light.youSaid.map((l) => l.statement)).toEqual(["Help Lena hang shelves"]);
    expect(light.more).toBe(false);

    // Rich: at most PORTRAIT_RULES.perSection lines a section, chosen by time only.
    expect(richKnows.lines.length).toBeGreaterThanOrEqual(20);
    for (const s of [rich.lately, rich.comingUp, rich.youSaid, rich.between]) expect(s.length).toBeLessThanOrEqual(PORTRAIT_RULES.perSection);
    expect(rich.more).toBe(true);
    // Lately: the newest things told in the last 120 days; nothing older (cilantro, the Moth) — those are in What Kinship knows.
    expect(rich.lately.map((l) => l.statement)).not.toContain("Priya hates cilantro");
    expect(richKnows.lines.map((l) => l.line.statement)).toContain("Priya hates cilantro");
    // Coming up: soonest first.
    expect(rich.comingUp[0].statement).toBe("Priya's mom is visiting from Pune");
    expect(rich.comingUp[0].when).toMatch(/^Week of /);

    const strip = (p: typeof rich, id: string, name: string) => ({ ...p, person: { id, display_name: name } });
    proofs.density = {
      fresh: strip(fresh, sam.id, "Sam"), light: strip(light, lena.id, "Lena"), rich: strip(rich, priya.id, "Priya"),
      richKnows: richKnows.lines, ids: { sam: sam.id, lena: lena.id, priya: priya.id },
    };
  });
});

afterAll(() => {
  if (Object.keys(proofs).length < 4) return; // only when every proof ran
  const json = JSON.stringify(proofs, null, 1);
  if (process.env.UPDATE_PROOFS === "1" || !fs.existsSync(OUT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${json}\n`);
  } else {
    // The lab shows what the code produces; a stale file fails here.
    expect(JSON.parse(fs.readFileSync(OUT, "utf8"))).toEqual(JSON.parse(json));
  }
});
