// Setup as drawn: the consent step carries the approved D2 sentence; the
// picker pre-selects no one, says the T8 lock line, and never dead-ends when
// Contacts is refused; the first Tell asks for nothing but words; no screen
// talks about AI, models or confidence.
import React from "react";
import { Pressable } from "@/ui/Pressable";
import TestRenderer, { act } from "react-test-renderer";
import { ConsentStepView, PeoplePickView, SETUP_COPY, WorthStepView, type PeoplePickViewProps } from "../SetupViews";
import type { PickRow } from "../setupModel";
import { FIRST_USE_COPY } from "@/features/today/TodayView";
import { WELCOME_COPY } from "@/features/welcome/WelcomeView";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => { throw new Error("not used"); } }));

const D2 = "Information you choose to record about people in your life may be processed by Kinship's AI provider in order to understand and organize it.";
const noop = () => undefined;

function render(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree;
}
const texts = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);

const row = (name: string, why: string | null = null): PickRow =>
  ({ personId: `p-${name}`, contactId: `c-${name}`, name, why, birthday: null, birthdayYearKnown: false });

function pick(over: Partial<PeoplePickViewProps> = {}) {
  return render(
    <PeoplePickView
      label="Setting up · 1 of 2" access={{ state: "granted", limited: false }}
      suggested={[row("Maya Okafor", "Birthday · 10 October"), row("Mom", "Family")]} everyone={[row("Ben Carter")]}
      added={[]} results={null} query="" selected={new Set()} busy={false} error={null}
      onQuery={noop} onToggle={noop} onAddByName={noop} onAsk={noop} onSettings={noop} onShareMore={noop} onContinue={noop} onSkip={noop}
      {...over}
    />,
  );
}

it("consent: the approved disclosure, the interim provider line, and the two choices", () => {
  const t = texts(render(<ConsentStepView label="Setting up · 1 of 3" busy={false} onAllow={noop} onDecline={noop} />));
  expect(t).toEqual(expect.arrayContaining([D2, "Sent to Anthropic to understand it; not used to train models.", "Allow", "Keep notes as written"]));
});

it("the picker: board 1's question, the T8 lock line, nobody pre-selected", () => {
  const tree = pick();
  const t = texts(tree);
  expect(t).toEqual(expect.arrayContaining([SETUP_COPY.pickTitle, SETUP_COPY.pickLock, "Suggested", "Everyone", "Maya Okafor", "Birthday · 10 October"]));
  // One per row: the app's Pressable wraps React Native's, so match the outer one.
  const boxes = tree.root.findAll((n) => n.type === Pressable && n.props.accessibilityRole === "checkbox");
  expect(boxes).toHaveLength(3);
  for (const b of boxes) expect(b.props.accessibilityState).toEqual({ checked: false });
  // With no one picked, the way on is "Skip for now", never a disabled button.
  expect(t).toContain(SETUP_COPY.skip);
  expect(t.some((x) => x.startsWith("Continue with"))).toBe(false);
});

it("the count follows what was picked", () => {
  const t = texts(pick({ selected: new Set(["p-Mom", "p-Ben Carter"]) }));
  expect(t).toContain("Continue with 2 people");
  expect(t).not.toContain(SETUP_COPY.skip);
});

it("Contacts refused: no dead end — add by name, Settings, and a way on", () => {
  const t = texts(pick({ access: { state: "denied", canAskAgain: false }, suggested: [], everyone: [] }));
  expect(t).toEqual(expect.arrayContaining([SETUP_COPY.deniedBody, SETUP_COPY.openSettings, SETUP_COPY.addByName, SETUP_COPY.skip]));
  expect(t).not.toContain(SETUP_COPY.pickLock);
});

it("already worth knowing shows only real lines; without them it opens on the first Tell", () => {
  const withLine = texts(render(
    <WorthStepView label="Setting up · 2 of 2" lines={[{ personId: "a", text: "Maya's birthday is Saturday.", provenance: "From Contacts" }]}
      text="" busy={false} onText={noop} onKeep={noop} onSkip={noop} />,
  ));
  expect(withLine).toEqual(expect.arrayContaining([SETUP_COPY.worthTitle, "Maya's birthday is Saturday.", "From Contacts", SETUP_COPY.tellTitle]));
  const without = texts(render(<WorthStepView label="Setting up · 2 of 2" lines={[]} text="" busy={false} onText={noop} onKeep={noop} onSkip={noop} />));
  expect(without).not.toContain(SETUP_COPY.worthTitle);
  expect(without).toContain(SETUP_COPY.tellTitle);
});

it("no first-run copy talks about AI, models, confidence, CRM chores or gardens", () => {
  const all = [
    ...(Object.values(SETUP_COPY) as unknown[]).filter((v): v is string => typeof v === "string"),
    ...Object.values(FIRST_USE_COPY), ...WELCOME_COPY.how, WELCOME_COPY.promise, WELCOME_COPY.sub,
  ];
  for (const s of all) expect(s).not.toMatch(/\bAI\b|model|confidence|algorithm|smart|magic|garden|streak|log |contact frequency|score/i);
});
