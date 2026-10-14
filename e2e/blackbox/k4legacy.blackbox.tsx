// K8 / K9 with the account as the founder's was on 13 Oct: the K4 note already told once (12 Oct), then told
// again and answered as the checklist says (run A). Through the real screens and the local backend.
import type TestRenderer from "react-test-renderer";
import { mount, setUp, settle, signedIn, tap, tell, texts, until, canTap } from "./app";
import { serverRows, useReply } from "./localStack";

const K4 = "Anthony and Sam love ice skating with Chris";
const PEOPLE = ["Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris"];
const QUESTION = /^(Which (Sam|Anthony) do you mean\?|Who is this about\?|Remember this.*)$/u;

/** Walks the questions as the founder did; returns the prompts in order (a loop shows as repeats). */
async function answer(r: TestRenderer.ReactTestRenderer, run: "A" | "B" | "legacy"): Promise<string[]> {
  const seen: string[] = [];
  const waiting = texts(r).find((t) => /^One thing to check about|^\d+ things to check/u.test(t));
  if (waiting && !texts(r).some((t) => QUESTION.test(t))) await tap(r, waiting);
  for (let step = 0; step < 10; step++) {
    await settle(200);
    const q = texts(r).find((t) => QUESTION.test(t));
    if (!q) break;
    seen.push(q);
    if (q.startsWith("Which Anthony") || q === "Who is this about?") {
      if (run === "legacy") await tap(r, "Not sure"); else await tap(r, "Anthony Test");
    } else if (q.startsWith("Which Sam")) {
      if (run === "legacy") await tap(r, "Sam Eden");
      else if (run === "A") { await tap(r, "Someone else"); await tap(r, "Sam Eden"); }
      else await tap(r, "Not sure");
    } else await tap(r, "Remember");
  }
  return seen;
}

for (const shape of ["legacy: on Chris, update", "legacy: on Chris, same", "legacy: on Sam Eden, same", "legacy: on Anthony, update", "legacy: on no one, same", "hand: on Chris", "hand: on Anthony"]) {
  it(`K8/K9 with the 12 Oct line already there, told again (${shape}), run A`, async () => {
    const acct = await signedIn();
    const r = await mount();
    await setUp(r, PEOPLE);
    const people = await acct.repos.people.list();
    const name = (id: string) => people.find((p) => p.id === id)?.display_name ?? id;
    const saved = async () => (await serverRows<{ person_id: string; with_person_ids: string[] | null; statement: string; status: string; deleted_at: string | null }>("memory_items", acct.userId))
      .filter((m) => m.status === "active" && !m.deleted_at).map((m) => [name(m.person_id), (m.with_person_ids ?? []).map(name), m.statement]);
    // 12 Oct: the line on Sam Eden.
    await useReply(K4, "legacy: on Sam Eden");
    await tell(r, K4);
    await until(r, (s) => s.some((t) => QUESTION.test(t) || /^One thing to check about/u.test(t)), "the first questions");
    const first = await answer(r, "legacy");
    if (canTap(r, "Done")) await tap(r, "Done");
    await settle(500);
    await acct.engine.sync();
    const before = await saved();
    // 13 Oct: the same note again, answered as the checklist says.
    await useReply(K4, shape);
    await tell(r, K4);
    await until(r, (s) => s.some((t) => QUESTION.test(t) || /^One thing to check about|^Kept for|Kept as you wrote/u.test(t)), "the second reading", 60000);
    const second = await answer(r, "A");
    const screen = texts(r);
    if (canTap(r, "Done")) await tap(r, "Done");
    await settle(500);
    await acct.engine.sync();
    const after = await saved();
    console.log(`=== ${shape}\n  first questions: ${JSON.stringify(first)}\n  before: ${JSON.stringify(before)}\n  second questions: ${JSON.stringify(second)}\n  screen: ${JSON.stringify(screen.slice(-24))}\n  after: ${JSON.stringify(after)}`);
  });
}
