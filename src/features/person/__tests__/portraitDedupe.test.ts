// Phase 4B B7 (brief §13; founder CC-19): on the Portrait, one valid chain of
// residence lines takes one slot in Lately, as the most specific line's own
// statement, dated and ordered by the chain's newest member. Everything else
// on the Portrait is as it was. Pure: buildPortrait over plain items.
import { buildPortrait, type PortraitItem, residenceChains } from "@/features/person/portraitModel";
import type { MemoryItem, Person, ResidenceFacetRow } from "@/store/repositories";
import type { Candidate } from "../../../../supabase/functions/_shared/semantic/placeIndex";

const TODAY = "2026-10-16";
const susan: Person = { id: "susan", display_name: "Susan", state: "active" } as unknown as Person;

const US = "country:US";
const c = (ref: string, level: Candidate["level"], ...ancestors: string[]): Candidate => ({ ref, level, ancestors });
const P = {
  alameda: c("city:5322737", "city", "region:US.CA", US),
  oakland: c("city:5378538", "city", "region:US.CA", US),
  california: c("region:US.CA", "region", US),
  colorado: c("region:US.CO", "region", US),
  hollywoodFL: c("city:4158928", "city", "region:US.FL", US),
  hollywoodCA: c("city:9999999", "city", "region:US.CA", US),
};

function facet(id: string, words: string, cands: Candidate[], over: Partial<ResidenceFacetRow> = {}): ResidenceFacetRow {
  return {
    id: `f-${id}`, memory_item_id: id, slot: "residence", value_text: words, value_norm: words.toLowerCase(), place_ref: null,
    candidates: cands, usual_ref: cands.length === 1 ? cands[0].ref : null, decided_by: "rule", rule_version: "residence/v1", dataset_version: "places-2026.10",
    ...over,
  } as ResidenceFacetRow;
}

function item(id: string, statement: string, daysAgo: number, over: Partial<MemoryItem> = {}): MemoryItem {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return {
    id, kind: "fact", person_id: "susan", statement, detail: { category: "home" }, certainty: "stated", status: "active", user_state: "unreviewed",
    subject_type: "person", sensitivity: "none", with_person_ids: [], created_at: d.toISOString(), ...over,
  } as unknown as MemoryItem;
}

function line(it: MemoryItem, facet: ResidenceFacetRow | null = null, note = `n-${it.id}`): PortraitItem {
  return { item: it, provenance: `You told Kinship · ${String(it.created_at).slice(0, 10)}`, noteId: note, when: null, facet };
}

const build = (items: PortraitItem[]) => buildPortrait({ person: susan, items, today: TODAY });
const lately = (items: PortraitItem[]) => build(items).lately.map((l) => l.statement);

describe("B7: one residence chain, one slot in Lately (brief §13)", () => {
  const california = item("cal", "Susan lives in California", 40);
  const alameda = item("ala", "Susan lives in Alameda", 10);
  const chain = [line(california, facet("cal", "California", [P.california])), line(alameda, facet("ala", "Alameda", [P.alameda]))];

  it("shows the head's own statement once, never the composed wording, never the other member", () => {
    const p = build(chain);
    expect(p.lately.map((l) => l.statement)).toEqual(["Susan lives in Alameda"]);
    expect(JSON.stringify(p)).not.toMatch(/Lives in|California/u);
    // The head keeps its own provenance and note; nothing is counted or named.
    expect(p.lately[0]).toMatchObject({ itemId: "ala", noteId: "n-ala", provenance: "You told Kinship · 2026-10-06" });
    // The member that left the Portrait is still what Kinship knows: the page says more is there.
    expect(p.total).toBe(2);
    expect(p.more).toBe(true);
  });

  it("is dated and ordered by the chain's newest member: a recent California keeps the chain recent", () => {
    // Alameda told long ago, California last week: the head (Alameda) speaks, dated by California.
    const oldAlameda = item("ala", "Susan lives in Alameda", 200);
    const newCalifornia = item("cal", "Susan lives in California", 5);
    const pottery = item("pot", "Susan loves pottery", 20, { detail: { category: "interest" } });
    const items = [line(oldAlameda, facet("ala", "Alameda", [P.alameda])), line(newCalifornia, facet("cal", "California", [P.california])), line(pottery)];
    // Alameda on its own would be too old for Lately (120 days); as the chain's head it is recent, and before pottery.
    expect(lately(items)).toEqual(["Susan lives in Alameda", "Susan loves pottery"]);
    expect(lately([line(oldAlameda, facet("ala", "Alameda", [P.alameda])), line(pottery)])).toEqual(["Susan loves pottery"]);
  });

  it("orders the chain among other lines by its newest member", () => {
    const pottery = item("pot", "Susan loves pottery", 20, { detail: { category: "interest" } });
    const skiing = item("ski", "Susan took up skiing", 2, { detail: { category: "interest" } });
    // California (40 days) → Alameda (10 days): the chain sits between skiing (2) and pottery (20).
    expect(lately([...chain, line(pottery), line(skiing)])).toEqual(["Susan took up skiing", "Susan lives in Alameda", "Susan loves pottery"]);
    // A California told yesterday moves the chain to the top, still as Alameda's words.
    const fresh = item("cal", "Susan lives in California", 1);
    expect(lately([line(fresh, facet("cal", "California", [P.california])), line(alameda, facet("ala", "Alameda", [P.alameda])), line(pottery), line(skiing)]))
      .toEqual(["Susan lives in Alameda", "Susan took up skiing", "Susan loves pottery"]);
  });

  it("takes one slot: the chain counts once against Lately's three", () => {
    const a = item("a", "Susan loves pottery", 1, { detail: { category: "interest" } });
    const b = item("b", "Susan took up skiing", 2, { detail: { category: "interest" } });
    const c3 = item("c", "Susan is reading Middlemarch", 3, { detail: { category: "interest" } });
    // The chain is newest (Alameda 10 days ago, California 40) → no: a, b, c are newer; the chain is fourth and stays in What Kinship knows.
    expect(lately([...chain, line(a), line(b), line(c3)])).toEqual(["Susan loves pottery", "Susan took up skiing", "Susan is reading Middlemarch"]);
    // With the chain's newest member told today, it takes one of the three slots, as one line.
    const today = item("cal", "Susan lives in California", 0);
    const withToday = [line(today, facet("cal", "California", [P.california])), line(alameda, facet("ala", "Alameda", [P.alameda])), line(a), line(b), line(c3)];
    expect(lately(withToday)).toEqual(["Susan lives in Alameda", "Susan loves pottery", "Susan took up skiing"]);
  });

  it("the head is the most specific line, whichever was told first; three levels chain too", () => {
    const first = item("ala", "Susan lives in Alameda", 40);
    const later = item("cal", "Susan lives in California", 10);
    expect(lately([line(first, facet("ala", "Alameda", [P.alameda])), line(later, facet("cal", "California", [P.california]))])).toEqual(["Susan lives in Alameda"]);
    const us = item("us", "Susan lives in the US", 60);
    const usFacet = facet("us", "the US", [c(US, "country")]);
    expect(lately([...chain, line(us, usFacet)])).toEqual(["Susan lives in Alameda"]);
  });

  it("'was:' on the head stays (H23), as on any line", () => {
    const moved = { ...line(alameda, facet("ala", "Alameda", [P.alameda])), was: "Susan is moving to Alameda in August" };
    const p = build([chain[0], moved]);
    expect(p.lately).toEqual([expect.objectContaining({ statement: "Susan lives in Alameda", was: "Susan is moving to Alameda in August" })]);
  });
});

describe("B7: fail open (brief §13, §9 step 3)", () => {
  const california = item("cal", "Susan lives in California", 40);
  const alameda = item("ala", "Susan lives in Alameda", 10);

  it("one line shows as itself", () => {
    expect(lately([line(alameda, facet("ala", "Alameda", [P.alameda]))])).toEqual(["Susan lives in Alameda"]);
  });

  it("no reading on this phone: every line shows as today", () => {
    expect(lately([line(california), line(alameda)])).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    expect(lately([line(california, facet("cal", "California", [P.california])), line(alameda)])).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
  });

  it("a disjoint pair (the comparator's invariant broken) shows both lines, nothing merged, nothing dropped", () => {
    const colorado = item("col", "Susan lives in Colorado", 5);
    expect(lately([line(alameda, facet("ala", "Alameda", [P.alameda])), line(colorado, facet("col", "Colorado", [P.colorado]))]))
      .toEqual(["Susan lives in Colorado", "Susan lives in Alameda"]);
  });

  it("an ambiguous pair (two readings of a name) and an unknown place never chain", () => {
    const hollywood = item("hol", "Susan lives in Hollywood", 5);
    const two = facet("hol", "Hollywood", [P.hollywoodFL, P.hollywoodCA], { usual_ref: P.hollywoodFL.ref });
    expect(lately([line(california, facet("cal", "California", [P.california])), line(hollywood, two)])).toEqual(["Susan lives in Hollywood", "Susan lives in California"]);
    const bay = item("bay", "Susan lives in the Bay Area", 5);
    expect(lately([line(california, facet("cal", "California", [P.california])), line(bay, facet("bay", "the Bay Area", []))]))
      .toEqual(["Susan lives in the Bay Area", "Susan lives in California"]);
  });

  it("a broken chain among three: every line shows (fail open), none hidden", () => {
    const colorado = item("col", "Susan lives in Colorado", 5);
    const items = [line(california, facet("cal", "California", [P.california])), line(alameda, facet("ala", "Alameda", [P.alameda])), line(colorado, facet("col", "Colorado", [P.colorado]))];
    expect(lately(items)).toEqual(["Susan lives in Colorado", "Susan lives in Alameda", "Susan lives in California"]);
    expect(residenceChains(items)).toEqual({ heads: new Map(), hidden: new Set() });
  });

  it("never across people, subjects or shared lines; never a hedge, a superseded line or a sensitive one", () => {
    const cal = line(california, facet("cal", "California", [P.california]));
    const other = line(item("ala", "Dana lives in Alameda", 10, { person_id: "dana" }), facet("ala", "Alameda", [P.alameda]));
    expect(residenceChains([cal, other]).hidden.size).toBe(0);
    const sister = line(item("ala", "Susan's sister lives in Alameda", 10, { subject_type: "related", subject_related_id: "r1" }), facet("ala", "Alameda", [P.alameda]));
    expect(residenceChains([cal, sister]).hidden.size).toBe(0);
    const shared = line(item("ala", "Susan and Mike live in Alameda", 10, { with_person_ids: ["mike"] }), facet("ala", "Alameda", [P.alameda]));
    expect(residenceChains([cal, shared]).hidden.size).toBe(0);
    const hedge = line(item("ala", "Susan might be living in Alameda", 10, { certainty: "tentative" }), facet("ala", "Alameda", [P.alameda]));
    expect(residenceChains([cal, hedge]).hidden.size).toBe(0);
    const closed = line(item("ala", "Susan lives in Alameda", 10, { status: "superseded" }), facet("ala", "Alameda", [P.alameda]));
    expect(residenceChains([cal, closed]).hidden.size).toBe(0);
    const tombstoned = line(alameda, facet("ala", "Alameda", [P.alameda], { deleted_at: "2026-10-10T00:00:00Z" } as Partial<ResidenceFacetRow>));
    expect(residenceChains([cal, tombstoned]).hidden.size).toBe(0);
  });
});

describe("B7: nothing else on the Portrait changes", () => {
  it("Coming up, You said you'd and Between you are untouched by a chain in Lately", () => {
    const california = item("cal", "Susan lives in California", 40);
    const alameda = item("ala", "Susan lives in Alameda", 10);
    const plan = item("trip", "Susan is going to Japan in March", 3, { kind: "plan", detail: { date: "2027-03-10", date_precision: "month" } });
    const promise = item("pr", "Send Susan the recipe", 2, { kind: "promise", subject_type: "user", detail: {} });
    const tradition = item("tr", "You and Susan take an annual ski trip", 50, { kind: "tradition", subject_type: "shared", detail: {} });
    const p = build([
      line(california, facet("cal", "California", [P.california])), line(alameda, facet("ala", "Alameda", [P.alameda])),
      { ...line(plan), when: "March 2027" }, line(promise), line(tradition),
    ]);
    expect(p.lately.map((l) => l.statement)).toEqual(["Susan lives in Alameda"]);
    expect(p.comingUp.map((l) => l.statement)).toEqual(["Susan is going to Japan in March"]);
    expect(p.youSaid.map((l) => l.statement)).toEqual(["Send Susan the recipe"]);
    expect(p.between.map((l) => l.statement)).toEqual(["You and Susan take an annual ski trip"]);
  });
});
