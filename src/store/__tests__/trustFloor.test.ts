// The alpha trust floor (FD-30e; CC-25): Paused and Remembered (D13, PER-06)
// are set only by the user and silence everything proactive; the duplicate
// merge (PER-05) offers plausible matches without a score, previews exactly
// what moves, and its journal is undoable for 30 days.
import { randomUUID } from "crypto";
import { buildToday, type TodayInput } from "@/features/today/todayModel";
import { mergeCandidates, mergePreview, mergedAwayIds, nameForms, sameNameMatch, undoableMerges, type MergeRow } from "@/store/peopleMerge";
import { HOLD_COPY, isHeld, isInPeople, isProactiveEligible, stateLine } from "@/store/peopleStates";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { spec, writableFields } from "@/store/tables";
import { UserStore } from "@/store/userStore";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000a4";

async function setup() {
  const server = new FakeServer();
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID, now: () => "2026-10-30T18:00:00.000Z" });
  return { server, store, repos: repositoriesFor(store), engine: new SyncEngine(store, new FakeRemote(server, A)) };
}

const person = (id: string, over: Partial<Person> = {}): Person =>
  ({ id, display_name: id[0].toUpperCase() + id.slice(1), state: "active", birthday: null, birthday_source: null, version: 1, deleted_at: null, ...over }) as Person;

describe("person states (D13)", () => {
  it("only an active person in People is proactive-eligible", () => {
    expect(isProactiveEligible(person("ben"))).toBe(true);
    expect(isProactiveEligible(person("ben", { state: "paused" }))).toBe(false);
    expect(isProactiveEligible(person("ben", { state: "remembered" }))).toBe(false);
    expect(isProactiveEligible(person("ben", { state: "archived" }))).toBe(false);
    expect(isProactiveEligible(person("ben", { deleted_at: "2026-10-01T00:00:00Z" }))).toBe(false);
    expect(isProactiveEligible(null)).toBe(false);
  });

  it("held people stay in People; the only visual difference is one line on their page", () => {
    expect(isHeld(person("ben", { state: "paused" }))).toBe(true);
    expect(isInPeople(person("ben", { state: "paused" }))).toBe(true);
    expect(isInPeople(person("ben", { state: "remembered" }))).toBe(true);
    expect(isInPeople(person("ben", { state: "archived" }))).toBe(false);
    expect(stateLine(person("ben", { state: "paused" }))).toBe("Paused");
    expect(stateLine(person("ben", { state: "remembered" }))).toBe("Remembered");
    expect(stateLine(person("ben"))).toBeNull();
    expect(HOLD_COPY.remembered.explain("Chris")).toBe("Kinship keeps Chris's memories and never brings them back.");
    expect(HOLD_COPY.paused.explain("Chris")).toBe("Kinship keeps what it knows about Chris and brings nothing back for now.");
  });

  it("the repository holds and resumes, syncs the state both ways, and never holds someone removed", async () => {
    const { server, repos, engine, store } = await setup();
    const chris = await repos.people.add({ display_name: "Chris" });
    await engine.sync();
    await repos.people.hold(chris.id, "paused");
    expect((await repos.people.get(chris.id))?.state).toBe("paused");
    await engine.sync();
    expect(server.table("people").get(chris.id)?.state).toBe("paused");
    await repos.people.hold(chris.id, "remembered");
    await engine.sync();
    expect(server.table("people").get(chris.id)?.state).toBe("remembered");
    await repos.people.resume(chris.id);
    await engine.sync();
    expect(server.table("people").get(chris.id)?.state).toBe("active");
    // Another phone pauses them: this one sees it after a pull.
    server.serverWrite("people", chris.id, A, { state: "paused" });
    await engine.sync();
    expect((await repos.people.get(chris.id))?.state).toBe("paused");
    // Removed from People: hold is refused; Resume on someone active changes nothing.
    await repos.people.archive(chris.id);
    await expect(repos.people.hold(chris.id, "paused")).rejects.toThrow(/bring them back/);
    await repos.people.restore(chris.id);
    expect((await repos.people.resume(chris.id)).state).toBe("active");
    expect(await store.pendingOps()).toHaveLength(1);
  });

  it("the state column is one the app may write, and nothing in the store sets it on its own", () => {
    expect(writableFields("people", { state: "paused" }, "update")).toEqual({ state: "paused" });
    // No code path outside PeopleRepo.hold/resume/archive/restore/setState writes it: the only
    // writers are the repository's own methods (checked by grep in the PR; this pins the column).
    expect(spec("people").writable).toContain("state");
  });
});

describe("Today honours Paused / Remembered (D13)", () => {
  const NOW = new Date(2026, 9, 30, 9, 0);
  const TODAY = "2026-10-30";
  const item = (id: string, over: Partial<MemoryItem>): MemoryItem => ({
    id, kind: "event", person_id: "chris", statement: "", detail: {}, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "person", origin: "extracted", created_at: "2026-10-29T08:00:00Z", ...over,
  }) as MemoryItem;
  const race = item("m1", { statement: "Chris runs Chicago Sunday", detail: { date: "2026-11-01", date_precision: "day", event_type: "race", followup_policy: "both" } });
  const reason = { id: "r1", person_id: "chris", type: "upcoming_event", window_start: "2026-10-30T07:00:00Z", window_end: "2026-11-01T07:00:00Z", score: 85, state: "candidate", dedupe_key: "upcoming_event:m1:2026-11-01" };
  const input = (state: Person["state"]): TodayInput => ({
    now: NOW, today: TODAY, items: [race],
    people: [person("chris", { state, birthday: "1988-10-31", birthday_source: "contacts" }), person("ben")],
    reasons: [reason as unknown as TodayInput["reasons"][number]], local: {}, primaries: [], handoff: null, told: 3, activated: true,
    questions: 0, toLookAt: 0, provenance: () => ({ line: "You told Kinship · Oct 29", noteId: "c1" }),
  });

  it("an active person's race and birthday reach Today", () => {
    const v = buildToday(input("active"));
    expect(v.moment).not.toBeNull();
    const words = [v.moment?.statement ?? "", ...v.quiet.map((q) => q.text)].join(" ");
    expect(words).toMatch(/Chris/u);
  });

  it.each(["paused", "remembered"] as const)("a %s person gets no moment, no birthday and no Coming up line", (state) => {
    const v = buildToday(input(state));
    const words = [v.moment?.statement ?? "", v.moment?.personName ?? "", ...v.quiet.map((q) => q.text)].join(" ");
    expect(words).not.toMatch(/Chris/u);
    expect(v.moment).toBeNull();
    // Still in People: this is not first use and not an empty account.
    expect(v.firstUse).toBeNull();
  });

  it("the eligibility helper gives the same answer Today's own check does, for every state", () => {
    for (const state of ["active", "paused", "remembered", "archived"] as const) {
      const p = person("chris", { state });
      expect(isProactiveEligible(p)).toBe(p.state === "active" && !p.deleted_at);
    }
  });
});

describe("a shared person recorded before the memory's insert synced", () => {
  it("reaches the server as a follow-up update (write_memory_item takes no sharing at insert)", async () => {
    const { server, repos, engine, store } = await setup();
    const sam = await repos.people.add({ display_name: "Sam Eden" });
    const anthony = await repos.people.add({ display_name: "Anthony" });
    const m = await repos.memory.remember({ kind: "moment", person_id: sam.id, statement: "Sam and Anthony went to Tahoe" }, { userAuthored: true });
    // "Yes" to "Is this the Anthony in …?" while the insert is still queued (offline, or just quick).
    await store.update("memory_items", m.id, { with_person_ids: [anthony.id] });
    await engine.sync();
    expect(server.table("memory_items").get(m.id)).toMatchObject({ with_person_ids: [anthony.id], version: 2 });
    expect(await store.pendingOps()).toEqual([]);
    expect(((await repos.memory.get(m.id)) as { with_person_ids?: string[] }).with_person_ids).toEqual([anthony.id]);
  });
});

describe("duplicate merge (PER-05)", () => {
  const anthony = person("anthony", { display_name: "Anthony", full_name: null } as Partial<Person>);
  const lopez = person("lopez", { display_name: "Anthony Lopez", full_name: "Anthony Lopez", contact_ref: "c-1", birthday: "1990-03-14", birthday_source: "contacts" } as Partial<Person>);
  const sam = person("sam", { display_name: "Sam Eden", full_name: "Sam Eden" } as Partial<Person>);
  const tony = person("tony", { display_name: "Tony", nicknames: ["Anthony"] } as Partial<Person>);
  const removed = person("gone", { display_name: "Anthony Reyes", state: "archived" } as Partial<Person>);

  it("offers plausible matches by a shared name, alphabetical, never scored, never someone removed", () => {
    const got = mergeCandidates(anthony, [anthony, lopez, sam, tony, removed]);
    expect(got.map((p) => p.display_name)).toEqual(["Anthony Lopez", "Tony"]);
    expect(mergeCandidates(sam, [anthony, lopez, sam, tony])).toEqual([]);
    expect(nameForms(tony)).toEqual(["tony", "anthony"]);
  });

  it("Add by name of a name already in People finds that person (so the screen can ask first)", () => {
    expect(sameNameMatch("anthony", [lopez, sam])?.id).toBe("lopez");
    expect(sameNameMatch("Anthony  Lopez", [lopez, sam])?.id).toBe("lopez");
    expect(sameNameMatch("Sam", [lopez, sam])?.id).toBe("sam");
    expect(sameNameMatch("Anthony Reyes", [removed, sam])).toBeNull();
    expect(sameNameMatch("Maya", [lopez, sam])).toBeNull();
  });

  it("previews exactly what moves, in the user's terms, with no counts", () => {
    const live = (id: string, statement: string, over: Partial<MemoryItem> = {}) => ({ id, statement, status: "active", deleted_at: null, ...over }) as MemoryItem;
    const p = mergePreview({
      target: lopez, source: anthony,
      items: [live("m1", "Anthony and Sam love ice skating with Chris"), live("m2", "Anthony starts his new job Monday"), live("m3", "gone", { status: "retracted", deleted_at: "x" })],
      sharedItems: [live("m4", "Sam and Anthony went to Tahoe")],
      related: [{ relation: "sister", name: "Maria" }, { relation: "dog", name: null }],
      conversations: [{ channel: "text", occurred_at: "2026-10-12T20:00:00Z" }, { channel: "call", occurred_at: "2026-10-20T20:00:00Z" }],
    });
    expect(p.memories).toEqual(["Anthony and Sam love ice skating with Chris", "Anthony starts his new job Monday"]);
    expect(p.shared).toEqual(["Sam and Anthony went to Tahoe"]);
    expect(p.related).toEqual(["sister Maria", "dog"]);
    expect(p.conversations).toEqual(["Called · Oct 20", "Messaged · Oct 12"]);
    expect(p.birthday).toBeNull();
    expect(p.contactLink).toBe(false);
    expect(p.alsoKnownAs).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/\d+ (memories|items)/u);
    // The other way round: Anthony keeps nothing of Lopez's yet takes his birthday, contact link and names.
    const q = mergePreview({ target: anthony, source: lopez, items: [], sharedItems: [], related: [], conversations: [] });
    expect(q).toMatchObject({ birthday: "1990-03-14", contactLink: true, alsoKnownAs: ["Anthony Lopez"] });
  });

  it("a merge can be undone for 30 days, and a merged-away person is never offered as removed", () => {
    const now = new Date("2026-10-30T18:00:00Z");
    const rows: MergeRow[] = [
      { id: "g1", target_id: "lopez", source_id: "anthony", undone_at: null, created_at: "2026-10-29T18:00:00Z" },
      { id: "g2", target_id: "lopez", source_id: "tony", undone_at: null, created_at: "2026-09-01T18:00:00Z" },
      { id: "g3", target_id: "lopez", source_id: "sam", undone_at: "2026-10-29T19:00:00Z", created_at: "2026-10-29T18:00:00Z" },
      { id: "g4", target_id: "sam", source_id: "x", undone_at: null, created_at: "2026-10-29T18:00:00Z" },
    ];
    expect(undoableMerges(rows, "lopez", now).map((m) => m.id)).toEqual(["g1"]);
    expect([...mergedAwayIds(rows)].sort()).toEqual(["anthony", "tony", "x"]);
  });

  it("the journal is pull-only on the phone and reads as empty before its migration lands", () => {
    const s = spec("people_merges");
    expect(s.appInsert).toBe(false);
    expect(s.appUpdate).toBe(false);
    expect(s.optional).toBe(true);
    expect(writableFields("people_merges", { journal: {} }, "insert")).toEqual({});
  });
});
