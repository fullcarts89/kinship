// "View Ben" from a Moment (founder I1; J3): Ben's page lands on the memory
// it was about, which comes up quietly (a soft fade, no badge, no colour
// block); with Reduce Motion the page jumps rather than scrolls. A line that
// isn't on the page sends it to What Kinship knows, at that line. A line that
// isn't this person's is never focused here.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AccessibilityInfo, ScrollView, Text } from "react-native";
import { randomUUID } from "crypto";
import { PortraitView, type PortraitLineData } from "@/features/person/PortraitView";
import { PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { personFocusHref } from "@/hooks/useV2";
import { FOCUS_ABOVE } from "@/ui/LineFocus";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import type { ItemLine } from "@/features/tell/reviewModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const line = (itemId: string, statement: string): PortraitLineData => ({ itemId, statement, when: null, provenance: "You told Kinship · Oct 8", noteId: `n-${itemId}` });

function portrait(focusItemId: string | null) {
  return (
    <PortraitView
      personId="ben" name="Ben Carter" short="Ben" label={null} remembered={false}
      lately={[line("m1", "Ben got promoted"), line("m2", "Ben is training for Chicago")]}
      comingUp={[line("m3", "Ben runs Chicago Sunday")]}
      youSaid={[]} between={[line("m4", "You met Ben at college")]}
      total={4} onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop}
      focusItemId={focusItemId}
    />
  );
}

const rendered: TestRenderer.ReactTestRenderer[] = [];
async function render(el: React.ReactElement) {
  let t!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    t = TestRenderer.create(el);
  });
  rendered.push(t);
  // The mocked scroll view's scrollTo is shared by every instance: start each page clean.
  t.root.findAllByType(ScrollView).forEach((v) => (v.instance.scrollTo as jest.Mock).mockClear());
  return t;
}
/** Every group and line reports its place: each at y = 100 within its parent. */
function layOut(t: TestRenderer.ReactTestRenderer) {
  const laid = t.root.findAll((n) => typeof n.type === "string" && typeof n.props.onLayout === "function");
  act(() => laid.forEach((n) => n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 100, width: 300, height: 40 } } })));
}
const scrollOf = (t: TestRenderer.ReactTestRenderer) => t.root.findByType(ScrollView).instance.scrollTo as jest.Mock;
const focused = (t: TestRenderer.ReactTestRenderer) =>
  t.root.findAll((n) => typeof n.type === "string" && n.props.testID === "focused-line");
const textIn = (n: TestRenderer.ReactTestInstance) => n.findAllByType(Text).map((x) => [x.props.children].flat().join("")).join(" ");

afterEach(() => {
  act(() => rendered.splice(0).forEach((t) => t.unmount()));
  jest.restoreAllMocks();
  // Reduce Motion back off (RN's own mock is changed in place by a spy on it).
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(false));
});

describe("I1: the person page lands on the memory", () => {
  it("scrolls to exactly that line, and only that line comes up from faint", async () => {
    const t = await render(portrait("m3"));
    layOut(t);
    expect(scrollOf(t)).toHaveBeenCalledTimes(1);
    expect(scrollOf(t)).toHaveBeenCalledWith({ y: 100 + 100 - FOCUS_ABOVE, animated: true });
    expect(focused(t)).toHaveLength(1);
    expect(textIn(focused(t)[0])).toContain("Ben runs Chicago Sunday");
    // Once: later layouts (a sync, a keyboard) never yank the page back.
    layOut(t);
    expect(scrollOf(t)).toHaveBeenCalledTimes(1);
  });

  it("with Reduce Motion the page jumps there instead of scrolling", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const t = await render(portrait("m1"));
    await act(async () => undefined);
    layOut(t);
    expect(scrollOf(t)).toHaveBeenCalledWith({ y: 100 + 100 - FOCUS_ABOVE, animated: false });
  });

  it("a line that isn't on this person's page is never focused here", async () => {
    const t = await render(portrait("someone-elses-item"));
    layOut(t);
    expect(scrollOf(t)).not.toHaveBeenCalled();
    expect(focused(t)).toHaveLength(0);
  });

  it("no focus asked: the page opens at its top, as always", async () => {
    const t = await render(portrait(null));
    layOut(t);
    expect(scrollOf(t)).not.toHaveBeenCalled();
    expect(focused(t)).toHaveLength(0);
  });

  it("What Kinship knows lands on the line too", async () => {
    const record = (id: string, statement: string): RecordLine => ({
      line: { id, statement, kind: { label: "Fact", value: "fact", changeable: false } } as unknown as ItemLine,
      provenance: "You told Kinship · Oct 8", noteId: null, conflict: null,
    });
    const t = await render(
      <PersonRecordView name="Ben Carter" short="Ben" label={null} lines={[record("m1", "Ben got promoted"), record("m9", "Ben grew up in Austin")]}
        onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} focusItemId="m9" />,
    );
    layOut(t);
    expect(scrollOf(t)).toHaveBeenCalledWith({ y: 100 + 100 - FOCUS_ABOVE, animated: true });
    expect(focused(t)).toHaveLength(1);
    expect(textIn(focused(t)[0])).toContain("Ben grew up in Austin");
  });
});

describe("I1: where View Ben goes", () => {
  const A = "aaaaaaaa-0000-4000-8000-0000000000f1";
  async function world() {
    const db = await openSqlJsDb();
    await prepareSchema(db, A);
    let minute = 0;
    const store = new UserStore(db, A, { newId: randomUUID, now: () => new Date(Date.UTC(2026, 9, 12, 9, minute++)).toISOString() });
    return repositoriesFor(store);
  }
  const NOW = new Date("2026-10-12T16:00:00.000Z");

  it("a line on the page: the page, at the line; a line only in What Kinship knows: there, at the line", async () => {
    const repos = await world();
    const ben = await repos.people.add({ display_name: "Ben" });
    const told = async (statement: string, detail: Record<string, unknown> = { category: "other" }) => {
      const c = await repos.captures.tell(statement, { timeZone: "America/Los_Angeles", aiEnabled: false });
      return repos.memory.remember({ kind: "fact", person_id: ben.id, statement, detail }, { captureId: c.id, quote: statement });
    };
    // Four recent facts: Lately shows three; the oldest is only in What Kinship knows.
    const oldest = await told("Ben grew up in Austin");
    for (const s of ["Ben loves pottery", "Ben got a dog", "Ben is learning Spanish"]) await told(s);
    const lately = (await repos.memory.aboutPerson(ben.id)).find((m) => m.statement === "Ben is learning Spanish")!;
    expect(await personFocusHref(repos, ben.id, lately.id, NOW)).toBe(`/v2/person/${ben.id}?item=${lately.id}`);
    expect(await personFocusHref(repos, ben.id, oldest.id, NOW)).toBe(`/v2/person/${ben.id}/knows?item=${oldest.id}`);
  });

  it("never someone else's line; nothing to land on: just the page", async () => {
    const repos = await world();
    const ben = await repos.people.add({ display_name: "Ben" });
    const josh = await repos.people.add({ display_name: "Josh" });
    const c = await repos.captures.tell("Josh got the job", { timeZone: "America/Los_Angeles", aiEnabled: false });
    const joshs = await repos.memory.remember({ kind: "fact", person_id: josh.id, statement: "Josh got the job", detail: { category: "work" } },
      { captureId: c.id, quote: "Josh got the job" });
    expect(await personFocusHref(repos, ben.id, joshs.id, NOW)).toBe(`/v2/person/${ben.id}`);
    expect(await personFocusHref(repos, ben.id, null, NOW)).toBe(`/v2/person/${ben.id}`);
    // Retracted since: just the page.
    await repos.memory.retract(joshs.id);
    expect(await personFocusHref(repos, josh.id, joshs.id, NOW)).toBe(`/v2/person/${josh.id}`);
  });
});
