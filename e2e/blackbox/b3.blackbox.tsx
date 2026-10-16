// Phase 4B B3 (residence semantics), through the real screens, the local backend (the B2 and B3 migrations
// applied), the real ai-gateway served from this branch, and the model replayed (or live with LIVE=1, the stub
// in record mode). The founder's People plus a test "Susan" (brief §16). Supersession of a real line is a trust
// invariant: every closure is checked on the server, and so is its Undo.
//
// Two scenarios mark the line as the user's own edit through the app's repository instead of the line sheet
// (an edit that keeps its words, so the server keeps its reading): stated as such. B3 does not yet read an
// edited line's new words again (§5 re-derivation); the last scenario shows what that means today.
import type TestRenderer from "react-test-renderer";
import { canTap, mount, setUp, settle, signedIn, tap, tell, texts, until } from "./app";
import { serverRows, useReply as chooseReply } from "./localStack";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Susan"];
const N = {
  alameda: "Susan lives in Alameda.",
  colorado: "Susan moved to Colorado.",
  livesColorado: "Susan lives in Colorado.",
  california: "Susan moved to California.",
  oakland: "Actually Susan lives in Oakland, not Alameda.",
  denver: "Susan is staying in Denver this week.",
  illinois: "Susan lives in Illinois.",
  pilsen: "Susan lives in Pilsen.",
};
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const RESIDENCE_Q = /^Is Susan still in .+\?$/u;

type Item = {
  id: string; person_id: string; statement: string; status: string; user_state: string; deleted_at: string | null;
  supersedes_id: string | null; detail: Record<string, unknown>; version: number;
};
type Facet = { memory_item_id: string; value_text: string; deleted_at: string | null };

async function account() {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await acct.engine.sync();
  const susan = (await acct.repos.people.list()).find((p) => p.display_name === "Susan")!;
  return { acct, r, susan };
}
type Account = Awaited<ReturnType<typeof account>>;

/** Tells a note and waits for its reading; the question, when it asks one, is left open. */
async function told(a: Account, note: string, label = "live 1 (16 Oct, B3, founder People + Susan)") {
  if (!LIVE) await chooseReply(note, label);
  await tell(a.r, note);
  await until(a.r, (s) => s.some((t) => READING.test(t) || RESIDENCE_Q.test(t)), `the reading of "${note}"`, 60000);
  const waiting = texts(a.r).find((t) => /^One thing to check about/u.test(t));
  if (waiting && !texts(a.r).some((t) => RESIDENCE_Q.test(t))) await tap(a.r, waiting);
  await settle(300);
}

/** Puts the Kept card away (Got it right), so the next note starts clean. */
async function keep(a: Account) {
  if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
  if (canTap(a.r, "Done") && texts(a.r).includes("Here's what I'll remember.")) await tap(a.r, "Done");
  await settle(300);
  await a.acct.engine.sync();
}

async function rows(a: Account) {
  const items = (await serverRows<Item>("memory_items", a.acct.userId)).filter((m) => m.person_id === a.susan.id && !m.deleted_at);
  const facets = (await serverRows<Facet>("memory_item_facets", a.acct.userId)).filter((f) => !f.deleted_at);
  const line = (re: RegExp) => items.find((m) => re.test(m.statement));
  return {
    items, line,
    current: items.filter((m) => m.status === "active").map((m) => m.statement).sort(),
    closed: items.filter((m) => m.status === "superseded").map((m) => m.statement).sort(),
    reading: (m: Item | undefined) => (m ? facets.find((f) => f.memory_item_id === m.id)?.value_text ?? null : null),
  };
}

/** The user's own edit of a line that keeps its words (the app's correct(), via its repository; stated above). */
async function editKeepingWords(a: Account, re: RegExp) {
  const m = (await rows(a)).line(re)!;
  await a.acct.repos.memory.correct(m.id, { statement: m.statement });
  await a.acct.engine.sync();
  const after = (await rows(a)).line(re)!;
  expect([after.user_state, (await rows(a)).reading(after)]).toEqual(["edited", (await rows(a)).reading(m)]);
}

async function answer(r: TestRenderer.ReactTestRenderer, label: string) {
  await until(r, (s) => s.some((t) => RESIDENCE_Q.test(t)), "the residence question", 10000);
  await tap(r, label);
  await until(r, (s) => s.some((t) => /^Kept for|^Nothing kept/u.test(t)), "the answer kept", 30000);
}

it("C: 'moved to Colorado' replaces Alameda as a change; Undo brings Alameda back exactly", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.colorado);
  expect(texts(a.r).some((t) => RESIDENCE_Q.test(t))).toBe(false);
  const db = await rows(a);
  const ala = db.line(/Alameda/u)!;
  const col = db.line(/Colorado/u)!;
  expect([db.current, db.closed]).toEqual([[col.statement], [ala.statement]]);
  expect([col.supersedes_id, col.detail.transition, db.reading(col), db.reading(ala)]).toEqual([ala.id, "changed", "Colorado", "Alameda"]);
  await tap(a.r, "Undo");
  await settle(1000);
  await a.acct.engine.sync();
  const back = await rows(a);
  expect([back.current, back.closed, back.reading(back.line(/Alameda/u))]).toEqual([[ala.statement], [], "Alameda"]);
});

it("E: 'moved to California' asks once; 'Susan moved' replaces Alameda as a change", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.california);
  const shown = texts(a.r);
  expect(shown).toEqual(expect.arrayContaining(["Is Susan still in Alameda?", "Still there", "Susan moved", "Don't keep this"]));
  expect(shown.join(" ")).not.toMatch(/Which Alameda|She moved/u);
  expect((await rows(a)).current).toEqual(["Susan lives in Alameda"]);
  await answer(a.r, "Susan moved");
  await a.acct.engine.sync();
  const db = await rows(a);
  const cal = db.line(/California/u)!;
  expect([db.closed, cal.status, cal.supersedes_id, cal.detail.transition, db.reading(cal)])
    .toEqual([["Susan lives in Alameda"], "active", db.line(/Alameda/u)!.id, "changed", "California"]);
});

it("E: 'Still there' keeps both, and nothing closes", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.california);
  await answer(a.r, "Still there");
  await a.acct.engine.sync();
  const db = await rows(a);
  expect([db.current.length, db.closed, db.reading(db.line(/California/u)), db.reading(db.line(/Alameda/u))]).toEqual([2, [], "California", "Alameda"]);
});

it("D: 'Actually … Oakland, not Alameda' replaces it, never as a change (never history)", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.oakland);
  await keep(a);
  const db = await rows(a);
  const oak = db.line(/Oakland/u)!;
  expect([db.closed, oak.supersedes_id]).toEqual([["Susan lives in Alameda"], db.line(/^Susan lives in Alameda$/u)!.id]);
  expect(oak.detail.transition).not.toBe("changed");
  console.log(`B3 D: the closer's transition is ${String(oak.detail.transition ?? "none")}`);
});

it("F: a stay is a line of its own; where Susan lives is unchanged", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.denver);
  await keep(a);
  const db = await rows(a);
  expect([db.closed, db.reading(db.line(/Alameda/u)), db.reading(db.line(/Denver/u))]).toEqual([[], "Alameda", null]);
});

it("B2 finding: 'lives in Pilsen' after 'lives in Illinois' never replaces Illinois", async () => {
  const a = await account();
  await told(a, N.illinois);
  await keep(a);
  await told(a, N.pilsen);
  await keep(a);
  const db = await rows(a);
  expect([db.current, db.closed]).toEqual([["Susan lives in Illinois", "Susan lives in Pilsen"], []]);
});

it("§21: a line the user edited closes on the user's own 'moved to', and Undo returns the edited line", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await editKeepingWords(a, /Alameda/u);
  await told(a, N.colorado);
  const db = await rows(a);
  const ala = db.line(/Alameda/u)!;
  expect([db.closed, ala.user_state, db.line(/Colorado/u)!.detail.transition]).toEqual([[ala.statement], "edited", "changed"]);
  await tap(a.r, "Undo");
  await settle(1000);
  await a.acct.engine.sync();
  const back = await rows(a);
  expect([back.current, back.line(/Alameda/u)!.user_state]).toEqual([["Susan lives in Alameda"], "edited"]);
});

it("§21: a plain 'lives in Colorado' still asks about the edited line; 'Susan moved' closes it through the stored question", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await editKeepingWords(a, /Alameda/u);
  await told(a, N.livesColorado);
  expect(texts(a.r)).toEqual(expect.arrayContaining(["Is Susan still in Alameda?", "Still there", "Susan moved"]));
  await answer(a.r, "Susan moved");
  await a.acct.engine.sync();
  const db = await rows(a);
  expect([db.current, db.closed, db.line(/Colorado/u)!.detail.transition]).toEqual([["Susan lives in Colorado"], ["Susan lives in Alameda"], "changed"]);
});

it("§21: 'Still there' keeps the edited line the one residence; the new words keep no reading", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await editKeepingWords(a, /Alameda/u);
  await told(a, N.livesColorado);
  await answer(a.r, "Still there");
  await a.acct.engine.sync();
  const db = await rows(a);
  expect([db.current.length, db.closed, db.reading(db.line(/Alameda/u)), db.reading(db.line(/Colorado/u))]).toEqual([2, [], "Alameda", null]);
});

it("B3 today: an edit of the words loses the reading (B2), so a later move leaves both lines (fail open, nothing closed)", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  const m = (await rows(a)).line(/Alameda/u)!;
  await a.acct.repos.memory.correct(m.id, { statement: "Susan lives in Alameda with Jo" });
  await a.acct.engine.sync();
  expect((await rows(a)).reading((await rows(a)).line(/Alameda/u))).toBeNull();
  await told(a, N.colorado);
  await keep(a);
  const db = await rows(a);
  expect([db.current, db.closed]).toEqual([["Susan lives in Alameda with Jo", "Susan moved to Colorado"], []]);
});
