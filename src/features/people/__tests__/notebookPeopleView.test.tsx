// People as the notebook's index (PR #77 spec §9, §10), rendered: the masthead's add and Settings,
// "Coming up for them", everyone as tiles, the one field finding people and what the user told
// Kinship (Ask v1's answer, unchanged), an empty query, an empty account, and the A–Z rail above 25
// people. Nothing counted, ranked, or made to look like AI.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AccessibilityInfo, SectionList, Text } from "react-native";
import type { AskView } from "@/features/ask/useAsk";
import { EMPTY_ASK } from "@/features/ask/useAsk";
import { ASK_COPY } from "@/features/ask/retrieve";
import type { RecordLine } from "@/features/person/PersonRecordView";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { Person } from "@/store/repositories";
import { NotebookPeopleView, type NotebookPeopleViewProps } from "../notebook/NotebookPeopleView";
import { buildTiles, comingUpForThem, INDEX_COPY, nameWordsOf } from "../notebook/peopleIndexModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
const mockPhotoReads: string[] = [];
jest.mock("@/hooks/usePersonPortrait", () => ({
  usePersonPortrait: (id: string) => {
    mockPhotoReads.push(id);
    return { uri: id === "ben" ? "file:///ben.jpg" : null, ready: true, pick: async () => undefined, remove: async () => undefined };
  },
}));

const TODAY = "2026-11-02";
const noop = () => undefined;

function person(id: string, display_name: string, over: Record<string, unknown> = {}): Person {
  return { id, display_name, state: "active", birthday: null, birthday_source: null, version: 1, full_name: null, nicknames: [], ...over } as Person;
}

const PEOPLE = [
  person("aiko", "Aiko Tanaka", { full_name: "Aiko Tanaka", contact_ref: "c1", birthday: "1990-01-14", birthday_source: "contacts" }),
  person("ben", "Ben Carter", { full_name: "Ben Carter", relationship_label: "From the Prospect Park running club" }),
  person("elena", "Elena", { relationship_label: "Your neighbor, two doors down" }),
  person("josh", "Josh", { birthday: "1991-11-03", birthday_source: "contacts" }),
  person("rosa", "Rosa", { state: "remembered" }),
  person("sam1", "Sam Doughty", { full_name: "Sam Doughty" }),
  person("sam2", "Sam Eden", { full_name: "Sam Eden" }),
];

function props(over: Partial<NotebookPeopleViewProps> = {}, people: Person[] = PEOPLE): NotebookPeopleViewProps {
  return {
    loaded: true,
    people,
    tiles: buildTiles(people),
    band: comingUpForThem({ people, items: [], today: TODAY }),
    names: nameWordsOf(people),
    today: TODAY,
    onOpen: noop,
    onAdd: async () => undefined,
    onSettings: noop,
    onAddFromContacts: noop,
    onHit: noop,
    ...over,
  };
}

const mounted: TestRenderer.ReactTestRenderer[] = [];
function render(el: React.ReactElement): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  // The list's own batching and Reduce Motion's read settle inside act.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  mounted.push(r);
  return r;
}
beforeEach(() => {
  jest.useFakeTimers();
  // Reduce Motion is read once and stays off here (its answer would land outside act).
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(new Promise<boolean>(() => undefined));
});
afterEach(() => {
  for (const r of mounted.splice(0)) act(() => r.unmount());
  jest.useRealTimers();
});
/** One pressable per testID (the Pressable and its host both carry it). */
const pressablesWith = (r: TestRenderer.ReactTestRenderer, prefix: string) => {
  const seen = new Set<string>();
  return r.root.findAll((x) => typeof x.props.testID === "string" && x.props.testID.startsWith(prefix) && typeof x.props.onPress === "function")
    .filter((x) => !seen.has(x.props.testID) && !!seen.add(x.props.testID));
};
const textsOf = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAllByType(Text).map((t) => [t.props.children].flat().map((c) => (typeof c === "string" ? c : "")).join("")).filter(Boolean);
const byLabel = (r: TestRenderer.ReactTestRenderer, label: string) =>
  r.root.findAll((x) => x.props.accessibilityLabel === label && typeof x.props.onPress === "function")[0];
const byTestId = (r: TestRenderer.ReactTestRenderer, id: string) => r.root.findAll((x) => x.props.testID === id && typeof x.props.onPress === "function")[0];
const type = (r: TestRenderer.ReactTestRenderer, text: string) => act(() => r.root.findByProps({ testID: "people-search" }).props.onChangeText(text));

/** What would count, rank, score or look like AI (contract §2, §3; spec §9: no sort, groups, pins, counts). */
const NEVER = /\d+ (?:people|results?|matches|memories)|score|rank|sort|pinned|group|health|AI\b|model|sparkle|overdue|still|streak/iu;

describe("People as an index", () => {
  it("shows the masthead, the one field, Coming up for them and everyone as tiles, with no marker on held people", () => {
    const r = render(<NotebookPeopleView {...props()} />);
    const texts = textsOf(r);
    expect(texts.slice(0, 1)).toEqual([INDEX_COPY.title]);
    expect(r.root.findByProps({ testID: "people-search" }).props.placeholder).toBe("Find someone, or something you told Kinship");
    expect(texts).toEqual(expect.arrayContaining([INDEX_COPY.band, INDEX_COPY.everyone]));
    // The band: Josh's Contacts birthday tomorrow, the dark chip.
    expect(byTestId(r, "band-josh").props.accessibilityLabel).toBe("Josh, tomorrow");
    expect(texts).toEqual(expect.arrayContaining(["Tomorrow"]));
    // Tiles: first names, the full name where two share it, one distinguishing line, never invented.
    const tiles = pressablesWith(r, "tile-");
    expect(tiles.map((t) => t.props.accessibilityLabel)).toEqual([
      "Aiko, Birthday Jan 14",
      "Ben, From the Prospect Park running club",
      "Elena, Your neighbor, two doors down",
      "Josh, Birthday Nov 3",
      "Rosa",
      "Sam Doughty",
      "Sam Eden",
    ]);
    expect(texts.join(" ")).not.toMatch(NEVER);
    expect(texts).not.toContain("Remembered");
    // No rail at seven people.
    expect(r.root.findAll((x) => x.props.testID === "letter-rail")).toHaveLength(0);
  });

  it("opens a person from a tile or the band, and reaches add and Settings from the masthead", () => {
    const onOpen = jest.fn();
    const onSettings = jest.fn();
    const r = render(<NotebookPeopleView {...props({ onOpen, onSettings })} />);
    act(() => byTestId(r, "tile-elena").props.onPress());
    act(() => byTestId(r, "band-josh").props.onPress());
    expect(onOpen.mock.calls).toEqual([["elena"], ["josh"]]);
    act(() => byLabel(r, "Settings").props.onPress());
    expect(onSettings).toHaveBeenCalled();
    act(() => byLabel(r, "Add someone").props.onPress());
    expect(textsOf(r)).toContain("Choose from your contacts instead"); // the add-by-name sheet
  });

  it("reads a photo only for the tiles it shows, and uses the one the user chose", () => {
    mockPhotoReads.length = 0;
    const r = render(<NotebookPeopleView {...props()} />);
    expect(new Set(mockPhotoReads)).toEqual(new Set(PEOPLE.map((p) => p.id)));
    const images = r.root.findAll((x) => x.props.source && typeof x.props.source === "object" && x.props.source.uri === "file:///ben.jpg");
    expect(images.length).toBeGreaterThan(0);
  });

  it("finds people by name as tiles, and what the user told Kinship as their own words with the find marked and the source", () => {
    const onHit = jest.fn();
    const line = (id: string, statement: string): ItemLine => ({
      id, statement, person: { id: "rosa", label: "Rosa", changeable: true }, about: null, also: [], replaces: [], when: null,
      kind: { value: "fact", label: "Something true", changeable: true }, edited: false,
    } as ItemLine);
    const row: RecordLine = { line: line("flour", "You said you'd bring her the good flour from Sahadi's."), provenance: "You told Kinship · Oct 4", noteId: "n-oct4", conflict: null };
    const memory: AskView = {
      query: "flour", asked: true, named: [], miss: null, birthdays: [],
      groups: [{ personId: "rosa", name: "Rosa", href: "/v2/person/rosa", quiet: true, conversations: [], rows: [{ key: "l1", earlier: false, href: "/v2/person/rosa?item=flour", row }] }],
    };
    const r = render(<NotebookPeopleView {...props({ memory, onHit })} />);
    type(r, "flour");
    const texts = textsOf(r);
    expect(texts).toContain(INDEX_COPY.found);
    expect(texts).not.toContain(INDEX_COPY.band);
    expect(texts).not.toContain(INDEX_COPY.everyone);
    expect(texts).toEqual(expect.arrayContaining(["Rosa · You told Kinship · Oct 4"]));
    // The found word in the find colour, the rest plain.
    const marked = r.root.findAll((x) => x.type === Text && x.props.style && (x.props.style as { backgroundColor?: string }).backgroundColor);
    expect(marked.map((m) => m.props.children)).toEqual(["flour"]);
    const hit = pressablesWith(r, "hit-")[0];
    expect(hit.props.accessibilityLabel).toBe("You said you'd bring her the good flour from Sahadi's.. Rosa · You told Kinship · Oct 4");
    act(() => hit.props.onPress());
    expect(onHit).toHaveBeenCalledWith("/v2/person/rosa?lens=pages&note=n-oct4");
    expect(texts.join(" ")).not.toMatch(NEVER);
  });

  it("shows the people a name finds first; a question keeps only the people it names, then Ask's honest miss", () => {
    const r = render(<NotebookPeopleView {...props({ memory: { ...EMPTY_ASK, query: "sam" } })} />);
    type(r, "sam");
    let texts = textsOf(r);
    expect(texts).toEqual(expect.arrayContaining([INDEX_COPY.people, "Sam Doughty", "Sam Eden"]));
    expect(texts).not.toContain("Elena");
    expect(texts).not.toContain(INDEX_COPY.found);

    const q = "When did I last see Sam?";
    const miss = ASK_COPY.noConversations("Sam Doughty and Sam Eden");
    const r2 = render(<NotebookPeopleView {...props({ memory: { ...EMPTY_ASK, query: q, asked: true, named: ["sam1", "sam2"], miss } })} />);
    type(r2, q);
    texts = textsOf(r2);
    expect(texts).toEqual(expect.arrayContaining([INDEX_COPY.people, "Sam Doughty", "Sam Eden", INDEX_COPY.found, miss]));
  });

  it("says when nothing answers, and offers to add a name no one has", () => {
    const r = render(<NotebookPeopleView {...props({ memory: { ...EMPTY_ASK, query: "zelda" } })} />);
    type(r, "zelda");
    expect(textsOf(r)).toEqual(expect.arrayContaining([INDEX_COPY.noOne("zelda"), INDEX_COPY.add("zelda")]));

    const q = "who likes sailing?";
    const r2 = render(<NotebookPeopleView {...props({ memory: { ...EMPTY_ASK, query: q, asked: true, miss: ASK_COPY.nothing } })} />);
    type(r2, q);
    expect(textsOf(r2)).toEqual(expect.arrayContaining([INDEX_COPY.found, ASK_COPY.nothing]));
    expect(textsOf(r2)).not.toContain(INDEX_COPY.add(q));
  });

  it("comes back to the band and everyone when the field is cleared", () => {
    const r = render(<NotebookPeopleView {...props({ memory: { ...EMPTY_ASK, query: "sam" } })} />);
    type(r, "sam");
    type(r, "");
    expect(textsOf(r)).toEqual(expect.arrayContaining([INDEX_COPY.band, INDEX_COPY.everyone, "Elena"]));
  });

  it("an empty account keeps the way to add people, in the notebook's look; never a band or an empty grid", () => {
    const onAddFromContacts = jest.fn();
    const r = render(<NotebookPeopleView {...props({ onAddFromContacts }, [])} />);
    const texts = textsOf(r);
    expect(texts).toEqual(expect.arrayContaining([INDEX_COPY.empty, INDEX_COPY.addFromContacts, INDEX_COPY.addByName]));
    expect(texts).not.toContain(INDEX_COPY.band);
    expect(texts).not.toContain(INDEX_COPY.everyone);
    act(() => byLabel(r, INDEX_COPY.addFromContacts).props.onPress());
    expect(onAddFromContacts).toHaveBeenCalled();
    // Still being read: nothing says "no one here yet".
    const loading = render(<NotebookPeopleView {...props({ loaded: false }, [])} />);
    expect(textsOf(loading)).not.toContain(INDEX_COPY.empty);
  });

  it("above 25 people, breaks the index by letter and shows the A–Z rail; a letter scrolls to its break", () => {
    const names = ["Ada", "Aiko", "Ben", "Bea", "Cal", "Dov", "Eli", "Fay", "Gus", "Hal", "Ida", "Jo", "Kai", "Lev", "Mo", "Ned", "Oz", "Pia", "Quinn", "Ray", "Sol", "Tia", "Uma", "Val", "Wes", "Yan", "Zed"];
    const many = names.map((nm, i) => person(`p${i}`, nm));
    const r = render(<NotebookPeopleView {...props({}, many)} />);
    const headers = r.root.findAll((x) => x.type === Text && x.props.accessibilityRole === "header").map((x) => x.props.children);
    expect(headers).toEqual(expect.arrayContaining(["A", "B"]));
    const rail = r.root.findByProps({ testID: "letter-rail" });
    expect(rail.findAllByType(Text).map((t) => t.props.children)).toEqual(names.map((nm) => nm[0]).filter((l, i, a) => a.indexOf(l) === i));
    expect(rail.props.accessibilityRole).toBe("adjustable");
    const list = r.root.findByType(SectionList).instance as { scrollToLocation: (p: unknown) => void };
    const spy = jest.spyOn(list, "scrollToLocation").mockImplementation(() => undefined);
    act(() => rail.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ sectionIndex: 1, itemIndex: 0 }));
    // At 25, no breaks and no rail.
    const few = render(<NotebookPeopleView {...props({}, many.slice(0, 25))} />);
    expect(few.root.findAll((x) => x.props.testID === "letter-rail")).toHaveLength(0);
  });

  it("stays virtualized for 500 people: a few rows mounted, not five hundred tiles", () => {
    const many = Array.from({ length: 500 }, (_, i) => person(`v${i}`, `Person${String(i).padStart(3, "0")}`));
    mockPhotoReads.length = 0;
    const r = render(<NotebookPeopleView {...props({}, many)} />);
    const shown = pressablesWith(r, "tile-");
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(100);
    expect(new Set(mockPhotoReads).size).toBeLessThan(100);
  });
});
