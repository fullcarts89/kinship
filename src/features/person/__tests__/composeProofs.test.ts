// Phase 4B B5, step 8 (the composer; brief §9, §11, §15), through the
// product's real code: the gateway's pipeline with residence.ts and
// relate.ts, the write rules, sync, and What Kinship knows read by recordFor
// with compose.ts. Only the model's reply is written by hand, and the place
// data is a few of the real rows. Nothing here is a mocked composition: the
// lines, their readings and their sources are what the app would hold.
// The world itself is shared with the B7 and B8 proofs (test-utils/residenceWorld).
import type { RecordLine } from "@/features/person/PersonRecordView";
import { recordFor } from "@/hooks/useV2";
import { type MemoryItem, repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { UserStore } from "@/store/userStore";
import { FakeRemote } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import { A, composedOf, done, events, home, kept, knows, serverLine, shown, tell, world, type World } from "@/test-utils/residenceWorld";

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

  it("(3b, N17) 'Alameda, California' then 'California': 'Lives in Alameda, California', California still a member; 'Alameda, CA' says both", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda, California.", "Susan lives in Alameda, California");
    await kept(w, "Susan lives in California.", "Susan lives in California");
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Lives in Alameda, California"]);
    expect(composedOf(lines).composed!.members.map((m) => m.row.line.statement)).toEqual(["Susan lives in Alameda, California", "Susan lives in California"]);
    expect(composedOf(lines).provenance).toMatch(/and 1 other note$/u);
    const alias = await world();
    await kept(alias, "Susan lives in Alameda, CA.", "Susan lives in Alameda, CA");
    await kept(alias, "Susan lives in California.", "Susan lives in California");
    expect(shown(await knows(alias))).toEqual(["Lives in Alameda, CA, California"]);
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

describe("B5 step 9: a member edited, removed, replaced or restored reads the line again (brief §12)", () => {
  /** Two notes, "Lives in Alameda, California", and the lines' server ids. */
  async function twoNotes(w: World) {
    await kept(w, "Susan lives in California.", "Susan lives in California");
    w.server.clock += 36 * 3600 * 1000;
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Lives in Alameda, California"]);
    return { alameda: String((await serverLine(w, "Susan lives in Alameda")).id), california: String((await serverLine(w, "Susan lives in California")).id), before: composedOf(lines) };
  }

  it("(10) edit a member's words: Alameda → Oakland reads 'Lives in Oakland, California' once the edit is read again; unknown words fail open", async () => {
    const w = await world();
    const { alameda } = await twoNotes(w);
    await w.understanding.correct(alameda, { statement: "Susan lives in Oakland" });
    await w.understanding.run();
    await w.engine.sync();
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Lives in Oakland, California"]);
    const c = composedOf(lines);
    expect(c.composed!.members.map((m) => [m.row.line.statement, m.row.line.edited])).toEqual([["Susan lives in Oakland", true], ["Susan lives in California", false]]);
    expect(c.composed!.members[0].row.line.editedFrom).toBe("Susan lives in Alameda");
    // One member edited, the other not: the whole line says so neutrally; each member keeps its own line.
    expect(c.provenance).toMatch(/^From your notes · Oct \d+ · one edited by you$/u);
    expect(c.composed!.members.map((m) => m.row.provenance)).toEqual([
      expect.stringMatching(/^Edited by you · Oct \d+ · from your note, Oct \d+$/u), expect.stringMatching(/^You told Kinship · Oct \d+$/u),
    ]);
    // Words the data doesn't know: the edited line stands alone, the other too (fail open), nothing invented.
    await w.understanding.correct(alameda, { statement: "Susan lives in the East Bay" });
    await w.understanding.run();
    await w.engine.sync();
    expect(shown(await knows(w)).sort()).toEqual(["Susan lives in California", "Susan lives in the East Bay"]);
  });

  it("(10b) between the edit and its re-reading, two lines (fail open); the next Tell reads it and the line composes again", async () => {
    const w = await world();
    const { alameda } = await twoNotes(w);
    w.gateway.failNext = { status: 503, error: "try_later" };
    await w.understanding.correct(alameda, { statement: "Susan lives in Oakland" });
    await w.understanding.run();
    await w.engine.sync();
    expect(shown(await knows(w)).sort()).toEqual(["Susan lives in California", "Susan lives in Oakland"]);
    await kept(w, "Susan loves pottery.", "Susan loves pottery");
    expect(shown(await knows(w))).toEqual(["Susan loves pottery", "Lives in Oakland, California"]);
  });

  it("(11) Not this on California: 'Susan lives in Alameda' stands alone, its own provenance; on Alameda: California's", async () => {
    const w = await world();
    const { alameda, california } = await twoNotes(w);
    await w.understanding.reject(california);
    await w.engine.sync();
    let lines = await knows(w);
    expect(lines.map((l) => [l.line.statement, !!l.composed])).toEqual([["Susan lives in Alameda", false]]);
    expect(lines[0].provenance).toMatch(/^You told Kinship · Oct \d+$/u);
    await w.understanding.reject(alameda);
    await w.engine.sync();
    lines = await knows(w);
    expect(lines).toEqual([]);
    const other = await world();
    const ids = await twoNotes(other);
    await other.understanding.reject(ids.alameda);
    await other.engine.sync();
    expect((await knows(other)).map((l) => [l.line.statement, !!l.composed])).toEqual([["Susan lives in California", false]]);
  });

  it("(12) California → Alameda → 'moved to Colorado' → exact Undo: the composed line is back, the same members, their lineage intact", async () => {
    const w = await world();
    const { alameda, california, before } = await twoNotes(w);
    const colorado = await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const closed = await knows(w);
    expect(shown(closed)).toEqual(["Susan moved to Colorado"]);
    expect(closed[0].line.replaces).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    expect(JSON.stringify(closed)).not.toMatch(/Lives in/u);
    await w.understanding.undo(colorado);
    await w.understanding.run();
    await w.engine.sync();
    const back = await knows(w);
    expect(shown(back)).toEqual(["Lives in Alameda, California"]);
    const c = composedOf(back);
    // The very same lines (never re-created), their readings never touched, their provenance as before.
    expect(c.composed!.memberIds).toEqual([alameda, california]);
    expect(c.composed!.memberIds).toEqual(before.composed!.memberIds);
    expect(c.provenance).toBe(before.provenance);
    expect(c.composed!.members.map((m) => m.row.provenance)).toEqual(before.composed!.members.map((m) => m.row.provenance));
    expect([...w.server.table("memory_items").values()].filter((m) => !m.deleted_at).map((m) => [m.statement, m.status]).sort())
      .toEqual([["Susan lives in Alameda", "active"], ["Susan lives in California", "active"]]);
  });

  it("(12b) 'Not this' on the closer in What Kinship knows brings the composed line back the same way", async () => {
    const w = await world();
    const { alameda, california } = await twoNotes(w);
    await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const closer = String((await serverLine(w, "Susan moved to Colorado")).id);
    await w.understanding.reject(closer);
    await w.engine.sync();
    const back = await knows(w);
    expect(shown(back)).toEqual(["Lives in Alameda, California"]);
    expect(composedOf(back).composed!.memberIds).toEqual([alameda, california]);
  });

  it("(12c) 'moved to Oakland' closes Alameda alone: 'Lives in Oakland, California'; Undo gives Alameda back", async () => {
    const w = await world();
    const { alameda, california } = await twoNotes(w);
    const oakland = await kept(w, "Susan moved to Oakland.", "Susan moved to Oakland");
    const lines = await knows(w);
    expect(shown(lines)).toEqual(["Lives in Oakland, California"]);
    expect(composedOf(lines).composed!.members.map((m) => m.row.line.replaces)).toEqual([["Susan lives in Alameda"], []]);
    expect(composedOf(lines).composed!.memberIds[1]).toBe(california);
    await w.understanding.undo(oakland);
    await w.understanding.run();
    await w.engine.sync();
    const back = await knows(w);
    expect(shown(back)).toEqual(["Lives in Alameda, California"]);
    expect(composedOf(back).composed!.memberIds).toEqual([alameda, california]);
  });

  it("(13) another phone, and this one after a restart, read the same line from what synced down", async () => {
    const w = await world();
    const { alameda, california, before } = await twoNotes(w);
    // Another phone on the same account: it has only what the server sent it.
    const db2 = await openSqlJsDb();
    await prepareSchema(db2, A);
    const store2 = new UserStore(db2, A, { now: () => new Date(w.server.clock).toISOString(), newId: () => `00000099-0000-4000-8000-${String(Date.now()).slice(-12)}` });
    await new SyncEngine(store2, new FakeRemote(w.server, A)).sync();
    const other = (await recordFor(repositoriesFor(store2), w.susan.id, new Date(w.server.clock))).lines;
    expect(shown(other)).toEqual(["Lives in Alameda, California"]);
    expect(composedOf(other).composed!.memberIds).toEqual([alameda, california]);
    expect(composedOf(other).provenance).toBe(before.provenance);
    // This phone, opened again over the same database: nothing cached, the same reading.
    const reopened = new UserStore(w.store["db"] as never, A, { now: () => new Date(w.server.clock).toISOString() });
    const again = (await recordFor(repositoriesFor(reopened), w.susan.id, new Date(w.server.clock))).lines;
    expect(shown(again)).toEqual(["Lives in Alameda, California"]);
    expect(composedOf(again).composed!.memberIds).toEqual([alameda, california]);
  });
});
