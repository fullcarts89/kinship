import { mount, setUp, signedIn, tap, tell, texts, until, canTap, show, settle } from "./app";
import { serverRows, useReply } from "./localStack";
import { harness } from "./state";

const K4 = "Anthony and Sam love ice skating with Chris";
const PEOPLE = ["Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris"];

for (const shape of ["hand: on Chris", "hand: on Anthony", "hand: on no one", "hand: a line each"]) {
  it(`K4 run A through the screens (${shape})`, async () => {
    await useReply(K4, shape);
    const acct = await signedIn();
    const r = await mount();
    await setUp(r, PEOPLE);
    await tell(r, K4);
    await until(r, (s) => s.some((t) => /^Which (Sam|Anthony) do you mean\?$/u.test(t) || /^One thing to check|^\d+ things to check/u.test(t)), "a question");
    const waitingLine = texts(r).find((t) => /^One thing to check|^\d+ things to check/u.test(t));
    if (waitingLine && !texts(r).some((t) => /^Which (Sam|Anthony) do you mean\?$/u.test(t))) await tap(r, waitingLine);
    await until(r, (s) => s.some((t) => /^Which (Sam|Anthony) do you mean\?$/u.test(t) || t === "Who is this about?"), "the question sheet");
    const log: string[] = [];
    for (let step = 0; step < 6; step++) {
      const s = texts(r);
      const q = s.find((t) => /^Which (Sam|Anthony) do you mean\?$/u.test(t) || t === "Who is this about?" || /^Remember this/u.test(t));
      if (!q) break;
      log.push(`Q: ${q} | ${JSON.stringify(s.slice(s.indexOf(q)))}`);
      if (q.startsWith("Which Anthony") || q === "Who is this about?") await tap(r, "Anthony Test");
      else if (q.startsWith("Which Sam")) {
        await tap(r, "Someone else");
        log.push(`PICKER: ${JSON.stringify(texts(r))}`);
        await tap(r, "Sam Eden");
      } else await tap(r, "Remember");
      await settle(300);
    }
    await until(r, (s) => !s.some((t) => /^Which (Sam|Anthony)/u.test(t)), "questions to end", 30000).catch(() => undefined);
    log.push(`AFTER: ${JSON.stringify(texts(r))}`);
    if (canTap(r, "Done")) await tap(r, "Done");
    await settle(500);
    await acct.engine.sync();
    const items = (await serverRows<{ person_id: string; with_person_ids: string[] | null; statement: string; status: string; deleted_at: string | null }>("memory_items", acct.userId))
      .filter((m) => m.status === "active" && !m.deleted_at);
    const people = await serverRows<{ id: string; display_name: string }>("people", acct.userId);
    const name = (id: string) => people.find((p) => p.id === id)?.display_name ?? id;
    log.push(`SAVED: ${JSON.stringify(items.map((m) => [name(m.person_id), (m.with_person_ids ?? []).map(name), m.statement]))}`);
    console.log(`=== ${shape}\n${log.join("\n")}`);
    void show; void harness;
  });
}
