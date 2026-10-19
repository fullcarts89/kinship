// Phase 4B B7 (brief §13; founder CC-19): Portrait de-duplication through the
// product's real code: the gateway's pipeline with residence.ts and
// relate.ts, the write rules, sync, and the Portrait read by portraitFor →
// buildPortrait. Only the model's reply is written by hand. The B7
// acceptance matrix: California → Alameda; a moved-to with its Undo; a plain
// replacement; a correction; ambiguous and disjoint chains; a member edited
// or removed; and every member still in What Kinship knows.
import { portraitFor } from "@/hooks/useV2";
import type { MemoryItem } from "@/store/repositories";
import { A, kept, knows, serverLine, shown, world, type World } from "@/test-utils/residenceWorld";

async function portrait(w: World, personId = w.susan.id) {
  const person = (await w.repos.people.get(personId))!;
  return portraitFor(w.repos, person, new Date(w.server.clock));
}
const latelyOf = async (w: World, personId?: string) => (await portrait(w, personId)).lately.map((l) => l.statement);

/** Two notes a day and a half apart: "Lives in Alameda, California" in What Kinship knows. */
async function twoNotes(w: World) {
  const cal = await kept(w, "Susan lives in California.", "Susan lives in California");
  w.server.clock += 36 * 3600 * 1000;
  const ala = await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
  return { cal, ala, alameda: String((await serverLine(w, "Susan lives in Alameda")).id), california: String((await serverLine(w, "Susan lives in California")).id) };
}

describe("B7: the Portrait shows one residence chain as one line (brief §13)", () => {
  it("(1) California → Alameda: Lately says 'Susan lives in Alameda' once; What Kinship knows keeps both notes", async () => {
    const w = await world();
    const { ala, alameda } = await twoNotes(w);
    const p = await portrait(w);
    expect(p.lately.map((l) => l.statement)).toEqual(["Susan lives in Alameda"]);
    // The head's own line: its id, its own note and provenance, never the composed wording.
    expect(p.lately[0]).toMatchObject({ itemId: alameda, noteId: ala, provenance: expect.stringMatching(/^You told Kinship · Oct \d+$/u) });
    expect(JSON.stringify(p)).not.toMatch(/Lives in|California/u);
    // The other member left the Portrait only: the page says more is in What Kinship knows, which composes both.
    expect(p.more).toBe(true);
    expect(shown(await knows(w))).toEqual(["Lives in Alameda, California"]);
  });

  it("(2) Alameda → California: the head is still Alameda, dated by California (the newest member)", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    // Pottery told after Alameda and before California: the chain, dated by California, comes first.
    w.server.clock += 24 * 3600 * 1000;
    await kept(w, "Susan loves pottery.", "Susan loves pottery");
    w.server.clock += 24 * 3600 * 1000;
    await kept(w, "Susan lives in California.", "Susan lives in California");
    expect(await latelyOf(w)).toEqual(["Susan lives in Alameda", "Susan loves pottery"]);
  });

  it("(2b) an old Alameda and a recent California: the chain is recent, as Alameda's words", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    w.server.clock += 150 * 24 * 3600 * 1000;
    // Alone, Alameda has left Lately (120 days).
    expect(await latelyOf(w)).toEqual([]);
    await kept(w, "Susan lives in California.", "Susan lives in California");
    expect(await latelyOf(w)).toEqual(["Susan lives in Alameda"]);
  });

  it("(3) 'moved to Colorado' closes the chain: Lately says the move with its 'was:'; Undo brings the one Alameda line back", async () => {
    const w = await world();
    await twoNotes(w);
    const colorado = await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const closed = await portrait(w);
    expect(closed.lately.map((l) => [l.statement, l.was])).toEqual([["Susan moved to Colorado", "Susan lives in Alameda"]]);
    await w.understanding.undo(colorado);
    await w.understanding.run();
    await w.engine.sync();
    const back = await portrait(w);
    expect(back.lately.map((l) => l.statement)).toEqual(["Susan lives in Alameda"]);
    expect(JSON.stringify(back)).not.toMatch(/Colorado|California/u);
    expect([...w.server.table("memory_items").values()].filter((m) => !m.deleted_at).map((m) => [m.statement, m.status]).sort())
      .toEqual([["Susan lives in Alameda", "active"], ["Susan lives in California", "active"]]);
  });

  it("(4) Alameda → 'lives in Colorado' (no cue): Colorado alone, Alameda replaced (never shown as current)", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    await kept(w, "Susan lives in Colorado.", "Susan lives in Colorado");
    expect(await latelyOf(w)).toEqual(["Susan lives in Colorado"]);
  });

  it("(5) a correction: 'Actually … Oakland, not Alameda' leaves Oakland alone", async () => {
    const w = await world();
    await twoNotes(w);
    await kept(w, "Actually Susan lives in Oakland, not Alameda.", "Susan lives in Oakland", { evidence: "Actually Susan lives in Oakland, not Alameda" });
    expect(await latelyOf(w)).toEqual(["Susan lives in Oakland"]);
    expect(shown(await knows(w))).toEqual(["Lives in Oakland, California"]);
  });

  it("(6) an ambiguous pair fails open: 'Hollywood' beside 'California' shows both lines", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in Hollywood.", "Susan lives in Hollywood");
    expect((await latelyOf(w)).sort()).toEqual(["Susan lives in California", "Susan lives in Hollywood"]);
  });

  it("(6b) an unknown place fails open: 'the Bay Area' beside 'California' shows both lines", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Susan lives in the Bay Area.", "Susan lives in the Bay Area");
    expect((await latelyOf(w)).sort()).toEqual(["Susan lives in California", "Susan lives in the Bay Area"]);
  });

  it("(6c) a disjoint pair (the comparator's invariant broken) shows both lines; nothing is lost", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    await kept(w, "Susan lives in Colorado.", "Susan lives in Colorado");
    const alameda = await serverLine(w, "Susan lives in Alameda");
    w.server.serverWrite("memory_items", String(alameda.id), A, { status: "active", valid_to: null });
    await w.engine.sync();
    expect((await latelyOf(w)).sort()).toEqual(["Susan lives in Alameda", "Susan lives in Colorado"]);
  });

  it("(7) Not this on a member: the other line shows as itself, with its own provenance", async () => {
    const w = await world();
    const { alameda, california } = await twoNotes(w);
    await w.understanding.reject(california);
    await w.engine.sync();
    expect((await portrait(w)).lately.map((l) => [l.statement, l.itemId])).toEqual([["Susan lives in Alameda", alameda]]);
    const other = await world();
    const ids = await twoNotes(other);
    await other.understanding.reject(ids.alameda);
    await other.engine.sync();
    expect((await portrait(other)).lately.map((l) => [l.statement, l.itemId])).toEqual([["Susan lives in California", ids.california]]);
  });

  it("(8) editing the head's words: read again, the chain follows ('Oakland'); words the data doesn't know show both lines", async () => {
    const w = await world();
    const { alameda } = await twoNotes(w);
    await w.understanding.correct(alameda, { statement: "Susan lives in Oakland" });
    await w.understanding.run();
    await w.engine.sync();
    expect(await latelyOf(w)).toEqual(["Susan lives in Oakland"]);
    await w.understanding.correct(alameda, { statement: "Susan lives in the East Bay" });
    await w.understanding.run();
    await w.engine.sync();
    expect((await latelyOf(w)).sort()).toEqual(["Susan lives in California", "Susan lives in the East Bay"]);
  });

  it("(9) no reading on this phone: both lines show, as before B7", async () => {
    const w = await world();
    await twoNotes(w);
    for (const f of [...w.server.table("memory_item_facets").values()]) w.server.serverWrite("memory_item_facets", String(f.id), A, { deleted_at: w.server.tick(0) });
    await w.engine.sync();
    expect(await latelyOf(w)).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  });

  it("(10) never across people: Dana's Alameda and Susan's California each on their own page", async () => {
    const w = await world();
    await kept(w, "Susan lives in California.", "Susan lives in California");
    await kept(w, "Dana lives in Alameda.", "Dana lives in Alameda", { person: w.dana.id });
    expect(await latelyOf(w)).toEqual(["Susan lives in California"]);
    expect(await latelyOf(w, w.dana.id)).toEqual(["Dana lives in Alameda"]);
  });

  it("(11) the Portrait's other sections are untouched, and every member is still a memory on the server", async () => {
    const w = await world();
    await twoNotes(w);
    const p = await portrait(w);
    expect([p.comingUp, p.youSaid, p.between]).toEqual([[], [], []]);
    const remote = [...w.server.table("memory_items").values()].map((m) => [String(m.statement), String(m.status)]).sort();
    expect(remote).toEqual([["Susan lives in Alameda", "active"], ["Susan lives in California", "active"]]);
    expect(JSON.stringify([...w.server.table("memory_items").values()])).not.toMatch(/Lives in/u);
    const local = ((await w.store.list("memory_items")) as MemoryItem[]).map((m) => m.statement).sort();
    expect(local).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  });
});
