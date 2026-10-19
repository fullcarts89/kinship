// The action pills beside a line's provenance (Edit, Not this) keep their
// type and their width; the provenance is what gives way. On the B7/B8
// simulator run, under a line with two "Before:" lines, iOS's fit-to-width
// left the pills' labels a third of their size (PR #56 review). A quiet pill
// never asks for that shrink, and sits in its row unable to shrink; the
// provenance's box may shrink and wrap. Buttons that need the last-resort
// shrink (a primary with a long label) keep it.
import React from "react";
import { StyleSheet, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { Pill } from "@/ui/Pill";
import { PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { sectionsFor } from "@/features/person/recordSections";
import type { ItemLine } from "@/features/tell/reviewModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;

function render(el: React.ReactElement): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const flat = (style: unknown) => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
/** A pressable's style, as drawn at rest (its style may be a function of the pressed state). */
const styleOf = (node: TestRenderer.ReactTestInstance) => flat(typeof node.props.style === "function" ? node.props.style({ pressed: false }) : node.props.style);
/** The host Text that draws a pill's label, and the pressable around it. */
function pill(r: TestRenderer.ReactTestRenderer, label: string) {
  const text = r.root.findAll((n) => String(n.type) === "Text" && [n.props.children].flat().join("") === label)[0];
  let node = text.parent;
  while (node && typeof node.props.onPress !== "function") node = node.parent;
  return { text, pressable: node! };
}

function line(id: string, statement: string, replaces: string[] = []): ItemLine {
  return {
    id, statement, person: { id: "susan", label: "Susan", changeable: true }, about: null, also: [], replaces, when: null,
    kind: { value: "fact", label: "Something true", changeable: true }, edited: false,
  };
}

describe("the action pills beside a line's provenance", () => {
  it("a quiet pill never shrinks its type and never its width; a primary keeps the last-resort shrink", () => {
    const r = render(<><Pill variant="quiet" label="Not this" onPress={noop} /><Pill variant="primary" label="Continue with 14 people" onPress={noop} /></>);
    const quiet = pill(r, "Not this");
    expect(quiet.text.props.adjustsFontSizeToFit).toBe(false);
    expect(styleOf(quiet.pressable).flexShrink).toBe(0);
    const primary = pill(r, "Continue with 14 people");
    expect(primary.text.props.adjustsFontSizeToFit).toBe(true);
    expect(primary.text.props.minimumFontScale).toBe(0.8);
  });

  it("under a line with two 'Before:' lines, Edit and Not this keep their type and the provenance's box is the one that may give way", () => {
    const moved: RecordLine = {
      line: line("c", "Susan moved to Colorado", ["Susan lives in Alameda", "Susan lives in California"]),
      provenance: "You told Kinship · Oct 19", noteId: "n-c", conflict: null, section: "background", category: "residence", display: "Moved to Colorado",
    };
    const history: RecordLine = {
      line: line("a", "Susan lives in Alameda"), provenance: "You told Kinship · Oct 19", noteId: "n-c", conflict: null, section: "background", category: "residence",
      display: "Previously lived in Alameda", history: { when: null },
    };
    const r = render(
      <PersonRecordView name="Susan" short="Susan" label={null} lines={[moved]} sections={sectionsFor({ lines: [moved], history: [history] })}
        onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />,
    );
    expect(r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter((t) => t.startsWith("Before: "))).toEqual(["Before: Susan lives in Alameda", "Before: Susan lives in California"]);
    for (const label of ["Edit", "Not this"]) {
      for (const node of r.root.findAll((n) => String(n.type) === "Text" && [n.props.children].flat().join("") === label)) {
        expect(node.props.adjustsFontSizeToFit).toBe(false);
        let p = node.parent;
        while (p && typeof p.props.onPress !== "function") p = p.parent;
        expect(styleOf(p!).flexShrink).toBe(0);
      }
    }
    // The provenance sits in a box that may shrink below its content (so its words wrap, never the pills).
    const prov = r.root.findAll((n) => String(n.type) === "Text" && [n.props.children].flat().join("") === "You told Kinship · Oct 19");
    expect(prov.length).toBe(2);
    for (const t of prov) {
      let box = t.parent;
      while (box && flat(box.props.style).flex !== 1) box = box.parent;
      expect(flat(box!.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
    }
  });
});
