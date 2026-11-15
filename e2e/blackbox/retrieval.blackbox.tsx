// CMR-1 retrievability, proven through the real screens (founder, 15 Nov 2026: "the extraction accounting
// metric alone does not satisfy the 100% retrievability requirement"): every retained Tell is found where
// its words belong, whatever its understanding did, after a relaunch, and on another phone of the same
// account, where the server's own word (`captures.understanding`) places it with no local row at all.
//
//   (a) understood with a line      → the person's Pages, marked; the line's source opens the note
//   (b) understood, nothing kept    → the person's Pages, the words in full
//   (c) naming no one in People     → Your words (People's foot), with the honest card copy
//   (d) understanding failed        → still found (the stub has no reply for the note: the gateway fails it)
//   (e) a reading declined          → the Tell remains on the page, the declined line nowhere
//   (f) Undo                        → gone everywhere, and stays gone
//   (g) relaunch                    → a fresh mount on the same store finds all of the above
//   (h) a second device             → a fresh store for the same account finds all of the above, by the
//                                     server's word, with no local understanding row
//   (i) a question held elsewhere   → shows as waiting on the other phone, never lost; answered there,
//                                     "Don't keep this" keeps the Tell
//
// The notebook look (`notebook_deck`) for these local accounts alone. The real session classes, the local
// Supabase stack, the RC gateway (GATEWAY_URL) and the model stub's captured replies. Nothing seeded.
// Two Anthonys and two Sams make the gateway ask which, whatever the model said, so (b) runs on an account
// where the note's names are unique or unknown, and (e)/(i) on the founder's roster.
import { Alert } from "react-native";
import { act } from "react-test-renderer";
import { canTap, mount, setUp, settle, show, signedIn, tap, tapLast, texts, type, unmount, until } from "./app";
import { flagOn, serverRows, useReply } from "./localStack";
import { harness } from "./state";

const K4 = "Anthony and Sam love ice skating with Chris";
const K4_NOTHING = "live 1 (13 Oct, 1 of the runs)";
const K4_ASKS = "hand: on no one";
const N6 = "I need to call John tonight";
const N6_REPLY = "live 1 (13 Oct, 3 of the runs)";
/** Names Sam, so with two Sams in People the gateway asks which (narrative s10, a captured live reply). */
const S10 = "I promised I'd bring Sam soup this Saturday because she's been overwhelmed at work. Sam hasn't decided which kind she wants.";
const S10_REPLY = "live 2026-10-30T22-37-51 (30 Oct 2026, synthetic roster, s10 general; 2 proposals)";
/** No captured reply exists for these: the stub answers 400 and the gateway fails the note (as notebook J1 met by accident). */
const BROKEN_JOHN = "John brought the good bread this morning, still warm.";
const BROKEN_ALONE = "Lunch was lovely, with the good bread, still warm.";

type Capture = { id: string; raw_text: string; status: string; deleted_at: string | null; understanding?: string | null };
type Item = { id: string; person_id: string; statement: string; status: string; deleted_at: string | null };
type R = Awaited<ReturnType<typeof mount>>;

afterEach(unmount);

/** Everything on screen as one string (a marked note comes in pieces). */
const page = (r: R) => texts(r).join("");
/** The notes on the Pages lens on screen, by capture id (the Kept card in the dock repeats a note's words: never counted). */
const notesOn = (r: R): string[] => [...new Set(
  r.root.findAll((n) => typeof n.props.testID === "string" && /^note-/u.test(n.props.testID)).map((n) => String(n.props.testID).slice("note-".length)),
)];

/** The app's own understanding tick, which the harness has no provider for (bounded, never tight). */
async function understood(r: R, ok: (s: string[]) => boolean, what: string) {
  for (let i = 0; i < 8; i++) {
    if (ok(texts(r))) return;
    await harness.session!.understanding.run().catch(() => undefined);
    try {
      await until(r, ok, what, 15000);
      return;
    } catch {
      // the next tick
    }
  }
  throw new Error(`timed out: ${what}. On screen: ${JSON.stringify(texts(r))}`);
}

/**
 * Puts a review away as the user does (Done), waiting a moment for one that opens a beat after the Kept
 * card: the review covers the dock until it is closed. Nothing is decided by it (Gate A).
 */
async function putAway(r: R) {
  for (let i = 0; i < 12 && !canTap(r, "Done"); i++) await settle(200);
  if (canTap(r, "Done")) await tapLast(r, "Done");
  await settle(200);
}

/** Tells through the notebook Tell page: the pill, the paper, Keep. */
async function tellOnPage(r: R, words: string) {
  await show(r, { screen: "today" });
  if (canTap(r, "Done")) await tapLast(r, "Done");
  await tap(r, "Tell Kinship something");
  await until(r, (s) => s.includes("About anyone. In your own words."), "the Tell page", 5000);
  await type(r, /^Tell Kinship$/u, words);
  await tap(r, "Keep");
}

/**
 * The review's "Don't keep this" on every question: nothing kept, the Tell itself stays. Done is not
 * tapped here: Done puts the Kept card away too (the user is finished with it), so what the card says
 * afterwards is read first, by the caller.
 */
async function declineAll(r: R) {
  for (let i = 0; i < 6; i++) {
    const skip = canTap(r, "Don't keep this") ? "Don't keep this" : canTap(r, "Don’t keep") ? "Don’t keep" : null;
    if (!skip) break;
    await tapLast(r, skip);
    await settle(300);
  }
}

/** The person's Pages (or their sparse page, when nothing at all is kept about them). */
async function pagesOf(r: R, personId: string): Promise<string> {
  await show(r, { screen: "person", id: personId, params: { lens: "pages" } });
  await until(r, (s) => s.includes("Pages") || s.some((t) => /will be here/u.test(t)), "the person's notebook", 10000);
  await settle(400);
  return page(r);
}

async function yourWords(r: R): Promise<string> {
  await show(r, { screen: "people" });
  await until(r, () => canTap(r, "Your words"), "the Your words row on People", 10000);
  harness.pushes = [];
  await tap(r, "Your words");
  expect(harness.pushes).toContain("/v2/words");
  await show(r, { screen: "words" });
  await until(r, (s) => s.includes("Your words"), "the Your words page", 10000);
  await settle(300);
  return page(r);
}

/** The same account on another phone: a fresh store, synced and understood once (the app's own passes). */
async function anotherDevice(credentials: Awaited<ReturnType<typeof signedIn>>["credentials"]) {
  const dev = await signedIn({ reuse: credentials, maxAttempts: 1 });
  const r = await mount();
  await dev.engine.sync();
  await harness.session!.understanding.run();
  await dev.engine.sync();
  return { dev, r };
}

const captures = async (userId: string) => (await serverRows<Capture>("captures", userId)).filter((c) => !c.deleted_at);
const byText = (rows: Capture[], text: string) => rows.filter((c) => c.raw_text === text);
const noLocalRows = async (ids: string[]) => {
  for (const id of ids) expect(await harness.session!.understanding.get(id)).toBeNull();
};

describe("every retained Tell is findable through the screens", () => {
  it("(a) (b) (d) (g) (h) (f): a line, nothing kept, a failure, on the person's Pages; the same after a relaunch and on two more devices; Undo gone for good", async () => {
    const acct = await signedIn({ maxAttempts: 1 });
    await flagOn(acct.userId, "notebook_deck");
    const r = await mount();
    await setUp(r, ["John", "Chris"]);
    await acct.engine.sync();
    const people = await acct.repos.people.list();
    const john = people.find((p) => p.display_name === "John")!;
    const chris = people.find((p) => p.display_name === "Chris")!;

    // (a) Understood with a line: John's Pages, the words marked; the mark opens the line, the line opens the note.
    await useReply(N6, N6_REPLY);
    await tellOnPage(r, N6);
    await understood(r, (s) => s.some((t) => /^Kept for John/u.test(t) || /Here’s what I’ll remember/u.test(t)), "the N6 note understood");
    await putAway(r);
    await acct.engine.sync();
    const [n6] = byText(await captures(acct.userId), N6);
    expect(n6?.status).toBe("extracted");
    const johnLine = (await serverRows<Item>("memory_items", acct.userId)).find((m) => m.person_id === john.id && !m.deleted_at)!;
    expect(johnLine).toBeTruthy();
    expect(await pagesOf(r, john.id)).toContain(N6);
    const mark = r.root.findAll((n) => n.props.testID === `kept-${johnLine.id}` && typeof n.props.onPress === "function")[0];
    expect(mark).toBeTruthy();
    await act(async () => { await mark.props.onPress(); });
    await settle(300);
    const open = r.root.findAll((n) => /open the note/u.test(String(n.props.accessibilityLabel ?? "")) && typeof n.props.onPress === "function")[0];
    expect(open).toBeTruthy();
    harness.pushes = [];
    await act(async () => { await open.props.onPress(); });
    await settle(200);
    expect(harness.pushes.some((h) => h.startsWith(`/v2/source/${n6.id}`))).toBe(true);
    await show(r, { screen: "source", captureId: n6.id });
    await until(r, (s) => s.includes("What Kinship kept from this"), "the Source page", 10000);
    expect(page(r)).toContain(N6);

    // (b) Understood, nothing kept: the card says where; Chris's Pages hold the words in full.
    await useReply(K4, K4_NOTHING);
    await tellOnPage(r, K4);
    await understood(r, (s) => s.includes("Kept on Chris's page."), "the nothing-kept card");
    await acct.engine.sync();
    const [nothing] = byText(await captures(acct.userId), K4);
    expect(nothing?.status).toBe("extracted");
    expect(await pagesOf(r, chris.id)).toContain(K4);
    expect(notesOn(r)).toEqual([nothing.id]);

    // (d) Understanding failed: the honest copy, and the words on John's Pages all the same.
    await tellOnPage(r, BROKEN_JOHN);
    await understood(r, (s) => s.includes("Couldn't understand this one. Your words are kept on John's page."), "the honest failure card");
    expect(texts(r).join(" ")).not.toMatch(/Nothing to remember|Your note is saved/u);
    await acct.engine.sync();
    const [broken] = byText(await captures(acct.userId), BROKEN_JOHN);
    expect(broken?.status).toBe("failed");
    const johns = await pagesOf(r, john.id);
    expect(johns).toContain(N6);
    expect(johns).toContain(BROKEN_JOHN);

    // (g) Relaunch: a fresh mount on the same store finds everything.
    const r2 = await mount();
    const johns2 = await pagesOf(r2, john.id);
    expect(johns2).toContain(N6);
    expect(johns2).toContain(BROKEN_JOHN);
    await pagesOf(r2, chris.id);
    expect(notesOn(r2)).toEqual([nothing.id]);
    await show(r2, { screen: "source", captureId: n6.id });
    await until(r2, (s) => s.includes("What Kinship kept from this"), "the Source page after relaunch", 10000);

    // (h) A second device: a fresh store, no understanding rows; the server's word places every note.
    const second = await anotherDevice(acct.credentials);
    await noLocalRows([n6.id, nothing.id, broken.id]);
    const rows = await captures(acct.userId);
    expect("understanding" in rows[0]).toBe(true); // the CMR-1 column is on the local database
    const word = (id: string) => rows.find((c) => c.id === id)?.understanding;
    expect([word(n6.id), word(nothing.id), word(broken.id)]).toEqual(["kept", "nothing", "failed"]);
    const johns3 = await pagesOf(second.r, john.id);
    expect(johns3).toContain(N6);
    expect(johns3).toContain(BROKEN_JOHN);
    await pagesOf(second.r, chris.id);
    expect(notesOn(second.r)).toEqual([nothing.id]);
    await show(second.r, { screen: "source", captureId: n6.id });
    await until(second.r, (s) => s.includes("What Kinship kept from this"), "the Source page on the second device", 10000);
    expect(page(second.r)).toContain(N6);

    // (f) Undo, from the note's Source page on the second device (Delete this note: the Undo of a settled note):
    // gone from John's Pages and the server, and still gone on a third device. The OS asks first; the user confirms.
    const alerts = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      const b = (buttons ?? []).find((x) => x.style === "destructive") ?? buttons?.[0];
      void b?.onPress?.();
    });
    await tap(second.r, "Delete this note");
    await settle(300);
    alerts.mockRestore();
    await second.dev.engine.sync();
    expect(byText(await serverRows<Capture>("captures", acct.userId), N6).every((c) => c.deleted_at)).toBe(true);
    expect((await serverRows<Item>("memory_items", acct.userId)).filter((m) => m.id === johnLine.id && !m.deleted_at && m.status === "active")).toHaveLength(0);
    const johns4 = await pagesOf(second.r, john.id);
    expect(johns4).not.toContain(N6);
    expect(johns4).toContain(BROKEN_JOHN);
    const third = await anotherDevice(acct.credentials);
    const johns5 = await pagesOf(third.r, john.id);
    expect(johns5).not.toContain(N6);
    expect(johns5).toContain(BROKEN_JOHN);
  });

  it("(e) (i) (g) (h): a question held on one phone waits on another, never lost; declined there, the Tell stays on the page on every device", async () => {
    const acct = await signedIn({ maxAttempts: 1 });
    await flagOn(acct.userId, "notebook_deck");
    const r = await mount();
    await setUp(r, ["John", "Chris", "Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty"]);
    await acct.engine.sync();
    const chris = (await acct.repos.people.list()).find((p) => p.display_name === "Chris")!;

    // (e) Told here and declined here: "Which Sam?" → Don't keep this → the card says nothing was added and where the
    // words stay (two Sams share the name, so on no one's page: under Your words). The Tell remains.
    await useReply(S10, S10_REPLY);
    await tellOnPage(r, S10);
    await understood(r, (s) => s.some((t) => /Which Sam|thing(s)? to check/u.test(t)), "the Sam question");
    await declineAll(r);
    await understood(r, (s) => s.some((t) => /Nothing added from that one/u.test(t)), "the declined card");
    expect(texts(r).join(" ")).toContain("Your words stay under “Your words” in People.");
    expect(texts(r).join(" ")).not.toMatch(/Nothing to remember|Nothing kept from that one/u);
    await putAway(r);
    await acct.engine.sync();
    const [soup] = byText(await captures(acct.userId), S10);
    expect(soup.status).toBe("extracted");
    expect((await serverRows<Item>("memory_items", acct.userId)).filter((m) => !m.deleted_at && m.status === "active")).toHaveLength(0);
    expect(await yourWords(r)).toContain(S10);

    // (i, first half) Told here: two Anthonys and two Sams, so the gateway asks which; the questions are left waiting.
    await useReply(K4, K4_ASKS);
    await tellOnPage(r, K4);
    await understood(r, (s) => s.some((t) => /Which Anthony|Which Sam|thing(s)? to check/u.test(t)), "the question");
    await acct.engine.sync();
    const [asked] = byText(await captures(acct.userId), K4);
    expect(asked.status).toBe("needs_review");
    // Not placed while the question waits (H24), here or after a relaunch.
    await pagesOf(r, chris.id);
    expect(notesOn(r)).toEqual([]);
    const r2 = await mount();
    await pagesOf(r2, chris.id);
    expect(notesOn(r2)).toEqual([]);

    // (i) A second device: the question waits here too, never lost, and the note is not on Chris's Pages yet.
    const second = await anotherDevice(acct.credentials);
    await show(second.r, { screen: "today" });
    await until(second.r, (s) => s.some((t) => /Which Anthony|Which Sam|A question/u.test(t)), "the waiting question on the second device", 20000);
    await pagesOf(second.r, chris.id);
    expect(notesOn(second.r)).toEqual([]);
    // Answered here with "Don't keep this": the question is gone from Today, nothing added, and the Tell stays, on
    // Chris's Pages (the Kept card with its copy belongs to the phone that told the note: proven above, on it).
    await show(second.r, { screen: "today" });
    const line = texts(second.r).find((t) => /Which Anthony|Which Sam|A question/u.test(t))!;
    if (canTap(second.r, line)) await tap(second.r, line);
    else if (canTap(second.r, "Answer")) await tap(second.r, "Answer");
    await until(second.r, () => canTap(second.r, "Don't keep this") || canTap(second.r, "Don’t keep"), "the question's choices", 10000);
    await declineAll(second.r);
    await harness.session!.understanding.run();
    await second.dev.engine.sync();
    await putAway(second.r);
    await show(second.r, { screen: "today" });
    await until(second.r, (s) => !s.some((t) => /Which Anthony|Which Sam|A question/u.test(t)), "the question gone from Today", 15000);
    expect((await serverRows<Item>("memory_items", acct.userId)).filter((m) => !m.deleted_at && m.status === "active")).toHaveLength(0);
    expect(await pagesOf(second.r, chris.id)).toContain(K4);
    expect(notesOn(second.r)).toEqual([asked.id]);
    expect(await yourWords(second.r)).toContain(S10);

    // (h) A third device: no understanding row; the server's word "declined" places the Tell on Chris's Pages.
    const third = await anotherDevice(acct.credentials);
    await noLocalRows([asked.id]);
    const rows = await captures(acct.userId);
    expect(rows.find((c) => c.id === asked.id)?.understanding).toBe("declined");
    // S10 held two proposals: one declined, one the server could place nowhere. Its word is `partial` (a place
    // left out outranks the decline on the server); the Tell is found all the same, with the place marked.
    expect(["declined", "partial"]).toContain(rows.find((c) => c.id === soup.id)?.understanding);
    expect(await pagesOf(third.r, chris.id)).toContain(K4);
    expect(notesOn(third.r)).toEqual([asked.id]);
    expect(await yourWords(third.r)).toContain(S10);
    // And nothing marked on it: the declined line is nowhere.
    expect(third.r.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("kept-"))).toHaveLength(0);
  });

  it("(c) a Tell about no one in People is under Your words, with the honest copy, after a relaunch and on another device", async () => {
    const acct = await signedIn({ maxAttempts: 1 });
    await flagOn(acct.userId, "notebook_deck");
    const r = await mount();
    await setUp(r, ["Ben", "John"]);
    await acct.engine.sync();

    // Understood with nothing in it, naming no one in People.
    await useReply(K4, K4_NOTHING);
    await tellOnPage(r, K4);
    await understood(r, (s) => s.includes("Kept your words, under “Your words” in People."), "the card naming the place");
    // Understanding failed, naming no one.
    await tellOnPage(r, BROKEN_ALONE);
    await understood(r, (s) => s.includes("Couldn't understand this one. Your words are kept under “Your words” in People."), "the honest failure card");
    await acct.engine.sync();
    const words = await yourWords(r);
    expect(words).toContain(K4);
    expect(words).toContain(BROKEN_ALONE);
    expect(words).not.toMatch(/\d+ notes/u);

    // Relaunch.
    const r2 = await mount();
    const again = await yourWords(r2);
    expect(again).toContain(K4);
    expect(again).toContain(BROKEN_ALONE);

    // Another device: no local rows; the server's word places both.
    const second = await anotherDevice(acct.credentials);
    const rows = await captures(acct.userId);
    await noLocalRows(rows.map((c) => c.id));
    expect(rows.map((c) => [c.raw_text, c.status, c.understanding]).sort()).toEqual([[K4, "extracted", "nothing"], [BROKEN_ALONE, "failed", "failed"]].sort());
    const elsewhere = await yourWords(second.r);
    expect(elsewhere).toContain(K4);
    expect(elsewhere).toContain(BROKEN_ALONE);
    // An account with nothing about no one never shows the row at all.
    const empty = await signedIn();
    await flagOn(empty.userId, "notebook_deck");
    const r5 = await mount();
    await setUp(r5, ["Ben"]);
    await show(r5, { screen: "people" });
    await settle(300);
    expect(canTap(r5, "Your words")).toBe(false);
  });
});
