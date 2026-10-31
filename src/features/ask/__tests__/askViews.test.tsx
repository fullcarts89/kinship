// Ask Kinship v1 on the People screen (WS-6; CC-25, FD-30a): the search
// field's question shows "In your memory" under the people it names, each
// line in the page's words with its source; a question nothing answers gets
// one quiet line; a name keeps People's own filter and "No one called … yet";
// an empty account never sees the section. Through a real store for the
// hook's read, and the rendered views for the rest.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { randomUUID } from "crypto";
import { AskResults } from "../AskResults";
import { ASK_COPY } from "../retrieve";
import { askView, type AskView, EMPTY_ASK } from "../useAsk";
import { PeopleView } from "@/features/people/PeopleView";
import type { RecordLine } from "@/features/person/PersonRecordView";
import type { ItemLine } from "@/features/tell/reviewModel";
import { prepareSchema } from "@/store/schema";
import { repositoriesFor } from "@/store/repositories";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

const noop = () => undefined;
const NOW = new Date("2026-10-30T12:00:00Z");

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
const press = (r: TestRenderer.ReactTestRenderer, label: string) =>
  act(() => pressables(r).find((n) => n.props.accessibilityLabel === label)!.props.onPress());

function line(id: string, statement: string, personId = "susan"): ItemLine {
  return {
    id, statement, person: { id: personId, label: "Susan", changeable: true }, about: null, also: [], replaces: [], when: null,
    kind: { value: "fact", label: "Something true", changeable: true }, edited: false,
  };
}
const row = (id: string, statement: string, over: Partial<RecordLine> = {}): RecordLine =>
  ({ line: line(id, statement), provenance: "You told Kinship · Oct 8", noteId: `n-${id}`, conflict: null, ...over });

const view: AskView = {
  query: "Who do I know in Alameda?",
  asked: true,
  named: [],
  groups: [
    {
      personId: "susan", name: "Susan", quiet: false, conversations: [],
      rows: [
        { key: "composed", earlier: false, href: "/v2/person/susan?item=s-ala", row: row("s-ala", "Susan lives in Alameda", { display: "Lives in Alameda, California", provenance: "You told Kinship · Oct 2 · and 1 other note", composed: { text: "Lives in Alameda, California", memberIds: ["s-ala", "s-ca"], members: [] } }) },
        { key: "earlier", earlier: true, href: "/v2/person/susan/knows?item=s-oak", row: row("s-oak", "Susan lives in Oakland", { display: "Previously lived in Oakland", provenance: "You told Kinship · Oct 9", noteId: "n-move", history: { when: null } }) },
      ],
    },
    {
      personId: "dana", name: "Dana", quiet: true, conversations: [{ id: "c1", label: "You saw Dana · Sep 20", about: null }],
      rows: [{ key: "d", earlier: false, href: "/v2/person/dana?item=d-ala", row: row("d-ala", "Dana lives in Alameda") }],
    },
  ],
  birthdays: [],
  miss: null,
};

/** What would expose the machinery, count, score or sell (contract §3; CC-25; CC-28). */
const NEVER = /\bask\b|chat|search results|\d+ (?:results?|matches|lines|memories)|score|rank|suggest|AI|model|sparkle/u;

describe("In your memory", () => {
  it("shows each found line in the page's words under its person, with its source; nothing counted, no chat, no AI", () => {
    const r = render(<AskResults view={view} onLine={noop} onSource={noop} onComposed={noop} />);
    const texts = textsOf(r);
    expect(texts).toEqual([
      ASK_COPY.section,
      "Susan", "Lives in Alameda, California", "You told Kinship · Oct 2 · and 1 other note",
      ASK_COPY.earlier, "Previously lived in Oakland", "You told Kinship · Oct 9",
      "Dana", "You saw Dana · Sep 20", "Dana lives in Alameda", "You told Kinship · Oct 8",
    ]);
    for (const t of texts) expect(t).not.toMatch(NEVER);
  });

  it("tapping the words goes to that line on the person's page; the source opens the note; a composed line opens its notes", () => {
    const onLine = jest.fn();
    const onSource = jest.fn();
    const onComposed = jest.fn();
    const r = render(<AskResults view={view} onLine={onLine} onSource={onSource} onComposed={onComposed} />);
    press(r, "Lives in Alameda, California");
    expect(onLine).toHaveBeenCalledWith("/v2/person/susan?item=s-ala");
    press(r, "You told Kinship · Oct 2 · and 1 other note");
    expect(onComposed).toHaveBeenCalledWith(expect.objectContaining({ composed: expect.objectContaining({ text: "Lives in Alameda, California" }) }));
    press(r, "You told Kinship · Oct 9");
    expect(onSource).toHaveBeenCalledWith("n-move");
    press(r, `${ASK_COPY.earlier}: Previously lived in Oakland`);
    expect(onLine).toHaveBeenLastCalledWith("/v2/person/susan/knows?item=s-oak");
  });

  it("every line and conversation is reachable by VoiceOver with its words", () => {
    const r = render(<AskResults view={view} onLine={noop} onSource={noop} onComposed={noop} />);
    const labels = r.root.findAll((n) => typeof n.props.accessibilityLabel === "string").map((n) => String(n.props.accessibilityLabel));
    expect(labels).toEqual(expect.arrayContaining(["Lives in Alameda, California", `${ASK_COPY.earlier}: Previously lived in Oakland`, "You saw Dana · Sep 20", "Dana lives in Alameda"]));
  });

  it("a question nothing answers: one quiet line, and nothing else", () => {
    const r = render(<AskResults view={{ ...EMPTY_ASK, query: "purple elephants", asked: true, miss: ASK_COPY.nothing }} onLine={noop} onSource={noop} onComposed={noop} />);
    expect(textsOf(r)).toEqual([ASK_COPY.section, ASK_COPY.nothing]);
    expect(pressables(r)).toEqual([]);
  });

  it("nothing asked: nothing drawn", () => {
    const r = render(<AskResults view={EMPTY_ASK} onLine={noop} onSource={noop} onComposed={noop} />);
    expect(textsOf(r)).toEqual([]);
  });
});

describe("People with a question in the search field", () => {
  const rows = [
    { id: "ben", label: "Ben", line: "Ben runs Chicago Sunday", remembered: false },
    { id: "susan", label: "Susan", line: "Susan lives in Alameda", remembered: false },
  ];
  const type = (r: TestRenderer.ReactTestRenderer, text: string) =>
    act(() => r.root.findAll((n) => n.props.accessibilityLabel === "Search your people" && typeof n.props.onChangeText === "function")[0].props.onChangeText(text));

  it("a question keeps the people it names and shows the section under them; 'No one called … yet' is for a name", () => {
    const onQuery = jest.fn();
    const r = render(
      <PeopleView rows={rows} onOpen={noop} onAdd={async () => undefined} onQuery={onQuery}
        memory={{ asked: true, named: ["susan"], node: <Text>{ASK_COPY.section}</Text> }} />,
    );
    type(r, "What gift did Susan mention?");
    expect(onQuery).toHaveBeenLastCalledWith("What gift did Susan mention?");
    const texts = textsOf(r);
    expect(texts).toContain("Susan");
    expect(texts).not.toContain("Ben");
    expect(texts).toContain(ASK_COPY.section);
    expect(texts.some((t) => t.startsWith("No one called"))).toBe(false);
  });

  it("a name that is no one's still offers to add them, with no section", () => {
    const r = render(
      <PeopleView rows={rows} onOpen={noop} onAdd={async () => undefined} onQuery={noop}
        memory={{ asked: false, named: [], node: <Text>{ASK_COPY.section}</Text> }} />,
    );
    type(r, "Zelda");
    const texts = textsOf(r);
    expect(texts).toContain("No one called “Zelda” yet.");
    expect(texts).not.toContain(ASK_COPY.section);
  });

  it("an empty account never sees 'In your memory', whatever is typed", () => {
    const r = render(
      <PeopleView rows={[]} onOpen={noop} onAdd={async () => undefined} onAddFromContacts={noop} onQuery={noop}
        memory={{ asked: true, named: [], node: <Text>{ASK_COPY.section}</Text> }} />,
    );
    type(r, "What is John into?");
    const texts = textsOf(r);
    expect(texts).not.toContain(ASK_COPY.section);
    expect(texts.join(" ")).toContain("The people you care about will be here.");
  });
});

describe("the read, through a real store", () => {
  const ME = "4f1c2d3e-0000-4000-8000-0000000000a6";
  async function account() {
    const db = await openSqlJsDb();
    await prepareSchema(db, ME);
    const store = new UserStore(db, ME, { newId: randomUUID, now: () => "2026-10-08T21:14:00.000Z" });
    return { store, repos: repositoriesFor(store) };
  }

  it("an empty account asks nothing, whatever is typed", async () => {
    const { store } = await account();
    expect(await askView(store, "What is John into?", NOW)).toEqual({ ...EMPTY_ASK, query: "What is John into?" });
    expect(await askView(store, "Alameda", NOW)).toEqual({ ...EMPTY_ASK, query: "Alameda" });
  });

  it("a line remembered through the real write path is found with the page's provenance, its note, and a place to go", async () => {
    const { store, repos } = await account();
    const susan = await repos.people.add({ display_name: "Susan" });
    const john = await repos.people.add({ display_name: "John" });
    const note = await repos.captures.tell("Susan said she'd love a pottery wheel as a gift. John loves trail running.", { aiEnabled: false });
    await repos.memory.remember({ kind: "fact", person_id: susan.id, statement: "Susan said she'd love a pottery wheel as a gift", detail: { category: "other" } }, { captureId: note.id, quote: "Susan said she'd love a pottery wheel as a gift" });
    await repos.memory.remember({ kind: "fact", person_id: john.id, statement: "John loves trail running", detail: { category: "interest" } }, { captureId: note.id, quote: "John loves trail running" });
    const gift = await askView(store, "What gift did Susan mention?", NOW);
    expect(gift.asked).toBe(true);
    expect(gift.named).toEqual([susan.id]);
    expect(gift.miss).toBeNull();
    expect(gift.groups.map((g) => [g.name, g.rows.map((r) => [r.row.display ?? r.row.line.statement, r.row.provenance, r.row.noteId, r.href])])).toEqual([
      ["Susan", [["Susan said she'd love a pottery wheel as a gift", "You told Kinship · Oct 8", note.id, `/v2/person/${susan.id}?item=${gift.groups[0].rows[0].row.line.id}`]]],
    ]);
    const into = await askView(store, "What is John into?", NOW);
    expect(into.groups.map((g) => [g.name, g.rows.map((r) => r.row.display ?? r.row.line.statement)])).toEqual([["John", ["John loves trail running"]]]);
    const miss = await askView(store, "Does Susan ski?", NOW);
    expect(miss.groups).toEqual([]);
    expect(miss.miss).toBe(ASK_COPY.nothingFor("Susan"));
    expect((await askView(store, "Susan", NOW)).asked).toBe(false);
  });
});
