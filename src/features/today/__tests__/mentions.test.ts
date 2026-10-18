// "You could mention" (founder K26, 17 Oct): a small deterministic preference, never
// the first rows of the page. The founder's own case: Susan's wedding "in the fall" is
// a talking point without a day; Fluffy's own line comes before a shared memory about
// ice skating when the hand-off is about Fluffy; nothing is offered when nothing is useful.
import { MENTION_OPENERS, MENTION_RULES, mentionsFor } from "@/features/today/mentions";
import type { MemoryItem, Person } from "@/store/repositories";

const TODAY = "2026-10-17";
const susan = { id: "susan", display_name: "Susan", state: "active" } as unknown as Person;
const chris = { id: "chris", display_name: "Chris", state: "active" } as unknown as Person;

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
const mention = (items: MemoryItem[], person = susan, about: MemoryItem | null = null) => mentionsFor({ items, person, today: TODAY, about });

describe("Susan and Pedro (the founder's case)", () => {
  it("a wedding this fall, with no day, is offered in the user's own words, with one clearly separate suggestion", () => {
    const w = wedding();
    expect(mention([w])).toEqual({ lines: ["Susan is getting married to Pedro in the fall"], opener: MENTION_OPENERS.wedding });
    expect(MENTION_OPENERS.wedding).toBe("You could ask how the wedding plans are going.");
    // The words are the line's own: no day, no "next week", nothing rewritten.
    expect(mention([w]).lines[0]).not.toMatch(/next week|Oct|2026/u);
  });

  it("a season that has passed is stale: last fall's wedding is not a talking point this fall", () => {
    const old = wedding({ created_at: "2025-08-20T12:00:00Z", detail: { milestone_type: "wedding", date: "2025-09-01", date_end: "2025-11-30", date_precision: "season" } });
    expect(mention([old])).toEqual({ lines: [], opener: null });
    // Just after its span, it still is (the grace of a month); well after, not.
    const ended = wedding({ detail: { milestone_type: "wedding", date: "2026-06-01", date_end: "2026-09-27", date_precision: "season" } });
    expect(mention([ended]).lines).toHaveLength(1);
    const longEnded = wedding({ detail: { milestone_type: "wedding", date: "2026-06-01", date_end: "2026-08-31", date_precision: "season" } });
    expect(mention([longEnded]).lines).toHaveLength(0);
  });

  it("the suggestion is only for a milestone still ahead; a wedding whose day has passed, or a plain fact, gets none", () => {
    const past = wedding({ detail: { milestone_type: "wedding", date: "2026-10-10", date_precision: "day" } });
    expect(mention([past]).opener).toBeNull();
    const ahead = wedding({ detail: { milestone_type: "wedding", date: "2026-10-25", date_precision: "day" } });
    expect(mention([ahead]).opener).toBe(MENTION_OPENERS.wedding);
    expect(mention([line({ statement: "Susan loves pottery" })]).opener).toBeNull();
  });
});

describe("Fluffy, and a shared memory about ice skating (the founder's screenshot)", () => {
  const fluffy = line({ person_id: "chris", statement: "Chris has a dog named Fluffy", created_at: "2026-10-13T12:00:00Z" });
  const skating = line({ person_id: "chris", statement: "Anthony and Sam love ice skating with Chris", with_person_ids: ["anthony", "sam"], created_at: "2026-10-14T12:00:00Z" });
  const vet = line({
    person_id: "chris", kind: "event", statement: "Chris' dog Fluffy has a vet appointment", created_at: "2026-10-13T12:00:00Z",
    detail: { date: "2026-10-16", date_precision: "day", event_type: "medical", followup_policy: "both" },
  });

  it("about the vet appointment, Fluffy's own line comes first, before a newer memory shared with other People", () => {
    expect(mention([fluffy, skating, vet], chris, vet).lines).toEqual(["Chris has a dog named Fluffy", "Anthony and Sam love ice skating with Chris"]);
    // With something of Chris's own to say, the shared memory is left out.
    const marathon = line({ person_id: "chris", statement: "Chris is training for a half marathon", created_at: "2026-10-01T12:00:00Z" });
    expect(mention([fluffy, skating, vet, marathon], chris, vet).lines).toEqual(["Chris has a dog named Fluffy", "Chris is training for a half marathon"]);
    // The Moment's own line is never repeated as a mention.
    expect(mention([fluffy, skating, vet], chris, vet).lines).not.toContain(vet.statement);
  });

  it("a shared memory comes first when it is what the hand-off is about, and is never split into claims about one person", () => {
    const went = line({ person_id: "chris", kind: "event", statement: "Chris went ice skating on Sunday", detail: { date: "2026-10-11", date_precision: "day" } });
    const out = mention([fluffy, skating, went], chris, went);
    expect(out.lines[0]).toBe("Anthony and Sam love ice skating with Chris");
  });

  it("with no Moment, what is going on or coming up comes before other facts, nearest day first", () => {
    const plan = line({ person_id: "chris", kind: "plan", statement: "Chris is going to Japan in November", detail: { date: "2026-11-05", date_precision: "day", firmness: "planned" }, created_at: "2026-09-01T12:00:00Z" });
    const thread = line({ person_id: "chris", kind: "thread", statement: "Chris is deciding whether to take the Denver job", created_at: "2026-10-15T12:00:00Z" });
    expect(mention([fluffy, skating, plan, thread], chris).lines).toEqual(["Chris is going to Japan in November", "Chris is deciding whether to take the Denver job"]);
  });
});

describe("what is never offered", () => {
  it("a sparse profile: nothing, rather than filler", () => {
    expect(mention([])).toEqual({ lines: [], opener: null });
    expect(mention([line({ person_id: "ben", statement: "Ben runs on Sundays" })])).toEqual({ lines: [], opener: null });
  });

  it("a sensitive line, however recent, is not a casual conversation starter", () => {
    const health = line({ statement: "Susan is waiting on biopsy results", sensitivity: "health", created_at: "2026-10-16T12:00:00Z" });
    expect(mention([health, wedding()]).lines).toEqual(["Susan is getting married to Pedro in the fall"]);
  });

  it("nothing retracted, superseded, expired or removed; never the user's own promise", () => {
    const gone = [
      line({ statement: "Susan lives in Alameda", status: "retracted", deleted_at: "2026-10-12T00:00:00Z" } as Partial<MemoryItem> & { statement: string }),
      line({ statement: "Susan lives in Oakland", status: "superseded" }),
      line({ statement: "Susan is interviewing at Stripe", kind: "thread", status: "resolved" }),
      line({ statement: "Susan's dinner party", kind: "event", status: "expired" }),
      line({ statement: "Help Susan hang shelves", kind: "promise", subject_type: "user" }),
    ];
    expect(mention(gone)).toEqual({ lines: [], opener: null });
  });

  it("a relative's line keeps its words: the person is never confused with their relative", () => {
    const sister = line({ statement: "Susan's sister lives in Alameda", subject_type: "related", subject_related_id: "rel-1" } as Partial<MemoryItem> & { statement: string });
    expect(mention([sister]).lines).toEqual(["Susan's sister lives in Alameda"]);
  });

  it("an old undated fact is no longer 'lately'; a dated event long past is not current; a day far ahead neither", () => {
    expect(mention([line({ statement: "Susan loves pottery", created_at: "2026-05-01T12:00:00Z" })]).lines).toEqual([]);
    expect(mention([line({ kind: "event", statement: "Susan ran a marathon", detail: { date: "2026-08-01", date_precision: "day" } })]).lines).toEqual([]);
    expect(mention([line({ kind: "event", statement: "Susan's reunion", detail: { date: "2027-06-01", date_precision: "day" } })]).lines).toEqual([]);
  });

  it(`at most ${MENTION_RULES.max}, and the same words once`, () => {
    const items = [line({ statement: "Susan loves pottery" }), line({ statement: "Susan loves pottery" }), line({ statement: "Susan took up climbing" }), line({ statement: "Susan grows tomatoes" })];
    const out = mention(items).lines;
    expect(out).toHaveLength(2);
    expect(new Set(out).size).toBe(2);
  });
});
