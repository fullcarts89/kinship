// The alpha trust floor (FD-30e; CC-25), through the real screens and the local backend, with the founder's
// People (Anthony, Anthony Lopez, Sam Eden, Chris):
//   1. Chris has a race in two days and a birthday tomorrow: Today speaks of him. Pause Chris from his page:
//      Today says nothing about him, his open reasons are suppressed on the server and a forced refresh makes
//      none; his page says "Paused". Resume: Today may speak of him again.
//   2. Anthony (by name) has a job start, a shared line with Sam and a sister; merge him into Anthony Lopez
//      from Anthony Lopez's page: the picker offers Anthony (a shared name, no score), the preview lists
//      exactly what moves, every memory is on the survivor with its source untouched on the server, Anthony
//      is archived (not deleted) and off "Removed from People"; Undo puts everything back exactly.
//   3. Settings › Export your data writes one file to the app's own cache and hands it to the share sheet
//      (nothing else leaves the phone): the people, every memory with its note's words, the note itself.
//   4. Settings › Delete account, twice confirmed: the server removes every row for the account and the auth
//      user; this phone wipes its stores and ends the session. Needs the real function on a local port
//      (DELETE_ACCOUNT_URL; e2e/serve-delete-account.ts).
// Stand-ins, stated: sql.js for SQLCipher; the share sheet and the file system are recorded, not shown; the
// device wipe is asserted as called (its own proof is src/lib/__tests__/localDataReset.test.ts).
import { Alert } from "react-native";
import { canTap, mount, setUp, settle, show, signedIn, tap, texts, until } from "./app";
import { authUserExists, serverRows } from "./localStack";
import { harness } from "./state";
import { files } from "@/test-utils/memoryFileSystem";

jest.mock("expo-file-system", () => require("@/test-utils/memoryFileSystem"));
const mockShare = jest.fn(() => Promise.resolve());
jest.mock("expo-sharing", () => ({ isAvailableAsync: () => Promise.resolve(true), shareAsync: (...a: unknown[]) => mockShare(...(a as [])) }));
const mockWipe = jest.fn(() => Promise.resolve());
jest.mock("@/lib/localDataReset", () => ({ clearAllLocalUserData: () => mockWipe(), claimDeviceFor: () => Promise.resolve() }));
jest.mock("@/lib/photoStorage", () => ({ removeAllPhotos: () => undefined, removePhotosExcept: () => undefined }));

const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Chris"];
const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Presses the alert button whose text matches (the OS's dialog is the user's to answer). */
function answerAlerts(pick: (title: string, labels: string[]) => string | null) {
  return jest.spyOn(Alert, "alert").mockImplementation((title, _m, buttons) => {
    const labels = (buttons ?? []).map((b) => b.text ?? "");
    const want = pick(String(title), labels);
    const b = (buttons ?? []).find((x) => x.text === want);
    if (b) void b.onPress?.();
  });
}

jest.setTimeout(240_000);

it("trust floor: Paused silences Today and the server; Merge keeps every memory and its source; Export leaves only through the share sheet; Delete leaves no row", async () => {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  const roster = await acct.repos.people.list();
  const id = (n: string) => roster.find((p) => p.display_name === n)!.id;
  const [anthony, lopez, sam, chris] = [id("Anthony"), id("Anthony Lopez"), id("Sam Eden"), id("Chris")];

  // Data like the founder's, written through the app's own repositories and synced by the real engine.
  const note1 = await acct.repos.captures.tell("Chris runs Chicago on the weekend. Anthony starts his new job Monday.", { aiEnabled: false, timeZone: "America/Los_Angeles" });
  await acct.repos.memory.remember({ kind: "event", person_id: chris, statement: "Chris runs Chicago on the weekend",
    detail: { date: day(2), date_precision: "day", event_type: "race", followup_policy: "before" } }, { captureId: note1.id, quote: "Chris runs Chicago on the weekend." });
  await acct.repos.people.setBirthday(chris, `1988-${day(1).slice(5)}`);
  await acct.repos.memory.remember({ kind: "event", person_id: anthony, statement: "Anthony starts his new job Monday",
    detail: { date: day(4), date_precision: "day", event_type: "job_start", followup_policy: "before" } }, { captureId: note1.id, quote: "Anthony starts his new job Monday." });
  const note2 = await acct.repos.captures.tell("Sam and Anthony went to Tahoe. Anthony's sister Maria lives in Reno.", { aiEnabled: false, contextPersonId: anthony, timeZone: "America/Los_Angeles" });
  const tahoe = await acct.repos.memory.remember({ kind: "moment", person_id: sam, statement: "Sam and Anthony went to Tahoe" },
    { captureId: note2.id, quote: "Sam and Anthony went to Tahoe." });
  // Shared with Anthony, as "Yes" to "Is this the Anthony in …?" records it (write_memory_item takes no sharing at insert).
  await acct.store.update("memory_items", tahoe.id, { with_person_ids: [anthony] });
  const sister = await acct.store.create("related_people", { person_id: anthony, relation: "sister", name: "Maria" });
  await acct.repos.memory.remember({ kind: "fact", person_id: anthony, subject_type: "related", subject_related_id: sister.id, statement: "Anthony's sister Maria lives in Reno", detail: { category: "other" } },
    { captureId: note2.id, quote: "Anthony's sister Maria lives in Reno." });
  await acct.repos.contacts.confirm({ person_id: anthony, channel: "text", source: "manual" });
  // A sync already running (the screens' own tick) is joined, not restarted: a second call pushes what the
  // first one started before.
  await acct.engine.sync();
  await acct.engine.sync();
  // The server's refresh, called directly for the seed (Today's own refresh may already be in flight from
  // the first open, and the app's class joins a run in progress: a race, not a product path).
  const refresh = async () => {
    const { error } = await acct.client.rpc("refresh_my_reasons", { p_time_zone: "America/Los_Angeles" });
    if (error) throw error;
    await acct.engine.sync();
    await acct.engine.sync();
  };
  await refresh();
  expect((await serverRows<{ person_id: string; state: string }>("reasons", acct.userId)).filter((x) => x.person_id === chris && x.state === "candidate")).toHaveLength(1);

  // ── 1. Paused (D13) ──
  await show(r, { screen: "today" });
  await until(r, (s) => s.some((t) => /Chris/u.test(t)), "Today to speak of Chris");
  await show(r, { screen: "person", id: chris });
  await until(r, () => canTap(r, "Edit"), "Chris's page");
  await tap(r, "Edit");
  let alerts = answerAlerts((title) => (title === "Pause Chris?" ? "Pause" : null));
  await tap(r, "Pause Chris");
  await until(r, (s) => s.includes("Paused"), "the Paused line on his page");
  alerts.mockRestore();
  await acct.engine.sync();
  await refresh();
  expect((await serverRows<{ state: string }>("people", acct.userId)).find((p) => (p as unknown as { id: string }).id === chris)?.state).toBe("paused");
  const chrisReasons = (await serverRows<{ person_id: string; state: string }>("reasons", acct.userId)).filter((x) => x.person_id === chris);
  expect(chrisReasons.length).toBeGreaterThan(0);
  expect(chrisReasons.every((x) => !["candidate", "scheduled", "surfaced"].includes(x.state))).toBe(true);
  await show(r, { screen: "today" });
  await settle(800);
  expect(texts(r).filter((t) => /Chris/u.test(t))).toEqual([]);
  // Resume, asked from his page.
  await show(r, { screen: "person", id: chris });
  await until(r, () => canTap(r, "Edit"), "Chris's page again");
  await tap(r, "Edit");
  await tap(r, "Resume Chris");
  await until(r, (s) => !s.includes("Paused"), "the Paused line to go");
  await acct.engine.sync();
  await refresh();
  expect((await serverRows<{ person_id: string; state: string }>("reasons", acct.userId)).filter((x) => x.person_id === chris && x.state === "candidate")).toHaveLength(1);
  await show(r, { screen: "today" });
  await until(r, (s) => s.some((t) => /Chris/u.test(t)), "Today to speak of Chris again");

  // ── 2. Merge (PER-05) ──
  const sourcesBefore = await serverRows<{ id: string; memory_item_id: string; deleted_at: string | null }>("memory_item_sources", acct.userId);
  await show(r, { screen: "person", id: lopez });
  await until(r, () => canTap(r, "Edit"), "Anthony Lopez's page");
  await tap(r, "Edit");
  await tap(r, "Merge with someone");
  await until(r, (s) => s.includes("Who is also Anthony Lopez?"), "the merge picker");
  // Plausible matches only: Anthony shares the name; Sam and Chris are not offered.
  expect(texts(r)).toContain("Anthony");
  expect(texts(r).filter((t) => t === "Sam Eden" || t === "Chris")).toEqual([]);
  await tap(r, "Anthony");
  await until(r, (s) => s.includes("Anthony starts his new job Monday"), "the preview of what moves");
  const preview = texts(r);
  expect(preview).toContain("Sam and Anthony went to Tahoe");
  expect(preview).toContain("sister Maria");
  expect(preview.some((t) => /^You messaged|^Messaged/u.test(t))).toBe(true);
  expect(preview.join(" ")).not.toMatch(/\b\d+ (memories|items)\b/u);
  await tap(r, "Merge Anthony into Anthony Lopez");
  await until(r, (s) => s.includes("Merged with Anthony"), "the merged line on the survivor's page", 60_000);
  await until(r, (s) => s.some((t) => /starts his new job/u.test(t)), "the moved memory on the page");
  const items = await serverRows<{ id: string; person_id: string; with_person_ids: string[]; statement: string; deleted_at: string | null }>("memory_items", acct.userId);
  expect(items.filter((m) => m.person_id === anthony && !m.deleted_at)).toEqual([]);
  expect(items.filter((m) => m.person_id === lopez && !m.deleted_at).map((m) => m.statement).sort()).toEqual(["Anthony starts his new job Monday", "Anthony's sister Maria lives in Reno"]);
  expect(items.find((m) => /Tahoe/u.test(m.statement))?.with_person_ids).toEqual([lopez]);
  const sourcesAfter = await serverRows<{ id: string; memory_item_id: string; deleted_at: string | null }>("memory_item_sources", acct.userId);
  expect(sourcesAfter.map((s) => [s.id, s.memory_item_id, s.deleted_at]).sort()).toEqual(sourcesBefore.map((s) => [s.id, s.memory_item_id, s.deleted_at]).sort());
  const people = await serverRows<{ id: string; state: string; deleted_at: string | null }>("people", acct.userId);
  expect(people.find((p) => p.id === anthony)).toMatchObject({ state: "archived", deleted_at: null });
  // Not offered back as "removed": the merge is undone from the survivor's page instead.
  await show(r, { screen: "people" });
  await until(r, () => canTap(r, "Settings"), "People");
  await tap(r, "Settings");
  await settle(300);
  expect(texts(r)).not.toContain("Removed from People");
  // Undo from the survivor's page.
  await show(r, { screen: "person", id: lopez });
  await until(r, () => canTap(r, "Undo: Merged with Anthony"), "Undo");
  alerts = answerAlerts(() => null);
  await tap(r, "Undo: Merged with Anthony");
  await until(r, (s) => !s.includes("Merged with Anthony"), "the merged line to go", 60_000);
  alerts.mockRestore();
  const after = await serverRows<{ id: string; person_id: string; with_person_ids: string[]; statement: string }>("memory_items", acct.userId);
  expect(after.filter((m) => m.person_id === anthony).map((m) => m.statement).sort()).toEqual(["Anthony starts his new job Monday", "Anthony's sister Maria lives in Reno"]);
  expect(after.find((m) => /Tahoe/u.test(m.statement))?.with_person_ids).toEqual([anthony]);
  expect((await serverRows<{ id: string; state: string }>("people", acct.userId)).find((p) => p.id === anthony)?.state).toBe("active");
  // Merge once more, so the deletion below removes a journal row too.
  await tap(r, "Edit");
  await tap(r, "Merge with someone");
  await tap(r, "Anthony");
  await until(r, (s) => s.includes("Anthony starts his new job Monday"), "the preview again");
  await tap(r, "Merge Anthony into Anthony Lopez");
  await until(r, (s) => s.includes("Merged with Anthony"), "merged again", 60_000);
  expect((await serverRows("people_merges", acct.userId)).length).toBe(2);

  // ── 3. Export (SET-04) ──
  files.clear();
  mockShare.mockClear();
  await show(r, { screen: "people" });
  await until(r, () => canTap(r, "Settings"), "People");
  await tap(r, "Settings");
  await until(r, () => canTap(r, "Export your data"), "Settings");
  await tap(r, "Export your data");
  await until(r, () => mockShare.mock.calls.length > 0, "the share sheet");
  const [uri, options] = mockShare.mock.calls[0] as unknown as [string, { mimeType: string }];
  expect(uri).toMatch(/^cache\/kinship-export-\d{4}-\d{2}-\d{2}\.md$/u);
  expect(options.mimeType).toBe("text/markdown");
  const exported = files.get(uri) ?? "";
  expect(exported).toContain("### Anthony Lopez");
  expect(exported).toContain("Anthony starts his new job Monday");
  expect(exported).toContain("Chris runs Chicago on the weekend. Anthony starts his new job Monday.");
  expect(exported).toContain("- Status: removed from People"); // Anthony, merged away, honestly listed
  expect(exported).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu);
  expect([...files.keys()]).toEqual([uri]);

  // ── 4. Delete account (SET-05) ──
  if (!process.env.DELETE_ACCOUNT_URL) throw new Error("DELETE_ACCOUNT_URL is not set: run e2e/serve-delete-account.ts and point the suite at it");
  const signOut = jest.spyOn(harness.client!.auth, "signOut");
  alerts = answerAlerts((title) => (title === "Delete your Kinship account?" ? "Continue" : title === "Last check" ? "Delete my account" : null));
  await tap(r, "Delete account");
  const gone = async () => !(await authUserExists(acct.userId));
  const started = Date.now();
  while (!(await gone())) {
    if (Date.now() - started > 60_000) throw new Error(`the account was not deleted. Alerts: ${JSON.stringify(alerts.mock.calls.map((c) => c[0]))}`);
    await settle(500);
  }
  alerts.mockRestore();
  for (const table of ["people", "captures", "memory_items", "memory_item_sources", "related_people", "contact_events", "reasons", "people_merges", "user_settings", "consents", "user_flag_overrides"]) {
    expect([table, (await serverRows(table, acct.userId)).length]).toEqual([table, 0]);
  }
  await until(r, () => mockWipe.mock.calls.length > 0, "the phone to wipe its stores");
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});
