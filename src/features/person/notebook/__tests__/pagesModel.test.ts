// Pages (PR #77 §8, DN-4): only this person's notes, newest first, with year breaks; only their kept
// words marked, private ones only once they are lines (the user's yes); intention notes said as saved;
// the conversations the user confirmed and the promises they kept between the notes, by date; and
// "Find in X's pages". Nothing counts or ranks anything.
import { randomUUID } from "crypto";
import {
  buildPages, dateBlock, findInPages, findRanges, isIntention, keptTitle, longDay, narrowest, pageDay, segment, sentenceAround, withYears,
  type PagesCapture, type PagesItem, type PagesSource,
} from "../pagesModel";
import { lineDetailFor, lineFactsFor, pagesFor, sourcePageFor } from "@/hooks/usePages";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const ROSA = "rosa";
const SAM = "sam";
const cp = (text: string, words: string) => {
  const i = text.indexOf(words);
  const start = Array.from(text.slice(0, i)).length;
  return { span_start: start, span_end: start + Array.from(words).length };
};

const N1 = "Nonna's teaching me the ravioli on Sunday. I need to bring her the good flour. Sam says hi.";
const N2 = "Called Nonna. Her figs came in and she's proud of them.";
const N3 = "Rosa's hip surgery is on the 12th.";
const OLD = "Rosa moved to Bensonhurst.";
const SAVED = "Bring Rosa the good flour on Saturday";

function item(id: string, over: Partial<PagesItem> = {}): PagesItem {
  return { id, kind: "fact", person_id: ROSA, statement: id, status: "active", sensitivity: "none", origin: "extracted", ...over };
}
const src = (memory_item_id: string, capture_id: string, text: string, words: string): PagesSource =>
  ({ memory_item_id, capture_id, source_kind: "capture", ...cp(text, words) });
const cap = (id: string, raw_text: string | null, created_at: string, status = "extracted"): PagesCapture => ({ id, raw_text, created_at, status });

function world() {
  const items = [
    item("ravioli", { kind: "event" }),
    item("flour", { kind: "promise", subject_type: "user" }),
    item("sam-hi", { person_id: SAM }),
    item("figs"),
    item("surgery", { sensitivity: "health" }),
    item("gone", { status: "retracted", deleted_at: "2026-10-10T00:00:00Z" }),
    item("moved"),
    item("saved", { kind: "promise", subject_type: "user", origin: "user" }),
    item("kept", { kind: "promise", subject_type: "user", status: "resolved", statement: "Call Rosa about the ravioli", updated_at: "2026-11-05T18:00:00Z", created_at: "2026-10-01T10:00:00Z" }),
  ];
  const sources = [
    src("ravioli", "n1", N1, "Nonna's teaching me the ravioli on Sunday"),
    src("flour", "n1", N1, "I need to bring her the good flour"),
    src("sam-hi", "n1", N1, "Sam says hi"),
    src("figs", "n2", N2, "Her figs came in"),
    src("gone", "n2", N2, "she's proud of them"),
    src("surgery", "n3", N3, "Rosa's hip surgery is on the 12th"),
    src("moved", "old", OLD, "Rosa moved to Bensonhurst"),
    src("saved", "saved", SAVED, SAVED),
    // Another person's note only: never on Rosa's pages.
    { memory_item_id: "sam-hi", capture_id: "sam-only", source_kind: "capture", span_start: 0, span_end: 3 },
  ];
  const captures = [
    cap("n1", N1, "2026-10-04T15:00:00Z"),
    cap("n2", N2, "2026-09-21T15:00:00Z"),
    cap("n3", N3, "2026-10-20T15:00:00Z"),
    cap("old", OLD, "2025-12-14T15:00:00Z"),
    cap("saved", SAVED, "2026-11-02T15:00:00Z", "skipped"),
    cap("sam-only", "Sam's note", "2026-10-30T15:00:00Z"),
  ];
  const conversations = [{ id: "c1", label: "You messaged · Nov 4", about: "Rosa is teaching you to make ravioli", at: "2026-11-04T19:00:00Z" }];
  return { personId: ROSA, items, sources, captures, conversations };
}

describe("buildPages", () => {
  const pages = buildPages(world());
  const notes = pages.filter((e) => e.type === "note");

  it("holds only the notes with a live line about this person, newest first", () => {
    expect(notes.map((n) => n.type === "note" && n.captureId)).toEqual(["saved", "n3", "n1", "n2", "old"]);
    expect(notes.some((n) => n.type === "note" && n.captureId === "sam-only")).toBe(false);
  });

  it("marks only this person's kept words: never another person's line in the same note, never a retracted line", () => {
    const n1 = notes.find((n) => n.type === "note" && n.captureId === "n1")!;
    if (n1.type !== "note") throw new Error("note");
    expect(n1.spans.map((s) => s.itemId)).toEqual(["ravioli", "flour"]);
    expect(n1.spans.map((s) => N1.slice(s.start, s.end))).toEqual(["Nonna's teaching me the ravioli on Sunday", "I need to bring her the good flour"]);
    const n2 = notes.find((n) => n.type === "note" && n.captureId === "n2")!;
    if (n2.type !== "note") throw new Error("note");
    expect(n2.spans.map((s) => s.itemId)).toEqual(["figs"]);
  });

  it("a private line the user said yes to is marked as private; nothing else is", () => {
    const n3 = notes.find((n) => n.type === "note" && n.captureId === "n3")!;
    if (n3.type !== "note") throw new Error("note");
    expect(n3.spans).toEqual([expect.objectContaining({ itemId: "surgery", sensitive: true })]);
    const n1 = notes.find((n) => n.type === "note" && n.captureId === "n1")!;
    expect(n1.type === "note" && n1.spans.every((s) => !s.sensitive)).toBe(true);
    // A held reading is never a line, so its note isn't here and nothing of it is marked.
    const held = buildPages({ ...world(), items: world().items.filter((m) => m.id !== "surgery") });
    expect(held.some((e) => e.type === "note" && e.captureId === "n3")).toBe(false);
  });

  it("says an intention note is saved, not told", () => {
    expect(notes.map((n) => n.type === "note" && n.intention)).toEqual([true, false, false, false, false]);
    expect(isIntention({ status: "skipped" }, [{ kind: "promise", origin: "user", subject_type: "user" }])).toBe(true);
    expect(isIntention({ status: "skipped" }, [{ kind: "fact", origin: "user", subject_type: "person" }])).toBe(false);
    expect(isIntention({ status: "extracted" }, [{ kind: "promise", origin: "user", subject_type: "user" }])).toBe(false);
    expect(isIntention({ status: "skipped" }, [])).toBe(false);
  });

  it("interleaves the conversations the user confirmed and the promises they kept, by date", () => {
    expect(pages.map((e) => e.key)).toEqual(["kept:kept", "talk:c1", "note:saved", "note:n3", "note:n1", "note:n2", "note:old"]);
    const kept = pages[0];
    expect(kept.type === "show" && kept.title).toBe("You kept it: call Rosa about the ravioli");
    const talk = pages[1];
    expect(talk.type === "show" && [talk.title, talk.about]).toEqual(["You messaged · Nov 4", "Rosa is teaching you to make ravioli"]);
  });

  it("a note whose words were removed keeps the excerpts its lines rest on, and marks nothing", () => {
    const w = world();
    const purged = buildPages({
      ...w,
      captures: w.captures.map((c) => (c.id === "n2" ? { ...c, raw_text: null } : c)),
      sources: w.sources.map((s) => (s.capture_id === "n2" && s.memory_item_id === "figs" ? { ...s, quote: "Her figs came in" } : s)),
    }).find((e) => e.type === "note" && e.captureId === "n2");
    expect(purged).toEqual(expect.objectContaining({ text: null, quotes: ["Her figs came in"], spans: [] }));
  });

  it("the note behind their relation is a page too, when known", () => {
    const w = world();
    const withLabel = buildPages({ ...w, labelNoteId: "sam-only" });
    expect(withLabel.some((e) => e.type === "note" && e.captureId === "sam-only")).toBe(true);
  });
});

describe("year breaks", () => {
  it("none for this year; one where the year changes", () => {
    const rows = withYears(buildPages(world()), new Date("2026-11-06T12:00:00Z"));
    expect(rows.map((r) => (r.type === "year" ? r.year : r.key))).toEqual(
      ["kept:kept", "talk:c1", "note:saved", "note:n3", "note:n1", "note:n2", 2025, "note:old"],
    );
  });
});

describe("Find in X's pages", () => {
  const pages = buildPages(world());

  it("keeps the notes that say it, and sets aside what the user did while finding", () => {
    expect(findInPages(pages, "  FLOUR ").map((e) => e.key)).toEqual(["note:saved", "note:n1"]);
    expect(findInPages(pages, "")).toBe(pages);
    expect(findInPages(pages, "nothing like this")).toEqual([]);
  });

  it("marks every place the words appear, ignoring case", () => {
    expect(findRanges("Flour, then more flour", "flour")).toEqual([[0, 5], [17, 22]]);
    expect(findRanges("anything", " ")).toEqual([]);
  });
});

describe("drawing a note", () => {
  it("splits at every edge and keeps what covers each piece", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    expect(segment(10, [{ start: 2, end: 6, data: a }, { start: 4, end: 8, data: b }])).toEqual([
      { start: 0, end: 2, on: [] }, { start: 2, end: 4, on: [a] }, { start: 4, end: 6, on: [a, b] }, { start: 6, end: 8, on: [b] }, { start: 8, end: 10, on: [] },
    ]);
    expect(narrowest([{ start: 0, end: 9, itemId: "wide", sensitive: false }, { start: 2, end: 4, itemId: "tight", sensitive: false }])?.itemId).toBe("tight");
  });

  it("the line sheet quotes the sentence the line rests on, with its words marked", () => {
    const at = N1.indexOf("I need");
    const q = sentenceAround(N1, [at, at + "I need to bring her the good flour".length]);
    expect(q.text).toBe("I need to bring her the good flour.");
    expect(q.text.slice(q.mark![0], q.mark![1])).toBe("I need to bring her the good flour");
  });

  it("says days as the prototype does", () => {
    const now = new Date("2026-11-06T12:00:00");
    expect(pageDay("2026-10-04T12:00:00", now)).toBe("Sun, Oct 4");
    expect(pageDay("2025-12-14T12:00:00", now)).toBe("Sun, Dec 14, 2025");
    expect(longDay("2026-10-04T12:00:00", now)).toBe("Sunday, October 4");
    expect(dateBlock("2026-11-16")).toEqual({ weekday: "MON", date: "Nov 16" });
    expect(keptTitle("You said you'd take Sam out to celebrate.")).toBe("You kept it: take Sam out to celebrate");
    expect(keptTitle("Bring Rosa the good flour")).toBe("You kept it: bring Rosa the good flour");
  });
});

describe("from the store", () => {
  const A = "aaaaaaaa-0000-4000-8000-0000000000a7";
  async function world2() {
    const db = await openSqlJsDb();
    await prepareSchema(db, A);
    let minute = 0;
    const store = new UserStore(db, A, { newId: randomUUID, now: () => new Date(Date.UTC(2026, 9, 12, 9, minute++)).toISOString() });
    return { store, repos: repositoriesFor(store) };
  }

  it("Pages, the line sheet and the Source page read the same kept words", async () => {
    const { store, repos } = await world2();
    const rosa = await repos.people.add({ display_name: "Rosa" });
    const sam = await repos.people.add({ display_name: "Sam" });
    const note = await repos.captures.tell(N1, { aiEnabled: false });
    const flour = await repos.memory.remember({ kind: "promise", person_id: rosa.id, subject_type: "user", statement: "You said you'd bring her the good flour" },
      { captureId: note.id, quote: "I need to bring her the good flour" });
    await repos.memory.remember({ kind: "fact", person_id: sam.id, statement: "Sam says hi" }, { captureId: note.id, quote: "Sam says hi" });
    const hurt = await repos.captures.tell(N3, { aiEnabled: false });
    await repos.memory.remember({ kind: "event", person_id: rosa.id, statement: "Rosa's hip surgery is on the 12th", sensitivity: "health", detail: { date: "2026-11-12" } },
      { captureId: hurt.id, quote: "Rosa's hip surgery is on the 12th" });
    const now = new Date("2026-10-12T16:00:00Z");

    const pages = await pagesFor(store, rosa.id, now);
    expect(pages.map((e) => e.type === "note" && e.captureId)).toEqual([hurt.id, note.id]);
    const n1 = pages[1];
    expect(n1.type === "note" && n1.spans.map((s) => N1.slice(s.start, s.end))).toEqual(["I need to bring her the good flour"]);
    // Neither is an intention: each holds a line that isn't the user's own promise (Sam's, the surgery).
    expect(pages.every((e) => e.type === "note" && !e.intention)).toBe(true);

    const facts = await lineFactsFor(store, rosa.id, now);
    expect(Object.values(facts).filter((f) => f.sensitive)).toHaveLength(1);
    expect(Object.values(facts).find((f) => f.sensitive)?.day).toBe("2026-11-12");

    const detail = await lineDetailFor(store, flour.id);
    expect(detail).toEqual(expect.objectContaining({ kindLabel: "Something you said you'd do", openOwnPromise: true, first: "Rosa" }));
    expect(detail!.quote!.text.slice(detail!.quote!.mark![0], detail!.quote!.mark![1])).toBe("I need to bring her the good flour");
    await repos.memory.resolve(flour.id);
    expect((await lineDetailFor(store, flour.id))?.openOwnPromise).toBe(false);

    const source = await sourcePageFor(store, note.id);
    expect(source!.spans.map((s) => [s.personId, N1.slice(s.start, s.end)])).toEqual([
      [rosa.id, "I need to bring her the good flour"], [sam.id, "Sam says hi"],
    ]);
    expect(source!.kept.map((k) => k.person)).toEqual(["Rosa", "Sam"]);
    expect(source!.intention).toBe(false);

    // A saved intention: the user's own sentence, never understood, its one promise.
    const saved = await repos.captures.tell(SAVED, { aiEnabled: false, contextPersonId: rosa.id });
    await repos.memory.remember({ kind: "promise", person_id: rosa.id, subject_type: "user", statement: SAVED, detail: { due_date: "2026-11-07" } },
      { captureId: saved.id, quote: SAVED });
    expect((await sourcePageFor(store, saved.id))!.intention).toBe(true);
    const withSaved = await pagesFor(store, rosa.id, now);
    expect(withSaved.find((e) => e.type === "note" && e.captureId === saved.id)).toEqual(expect.objectContaining({ intention: true }));
  });

  // Founder, 10 Nov 2026: every Tell is logged. A note that kept no line is still on the page of whoever it
  // was told about or names, in full; a note whose reading this phone can't vouch for as "nothing" is not.
  it("a note that kept no line shows on the page of whoever it's about; a declined reading never does", async () => {
    const { store, repos } = await world2();
    const kaiya = await repos.people.add({ display_name: "Kaiya" });
    const ben = await repos.people.add({ display_name: "Ben" });
    const now = new Date(Date.UTC(2026, 10, 10, 9));
    const row = (captureId: string, state: string, reading: unknown) => store.db.run(
      "INSERT INTO understanding (capture_id, state, reading, attempts, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)",
      [captureId, state, reading === null ? null : JSON.stringify(reading), now.toISOString(), now.toISOString()],
    );
    const SILLY = "She is the silliest little girl in the world and is very much into dressing up like princesses";
    const silly = await repos.captures.tell(SILLY, { aiEnabled: true, contextPersonId: kaiya.id });
    await row(silly.id, "done", { tier: "nothing", saved: [], held: [], clarification: null, review_created_at: null, settled: true });
    // Understood with a reading the user declined ("Don't keep this"): not "nothing", so never shown.
    const declined = await repos.captures.tell("Kaiya had a rough night at the hospital", { aiEnabled: true, contextPersonId: kaiya.id });
    await row(declined.id, "done", { tier: "clarify", saved: [], held: [], clarification: null, review_created_at: null, settled: true, answered: [{ index: 0, skip: true }] });
    // Told on another phone: this phone can't say what its reading was, so it waits for a line.
    await repos.captures.tell("Kaiya lost a tooth", { aiEnabled: true, contextPersonId: kaiya.id });
    // Kept as written (understanding off) and naming Ben by his own name, from Today.
    const asWritten = await repos.captures.tell("ben made pancakes", { aiEnabled: false });

    const kaiyas = (await pagesFor(store, kaiya.id, now)).filter((e) => e.type === "note");
    expect(kaiyas).toEqual([expect.objectContaining({ captureId: silly.id, text: SILLY, spans: [] })]);
    const bens = (await pagesFor(store, ben.id, now)).filter((e) => e.type === "note");
    expect(bens).toEqual([expect.objectContaining({ captureId: asWritten.id, text: "ben made pancakes" })]);
    // Undone: gone from the page.
    await repos.captures.remove(silly.id);
    expect((await pagesFor(store, kaiya.id, now)).filter((e) => e.type === "note")).toEqual([]);
  });
});
