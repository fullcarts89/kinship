// N6 / K11 / K13 (founder's 13 Oct phone pass), through the real screens and the local backend, with the
// live model's own reply: "I need to call John tonight" → Today → Message → back → Not yet → reopen.
// The whole Today screen is checked after every step.
import { AppState } from "react-native";
import type TestRenderer from "react-test-renderer";
import { act } from "react-test-renderer";
import { mount, setUp, settle, signedIn, tap, tell, texts, until, unmount, canTap } from "./app";
import { serverRows, useReply } from "./localStack";
import { harness } from "./state";

const N6 = "I need to call John tonight";
const QUIET = "Nothing needs you today.";

/** The OS sending the app to the background and back (every AppState listener the app registered). */
async function appState(state: "background" | "active") {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
  await act(async () => { for (const fn of [...(harness.appListeners ?? [])]) fn(state); });
}

/** K11's invariant, on the whole screen: never the quiet headline while anything about John is on Today. */
function coherent(r: TestRenderer.ReactTestRenderer, step: string) {
  const s = texts(r);
  const john = s.some((t) => /John/u.test(t));
  expect([step, john && s.includes(QUIET)]).toEqual([step, false]);
}

for (const shape of ["live 1 (13 Oct, 3 of the runs)", "hand: promise"]) {
  it(`N6/K11/K13 (${shape}): one truth on Today; the return question within a second; Not yet records nothing`, async () => {
    await useReply(N6, shape);
    const acct = await signedIn();
    let r = await mount();
    await setUp(r, ["John", "Ben"]);
    const told = Date.now();
    await tell(r, N6);
    await until(r, (s) => s.some((t) => /John/u.test(t) && t !== N6), "the John action", 30000);
    const shownMs = Date.now() - told;
    coherent(r, "after Tell");
    if (canTap(r, "Got it right")) await tap(r, "Got it right");
    coherent(r, "card answered");
    await unmount();
    r = await mount();
    await settle(500);
    coherent(r, "reopened");
    const line = texts(r).find((t) => /John/u.test(t))!;
    await tap(r, line);
    await tap(r, "Message");
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);
    coherent(r, "Messages open");
    await appState("background");
    const back = Date.now();
    await appState("active");
    const askedMs = await until(r, (s) => s.some((t) => /^Did you (?:reach|call) John/u.test(t)), "the return question", 5000);
    coherent(r, "return question");
    await tap(r, "Not yet");
    await settle(400);
    coherent(r, "after Not yet");
    expect(texts(r).some((t) => /John/u.test(t))).toBe(true);
    await acct.engine.sync();
    expect(await serverRows("contact_events", acct.userId)).toEqual([]);
    await unmount();
    r = await mount();
    await settle(500);
    coherent(r, "reopened after Not yet");
    console.log(`N6 (${shape}): John on Today ${shownMs} ms after Tell; return question ${askedMs} ms after foreground (${Date.now() - back} ms incl. checks)`);
    expect(askedMs).toBeLessThanOrEqual(1000);
  });
}
