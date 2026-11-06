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
import { execFileSync } from "child_process";

/**
 * Rows seeded as an earlier day's lines keep that day as updated_at, which the phone's pull (updated_at past
 * its cursor) never reaches: touching them lets the row guard stamp updated_at now, created_at untouched.
 * Local database container only.
 */
function touchSeeded(userId: string, backdate: { statement: string; at: string }[] = []): void {
  if (!/^[0-9a-f-]{36}$/u.test(userId)) throw new Error("ids only");
  const q = (t: string) => `$q$${t.replace(/\$q\$/gu, "")}$q$`;
  // The row guard stamps created_at on insert; a line told 42 days ago is backdated with the guard skipped
  // for this one connection (session_replication_role), never for anyone else's writes.
  const dated = backdate.map((b) => `update public.memory_items set created_at = ${q(b.at)} where user_id = '${userId}' and statement = ${q(b.statement)};`).join("\n");
  const sql = `begin; set local session_replication_role = replica; ${dated} commit;
    update public.memory_items set statement = statement where user_id = '${userId}';
    update public.memory_item_sources set span_start = span_start where user_id = '${userId}';
    update public.captures set status = status where user_id = '${userId}';`;
  execFileSync("docker", ["exec", "-i", "supabase_db_kinship", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "ignore", "pipe"] });
}

const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Felix"];
/** The promise as the stub's reply words it ("You need to call John", with or without "tonight"), said back by Today. */
const MOMENT = /^You said you'd call John\b.*\.$/u;
const ASK = /^Did you call John\b.*\?$/u;

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

/**
 * What the app's own 30-second tick does (V2SessionProvider), which the harness has no provider for: while
 * the first note's push is still in the outbox (the local PostgREST under the integration runs has been seen
 * to drop a request: "Thread killed by timeout manager", a 504), sync and run the understanding again.
 * Never more often than the app would; nothing is injected.
 */
async function nudgeUntilUnderstood(a: Account): Promise<void> {
  // At most four nudges, sleeping 3, 6, 12 and 24 s before each: never a tight loop, and never more than
  // one sync and one run per nudge. A write the server refused or found in conflict (the outbox records it
  // in last_error) is not retried by the harness at all: the engine's own bounded rebase owns that, and a
  // harness that kept asking would only repeat the same stale version.
  for (let i = 0; i < 4; i++) {
    await settle(3000 * 2 ** i);
    const ops = await a.acct.store.pendingOps();
    const pending = ops.some((o) => o.tbl === "captures");
    const open = await harness.session!.understanding.open();
    if (!pending && open.every((o) => o.state !== "waiting")) return;
    if (ops.some((o) => /conflict|rejected/iu.test(String((o as unknown as { last_error?: unknown }).last_error ?? "")))) {
      throw new Error(`a write is in conflict; not retrying from the harness: ${JSON.stringify(ops.map((o) => [o.tbl, o.kind, (o as unknown as { last_error?: unknown }).last_error]))}`);
    }
    await a.acct.engine.sync().catch(() => undefined);
    await harness.session!.understanding.run().catch(() => undefined);
  }
}

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
    await nudgeUntilUnderstood(a);
    await until(a.r, (s) => s.some((t) => MOMENT.test(t)), "the promise as Today's Moment", 60000);
    if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
    await settle(300);
    const today = texts(a.r);
    expect(today.some((t) => MOMENT.test(t))).toBe(true);
    const momentLine = today.find((t) => MOMENT.test(t))!;
    expect(today.some((t) => /^Today · /u.test(t))).toBe(true);
    expect(canTap(a.r, "Message John")).toBe(true);
    expect(canTap(a.r, "Not now")).toBe(true);
    expect(today).not.toContain("Nothing needs you today.");
    // Never a second line about it: the Moment's own promise is not also a Coming up line.
    expect(a.r.root.findAll((n) => /^Today: Call John/u.test(String(n.props.accessibilityLabel ?? ""))).length).toBe(0);
    await a.acct.engine.sync();
    const promise = (await itemsOf(a, john.id)).find((m) => m.kind === "promise");
    expect(promise).toBeTruthy();
    expect(promise!.status).toBe("active");
    expect(promise!.detail.due_date).toBe(isoDay(new Date()));

    // 2. On John's page: under "You said you'd", in the page's words.
    await show(a.r, { screen: "person", id: john.id });
    await until(a.r, (s) => s.includes("You said you'd"), "John's page", 10000);
    expect(texts(a.r).some((t) => /^Call John/u.test(t))).toBe(true);

    // 3. The detail: why now, no suggestion line (the promise is the action); Message straight into Messages.
    await show(a.r, { screen: "today" });
    await until(a.r, () => canTap(a.r, momentLine), "the Moment", 10000);
    await tap(a.r, momentLine);
    await until(a.r, (s) => s.includes("It's due today."), "the Moment detail", 5000);
    expect(texts(a.r).some((t) => /^You could/u.test(t))).toBe(false);
    await tap(a.r, "Message");
    await settle(300);
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);

    // 4. Back: the promise's own question, with its quiet third answer; Not yet keeps the Moment.
    await back();
    await until(a.r, (s) => s.some((t) => ASK.test(t)), "the return question", 5000);
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
    await until(a.r, (s) => s.some((t) => ASK.test(t)), "the return question again", 5000);
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
    await until(a.r, (s) => s.some((t) => /^Call John/u.test(t)), "the kept promise in What Kinship knows", 10000);
  }, 240000);
});

describe("RSN-07 and SUA-1 through the real screens: an open thread's one check-in, with the suggestion line", () => {
  it("'Did Felix decide?' · Ask Felix; the line beneath the channels opens Messages; Yes, the one optional question, then Nothing today", async () => {
    // An account past first use (the K20 note as a plan: a Coming up line today, never a Moment).
    const a = await account("hand: plan");
    const felix = a.person("Felix");
    await tell(a.r, N6);
    await nudgeUntilUnderstood(a);
    await until(a.r, (s) => s.some((t) => /call John/iu.test(t) && t !== N6), "the first note understood", 60000);
    if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
    // The first note's own sync settles before anything is seeded (a sync in flight is reused, not repeated).
    await a.acct.engine.sync();
    await settle(300);
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
    touchSeeded(a.acct.userId, [{ statement: "Felix is considering moving to Denver", at: told.toISOString() }]);
    await a.acct.engine.sync();
    await settle(300);
    await a.acct.engine.sync();
    const thread = (await itemsOf(a, felix.id)).find((m) => m.kind === "thread")!;

    // 1. Today: the check-in, in a fixed template, the thread in the user's words beneath it.
    await show(a.r, { screen: "today" });
    await until(a.r, (s) => s.includes("Did Felix decide?"), "the thread's check-in as Today's Moment", 15000);
    const today = texts(a.r);
    expect(today).toContain("Felix is considering moving to Denver");
    expect(canTap(a.r, "Ask Felix")).toBe(true);
    // The wedding, ten days off, is no Moment: not the statement, not a week line. (Since FD-30b it may appear
    // as human context under the thread's Moment, "What you've told Kinship": a line, never a second action.)
    const headers = a.r.root.findAll((n) => n.props.accessibilityRole === "header" && typeof n.type === "string").map((n) => [n.props.children].flat().join(""));
    expect(headers.some((t) => /getting married/u.test(t))).toBe(false);

    // 2. Ask Felix: the sheet mentions the wedding (K26) with its opener, and beneath the channels the one SUA-1 line.
    await tap(a.r, "Ask Felix");
    await until(a.r, () => canTap(a.r, "Open Messages"), "the hand-off sheet", 5000);
    const sheet = texts(a.r);
    expect(sheet).toContain("Ask Felix");
    // Electric Garden (FD-30b): the mention lines sit behind a rule, with no bullet; the sheet's own region starts at its label.
    expect(sheet.slice(sheet.indexOf("You could mention"))).toContain("Felix is getting married next month");
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
    // Felix's loop is complete (the H4 bring-back's own "Did you reach John?" example may still be on a first-use Today).
    expect(texts(a.r).some((t) => /^Did you ask Felix|^Anything worth remembering from talking with Felix|^Did Felix decide/u.test(t))).toBe(false);

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
