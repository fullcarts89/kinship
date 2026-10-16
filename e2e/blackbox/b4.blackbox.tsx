// Phase 4B B4 (multi-item closure and its exact Undo, brief §8 rule 2, §10), through the real screens, the
// local backend (the B2 and B3 migrations applied; B4 adds none), the real ai-gateway served from this branch,
// and the model replayed (or live with LIVE=1, the stub in record mode). The founder's People plus a test
// "Susan" (brief §16). A note now closes every current residence line it can't be true with: the most
// specific is what it replaces (supersedes_id), the rest ride as closes_ids. Closure never exists without its
// exact Undo (CC-20): the Kept card and What Kinship knows say everything a note replaced, and Undo or
// "Not this" on the closer brings every one of those lines back exactly, an edited line as the user left it.
//
// Two scenarios mark a line as the user's own edit through the app's repository (an edit that keeps its
// words, so the server keeps its reading): stated as such.
import { Alert } from "react-native";
import type TestRenderer from "react-test-renderer";
import { canTap, mount, setUp, settle, show, signedIn, tap, tell, texts, until } from "./app";
import { serverRows, useReply as chooseReply } from "./localStack";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Susan"];
const N = {
  california: "Susan lives in California.",
  alameda: "Susan lives in Alameda.",
  colorado: "Susan moved to Colorado.",
  livesColorado: "Susan lives in Colorado.",
};
/** The replies kept for these notes (16 Oct): "lives in California" from the N13/N14 run, the rest from B3's. */
const LABEL: Record<string, string> = {
  [N.california]: "live 1 (16 Oct, N13/N14, founder People + Susan)",
  [N.alameda]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.colorado]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.livesColorado]: "live 1 (16 Oct, B3, founder People + Susan)",
};
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const RESIDENCE_Q = /^Is Susan still in .+\?$/u;

type Item = {
  id: string; person_id: string; statement: string; status: string; user_state: string; deleted_at: string | null;
  supersedes_id: string | null; closes_ids: string[]; detail: Record<string, unknown>; version: number; valid_to: string | null;
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
async function told(a: Account, note: string) {
  if (!LIVE) await chooseReply(note, LABEL[note]);
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
  const words = (m: Item) => m.statement.replace(/\.$/u, "");
  return {
    items, line,
    // The words as kept, without a closing full stop (the live model writes the line either way).
    current: items.filter((m) => m.status === "active").map(words).sort(),
    closed: items.filter((m) => m.status === "superseded").map(words).sort(),
    reading: (m: Item | undefined) => (m ? facets.find((f) => f.memory_item_id === m.id)?.value_text ?? null : null),
    /** What a closer replaced and closed, in order, by the lines' words. */
    closes: (m: Item) => [m.supersedes_id, ...(m.closes_ids ?? [])].map((id) => items.find((x) => x.id === id)).map((x) => (x ? words(x) : null)),
  };
}

/** The user's own edit of a line that keeps its words (the app's correct(), via its repository; stated above). */
async function editKeepingWords(a: Account, re: RegExp) {
  const m = (await rows(a)).line(re)!;
  await a.acct.repos.memory.correct(m.id, { statement: m.statement });
  await a.acct.engine.sync();
  const after = (await rows(a)).line(re)!;
  expect([after.user_state, (await rows(a)).reading(after)]).toEqual(["edited", (await rows(a)).reading(m)]);
  return after;
}

async function answer(r: TestRenderer.ReactTestRenderer, label: string) {
  await until(r, (s) => s.some((t) => RESIDENCE_Q.test(t)), "the residence question", 10000);
  await tap(r, label);
  await until(r, (s) => s.some((t) => /^Kept for|^Nothing kept/u.test(t)), "the answer kept", 30000);
}

/** What the Kept card on screen says a line replaced: every "Replaces: ~~…~~" line (each once; a label reaches nested nodes). */
function replacesShown(r: TestRenderer.ReactTestRenderer): string[] {
  const labels = r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Replaces: "))
    .map((n) => String(n.props.accessibilityLabel).replace(/^Replaces: /u, "").replace(/\.$/u, ""));
  return [...new Set(labels)];
}

/** The card's "Replaces" lines once the lines it replaced have synced down (the card renders first). */
async function replacesSettled(a: Account, n: number): Promise<string[]> {
  for (let i = 0; i < 40 && replacesShown(a.r).length < n; i++) {
    await a.acct.engine.sync();
    await settle(250);
  }
  return replacesShown(a.r);
}

async function undo(a: Account) {
  await tap(a.r, "Undo");
  await settle(1000);
  await a.acct.engine.sync();
}

/** California, then Alameda, both kept: the state res-006 starts from. */
async function californiaThenAlameda(a: Account) {
  await told(a, N.california);
  await keep(a);
  await told(a, N.alameda);
  expect(texts(a.r).some((t) => RESIDENCE_Q.test(t))).toBe(false);
  await keep(a);
  const db = await rows(a);
  expect([db.current, db.closed]).toEqual([["Susan lives in Alameda", "Susan lives in California"], []]);
  return { california: db.line(/California/u)!, alameda: db.line(/Alameda/u)! };
}

it("res-006: California, Alameda, 'moved to Colorado': the Kept card says both; both close; Undo brings both back exactly", async () => {
  const a = await account();
  const { california, alameda } = await californiaThenAlameda(a);
  await told(a, N.colorado);
  expect(texts(a.r).some((t) => RESIDENCE_Q.test(t))).toBe(false);
  expect(await replacesSettled(a, 2)).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  const db = await rows(a);
  const col = db.line(/Colorado/u)!;
  expect([db.current, db.closed]).toEqual([[col.statement.replace(/\.$/u, "")], ["Susan lives in Alameda", "Susan lives in California"]]);
  expect([col.supersedes_id, col.closes_ids, col.detail.transition, db.reading(col)]).toEqual([alameda.id, [california.id], "changed", "Colorado"]);
  expect([db.reading(db.line(/Alameda/u)), db.reading(db.line(/California/u))]).toEqual(["Alameda", "California"]);
  await undo(a);
  const back = await rows(a);
  const ala = back.line(/Alameda/u)!;
  const cal = back.line(/California/u)!;
  expect([back.current, back.closed]).toEqual([["Susan lives in Alameda", "Susan lives in California"], []]);
  // Exactly as they were: the same lines, no end date left behind, their readings never touched.
  expect([ala.id, cal.id, ala.valid_to, cal.valid_to, back.reading(ala), back.reading(cal)])
    .toEqual([alameda.id, california.id, null, null, "Alameda", "California"]);
});

it("'Not this' on the closer in What Kinship knows (which says both it replaced) brings both lines back", async () => {
  const a = await account();
  await californiaThenAlameda(a);
  await told(a, N.colorado);
  await keep(a);
  expect((await rows(a)).closed).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  await show(a.r, { screen: "knows", id: a.susan.id });
  await until(a.r, (s) => s.some((t) => /moved to Colorado/u.test(t)), "the line in What Kinship knows", 20000);
  expect(texts(a.r).filter((t) => /^Before: /u.test(t)).map((t) => t.replace(/\.$/u, "")))
    .toEqual(["Before: Susan lives in Alameda", "Before: Susan lives in California"]);
  const line = texts(a.r).find((t) => /moved to Colorado/u.test(t))!;
  // The confirmation is the OS's alert: the user taps its destructive button.
  const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
    const b = (buttons ?? []).find((x) => x.style === "destructive");
    void b?.onPress?.();
  });
  await tap(a.r, `Not this: ${line}`);
  await until(a.r, (s) => !s.includes(line), "the line to leave the screen", 30000);
  alert.mockRestore();
  for (let i = 0; i < 40 && (await rows(a)).closed.length; i++) {
    await a.acct.engine.sync();
    await settle(250);
  }
  const back = await rows(a);
  expect([back.current, back.closed, back.reading(back.line(/Alameda/u)), back.reading(back.line(/California/u))])
    .toEqual([["Susan lives in Alameda", "Susan lives in California"], [], "Alameda", "California"]);
});

it("California, an edited Alameda, then 'lives in Colorado': one question; 'Susan moved' closes both; Undo returns the edited line", async () => {
  const a = await account();
  const { california } = await californiaThenAlameda(a);
  const alameda = await editKeepingWords(a, /Alameda/u);
  await told(a, N.livesColorado);
  expect(texts(a.r)).toEqual(expect.arrayContaining(["Is Susan still in Alameda?", "Still there", "Susan moved", "Don't keep this"]));
  expect((await rows(a)).closed).toEqual([]);
  await answer(a.r, "Susan moved");
  expect(await replacesSettled(a, 2)).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  await a.acct.engine.sync();
  const db = await rows(a);
  const col = db.line(/Colorado/u)!;
  expect([db.current, db.closed, col.supersedes_id, col.closes_ids, col.detail.transition])
    .toEqual([["Susan lives in Colorado"], ["Susan lives in Alameda", "Susan lives in California"], alameda.id, [california.id], "changed"]);
  await undo(a);
  const back = await rows(a);
  const ala = back.line(/Alameda/u)!;
  // The edited line, as the user left it (its edit kept), and California with it.
  expect([back.current, back.closed, ala.id, ala.user_state, ala.statement, back.reading(ala), back.reading(back.line(/California/u))])
    .toEqual([["Susan lives in Alameda", "Susan lives in California"], [], alameda.id, "edited", alameda.statement, "Alameda", "California"]);
});

it("'Still there' beside an edited Alameda keeps everything: nothing closes, the new words keep no reading", async () => {
  const a = await account();
  await californiaThenAlameda(a);
  await editKeepingWords(a, /Alameda/u);
  await told(a, N.livesColorado);
  await answer(a.r, "Still there");
  expect(replacesShown(a.r)).toEqual([]);
  await a.acct.engine.sync();
  const db = await rows(a);
  const col = db.line(/Colorado/u)!;
  expect([db.current, db.closed, col.closes_ids, db.reading(col)])
    .toEqual([["Susan lives in Alameda", "Susan lives in California", "Susan lives in Colorado"], [], [], null]);
});

it("§21: an edited California among the closures closes on the user's own 'moved to'; Undo returns it as the user left it", async () => {
  const a = await account();
  await told(a, N.california);
  await keep(a);
  const california = await editKeepingWords(a, /California/u);
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.colorado);
  expect(await replacesSettled(a, 2)).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  const db = await rows(a);
  const col = db.line(/Colorado/u)!;
  expect([db.closed, col.closes_ids, col.detail.transition]).toEqual([["Susan lives in Alameda", "Susan lives in California"], [california.id], "changed"]);
  await undo(a);
  const back = await rows(a);
  const cal = back.line(/California/u)!;
  expect([back.current, back.closed, cal.id, cal.user_state, cal.statement, back.reading(cal)])
    .toEqual([["Susan lives in Alameda", "Susan lives in California"], [], california.id, "edited", california.statement, "California"]);
});
