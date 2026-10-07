// Gate 0 on the person's screens (founder round 4, CC-18): the name in
// titles is the whole chosen name ("What Kinship knows about Cutie Pie",
// never "…Cutie", I12).
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { PersonRecordView } from "@/features/person/PersonRecordView";
import { PortraitView } from "@/features/person/PortraitView";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;

function texts(el: React.ReactElement): string[] {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter(Boolean);
}

const cutie = { id: "w", display_name: "Cutie Pie", full_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"] };
const michelle = { id: "m", display_name: "Michelle Lee", full_name: "Michelle Lee", nicknames: [] };

describe("I12: titles use the whole chosen name", () => {
  it("What Kinship knows about Cutie Pie; a name from Contacts stays its first name", () => {
    const record = (p: typeof cutie) => texts(
      <PersonRecordView name={p.display_name} short={shortName(p)} label={null} lines={[]} onBack={noop} onRename={noop}
        onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />,
    );
    expect(record(cutie)).toContain("What Kinship knows about Cutie Pie");
    expect(record(michelle)).toContain("What Kinship knows about Michelle");
  });

  it("the portrait's link to What Kinship knows, and its empty line, say Cutie Pie", () => {
    const shown = texts(
      <PortraitView personId="w" name="Cutie Pie" short={shortName(cutie)} label={null} remembered={false} comingUp={[]} youSaid={[]} between={[]}
        total={1} lately={[{ itemId: "a", statement: "Cutie Pie has a new job", when: null, provenance: "You told Kinship · Oct 6", noteId: "n1" }]}
        onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop} />,
    );
    expect(shown).toContain("What Kinship knows about Cutie Pie →");
    expect(shown.some((t) => /about Cutie →|about Cutie$/u.test(t))).toBe(false);
  });
});
