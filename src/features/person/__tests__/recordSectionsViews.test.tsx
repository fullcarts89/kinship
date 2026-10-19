// Phase 4B B8 (brief §4, §11, §12): What Kinship knows drawn in sections.
// Headings in the approved order, empty ones absent, a quiet "Before" and
// "Michelle · sister" over their lines, the display words with Edit on the
// line's own words, history dated by the change, and nothing that counts,
// scores, prompts or names the machinery.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { composedRows } from "@/features/person/composedRecord";
import { type ComposedMember, PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { BEFORE_LABEL, sectionsFor } from "@/features/person/recordSections";
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
/** The headings on the page, in order (host text only; the page's title left out). */
const headers = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n) => n.props.accessibilityRole === "header" && typeof n.type === "string").map((n) => [n.props.children].flat().join(""))
    .filter((t) => !t.startsWith("What Kinship knows"));
const pressables = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAll((n) => typeof n.props.accessibilityLabel === "string" && typeof n.props.onPress === "function");
const labels = (r: TestRenderer.ReactTestRenderer) => pressables(r).map((n) => String(n.props.accessibilityLabel));
const press = (r: TestRenderer.ReactTestRenderer, label: string) =>
  act(() => pressables(r).find((n) => n.props.accessibilityLabel === label)!.props.onPress());

function line(id: string, statement: string): ItemLine {
  return {
    id, statement, person: { id: "susan", label: "Susan", changeable: true }, about: null, also: [], replaces: [], when: null,
    kind: { value: "fact", label: "Something to remember", changeable: true }, edited: false,
  };
}
const row = (id: string, statement: string, over: Partial<RecordLine> = {}): RecordLine =>
  ({ line: line(id, statement), provenance: "You told Kinship · Oct 2", noteId: `n-${id}`, conflict: null, section: "background", ...over });

const US = "country:US";
const c = (ref: string, level: Candidate["level"], ...ancestors: string[]): Candidate => ({ ref, level, ancestors });
const P = { alameda: c("city:5322737", "city", "region:US.CA", US), california: c("region:US.CA", "region", US) };
function member(id: string, statement: string, words: string, cands: Candidate[], told: string): ComposedMember {
  return {
    input: { id, facet: { value_text: words, value_norm: words.toLowerCase(), place_ref: null, candidates: cands, usual_ref: cands[0].ref, dataset_version: "places-2026.10" }, told },
    row: row(id, statement, { category: "residence" }),
    sources: [{ source_kind: "capture", capture_id: `n-${id}`, created_at: told }],
    origin: "extracted",
  };
}

/** Words that would expose the machinery, or count, score or prompt (contract §3; brief §4). */
const MACHINERY = /region:|city:|country:|places-20|compose\/v|residence\/v|dataset|candidate|\b\d+ (?:memories|items|lines)\b|complete|%|score|missing/iu;

const lines: RecordLine[] = [
  row("w", "Susan works at Meta", { category: "work", display: "Works at Meta" }),
  row("i", "Susan loves pottery", { section: "into", display: "Loves pottery" }),
  row("n", "Susan doesn't like skiing", { section: "into", display: "Doesn't like skiing" }),
  row("h", "Susan wants to visit Japan", { section: "hoping_to", display: "Wants to visit Japan" }),
  row("p", "Susan is going to Japan in March", { section: "plans", display: "Is going to Japan in March" }),
  row("s", "Susan's sister lives in Alameda", { section: "their_people", under: "Michelle · sister" }),
  row("s2", "Susan's sister works at Box", { section: "their_people", under: "Michelle · sister" }),
  row("t", "Susan and Ben went to Tahoe", { section: "their_people" }),
  row("b", "You and Susan take an annual ski trip", { section: "between_you" }),
];
const history: RecordLine[] = [
  row("x", "Susan lives in Colorado", { category: "residence", display: "Previously lived in Colorado", provenance: "You told Kinship · Oct 9", noteId: "n-closer", history: { when: "Moved · Oct 4" } }),
];

function record(over: Partial<React.ComponentProps<typeof PersonRecordView>> = {}, input: Parameters<typeof sectionsFor>[0] = { lines, history }) {
  return render(
    <PersonRecordView name="Susan" short="Susan" label={null} lines={[...input.lines]} sections={sectionsFor(input)} onBack={noop} onChange={noop} onForget={noop}
      onSource={noop} onSettle={noop} {...over} />,
  );
}

describe("B8: What Kinship knows in sections", () => {
  it("headings in the approved order, with Before and the related person's heading over their lines; empty sections absent", () => {
    const r = record();
    expect(headers(r)).toEqual(["Background", BEFORE_LABEL, "Into", "Hoping to", "Plans", "Their people", "Michelle · sister", "Between you"]);
    const only = record({}, { lines: [lines[1]] });
    expect(headers(only)).toEqual(["Into"]);
    expect(textsOf(only)).not.toContain("Background");
  });

  it("shows the display words, keeps the line's own words on Edit and Not this, and never the machinery, a count or a prompt", () => {
    const r = record();
    const shown = textsOf(r);
    expect(shown).toContain("Works at Meta");
    expect(shown).toContain("Loves pottery");
    expect(shown).toContain("Doesn't like skiing");
    expect(shown).not.toContain("Susan works at Meta");
    expect(labels(r)).toEqual(expect.arrayContaining(["Works at Meta", "Edit: Susan works at Meta", "Not this: Susan works at Meta"]));
    // Lines the rule leaves alone show unchanged.
    expect(shown).toContain("Susan and Ben went to Tahoe");
    expect(shown).toContain("Susan's sister lives in Alameda");
    expect(shown.join(" ")).not.toMatch(MACHINERY);
  });

  it("Before: the old line in the composer's words, dated by the change, its provenance opening the note that told it; Edit and Not this on the line itself", () => {
    const opened: string[] = [];
    const changed: string[] = [];
    const forgotten: string[] = [];
    const r = record({ onSource: (n) => opened.push(n), onChange: (l, what) => changed.push(`${l.id}:${what}`), onForget: (l) => forgotten.push(l.line.id) });
    const shown = textsOf(r);
    expect(shown).toContain("Previously lived in Colorado");
    expect(shown).toContain("Moved · Oct 4");
    expect(shown).toContain("You told Kinship · Oct 9");
    expect(shown).not.toContain("Susan lives in Colorado");
    press(r, "Previously lived in Colorado");
    expect(changed).toEqual(["x:words"]);
    press(r, "Edit: Susan lives in Colorado");
    press(r, "Not this: Susan lives in Colorado");
    expect(changed).toEqual(["x:words", "x:words"]);
    expect(forgotten).toEqual(["x"]);
    // No tokens on a history line (it is past, not something to re-file).
    const only = record({}, { lines: [], history });
    expect(labels(only).some((l) => l.startsWith("What:") || l.startsWith("Who:"))).toBe(false);
    expect(headers(only)).toEqual(["Background", BEFORE_LABEL]);
    // Its provenance opens the note that told the change.
    const prov = r.root.findAll((n) => typeof n.props.onPress === "function" && n.findAllByType(Text).some((t) => [t.props.children].flat().join("") === "You told Kinship · Oct 9"));
    act(() => prov[0].props.onPress());
    expect(opened).toEqual(["n-closer"]);
  });

  it("a composed Before line opens its notes like any composed line, dated by the change", () => {
    const h = composedRows(
      [member("b", "Susan lives in California", "California", [P.california], "2026-09-03T12:00:00Z"), member("a", "Susan lives in Alameda", "Alameda", [P.alameda], "2026-10-02T12:00:00Z")],
      NOW, { history: { when: null, provenance: "You told Kinship · Oct 9", noteId: "n-closer" } },
    ).rows;
    expect(h.map((x) => [x.composed?.text, x.provenance, x.noteId, x.history, x.section])).toEqual([["Previously lived in Alameda, California", "You told Kinship · Oct 9", "n-closer", { when: null }, "background"]]);
    const opened: RecordLine[] = [];
    const r = record({ onComposed: (l) => opened.push(l) }, { lines: [lines[0]], history: h });
    expect(headers(r)).toEqual(["Background", BEFORE_LABEL]);
    expect(textsOf(r)).toContain("Previously lived in Alameda, California");
    press(r, "Previously lived in Alameda, California");
    expect(opened.map((l) => l.composed?.memberIds)).toEqual([["a", "b"]]);
    // One member on its own as history: "Previously lived in Alameda", the same date and note.
    const one = composedRows([member("a", "Susan lives in Alameda", "Alameda", [P.alameda], "2026-10-02T12:00:00Z")], NOW, { history: { when: "Moved · Oct 4", provenance: "You told Kinship · Oct 9", noteId: "n-closer" } }).rows;
    expect(one.map((x) => [x.display, x.composed, x.provenance, x.history])).toEqual([["Previously lived in Alameda", undefined, "You told Kinship · Oct 9", { when: "Moved · Oct 4" }]]);
  });

  it("the conversations sit under Between you with the lines, or alone; the flat list (no sections) still works", () => {
    const trail = [{ id: "c1", label: "You messaged · Oct 12", about: null }];
    const r = record({ trail }, { lines: [lines[8]], trail: true });
    expect(headers(r)).toEqual(["Between you"]);
    expect(textsOf(r)).toEqual(expect.arrayContaining(["You and Susan take an annual ski trip", "You messaged · Oct 12"]));
    const alone = record({ trail }, { lines: [], trail: true });
    expect(headers(alone)).toEqual(["Between you"]);
    const flat = render(<PersonRecordView name="Susan" short="Susan" label={null} lines={lines} trail={trail} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />);
    expect(headers(flat)).toEqual(["Between you"]);
    expect(textsOf(flat)).toContain("Works at Meta");
  });
});
