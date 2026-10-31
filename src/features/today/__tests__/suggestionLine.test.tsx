// SUA-1 (FD-30d) on the screens: one quiet "You could…" line under Message and Call on the hand-off
// sheet and in the Moment detail; a tap opens Messages with the suggestion's kind on the reason and
// nothing pre-written; the three layers are measured apart and content-free; after a Yes the one
// optional question comes first. Never a second primary action, never a shop.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { HandoffSheet } from "@/features/today/HandoffSheet";
import { MomentDetailSheet } from "@/features/today/MomentDetailSheet";
import type { MomentDetail } from "@/features/today/momentDetail";
import { OUTCOME_ASK, SUGGESTION_COPY } from "@/features/today/suggestions";
import { TodayView } from "@/features/today/TodayView";
import { useHandoff, type HandoffRequest } from "@/features/today/useHandoff";
import { setAnalyticsSink } from "@/platform/analytics";
import type { TodayView as TodayViewModel } from "@/features/today/todayModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
const mockHandedOff = jest.fn(async (_h: unknown) => undefined);
jest.mock("@/hooks/useV2", () => ({
  usePeople: () => [{ id: "susan", display_name: "Susan", state: "active", contact_ref: "contact-1" }],
  useTodayActions: () => ({ handedOff: mockHandedOff, handoffFailed: jest.fn(), linkContact: jest.fn() }),
}));
const mockOpens: string[] = [];
jest.mock("@/platform/handoff", () => ({
  ...jest.requireActual("@/platform/handoff"),
  routesFor: async () => ({ contactId: "contact-1", phones: ["+15550100"], emails: [] }),
  channelsFor: () => ["text", "call"],
  pickContact: async () => null,
  openChannel: async (channel: string) => {
    mockOpens.push(channel);
    return true;
  },
}));

const sent: [string, Record<string, unknown>][] = [];
beforeEach(() => {
  sent.length = 0;
  mockOpens.length = 0;
  mockHandedOff.mockClear();
  setAnalyticsSink({ send: (e, p) => sent.push([e, p]) });
});
afterAll(() => setAnalyticsSink());

const plan = { kind: "plan" as const, text: SUGGESTION_COPY.plan, outcomeAsk: OUTCOME_ASK.plan };
const noop = () => undefined;
function texts(r: TestRenderer.ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat(Infinity).join("")).filter(Boolean);
}
function pressable(r: TestRenderer.ReactTestRenderer, label: string) {
  return r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")[0] ?? null;
}
function render(el: React.ReactElement): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}

it("the hand-off sheet: one quiet line under the channels, a link and never a pill; nothing when there is none", () => {
  const onSuggestion = jest.fn();
  const r = render(<HandoffSheet visible heading="Message Susan" personName="Susan" mention={[]} channels={["text", "call"]} ready onOpen={noop} onChooseContact={noop} onDismiss={noop} returnCheck suggestion={plan} onSuggestion={onSuggestion} />);
  const shown = texts(r);
  expect(shown).toContain(SUGGESTION_COPY.plan);
  expect(shown.indexOf(SUGGESTION_COPY.plan)).toBeGreaterThan(shown.indexOf("Open Messages"));
  const link = pressable(r, SUGGESTION_COPY.plan);
  expect(link?.props.accessibilityRole).toBe("link");
  expect(link?.props.accessibilityHint).toMatch(/A suggestion/u);
  act(() => link!.props.onPress());
  expect(onSuggestion).toHaveBeenCalledTimes(1);
  // The primary pill is still the channel; the line is never a button.
  expect(r.root.findAll((n) => n.props.accessibilityRole === "button" && n.props.accessibilityLabel === SUGGESTION_COPY.plan)).toHaveLength(0);
  const none = render(<HandoffSheet visible heading="Message Susan" personName="Susan" mention={[]} channels={["text"]} ready onOpen={noop} onChooseContact={noop} onDismiss={noop} returnCheck suggestion={null} />);
  expect(texts(none).some((t) => /^You could/u.test(t))).toBe(false);
});

it("the Moment detail: the same line after Message and Call, before View Susan", () => {
  const detail: MomentDetail = {
    key: "milestone:m1:2026-10-25", type: "milestone", personId: "susan", personName: "Susan", itemId: "m1",
    line: "Susan is getting married on Saturday", hope: null, why: "It's on Saturday.", when: "Sat, Oct 25", provenance: "You told Kinship · Oct 10", noteId: "c1",
    reason: { id: "milestone:m1:2026-10-25", type: "milestone", ask: "Did you reach Susan about the wedding?", about: "Susan is getting married on Saturday", followUp: "", itemId: "m1" },
    heading: "Message Susan", mention: [], opener: null, suggestion: plan,
  };
  const onSuggestion = jest.fn();
  const r = render(<MomentDetailSheet detail={detail} onDismiss={noop} onMessage={noop} onCall={noop} onPerson={noop} onSource={noop} onSuggestion={onSuggestion} />);
  const shown = texts(r);
  expect(shown.indexOf(SUGGESTION_COPY.plan)).toBeGreaterThan(shown.indexOf("Call"));
  expect(shown.indexOf(SUGGESTION_COPY.plan)).toBeLessThan(shown.indexOf("View Susan"));
  act(() => pressable(r, SUGGESTION_COPY.plan)!.props.onPress());
  expect(onSuggestion).toHaveBeenCalledTimes(1);
});

it("a tap on the sheet opens Messages, carries the kind on the reason and nothing else; shown and tapped are measured apart, content-free", async () => {
  const req: HandoffRequest = {
    personId: "susan", personName: "Susan", heading: "Message Susan", mention: ["Susan is getting married in the fall"], suggestion: plan,
    reason: { id: "milestone:m1:2026-10-25", type: "milestone", ask: "Did you reach Susan about the wedding?", about: "Susan is getting married in the fall", followUp: "", itemId: "m1" },
  };
  let api!: ReturnType<typeof useHandoff>;
  function Harness() {
    api = useHandoff();
    return <>{api.sheet}</>;
  }
  const r = render(<Harness />);
  await act(async () => {
    api.start(req);
    for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));
  });
  expect(sent).toEqual([["gesture_shown", { kind: "plan", surface: "handoff" }]]);
  await act(async () => {
    pressable(r, SUGGESTION_COPY.plan)!.props.onPress();
    for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));
  });
  expect(mockOpens).toEqual(["text"]);
  expect(mockHandedOff).toHaveBeenCalledWith(expect.objectContaining({ reasonId: "milestone:m1:2026-10-25", channel: "text", gesture: "plan", type: "milestone" }));
  expect(sent.map(([e]) => e)).toEqual(["gesture_shown", "gesture_tapped"]);
  // Nothing in the events names the person, the line or the memory.
  for (const [, props] of sent) expect(JSON.stringify(props)).not.toMatch(/Susan|married|wedding/u);
});

it("after a Yes that followed a tap, Today asks its one optional question first, Yes · Not yet, then the usual one", () => {
  const view: TodayViewModel = { dateLabel: "Saturday, Oct 25", greeting: "Good morning.", returnCheck: null, moment: null, quiet: [], quietDay: true, waiting: null, firstUse: null };
  const onGesture = jest.fn();
  const r = render(
    <TodayView view={view} afterReturn={null} afterGesture={{ ask: OUTCOME_ASK.plan }} onGesture={onGesture} settling={false}
      onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />,
  );
  const shown = texts(r);
  expect(shown).toContain("Did you make a plan?");
  expect(shown).not.toContain("Nothing needs you today.");
  act(() => pressable(r, "Not yet")!.props.onPress());
  expect(onGesture).toHaveBeenCalledWith("not_yet");
});

it("a promise's return check offers 'Didn't happen' as a quiet third answer; an event's does not", () => {
  const base: TodayViewModel = { dateLabel: "Sunday, Nov 1", greeting: "Good morning.", returnCheck: null, moment: null, quiet: [], quietDay: false, waiting: null, firstUse: null };
  const rc = { personId: "sam", personName: "Sam", reasonId: "promise:p1:2026-11-01", channel: "text" as const, ask: "Did you bring Sam soup?", about: "Bring Sam soup", followUp: "" };
  const onReturn = jest.fn();
  const promise = render(<TodayView view={{ ...base, returnCheck: { ...rc, type: "promise" } }} afterReturn={null} settling={false} onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={onReturn} onRemember={noop} onNothing={noop} onQuiet={noop} />);
  act(() => pressable(promise, "Didn't happen")!.props.onPress());
  expect(onReturn).toHaveBeenCalledWith("put_aside");
  const event = render(<TodayView view={{ ...base, returnCheck: { ...rc, type: "event_followup" } }} afterReturn={null} settling={false} onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={onReturn} onRemember={noop} onNothing={noop} onQuiet={noop} />);
  expect(pressable(event, "Didn't happen")).toBeNull();
});
