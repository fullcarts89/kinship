// CMR-1 C1: a quote that appears more than once in the note no longer loses the line (founder device,
// 10 Nov 2026, K34/K35: every quote in a doubled spoken note appeared twice and both lines were dropped
// as evidence_ambiguous, "Nothing to remember"). Occurrences are told apart by grounded context, never
// guessed; what cannot be settled is recorded on the note as not understood (C2), never silently lost.
// Run: deno test supabase/functions
import { groundEvidence, groundQuotes, occurrencesOf } from "./ground.ts";
import { planExtraction } from "./pipeline.ts";
import { sliceCodePoints } from "../spans.ts";
import type { ExtractionInput, ModelProposal, ProposedItem } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ROSTER = [
  { key: "p1", id: "id-anna", display_name: "Anna", full_name: "Anna Reyes", nicknames: [], relationship_label: "friend" },
  { key: "p2", id: "id-beth", display_name: "Beth", full_name: "Beth Cole", nicknames: [], relationship_label: "friend" },
  { key: "p3", id: "id-kaiya", display_name: "Kaiya", full_name: null, nicknames: [], relationship_label: "daughter" },
];

function input(note: string, extra: Partial<ExtractionInput> = {}): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-11-10T20:00:00Z", time_zone: "America/Los_Angeles", context_person_key: null },
    roster: ROSTER,
    related: [],
    dossier: [],
    ...extra,
  };
}

function item(over: Partial<ProposedItem>): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: "Anna", subject: "person", related_relation: null, related_name: null,
    statement: "Anna loves hiking", evidence: ["She loves hiking"], certainty: "stated", sensitivity: "none", confidence: 0.92,
    date_text: null, date_direction: "future",
    detail: {
      event_type: null, event_goal: null, category: "interest", attribute: null, value: null, firmness: null, topic: null,
      place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
    },
    existing: { action: "new", target: null },
    ...over,
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[]) => planExtraction(inp, { items, needs_clarification: null } as ModelProposal);

// ─── The locator's rules, one by one ─────────────────────────────────────────

Deno.test("ground: one occurrence is placed as before; none is not found; an empty quote is empty", () => {
  eq(groundEvidence("Ben runs Chicago Sunday.", "runs Chicago"), { ok: true, span: { start: 4, end: 16 }, how: "unique" });
  eq(groundEvidence("Ben runs Chicago Sunday.", "runs Boston"), { ok: false, reason: "not_found", candidates: [] });
  eq(groundEvidence("Ben runs Chicago Sunday.", "  "), { ok: false, reason: "empty", candidates: [] });
  eq(occurrencesOf("Sam called. Later Sam texted.", "Sam"), [{ start: 0, end: 3 }, { start: 18, end: 21 }]);
});

Deno.test("ground (a): the same words said again in the same words are one fact, placed once, first", () => {
  const once = "Kaiya is the silliest little girl in the world. She is really into dressing up like princesses";
  // As iOS 18 sent it (K34): the whole passage twice, with no stop at the join.
  const doubled = `${once} ${once}`;
  const g = groundEvidence(doubled, "She is really into dressing up like princesses");
  ok(g.ok && g.how === "repeated", `repeated, got ${JSON.stringify(g)}`);
  if (g.ok) eq(sliceCodePoints(doubled, g.span), "She is really into dressing up like princesses");
  if (g.ok) eq(g.span.start, once.indexOf("She"), "the first occurrence");
  // The first words of the passage (nothing before the first occurrence) and the last (nothing after the second).
  const head = groundEvidence(doubled, "Kaiya is the silliest little girl in the world");
  ok(head.ok && head.span.start === 0, "the opening words, placed at the opening");
  const tail = groundEvidence(doubled, "dressing up like princesses");
  ok(tail.ok && tail.how === "repeated" && tail.span.start === once.indexOf("dressing"), `the closing words, placed in the first copy: ${JSON.stringify(tail)}`);
  // The whole note is one sentence twice: nothing around either occurrence, but the note repeats.
  const twice = groundEvidence("She loves hiking. She loves hiking.", "She loves hiking");
  eq(twice, { ok: true, span: { start: 0, end: 16 }, how: "repeated" });
});

Deno.test("ground (b): identical words about different people are told apart by who each is about", () => {
  const note = "Anna is great. She loves hiking. Beth is fun. She loves hiking.";
  const anna = groundEvidence(note, "She loves hiking", { personNames: ["Anna", "Anna Reyes"], otherNames: ["Beth", "Beth Cole"] });
  const beth = groundEvidence(note, "She loves hiking", { personNames: ["Beth", "Beth Cole"], otherNames: ["Anna", "Anna Reyes"] });
  eq(anna, { ok: true, span: { start: 15, end: 31 }, how: "person" }, "Anna's, after Anna");
  eq(beth, { ok: true, span: { start: 46, end: 62 }, how: "person" }, "Beth's, after Beth");
  // Named in the sentence itself.
  const named = "Anna loves hiking, honestly. Beth loves hiking, honestly.";
  eq(groundEvidence(named, "loves hiking, honestly", { personNames: ["Beth"], otherNames: ["Anna"] }), { ok: true, span: { start: 34, end: 56 }, how: "person" });
  // No name anywhere to tell them apart: ambiguous, with both places.
  eq(groundEvidence(note, "She loves hiking", { personNames: ["Mina"], otherNames: ["Anna", "Beth"] }).ok, false, "someone the note never names: no guess");
  eq(groundEvidence(note, "She loves hiking"), { ok: false, reason: "ambiguous", candidates: [{ start: 15, end: 31 }, { start: 46, end: 62 }] });
  // A pronoun is not a name to tell them apart by.
  eq(groundEvidence(note, "She loves hiking", { personNames: ["she"], otherNames: [] }).ok, false);
});

Deno.test("ground (b): the line's other quotes point at the occurrence beside them; a disagreement is never settled", () => {
  const note = "Anna is great. She loves hiking. Beth is fun. She loves hiking. Beth also bakes.";
  const q = groundQuotes(note, ["She loves hiking", "Beth also bakes"], { personNames: [], otherNames: [] });
  eq(q.spans, [{ start: 46, end: 62 }, { start: 64, end: 79 }], "the quote beside 'Beth also bakes'");
  // The second quote itself appears twice: it is taken beside the main one, never on its own.
  const second = groundQuotes(note, ["Beth also bakes", "She loves hiking"], { personNames: [], otherNames: [] });
  eq(second.spans, [{ start: 64, end: 79 }, { start: 46, end: 62 }]);
  // An anchor exactly between two occurrences ("Beth is fun.") points at neither.
  eq(groundEvidence(note, "She loves hiking", { anchors: [{ start: 33, end: 44 }] }).ok, false, "equidistant: no choice");
  // The other quote says the later sentence, the person says Anna: the rules disagree, so nothing is chosen.
  const torn = groundEvidence(note, "She loves hiking", { anchors: [{ start: 64, end: 79 }], personNames: ["Anna"], otherNames: ["Beth"] });
  eq(torn.ok, false, "never a guess when the clues disagree");
  // An anchor far from every occurrence points at nothing.
  const far = groundEvidence(`${"x ".repeat(200)}Sam. ${"y ".repeat(200)}Sam.`, "Sam", { anchors: [{ start: 0, end: 1 }] });
  eq(far.ok, false);
});

Deno.test("ground: the safeguards stand: a quote the note never says is not found, wherever the hint points", () => {
  eq(groundQuotes("Ben loves jazz.", ["Ben loves rock"], { personNames: ["Ben"], otherNames: [] }), { spans: [], drop: "no_evidence" });
  eq(groundQuotes("Ben loves jazz.", [], { personNames: ["Ben"], otherNames: [] }), { spans: [], drop: "no_evidence" });
  eq(groundQuotes("Ben loves jazz.", ["Ben loves jazz", "and plays chess"], { personNames: ["Ben"], otherNames: [] }).spans, [{ start: 0, end: 14 }], "a later quote that isn't there is ignored");
});

Deno.test("ground (b) before (a): two people's identical words in identical surroundings are two facts, each on its own words (PR #90 review)", () => {
  const who = (n: string) => `${n}, who is five and has been in kindergarten since September and loves her teacher Miss Lee a great deal, is really into dressing up like princesses.`;
  const note = `${who("Ann")} ${who("Bea")}`;
  const q = "is really into dressing up like princesses";
  const ann = groundEvidence(note, q, { personNames: ["Ann"], otherNames: ["Bea"] });
  const bea = groundEvidence(note, q, { personNames: ["Bea"], otherNames: ["Ann"] });
  ok(ann.ok && ann.how === "person" && ann.span.start === note.indexOf(q), `Ann's on Ann's sentence: ${JSON.stringify(ann)}`);
  ok(bea.ok && bea.how === "person" && bea.span.start === note.lastIndexOf(q), `Bea's on Bea's sentence: ${JSON.stringify(bea)}`);
  // With no one to tell them apart, the sentences name different people: not a repetition, never folded.
  // (The pipeline always hands over the roster's names; with none at all the sentences cannot be told apart.)
  eq(groundEvidence(note, q, { personNames: [], otherNames: ["Ann", "Bea"] }).ok, false, "two names, no clue: ambiguous, not 'repeated'");
  // The shorter shape: one empty side and one identical side used to pass as repetition.
  const short = "loves hiking, which is really lovely. Bea says she loves hiking, which is really lovely.";
  const first = groundEvidence(short, "loves hiking, which is really lovely", { personNames: ["Ann"], otherNames: ["Bea"] });
  const second = groundEvidence(short, "loves hiking, which is really lovely", { personNames: ["Bea"], otherNames: ["Ann"] });
  eq(first, { ok: true, span: { start: 0, end: 36 }, how: "person" }, "not Bea's words");
  eq(second, { ok: true, span: { start: 51, end: 87 }, how: "person" }, "Bea's words");
  eq(sliceCodePoints(short, { start: 51, end: 87 }), "loves hiking, which is really lovely");
  eq(groundEvidence(short, "loves hiking, which is really lovely", { personNames: [], otherNames: ["Bea"] }).ok, false, "a name in one sentence only: not a copy");
  // And through the pipeline: two lines, two sources, never Bea's memory on Ann's words.
  const out = run(input(note, { roster: [
    { key: "p1", id: "id-ann", display_name: "Ann", full_name: null, nicknames: [], relationship_label: "niece" },
    { key: "p2", id: "id-bea", display_name: "Bea", full_name: null, nicknames: [], relationship_label: "niece" },
  ] }), [
    item({ person: "p1", person_mention: "Ann", statement: "Ann is really into dressing up like princesses", evidence: [q], detail: { ...item({}).detail, category: "other" } }),
    item({ person: "p2", person_mention: "Bea", statement: "Bea is really into dressing up like princesses", evidence: [q], detail: { ...item({}).detail, category: "other" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.spans[0].start]), [["id-ann", note.indexOf(q)], ["id-bea", note.lastIndexOf(q)]]);
  eq(out.dropped, []);
});

Deno.test("ground (b): a name counts only in subject position, and a nickname's 'my' is nobody's name (PR #90 review)", () => {
  const note = "Ann is great. She loves hiking with my dog. Krystal is fun. She loves hiking with my dog and Ann.";
  const q = "She loves hiking with my dog";
  const krystal = groundEvidence(note, q, { personNames: ["Krystal", "my wife"], otherNames: ["Ann"] });
  const ann = groundEvidence(note, q, { personNames: ["Ann"], otherNames: ["Krystal", "my wife"] });
  eq(krystal, { ok: true, span: { start: 60, end: 88 }, how: "person" }, "Krystal's: 'my' is not her name, and Ann after the quote is not the subject");
  eq(ann, { ok: true, span: { start: 14, end: 42 }, how: "person" }, "Ann's: the one after Ann");
  const roster = [
    { key: "p4", id: "id-krystal", display_name: "Krystal", full_name: null, nicknames: ["my wife"], relationship_label: "wife" },
    { key: "p1", id: "id-ann", display_name: "Ann", full_name: null, nicknames: [], relationship_label: "niece" },
  ];
  const out = run(input(note, { roster }), [
    item({ person: "p4", person_mention: "Krystal", statement: "Krystal loves hiking with your dog", evidence: [q] }),
    item({ person: "p1", person_mention: "Ann", statement: "Ann loves hiking with your dog", evidence: [q] }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.spans[0].start]), [["id-krystal", 60], ["id-ann", 14]], "each memory's source is its own person's sentence");
});

// ─── Through the pipeline ────────────────────────────────────────────────────

const ONCE = "Kaiya is the silliest little girl in the world. She is really into dressing up like princesses";
const DOUBLED = `${ONCE} ${ONCE}`;
const kaiya = (statement: string, evidence: string[]) =>
  item({ person: "p3", person_mention: evidence[0].startsWith("She") ? "She" : "Kaiya", statement, evidence, confidence: 0.9, detail: { ...item({}).detail, category: "other" } });

Deno.test("K34/K35: a note said twice keeps each thing once, never two memories and never nothing", () => {
  const page = { capture: { ...input(DOUBLED).capture, context_person_key: "p3" } };
  const out = run(input(DOUBLED, page), [
    kaiya("Kaiya is the silliest little girl in the world", ["Kaiya is the silliest little girl in the world"]),
    kaiya("Kaiya is really into dressing up like princesses", ["She is really into dressing up like princesses"]),
  ]);
  ok(out.tier !== "nothing", `kept, not "nothing to remember": ${out.tier}`);
  eq(out.items.length, 2, "both lines");
  eq(out.dropped, [], "nothing dropped");
  eq(out.coverage, undefined, "the note is taken whole");
  for (const it of out.items) {
    eq(it.person_id, "id-kaiya");
    ok(it.spans.every((s) => s.end <= ONCE.length), `placed in the first copy: ${JSON.stringify(it.spans)}`);
  }
  // The model may propose each thing twice, once per copy: still one memory each.
  const twice = run(input(DOUBLED, page), [
    kaiya("Kaiya is the silliest little girl in the world", ["Kaiya is the silliest little girl in the world"]),
    kaiya("Kaiya is really into dressing up like princesses", ["She is really into dressing up like princesses"]),
    kaiya("Kaiya is the silliest little girl in the world", ["Kaiya is the silliest little girl in the world"]),
    kaiya("Kaiya is really into dressing up like princesses", ["She is really into dressing up like princesses"]),
  ]);
  eq(twice.items.length, 2, "one memory per thing");
  eq(twice.dropped.map((d) => d.reason), ["duplicate", "duplicate"], "the repeats are accounted for as repeats");
  eq(twice.coverage, undefined, "a repeat is not a loss");
});

Deno.test("K35 shape, every quote twice, told from no page: still each thing once", () => {
  const out = run(input(DOUBLED), [
    kaiya("Kaiya is the silliest little girl in the world", ["Kaiya is the silliest little girl in the world"]),
    kaiya("Kaiya is really into dressing up like princesses", ["She is really into dressing up like princesses"]),
  ]);
  ok(out.tier !== "nothing", `kept: ${out.tier}`);
  eq(out.items.length, 2);
  eq(out.dropped.filter((d) => d.reason === "evidence_ambiguous"), [], "no line lost to a repeated quote");
});

Deno.test("two people, the same words: each line lands on its own person's words", () => {
  const note = "Anna is great. She loves hiking. Beth is fun. She loves hiking.";
  const out = run(input(note), [
    item({ person: "p1", person_mention: "She", statement: "Anna loves hiking", evidence: ["She loves hiking"] }),
    item({ person: "p2", person_mention: "She", statement: "Beth loves hiking", evidence: ["She loves hiking"] }),
  ]);
  const anna = out.items.find((i) => i.person_id === "id-anna");
  const beth = out.items.find((i) => i.person_id === "id-beth");
  ok(anna && beth, `both kept: ${JSON.stringify(out.items.map((i) => [i.person_id, i.statement]))}`);
  eq(anna!.spans.map((s) => s.start), [15], "Anna's after Anna");
  eq(beth!.spans.map((s) => s.start), [46], "Beth's after Beth");
  // "Anna is great." and "Beth is fun." had no proposal, but are under the four-word floor of an aside: not reported.
  eq(out.coverage, undefined);
});

Deno.test("undecidable: the line is held back and its places are recorded as not understood, never guessed or silently dropped", () => {
  // "she" twice with no name before either, and different words after: not the same fact, not attributable.
  const note = "She loves hiking. Then dinner. She loves hiking, she said again.";
  const out = run(input(note), [item({ person: "p1", person_mention: "She", statement: "Anna loves hiking", evidence: ["She loves hiking"] })]);
  eq(out.items, [], "nothing saved on a guess");
  eq(out.dropped.map((d) => d.reason), ["evidence_ambiguous"]);
  eq(out.coverage, { unprocessed: [], unlocated: 0, not_understood: [{ start: 0, end: 16 }, { start: 31, end: 47 }] }, "both places, offsets only");
  ok(!JSON.stringify(out.coverage).includes("hiking"), "never words");
});

Deno.test("C2: a proposal whose words are not in the note is counted as unplaced; one excluded by a rule is not a loss", () => {
  const out = run(input("Anna loves hiking."), [
    item({ statement: "Anna loves climbing", evidence: ["Anna loves climbing"] }),
    item({ statement: "Anna's number is 555-123-4567", evidence: ["Anna loves hiking"] }),
  ]);
  eq(out.dropped.map((d) => d.reason).sort(), ["contact_detail", "no_evidence"]);
  eq(out.coverage, { unprocessed: [], unlocated: 1 }, "the unplaceable one counts; the contact detail is excluded by contract, not lost");
});

Deno.test("C2: a dropped proposal whose words were found is recorded at those words", () => {
  // The model quoted the note but wrote no line for it (a shape error): dropped as before, and now where.
  const note = "Anna loves hiking. Beth bakes.";
  const out = run(input(note), [
    item({ statement: "   ", evidence: ["Anna loves hiking"] }),
    item({ person: "p2", person_mention: "Beth", statement: "Beth bakes", evidence: ["Beth bakes"] }),
  ]);
  eq(out.dropped.map((d) => [d.reason, d.where]), [["bad_kind_subject", [{ start: 0, end: 17 }]]]);
  eq(out.items.map((i) => i.statement), ["Beth bakes"], "the other line is kept as ever");
  eq(out.coverage, { unprocessed: [], unlocated: 0, not_understood: [{ start: 0, end: 17 }] });
  eq(sliceCodePoints(note, out.coverage!.not_understood![0]), "Anna loves hiking");
});
