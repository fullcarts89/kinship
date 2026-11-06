// The person notebook (PR #77 §8) on screen: three lenses with Now as the Portrait's sections in the
// prototype's order, the sparse page with no lenses, Pages with a highlight that opens its line and a
// note= link that rings its note, Knows in its sections with the fine print; the line sheet offers
// "I did this" only on the user's own open promise; the Source page marks each line's words.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ScrollView, Text, TextInput } from "react-native";
import { PersonNotebookView, type PersonNotebookProps } from "../PersonNotebookView";
import { KNOWS_FINE, KnowsLensView } from "../KnowsLens";
import { LINE_COPY, LineSheetView } from "../LineSheet";
import { NotebookSourceView, SOURCE_COPY } from "../SourceView";
import { openingLens, resetLenses } from "../NotebookPerson";
import { buildPages } from "../pagesModel";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { RecordLine, RecordSection } from "@/features/person/PersonRecordView";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const rendered: TestRenderer.ReactTestRenderer[] = [];
function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  rendered.push(r);
  return r;
}
afterEach(() => act(() => rendered.splice(0).forEach((r) => r.unmount())));
const textsOf = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().filter((c) => typeof c === "string").join("")).filter(Boolean);
const press = (r: TestRenderer.ReactTestRenderer, label: string) => {
  const n = r.root.findAll((x) => x.props.accessibilityLabel === label && typeof x.props.onPress === "function")[0];
  if (!n) throw new Error(`no control "${label}"`);
  act(() => n.props.onPress());
};

const NOTE = "Took Sam to Kin Khao to celebrate. She starts the new role on the 16th and she's nervous about managing her old teammates. Leo says hi.";
const cp = (words: string) => {
  const i = NOTE.indexOf(words);
  return { span_start: i, span_end: i + words.length };
};
const pages = buildPages({
  personId: "sam",
  items: [
    { id: "role", kind: "event", person_id: "sam", statement: "Sam starts her new role on Mon, Nov 16", status: "active", sensitivity: "none" },
    { id: "nervous", kind: "fact", person_id: "sam", statement: "Sam is nervous about managing her old teammates", status: "active", sensitivity: "none" },
    { id: "leo", kind: "fact", person_id: "leo", statement: "Leo says hi", status: "active", sensitivity: "none" },
    { id: "kept", kind: "promise", person_id: "sam", subject_type: "user", statement: "Take Sam out to celebrate", status: "resolved", updated_at: "2026-11-06T22:00:00Z" },
  ],
  sources: [
    { memory_item_id: "role", capture_id: "n6", source_kind: "capture", ...cp("She starts the new role on the 16th") },
    { memory_item_id: "nervous", capture_id: "n6", source_kind: "capture", ...cp("she's nervous about managing her old teammates") },
    { memory_item_id: "leo", capture_id: "n6", source_kind: "capture", ...cp("Leo says hi") },
  ],
  captures: [{ id: "n6", raw_text: NOTE, status: "extracted", created_at: "2026-11-06T21:00:00Z" }],
  conversations: [],
});

const line = (itemId: string, statement: string, over: Partial<PersonNotebookProps["lately"][number]> = {}) =>
  ({ itemId, statement, when: null, provenance: "You told Kinship · Nov 6", noteId: "n6", ...over });

function page(over: Partial<PersonNotebookProps> = {}) {
  return (
    <PersonNotebookView
      personId="sam" name="Sam Delgado" short="Sam" label="From the pottery studio" remembered={false}
      comingUp={[line("role", "Sam starts her new role on Mon, Nov 16", { when: "Mon, Nov 16" }), line("birthday", "Sam's birthday", { when: "Nov 20", provenance: "From Contacts", noteId: null, fixed: true })]}
      youSaid={[line("call", "Call Sam after her first week", { provenance: "You told Kinship · Nov 6" })]}
      lately={[line("nervous", "Sam is nervous about managing her old teammates", { was: "Sam is interviewing at Stripe" }), line("surgery", "Sam's knee surgery went well")]}
      between={[line("studio", "You and Sam share a wheel at the studio")]}
      trail={[{ id: "c1", label: "You messaged · Nov 4", about: "Sam starts her new role" }]}
      total={6}
      facts={{ role: { sensitive: false, day: "2026-11-16" }, birthday: { sensitive: false, day: "2026-11-20" }, surgery: { sensitive: true, day: null } }}
      pages={pages}
      lens="now" onLens={noop}
      onBack={noop} onLine={noop} onSource={noop} onMessage={noop} onCall={noop} onTell={noop}
      onRename={noop} onPhoto={noop}
      ideas={<Text>IDEAS-SLOT</Text>}
      knows={() => <Text>KNOWS-SLOT</Text>}
      now={new Date("2026-11-07T12:00:00Z")}
      {...over}
    />
  );
}

describe("the notebook page", () => {
  it("has the header, Message · Call · Tell, quiet Edit and photo controls, and three lenses (Now by default)", () => {
    const r = render(page());
    const shown = textsOf(r);
    expect(shown).toEqual(expect.arrayContaining(["Sam\nDelgado", "From the pottery studio", "Message", "Call", "Tell", "Edit", "Add a photo", "Now", "Pages", "Knows"]));
    const tabs = r.root.findAll((n) => typeof n.type === "string" && n.props.accessibilityRole === "tab");
    expect(tabs.map((t) => [t.props.accessibilityLabel, t.props.accessibilityState.selected])).toEqual([["Now", true], ["Pages", false], ["Knows", false]]);
  });

  it("Now is the Portrait's sections in the prototype's order, with sources, a private line said as private, and the knows link", () => {
    const shown = textsOf(render(page()));
    const at = (t: string) => shown.indexOf(t);
    expect(at("Coming up")).toBeLessThan(at("You said you'd"));
    expect(at("You said you'd")).toBeLessThan(at("Lately"));
    expect(at("Lately")).toBeLessThan(at("Between you"));
    expect(at("Between you")).toBeLessThan(at("IDEAS-SLOT"));
    expect(at("IDEAS-SLOT")).toBeLessThan(at("What Kinship knows about Sam"));
    // A Coming up row with its date block, and the Contacts birthday.
    expect(shown).toEqual(expect.arrayContaining(["MON", "Nov 16", "Sam starts her new role on Mon, Nov 16", "FRI", "Nov 20", "Sam's birthday", "From Contacts"]));
    // Lately: "was" struck through; the private line shows that it is private and never its note.
    expect(shown.slice(shown.indexOf("was: "), shown.indexOf("was: ") + 2)).toEqual(["was: ", "Sam is interviewing at Stripe"]);
    expect(shown).toContain("Private · you said yes");
    // Between you: the conversation, then the shared line.
    expect(at("You messaged · Nov 4")).toBeLessThan(at("You and Sam share a wheel at the studio"));
    expect(shown.join(" ")).not.toMatch(/\d+ (lines|notes|conversations)|streak|score|overdue/i);
  });

  it("item= (View Sam from a moment) lands on that line on Now", () => {
    const r = render(page({ focusItemId: "nervous" }));
    const laid = r.root.findAll((n) => typeof n.type === "string" && typeof n.props.onLayout === "function");
    act(() => laid.forEach((n) => n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 100, width: 300, height: 40 } } })));
    expect(r.root.findByType(ScrollView).instance.scrollTo).toHaveBeenCalledTimes(1);
    const focused = r.root.findAll((n) => typeof n.type === "string" && n.props.testID === "focused-line");
    expect(focused).toHaveLength(1);
  });

  it("tapping a line opens it; the knows link switches to Knows", () => {
    const opened: string[] = [];
    const lenses: string[] = [];
    const r = render(page({ onLine: (id) => opened.push(id), onLens: (l) => lenses.push(l) }));
    press(r, "Sam is nervous about managing her old teammates");
    expect(opened).toEqual(["nervous"]);
    act(() => r.root.findAll((n) => n.props.accessibilityHint === "Shows the Knows lens" && typeof n.props.onPress === "function")[0].props.onPress());
    expect(lenses).toEqual(["knows"]);
  });

  it("a sparse page has no lenses: the invitation, the Contacts birthday, Tell Kinship about them", () => {
    let told = 0;
    const r = render(page({ name: "Aiko Tanaka", short: "Aiko", label: null, total: 0, trail: [], comingUp: [], youSaid: [], lately: [], between: [], contactsBirthday: "2027-01-14", onTell: () => told++ }));
    const shown = textsOf(r);
    expect(shown).toContain("What you tell Kinship about Aiko will be here: what's going on with them, what's coming up, what you said you'd do.");
    expect(shown).toEqual(expect.arrayContaining(["JAN", "14", "Aiko's birthday", "From Contacts", "Tell Kinship about Aiko"]));
    expect(r.root.findAll((n) => typeof n.type === "string" && n.props.accessibilityRole === "tab")).toHaveLength(0);
    expect(shown).not.toContain("IDEAS-SLOT");
    press(r, "Tell Kinship about Aiko");
    expect(told).toBe(1);
  });

  it("the return loop sits in the raised panel, as built", () => {
    const answers: string[] = [];
    const r = render(page({ returnCheck: { ask: "Did you reach Sam?", about: "Her new role", type: "promise" }, onReturn: (a) => answers.push(a) }));
    expect(textsOf(r)).toEqual(expect.arrayContaining(["Did you reach Sam?", "Her new role", "Yes", "Not yet", "Didn't happen"]));
    press(r, "Yes");
    expect(answers).toEqual(["yes"]);
    const after = render(page({ afterReturn: { followUp: "Anything worth remembering from talking with Sam?" }, ack: "In Sam's notebook: You messaged · Nov 7" }));
    expect(textsOf(after)).toEqual(expect.arrayContaining(["Anything worth remembering from talking with Sam?", "Tell Kinship", "Nothing today", "In Sam's notebook: You messaged · Nov 7"]));
  });
});

describe("Pages", () => {
  it("shows the note in full with this person's words marked; a mark opens its line; another person's line isn't marked", () => {
    const opened: string[] = [];
    const r = render(page({ lens: "pages", onLine: (id) => opened.push(id) }));
    const shown = textsOf(r);
    expect(shown).toContain("Fri, Nov 6 · You told Kinship");
    expect(shown).toContain("You kept it: take Sam out to celebrate");
    expect(shown.indexOf("You kept it: take Sam out to celebrate")).toBeLessThan(shown.indexOf("Fri, Nov 6 · You told Kinship"));
    const marks = r.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("kept-") && n.type === Text);
    expect(marks.map((m) => m.props.children)).toEqual(["She starts the new role on the 16th", "she's nervous about managing her old teammates"]);
    expect(marks[0].props.accessibilityLabel).toBe("Shows the line: Sam starts her new role on Mon, Nov 16");
    expect(r.root.findAll((n) => n.props.testID === "kept-leo")).toHaveLength(0);
    act(() => marks[0].props.onPress());
    expect(opened).toEqual(["role"]);
  });

  it("note= rings that note and scrolls to it", () => {
    const r = render(page({ lens: "pages", focusNoteId: "n6" }));
    expect(r.root.findAll((n) => typeof n.type === "string" && n.props.testID === "target-note")).toHaveLength(1);
    const laid = r.root.findAll((n) => typeof n.type === "string" && typeof n.props.onLayout === "function");
    act(() => laid.forEach((n) => n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 100, width: 300, height: 40 } } })));
    expect(r.root.findByType(ScrollView).instance.scrollTo).toHaveBeenCalled();
  });

  it("Find in Sam's pages keeps the notes that say it and marks the words", () => {
    const r = render(page({ lens: "pages" }));
    const field = r.root.findByType(TextInput);
    expect(field.props.placeholder).toBe("Find in Sam's pages");
    act(() => field.props.onChangeText("kin khao"));
    expect(textsOf(r)).not.toContain("You kept it: take Sam out to celebrate");
    act(() => field.props.onChangeText("nothing like it"));
    expect(textsOf(r)).toContain("Nothing in these pages says that.");
  });
});

describe("Knows", () => {
  const rec = (id: string, statement: string, over: Partial<RecordLine> = {}): RecordLine => ({
    line: { id, statement, replaces: [], editedFrom: null, kind: { label: "Something true", value: "fact", changeable: true } } as unknown as ItemLine,
    provenance: "You told Kinship · Jul 8", noteId: "n1", conflict: null, ...over,
  });
  const sections: RecordSection[] = [
    { key: "background", label: "Background", rows: [rec("saic", "Leo teaches at SAIC"), rec("old", "Leo was thinking about leaving the studio", { line: { ...rec("old", "x").line, statement: "Leo was thinking about leaving the studio", replaces: ["Leo works at the studio"] } as ItemLine })] },
    { key: "between_you", label: "Between you", rows: [] },
  ];

  it("is What Kinship knows in its sections, each line with its source, ending with the fine print", () => {
    const opened: string[] = [];
    const r = render(<KnowsLensView sections={sections} trail={[{ id: "c1", label: "You called · Oct 3", about: null }]} facts={{}} onLine={(x) => opened.push(x.line.id)} onSource={noop} onSettle={noop} onForgetConversation={noop} />);
    const shown = textsOf(r);
    expect(shown).toEqual(expect.arrayContaining(["Background", "Leo teaches at SAIC", "You told Kinship · Jul 8", "Between you", "You called · Oct 3", KNOWS_FINE]));
    expect(shown.slice(shown.indexOf("Replaces · was: "), shown.indexOf("Replaces · was: ") + 2)).toEqual(["Replaces · was: ", "Leo works at the studio"]);
    expect(shown[shown.length - 1]).toBe(KNOWS_FINE);
    press(r, "Leo teaches at SAIC");
    expect(opened).toEqual(["saic"]);
  });

  it("the page shows the Knows lens it is given", () => {
    expect(textsOf(render(page({ lens: "knows" })))).toContain("KNOWS-SLOT");
  });
});

describe("the line sheet", () => {
  const itemLine = (over: Partial<ItemLine> = {}): ItemLine => ({
    id: "flour", statement: "Bring Rosa the good flour from Sahadi's", person: { id: "rosa", label: "Rosa", changeable: true }, about: null, also: [],
    replaces: [], when: null, kind: { value: "promise", label: "Your promise", changeable: true, owner: { value: "user", name: "Rosa" } }, edited: false, ...over,
  });
  const detail = (openOwnPromise: boolean) => ({
    itemId: "flour", kindLabel: openOwnPromise ? "Something you said you'd do" : "Something true", promise: openOwnPromise, openOwnPromise, sensitive: false, first: "Rosa",
    quote: { text: "I need to bring her the good flour from Sahadi's — the 00 one.", mark: [0, 47] as [number, number] },
  });
  const sheet = (open: boolean, onKept = jest.fn()) => render(
    <LineSheetView item={{ line: itemLine(), provenance: "You told Kinship · Oct 4", noteId: "n4" }} detail={detail(open)} visible people={[]} today="2026-11-02"
      onCorrect={noop} onForget={noop} onSource={noop} onDismiss={noop} onKept={onKept} />,
  );

  it("offers I did this on the user's own open promise, and it calls kept", () => {
    const kept = jest.fn();
    const r = sheet(true, kept);
    const shown = textsOf(r);
    expect(shown).toEqual(expect.arrayContaining(["Something you said you'd do · Rosa", "Bring Rosa the good flour from Sahadi's", "You told Kinship · Oct 4 · open the note",
      LINE_COPY.edit, LINE_COPY.person, LINE_COPY.notThis, LINE_COPY.did]));
    press(r, LINE_COPY.did);
    expect(kept).toHaveBeenCalledWith("flour");
  });

  it("never offers it on anything else", () => {
    expect(textsOf(sheet(false))).not.toContain(LINE_COPY.did);
  });

  it("Not this asks first, then forgets", () => {
    const forgotten: string[] = [];
    const r = render(
      <LineSheetView item={{ line: itemLine(), provenance: "You told Kinship · Oct 4", noteId: "n4" }} detail={detail(true)} visible people={[]} today="2026-11-02"
        onCorrect={noop} onForget={(id) => forgotten.push(id)} onSource={noop} onDismiss={noop} />,
    );
    press(r, LINE_COPY.notThis);
    expect(forgotten).toEqual([]);
    expect(textsOf(r)).toContain(LINE_COPY.forgetAsk);
    press(r, LINE_COPY.forget);
    expect(forgotten).toEqual(["flour"]);
  });
});

describe("the Source page", () => {
  it("says the note, marks each kept line's words, lists what was kept, and keeps Delete", () => {
    const text = "Nonna's teaching me the ravioli. Sam says hi.";
    const opened: string[] = [];
    let deleted = 0;
    const r = render(
      <NotebookSourceView
        note={{ runs: [{ text, marked: false }], quotes: [], arrived: "Typed · Oct 4, 9:14 pm", items: [], partial: null }}
        page={{
          at: "2026-10-04T21:14:00", intention: false,
          spans: [{ start: 0, end: 31, itemId: "rav", personId: "rosa", sensitive: false }, { start: 33, end: 44, itemId: "hi", personId: "sam", sensitive: false }],
          kept: [
            { itemId: "rav", statement: "Rosa is teaching you to make ravioli", personId: "rosa", person: "Rosa", sensitive: false, updated: false },
            { itemId: "hi", statement: "Sam says hi", personId: "sam", person: "Sam", sensitive: true, updated: false },
          ],
        }}
        now={new Date("2026-11-02T12:00:00")}
        onBack={noop} onLine={(id) => opened.push(id)} onPerson={noop} onDelete={() => deleted++}
      />,
    );
    const shown = textsOf(r);
    expect(shown).toEqual(expect.arrayContaining([SOURCE_COPY.note, "Sunday, October 4", SOURCE_COPY.kept, "Rosa is teaching you to make ravioli", "Private · you said yes", SOURCE_COPY.fine]));
    act(() => r.root.findAll((n) => n.props.testID === "kept-rav" && n.type === Text)[0].props.onPress());
    expect(opened).toEqual(["rav"]);
    press(r, SOURCE_COPY.delete);
    expect(deleted).toBe(1);
  });
});

describe("which lens a page opens on", () => {
  beforeEach(() => resetLenses());
  it("the link's own; a note's is Pages; else Now", () => {
    expect(openingLens("p", { lens: "knows" })).toBe("knows");
    expect(openingLens("p", { note: "n1" })).toBe("pages");
    expect(openingLens("p", { item: "m1" })).toBe("now");
    expect(openingLens("p", { lens: "bogus" })).toBe("now");
  });
});
