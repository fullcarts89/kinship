// SUA-1, the gesture line (FD-30d): one quiet fixed-template "You could…" line for a small set of
// grounded contexts, deterministic from the person's current lines; nothing for a sensitive line, a
// relative's, anyone paused or remembered, anything retracted or stale; nothing when the hand-off is a
// promise of the user's own; an interest only in the user's own words, only when a shared plan is being
// made. Zero is an answer.
import { OUTCOME_ASK, SUGGESTION_COPY, suggestionFor } from "@/features/today/suggestions";
import type { MemoryItem, Person } from "@/store/repositories";

const TODAY = "2026-10-17";
const susan = { id: "susan", display_name: "Susan", state: "active" } as unknown as Person;
const paused = { ...susan, state: "paused" } as unknown as Person;
const remembered = { ...susan, state: "remembered" } as unknown as Person;

let n = 0;
function line(over: Partial<MemoryItem> & { statement: string }): MemoryItem {
  n++;
  return {
    id: `m${n}`, kind: "fact", person_id: "susan", subject_type: "person", detail: {}, certainty: "stated", status: "active",
    sensitivity: "none", user_state: "unreviewed", origin: "extracted", created_at: "2026-10-10T12:00:00Z", ...over,
  } as unknown as MemoryItem;
}
const wedding = (over: Partial<MemoryItem> = {}) => line({
  kind: "milestone", statement: "Susan is getting married to Pedro in the fall", created_at: "2026-08-20T12:00:00Z",
  detail: { milestone_type: "wedding", date: "2026-09-01", date_end: "2026-11-30", date_precision: "season", season: "fall" }, ...over,
});
const move = line({ kind: "milestone", statement: "Susan is moving to Denver on October 30", detail: { milestone_type: "move", date: "2026-10-30", date_precision: "day" } });
const tasting = line({ kind: "event", statement: "Susan has a cake tasting on Thursday", detail: { date: "2026-10-22", date_precision: "day", event_type: "other", followup_policy: "none" } });
const promoted = line({ statement: "Susan got promoted", detail: { category: "work", date: "2026-10-15", date_precision: "day" }, created_at: "2026-10-16T12:00:00Z" });
const pottery = line({ statement: "Susan loves pottery", detail: { category: "interest", attribute: "hobby", value: "pottery" } });
const hike = line({ kind: "plan", statement: "You and Susan are planning a hike", subject_type: "shared", with_person_ids: ["susan"], detail: { firmness: "idea" } });
const promise = line({ kind: "promise", subject_type: "user", statement: "Help Susan hang shelves", detail: { due_date: TODAY } });

const suggest = (items: MemoryItem[], about: MemoryItem | null = null, person = susan, quotes?: (id: string) => string[]) =>
  suggestionFor({ items, person, today: TODAY, about, quotes });

describe("the contexts, each one fixed template", () => {
  it("a milestone or celebration ahead: a plan; a move, a new home or a baby: help", () => {
    expect(suggest([wedding()])).toEqual({ kind: "plan", text: SUGGESTION_COPY.plan, outcomeAsk: OUTCOME_ASK.plan });
    expect(suggest([move])).toEqual({ kind: "help", text: SUGGESTION_COPY.help, outcomeAsk: OUTCOME_ASK.help });
    expect(SUGGESTION_COPY.plan).toBe("You could invite them to dinner.");
    expect(SUGGESTION_COPY.help).toBe("You could offer to help.");
    // A wedding whose day has passed is not ahead.
    expect(suggest([wedding({ detail: { milestone_type: "wedding", date: "2026-10-10", date_precision: "day" } })])).toBeNull();
  });

  it("an event ahead the user knows about: company; good news: a note", () => {
    expect(suggest([tasting])).toEqual({ kind: "company", text: "You could ask if they'd like company.", outcomeAsk: "Did you ask if they'd like company?" });
    expect(suggest([promoted])).toEqual({ kind: "note", text: "You could send a note.", outcomeAsk: "Did you send a note?" });
    // An event that already happened is no occasion for company; a negation is no good news.
    expect(suggest([line({ kind: "event", statement: "Susan ran a race", detail: { date: "2026-10-11", date_precision: "day" } })])).toBeNull();
    expect(suggest([line({ statement: "Susan didn't get promoted", detail: { date: "2026-10-15", date_precision: "day" } })])).toBeNull();
  });

  it("what the hand-off is about decides first; else the nearest day; one line, never a list", () => {
    expect(suggest([wedding(), tasting, promoted], promoted)?.kind).toBe("note");
    expect(suggest([wedding(), tasting, promoted], tasting)?.kind).toBe("company");
    // With no Moment: the nearest day first: the news (two days ago) before the tasting (five days off) and the wedding (a season).
    expect(suggest([wedding(), tasting, promoted])?.kind).toBe("note");
    expect(suggest([wedding(), tasting])?.kind).toBe("company");
    const tomorrow = line({ kind: "event", statement: "Susan has a cake tasting tomorrow", detail: { date: "2026-10-18", date_precision: "day" } });
    expect(suggest([wedding(), tomorrow, promoted])?.kind).toBe("company");
  });

  it("an interest of theirs, in the user's own words, only when a shared plan is being made", () => {
    const quotes = (id: string) => (id === pottery.id ? ["Susan loves pottery and goes to a studio on Thursdays"] : []);
    expect(suggest([pottery, hike], hike, susan, quotes)).toEqual({ kind: "activity", text: "You could suggest doing pottery together.", outcomeAsk: "Did you make a plan?" });
    // Not without the note's own words behind it; not from Kinship's wording alone; not when the plan is theirs alone.
    expect(suggest([pottery, hike], hike, susan, () => [])).toBeNull();
    expect(suggest([pottery, hike], hike)).toBeNull();
    const theirPlan = line({ kind: "plan", statement: "Susan is planning a hike", detail: { firmness: "idea" } });
    expect(suggest([pottery, theirPlan], theirPlan, susan, quotes)).toBeNull();
    // Not a long or capitalised value (a name, a sentence); not a category that isn't an interest.
    const long = line({ statement: "Susan loves pottery", detail: { category: "interest", value: "making very large stoneware pots and bowls" } });
    expect(suggest([long, hike], hike, susan, () => ["Susan loves making very large stoneware pots and bowls"])).toBeNull();
    const work = line({ statement: "Susan works at Meta", detail: { category: "work", value: "meta" } });
    expect(suggest([work, hike], hike, susan, () => ["Susan works at meta"])).toBeNull();
  });
});

describe("what is never suggested", () => {
  it("nothing for a promise of the user's own: the promise is the action", () => {
    expect(suggest([promise, wedding()], promise)).toBeNull();
  });

  it("nothing sensitive, by label or by wording; nothing about a relative", () => {
    expect(suggest([line({ kind: "event", statement: "Susan has a scan on Thursday", sensitivity: "health", detail: { date: "2026-10-22", date_precision: "day" } })])).toBeNull();
    expect(suggest([line({ kind: "event", statement: "Susan's surgery is Thursday", detail: { date: "2026-10-22", date_precision: "day" } })])).toBeNull();
    expect(suggest([line({ kind: "milestone", statement: "Susan's sister is getting married in the fall", subject_type: "related", detail: { milestone_type: "wedding" } })])).toBeNull();
    expect(suggest([wedding({ sensitivity: "conflict" })])).toBeNull();
    // A sensitive Moment gets no line under it either.
    const scan = line({ kind: "event", statement: "Susan has a scan on Thursday", sensitivity: "health", detail: { date: "2026-10-22", date_precision: "day" } });
    expect(suggest([scan, wedding()], scan)).toBeNull();
  });

  it("no one remembered or paused; nothing retracted, superseded, expired or stale", () => {
    expect(suggest([wedding()], null, paused)).toBeNull();
    expect(suggest([wedding()], null, remembered)).toBeNull();
    expect(suggest([wedding({ status: "retracted", deleted_at: "2026-10-12T00:00:00Z" } as Partial<MemoryItem>)])).toBeNull();
    expect(suggest([wedding({ status: "superseded" })])).toBeNull();
    expect(suggest([wedding({ status: "expired" })])).toBeNull();
    expect(suggest([line({ statement: "Susan got promoted", created_at: "2026-03-01T12:00:00Z" })])).toBeNull();
  });

  it("a sparse profile: nothing, rather than filler", () => {
    expect(suggest([])).toBeNull();
    expect(suggest([line({ statement: "Susan lives in Alameda" })])).toBeNull();
  });
});
