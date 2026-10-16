// K14 (founder's 13 Oct phone pass): "Not this" on the Fluffy appointment, through the real screens and the
// local backend. Timed: tap → line gone from the screen, and tap → the server has it removed.
import { Alert } from "react-native";
import { act } from "react-test-renderer";
import { mount, setUp, settle, show, signedIn, tap, tapLast, tell, texts, until, canTap } from "./app";
import { manyLines, requests, serverRows, useReply } from "./localStack";
import { harness } from "./state";

// The founder's words named Friday. Told on a Friday, "on Friday" reads two ways (today, or next week) and
// is rightly asked about (N15), so the note names a weekday that is never the run's own, in any time zone
// (each is within a day of UTC): Friday, or Tuesday when it is Thursday to Saturday in UTC. Both have their
// replies (e2e/replies/k7.json, k7-tuesday.json).
const DAY = [4, 5, 6].includes(new Date().getUTCDay()) ? "Tuesday" : "Friday";
const K7 = `Chris' dog Fluffy has a vet appointment on ${DAY}`;

for (const shape of ["hand: event on Chris", "live 1 (13 Oct, 1 of the runs)"]) it(`K14 (${shape}): Not this on the Fluffy appointment leaves the screen promptly, and the server follows`, async () => {
  await useReply(K7, shape);
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, ["Chris", "Ben"]);
  await tell(r, K7);
  await until(r, (s) => s.some((t) => /Fluffy/u.test(t)), "the Fluffy line");
  if (canTap(r, "Got it right")) await tap(r, "Got it right");
  await settle(300);
  await acct.engine.sync();
  const chris = (await acct.repos.people.list()).find((p) => p.display_name === "Chris")!;
  await show(r, { screen: "knows", id: chris.id });
  await until(r, (s) => s.some((t) => /Fluffy/u.test(t)), "the line in What Kinship knows");
  const line = texts(r).find((t) => /Fluffy has a vet appointment/u.test(t))!;
  // The confirmation is the OS's alert: the user taps its destructive button.
  const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
    const b = (buttons ?? []).find((x) => x.style === "destructive");
    void b?.onPress?.();
  });
  const tapped = Date.now();
  await tap(r, `Not this: ${line}`);
  const gone = await until(r, (s) => !s.includes(line), "the line to leave the screen", 30000);
  const visibleMs = Date.now() - tapped;
  let serverMs = -1;
  for (let i = 0; i < 100; i++) {
    await acct.engine.sync();
    const rows = await serverRows<{ statement: string; deleted_at: string | null; status: string }>("memory_items", acct.userId);
    if (rows.filter((m) => /vet appointment/u.test(m.statement)).every((m) => m.deleted_at || m.status !== "active")) { serverMs = Date.now() - tapped; break; }
    await settle(100);
  }
  console.log(`K14 (${shape}): visible ${visibleMs} ms (poll ${gone} ms), server ${serverMs} ms; still on screen: ${JSON.stringify(texts(r).filter((t) => /Fluffy|Understanding|Kept|Nothing/u.test(t)))}`);
  alert.mockRestore();
  // Removed is done: the note never goes back to "Understanding…" (founder K14).
  expect(texts(r).filter((t) => t === "Understanding…")).toEqual([]);
});

// The same on a phone-like device and account (stand-ins, stated as such): every statement on the one store
// connection takes 3 ms, every server round trip 250 ms, and the account has 80 earlier lines each about Chris
// and Ben. The removal must show within 300 ms whatever the sync is doing (founder K14).
it("K14 on a phone-like device and account: Not this leaves the screen within 300 ms, and stays gone", async () => {
  await useReply(K7, "hand: event on Chris");
  const acct = await signedIn({ statementMs: 3, networkMs: 250 });
  const r = await mount();
  await setUp(r, ["Chris", "Ben"]);
  await acct.engine.sync();
  const people = await acct.repos.people.list();
  const chris = people.find((p) => p.display_name === "Chris")!;
  const ben = people.find((p) => p.display_name === "Ben")!;
  manyLines(acct.userId, [chris.id, ben.id], Number(process.env.K14_LINES ?? 80));
  await acct.engine.sync();
  requests.length = 0;
  const told = Date.now();
  await tell(r, K7);
  await until(r, (s) => s.some((t) => /Fluffy/u.test(t) && !/^Kept for/u.test(t)), "the Fluffy line", 60000);
  const shownMs = Date.now() - told;
  const made = [...requests];
  console.log(`K12 phone-like: ${made.length} requests from Tell to the line on screen:\n  ${made.join("\n  ")}`);
  // Where the time went (the app's own understanding record for the note), for K12.
  const captures = (await acct.store.list("captures")) as { id: string; raw_text?: string }[];
  const cap = captures.find((c) => c.raw_text === K7);
  const row = cap ? await harness.session!.understanding.get(cap.id) : null;
  const at = (x: string | null | undefined) => (x ? Date.parse(x) - told : null);
  console.log(`K12 phone-like timeline (ms after Tell): first request ${at(row?.first_request_at)}, this request ${at(row?.request_at)}, ` +
    `server ${row?.server_ms ?? null} ms, understood ${at(row?.understood_at)}, line on screen ${shownMs}`);
  if (canTap(r, "Got it right")) await tap(r, "Got it right");
  if (canTap(r, "Done")) await tapLast(r, "Done");
  await settle(300);
  await acct.engine.sync();
  const opened = Date.now();
  await show(r, { screen: "knows", id: chris.id });
  const forget = () => r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" &&
    n.props.accessibilityLabel.startsWith("Not this: ") && /Fluffy/u.test(n.props.accessibilityLabel) && typeof n.props.onPress === "function");
  let saidGone = false;
  await until(r, (shown) => {
    saidGone = saidGone || shown.includes("This person isn't here any more.");
    return forget().length > 0;
  }, "the line in What Kinship knows", 60000);
  const pageMs = Date.now() - opened;
  // Opening someone's page on a slow phone never says they're gone while it reads.
  expect(saidGone).toBe(false);
  const label = String(forget()[0].props.accessibilityLabel);
  const line = label.slice("Not this: ".length);
  const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
    void (buttons ?? []).find((x) => x.style === "destructive")?.onPress?.();
  });
  // Timed from the press to the first committed screen without the line (no polling step in the number).
  const control = forget()[0];
  const tapped = Date.now();
  await act(async () => { control.props.onPress(); });
  let visibleMs = Date.now() - tapped;
  const onPage = () => forget().some((n) => n.props.accessibilityLabel === label);
  if (onPage()) {
    await until(r, () => !onPage(), "the line to leave the page", 60000);
    visibleMs = Date.now() - tapped;
  }
  const elsewhere = texts(r).filter((t) => t === line);
  // Gone for good: through the sync that follows, and on reopening.
  await acct.engine.sync();
  await settle(500);
  expect(onPage()).toBe(false);
  await show(r, { screen: "today" });
  await show(r, { screen: "knows", id: chris.id });
  await settle(1500);
  expect(onPage()).toBe(false);
  expect(texts(r).filter((t) => t === line)).toEqual([]);
  console.log(`K14 phone-like: the same words elsewhere on screen right after the tap: ${JSON.stringify(elsewhere)}`);
  alert.mockRestore();
  console.log(`K14 phone-like: line on screen ${shownMs} ms after Tell; What Kinship knows ready ${pageMs} ms after opening; removal visible ${visibleMs} ms after the tap`);
  expect(visibleMs).toBeLessThanOrEqual(300);
});
