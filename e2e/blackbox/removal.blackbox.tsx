// K14 (founder's 13 Oct phone pass): "Not this" on the Fluffy appointment, through the real screens and the
// local backend. Timed: tap → line gone from the screen, and tap → the server has it removed.
import { Alert } from "react-native";
import { mount, setUp, settle, show, signedIn, tap, tell, texts, until, canTap } from "./app";
import { serverRows, useReply } from "./localStack";

const K7 = "Chris' dog Fluffy has a vet appointment on Friday";

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
  console.log(`K14 (${shape}): visible ${visibleMs} ms (poll ${gone} ms), server ${serverMs} ms; still on screen: ${JSON.stringify(texts(r).filter((t) => /Fluffy|Understanding/u.test(t)))}`);
  alert.mockRestore();
});
