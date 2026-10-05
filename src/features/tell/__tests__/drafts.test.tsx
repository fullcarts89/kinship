// Unsent Tells (founder native pass F19/F21/F22): leaving folds the field to
// one quiet "Draft" line instead of following the user around open; words are
// never thrown away; a draft stays with where it was started, so a note begun
// on Ben's page can never show up as if it were about Tyler.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { draftKey, draftPreview, GENERAL_DRAFT, parseDrafts, withDraft } from "../drafts";
import { TellDockView } from "../TellDock";
import { TellField } from "@/ui";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

function render(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree;
}
const labels = (t: TestRenderer.ReactTestRenderer) =>
  t.root.findAll((n) => typeof n.type === "string" && typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel as string);
const noop = () => undefined;

describe("draft store", () => {
  it("keys a draft by where it was started", () => {
    expect(draftKey(null)).toBe(GENERAL_DRAFT);
    expect(draftKey("ben")).toBe("person:ben");
    expect(draftKey("ben")).not.toBe(draftKey("tyler"));
  });

  it("keeps words, and drops a draft only when it's empty", () => {
    let d = withDraft({}, draftKey("ben"), "Ben's knee is better");
    d = withDraft(d, GENERAL_DRAFT, "My wife is excited for Disney");
    expect(d[draftKey("ben")]).toBe("Ben's knee is better");
    expect(d[draftKey("tyler")]).toBeUndefined();
    d = withDraft(d, draftKey("ben"), "   ");
    expect(d[draftKey("ben")]).toBeUndefined();
    expect(d[GENERAL_DRAFT]).toBe("My wife is excited for Disney");
  });

  it("reads back only well-formed drafts", () => {
    expect(parseDrafts(null)).toEqual({});
    expect(parseDrafts("not json")).toEqual({});
    expect(parseDrafts(JSON.stringify({ general: "hi", "person:ben": "knee", stray: "x", "person:sam": 4 })))
      .toEqual({ general: "hi", "person:ben": "knee" });
  });

  it("says what a folded draft is and who it's about", () => {
    expect(draftPreview("My wife is excited\nfor Disney", null)).toBe("Draft · My wife is excited for Disney");
    expect(draftPreview("Knee is better", "Ben")).toBe("Draft about Ben · Knee is better");
  });
});

describe("the dock with a draft", () => {
  it("folded: one quiet Draft line, and Send is still there", () => {
    const tree = render(
      <TellDockView tellOn draft="My wife is really excited for our Disney trip on October 23rd" onDraft={noop} onSend={noop}
        line={null} current="today" onGo={noop}
        collapsed={{ preview: draftPreview("My wife is really excited for our Disney trip on October 23rd", null), onExpand: noop }} />,
    );
    const l = labels(tree);
    expect(l).toContain("Draft · My wife is really excited for our Disney trip on October 23rd");
    expect(l).toContain("Send to Kinship");
    // Folded means no open text box following the user around.
    expect(tree.root.findAll((n) => String(n.type) === "TextInput")).toHaveLength(0);
  });

  it("open: the words are back in the box, with Send", () => {
    const tree = render(<TellField value="Ben's knee is better" onChange={noop} onSend={noop} />);
    expect(tree.root.findAll((n) => String(n.type) === "TextInput")[0].props.value).toBe("Ben's knee is better");
    expect(labels(tree)).toContain("Send to Kinship");
  });

  it("a Tell about someone says so; the general one doesn't", () => {
    const strings = (t: TestRenderer.ReactTestRenderer) =>
      t.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);
    expect(strings(render(<TellDockView tellOn draft="x" onDraft={noop} onSend={noop} line={null} current="today" onGo={noop} about="Ben" />)))
      .toContain("About Ben");
    expect(strings(render(<TellDockView tellOn draft="x" onDraft={noop} onSend={noop} line={null} current="today" onGo={noop} />)).join())
      .not.toMatch(/About /u);
  });

  it("while typing the bar steps aside so the field sits on the keyboard", () => {
    const withBar = render(<TellDockView tellOn draft="" onDraft={noop} onSend={noop} line={null} current="today" onGo={noop} />);
    const typing = render(<TellDockView tellOn draft="" onDraft={noop} onSend={noop} line={null} current="today" onGo={noop} typing />);
    expect(labels(withBar)).toEqual(expect.arrayContaining(["Today", "People"]));
    expect(labels(typing)).not.toContain("People");
  });
});
