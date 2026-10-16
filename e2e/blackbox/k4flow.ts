// The founder's K4 checklist (13 Oct) as one run through the real screens and the local backend, with every
// invariant checked: "Anthony and Sam love ice skating with Chris" with the founder's own People (Anthony,
// Anthony Lopez, Sam Eden, Sam Doughty, Chris, Ben, John; 14 Oct: never a simplified "Anthony Test").
//   Run A: Anthony → Anthony Lopez, Sam → Someone else → Sam Eden. One shared memory: Anthony Lopez + Sam Eden + Chris.
//   Run B: Anthony → Anthony Lopez, Sam → Not sure. One memory: Anthony Lopez + Chris, the word "Sam" kept.
// The Kept card lists every memory the note kept (K15).
// Never a loop, never a second memory, every page agrees, and reopening the app asks nothing again.
import type TestRenderer from "react-test-renderer";
import { mount, setUp, settle, show, signedIn, tap, tapLast, tell, texts, until, unmount, canTap } from "./app";
import { serverRows } from "./localStack";

export const K4 = "Anthony and Sam love ice skating with Chris";
export const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John"];
const QUESTION = /^(Which (Sam|Anthony) do you mean\?|Who is this about\?|Who is “.*”\?|Remember this.*|Is this about .*)$/u;
const WAITING = /^One thing to check about|^\d+ things to check/u;

type Row = { person_id: string; with_person_ids: string[] | null; statement: string; status: string; deleted_at: string | null };

/** Answers the questions as the founder's checklist does; returns every question shown, in order. */
async function answer(r: TestRenderer.ReactTestRenderer, run: "A" | "B", readingMs: number): Promise<string[]> {
  await until(r, (s) => s.some((t) => QUESTION.test(t) || WAITING.test(t) || /^Kept for/u.test(t)), "the reading", readingMs);
  const waiting = texts(r).find((t) => WAITING.test(t));
  if (waiting && !texts(r).some((t) => QUESTION.test(t))) await tap(r, waiting);
  const asked: string[] = [];
  for (let step = 0; step < 8; step++) {
    await settle(200);
    const q = texts(r).find((t) => QUESTION.test(t));
    if (!q) break;
    asked.push(q);
    if (q.startsWith("Which Anthony") || q === "Who is this about?" || q.startsWith("Who is “Anthony")) await tap(r, "Anthony Lopez");
    else if (q.startsWith("Which Sam") || q.startsWith("Who is “Sam")) {
      if (run === "A") { await tap(r, "Someone else"); await tap(r, "Sam Eden"); } else await tap(r, "Not sure");
    } else if (canTap(r, "Remember")) await tap(r, "Remember");
    else throw new Error(`a question the checklist has no answer for: ${q}. On screen: ${JSON.stringify(texts(r))}`);
  }
  return asked;
}

/** One run of the checklist; `shape` names the model reply in every failure message. */
export async function k4Run(run: "A" | "B", shape: string, readingMs = 30000): Promise<{ asked: string[]; card: string | null }> {
  const acct = await signedIn();
  let r = await mount();
  await setUp(r, PEOPLE);
  const roster = await acct.repos.people.list();
  const id = (n: string) => roster.find((p) => p.display_name === n)!.id;
  const name = (i: string) => roster.find((p) => p.id === i)?.display_name ?? i;

  await tell(r, K4);
  const asked = await answer(r, run, readingMs);
  expect([shape, asked.filter((q, i) => asked.indexOf(q) !== i)]).toEqual([shape, []]);
  await settle(500);
  const card = texts(r).find((t) => /^Kept for/u.test(t)) ?? null;
  const onCard = texts(r);
  await tapLast(r, "Done");
  await settle(300);
  expect([shape, texts(r).filter((t) => /^Kept for/u.test(t))]).toEqual([shape, []]);
  await acct.engine.sync();

  const want = run === "A" ? ["Anthony Lopez", "Sam Eden", "Chris"] : ["Anthony Lopez", "Chris"];
  const rows = (await serverRows<Row>("memory_items", acct.userId)).filter((m) => m.status === "active" && !m.deleted_at && /skating/u.test(m.statement));
  const saved = rows.map((m) => ({ statement: m.statement, people: [m.person_id, ...(m.with_person_ids ?? [])].map(name).sort() }));
  // In the note's words, or a mirror's that names the same people ("Chris loves ice skating with Anthony and
  // Sam" when every line the model gave named all three): Chris and Sam are never lost or doubled.
  expect([shape, saved.map((x) => x.people)]).toEqual([shape, [[...want].sort()]]);
  // K15: everything the note kept is on its card before the user is done with it.
  expect([shape, saved.filter((x) => !onCard.includes(x.statement)).map((x) => x.statement)]).toEqual([shape, []]);
  const words = saved[0].statement.split(/[^\p{L}]+/u);
  expect([shape, ["Anthony", "Sam", "Chris"].map((n) => words.filter((w) => w === n).length), /ice skating/u.test(saved[0].statement)])
    .toEqual([shape, [1, 1, 1], true]);
  // Everyone it is kept for, in the order the line names them.
  const spoken = (n: string) => n.split(" ")[0];
  const order = [...want].sort((a, b) => saved[0].statement.indexOf(spoken(a)) - saved[0].statement.indexOf(spoken(b)));
  expect([shape, card]).toEqual([shape, `Kept for ${order.slice(0, -1).join(", ")} and ${order[order.length - 1]}`]);

  // Every page agrees: the line is on each person it is about, and on no one else's.
  for (const p of PEOPLE) {
    await show(r, { screen: "knows", id: id(p) });
    const onPage = texts(r).some((t) => /ice skating/u.test(t));
    expect([shape, p, onPage]).toEqual([shape, p, want.includes(p)]);
  }

  // Reopened: nothing waiting, nothing asked again.
  await unmount();
  r = await mount();
  await settle(800);
  const again = texts(r).filter((t) => QUESTION.test(t) || WAITING.test(t));
  expect([shape, again]).toEqual([shape, []]);
  await acct.engine.sync();
  expect((await serverRows<Row>("memory_items", acct.userId)).filter((m) => m.status === "active" && !m.deleted_at && /skating/u.test(m.statement)).length).toBe(1);
  return { asked, card };
}
