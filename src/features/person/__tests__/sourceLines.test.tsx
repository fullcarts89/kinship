// Every durable statement shows its source (founder H14, H19b). A source line
// is shared only by memories from the very same note; neighbours that merely
// share a day each say their own.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { PortraitView } from "@/features/person/PortraitView";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const OCT6 = "You told Kinship · Oct 6";

function texts(el: React.ReactElement): string[] {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter(Boolean);
}

it("two memories from two notes told the same day each keep their own source line; one note's lines share one", () => {
  const shown = texts(
    <PortraitView personId="john" name="John" label={null} remembered={false} comingUp={[]} youSaid={[]} between={[]} total={4}
      lately={[
        { itemId: "a", statement: "John is the second tallest in your family", when: null, provenance: OCT6, noteId: "n1" },
        { itemId: "b", statement: "Ben wants to play games with you Saturday", when: null, provenance: OCT6, noteId: "n2" },
        { itemId: "c", statement: "John likes volleyball", when: null, provenance: OCT6, noteId: "n3" },
        { itemId: "d", statement: "John likes Vietnamese food", when: null, provenance: OCT6, noteId: "n3" },
      ]}
      onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop} />,
  );
  // a, b each; c and d (same note) once, under d.
  expect(shown.filter((t) => t === OCT6)).toHaveLength(3);
  const order = shown.filter((t) => t === OCT6 || /^(John|Ben) \w/.test(t));
  expect(order).toEqual([
    "John is the second tallest in your family", OCT6,
    "Ben wants to play games with you Saturday", OCT6,
    "John likes volleyball", "John likes Vietnamese food", OCT6,
  ]);
});
