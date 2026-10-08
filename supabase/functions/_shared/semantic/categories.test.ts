// The closed taxonomy (Phase 4B, B1; brief §3): the categorization evals in
// evals/semantic/fixtures/categories.json, plus what categorization may never
// do. Placement can be wrong; it can never change, hide, link or lose a line,
// and nothing outside the closed set ever comes out.
import fixtures from "../../../../evals/semantic/fixtures/categories.json" with { type: "json" };
import { type Categorizable, CATEGORIES, type Category, categoryOf, SECTION_LABEL, SECTION_OF, type Section, sectionOf, SECTIONS } from "./categories.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

interface Case {
  id: string;
  tags: string[];
  title: string;
  item: {
    kind?: string; subject?: string; certainty?: string; user_state?: string; sensitivity?: string;
    statement: string; detail: Record<string, unknown> | null; with_person_ids?: string[];
  };
  quotes?: string[];
  category: Category;
  section: Section;
}
const CASES = fixtures.cases as unknown as Case[];

/** A memory as stored, with the fields categorization must never read or touch alongside. */
function memory(c: Case) {
  return {
    id: c.id, person_id: "p1", kind: c.item.kind ?? "fact", statement: c.item.statement, detail: c.item.detail,
    subject_type: c.item.subject ?? "person", certainty: c.item.certainty ?? "stated", user_state: c.item.user_state ?? "unreviewed",
    sensitivity: c.item.sensitivity ?? "none", status: "active", supersedes_id: null, with_person_ids: c.item.with_person_ids ?? [],
  };
}
function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object") {
    Object.values(v as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(v);
  }
  return v;
}

Deno.test("B1 evals: every case lands in its category and its section", () => {
  const wrong: string[] = [];
  for (const c of CASES) {
    const m = memory(c);
    const quotes = c.quotes ?? [c.item.statement];
    const got = [categoryOf(m, quotes), sectionOf(m, quotes)];
    if (got[0] !== c.category || got[1] !== c.section) wrong.push(`${c.id} ${c.title}: ${got.join("/")} (expected ${c.category}/${c.section})`);
  }
  if (wrong.length) throw new Error(`${wrong.length} misplaced:\n${wrong.join("\n")}`);
});

Deno.test("B1 evals: the founder's cases are all there", () => {
  const founder = CASES.filter((c) => c.tags.includes("founder")).map((c) => [c.item.statement, c.section]);
  eq(founder, [
    ["Susan wants to learn pottery", "hoping_to"],
    ["Susan loves pottery", "into"],
    ["Susan is going to Japan in March", "plans"],
    ["Susan graduated from Berkeley", "background"],
    ["Susan works at Meta", "background"],
    ["Michelle is Susan's sister", "their_people"],
    ["You and Susan take an annual ski trip together", "between_you"],
    ["Susan prefers red wine", "into"],
    ["Susan mentioned the thing with the fence", "background"],
    ["Ben loves carbonara", "into"],
    ["Ben plays basketball on Tuesdays", "into"],
    ["Ben Carter went fishing with Tom Carter", "background"],
  ]);
  // Work, education and residence stay distinct inside Background.
  eq(["cat-004", "cat-005", "cat-035"].map((id) => CASES.find((c) => c.id === id)!.category), ["education", "work", "residence"]);
});

Deno.test("B1: categorization never changes, hides or links a memory", () => {
  for (const c of CASES) {
    const m = deepFreeze(memory(c));
    const quotes = deepFreeze(c.quotes ?? [c.item.statement]);
    const before = JSON.stringify([m, quotes]);
    const category = categoryOf(m, quotes); // a frozen memory: any write would throw
    eq(JSON.stringify([m, quotes]), before, c.id);
    // Only a key from the closed set comes back: no words, no label, no person, no edge.
    eq(typeof category, "string", c.id);
    eq(CATEGORIES.includes(category), true, `${c.id} ${category}`);
  }
});

Deno.test("B1: placement never depends on sensitivity, status or supersession", () => {
  for (const c of CASES) {
    const base = categoryOf(memory(c), c.quotes ?? [c.item.statement]);
    for (const over of [{ sensitivity: "health" }, { sensitivity: "conflict" }, { status: "superseded", supersedes_id: "x" }, { status: "retracted" }]) {
      eq(categoryOf({ ...memory(c), ...over } as Categorizable, c.quotes ?? [c.item.statement]), base, `${c.id} ${JSON.stringify(over)}`);
    }
  }
});

Deno.test("B1: interests keep the user's words; nothing is generalised", () => {
  // The same words, whatever the dish or the sport: the category is the only output, and the line is untouched.
  for (const statement of ["Ben loves carbonara", "Ben loves cacio e pepe", "Ben plays basketball on Tuesdays", "Ben plays pickleball"]) {
    const m = deepFreeze({ kind: "fact", statement, detail: { category: "interest" } });
    eq(categoryOf(m, [statement]), "interest", statement);
    eq(m.statement, statement);
  }
});

Deno.test("B1: names never decide placement (no surname as family, no name as gender, no relative's relative)", () => {
  // Only the stored subject and the people the line is with decide Their people.
  const lines: [Categorizable, Category][] = [
    [{ kind: "fact", statement: "Ben Carter went fishing with Tom Carter", detail: { category: "other" } }, "other"],
    [{ kind: "fact", statement: "Alex is a nurse", detail: { category: "work" } }, "work"],
    [{ kind: "fact", statement: "Alexandra loves pottery", detail: { category: "interest" } }, "interest"],
    // A relative's relative is still only a line about their people; nothing here links anyone.
    [{ kind: "fact", subject_type: "related", statement: "Ben's sister's husband is a pilot", detail: { category: "family" } }, "their_people"],
  ];
  for (const [m, expected] of lines) eq(categoryOf(deepFreeze(m), [m.statement]), expected, m.statement);
});

Deno.test("B1: the closed set and its sections, in the page's order", () => {
  eq([...SECTIONS], ["background", "into", "hoping_to", "plans", "their_people", "between_you"]);
  eq(SECTIONS.map((s) => SECTION_LABEL[s]), ["Background", "Into", "Hoping to", "Plans", "Their people", "Between you"]);
  for (const c of CATEGORIES) eq(SECTIONS.includes(SECTION_OF[c]), true, c);
  eq(Object.keys(SECTION_OF).sort(), [...CATEGORIES].sort());
  // Every category the evals expect is used at least once.
  eq([...new Set(CASES.map((c) => c.category))].sort(), [...CATEGORIES].sort());
});

Deno.test("B1: a memory with nothing to go on lands in Background and never fails", () => {
  for (const m of [
    { kind: "fact", statement: "" },
    { kind: "", statement: "Something" },
    { kind: "fact", statement: "Ben", detail: null, subject_type: null, certainty: null, user_state: null, with_person_ids: null },
    { kind: "event", statement: "Ben's thing", detail: { event_type: 42, event_goal: { not: "a string" } } },
  ] as Categorizable[]) {
    eq(categoryOf(m), m.kind === "event" ? "plan" : "other", JSON.stringify(m));
  }
});
