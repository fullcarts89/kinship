// Phase 4B B5 (the composed residence line and its provenance, brief §9, §12), through the real screens, the
// local backend (the B2 and B3 migrations applied; B5 adds none), the real ai-gateway served from this branch,
// and the model replayed (or live with LIVE=1, the stub in record mode). The founder's People plus a test
// "Susan" (brief §16 row 8). What Kinship knows says "Lives in Alameda, California" for two notes, with
// "and 1 other note"; tapping it lists both notes, each with its own Edit and Not this; Not this on
// California leaves "Susan lives in Alameda"; "moved to Colorado" closes both and Undo brings the composed
// line back exactly, through the database's own restore trigger.
import { Alert } from "react-native";
import type TestRenderer from "react-test-renderer";
import { COMPOSED_SHEET_COPY } from "@/features/person/ComposedSheet";
import { canTap, mount, setUp, settle, show, signedIn, tap, tapLast, tell, texts, until } from "./app";
import { serverRows, useReply as chooseReply } from "./localStack";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Susan"];
const N = {
  california: "Susan lives in California.",
  alameda: "Susan lives in Alameda.",
  colorado: "Susan moved to Colorado.",
};
/** The replies kept for these notes (16 Oct): "lives in California" from the N13/N14 run, the rest from B3's. */
const LABEL: Record<string, string> = {
  [N.california]: "live 1 (16 Oct, N13/N14, founder People + Susan)",
  [N.alameda]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.colorado]: "live 1 (16 Oct, B3, founder People + Susan)",
};
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const COMPOSED = "Lives in Alameda, California";
/** Words that would expose the machinery (contract §3; brief §12). */
const MACHINERY = /region:|city:|country:|places-20|compose\/v|residence\/v|dataset|candidate|usual reading|Alameda is in/u;

type Item = { id: string; person_id: string; statement: string; status: string; deleted_at: string | null; supersedes_id: string | null; closes_ids: string[] };
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
  const facets = (await serverRows<Facet>("memory_item_facets", a.acct.userId)).filter((f) => !f.deleted_at);
  const words = (m: Item) => m.statement.replace(/\.$/u, "");
  return {
    items,
    line: (re: RegExp) => items.find((m) => re.test(m.statement)),
    current: items.filter((m) => m.status === "active").map(words).sort(),
    closed: items.filter((m) => m.status === "superseded").map(words).sort(),
    reading: (m: Item | undefined) => (m ? facets.find((f) => f.memory_item_id === m.id)?.value_text ?? null : null),
    /** Every memory row, every source row, as the server holds them (never a composed line among them). */
    stored: JSON.stringify([...(await serverRows<Item>("memory_items", a.acct.userId)), ...(await serverRows<Record<string, unknown>>("memory_item_sources", a.acct.userId))]),
  };
}

/** What Kinship knows, open and settled, with the facets synced down (the page reads them from the mirror). */
async function knows(a: Account, expectText: RegExp) {
  await a.acct.engine.sync();
  await show(a.r, { screen: "knows", id: a.susan.id });
  await until(a.r, (s) => s.some((t) => expectText.test(t)), `What Kinship knows to say ${expectText}`, 20000);
  await settle(300);
  return texts(a.r);
}

/** California, then Alameda, both kept (the state every scenario starts from). */
async function californiaThenAlameda(a: Account) {
  await told(a, N.california);
  await keep(a);
  await told(a, N.alameda);
  await keep(a);
  const db = await rows(a);
  expect([db.current, db.closed, db.reading(db.line(/Alameda/u)), db.reading(db.line(/California/u))])
    .toEqual([["Susan lives in Alameda", "Susan lives in California"], [], "Alameda", "California"]);
  return db;
}

/** The OS alert's destructive button, tapped. */
function confirmAlert(): jest.SpyInstance {
  return jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
    const b = (buttons ?? []).find((x) => x.style === "destructive");
    void b?.onPress?.();
  });
}

it("California, then Alameda: What Kinship knows says 'Lives in Alameda, California' once, from both notes; nothing composed is stored", async () => {
  const a = await account();
  const db = await californiaThenAlameda(a);
  const shown = await knows(a, /^Lives in Alameda, California$/u);
  expect(shown).toContain(COMPOSED);
  expect(shown.some((t) => /^You told Kinship · \w+ \d+ · and 1 other note$/u.test(t))).toBe(true);
  // The members are behind the line, not beside it as rows of their own (the Kept card on the dock may still
  // quote the last note); the composed line has one Edit and no Not this; nothing names the machinery.
  expect(canTap(a.r, `Edit: ${COMPOSED}`)).toBe(true);
  expect(canTap(a.r, `Not this: ${COMPOSED}`)).toBe(false);
  for (const s of ["Edit: Susan lives in Alameda", "Not this: Susan lives in Alameda", "Edit: Susan lives in California", "Not this: Susan lives in California"]) {
    expect(canTap(a.r, s)).toBe(false);
  }
  expect(shown.join(" ")).not.toMatch(MACHINERY);
  expect(db.stored).not.toMatch(/Lives in/u);
});

it("tapping the line lists both notes in their own words, each with its own source, Edit and Not this", async () => {
  const a = await account();
  await californiaThenAlameda(a);
  await knows(a, /^Lives in Alameda, California$/u);
  await tap(a.r, COMPOSED);
  await until(a.r, (s) => s.includes(COMPOSED_SHEET_COPY.from), "the notes behind the line", 10000);
  const sheet = texts(a.r);
  // The members' rows, in the sheet's order (their Edit pills; the Kept card on the dock has none).
  const order = [...new Set(a.r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Edit: Susan lives in"))
    .map((n) => String(n.props.accessibilityLabel)))];
  expect(order).toEqual(["Edit: Susan lives in Alameda", "Edit: Susan lives in California"]);
  expect(sheet.filter((t) => /^You told Kinship · \w+ \d+$/u.test(t)).length).toBeGreaterThanOrEqual(2);
  for (const s of ["Edit: Susan lives in Alameda", "Not this: Susan lives in Alameda", "Edit: Susan lives in California", "Not this: Susan lives in California"]) {
    expect(canTap(a.r, s)).toBe(true);
  }
  expect(sheet.join(" ")).not.toMatch(MACHINERY);
  // The sheet's Done (the first on screen; the keyboard bar has one of its own, after it).
  await tap(a.r, COMPOSED_SHEET_COPY.done);
  await until(a.r, (s) => !s.includes(COMPOSED_SHEET_COPY.from), "the sheet to close", 10000);
});

it("Not this on California, from the sheet: 'Susan lives in Alameda' stands alone; California is retracted on the server", async () => {
  const a = await account();
  await californiaThenAlameda(a);
  await knows(a, /^Lives in Alameda, California$/u);
  await tap(a.r, COMPOSED);
  await until(a.r, (s) => s.includes(COMPOSED_SHEET_COPY.from), "the notes behind the line", 10000);
  const alert = confirmAlert();
  await tapLast(a.r, "Not this: Susan lives in California");
  await until(a.r, (s) => s.includes("Susan lives in Alameda") && !s.includes(COMPOSED), "the line read again from what is left", 20000);
  alert.mockRestore();
  for (let i = 0; i < 40 && (await rows(a)).current.length > 1; i++) {
    await a.acct.engine.sync();
    await settle(250);
  }
  const db = await rows(a);
  expect([db.current, db.reading(db.line(/Alameda/u))]).toEqual([["Susan lives in Alameda"], "Alameda"]);
  expect(db.items.find((m) => /California/u.test(m.statement))).toBeUndefined();
  const page = await knows(a, /^Susan lives in Alameda$/u);
  expect(page).not.toContain(COMPOSED);
});

it("California → Alameda → 'moved to Colorado' → Undo: the page says Colorado and what it replaced; after Undo, the composed line is back exactly", async () => {
  const a = await account();
  const before = await californiaThenAlameda(a);
  const alameda = before.line(/Alameda/u)!;
  const california = before.line(/California/u)!;
  await told(a, N.colorado);
  const closed = await knows(a, /moved to Colorado/u);
  expect(closed.filter((t) => /^Before: /u.test(t)).map((t) => t.replace(/\.$/u, "")))
    .toEqual(["Before: Susan lives in Alameda", "Before: Susan lives in California"]);
  expect(closed).not.toContain(COMPOSED);
  const db = await rows(a);
  expect([db.current.map((s) => s.replace(/\.$/u, "")), db.closed]).toEqual([["Susan moved to Colorado"], ["Susan lives in Alameda", "Susan lives in California"]]);
  // Undo, from the Kept card on Susan's page.
  await show(a.r, { screen: "person", id: a.susan.id });
  await until(a.r, (s) => s.includes("Undo"), "the Kept card's Undo", 10000);
  await tap(a.r, "Undo");
  await settle(1000);
  await a.acct.engine.sync();
  for (let i = 0; i < 40 && (await rows(a)).closed.length; i++) {
    await a.acct.engine.sync();
    await settle(250);
  }
  const back = await rows(a);
  expect([back.current, back.closed, back.line(/Alameda/u)!.id, back.line(/California/u)!.id, back.reading(back.line(/Alameda/u)), back.reading(back.line(/California/u))])
    .toEqual([["Susan lives in Alameda", "Susan lives in California"], [], alameda.id, california.id, "Alameda", "California"]);
  const again = await knows(a, /^Lives in Alameda, California$/u);
  expect(again).toContain(COMPOSED);
  expect(again.some((t) => /and 1 other note$/u.test(t))).toBe(true);
  expect(again.filter((t) => /Colorado|Previously/u.test(t))).toEqual([]);
});
