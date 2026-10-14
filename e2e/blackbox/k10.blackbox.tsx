// K10 (founder's 13 Oct phone pass): the photos promise told first as the checklist suggested ("…yesterday",
// on Tue 13 Oct = Mon 12 Oct), then as the founder reported it ("…last Friday" = Fri 9 Oct). The live model's
// own reply for the second. Through the real screens and the local backend.
import { mount, setUp, settle, show, signedIn, tap, tell, texts, until, canTap } from "./app";
import { serverRows, useReply } from "./localStack";

const Y = "Ben said he'd send me the photos yesterday";
const F = "Ben said he'd send me the photos last Friday";
const REVIEW = /^(Remember this about Ben\?|Kept for Ben)/u;

async function through(r: Parameters<typeof tap>[0]) {
  await until(r, (s) => s.some((t) => REVIEW.test(t)), "the review");
  const shown = texts(r).filter((t) => /photos|By |Oct|Remember/u.test(t));
  if (canTap(r, "Remember")) await tap(r, "Remember");
  await settle(500);
  if (canTap(r, "Got it right")) await tap(r, "Got it right");
  if (canTap(r, "Done")) await tap(r, "Done");
  await settle(300);
  return shown;
}

it("K10: '…yesterday' then '…last Friday': what is remembered, and on which day", async () => {
  await useReply(F, "live 1 (13 Oct, 5 of the runs)");
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, ["Ben", "Chris"]);
  await tell(r, Y);
  const first = await through(r);
  await acct.engine.sync();
  await tell(r, F);
  const second = await through(r);
  await acct.engine.sync();
  const rows = (await serverRows<{ statement: string; detail: Record<string, unknown>; status: string; deleted_at: string | null }>("memory_items", acct.userId))
    .map((m) => [m.statement, m.status, m.deleted_at ? "deleted" : "", m.detail?.due_date ?? null, m.detail?.due_hint ?? null]);
  const ben = (await acct.repos.people.list()).find((p) => p.display_name === "Ben")!;
  await show(r, { screen: "person", id: ben.id });
  const page = texts(r).filter((t) => /photos|By |Waiting|Oct/u.test(t));
  console.log(`K10\n  first review: ${JSON.stringify(first)}\n  second review: ${JSON.stringify(second)}\n  stored: ${JSON.stringify(rows)}\n  Ben's page: ${JSON.stringify(page)}`);
  // What the review promised for "last Friday" is what's kept: Fri 9 Oct, its own line, never merged into Mon 12.
  expect(second).toContain("Ben · By Fri, Oct 9");
  const live = rows.filter((x) => x[1] === "active" && !x[2]);
  expect(live.map((x) => [x[3], x[4]]).sort()).toEqual([["2026-10-09", "last Friday"], ["2026-10-12", "yesterday"]]);
});
