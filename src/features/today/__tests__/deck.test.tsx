// Today as a Moment Deck (PR #77 §2): the poster says exactly what Today's Moment says; the deck holds
// exactly the quiet lines the existing rules allow, questions first, then "That's today."; a quiet day
// and first use keep their own compositions; nothing is made up to fill the screen.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import { DeckToday } from "@/features/today/deck/DeckToday";
import { DECK_COPY } from "@/features/today/deck/DeckParts";
import { deckCards, posterFor, whenChip } from "@/features/today/deck/deckModel";
import type { MomentView, QuietView, TodayView } from "@/features/today/todayModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/hooks/usePhotos", () => ({ usePhotos: () => ({}) }));

const TODAY = "2026-11-02";
const noop = () => undefined;
const ben: MomentView = {
  reasonId: "r1", type: "event_followup", personId: "ben", personName: "Ben", itemId: "m1",
  memory: "Ben ran the New York Marathon on Sun, Nov 1", day: "2026-11-01", statement: "How did it go for Ben?",
  context: "Ben ran the New York Marathon on Sun, Nov 1 · Sun, Nov 1", provenance: "From your note · Oct 8", noteId: "c1", score: 80,
  primary: { label: "Ask how it went", hint: "" }, heading: "Ask Ben how it went", mention: [], opener: null, suggestion: null,
  ask: "Did you ask Ben how it went?", followUp: "Anything worth remembering from asking Ben?", hope: "He's hoping to break four hours.",
};
const maya: QuietView = { kind: "coming", label: "Saturday", text: "Maya's birthday", personId: "maya", itemId: null, day: "2026-11-07", due: false, hope: null, provenance: "From Contacts", noteId: null };
const josh: QuietView = { kind: "coming", label: "Thursday", text: "Josh's interview, 10:00", personId: "josh", itemId: "m2", day: "2026-11-05", due: false, hope: null, provenance: "From your note · Oct 20", noteId: "c2" };
const elena: QuietView = { kind: "coming", label: "Thursday", text: "Bring Elena dinner", personId: "elena", itemId: "m3", day: "2026-11-05", due: true, hope: null, provenance: "You saved this · Nov 2", noteId: "c3" };
const question: QuietView = { kind: "question", label: "A question", text: "Which Sam?", action: "Answer", captureId: "c9" };
const names: Record<string, string> = { ben: "Ben", maya: "Maya", josh: "Josh", elena: "Elena" };
const nameOf = (id: string) => names[id] ?? null;

const view = (over: Partial<TodayView> = {}): TodayView => ({
  dateLabel: "MONDAY, NOV 2", greeting: "Good morning, Nora.", returnCheck: null, moment: ben, quiet: [josh, maya], quietDay: false, waiting: null, firstUse: null, ...over,
});

function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const texts = (r: TestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join("")).filter((s) => s.trim());
const deck = (v: TodayView, over: Partial<React.ComponentProps<typeof DeckToday>> = {}) => render(
  <DeckToday
    view={v} today={TODAY} nameOf={nameOf} afterReturn={null} onPrimary={noop} onOpenMoment={noop} onNotNow={noop} onProvenance={noop}
    onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} {...over}
  />,
);

describe("the poster's words are the Moment's", () => {
  it("when, headline, the memory in the user's words, what they hoped, the source, one action and Not now", () => {
    expect(posterFor(ben, TODAY)).toEqual({
      personId: "ben", personName: "Ben", when: "Yesterday · Sun, Nov 1", headline: "How did it go for Ben?",
      memory: "Ben ran the New York Marathon on Sun, Nov 1", hope: "He's hoping to break four hours.",
      source: "From your note · Oct 8", sourceKind: "note", primary: "Ask how it went", promise: false,
    });
    expect(whenChip("2026-11-07", TODAY)).toBe("Saturday · Sat, Nov 7");
    expect(whenChip("2026-12-20", TODAY)).toBe("Sun, Dec 20");
  });

  it("a promise of the user's own leads with I did this; its words aren't said twice", () => {
    const p = posterFor({ ...ben, type: "promise", statement: "You said you'd bring Sam soup.", memory: "Bring Sam soup", primary: { label: "Message Sam", hint: "" } }, TODAY);
    expect(p.promise).toBe(true);
    expect(p.memory).toBeNull();
  });

  it("renders the poster, then Also coming up, then the end card", () => {
    const t = texts(deck(view()));
    const order = ["How did it go for Ben?", "Ben ran the New York Marathon on Sun, Nov 1", "“He's hoping to break four hours.”", "From your note · Oct 8", "Ask how it went", DECK_COPY.notNow, DECK_COPY.also, DECK_COPY.end];
    const idx = order.map((s) => t.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });
});

describe("the deck is finite and holds only what the quiet-line rules allow", () => {
  it("questions first, then the lines in the model's order, then the end card", () => {
    const cards = deckCards([josh, maya, question], TODAY, nameOf).map((e) => e.card);
    expect(cards.map((c) => c.kind)).toEqual(["question", "person", "person", "end"]);
    expect(cards[1]).toMatchObject({ personName: "Josh", when: "Thursday", line: "Josh's interview, 10:00", source: "From your note" });
    expect(cards[2]).toMatchObject({ personName: "Maya", when: "Saturday", source: "From Contacts", sourceKind: "contacts" });
  });

  it("the user's own promise falling due reads as theirs (You said you'd)", () => {
    const [card] = deckCards([elena], TODAY, nameOf).map((e) => e.card);
    expect(card).toMatchObject({ kind: "person", yours: true });
  });

  it("someone no longer here is never a card; an empty week is no deck at all", () => {
    expect(deckCards([{ ...josh, personId: "gone" }], TODAY, nameOf)).toEqual([]);
    expect(deckCards([], TODAY, nameOf)).toEqual([]);
    const t = texts(deck(view({ quiet: [] })));
    expect(t).not.toContain(DECK_COPY.end);
  });
});

describe("states", () => {
  it("a quiet day is its own page: Nothing needs you today, then what's coming", () => {
    const t = texts(deck(view({ moment: null, quietDay: true, quiet: [maya] })));
    expect(t).toContain(DECK_COPY.quietTitle);
    expect(t).toContain(DECK_COPY.quietSub);
    expect(t).toContain(DECK_COPY.coming);
  });

  it("first use is never the quiet day: orientation with one next step, and what's already worth knowing", () => {
    const t = texts(deck(view({ moment: null, quietDay: false, firstUse: { hasPeople: true }, quiet: [maya] })));
    expect(t).not.toContain(DECK_COPY.quietTitle);
    expect(t).toContain("This is where Kinship brings things back.");
    expect(t).toContain(DECK_COPY.worth);
    expect(t).toContain(DECK_COPY.endFirst);
  });

  it("the return check asks its reason, Yes and Not yet; a promise's also offers Didn't happen", () => {
    const rc = { personId: "ben", personName: "Ben", reasonId: "r1", channel: "text" as const, ask: "Did you ask Ben how it went?", about: null, followUp: "" };
    expect(texts(deck(view({ returnCheck: rc })))).toEqual(expect.arrayContaining(["Did you ask Ben how it went?", "Yes", "Not yet"]));
    expect(texts(deck(view({ returnCheck: { ...rc, type: "promise" } })))).toContain("Didn't happen");
  });

  it("while Today is settling, no empty state flashes", () => {
    const t = texts(deck(view({ moment: null, quietDay: true, quiet: [] }), { settling: true }));
    expect(t).not.toContain(DECK_COPY.quietTitle);
  });
});

it("never quantifies: no counts, scores or overdue words anywhere on Today", () => {
  const t = texts(deck(view({ quiet: [josh, maya, question, elena] }))).join(" ");
  expect(t).not.toMatch(/overdue|streak|score|\bstill\b|you haven't|it's been|\d+ (people|moments|reminders)/iu);
});
