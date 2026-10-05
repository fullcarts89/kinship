// "See how it works": one continuous example of the loop, labelled as an
// example on every step, saving nothing, with no AI words, and showing only
// what the product really does: its Today step is what Today itself says the
// day after Ben's race.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AFTER_PHASES, HOW_COPY, HowItWorksView } from "../HowItWorks";
import { buildToday } from "@/features/today/todayModel";
import { SETUP_COPY } from "@/features/setup/SetupViews";
import type { MemoryItem, Person } from "@/store/repositories";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
// It must never touch the user's data: the session isn't even available.
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => { throw new Error("the example must not read the store"); } }));

function render(step: number, initialPhase = 0) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<HowItWorksView step={step} onNext={() => undefined} onClose={() => undefined} initialPhase={initialPhase} />);
  });
  return tree;
}
const textsOf = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
function texts(step: number, initialPhase = 0): string[] {
  return textsOf(render(step, initialPhase));
}

it("four steps, each labelled as an example; the first says nothing is saved", () => {
  for (let i = 0; i < 4; i++) {
    const t = texts(i);
    expect(t).toContain(`An example · ${i + 1} of 4`);
    expect(t).toContain(HOW_COPY.steps[i].title);
  }
  expect(texts(0)).toContain(HOW_COPY.notSaved);
  // The last step ends on "Got it" only once the loop has closed.
  expect(texts(3)).toContain(HOW_COPY.next);
  expect(texts(3, AFTER_PHASES - 1)).toContain(HOW_COPY.done);
});

it("the last step plays the close of the loop: Yes → the question and a reply → what Kinship now remembers", () => {
  const tree = render(3);
  expect(textsOf(tree)).toEqual(expect.arrayContaining([HOW_COPY.reached, HOW_COPY.yes, HOW_COPY.notYet]));
  expect(textsOf(tree)).not.toContain(HOW_COPY.after);
  // Yes is a real button.
  const yes = tree.root.findAll((n) => n.props.accessibilityLabel === HOW_COPY.yes && typeof n.props.onPress === "function")[0];
  act(() => yes.props.onPress());
  expect(textsOf(tree)).toEqual(expect.arrayContaining([HOW_COPY.after, `“${HOW_COPY.reply}”`]));
  const next = tree.root.findAll((n) => n.props.accessibilityLabel === HOW_COPY.next && typeof n.props.onPress === "function")[0];
  act(() => next.props.onPress());
  const t = textsOf(tree);
  expect(t).toEqual(expect.arrayContaining([HOW_COPY.remembered, ...HOW_COPY.afterLines.map((l) => l.text), HOW_COPY.done]));
});

it("one continuous example: tell → remember → bring back → reach out and return", () => {
  expect(texts(0)).toContain(`“${HOW_COPY.note}”`);
  expect(texts(1)).toEqual(expect.arrayContaining([HOW_COPY.kept, "Ben", "Sun, Oct 11", HOW_COPY.goal]));
  expect(texts(2)).toEqual(expect.arrayContaining([HOW_COPY.moment, HOW_COPY.context, HOW_COPY.hope, HOW_COPY.ask]));
  expect(texts(3, AFTER_PHASES - 1)).toEqual(expect.arrayContaining([HOW_COPY.reached, HOW_COPY.after]));
});

it("its Today step is exactly what Today says the day after Ben's race", () => {
  const ben = { id: "ben", display_name: "Ben", state: "active" } as unknown as Person;
  const race = {
    id: "m1", kind: "event", person_id: "ben", statement: HOW_COPY.kept, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after", event_goal: "break four hours" },
  } as unknown as MemoryItem;
  const v = buildToday({
    now: new Date(2026, 9, 12, 9, 0), today: "2026-10-12", items: [race], people: [ben], local: {}, primaries: [], handoff: null,
    told: 1, questions: 0, toLookAt: 0, provenance: () => ({ line: HOW_COPY.told, noteId: "c1" }),
    reasons: [{ id: "r1", person_id: "ben", type: "event_followup", window_start: new Date(2026, 9, 12).toISOString(),
      window_end: new Date(2026, 9, 14).toISOString(), score: 90, state: "candidate", dedupe_key: "event_followup:m1:2026-10-11" }],
  });
  expect(v.moment?.statement).toBe(HOW_COPY.moment);
  expect(v.moment?.context).toBe(HOW_COPY.context);
  // The hope it was told with comes back with it.
  expect(v.moment?.hope).toBe(HOW_COPY.hope);
  expect(v.moment?.primary.label).toBe(HOW_COPY.ask);
});

it("no AI words, and the first Tell's examples aren't about health", () => {
  const all = [
    ...(Object.values(HOW_COPY) as unknown[]).filter((v): v is string => typeof v === "string"),
    ...HOW_COPY.afterLines.map((l) => l.text),
    ...HOW_COPY.steps.map((s) => s.title), ...SETUP_COPY.examples,
  ];
  for (const s of all) expect(s).not.toMatch(/\bAI\b|model|smart|magic|algorithm|confidence|extract/i);
  expect(SETUP_COPY.examples).toHaveLength(3);
  for (const e of SETUP_COPY.examples) expect(e).not.toMatch(/surgery|hospital|sick|diagnos|cancer|doctor|hip/i);
  // Different kinds of things, by example only — never a category word.
  for (const e of SETUP_COPY.examples) expect(e).not.toMatch(/\b(fact|event|promise|memory|category)\b/i);
});
