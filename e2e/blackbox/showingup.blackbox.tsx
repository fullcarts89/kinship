// WS-3, showing up (FD-30d and FD-30e, 30 Oct), through the real screens, the real session classes, the
// local backend and the real ai-gateway (the model replayed): a promise of the user's own told today
// ("I need to call John tonight") becomes Today's Moment, its detail says it is due today, Message opens
// Messages, back asks the promise itself ("Did you call John tonight?"; Not yet keeps it, "Didn't happen" is
// offered), and a Yes records exactly one conversation about it and keeps the promise (it leaves "You said
// you'd"). Then an open thread, told 42 days ago, asks for its one check-in ("Did Felix decide?" · Ask
// Felix); beneath the channels the SUA-1 line ("You could invite them to dinner.", from Felix's wedding
// ahead) opens Messages with nothing pre-written; back, Yes, then the one optional question ("Did you make
// a plan?"), then "Anything worth remembering?" → Nothing today; the server holds one conversation about
// the thread and nothing else. Stand-ins as every black-box suite: sql.js, mocked routing and hand-off.
import { MENTION_OPENERS } from "@/features/today/mentions";
import { OUTCOME_ASK, SUGGESTION_COPY } from "@/features/today/suggestions";
import { RETURN_COPY } from "@/features/today/TodayView";
import { canTap, mount, setUp, settle, show, signedIn, tap, tell, texts, until } from "./app";
import { appState, N6 } from "./k20flow";
import { earlierLine, serverRows, useReply as chooseReply } from "./localStack";
import { harness } from "./state";

const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Felix"];

type Contact = { id: string; person_id: string; channel: string; source: string; reason_id: string | null; moment_type: string | null; memory_item_id: string | null; deleted_at: string | null };
type Item = { id: string; kind: string; person_id: string; statement: string; status: string; deleted_at: string | null; detail: Record<string, unknown> };

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** A day `n` days from now at noon local, as the moment a note was told. */
function daysAgoNoon(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function account(reply: string) {
  await chooseReply(N6, reply);
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  const people = await acct.repos.people.list();
  const person = (name: string) => people.find((p) => p.display_name === name)!;
  return { acct, r, person };
}
type Account = Awaited<ReturnType<typeof account>>;

const contactsOf = async (a: Account, personId: string) => (await serverRows<Contact>("contact_events", a.acct.userId)).filter((c) => c.person_id === personId && !c.deleted_at);
const itemsOf = async (a: Account, personId: string) => (await serverRows<Item>("memory_items", a.acct.userId)).filter((m) => m.person_id === personId && !m.deleted_at);

/** Back from the other app, as iOS does it. */
async function back() {
  await appState("background");
  await appState("active");
}

describe("RSN-06 through the real screens: a promise of the user's own, told today", () => {
  it("is Today's Moment on its day; its detail, hand-off and return check keep it; Not yet keeps it, Yes keeps the promise", async () => {
    const a = await account("hand: promise");
    const john = a.person("John");
    // 1. Told: "I need to call John tonight" (the founder's K20 note), kept as a promise of the user's due today.
    await tell(a.r, N6);
    await until(a.r, (s) => s.includes("You said you'd call John tonight."), "the promise as Today's Moment", 120000);
    if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
    await settle(300);
    const today = texts(a.r);
    expect(today).toContain("You said you'd call John tonight.");
    expect(today.some((t) => /^Today · /u.test(t))).toBe(true);
    expect(canTap(a.r, "Message John")).toBe(true);
    expect(canTap(a.r, "Not now")).toBe(true);
    expect(today).not.toContain("Nothing needs you today.");
    // Never a second line about it: the Moment's own promise is not also a Coming up line.
    expect(canTap(a.r, "Today: Call John tonight")).toBe(false);
    await a.acct.engine.sync();
    const promise = (await itemsOf(a, john.id)).find((m) => m.kind === "promise");
    expect(promise).toBeTruthy();
    expect(promise!.status).toBe("active");
    expect(promise!.detail.due_date).toBe(isoDay(new Date()));

    // 2. On John's page: under "You said you'd", in the page's words.
    await show(a.r, { screen: "person", id: john.id });
    await until(a.r, (s) => s.includes("You said you'd"), "John's page", 10000);
    expect(texts(a.r)).toContain("Call John tonight");

    // 3. The detail: why now, no suggestion line (the promise is the action); Message straight into Messages.
    await show(a.r, { screen: "today" });
    await until(a.r, () => canTap(a.r, "You said you'd call John tonight."), "the Moment", 10000);
    await tap(a.r, "You said you'd call John tonight.");
    await until(a.r, (s) => s.includes("It's due today."), "the Moment detail", 5000);
    expect(texts(a.r).some((t) => /^You could/u.test(t))).toBe(false);
    await tap(a.r, "Message");
    await settle(300);
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);

    // 4. Back: the promise's own question, with its quiet third answer; Not yet keeps the Moment.
    await back();
    await until(a.r, (s) => s.includes("Did you call John tonight?"), "the return question", 5000);
    expect(canTap(a.r, RETURN_COPY.putAside)).toBe(true);
    await tap(a.r, "Not yet");
    await until(a.r, () => canTap(a.r, "Message John"), "the Moment again after Not yet", 5000);
    await a.acct.engine.sync();
    expect(await contactsOf(a, john.id)).toEqual([]);

    // 5. Message John from the Moment: the sheet (no suggestion line for a promise), Messages, back, Yes.
    await tap(a.r, "Message John");
    await until(a.r, () => canTap(a.r, "Open Messages"), "the hand-off sheet", 5000);
    const sheet = texts(a.r);
    expect(sheet).toContain("Message John");
    expect(sheet.some((t) => /^You could\b/u.test(t))).toBe(false);
    await tap(a.r, "Open Messages");
    await settle(300);
    expect(harness.opens).toHaveLength(2);
    await back();
    await until(a.r, (s) => s.includes("Did you call John tonight?"), "the return question again", 5000);
    await tap(a.r, "Yes");
    await settle(500);
    // A promise's logistics: nothing more is asked (I2); the Moment is done.
    expect(texts(a.r).some((t) => /^Anything worth remembering/u.test(t))).toBe(false);
    expect(canTap(a.r, "Message John")).toBe(false);
    await a.acct.engine.sync();
    const recorded = await contactsOf(a, john.id);
    expect(recorded.map((c) => [c.channel, c.source, c.moment_type, c.memory_item_id])).toEqual([["text", "return_check", "promise", promise!.id]]);
    // Kept: the promise leaves "You said you'd" and stays in What Kinship knows as written.
    const kept = (await itemsOf(a, john.id)).find((m) => m.id === promise!.id)!;
    expect(kept.status).toBe("resolved");
    await show(a.r, { screen: "person", id: john.id });
    await until(a.r, (s) => s.includes("John"), "John's page", 10000);
    expect(texts(a.r)).not.toContain("You said you'd");
    await show(a.r, { screen: "knows", id: john.id });
    await until(a.r, (s) => s.includes("Call John tonight"), "the kept promise in What Kinship knows", 10000);
  }, 240000);
});

describe("RSN-07 and SUA-1 through the real screens: an open thread's one check-in, with the suggestion line", () => {
  it("'Did Felix decide?' · Ask Felix; the line beneath the channels opens Messages; Yes, the one optional question, then Nothing today", async () => {
    // An account past first use (the K20 note as a plan: a Coming up line today, never a Moment).
    const a = await account("hand: plan");
    const felix = a.person("Felix");
    await tell(a.r, N6);
    await until(a.r, (s) => s.some((t) => /call John/iu.test(t) && t !== N6), "the first note understood", 120000);
    if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
    // Told 42 days ago: an open thread about Felix; and his wedding, ten days ahead (a current line, no Moment).
    const told = daysAgoNoon(42);
    earlierLine(a.acct.userId, {
      kind: "thread", personId: felix.id, subject: "person", statement: "Felix is considering moving to Denver",
      detail: { topic: "moving to Denver", followup_after_days: 42 }, at: told.toISOString(),
    });
    const wedding = daysAgoNoon(-10);
    earlierLine(a.acct.userId, {
      kind: "milestone", personId: felix.id, subject: "person", statement: "Felix is getting married next month",
      detail: { milestone_type: "wedding", anniversary: false, date: isoDay(wedding), date_precision: "day" }, at: daysAgoNoon(3).toISOString(),
    });
    await a.acct.engine.sync();
    const thread = (await itemsOf(a, felix.id)).find((m) => m.kind === "thread")!;

    // 1. Today: the check-in, in a fixed template, the thread in the user's words beneath it.
    await show(a.r, { screen: "today" });
    await until(a.r, (s) => s.includes("Did Felix decide?"), "the thread's check-in as Today's Moment", 15000);
    const today = texts(a.r);
    expect(today).toContain("Felix is considering moving to Denver");
    expect(canTap(a.r, "Ask Felix")).toBe(true);
    expect(today.some((t) => /getting married/u.test(t))).toBe(false); // the wedding, ten days off, is no Moment

    // 2. Ask Felix: the sheet mentions the wedding (K26) with its opener, and beneath the channels the one SUA-1 line.
    await tap(a.r, "Ask Felix");
    await until(a.r, () => canTap(a.r, "Open Messages"), "the hand-off sheet", 5000);
    const sheet = texts(a.r);
    expect(sheet).toContain("Ask Felix");
    expect(sheet).toContain("•  Felix is getting married next month");
    expect(sheet).toContain(MENTION_OPENERS.wedding);
    expect(sheet).toContain(SUGGESTION_COPY.plan);
    expect(sheet.indexOf(SUGGESTION_COPY.plan)).toBeGreaterThan(sheet.indexOf("Open Messages"));
    expect(sheet.filter((t) => /^You could (?:invite|offer|ask if|send|suggest)/u.test(t))).toHaveLength(1);

    // 3. The line tapped: Messages opens, nothing pre-written, and that is all that happened.
    await tap(a.r, SUGGESTION_COPY.plan);
    await settle(300);
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);
    await a.acct.engine.sync();
    expect(await contactsOf(a, felix.id)).toEqual([]);

    // 4. Back: the thread's question; Yes; then the one optional question; then "Anything worth remembering?".
    await back();
    await until(a.r, (s) => s.includes("Did you ask Felix about it?"), "the return question", 5000);
    expect(canTap(a.r, RETURN_COPY.putAside)).toBe(false); // only a promise offers "Didn't happen"
    await tap(a.r, "Yes");
    await until(a.r, (s) => s.includes(OUTCOME_ASK.plan), "the one optional question after a Yes that followed the line", 5000);
    expect(canTap(a.r, "Yes") && canTap(a.r, "Not yet")).toBe(true);
    await tap(a.r, "Yes");
    await until(a.r, (s) => s.includes("Anything worth remembering from talking with Felix?"), "the usual question after", 5000);
    await tap(a.r, "Nothing today");
    await settle(300);
    expect(texts(a.r).some((t) => /^Did you|^Anything worth|^Did Felix decide/u.test(t))).toBe(false);

    // 5. The server: one conversation, about the thread, naming its kind; the thread itself untouched (a Tell may answer it).
    await a.acct.engine.sync();
    const recorded = await contactsOf(a, felix.id);
    expect(recorded.map((c) => [c.channel, c.source, c.moment_type, c.memory_item_id])).toEqual([["text", "return_check", "thread", thread.id]]);
    expect((await itemsOf(a, felix.id)).find((m) => m.id === thread.id)!.status).toBe("active");
    // Once: back on Today, the check-in doesn't return, and nothing is manufactured in its place.
    await show(a.r, { screen: "today" });
    await settle(500);
    expect(texts(a.r)).not.toContain("Did Felix decide?");
  }, 240000);
});
