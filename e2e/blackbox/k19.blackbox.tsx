// K19 / K24 (founder device checks, 14 and 16 Oct). Through the real screens and the local backend, with the
// founder's People: a note told on a quiet day, understood, asked about, answered, kept with its card up, and
// the app reopened. The Tell dock alone says "Understanding…" (K24: never also as Today's headline), "Nothing
// needs you today." never shows while the note is on screen, Today writes its date the one way ("Thursday,
// Oct 15"), and once the note is done Today recomputes as usual.
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

const QUIET = "Nothing needs you today.";

/** While a note is on screen: no "Understanding…" headline beside the dock's, no quiet-day headline, one date format. */
function calm(r: TestRenderer.ReactTestRenderer, step: string) {
  const s = texts(r);
  expect([step, s.findIndex((t) => GREETING.test(t)) >= 0]).toEqual([step, true]);
  expect([step, s.filter((t) => /^Understanding/u.test(t)).length <= 1]).toEqual([step, true]);
  expect([step, s.includes(QUIET)]).toEqual([step, false]);
  expect([step, s.filter((t) => /^\w+day, \d+ \w+$/u.test(t))]).toEqual([step, []]);
  expect([step, s.some((t) => /^\w+day, [A-Z][a-z]{2} \d{1,2}$/u.test(t))]).toEqual([step, true]);
}

for (const shape of ["hand: on Chris", "live 10 (14 Oct, founder People: the whole on Chris + Anthony's piece; 1 of 5, split before the fix)"]) {
  it(`K19/K24 (${shape}): only the dock says Understanding; no quiet headline while the note is on screen; Today recomputes after`, async () => {
    await chooseReply(K4, shape);
    await signedIn();
    let r = await mount();
    await setUp(r, PEOPLE);
    // Replayed, the reading is instant: "Understanding…" itself is shown on the native simulator (15 Oct).
    await tell(r, K4);
    calm(r, "just told");
    await until(r, (s) => s.some((t) => /^(Which (Sam|Anthony) do you mean\?|One thing to check about)/u.test(t)), "the questions", 30000);
    calm(r, "asked");
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
    calm(r, "kept, card up");
    // Reopened with the card never dismissed (the founder's step 5): still calm.
    await unmount();
    r = await mount();
    await settle(2000);
    calm(r, "reopened");
    // Done with the note: Today recomputes as usual, with a headline of its own under the greeting.
    if (canTap(r, "Got it")) await tap(r, "Got it");
    await settle(500);
    const after = underGreeting(r);
    console.log(`K19/K24 (${shape}) after the card: ${JSON.stringify(after.slice(0, 3))}`);
    expect([shape, after.length > 0]).toEqual([shape, true]);
  });
}
