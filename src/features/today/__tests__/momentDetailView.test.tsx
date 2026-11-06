// The Moment detail as a composition (FD-30b, the founder's named example): the person's presence
// (photo, or the name as a window onto the bloom), the kind's light, the memory as the centre, the
// ledger for why and source, one primary, Call, the suggestion, the person as the way out. Every
// behaviour of the earlier sheet is kept (momentDetail.test.tsx); this checks the composition and
// its restraint.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { accentFor, DETAIL_COPY, MomentDetailSheet, moodFor } from "@/features/today/MomentDetailSheet";
import type { MomentDetail } from "@/features/today/momentDetail";
import { sectionAccent } from "@/design/tokens";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
const noop = () => undefined;

function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter((s) => s.trim());
const byId = (r: TestRenderer.ReactTestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id && n.parent?.props.testID !== id);

const detail: MomentDetail = {
  key: "r1", type: "event_followup", personId: "ben", personName: "Ben", itemId: "m1",
  line: "Ben runs Chicago Sunday", hope: "Ben was hoping to break four hours.", why: "It was yesterday.", when: "Sun, Oct 11",
  provenance: "You told Kinship · Oct 8", noteId: "c1",
  reason: { id: "r1", type: "event_followup", ask: "Did you ask Ben how it went?", about: "Ben runs Chicago Sunday", followUp: "", itemId: "m1" },
  heading: "Ask Ben how it went", mention: [], suggestion: null,
};
const sheet = (over: Partial<React.ComponentProps<typeof MomentDetailSheet>> = {}) =>
  render(<MomentDetailSheet detail={detail} onDismiss={noop} onMessage={noop} onCall={noop} onPerson={noop} onSource={noop} {...over} />);

it("reads as: who and when, the memory, what they hoped, why now, the source, Message, Call, the person", () => {
  const t = texts(sheet());
  const order = ["Ben · Sun, Oct 11", "Ben runs Chicago Sunday", "Ben was hoping to break four hours.", DETAIL_COPY.whyNow, "It was yesterday.", DETAIL_COPY.from, "You told Kinship · Oct 8", "Message", "Call", DETAIL_COPY.view("Ben")];
  const idx = order.map((s) => t.indexOf(s));
  expect(idx.every((i) => i >= 0)).toBe(true);
  expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  // The poster presence shows the name once more, as the picture; the memory is never dressed as a quote.
  expect(t).toContain("Ben");
  expect(t.some((s) => s.startsWith("“"))).toBe(false);
});

it("without a photo the name is the picture; with one the photo takes its place in the fluid mask", () => {
  const plain = sheet();
  expect(byId(plain, "bloom-name").length + plain.root.findAll((n) => n.props.accessibilityRole === "header" && [n.props.children].flat().join("") === "Ben").length).toBeGreaterThan(0);
  expect(byId(plain, "fluid-photo")).toHaveLength(0);
  const photo = sheet({ photoUri: "file:///tmp/ben.jpg" });
  expect(byId(photo, "fluid-photo")).toHaveLength(1);
  expect(photo.root.findAll((n) => n.props.accessibilityLabel === "Photo of Ben" && typeof n.type === "string")).toHaveLength(1);
});

it("the light follows the kind: joyful draws the bloom, quiet a leaf, difficult no art at all", () => {
  expect(moodFor("birthday")).toBe("joyful");
  expect(moodFor("promise")).toBe("quiet");
  expect(byId(sheet(), "botanical-bloom")).toHaveLength(1);
  const quiet = sheet({ detail: { ...detail, type: "promise" } });
  expect(byId(quiet, "botanical-leaf")).toHaveLength(1);
  expect(byId(quiet, "botanical-bloom")).toHaveLength(0);
  const difficult = sheet({ mood: "difficult" });
  expect(difficult.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("botanical-"))).toHaveLength(0);
  expect(byId(difficult, "dawn-wash-difficult")).toHaveLength(1);
});

it("the kind's dot is fixed by kind, never by history", () => {
  expect(accentFor("promise")).toBe(sectionAccent.youSaid);
  expect(accentFor("event_followup")).toBe(sectionAccent.lately);
  expect(accentFor("coming")).toBe(sectionAccent.comingUp);
  expect(accentFor("birthday")).toBe(sectionAccent.comingUp);
});
