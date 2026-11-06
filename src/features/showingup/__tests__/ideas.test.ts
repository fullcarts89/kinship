// Ideas for showing up (PR #77 §4): grounded only in what the user told Kinship, with the quote and its
// source; SUA-1's exclusions; the user's own promise first; Option A titles; 0–3; nothing for anyone held.
import { CATEGORY_LABEL, groundedIds, IDEAS_MAX, ideasFor, ideaTitle, keepDays } from "@/features/showingup/ideas";
import type { MemoryItem, Person } from "@/store/repositories";

const TODAY = "2026-10-17";
const susan = { id: "susan", display_name: "Susan", state: "active" } as unknown as Person;

let n = 0;
function line(over: Partial<MemoryItem> & { statement: string }): MemoryItem {
  n++;
  return {
    id: `m${n}`, kind: "fact", person_id: "susan", subject_type: "person", detail: {}, certainty: "stated", status: "active",
    sensitivity: "none", user_state: "unreviewed", origin: "extracted", created_at: `2026-10-${String(n % 16 + 1).padStart(2, "0")}T12:00:00Z`, ...over,
  } as unknown as MemoryItem;
}
const QUOTES: Record<string, string> = {};
const quote = (m: MemoryItem, words: string) => {
  QUOTES[m.id] = words;
  return m;
};
const move = quote(line({ kind: "milestone", statement: "Susan is moving to Denver on October 30", detail: { milestone_type: "move", date: "2026-10-30", date_precision: "day" } }), "she's moving to Denver on the 30th");
const tasting = quote(line({ kind: "event", statement: "Susan has a cake tasting on Thursday", detail: { date: "2026-10-22", date_precision: "day", event_type: "other" } }), "cake tasting Thursday");
const promoted = quote(line({ statement: "Susan got promoted", detail: { category: "work", date: "2026-10-15", date_precision: "day" }, created_at: "2026-10-16T12:00:00Z" }), "she got the promotion!!");
const pottery = quote(line({ statement: "Susan loves pottery", detail: { category: "interest", attribute: "hobby", value: "pottery" } }), "she loves pottery");
const book = quote(line({ statement: "Susan keeps talking about getting Ottolenghi's Comfort", detail: { category: "preference" } }), "keeps talking about getting his new one, Comfort");
const thread = quote(line({ kind: "thread", statement: "Susan is deciding whether to take the Denver job", created_at: "2026-10-14T12:00:00Z" }), "trying to decide about the Denver job");
const promise = quote(line({ kind: "promise", subject_type: "user", statement: "Bring Susan dinner Thursday", detail: { due_date: "2026-10-22" }, created_at: "2026-10-12T12:00:00Z" }), "maybe bring dinner Thursday");

const input = (items: MemoryItem[], over: Partial<Parameters<typeof ideasFor>[0]> = {}) => ({
  person: susan, items, today: TODAY,
  quotes: (id: string) => (QUOTES[id] ? [QUOTES[id]] : []),
  provenance: (id: string) => (items.some((m) => m.id === id) ? { line: "From your note · Oct 8", noteId: `note-${id}` } : null),
  ...over,
});

describe("grounding", () => {
  it("every idea quotes the user's own words for it, with the source and the note", () => {
    const ideas = ideasFor(input([move, promoted]));
    expect(ideas.length).toBeGreaterThan(0);
    for (const i of ideas) {
      expect(i.grounds.length).toBeGreaterThan(0);
      for (const g of i.grounds) {
        expect(g.source).toBe("From your note · Oct 8");
        expect(g.noteId).toBe(`note-${g.itemId}`);
      }
    }
    expect(ideas.find((i) => i.grounds[0].itemId === move.id)?.grounds[0].quote).toBe("She's moving to Denver on the 30th.");
  });

  it("a line without a source is never an idea; nothing is invented to fill the list", () => {
    expect(ideasFor(input([move], { provenance: () => null }))).toEqual([]);
    expect(ideasFor(input([line({ statement: "Susan has brown hair" })]))).toEqual([]);
  });

  it("a birthday from Contacts grounds only its own idea, and says so", () => {
    const [b] = ideasFor(input([], { birthday: { day: "2026-10-20" } }));
    expect(b).toMatchObject({ category: "celebrate", ways: ["onday", "message"], grounds: [{ itemId: null, source: "From Contacts", contacts: true }] });
  });
});

describe("SUA-1's exclusions", () => {
  it("nothing sensitive, by label or by wording; no relative's line; nothing retracted or stale", () => {
    const health = quote(line({ statement: "Susan is moving after the divorce", sensitivity: "conflict", detail: { milestone_type: "move", date: "2026-10-30", date_precision: "day" }, kind: "milestone" }), "after the divorce");
    const wording = quote(line({ kind: "event", statement: "Susan has chemo on Thursday", detail: { date: "2026-10-22", date_precision: "day" } }), "chemo Thursday");
    const relative = quote(line({ kind: "milestone", statement: "Susan's sister is moving", subject_type: "related", detail: { milestone_type: "move", date: "2026-10-30", date_precision: "day" } }), "sister moving");
    const gone = { ...move, id: "gone", status: "retracted" } as MemoryItem;
    const old = quote(line({ kind: "event", statement: "Susan ran a race", detail: { date: "2026-06-01", date_precision: "day" } }), "ran a race");
    expect(ideasFor(input([health, wording, relative, gone, old]))).toEqual([]);
  });

  it("remembered, paused or removed: no ideas at all", () => {
    for (const state of ["remembered", "paused", "archived"]) {
      expect(ideasFor(input([move, promise], { person: { ...susan, state } as unknown as Person }))).toEqual([]);
    }
  });

  it("the user's own open promise is the one exception: it is their word, and it leads", () => {
    const tender = { ...promise, id: "p-sensitive", sensitivity: "health" } as MemoryItem;
    QUOTES["p-sensitive"] = QUOTES[promise.id];
    const [first] = ideasFor(input([move, tender]));
    expect(first).toMatchObject({ category: "follow_through", title: "Follow through on what you said", promise: { itemId: "p-sensitive", due: "2026-10-22" } });
    // A kept (resolved) promise is no idea.
    expect(ideasFor(input([{ ...promise, status: "resolved" } as MemoryItem])).some((i) => i.category === "follow_through")).toBe(false);
    // Someone else's promise to the user is not the user's to follow through on.
    expect(ideasFor(input([{ ...promise, subject_type: "person" } as MemoryItem])).some((i) => i.category === "follow_through")).toBe(false);
  });
});

describe("categories, titles and order", () => {
  it("Option A: a fixed template per category, never the user's voice; the quote is theirs", () => {
    const ideas = ideasFor(input([move, tasting, promoted]));
    // Newest told first (the news, Oct 16), then the tasting and the move.
    expect(ideas.map((i) => [i.category, i.title])).toEqual([
      ["celebrate", "Celebrate with Susan"],
      ["message", "Send Susan a note"],
      ["help", "Offer Susan a hand"],
    ]);
    expect(ideaTitle("together", "Susan", "pottery")).toBe("Suggest doing pottery together");
    expect(CATEGORY_LABEL.gesture).toBe("A gesture");
  });

  it("an interest in the user's own words is time together; a wish or preference they quoted is a gesture; an open thread is a check-in", () => {
    expect(ideasFor(input([pottery]))[0]).toMatchObject({ category: "together", gesture: "activity" });
    expect(ideasFor(input([book]))[0]).toMatchObject({ category: "gesture", title: "Something for Susan", gesture: null });
    expect(ideasFor(input([thread]))[0]).toMatchObject({ category: "check_in", title: "Ask Susan how it's going" });
  });

  it("the promise first, then what the Moment is about, then the newest told; at most three", () => {
    const ideas = ideasFor(input([promoted, move, tasting, pottery, book, promise], { about: tasting }));
    expect(ideas).toHaveLength(IDEAS_MAX);
    expect(ideas[0].category).toBe("follow_through");
    expect(ideas[1].grounds[0].itemId).toBe(tasting.id);
  });

  it("the hand-off from an idea carries SUA-1's kind, so a Yes may ask its one content-free question", () => {
    const byCat = Object.fromEntries(ideasFor(input([move, tasting, promoted])).map((i) => [i.category, i.gesture]));
    expect(byCat).toEqual({ celebrate: "plan", help: "help", message: "note" });
  });

  it("You could mention leaves out what the ideas quote", () => {
    const ideas = ideasFor(input([move, promoted]));
    expect(groundedIds(ideas)).toEqual(new Set([promoted.id, move.id]));
  });
});

it("keep it in mind offers the next days by name, then the user's own pick", () => {
  expect(keepDays("2026-11-02")).toEqual([
    { day: "2026-11-03", label: "Tomorrow" },
    { day: "2026-11-04", label: "Wednesday" },
    { day: "2026-11-06", label: "Friday" },
  ]);
});
