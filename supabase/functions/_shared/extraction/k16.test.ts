// K15/K16/K17 (founder device check, 14 Oct): "Anthony and Sam love ice skating with Chris", with the
// founder's real People (Anthony, Anthony Lopez, Sam Eden, Sam Doughty, Chris), kept as several memories that
// linked their people differently. One sentence about one shared activity is one memory, whatever the
// model's wording, kind or full names; every person it names is on it or asked about; no one is lost.
// Shapes: the live model's own replies (14 Oct evening, the founder's roster) and the phone's.
// Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { resolveHeld, type HeldItem } from "./resolve.ts";
import type { ExtractionInput, ModelProposal, PlannedItem, ProposedItem, RosterPerson } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const person = (key: string, id: string, name: string): RosterPerson =>
  ({ key, id, display_name: name, full_name: null, nicknames: [], relationship_label: null });
const ROSTER = [
  person("p1", "anthony", "Anthony"), person("p2", "anthony-lopez", "Anthony Lopez"),
  person("p3", "sam-eden", "Sam Eden"), person("p4", "sam-doughty", "Sam Doughty"),
  person("p5", "chris", "Chris"), person("p6", "ben", "Ben"), person("p7", "john", "John"),
];
const K4 = "Anthony and Sam love ice skating with Chris";
const input = (): ExtractionInput => ({
  capture: { id: "c1", raw_text: K4, occurred_at: "2026-10-14T23:00:00Z", time_zone: "America/Los_Angeles", context_person_key: null },
  roster: ROSTER, related: [], dossier: [],
});
const NO_DETAIL = {
  event_type: null, event_goal: null, category: "interest", attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};
function piece(person: string, mention: string, statement: string, over: Partial<ProposedItem> = {}): ProposedItem {
  return {
    kind: "fact", person, person_mention: mention, subject: "person", related_relation: null, related_name: null,
    statement, evidence: [K4], certainty: "stated", sensitivity: "none", confidence: 0.9, date_text: null,
    date_direction: "unclear", existing: { action: "new", target: null }, detail: { ...NO_DETAIL } as ProposedItem["detail"], ...over,
  };
}
const peopleOf = () => ROSTER.map((p) => ({ id: p.id, display_name: p.display_name, state: "active" }));
const asHeld = (p: PlannedItem): HeldItem => JSON.parse(JSON.stringify(p)) as HeldItem;
const everyone = (i: { person_id: string | null; with_person_ids?: string[] | null }) => [i.person_id, ...(i.with_person_ids ?? [])].filter(Boolean).sort();

/** Run A as the founder answered: Anthony → Anthony Lopez, Sam → Sam Eden. */
function runA(items: PlannedItem[]) {
  const held = items.map((p) => asHeld({ ...p, tier: "hold" }));
  const answers = held.map((h, index) => {
    const open = (h.open_names ?? []).map((o) => ({ text: o.text, person_id: o.text === "Sam" ? "sam-eden" : "anthony-lopez" }));
    if (h.person_id) return { index, accept: true as const, ...(open.length ? { participants: open } : {}) };
    const who = h.mention === "Sam" ? "sam-eden" : "anthony-lopez";
    return { index, person_id: who, ...(open.length ? { participants: open } : {}) };
  });
  const r = resolveHeld(held, answers, { note: K4, people: peopleOf(), related: [], existing: [] });
  if ("fail" in r) throw new Error(r.fail);
  return r.items;
}

const SHAPES: [string, ProposedItem[]][] = [
  // 14 Oct evening, live, a fresh account with the founder's roster (1 of 5): the whole sentence on Chris, and
  // Anthony's piece leaving Sam out. Before the fix: two memories, Anthony's linked only to Chris (K16, K17).
  ["live: whole on Chris + Anthony's piece", [
    piece("p5", "Chris", K4),
    piece("p1", "Anthony", "Anthony loves ice skating with Chris"),
  ]],
  // 14 Oct evening, live (3 of 5): a piece each, filed by the model on a guessed Sam.
  ["live: a piece each, Sam guessed", [
    piece("p2", "Anthony", "Anthony loves ice skating with Chris"),
    piece("p4", "Sam", "Sam loves ice skating with Chris"),
    piece("p5", "Chris", "Chris goes ice skating with Anthony and Sam"),
  ]],
  // The phone (14 Oct): Chris's line naming both, a piece for Anthony by his whole name, one for Sam.
  ["phone: Anthony by his whole name", [
    piece("p5", "Chris", "Chris loves ice skating with Anthony and Sam"),
    piece("p2", "Anthony Lopez", "Anthony Lopez loves ice skating with Chris"),
    piece("p3", "Sam", "Sam loves ice skating with Chris"),
  ]],
  // The same with different kinds: a shared interest kept as context for one of them.
  ["kinds differ", [
    piece("p5", "Chris", "Chris loves ice skating with Anthony and Sam", { kind: "context", detail: { ...NO_DETAIL, category: null, aspect: "shared_interest" } as ProposedItem["detail"] }),
    piece("p2", "Anthony Lopez", "Anthony Lopez loves ice skating with Chris"),
    piece("p3", "Sam", "Sam loves ice skating with Chris"),
  ]],
];

for (const [label, items] of SHAPES) {
  Deno.test(`K16 (${label}): one line in the note's words; Anthony and Sam each asked once, joining it, never guessed`, () => {
    const out = planExtraction(input(), { items, needs_clarification: { about: "person", mention: "Anthony" } } as ModelProposal);
    const kept = out.items.filter((i) => i.tier !== "hold");
    const held = out.items.filter((i) => i.tier === "hold");
    // Either one line held whole (who it is about asked), or Chris's line kept and each other name a question joining it.
    if (kept.length) {
      eq(kept.map((i) => [i.person_id, i.statement]), [["chris", K4]], "one line, Chris's, in the note's words:");
      eq(held.map((h) => [h.mention, h.twin_person_id]).sort(), [["Anthony", "chris"], ["Sam", "chris"]], "each name asked once, joining it:");
    } else {
      eq(held.length, 1, "one line:");
      eq(everyone(held[0]).includes("chris") || (held[0].with_person_ids ?? []).includes("chris"), true, "Chris is never lost:");
    }
  });

  Deno.test(`K16/K17 (${label}), run A answered: one memory on Anthony Lopez, Sam Eden and Chris`, () => {
    const out = planExtraction(input(), { items, needs_clarification: { about: "person", mention: "Anthony" } } as ModelProposal);
    const saved = runA(out.items);
    eq(saved.length, 1);
    eq(everyone(saved[0]), ["anthony-lopez", "chris", "sam-eden"], "every page agrees:");
    eq(/ice skating/u.test(saved[0].statement), true);
  });
}
