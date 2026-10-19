// Phase 4B B7 (Portrait de-duplication, brief §13) and B8 (What Kinship knows in sections with Before
// history, brief §4, §11), through the real screens, the local backend (the B2 and B3 migrations applied;
// B7 and B8 add none), the real ai-gateway served from this branch, and the model replayed (or live with
// LIVE=1, the stub in record mode). The founder's People plus a test "Susan" (brief §16 rows 8–11, 10b, 13).
//
//   B7  California, then Alameda: the Portrait's Lately says "Susan lives in Alameda" once, never also
//       "Susan lives in California"; both notes stay in What Kinship knows as one composed line.
//   B8  "moved to Colorado": Background says "Moved to Colorado" and, under Before, "Previously lived in
//       Alameda, California" dated by that note; Undo from the Kept card brings the composed line back and
//       clears Before. A plain "lives in Colorado" and a correction leave no history. A stay is a plan, not
//       a residence, and sits in its own section.

import { BEFORE_LABEL } from "@/features/person/recordSections";
import { canTap, mount, setUp, settle, show, signedIn, tap, tell, texts, until } from "./app";
import { serverRows, useReply as chooseReply } from "./localStack";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Susan"];
const N = {
  california: "Susan lives in California.",
  alameda: "Susan lives in Alameda.",
  colorado: "Susan moved to Colorado.",
  livesColorado: "Susan lives in Colorado.",
  oakland: "Actually Susan lives in Oakland, not Alameda.",
  denver: "Susan is staying in Denver this week.",
};
/** The replies kept for these notes (16 Oct): "lives in California" from the N13/N14 run, the rest from B3's. */
const LABEL: Record<string, string> = {
  [N.california]: "live 1 (16 Oct, N13/N14, founder People + Susan)",
  [N.alameda]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.colorado]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.livesColorado]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.oakland]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.denver]: "live 1 (16 Oct, B3, founder People + Susan)",
};
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const COMPOSED = "Lives in Alameda, California";
const PREVIOUS = "Previously lived in Alameda, California";
const SECTIONS = ["Background", "Into", "Hoping to", "Plans", "Their people", "Between you"];
/** Words that would expose the machinery, or count, score or prompt (contract §3; brief §4, §12). */
const MACHINERY = /region:|city:|country:|places-20|compose\/v|residence\/v|dataset|candidate|usual reading|Alameda is in|\b\d+ (?:memories|items|lines)\b|complete|%|score/iu;

type Item = { id: string; person_id: string; statement: string; status: string; deleted_at: string | null; supersedes_id: string | null; closes_ids: string[]; detail: Record<string, unknown> | null };

async function account() {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await acct.engine.sync();
  const susan = (await acct.repos.people.list()).find((p) => p.display_name === "Susan")!;
  return { acct, r, susan };
}
type Account = Awaited<ReturnType<typeof account>>;

async function told(a: Account, note: string) {
  if (!LIVE) await chooseReply(note, LABEL[note]);
  await tell(a.r, note);
  await until(a.r, (s) => s.some((t) => READING.test(t)), `the reading of "${note}"`, 60000);
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
  const words = (m: Item) => m.statement.replace(/\.$/u, "");
  return {
    items,
    line: (re: RegExp) => items.find((m) => re.test(m.statement)),
    current: items.filter((m) => m.status === "active").map(words).sort(),
    closed: items.filter((m) => m.status === "superseded").map(words).sort(),
  };
}

/** A screen, open and settled, with the server's rows synced down. */
async function open(a: Account, screen: "person" | "knows", expectText: RegExp) {
  await a.acct.engine.sync();
  await show(a.r, { screen, id: a.susan.id });
  await until(a.r, (s) => s.some((t) => expectText.test(t)), `${screen} to say ${expectText}`, 20000);
  await settle(300);
  return texts(a.r);
}
const headings = (shown: string[]) => shown.filter((t) => SECTIONS.includes(t) || t === BEFORE_LABEL);

/** California, then Alameda, both kept (the state every scenario starts from). */
async function californiaThenAlameda(a: Account) {
  await told(a, N.california);
  await keep(a);
  await told(a, N.alameda);
  await keep(a);
  const db = await rows(a);
  expect([db.current, db.closed]).toEqual([["Susan lives in Alameda", "Susan lives in California"], []]);
  return db;
}

it("B7: California, then Alameda: the Portrait says 'Susan lives in Alameda' once, never 'Susan lives in California'; What Kinship knows keeps both as one line", async () => {
  const a = await account();
  await californiaThenAlameda(a);
  const portrait = await open(a, "person", /^Susan lives in Alameda$/u);
  expect(portrait).toContain("Lately");
  expect(portrait).toContain("Susan lives in Alameda");
  expect(portrait).not.toContain("Susan lives in California");
  expect(portrait).not.toContain(COMPOSED);
  // More is in What Kinship knows (the member that left the Portrait), never as a number.
  expect(portrait).toContain("What Kinship knows about Susan →");
  expect(portrait.join(" ")).not.toMatch(MACHINERY);
  const knows = await open(a, "knows", /^Lives in Alameda, California$/u);
  expect(headings(knows)).toEqual(["Background"]);
  expect(knows).toContain(COMPOSED);
  expect(knows.some((t) => /^You told Kinship · \w+ \d+ · and 1 other note$/u.test(t))).toBe(true);
  expect(knows).not.toContain(BEFORE_LABEL);
  expect(knows.join(" ")).not.toMatch(MACHINERY);
});

it("B8: 'moved to Colorado': Background says the move and, under Before, 'Previously lived in Alameda, California' dated by that note; Undo brings the composed line back and clears Before", async () => {
  const a = await account();
  const before = await californiaThenAlameda(a);
  const alameda = before.line(/Alameda/u)!;
  const california = before.line(/California/u)!;
  await told(a, N.colorado);
  const closed = await open(a, "knows", /^Moved to Colorado$/u);
  expect(headings(closed)).toEqual(["Background", BEFORE_LABEL]);
  expect(closed).toContain("Moved to Colorado");
  expect(closed).toContain(PREVIOUS);
  expect(closed).not.toContain(COMPOSED);
  // The closed lines are no rows of their own (their words appear only as "Before: …" under the current line,
  // H23, and on the dock's Kept card as "Replaces"); the composed history line has one Edit, into its notes.
  expect(canTap(a.r, PREVIOUS)).toBe(true);
  expect(canTap(a.r, `Edit: ${PREVIOUS}`)).toBe(true);
  expect(canTap(a.r, `Not this: ${PREVIOUS}`)).toBe(false);
  expect(canTap(a.r, "Edit: Susan lives in Alameda")).toBe(false);
  expect(canTap(a.r, "Edit: Susan lives in California")).toBe(false);
  // Dated by the day the change was told (never "Updated"); the current line still says what it replaced (H23).
  expect(closed.filter((t) => /^You told Kinship · \w+ \d+$/u.test(t)).length).toBeGreaterThanOrEqual(2);
  expect(closed.some((t) => /Updated/u.test(t))).toBe(false);
  expect(closed.filter((t) => /^Before: /u.test(t)).map((t) => t.replace(/\.$/u, ""))).toEqual(["Before: Susan lives in Alameda", "Before: Susan lives in California"]);
  // The closer records the change the history rests on.
  const db = await rows(a);
  expect([db.current, db.closed, db.line(/Colorado/u)!.detail?.transition]).toEqual([["Susan moved to Colorado"], ["Susan lives in Alameda", "Susan lives in California"], "changed"]);
  // The Portrait: the move, with its quiet "was:", once.
  const portrait = await open(a, "person", /^Susan moved to Colorado$/u);
  expect(canTap(a.r, "Susan moved to Colorado")).toBe(true);
  expect(portrait.some((t) => t === "was: ")).toBe(true);
  expect(portrait).not.toContain(PREVIOUS);
  expect(portrait).not.toContain(COMPOSED);
  // Undo, from the Kept card on Susan's page.
  await until(a.r, (s) => s.includes("Undo"), "the Kept card's Undo", 10000);
  await tap(a.r, "Undo");
  await settle(1000);
  await a.acct.engine.sync();
  for (let i = 0; i < 40 && (await rows(a)).closed.length; i++) {
    await a.acct.engine.sync();
    await settle(250);
  }
  const back = await rows(a);
  expect([back.current, back.closed, back.line(/Alameda/u)!.id, back.line(/California/u)!.id])
    .toEqual([["Susan lives in Alameda", "Susan lives in California"], [], alameda.id, california.id]);
  const again = await open(a, "knows", /^Lives in Alameda, California$/u);
  expect(headings(again)).toEqual(["Background"]);
  expect(again).toContain(COMPOSED);
  expect(again.filter((t) => /Colorado|Previously|^Before$/u.test(t))).toEqual([]);
  const portraitAgain = await open(a, "person", /^Susan lives in Alameda$/u);
  expect(portraitAgain).not.toContain("Susan lives in California");
  expect(portraitAgain).not.toContain("Susan moved to Colorado");
});

it("B8: Alameda, then 'lives in Colorado' with no cue: Colorado current and nothing under Before; a correction leaves no history either", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.livesColorado);
  const knows = await open(a, "knows", /^Lives in Colorado$/u);
  expect(headings(knows)).toEqual(["Background"]);
  expect(knows).toContain("Lives in Colorado");
  expect(knows.filter((t) => /Previously|^Before$/u.test(t))).toEqual([]);
  const db = await rows(a);
  expect([db.current, db.closed, db.line(/Colorado/u)!.detail?.transition ?? null]).toEqual([["Susan lives in Colorado"], ["Susan lives in Alameda"], null]);
  const portrait = await open(a, "person", /^Susan lives in Colorado$/u);
  // The Portrait's Lately: Colorado's line alone, Alameda only as its quiet "was:" (H23), no second residence row.
  const lately = portrait.indexOf("Lately");
  expect(portrait.slice(lately + 1, lately + 4)).toEqual(["Susan lives in Colorado", "was: ", "Susan lives in Alameda"]);
  expect(portrait.slice(lately + 4).filter((t) => /^Susan lives in/u.test(t) && t !== "Susan lives in Colorado" && !portrait.includes("Replaces: "))).toEqual([]);

  const b = await account();
  await told(b, N.alameda);
  await keep(b);
  await told(b, N.oakland);
  // The live model kept the note's own "not Alameda" in the line; the page shows the words as kept.
  const corrected = await open(b, "knows", /^Lives in Oakland/u);
  expect(headings(corrected)).toEqual(["Background"]);
  expect(corrected.filter((t) => /Previously|^Before$/u.test(t))).toEqual([]);
  const row = await rows(b);
  expect([row.current.map((t) => t.replace(/, not Alameda$/u, "")), row.closed, row.line(/Oakland/u)!.detail?.transition]).toEqual([["Susan lives in Oakland"], ["Susan lives in Alameda"], "corrected"]);
});

it("B8: a stay in Denver is no residence: its own line in its own section, the residence unchanged; empty sections are absent", async () => {
  const a = await account();
  await told(a, N.alameda);
  await keep(a);
  await told(a, N.denver);
  await keep(a);
  const knows = await open(a, "knows", /^Lives in Alameda$/u);
  const shown = headings(knows);
  // Background for the residence, and the stay under a section of its own (what kind of line the model kept
  // decides which); never Before, never a section with nothing in it.
  expect(shown[0]).toBe("Background");
  expect(shown).not.toContain(BEFORE_LABEL);
  expect(new Set(shown).size).toBe(shown.length);
  expect(knows.some((t) => /staying in Denver/u.test(t))).toBe(true);
  expect(knows.filter((t) => /Previously|Lives in Denver/u.test(t))).toEqual([]);
  const db = await rows(a);
  expect(db.current.filter((s) => /Alameda/u.test(s))).toEqual(["Susan lives in Alameda"]);
  const portrait = await open(a, "person", /^Susan lives in Alameda$/u);
  expect(portrait.join(" ")).not.toMatch(MACHINERY);
});
