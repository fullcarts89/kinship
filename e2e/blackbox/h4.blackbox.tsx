// H4 (founder CC-17, CC-20; 15 Oct: "the next Phase 4A product step"): a new user, through setup's own first
// Tell, the real screens and the local backend. Once the first Tell is memory, Today shows once how Kinship
// brings things back: with their own words when the first Tell has a day to come, else the one example.
// "Got it" and it's gone, also after reopening.
import { BRING_BACK_COPY } from "@/features/today/TodayView";
import { canTap, mount, setUp, settle, signedIn, tap, tapLast, texts, unmount, until } from "./app";
import { useReply as chooseReply } from "./localStack";

const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John"];
const JOHN = "I need to call John tonight";
const K4 = "Anthony and Sam love ice skating with Chris";

it("H4 (a first Tell with a day to come): their own words, when it comes back, and the question after", async () => {
  await chooseReply(JOHN, "live 1 (13 Oct, 3 of the runs)");
  await signedIn();
  let r = await mount();
  await setUp(r, PEOPLE, JOHN);
  await until(r, (s) => s.includes(BRING_BACK_COPY.title), "how Kinship brings things back", 30000);
  const s = texts(r);
  expect(s).toEqual(expect.arrayContaining([BRING_BACK_COPY.told, "Call John", "Today", BRING_BACK_COPY.back, BRING_BACK_COPY.ask("John")]));
  expect(s).not.toContain(BRING_BACK_COPY.example);
  // The real line is on Today under it, and it's never the quiet day.
  expect(canTap(r, "Today: Call John")).toBe(true);
  expect(s).not.toContain("Nothing needs you today.");
  await tap(r, BRING_BACK_COPY.done);
  await settle(300);
  expect(texts(r)).not.toContain(BRING_BACK_COPY.title);
  await unmount();
  r = await mount();
  await settle(800);
  expect(texts(r)).not.toContain(BRING_BACK_COPY.title);
});

it("H4 (a first Tell with no day): the one example, then gone", async () => {
  await chooseReply(K4, "hand: on Chris");
  await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE, K4);
  for (let step = 0; step < 6; step++) {
    await settle(300);
    if (texts(r).includes(BRING_BACK_COPY.title)) break;
    const q = texts(r).find((t) => /^Which (Sam|Anthony) do you mean\?$/u.test(t));
    const waiting = texts(r).find((t) => /^One thing to check about/u.test(t));
    if (q?.startsWith("Which Anthony")) await tap(r, "Anthony Lopez");
    else if (q) await tap(r, "Sam Eden");
    else if (waiting) await tap(r, waiting);
    else if (canTap(r, "Done") && texts(r).includes("Here's what I'll remember.")) await tapLast(r, "Done");
  }
  await until(r, (s) => s.includes(BRING_BACK_COPY.title), "how Kinship brings things back", 30000);
  expect(texts(r)).toEqual(expect.arrayContaining([BRING_BACK_COPY.example, BRING_BACK_COPY.exampleNote, BRING_BACK_COPY.exampleAsk]));
  await tap(r, BRING_BACK_COPY.done);
  await settle(300);
  expect(texts(r)).not.toContain(BRING_BACK_COPY.title);
});
