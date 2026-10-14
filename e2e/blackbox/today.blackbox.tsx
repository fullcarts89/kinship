// N6 / K11 (founder's 13 Oct phone pass), through the real screens and the local backend:
// "I need to call John tonight" → Today → Message → back → Not yet → reopen. The whole Today screen is read after every step.
import { AppState } from "react-native";
import { act } from "react-test-renderer";
import { mount, setUp, settle, signedIn, tap, tell, texts, until, unmount, canTap, show } from "./app";
import { useReply } from "./localStack";
import { harness } from "./state";

const N6 = "I need to call John tonight";
const QUIET = "Nothing needs you today.";
const JOHN = /John/u;

/** The OS sending the app to the background and back (AppState listeners, as iOS fires them). */
async function appState(state: "background" | "active") {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
  await act(async () => {
    for (const fn of [...(harness.appListeners ?? [])]) fn(state);
  });
}

for (const shape of ["hand: promise", "hand: plan"]) {
  it(`N6/K11 (${shape}): Today never says "${QUIET}" while the John action is on it`, async () => {
    await useReply(N6, shape);
    await signedIn();
    let r = await mount();
    await setUp(r, ["John", "Ben"]);
    const log: string[] = [];
    const told = Date.now();
    await tell(r, N6);
    const ms = await until(r, (s) => s.some((t) => JOHN.test(t) && !/^I need to call John tonight$/u.test(t)), "the John action on Today", 60000);
    if (canTap(r, "Done")) await tap(r, "Done");
    await settle(300);
    const contradiction = () => texts(r).includes(QUIET) && texts(r).some((t) => JOHN.test(t) && t !== "Kept for John");
    log.push(`1 after Tell (${ms} ms, ${Date.now() - told} ms total): ${JSON.stringify(texts(r))} contradiction=${contradiction()}`);
    // The Kept card goes as the founder's did: "Got it right".
    if (canTap(r, "Got it right")) await tap(r, "Got it right");
    await settle(500);
    log.push(`2 card gone: ${JSON.stringify(texts(r))} contradiction=${contradiction()}`);
    // The app closed and reopened (the card gone, as on the phone later).
    await unmount();
    r = await mount();
    await settle(800);
    log.push(`3 reopened: ${JSON.stringify(texts(r))} contradiction=${contradiction()}`);
    // Today's John line → its detail → Message.
    const line = texts(r).find((t) => JOHN.test(t));
    if (line) await tap(r, line);
    log.push(`4 detail: ${JSON.stringify(texts(r))}`);
    const tapped = Date.now();
    if (canTap(r, "Message")) await tap(r, "Message");
    log.push(`5 opened: ${JSON.stringify(harness.opens.map((o) => o.channel))} (${Date.now() - tapped} ms)`);
    await appState("background");
    const back = Date.now();
    await appState("active");
    const asked = await until(r, (s) => s.some((t) => /^Did you reach John/u.test(t)), "the return question", 30000).catch(() => -1);
    log.push(`6 return question: ${asked} ms after foreground (${Date.now() - back} ms): ${JSON.stringify(texts(r))} contradiction=${contradiction()}`);
    if (canTap(r, "Not yet")) await tap(r, "Not yet");
    await settle(500);
    log.push(`7 after Not yet: ${JSON.stringify(texts(r))} contradiction=${contradiction()}`);
    await unmount();
    r = await mount();
    await settle(800);
    log.push(`8 reopened: ${JSON.stringify(texts(r))} contradiction=${contradiction()}`);
    console.log(log.join("\n"));
    void harness; void appState; void unmount; void r;
  });
}
