// K10 (founder's 13 Oct phone pass): "Ben said he'd send me the photos last Friday", through the real screens
// and the local backend, on the real clock (Tue 13 Oct 2026 local). The date as stored and as each screen shows it.
import { mount, setUp, settle, show, signedIn, tap, tell, texts, until, canTap } from "./app";
import { serverRows, useReply } from "./localStack";

const K2 = "Ben said he'd send me the photos last Friday";

for (const shape of ["hand: promise last Friday", "hand: promise last Friday future"]) {
  it(`K10 (${shape}): "last Friday" is Fri Oct 9 everywhere, never another day`, async () => {
    await useReply(K2, shape);
    const acct = await signedIn();
    const r = await mount();
    await setUp(r, ["Ben", "Chris"]);
    await tell(r, K2);
    await until(r, (s) => s.some((t) => /photos/u.test(t) && t !== K2) || s.some((t) => /^Remember this|^One thing to check/u.test(t)), "the review");
    const log = [`review: ${JSON.stringify(texts(r))}`];
    const waiting = texts(r).find((t) => /^One thing to check about/u.test(t));
    if (waiting && !texts(r).some((t) => /^Remember this/u.test(t))) await tap(r, waiting);
    if (canTap(r, "Remember")) await tap(r, "Remember");
    await settle(800);
    if (canTap(r, "Got it right")) await tap(r, "Got it right");
    if (canTap(r, "Done")) await tap(r, "Done");
    await settle(500);
    await acct.engine.sync();
    const rows = await serverRows<{ statement: string; detail: Record<string, unknown>; status: string; deleted_at: string | null }>("memory_items", acct.userId);
    log.push(`stored: ${JSON.stringify(rows.filter((m) => !m.deleted_at).map((m) => [m.statement, m.detail?.due_date ?? m.detail?.date ?? null, m.detail?.due_hint ?? null, m.detail?.date_precision ?? null]))}`);
    const ben = (await acct.repos.people.list()).find((p) => p.display_name === "Ben")!;
    await show(r, { screen: "person", id: ben.id });
    log.push(`Ben's page: ${JSON.stringify(texts(r))}`);
    await show(r, { screen: "today" });
    log.push(`Today: ${JSON.stringify(texts(r))}`);
    console.log(`=== ${shape}\n${log.join("\n")}`);
  });
}
