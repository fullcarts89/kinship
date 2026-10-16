// K19 (founder device check, 14 Oct, step 5): after reopening, Today was only "Wednesday, 14 October" and
// "Good afternoon." Through the real screens and the local backend, with the founder's People: a note whose
// card is still up (nothing else on Today), told, understood, asked about, answered, and the app reopened.
// At every step Today says something under its greeting, and writes its date the one way ("Thursday, Oct 15").
import type TestRenderer from "react-test-renderer";
import { canTap, mount, setUp, settle, signedIn, tap, tell, texts, unmount, until } from "./app";
import { useReply as chooseReply } from "./localStack";
import { K4, PEOPLE } from "./k4flow";

const GREETING = /^Good (morning|afternoon|evening)/u;

/** What Today says under its greeting, before the Tell dock and the bar. */
function underGreeting(r: TestRenderer.ReactTestRenderer): string[] {
  const s = texts(r);
  const g = s.findIndex((t) => GREETING.test(t));
  return s.slice(g + 1).filter((t) => !/^(Today|People|Done)$/u.test(t));
}

function notBare(r: TestRenderer.ReactTestRenderer, step: string) {
  const s = texts(r);
  expect([step, s.findIndex((t) => GREETING.test(t)) >= 0]).toEqual([step, true]);
  expect([step, underGreeting(r).length > 0]).toEqual([step, true]);
  expect([step, s.filter((t) => /^\w+day, \d+ \w+$/u.test(t))]).toEqual([step, []]);
  expect([step, s.some((t) => /^\w+day, [A-Z][a-z]{2} \d{1,2}$/u.test(t))]).toEqual([step, true]);
}

for (const shape of ["hand: on Chris", "live 10 (14 Oct, founder People: the whole on Chris + Anthony's piece; 1 of 5, split before the fix)"]) {
  it(`K19 (${shape}): Today is never only a date and a greeting, told, asked, kept or reopened`, async () => {
    await chooseReply(K4, shape);
    await signedIn();
    let r = await mount();
    await setUp(r, PEOPLE);
    // Replayed, the reading is instant: "Understanding…" itself is shown on the native simulator (15 Oct).
    await tell(r, K4);
    notBare(r, "just told");
    await until(r, (s) => s.some((t) => /^(Which (Sam|Anthony) do you mean\?|One thing to check about)/u.test(t)), "the questions", 30000);
    notBare(r, "asked");
    for (let step = 0; step < 4; step++) {
      await settle(200);
      const s = texts(r);
      const waiting = s.find((t) => /^One thing to check about/u.test(t));
      if (waiting && !s.some((t) => /^Which/u.test(t))) await tap(r, waiting);
      const q = texts(r).find((t) => /^Which (Sam|Anthony) do you mean\?$/u.test(t));
      if (!q) break;
      if (q.startsWith("Which Anthony")) await tap(r, "Anthony Lopez");
      else { await tap(r, "Someone else"); await tap(r, "Sam Eden"); }
    }
    await settle(500);
    if (canTap(r, "Done") && texts(r).includes("Here's what I'll remember.")) await tap(r, "Done");
    await settle(300);
    notBare(r, "kept, card up");
    // Reopened with the card never dismissed (the founder's step 5).
    await unmount();
    r = await mount();
    await settle(2000);
    notBare(r, "reopened");
    console.log(`K19 (${shape}) reopened: ${JSON.stringify(underGreeting(r).slice(0, 4))}`);
  });
}
