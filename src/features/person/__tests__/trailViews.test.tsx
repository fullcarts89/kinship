// I2 on the person's screens: the conversations the user confirmed sit
// under Between you ("You messaged · Oct 12", and what it was about), three
// on the page and every one in What Kinship knows, where "Not this" removes
// one recorded by mistake. "Add a conversation" asks only how. "You reached
// out · <date>" under the name is gone (CC-20). Nothing counts anything.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { PersonRecordView } from "@/features/person/PersonRecordView";
import { IN_TOUCH, PortraitView } from "@/features/person/PortraitView";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;

function render(el: React.ReactElement): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const textsOf = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter(Boolean);

const trail = [
  { id: "c2", label: "You messaged · Oct 12", about: "Tyler said he'd send you his contractor's number" },
  { id: "c1", label: "You saw Tyler · Oct 3", about: null },
];
const told = [{ itemId: "a", statement: "Tyler is redoing his kitchen", when: null, provenance: "You told Kinship · Oct 6", noteId: "n1" }];

function portrait(over: Partial<React.ComponentProps<typeof PortraitView>> = {}) {
  return render(
    <PortraitView personId="tyler" name="Tyler Shaffer" short="Tyler" label={null} remembered={false} lately={told} comingUp={[]} youSaid={[]}
      between={[]} trail={trail} onInTouch={noop} total={1} onBack={noop} onLine={noop} onSource={noop} onKnows={noop}
      onMessage={noop} onCall={noop} onTell={noop} {...over} />,
  );
}

describe("I2: Between you on the relationship page", () => {
  it("shows the trail under Between you, in the user's words, with nothing counted and no 'You reached out' under the name", () => {
    const shown = textsOf(portrait());
    const between = shown.indexOf("Between you");
    expect(between).toBeGreaterThan(shown.indexOf("Tyler is redoing his kitchen"));
    expect(shown.slice(between + 1, between + 4)).toEqual([
      "You messaged · Oct 12", "Tyler said he'd send you his contractor's number", "You saw Tyler · Oct 3",
    ]);
    expect(shown.join(" ")).not.toMatch(/You reached out|last contacted|times|streak|\d+ conversations/i);
    expect(shown).toContain(IN_TOUCH.action);
  });

  it("'Add a conversation' asks only how: Message · Call · Video · In person", () => {
    let opened = 0;
    const r = portrait({ onInTouch: () => opened++ });
    act(() => {
      r.root.findAll((n) => n.props.accessibilityLabel === IN_TOUCH.action || n.props.label === IN_TOUCH.action)[0].props.onPress();
    });
    expect(opened).toBe(1);
    expect(IN_TOUCH.choices.map((c) => c.label)).toEqual(["Message", "Call", "Video", "In person"]);
    expect(IN_TOUCH.title("Tyler")).toBe("How were you in touch with Tyler?");
  });

  it("a page with nothing told yet stays the invitation to tell: no Between you, no 'Add a conversation'", () => {
    const shown = textsOf(portrait({ lately: [], trail: [], total: 0 }));
    expect(shown).not.toContain("Between you");
    expect(shown).not.toContain(IN_TOUCH.action);
    expect(shown.some((t) => t.startsWith("What you tell Kinship about Tyler will be here"))).toBe(true);
  });
});

describe("I2: every conversation in What Kinship knows", () => {
  it("lists the whole trail; 'Not this' removes the one recorded by mistake", () => {
    const forgotten: string[] = [];
    const r = render(
      <PersonRecordView name="Tyler Shaffer" short="Tyler" label={null} lines={[]} onBack={noop} onChange={noop} onForget={noop}
        onSource={noop} onSettle={noop} trail={trail} onForgetConversation={(id) => forgotten.push(id)} />,
    );
    const shown = textsOf(r);
    expect(shown).toEqual(expect.arrayContaining(["Between you", "You messaged · Oct 12", "You saw Tyler · Oct 3"]));
    act(() => {
      r.root.findAll((n) => n.props.accessibilityLabel === "Not this: You saw Tyler · Oct 3" && typeof n.props.onPress === "function")[0].props.onPress();
    });
    expect(forgotten).toEqual(["c1"]);
  });
});
