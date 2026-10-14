// The founder's 13 Oct native scenarios with the LIVE model (the stub in --record mode forwards each call to
// the real Messages API and keeps the structured reply in e2e/.captured/), through the real screens, network
// client, ai-gateway and database functions of the local stack. Runs only with LIVE=1; ~20 model calls.
import { Alert, AppState } from "react-native";
import type TestRenderer from "react-test-renderer";
import { act } from "react-test-renderer";
import { mount, setUp, settle, show, signedIn, tap, tell, texts, until, unmount, canTap } from "./app";
import { serverRows } from "./localStack";
import { harness } from "./state";

const live = process.env.LIVE === "1" ? describe : describe.skip;
const K4 = "Anthony and Sam love ice skating with Chris";
const K4_PEOPLE = ["Anthony", "Anthony Test", "Sam Eden", "Sam Doughty", "Chris"];
const K2 = "Ben said he'd send me the photos last Friday";
const N6 = "I need to call John tonight";
const K7 = "Chris' dog Fluffy has a vet appointment on Friday";
const QUESTION = /^(Which (Sam|Anthony) do you mean\?|Who is this about\?|Who is “.*”\?|Remember this.*|Is this about .*|Whose promise\?|Which day\?)$/u;
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;

type Rows = { person_id: string; with_person_ids: string[] | null; statement: string; status: string; deleted_at: string | null; detail: Record<string, unknown> }[];

async function saved(userId: string, names: Map<string, string>) {
  const rows = (await serverRows("memory_items", userId)) as unknown as Rows;
  return rows.filter((m) => m.status === "active" && !m.deleted_at)
    .map((m) => ({ person: names.get(m.person_id) ?? m.person_id, with: (m.with_person_ids ?? []).map((x) => names.get(x) ?? x), statement: m.statement, due: m.detail?.due_date ?? m.detail?.date ?? null }));
}

/** Walks whatever questions the reading asks, as the founder's checklist says; a repeat after an answer is a loop. */
async function walk(r: TestRenderer.ReactTestRenderer, run: "A" | "B"): Promise<{ asked: string[]; loop: boolean; choices: string[][] }> {
  const asked: string[] = [];
  const choices: string[][] = [];
  const waiting = texts(r).find((t) => /^One thing to check about|^\d+ things to check/u.test(t));
  if (waiting && !texts(r).some((t) => QUESTION.test(t))) await tap(r, waiting);
  for (let step = 0; step < 8; step++) {
    await settle(300);
    const s = texts(r);
    const q = s.find((t) => QUESTION.test(t));
    if (!q) break;
    asked.push(q);
    choices.push(s.slice(s.indexOf(q), s.indexOf(q) + 8));
    if (q.startsWith("Which Anthony") || q === "Who is this about?") await tap(r, canTap(r, "Anthony Test") ? "Anthony Test" : "Someone else");
    else if (q.startsWith("Which Sam")) {
      if (run === "A") { await tap(r, "Someone else"); await tap(r, "Sam Eden"); } else await tap(r, "Not sure");
    } else if (canTap(r, "Remember")) await tap(r, "Remember");
    else break;
  }
  const loop = asked.some((q, i) => asked.indexOf(q) !== i);
  return { asked, loop, choices };
}

async function appState(state: "background" | "active") {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
  await act(async () => { for (const fn of [...(harness.appListeners ?? [])]) fn(state); });
}

live("LIVE model, through the real app path", () => {
  for (let n = 1; n <= 10; n++) {
    const run = n % 2 === 1 ? "A" : "B";
    it(`K4 live #${n}, run ${run}`, async () => {
      const acct = await signedIn();
      const r = await mount();
      await setUp(r, K4_PEOPLE);
      const names = new Map((await acct.repos.people.list()).map((p) => [p.id, p.display_name]));
      const t0 = Date.now();
      await tell(r, K4);
      const readingMs = await until(r, (s) => s.some((t) => QUESTION.test(t) || READING.test(t)), "the reading", 120000);
      const w = await walk(r, run);
      await settle(800);
      const card = texts(r).slice(texts(r).findIndex((t) => /^Kept for|^Kept as/u.test(t)));
      if (canTap(r, "Done")) await tap(r, "Done");
      await settle(500);
      await acct.engine.sync();
      const rows = await saved(acct.userId, names);
      console.log(`LIVE K4 #${n} run ${run} | reading ${readingMs} ms (${Date.now() - t0} ms total)\n  asked: ${JSON.stringify(w.asked)} loop=${w.loop}\n  choices: ${JSON.stringify(w.choices)}\n  card: ${JSON.stringify(card.slice(0, 12))}\n  saved: ${JSON.stringify(rows)}`);
    });
  }

  for (let n = 1; n <= 5; n++) {
    it(`K2 live #${n}`, async () => {
      const acct = await signedIn();
      const r = await mount();
      await setUp(r, ["Ben", "Chris"]);
      const names = new Map((await acct.repos.people.list()).map((p) => [p.id, p.display_name]));
      await tell(r, K2);
      const readingMs = await until(r, (s) => s.some((t) => QUESTION.test(t) || READING.test(t)), "the reading", 120000);
      const before = texts(r);
      const w = await walk(r, "A");
      await settle(800);
      if (canTap(r, "Got it right")) await tap(r, "Got it right");
      if (canTap(r, "Done")) await tap(r, "Done");
      await settle(500);
      await acct.engine.sync();
      const rows = await saved(acct.userId, names);
      const ben = (await acct.repos.people.list()).find((p) => p.display_name === "Ben")!;
      await show(r, { screen: "person", id: ben.id });
      const page = texts(r).filter((t) => /photos|Waiting|By |Oct/u.test(t));
      console.log(`LIVE K2 #${n} | reading ${readingMs} ms\n  review: ${JSON.stringify(before.filter((t) => /photos|By |Oct|Remember|Ben/u.test(t)))}\n  asked: ${JSON.stringify(w.asked)}\n  saved: ${JSON.stringify(rows)}\n  Ben's page: ${JSON.stringify(page)}`);
    });
  }

  for (let n = 1; n <= 3; n++) {
    it(`N6 live #${n}`, async () => {
      await signedIn();
      let r = await mount();
      await setUp(r, ["John", "Ben"]);
      const t0 = Date.now();
      await tell(r, N6);
      const readingMs = await until(r, (s) => s.some((t) => QUESTION.test(t) || READING.test(t)), "the reading", 120000);
      await walk(r, "A");
      const johnMs = await until(r, (s) => s.some((t) => /John/u.test(t) && !/^Kept for/u.test(t) && t !== N6), "the John line", 60000).catch(() => -1);
      const quiet = () => texts(r).includes("Nothing needs you today.");
      const shown = (label: string) => `${label}: ${JSON.stringify(texts(r).filter((t) => !/^(Today|People|Done)$/u.test(t)).slice(0, 14))} quiet=${quiet()}`;
      const log = [`LIVE N6 #${n} | reading ${readingMs} ms, John on Today ${johnMs} ms (${Date.now() - t0} ms total)`, shown("after Tell")];
      if (canTap(r, "Got it right")) await tap(r, "Got it right");
      await unmount();
      r = await mount();
      await settle(800);
      log.push(shown("reopened"));
      const line = texts(r).find((t) => /John/u.test(t) && t !== N6);
      if (line) {
        await tap(r, line);
        if (canTap(r, "Message")) {
          await tap(r, "Message");
          await appState("background");
          const back = Date.now();
          await appState("active");
          const asked = await until(r, (s) => s.some((t) => /^Did you reach John/u.test(t)), "the return question", 70000).catch(() => -1);
          log.push(`${shown("return")} (question ${asked} ms after foreground, ${Date.now() - back} ms)`);
          if (canTap(r, "Not yet")) await tap(r, "Not yet");
          await settle(800);
          log.push(shown("after Not yet"));
        } else log.push(`no Message on the detail: ${JSON.stringify(texts(r))}`);
      }
      console.log(log.join("\n  "));
    });
  }

  for (let n = 1; n <= 2; n++) {
    it(`K14 live #${n}`, async () => {
      const acct = await signedIn();
      const r = await mount();
      await setUp(r, ["Chris", "Ben"]);
      await tell(r, K7);
      const readingMs = await until(r, (s) => s.some((t) => QUESTION.test(t) || READING.test(t)), "the reading", 120000);
      await walk(r, "A");
      if (canTap(r, "Got it right")) await tap(r, "Got it right");
      await settle(500);
      await acct.engine.sync();
      const chris = (await acct.repos.people.list()).find((p) => p.display_name === "Chris")!;
      await show(r, { screen: "knows", id: chris.id });
      const line = texts(r).find((t) => /Fluffy/u.test(t));
      let result = `no Fluffy line: ${JSON.stringify(texts(r))}`;
      if (line) {
        const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, b) => { void (b ?? []).find((x) => x.style === "destructive")?.onPress?.(); });
        const t = Date.now();
        await tap(r, `Not this: ${line}`);
        await until(r, (s) => !s.some((x) => /Fluffy/u.test(x)), "removal", 30000);
        result = `removed from the screen in ${Date.now() - t} ms`;
        alert.mockRestore();
      }
      console.log(`LIVE K14 #${n} | reading ${readingMs} ms | ${result}`);
    });
  }
});
