// K8 / K9 with the account as the founder's was on 13 Oct: the K4 note already told once (12 Oct, kept for
// Sam Eden and Chris), then told again and answered as the checklist says (runs A and B). Through the real
// screens and the local backend: one memory about everyone, never a second with the same words.
import type TestRenderer from "react-test-renderer";
import { mount, setUp, settle, signedIn, tap, tell, texts, until, canTap } from "./app";
import { legacyLine, serverRows, useReply } from "./localStack";

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

const SHAPES = ["legacy: on Chris, update", "legacy: on Chris, same", "legacy: on Sam Eden, same", "legacy: on Anthony, update", "legacy: on no one, same",
  "hand: on Chris", "hand: on Anthony", "live 2 (13 Oct, 3 of the runs)", "live 6 (13 Oct, 1 of the runs)"];
for (const shape of SHAPES) for (const run of ["A", "B"] as const) {
  it(`K8/K9 with the 12 Oct line already there, told again (${shape}), run ${run}`, async () => {
    const acct = await signedIn();
    const r = await mount();
    await setUp(r, PEOPLE);
    const people = await acct.repos.people.list();
    const name = (id: string) => people.find((p) => p.id === id)?.display_name ?? id;
    const saved = async () => (await serverRows<{ person_id: string; with_person_ids: string[] | null; statement: string; status: string; deleted_at: string | null }>("memory_items", acct.userId))
      .filter((m) => m.status === "active" && !m.deleted_at).map((m) => [name(m.person_id), (m.with_person_ids ?? []).map(name), m.statement]);
    // 12 Oct: the line as the build of that day kept it, on Sam Eden and Chris, in the note's words.
    await acct.engine.sync();
    const id = (n: string) => people.find((p) => p.display_name === n)!.id;
    legacyLine(acct.userId, K4, id("Sam Eden"), [id("Chris")],
      [{ person_id: id("Sam Eden"), text: "Sam", name: "Sam Eden" }, { person_id: id("Chris"), text: "Chris", name: "Chris" }]);
    await acct.engine.sync();
    const first: string[] = [];
    const before = await saved();
    // 13 Oct: the same note again, answered as the checklist says.
    await useReply(K4, shape);
    await tell(r, K4);
    await until(r, (s) => s.some((t) => QUESTION.test(t) || /^One thing to check about|^Kept for|Kept as you wrote/u.test(t)), "the second reading", 60000);
    const second = await answer(r, run);
    const screen = texts(r);
    if (canTap(r, "Done")) await tap(r, "Done");
    await settle(500);
    await acct.engine.sync();
    const after = await saved();
    console.log(`=== ${shape} run ${run}\n  first questions: ${JSON.stringify(first)}\n  before: ${JSON.stringify(before)}\n  second questions: ${JSON.stringify(second)}\n  after: ${JSON.stringify(after)}`);
    void screen;
    expect([shape, second.filter((q, i) => second.indexOf(q) !== i)]).toEqual([shape, []]);
    expect([shape, before.map(([who, others]) => [who, ...(others as string[])].sort())]).toEqual([shape, [["Chris", "Sam Eden"]]]);
    // One memory, now about Anthony Test as well; Sam Eden stays (run B's "Not sure" never unlinks what was answered before).
    const skating = after.filter((m) => /skating/u.test(String(m[2])));
    expect([shape, skating.map(([who, others]) => [who, ...(others as string[])].sort())]).toEqual([shape, [["Anthony Test", "Chris", "Sam Eden"]]]);
  });
}
