// K27 (founder, 17–18 Oct), the exact scenario through the real screens, the real session classes, the
// local backend and the real ai-gateway (the model replayed from live replies kept on 18 Oct; live with
// LIVE=1): "Chris has a dog named Fluffy" is told; Fluffy's vet appointment was yesterday; Today's "How did
// it go for Chris?" → Ask how it went → Messages → back → Yes → "Anything worth remembering?" → Tell Kinship
// → "Fluffy will make a full recovery". Kinship keeps it for Chris, never asks "Who is Fluffy?", never holds
// it as Chris's health. Twice: with the row note 1 now makes, and on an older account where note 1 was kept
// as a plain fact with no row (no migration: the words alone connect them).
import type TestRenderer from "react-test-renderer";
import { canTap, mount, setUp, settle, show, signedIn, tap, tell, texts, until } from "./app";
import { appState, N6 } from "./k20flow";
import { earlierLine, runTimeZone, serverRows, useReply as chooseReply } from "./localStack";
import { harness } from "./state";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John"];
const NOTE1 = "Chris has a dog named Fluffy";
const NOTE2 = "Fluffy will make a full recovery";
const LABEL: Record<string, string> = {
  [NOTE1]: "live 1 (18 Oct, K27, founder People)",
  [NOTE2]: "live 1 (18 Oct, K27, told about Chris)",
  [N6]: "live 1 (13 Oct, 3 of the runs)",
};
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Item = { id: string; person_id: string; statement: string; status: string; sensitivity: string; subject_type: string; subject_related_id: string | null; deleted_at: string | null };
type Related = { id: string; person_id: string; relation: string; name: string | null; deleted_at: string | null };
type Review = { capture_id: string; items: unknown[] };

async function account() {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await acct.engine.sync();
  const chris = (await acct.repos.people.list()).find((p) => p.display_name === "Chris")!;
  return { acct, r, chris };
}
type Account = Awaited<ReturnType<typeof account>>;

async function told(a: Account, note: string) {
  if (!LIVE) await chooseReply(note, LABEL[note]);
  await tell(a.r, note);
  await until(a.r, (s) => s.some((t) => READING.test(t)), `the reading of "${note}"`, 60000);
  await settle(300);
}

/** Yesterday's vet appointment, as the founder's account had it (the follow-up Moment comes from the server). */
function vetYesterday(a: Account) {
  const y = new Date(Date.now() - 86_400_000);
  earlierLine(a.acct.userId, {
    kind: "event", personId: a.chris.id, subject: "person", statement: "Chris' dog Fluffy has a vet appointment",
    detail: { date: isoDay(y), date_precision: "day", event_type: "medical", followup_policy: "both" }, at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  });
}

/** The founder's path: the Moment, the hand-off, Yes, the prompt, Tell Kinship, note 2. */
async function recoveryAfterFollowUp(a: Account) {
  await a.acct.engine.sync();
  await harness.session!.reasons.refresh({ force: true, timeZone: runTimeZone() }); // this run's own calendar, as the phone sends it
  await show(a.r, { screen: "today" });
  if (canTap(a.r, "Got it")) await tap(a.r, "Got it");
  await until(a.r, (s) => s.some((t) => t === "How did it go for Chris?"), "the follow-up Moment for Chris", 30000);
  await tap(a.r, "Ask how it went");
  await until(a.r, () => canTap(a.r, "Open Messages"), "the hand-off sheet", 5000);
  await tap(a.r, "Open Messages");
  await settle(200);
  await appState("background");
  await appState("active");
  await until(a.r, (s) => s.some((t) => /^Did you ask Chris how it went\?$/u.test(t)), "the return question", 5000);
  await tap(a.r, "Yes");
  await until(a.r, (s) => s.some((t) => /^How did it go for Chris\? Anything worth remembering\?$/u.test(t)), "the optional prompt", 5000);
  await tap(a.r, "Tell Kinship");
  await settle(200);
  if (!LIVE) await chooseReply(NOTE2, LABEL[NOTE2]);
  await tell(a.r, NOTE2);
  await until(a.r, (s) => s.some((t) => READING.test(t)), "the reading of note 2", 60000);
  await settle(300);
  const shown = texts(a.r);
  // Never "Who is Fluffy?", never a question, never held for Chris's health.
  expect(shown.some((t) => /Who is Fluffy|isn't in your people|One thing to check|things to check|Remember this/u.test(t))).toBe(false);
  expect(shown.some((t) => /^Kept for Chris/u.test(t))).toBe(true);
  expect(shown.some((t) => /Fluffy will make a full recovery/u.test(t))).toBe(true);
  await a.acct.engine.sync();
  const items = (await serverRows<Item>("memory_items", a.acct.userId)).filter((m) => !m.deleted_at);
  const line = items.find((m) => /Fluffy will make a full recovery/u.test(m.statement))!;
  expect([line.person_id, line.status, line.sensitivity]).toEqual([a.chris.id, "active", "none"]);
  const reviews = (await serverRows<Review>("capture_reviews", a.acct.userId));
  expect(reviews.filter((rv) => (rv.items ?? []).length > 0)).toEqual([]); // nothing waits on the user
  // On Chris's page, as his own line.
  await show(a.r, { screen: "person", id: a.chris.id });
  await until(a.r, (s) => s.some((t) => /Fluffy will make a full recovery/u.test(t)), "the line on Chris's page", 10000);
  return { items, line };
}

describe("K27: Fluffy, Chris's dog, is known when a later note names her alone", () => {
  it("told 'Chris has a dog named Fluffy': Fluffy becomes Chris's related dog (a row), and the recovery after the follow-up is Chris's line, no question", async () => {
    const a = await account();
    await told(a, NOTE1);
    if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
    await a.acct.engine.sync();
    const related = (await serverRows<Related>("related_people", a.acct.userId)).filter((x) => !x.deleted_at);
    expect(related.map((x) => [x.person_id, x.relation, x.name])).toEqual([[a.chris.id, "dog", "Fluffy"]]);
    const kept = (await serverRows<Item>("memory_items", a.acct.userId)).find((m) => m.statement === NOTE1)!;
    expect([kept.subject_type, kept.subject_related_id]).toEqual(["related", related[0].id]);
    vetYesterday(a);
    await recoveryAfterFollowUp(a);
  }, 240000);

  it("an older account where note 1 was kept as a plain fact with no row: the words alone connect them (no migration)", async () => {
    await chooseReply(N6, LABEL[N6]).catch(() => undefined);
    const a = await account();
    // Past first use, as the founder's account is: one note told (the K20 note).
    if (!LIVE) await chooseReply(N6, LABEL[N6]);
    await tell(a.r, N6);
    await until(a.r, (s) => s.some((t) => /John/u.test(t) && t !== N6), "the first note understood", 30000);
    if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
    // The fact as an earlier build kept it: a line about Chris, no related row.
    earlierLine(a.acct.userId, { kind: "fact", personId: a.chris.id, subject: "person", statement: NOTE1, detail: { category: "pet" }, at: new Date(Date.now() - 4 * 86_400_000).toISOString() });
    vetYesterday(a);
    await recoveryAfterFollowUp(a);
    const related = (await serverRows<Related>("related_people", a.acct.userId)).filter((x) => !x.deleted_at);
    expect(related).toEqual([]); // nothing was made up for an existing memory
  }, 240000);
});
