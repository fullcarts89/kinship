// Export your data (SET-04): everything Kinship keeps, in the user's terms,
// from the phone's store; shared as a file, never uploaded. No ids, no model
// names, no scores; dates in the user's zone.
import { randomUUID } from "crypto";
import { buildExport, exportFileName, exportInputFrom, exportMarkdown, shareExport } from "@/lib/exportData";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { files } from "@/test-utils/memoryFileSystem";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

jest.mock("expo-file-system", () => require("@/test-utils/memoryFileSystem"));
const mockShare = jest.fn(() => Promise.resolve());
const mockSharing = { available: true };
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => Promise.resolve(mockSharing.available),
  shareAsync: (...args: unknown[]) => mockShare(...(args as [])),
}));

const A = "aaaaaaaa-0000-4000-8000-0000000000e4";
const NOW = new Date("2026-10-30T23:30:00.000Z"); // 4:30 pm in Los Angeles, already Oct 31 in UTC

async function world() {
  const db = await openSqlJsDb();
  await prepareSchema(db, A);
  let t = Date.parse("2026-10-12T20:00:00.000Z");
  const store = new UserStore(db, A, { newId: randomUUID, now: () => new Date((t += 60_000)).toISOString() });
  const repos = repositoriesFor(store);
  const lopez = await repos.people.addPicked({ name: "Anthony Lopez", contactId: "c-1", birthday: "1990-03-14", birthdayYearKnown: true });
  const sam = await repos.people.add({ display_name: "Sam Eden", relationship_label: "friend" });
  const chris = await repos.people.add({ display_name: "Chris" });
  await repos.people.hold(chris.id, "paused");
  const gone = await repos.people.add({ display_name: "Kaiya" });
  await repos.people.archive(gone.id);
  const note = await repos.captures.tell("Anthony and Sam love ice skating with Chris. I said I'd send Sam the rink's link.", { aiEnabled: false, contextPersonId: lopez.id, timeZone: "America/Los_Angeles" });
  const skate = await repos.memory.remember({ kind: "fact", person_id: lopez.id, statement: "Anthony and Sam love ice skating with Chris", detail: { category: "interest" }, with_person_ids: [sam.id, chris.id] },
    { captureId: note.id, quote: "Anthony and Sam love ice skating with Chris." });
  await repos.memory.correct(skate.id, { statement: "Anthony Lopez and Sam love ice skating with Chris" });
  await repos.memory.remember({ kind: "promise", person_id: sam.id, subject_type: "user", statement: "send Sam the rink's link", detail: { due_date: "2026-11-02", date_precision: "day" } },
    { captureId: note.id, quote: "I said I'd send Sam the rink's link." });
  const removed = await repos.memory.remember({ kind: "fact", person_id: sam.id, statement: "Sam hates cilantro", detail: { category: "preference" } }, { userAuthored: true });
  await repos.memory.retract(removed.id);
  await store.create("related_people", { person_id: lopez.id, relation: "sister", name: "Maria" });
  await repos.contacts.confirm({ person_id: sam.id, channel: "call", source: "manual", occurred_at: "2026-10-20T03:30:00.000Z" });
  await repos.settings.update({ time_zone: "America/Los_Angeles" });
  return { store, repos, lopez, sam };
}

it("builds the whole export in the user's terms, with sources and nothing the user never sees", async () => {
  const { store, repos } = await world();
  const input = await exportInputFrom(repos, store, NOW, "America/Los_Angeles");
  const doc = buildExport({ ...input, consents: [{ scope: "ai_processing", granted: true, created_at: "2026-10-12T19:00:00.000Z" }] });
  const text = JSON.stringify(doc);
  // Nothing a user never sees: no ids, no model names, no scores, no sprig seeds.
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu);
  expect(text.toLowerCase()).not.toMatch(/claude|opus|sonnet|anthropic|confidence|sprig|version/u);
  expect(doc.title).toBe("Your Kinship data");
  // Dates and times are the user's: 4:30 pm on Oct 30 in Los Angeles, not Oct 31 UTC.
  expect(doc.exportedAt).toMatch(/Oct 30, 2026, 4:30 PM/u);
  expect(doc.people.map((p) => [p.name, p.status])).toEqual([
    ["Anthony Lopez", "in People"], ["Chris", "paused"], ["Kaiya", "removed from People"], ["Sam Eden", "in People"],
  ]);
  const lopez = doc.people[0];
  expect(lopez.birthday).toBe("Mar 14, 1990");
  expect(lopez.birthdaySource).toBe("Contacts");
  expect(lopez.theirPeople).toEqual(["sister: Maria"]);
  expect(lopez.memories).toHaveLength(1);
  expect(lopez.memories[0]).toMatchObject({
    what: "Anthony Lopez and Sam love ice skating with Chris", kind: "Something true", status: "current", sharedWith: ["Sam Eden", "Chris"],
  });
  expect(lopez.memories[0].sources).toEqual([
    { from: "note 1", words: "Anthony and Sam love ice skating with Chris." },
    { from: "you corrected it", before: "Anthony and Sam love ice skating with Chris" },
  ]);
  const sam = doc.people[3];
  // Shared lines appear with the people they are shared with; removed lines ("Not this") never appear.
  expect(sam.memories.map((m) => m.what)).toEqual(["Anthony Lopez and Sam love ice skating with Chris", "send Sam the rink's link"]);
  expect(sam.youSaidYoud).toEqual(["send Sam the rink's link"]);
  expect(sam.memories[1].when).toBe("By Mon, Nov 2");
  expect(sam.conversations).toEqual([{ how: "You called", when: "Oct 19, 2026, 8:30 PM" }]);
  expect(doc.notes).toEqual([{ ref: "note 1", told: expect.stringMatching(/Oct 12, 2026, 1:0\d PM/u), text: "Anthony and Sam love ice skating with Chris. I said I'd send Sam the rink's link.", aboutPage: "Anthony" }]);
  expect(doc.settings).toEqual({ understanding: "off", timeZone: "America/Los_Angeles", notes: "kept" });
  expect(doc.consents).toEqual([{ what: "Understanding what you tell Kinship", answer: "allowed", when: "Oct 12, 2026, 12:00 PM" }]);
});

it("reads as a document", async () => {
  const { store, repos } = await world();
  const md = exportMarkdown(buildExport(await exportInputFrom(repos, store, NOW, "America/Los_Angeles")));
  expect(md).toMatch(/^# Your Kinship data/u);
  expect(md).toContain("### Anthony Lopez");
  expect(md).toContain("- Status: paused");
  expect(md).toContain("- Anthony Lopez and Sam love ice skating with Chris");
  expect(md).toContain("  - from note 1: “Anthony and Sam love ice skating with Chris.”");
  expect(md).toContain("## Notes, as you wrote them");
  expect(md).toContain("told from Anthony's page");
  expect(md).toContain("not uploaded anywhere");
});

it("shares one file from the app's own cache, and leaves nothing behind when sharing isn't available", async () => {
  const { store, repos } = await world();
  const doc = buildExport(await exportInputFrom(repos, store, NOW, "America/Los_Angeles"));
  files.clear();
  expect(await shareExport(doc, "markdown")).toBe(true);
  expect(mockShare).toHaveBeenCalledWith(expect.stringMatching(/^cache\/kinship-export-\d{4}-\d{2}-\d{2}\.md$/u), expect.objectContaining({ mimeType: "text/markdown" }));
  expect([...files.keys()]).toHaveLength(1);
  expect(await shareExport(doc, "json")).toBe(true);
  expect(mockShare).toHaveBeenLastCalledWith(expect.stringMatching(/\.json$/u), expect.objectContaining({ mimeType: "application/json" }));
  expect(JSON.parse(files.get([...files.keys()].find((k) => k.endsWith(".json"))!)!).title).toBe("Your Kinship data");
  mockSharing.available = false;
  files.clear();
  expect(await shareExport(doc, "json")).toBe(false);
  expect([...files.keys()]).toEqual([]);
  expect(exportFileName("json", "2026-10-30")).toBe("kinship-export-2026-10-30.json");
});

it("an empty account exports an honest, empty document", () => {
  const doc = buildExport({ people: [], related: [], items: [], sources: [], captures: [], contacts: [], settings: null, now: NOW, timeZone: "UTC" });
  expect(doc.people).toEqual([]);
  expect(doc.notes).toEqual([]);
  expect(exportMarkdown(doc)).toContain("No one yet.");
});
