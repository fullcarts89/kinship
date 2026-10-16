// Phase 4B B5, step 9 (brief §12): the composed line in What Kinship knows
// and the sheet of its members. The line says only its members' words and
// the union of their sources; one way in opens the members, each with its
// own words, provenance, Edit and Not this. Nothing names a reading, a
// dataset, a rule or a place id, and nothing says one place is in another.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { ComposedSheet, COMPOSED_SHEET_COPY } from "@/features/person/ComposedSheet";
import { composedRows, withoutForgotten } from "@/features/person/composedRecord";
import { COMPOSED_COPY, type ComposedMember, PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { Candidate } from "../../../../supabase/functions/_shared/semantic/placeIndex";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const NOW = new Date("2026-10-16T12:00:00Z");

function render(el: React.ReactElement): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const textsOf = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter(Boolean);
const pressables = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && typeof n.props.onPress === "function");
const labels = (r: TestRenderer.ReactTestRenderer) => pressables(r).map((n) => String(n.props.accessibilityLabel));
const press = (r: TestRenderer.ReactTestRenderer, label: string) =>
  act(() => pressables(r).find((n) => n.props.accessibilityLabel === label)!.props.onPress());

const US = "country:US";
const c = (ref: string, level: Candidate["level"], ...ancestors: string[]): Candidate => ({ ref, level, ancestors });
const P = { alameda: c("city:5322737", "city", "region:US.CA", US), california: c("region:US.CA", "region", US), us: c(US, "country") };

function line(id: string, statement: string): ItemLine {
  return {
    id, statement, person: { id: "susan", label: "Susan", changeable: true }, about: null, also: [], replaces: [], when: null,
    kind: { value: "fact", label: "Something to remember", changeable: true }, edited: false,
  };
}
function member(id: string, statement: string, words: string, cands: Candidate[], told: string, note: string): ComposedMember {
  return {
    input: { id, facet: { value_text: words, value_norm: words.toLowerCase(), place_ref: null, candidates: cands, usual_ref: cands[0].ref, dataset_version: "places-2026.10" }, told },
    row: { line: line(id, statement), provenance: `You told Kinship · ${note}`, noteId: `n-${id}`, conflict: null },
    sources: [{ source_kind: "capture", capture_id: `n-${id}`, created_at: told }],
    origin: "extracted",
  };
}
const alameda = member("a", "Susan lives in Alameda", "Alameda", [P.alameda], "2026-10-02T12:00:00Z", "Oct 2");
const california = member("b", "Susan lives in California", "California", [P.california], "2026-09-03T12:00:00Z", "Sep 3");
const usa = member("u", "Susan lives in the US", "the US", [P.us], "2026-08-01T12:00:00Z", "Aug 1");
const composed = (): RecordLine => composedRows([california, alameda], NOW).rows[0];
const plain: RecordLine = { line: line("p", "Susan loves pottery"), provenance: "You told Kinship · Oct 10", noteId: "n-p", conflict: null };

/** Words that would expose the machinery (contract §3; brief §12). */
const MACHINERY = /region:|city:|country:|places-20|compose\/v|residence\/v|dataset|usual|candidate|is in California/u;

function record(over: Partial<React.ComponentProps<typeof PersonRecordView>> = {}) {
  return render(
    <PersonRecordView name="Susan" short="Susan" label={null} lines={[plain, composed()]} onBack={noop} onChange={noop} onForget={noop}
      onSource={noop} onSettle={noop} {...over} />,
  );
}

describe("the composed line in What Kinship knows", () => {
  it("says its members' words as one line, with the union of their sources, and never a member's own line beside it", () => {
    const r = record();
    const shown = textsOf(r);
    expect(shown).toContain("Lives in Alameda, California");
    expect(shown).toContain("You told Kinship · Oct 2 · and 1 other note");
    expect(shown).not.toContain("Susan lives in Alameda");
    expect(shown).not.toContain("Susan lives in California");
    expect(shown.join(" ")).not.toMatch(MACHINERY);
  });

  it("has one way in: the line, its provenance and Edit all open the members; no tokens and no Not this of its own", () => {
    const opened: string[] = [];
    const r = record({ onComposed: (l) => opened.push(l.composed!.text) });
    expect(labels(r)).toEqual(expect.arrayContaining(["Lives in Alameda, California", "You told Kinship · Oct 2 · and 1 other note", "Edit: Lives in Alameda, California"]));
    expect(labels(r)).not.toContain("Not this: Lives in Alameda, California");
    // Its tokens would be a memory's; the plain line keeps its own.
    const tokens = r.root.findAll((n) => n.props.what === "Who");
    expect(tokens).toHaveLength(1);
    press(r, "Lives in Alameda, California");
    press(r, "You told Kinship · Oct 2 · and 1 other note");
    press(r, "Edit: Lives in Alameda, California");
    expect(opened).toEqual(["Lives in Alameda, California", "Lives in Alameda, California", "Lives in Alameda, California"]);
    const hints = pressables(r).filter((n) => n.props.accessibilityLabel === "Lives in Alameda, California").map((n) => n.props.accessibilityHint);
    expect([...new Set(hints)]).toEqual([COMPOSED_COPY.hint]);
  });

  it("'View Susan' on a member lands on the composed line: the line comes up for any of its members", () => {
    // The host node alone (the renderer also lists the composite that drew it).
    const focusedLines = (r: TestRenderer.ReactTestRenderer) => r.root.findAll((n) => n.props.testID === "focused-line" && typeof n.type === "string");
    for (const focus of ["a", "b"]) {
      const focused = focusedLines(record({ focusItemId: focus }));
      expect(focused).toHaveLength(1);
      expect(focused[0].findAllByType(Text).map((t) => [t.props.children].flat().join(""))).toContain("Lives in Alameda, California");
    }
    const plainFocus = focusedLines(record({ focusItemId: "p" }));
    expect(plainFocus).toHaveLength(1);
    expect(plainFocus[0].findAllByType(Text).map((t) => [t.props.children].flat().join(""))).toContain("Susan loves pottery");
  });
});

describe("the sheet of a composed line's members", () => {
  function sheet(over: Partial<React.ComponentProps<typeof ComposedSheet>> = {}) {
    return render(<ComposedSheet row={composed()} visible onChange={noop} onForget={noop} onSource={noop} onSettle={noop} onDismiss={noop} {...over} />);
  }

  it("lists every member in its stored words, the most specific first, each with its own provenance, Edit and Not this", () => {
    const r = sheet();
    const shown = textsOf(r);
    expect(shown.slice(0, 3)).toEqual(["Lives in Alameda, California", "You told Kinship · Oct 2 · and 1 other note", COMPOSED_SHEET_COPY.from]);
    const order = shown.filter((t) => /^Susan lives|^You told Kinship · (Oct 2|Sep 3)$/u.test(t));
    expect(order).toEqual(["Susan lives in Alameda", "You told Kinship · Oct 2", "Susan lives in California", "You told Kinship · Sep 3"]);
    expect(labels(r)).toEqual(expect.arrayContaining([
      "Edit: Susan lives in Alameda", "Not this: Susan lives in Alameda", "You told Kinship · Oct 2",
      "Edit: Susan lives in California", "Not this: Susan lives in California", "You told Kinship · Sep 3",
    ]));
    expect(shown.join(" ")).not.toMatch(MACHINERY);
    expect(shown.join(" ")).not.toMatch(/Alameda is in|in California\b.*Alameda/u);
  });

  it("Edit, Not this and the provenance of a member go through the existing workflows, for that member alone", () => {
    const changed: [string, string][] = [];
    const forgot: string[] = [];
    const sources: string[] = [];
    let dismissed = 0;
    const r = sheet({
      onChange: (l, what) => changed.push([l.statement, what]),
      onForget: (row) => forgot.push(row.line.statement),
      onSource: (id) => sources.push(id),
      onDismiss: () => dismissed++,
    });
    press(r, "Edit: Susan lives in California");
    press(r, "Susan lives in Alameda");
    press(r, "Not this: Susan lives in California");
    press(r, "You told Kinship · Sep 3");
    press(r, COMPOSED_SHEET_COPY.done);
    expect(changed).toEqual([["Susan lives in California", "words"], ["Susan lives in Alameda", "words"]]);
    expect(forgot).toEqual(["Susan lives in California"]);
    expect(sources).toEqual(["n-b"]);
    expect(dismissed).toBe(1);
  });

  it("shows nothing when there is no composed line to show", () => {
    expect(textsOf(render(<ComposedSheet row={plain} visible onChange={noop} onForget={noop} onSource={noop} onSettle={noop} onDismiss={noop} />))).toEqual([]);
    expect(textsOf(render(<ComposedSheet row={null} visible onChange={noop} onForget={noop} onSource={noop} onSettle={noop} onDismiss={noop} />))).toEqual([]);
  });
});

describe("Not this on a member reads the line again at once, from what is left", () => {
  it("California gone: the line is Alameda's own; Alameda gone: California's own", () => {
    const lines = [plain, composed()];
    const noCal = withoutForgotten(lines, new Set(["b"]), NOW);
    expect(noCal.map((l) => [l.line.statement, !!l.composed])).toEqual([["Susan loves pottery", false], ["Susan lives in Alameda", false]]);
    expect(noCal[1].provenance).toBe("You told Kinship · Oct 2");
    const noAla = withoutForgotten(lines, new Set(["a"]), NOW);
    expect(noAla.map((l) => l.line.statement)).toEqual(["Susan loves pottery", "Susan lives in California"]);
    expect(withoutForgotten(lines, new Set(["a", "b"]), NOW).map((l) => l.line.statement)).toEqual(["Susan loves pottery"]);
    expect(withoutForgotten(lines, new Set(["p"]), NOW).map((l) => l.composed?.text)).toEqual(["Lives in Alameda, California"]);
  });

  it("one of three gone: the other two are read again as one line, never the old words", () => {
    const three = composedRows([usa, california, alameda], NOW).rows[0];
    expect(three.composed!.text).toBe("Lives in Alameda, California, the US");
    const left = withoutForgotten([three], new Set(["b"]), NOW);
    expect(left.map((l) => l.composed!.text)).toEqual(["Lives in Alameda, the US"]);
    expect(left[0].composed!.memberIds).toEqual(["a", "u"]);
    expect(left[0].provenance).toBe("You told Kinship · Oct 2 · and 1 other note");
  });
});
