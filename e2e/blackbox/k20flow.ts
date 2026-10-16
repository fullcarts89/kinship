// The founder's K20 / K19 / K23 steps (device check, 14 Oct) as flows through the real screens and the local
// backend, shared by the replayed shapes (k20.blackbox.tsx) and the live model (live.blackbox.tsx):
// "I need to call John tonight" with the founder's own People.
//   Today: John's line comes promptly, never "Nothing needs you today." beside it, never a bare header.
//   From Today: its detail → Message → back: "Did you reach John?" within a second; Yes records the
//   conversation about it and the line has been done; Not yet records nothing and it stays.
//   From John's page: "You said you'd" → Message → back: the same question, on his page and on Today.
import { AppState } from "react-native";
import type TestRenderer from "react-test-renderer";
import { act } from "react-test-renderer";
import { canTap, mount, setUp, settle, show, signedIn, tap, tell, texts, until } from "./app";
import { earlierLine, serverRows, useReply as chooseReply } from "./localStack";
import { harness } from "./state";

export const N6 = "I need to call John tonight";
const QUIET = "Nothing needs you today.";
export const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John"];

export interface JohnRun {
  /** A captured reply's label (replay); absent with the live model. */
  reply?: string;
  /** The account already has yesterday's "call John tonight" (the founder's had 13 Oct's on 14 Oct). */
  yesterday: boolean;
  /** How long the reading may take (the live model: seconds). */
  readingMs?: number;
}


export async function appState(state: "background" | "active") {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
  await act(async () => { for (const fn of [...(harness.appListeners ?? [])]) fn(state); });
}

/** K11/K19/K24 on the whole screen: never the quiet headline beside John, never "Understanding…" twice. */
function coherent(r: TestRenderer.ReactTestRenderer, step: string, shape: string) {
  const s = texts(r).filter((t) => !/^(Today|People|Done)$/u.test(t));
  const john = s.some((t) => /John/u.test(t));
  expect([shape, step, john && s.includes(QUIET)]).toEqual([shape, step, false]);
  // K24: the dock alone says "Understanding…"; never a second one as Today's headline.
  expect([shape, step, s.filter((t) => /^Understanding/u.test(t)).length <= 1]).toEqual([shape, step, true]);
  // One way to write a date (K19): "Thursday, Oct 15".
  expect([shape, step, s.filter((t) => /^\w+day, \d+ \w+$/u.test(t))]).toEqual([shape, step, []]);
}

/** A local account like the founder's: their People, and 14 Oct's yesterday line when the shape needs it. */
async function account(run: JohnRun) {
  if (run.reply) await chooseReply(N6, run.reply);
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  const john = (await acct.repos.people.list()).find((p) => p.display_name === "John")!;
  if (run.yesterday) {
    const y = new Date(Date.now() - 86_400_000);
    const day = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    earlierLine(acct.userId, { kind: "promise", personId: john.id, subject: "user", statement: "You need to call John tonight", detail: { due_date: day, due_hint: "tonight" }, at: y.toISOString() });
    await acct.engine.sync();
  }
  return { acct, r, john };
}

/** John's line on Today (a promise of the user's is said as "Call John"; a plan in its own words). */
const johnLine = (s: string[]) => s.find((t) => /call John/iu.test(t) && t !== N6 && !/^Kept for/u.test(t));
/** Today's own line about John, by its label ("Today: Call John"), never the Kept card's copy of it. */
async function tapTodayLine(r: TestRenderer.ReactTestRenderer) {
  const line = johnLine(texts(r));
  if (!line) throw new Error(`no John line on Today: ${JSON.stringify(texts(r))}`);
  await tap(r, `Today: ${line}`);
}

/** Whatever the reading asks about this note, answered as the founder would: it is their own call to make. */
async function answerAny(r: TestRenderer.ReactTestRenderer, readingMs: number) {
  await until(r, (s) => !!johnLine(s) || s.some((t) => /^(Whose promise\?|Who is this about\?|One thing to check about)/u.test(t)), "the reading", readingMs);
  for (let step = 0; step < 3; step++) {
    const s = texts(r);
    const waiting = s.find((t) => /^One thing to check about/u.test(t));
    if (waiting && !s.some((t) => /^(Whose promise\?|Who is this about\?)$/u.test(t))) await tap(r, waiting);
    if (canTap(r, "Yours")) await tap(r, "Yours");
    else if (texts(r).includes("Who is this about?") && canTap(r, "John")) await tap(r, "John");
    else break;
    await settle(300);
  }
  if (canTap(r, "Done") && texts(r).includes("Here's what I'll remember.")) await tap(r, "Done");
}

/** K20 (and K19 at every step): told, on Today, Message from its detail, back, answered. */
export async function k20FromToday(shape: string, answer: "yes" | "not_yet", run: JohnRun): Promise<{ shownMs: number; askedMs: number }> {
    const { acct, r } = await account(run);
    const t0 = Date.now();
    await tell(r, N6);
    await answerAny(r, run.readingMs ?? 30000);
    coherent(r, "just told", shape);
    const shownMs = await until(r, () => canTap(r, `Today: ${johnLine(texts(r)) ?? "-"}`), "John's line on Today", run.readingMs ?? 30000);
    coherent(r, "John on Today", shape);
    if (canTap(r, "Got it right")) await tap(r, "Got it right");
    await settle(300);
    coherent(r, "card answered", shape);
    await tapTodayLine(r);
    await tap(r, "Message");
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);
    await appState("background");
    await appState("active");
    const askedMs = await until(r, (s) => s.some((t) => /^Did you reach John/u.test(t)), "the return question", 5000);
    coherent(r, "return question", shape);
    await tap(r, answer === "yes" ? "Yes" : "Not yet");
    await settle(500);
    coherent(r, "answered", shape);
    await acct.engine.sync();
    const contacts = await serverRows<{ memory_item_id: string | null; deleted_at: string | null }>("contact_events", acct.userId);
    const rows = await serverRows<{ id: string; statement: string; status: string; deleted_at: string | null; detail: Record<string, unknown> }>("memory_items", acct.userId);
    const today = rows.filter((m) => m.status === "active" && !m.deleted_at && /call John/iu.test(m.statement) && Object.values(m.detail).includes(new Date().toLocaleDateString("en-CA")));
    expect([shape, today.length]).toEqual([shape, 1]);
    if (answer === "yes") {
      expect([shape, contacts.filter((c) => !c.deleted_at).map((c) => c.memory_item_id)]).toEqual([shape, [today[0].id]]);
      expect([shape, canTap(r, `Today: ${johnLine(texts(r)) ?? "-"}`)]).toEqual([shape, false]);
    } else {
      expect([shape, contacts]).toEqual([shape, []]);
      expect([shape, canTap(r, `Today: ${johnLine(texts(r)) ?? "-"}`)]).toEqual([shape, true]);
    }
    console.log(`K20 (${shape}, ${answer}): John on Today ${shownMs} ms after Tell (${Date.now() - t0} ms in all); return question ${askedMs} ms after foreground`);
    expect(askedMs).toBeLessThanOrEqual(1000);
    return { shownMs, askedMs };
}

/** K23: from John's page, "You said you'd" → Message → back: the same question there and on Today. */
export async function k23FromPage(shape: string, answer: "yes" | "not_yet", run: JohnRun): Promise<{ askedMs: number }> {
    const { acct, r, john } = await account(run);
    await tell(r, N6);
    await answerAny(r, run.readingMs ?? 30000);
    await until(r, () => canTap(r, `Today: ${johnLine(texts(r)) ?? "-"}`), "John's line on Today", run.readingMs ?? 30000);
    if (canTap(r, "Got it right")) await tap(r, "Got it right");
    await show(r, { screen: "person", id: john.id });
    await until(r, (s) => s.some((t) => /call John/iu.test(t)), "the line on John's page", 5000);
    await tap(r, "Message");
    await until(r, () => canTap(r, "Open Messages"), "the hand-off sheet", 5000);
    await tap(r, "Open Messages");
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);
    await appState("background");
    await appState("active");
    const askedMs = await until(r, (s) => s.some((t) => /^Did you reach John\?$/u.test(t)), "the return question on John's page", 5000);
    await show(r, { screen: "today" });
    await until(r, (s) => s.some((t) => /^Did you reach John\?$/u.test(t)), "the same question on Today", 5000);
    await show(r, { screen: "person", id: john.id });
    await until(r, (s) => s.some((t) => /^Did you reach John\?$/u.test(t)), "back on John's page", 5000);
    await tap(r, answer === "yes" ? "Yes" : "Not yet");
    await settle(500);
    expect([shape, texts(r).some((t) => /^Did you reach John/u.test(t))]).toEqual([shape, false]);
    await acct.engine.sync();
    const contacts = (await serverRows<{ memory_item_id: string | null; deleted_at: string | null }>("contact_events", acct.userId)).filter((c) => !c.deleted_at);
    await show(r, { screen: "today" });
    await settle(300);
    if (answer === "yes") {
      expect([shape, contacts.length, !!contacts[0]?.memory_item_id]).toEqual([shape, 1, true]);
      expect([shape, canTap(r, `Today: ${johnLine(texts(r)) ?? "-"}`)]).toEqual([shape, false]);
    } else {
      expect([shape, contacts]).toEqual([shape, []]);
      expect([shape, canTap(r, `Today: ${johnLine(texts(r)) ?? "-"}`)]).toEqual([shape, true]);
    }
    console.log(`K23 (${shape}, ${answer}): return question ${askedMs} ms after foreground, on John's page`);
    expect(askedMs).toBeLessThanOrEqual(1000);
    return { askedMs };
}
