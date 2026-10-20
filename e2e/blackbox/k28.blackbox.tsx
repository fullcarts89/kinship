// K28 and K26 (founder, 17 Oct), through the real screens, the real session classes, the local backend and
// the real ai-gateway: the founder's own failing case. Susan is getting married to Pedro this fall; Kinship
// knows it, with no day. Opening Message from Susan's page must offer the wedding as something to mention,
// open Messages, ask "Did you reach Susan?" on return, record exactly one conversation on Yes (none on Not
// yet, none when Messages never opened), ask "Anything worth remembering?" once, and never make a Moment or
// a server reason out of it. Then Fluffy: about the vet appointment, Fluffy's own line comes before a memory
// shared with other People. Ben's reason-linked loop is k20.blackbox (K23), run alongside.
import { Alert } from "react-native";
import type TestRenderer from "react-test-renderer";
import { act } from "react-test-renderer";
import { MENTION_OPENERS } from "@/features/today/mentions";
import { canTap, mount, setUp, settle, show, signedIn, tap, tell, texts, unmount, until } from "./app";
import { appState, N6 } from "./k20flow";
import { earlierLine, legacyLine, runTimeZone, serverRows, useReply as chooseReply } from "./localStack";
import { harness } from "./state";

const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Susan"];
/** The one note every account here has told (a captured live reply), so Today is past first use. */
const FIRST_NOTE = { note: N6, reply: "live 1 (13 Oct, 3 of the runs)" };

type Contact = { id: string; person_id: string; channel: string; source: string; reason_id: string | null; moment_type: string | null; memory_item_id: string | null; occurred_at: string; deleted_at: string | null };
type Reason = { id: string; person_id: string; deleted_at: string | null };
type Item = { id: string; person_id: string; statement: string; deleted_at: string | null };

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** This season, by the calendar where the test runs: its name, first and last day (meteorological seasons). */
function thisSeason(now = new Date()): { name: string; start: string; end: string } {
  const m = now.getMonth(); // 0-11
  const y = now.getFullYear();
  const last = (yy: number, mm: number) => isoDay(new Date(yy, mm + 1, 0));
  if (m === 11) return { name: "winter", start: `${y}-12-01`, end: last(y + 1, 1) };
  if (m <= 1) return { name: "winter", start: `${y - 1}-12-01`, end: last(y, 1) };
  if (m <= 4) return { name: "spring", start: `${y}-03-01`, end: last(y, 4) };
  if (m <= 7) return { name: "summer", start: `${y}-06-01`, end: last(y, 7) };
  return { name: "fall", start: `${y}-09-01`, end: last(y, 10) };
}

/** The OS alert's buttons: the destructive one tapped, or the first (for "That didn't open"). */
function answerAlerts(): jest.SpyInstance {
  return jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
    const b = (buttons ?? []).find((x) => x.style === "destructive") ?? buttons?.[0];
    void b?.onPress?.();
  });
}

async function account() {
  await chooseReply(FIRST_NOTE.note, FIRST_NOTE.reply);
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  // An account in use, not first use: one note told (the K20 note, replayed), its card put away.
  await tell(r, FIRST_NOTE.note);
  await until(r, (s) => s.some((t) => /John/u.test(t) && t !== FIRST_NOTE.note), "the first note understood", 30000);
  if (canTap(r, "Got it right")) await tap(r, "Got it right");
  await acct.engine.sync();
  const people = await acct.repos.people.list();
  const person = (name: string) => people.find((p) => p.display_name === name)!;
  return { acct, r, person };
}
type Account = Awaited<ReturnType<typeof account>>;

const contactsOf = async (a: Account, personId: string) => (await serverRows<Contact>("contact_events", a.acct.userId)).filter((c) => c.person_id === personId);
const reasonsOf = async (a: Account, personId: string) => (await serverRows<Reason>("reasons", a.acct.userId)).filter((c) => c.person_id === personId && !c.deleted_at);
const liveItems = async (a: Account) => (await serverRows<Item>("memory_items", a.acct.userId)).filter((m) => !m.deleted_at);

/** Message from the page: the sheet, then Messages; back from it. */
async function messageFromPage(a: Account, personId: string, name = "Susan") {
  await show(a.r, { screen: "person", id: personId });
  await until(a.r, (s) => s.includes(name), `${name}'s page`, 10000);
  await tap(a.r, "Message");
  await until(a.r, () => canTap(a.r, "Open Messages"), "the hand-off sheet", 5000);
  const sheet = texts(a.r);
  const opened = harness.opens.length;
  await tap(a.r, "Open Messages");
  await settle(200);
  await appState("background");
  await appState("active");
  return { sheet, opened: harness.opens.length - opened };
}

describe("K28 + K26: Susan is getting married to Pedro this fall (the founder's case)", () => {
  it("the wedding is remembered without a day, makes no Moment, is offered when reaching out, and the loop completes: Not yet, then Yes once, 'Anything worth remembering?', retraction, a failed open", async () => {
    const a = await account();
    const susan = a.person("Susan");
    const season = thisSeason();
    const wedding = `Susan is getting married to Pedro in the ${season.name}`;
    // Told a few weeks ago, as the founder told it: a milestone with a season and no day, with its note.
    const told = new Date(Date.now() - 20 * 86_400_000).toISOString();
    earlierLine(a.acct.userId, {
      kind: "milestone", personId: susan.id, subject: "person", statement: wedding,
      detail: { milestone_type: "wedding", anniversary: false, date: season.start, date_end: season.end, date_precision: "season", date_hint: `in the ${season.name}` }, at: told,
    });
    await a.acct.engine.sync();
    // 1–2. Kept with provenance; never a proactive Moment (no day).
    const items = await liveItems(a);
    expect(items.map((m) => m.statement)).toContain(wedding);
    await show(a.r, { screen: "today" });
    await settle(500);
    expect(texts(a.r).some((t) => /getting married/u.test(t))).toBe(false);
    expect(await reasonsOf(a, susan.id)).toEqual([]);

    // 3–6. Susan's page → Message: the sheet offers the wedding, in the user's words, with one clear suggestion; Messages opens.
    const first = await messageFromPage(a, susan.id);
    expect(first.sheet).toContain("You could mention");
    expect(first.sheet).toContain(`•  ${wedding}`);
    expect(first.sheet).toContain(MENTION_OPENERS.wedding);
    expect(first.sheet.some((t) => /next week|Oct \d/u.test(t) && /married/u.test(t))).toBe(false); // never given a day it never had
    expect(first.sheet).toContain("When you come back: “Did you reach Susan?”");
    expect(first.opened).toBe(1);
    expect(harness.opens.at(-1)?.channel).toBe("text");

    // 7–8. Back: "Did you reach Susan?" on her page (and on Today); Not yet records nothing and makes no reason.
    await until(a.r, (s) => s.some((t) => t === "Did you reach Susan?"), "the return question on Susan's page", 5000);
    await show(a.r, { screen: "today" });
    await until(a.r, (s) => s.some((t) => t === "Did you reach Susan?"), "the same question on Today", 5000);
    await show(a.r, { screen: "person", id: susan.id });
    await until(a.r, (s) => s.some((t) => t === "Did you reach Susan?"), "back on Susan's page", 5000);
    await tap(a.r, "Not yet");
    await settle(300);
    expect(texts(a.r).some((t) => /^Did you reach/u.test(t))).toBe(false);
    await a.acct.engine.sync();
    expect(await contactsOf(a, susan.id)).toEqual([]);
    expect(await reasonsOf(a, susan.id)).toEqual([]);
    expect(await liveItems(a)).toHaveLength(items.length);

    // 9–13. Again, and Yes: exactly one conversation, in the user's own word, with nothing attached; "You messaged" under Between you;
    // the wedding is not claimed discussed; then the optional "Anything worth remembering?".
    await messageFromPage(a, susan.id);
    await until(a.r, (s) => s.some((t) => t === "Did you reach Susan?"), "the return question again", 5000);
    await tap(a.r, "Yes");
    await until(a.r, (s) => s.some((t) => t === "Anything worth remembering from talking with Susan?"), "the optional prompt on the page", 5000);
    expect(canTap(a.r, "Tell Kinship") && canTap(a.r, "Nothing today")).toBe(true);
    await a.acct.engine.sync();
    const recorded = await contactsOf(a, susan.id);
    expect(recorded.map((c) => [c.channel, c.source, c.reason_id, c.moment_type, c.memory_item_id, c.deleted_at])).toEqual([["text", "manual", null, null, null, null]]);
    expect(await reasonsOf(a, susan.id)).toEqual([]);
    const page = texts(a.r);
    const messaged = page.findIndex((t) => /^You messaged · /u.test(t));
    expect(messaged).toBeGreaterThan(page.indexOf("Between you"));
    expect(page[messaged + 1]).not.toMatch(/married/u); // suggested, never claimed discussed
    // 14. Nothing today: no memory, and the prompt is gone.
    await tap(a.r, "Nothing today");
    await settle(300);
    expect(texts(a.r).some((t) => /^Anything worth remembering/u.test(t))).toBe(false);
    await a.acct.engine.sync();
    expect(await liveItems(a)).toHaveLength(items.length);
    // 15. It survives reopening and sync without duplication.
    await a.acct.engine.sync();
    await unmount();
    a.r = await mount();
    await show(a.r, { screen: "person", id: susan.id });
    await until(a.r, (s) => s.some((t) => /^You messaged · /u.test(t)), "the conversation after reopening", 10000);
    expect(texts(a.r).filter((t) => /^You messaged · /u.test(t))).toHaveLength(1);
    expect((await contactsOf(a, susan.id)).filter((c) => !c.deleted_at)).toHaveLength(1);
    expect(texts(a.r).some((t) => /^Did you reach|^Anything worth/u.test(t))).toBe(false);

    // 16. An incorrect conversation can be retracted, in What Kinship knows.
    const alerts = answerAlerts();
    await show(a.r, { screen: "knows", id: susan.id });
    await until(a.r, (s) => s.some((t) => /^You messaged · /u.test(t)), "the conversation in What Kinship knows", 10000);
    const notThis = a.r.root.findAll((n) => /^Not this: You messaged/u.test(String(n.props.accessibilityLabel ?? "")) && typeof n.props.onPress === "function")[0];
    expect(notThis).toBeTruthy();
    await act(async () => { await notThis.props.onPress(); });
    await settle(300);
    alerts.mockRestore();
    await a.acct.engine.sync();
    expect((await contactsOf(a, susan.id)).filter((c) => !c.deleted_at)).toEqual([]);

    // The channel must have opened: when it doesn't, nothing is asked and nothing recorded.
    const handoffModule = require("@/platform/handoff") as { openChannel: (...a: unknown[]) => Promise<boolean> };
    const realOpen = handoffModule.openChannel;
    handoffModule.openChannel = async () => false;
    const quiet = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    try {
      await show(a.r, { screen: "person", id: susan.id });
      await until(a.r, (s) => s.includes("Susan"), "Susan's page", 10000);
      await tap(a.r, "Message");
      await until(a.r, () => canTap(a.r, "Open Messages"), "the hand-off sheet", 5000);
      await tap(a.r, "Open Messages");
      await settle(300);
      expect(quiet).toHaveBeenCalledWith("That didn't open", expect.any(String));
      await appState("background");
      await appState("active");
      await settle(500);
      expect(texts(a.r).some((t) => /^Did you reach/u.test(t))).toBe(false);
      await a.acct.engine.sync();
      expect((await contactsOf(a, susan.id)).filter((c) => !c.deleted_at)).toEqual([]);
    } finally {
      handoffModule.openChannel = realOpen;
      quiet.mockRestore();
    }
  }, 240000);

  it("a sparse profile: the generic hand-off and its return question, with nothing manufactured to mention", async () => {
    const a = await account();
    const ben = a.person("Ben");
    const { sheet, opened } = await messageFromPage(a, ben.id, "Ben");
    expect(sheet).not.toContain("You could mention");
    expect(opened).toBe(1);
    await until(a.r, (s) => s.some((t) => t === "Did you reach Ben?"), "the return question on Ben's page", 5000);
    await tap(a.r, "Not yet");
    await a.acct.engine.sync();
    expect(await contactsOf(a, ben.id)).toEqual([]);
    expect(await reasonsOf(a, ben.id)).toEqual([]);
  }, 120000);
});

describe("K26: Fluffy before ice skating, about the vet appointment (the founder's screenshot)", () => {
  it("Today's follow-up for Chris offers Fluffy's own line first and leaves the shared ice-skating memory out when Chris has something of his own", async () => {
    const a = await account();
    const chris = a.person("Chris");
    const anthony = a.person("Anthony");
    const sam = a.person("Sam Eden");
    const yesterday = new Date(Date.now() - 86_400_000);
    const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    earlierLine(a.acct.userId, { kind: "fact", personId: chris.id, subject: "person", statement: "Chris has a dog named Fluffy", detail: { category: "pet" }, at: at(4) });
    earlierLine(a.acct.userId, { kind: "fact", personId: chris.id, subject: "person", statement: "Chris is training for a half marathon", detail: { category: "interest" }, at: at(9) });
    legacyLine(a.acct.userId, "Anthony and Sam love ice skating with Chris", chris.id, [anthony.id, sam.id], [
      { person_id: anthony.id, text: "Anthony", name: "Anthony" }, { person_id: sam.id, text: "Sam", name: "Sam Eden" }, { person_id: chris.id, text: "Chris", name: "Chris" },
    ]);
    earlierLine(a.acct.userId, {
      kind: "event", personId: chris.id, subject: "person", statement: "Chris' dog Fluffy has a vet appointment",
      detail: { date: isoDay(yesterday), date_precision: "day", event_type: "medical", followup_policy: "both" }, at: at(4),
    });
    await a.acct.engine.sync();
    // The server's candidates are refreshed at most every ten minutes; the phone's next refresh, forced here, in
    // this run's own time zone (as the phone sends it): "yesterday" above is this run's calendar, and the
    // follow-up's window is the server's reading of the same day. Every hour of the day, in any time zone.
    await harness.session!.reasons.refresh({ force: true, timeZone: runTimeZone() });
    await show(a.r, { screen: "today" });
    // The one Bring back screen of first use (H4) is put away.
    if (canTap(a.r, "Got it")) await tap(a.r, "Got it");
    await until(a.r, (s) => s.some((t) => t === "How did it go for Chris?"), "the follow-up Moment for Chris", 30000);
    await tap(a.r, "Ask how it went");
    await until(a.r, (s) => s.includes("You could mention"), "the hand-off sheet", 5000);
    const sheet = texts(a.r);
    const bullets = sheet.filter((t) => t.startsWith("•  "));
    expect(bullets).toEqual(["•  Chris has a dog named Fluffy", "•  Chris is training for a half marathon"]);
    expect(sheet.some((t) => /ice skating/u.test(t))).toBe(false);
  }, 120000);
});
