// Natural stories (CER-1; issue #63, founder device 30 Oct 2026). A person says a name once and then
// uses pronouns; their relatives, their pets and the user's own pet are mentioned as objects. Each test
// hands the pipeline the shapes the live model actually gave (evals/narrative, 30 Oct) and the shapes
// that produced the founder's "Who is 'he'?" (the model unsure of the person), and checks: the same
// subject, no gratuitous question, genuine ambiguity still asked, the family and pet filed as what they
// are. Run: deno test supabase/functions
import { planExtraction } from "./pipeline.ts";
import { passagesOf, LONG_NOTE_CHARS, PASSAGE_CHARS } from "./run.ts";
import { sliceCodePoints } from "../spans.ts";
import type { ExtractionInput, ModelProposal, ProposedItem, RosterPerson } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ROSTER: RosterPerson[] = [
  { key: "p1", id: "pablo", display_name: "Pablo", full_name: "Pablo Reyes", nicknames: [], relationship_label: "friend" },
  { key: "p2", id: "leo", display_name: "Leo", full_name: "Leo Marchetti", nicknames: [], relationship_label: "friend" },
  { key: "p3", id: "marin", display_name: "Marin", full_name: "Marin Castillo", nicknames: [], relationship_label: "college friend" },
  { key: "p4", id: "elise", display_name: "Elise", full_name: "Elise Nakamura", nicknames: [], relationship_label: "college friend" },
  { key: "p5", id: "jun", display_name: "Jun", full_name: "Jun Okafor", nicknames: [], relationship_label: null },
];

function input(note: string, page: string | null = null, extra: Partial<ExtractionInput> = {}): ExtractionInput {
  return {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-10-30T18:00:00Z", time_zone: "America/Los_Angeles", context_person_key: page },
    roster: ROSTER,
    related: [],
    dossier: [],
    ...extra,
  };
}

function item(over: Partial<ProposedItem>): ProposedItem {
  return {
    kind: "fact", person: "p1", person_mention: "Pablo", subject: "person", related_relation: null, related_name: null,
    statement: "Pablo loves cooking", evidence: ["Pablo loves cooking"], certainty: "stated", sensitivity: "none", confidence: 0.9,
    date_text: null, date_direction: "unclear",
    detail: { event_type: null, event_goal: null, category: "interest", attribute: null, value: null, firmness: null, topic: null, place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null },
    existing: { action: "new", target: null },
    ...over,
  };
}
const run = (inp: ExtractionInput, items: ProposedItem[], asked: ModelProposal["needs_clarification"] = null) =>
  planExtraction(inp, { items, needs_clarification: asked } as ModelProposal);

// ─── #63: the founder's story about one person, their family and their dog ────

const PABLO = "Pablo loves cooking, sleeping in, reading, and going to electronic music shows. He is close with his mom and sister and sees them often. He has a pet dog named Rocket who dislikes unfamiliar dogs but gets along with our dog Bean. He is worried about changes at work.";

/** The live model's shape (30 Oct, evals/narrative s63): every pronoun line filed on Pablo. */
const pabloItems = (person: string) => [
  item({ person: "p1", person_mention: "Pablo", statement: "Pablo loves cooking, sleeping in, reading, and going to electronic music shows", evidence: ["Pablo loves cooking, sleeping in, reading, and going to electronic music shows"] }),
  item({ person, person_mention: "He", statement: "Pablo is close with his mom and sister and sees them often", evidence: ["He is close with his mom and sister and sees them often"], detail: { ...item({}).detail, category: "family" } }),
  item({ person, person_mention: "He", statement: "Pablo has a dog named Rocket who dislikes unfamiliar dogs but gets along with your dog Bean", evidence: ["He has a pet dog named Rocket who dislikes unfamiliar dogs but gets along with our dog Bean"], detail: { ...item({}).detail, category: "pet" } }),
  item({ kind: "thread", person, person_mention: "He", statement: "Pablo is worried about changes at work", evidence: ["He is worried about changes at work"], confidence: 0.8, detail: { ...item({}).detail, category: null, topic: "changes at work" } }),
];

Deno.test("#63: a natural story about one person files every 'he' on them, on their page and from a general Tell, whatever the model made of the pronoun", () => {
  for (const page of ["p1", null]) {
    for (const person of ["p1", "unknown", "p2"]) {
      const out = run(input(PABLO, page), pabloItems(person));
      eq(out.items.length, 4, `${page ?? "general"} / model ${person}: four lines`);
      eq(out.items.map((i) => i.person_id), ["pablo", "pablo", "pablo", "pablo"], `${page ?? "general"} / model ${person}`);
      eq(out.items.some((i) => i.tier === "hold"), false, `${page ?? "general"} / model ${person}: no question`);
      eq(out.clarification, null);
      eq(out.items.some((i) => i.flags.includes("pronoun_multiple") || i.flags.includes("person_ambiguous")), false);
    }
  }
});

Deno.test("#63: the model's own 'who is he?' is not confirmed when the note names one person before the pronoun", () => {
  const out = run(input(PABLO, null), pabloItems("unknown"), { about: "person", mention: "he" });
  eq(out.items.map((i) => i.person_id), ["pablo", "pablo", "pablo", "pablo"]);
  eq(out.clarification, null);
});

Deno.test("#63: the dog is Pablo's related someone, never a person; his mom and sister are his family, never who 'he' means", () => {
  const out = run(input(PABLO, "p1"), pabloItems("p1"));
  const dog = out.items[2];
  eq([dog.person_id, dog.related?.relation, dog.related?.name], ["pablo", "dog", "Rocket"]);
  eq(out.items.filter((i) => i.new_person_name).length, 0, "Rocket and Bean are never 'someone new'");
  eq(out.items[1].subject_type, "person");
});

Deno.test("#63: the same story about Leo, with 'His dog' and a lower-case 'he's', from Leo's page and from nowhere", () => {
  const note = "Leo is really into cooking and electronic music shows. He sees his mom and sister most weekends, and they're close. His dog Rocket gets nervous around unfamiliar dogs but gets along with our dog Bean. Lately he's worried about changes in his industry.";
  const items = (person: string) => [
    item({ person: "p2", person_mention: "Leo", statement: "Leo is really into cooking and electronic music shows", evidence: ["Leo is really into cooking and electronic music shows"] }),
    item({ person, person_mention: "He", statement: "Leo sees his mom and sister most weekends, and they're close", evidence: ["He sees his mom and sister most weekends, and they're close"], detail: { ...item({}).detail, category: "family" } }),
    item({ person, person_mention: "His", statement: "Leo's dog Rocket gets nervous around unfamiliar dogs but gets along with your dog Bean", evidence: ["His dog Rocket gets nervous around unfamiliar dogs but gets along with our dog Bean"], detail: { ...item({}).detail, category: "pet" } }),
    item({ kind: "thread", person, person_mention: "he", statement: "Leo is worried about changes in his industry", evidence: ["he's worried about changes in his industry"], confidence: 0.8, detail: { ...item({}).detail, category: null, topic: "changes in his industry" } }),
  ];
  for (const page of ["p2", null]) {
    for (const person of ["p2", "unknown"]) {
      const out = run(input(note, page), items(person));
      eq(out.items.map((i) => [i.person_id, i.tier === "hold"]), [["leo", false], ["leo", false], ["leo", false], ["leo", false]], `${page ?? "general"} / ${person}`);
    }
  }
});

// ─── What still asks ──────────────────────────────────────────────────────────

Deno.test("two people named before 'she' still ask (Marin and Elise went camping. She misplaced her keys.)", () => {
  const note = "Marin and Elise went camping last weekend. She misplaced her keys along the trail, but Elise found them back in the car.";
  const out = run(input(note, "p3"), [
    item({ kind: "event", person: "p3", person_mention: "Marin", statement: "Marin went camping with Elise last weekend", evidence: ["Marin and Elise went camping last weekend"], date_text: "last weekend", date_direction: "past", detail: { ...item({}).detail, category: null, event_type: "trip" } }),
    item({ person: "p3", person_mention: "She", statement: "Marin misplaced her keys along the trail", evidence: ["She misplaced her keys along the trail"], confidence: 0.6, detail: { ...item({}).detail, category: "other" } }),
  ]);
  const keys = out.items.find((i) => i.statement.includes("keys"))!;
  eq([keys.tier, keys.candidate_ids], ["hold", ["marin", "elise"]], "genuinely ambiguous: asked, both offered");
});

Deno.test("someone the writer introduces by name or relation before 'he' still asks (J1 stands)", () => {
  for (const [note, person] of [["Zed told me he loves Susan.", "p2"], ["My friend visited. He loves Susan.", "unknown"], ["Our neighbor came by. He loves Susan.", "unknown"]] as const) {
    const quote = note.match(/[Hh]e loves Susan/)![0];
    const out = run(input(note, "p1"), [item({ person, person_mention: quote.slice(0, 2), statement: "He loves Susan", evidence: [quote], detail: { ...item({}).detail, category: "family" } })]);
    eq(out.items.map((i) => i.tier), ["hold"], note);
  }
});

Deno.test("a relative of the other gender, a pet, an acronym, a place or a word also written in lower case before 'he' is no one else", () => {
  for (const note of [
    "Pablo saw his mom on Sunday. He was glad.",
    "Pablo's sister visited. He was glad.",
    "Pablo got a dog named Rocket. He is thrilled.",
    "Pablo's cat Miso is twelve. He is worried about her.",
    "Pablo works in AI. He is worried about work.",
    "Pablo moved to Denver in June. He is happy there.",
    "Pablo's work has been slow. Work is slow for everyone. He is worried.",
  ]) {
    const quote = note.match(/He [^.]+/)![0];
    const out = run(input(note, null), [
      item({ person: "p1", person_mention: "Pablo", statement: note.split(". ")[0], evidence: [note.split(". ")[0]] }),
      item({ kind: "thread", person: "unknown", person_mention: "He", statement: `Pablo ${quote.slice(3)}`, evidence: [quote], confidence: 0.8, detail: { ...item({}).detail, category: null, topic: "mood" } }),
    ]);
    const he = out.items.find((i) => i.spans[0].quote === quote);
    ok(he, `${note}: the pronoun line is kept`);
    eq([he!.person_id, he!.tier === "hold"], ["pablo", false], note);
  }
});

Deno.test("a brother or a friend of the writer before 'he' still asks; a sister before 'he' does not; a brother before 'she' does not", () => {
  const he = run(input("Pablo and my brother went fishing. He caught nothing.", null), [
    item({ kind: "moment", person: "unknown", person_mention: "He", statement: "Pablo caught nothing", evidence: ["He caught nothing"], confidence: 0.7, detail: { ...item({}).detail, category: null } }),
  ]);
  eq(he.items.map((i) => i.tier), ["hold"], "my brother could be 'he'");
  const she = run(input("Marin and my brother went fishing. She caught nothing.", null), [
    item({ kind: "moment", person: "unknown", person_mention: "She", statement: "Marin caught nothing", evidence: ["She caught nothing"], confidence: 0.7, detail: { ...item({}).detail, category: null } }),
  ]);
  eq(she.items.map((i) => [i.person_id, i.tier === "hold"]), [["marin", false]], "my brother is never 'she'");
});

Deno.test("the model saying someone new is meant is still asked, unless the note names no one else", () => {
  const out = run(input("He loves Susan.", null), [item({ person: "new", person_mention: "He", statement: "He loves Susan", evidence: ["He loves Susan"] })]);
  eq(out.items.map((i) => i.tier), ["hold"]);
  const page = run(input(PABLO, "p1"), pabloItems("new"));
  eq(page.items.filter((i) => i.tier === "hold").length, 3, "'new' on a page: asked, as before (the model says someone not in People is meant)");
});

// ─── Shapes from the three-passage live run (30 Oct, evals/narrative s13) ────

Deno.test("'His sister Carla is getting married' is Leo's related sister Carla, never 'Is His sister Carla someone new?'", () => {
  const note = "Leo had a lot going on. His sister Carla is getting married in June and asked him to give a toast.";
  const out = run(input(note, "p2"), [
    item({ kind: "event", person: "p2", person_mention: "His sister Carla", subject: "related", related_relation: "sister", related_name: "Carla",
      statement: "Leo's sister Carla is getting married in June", evidence: ["His sister Carla is getting married in June"], date_text: "June", date_direction: "future",
      detail: { ...item({}).detail, category: null, event_type: "wedding" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.subject_type, i.related?.relation, i.related?.name, i.new_person_name ?? null]), [["leo", "related", "sister", "Carla", null]]);
  eq(out.items[0].flags.includes("new_person"), false);
  eq(out.clarification?.about === "new_person", false);
});

Deno.test("a mention the model padded past the pronoun ('he loves', 'he's') is the pronoun, never a name to ask about", () => {
  const note = "Leo's birthday is December 3, he wants to do dinner at that Ethiopian place he loves.";
  const out = run(input(note, null), [
    item({ person: "p2", person_mention: "Leo's", statement: "Leo's birthday is December 3", evidence: ["Leo's birthday is December 3"], date_text: "December 3", detail: { ...item({}).detail, category: "other" } }),
    item({ person: "p2", person_mention: "he loves", statement: "Leo loves an Ethiopian place", evidence: ["that Ethiopian place he loves"], confidence: 0.7, detail: { ...item({}).detail, category: "preference" } }),
  ]);
  eq(out.items.map((i) => [i.person_id, i.tier === "hold"]), [["leo", false], ["leo", false]]);
  eq(out.clarification, null);
});

// ─── Long notes: the passages ─────────────────────────────────────────────────

Deno.test("a note up to the long-note length is one passage; a longer one splits on sentences near the passage size, covering every character", () => {
  const short = "Mina collects records, loves jazz, is learning Portuguese and plays chess on Thursdays.";
  eq(passagesOf(short), [{ start: 0, end: Array.from(short).length }]);
  const sentences = Array.from({ length: 40 }, (_, i) => `Mina told me thing number ${i + 1} about her week and it was worth remembering.`);
  const long = sentences.join(" ");
  ok(long.length > LONG_NOTE_CHARS, "the fixture is long");
  const passages = passagesOf(long);
  ok(passages.length >= 6, `several passages (${passages.length})`);
  eq(passages[0].start, 0);
  eq(passages.at(-1)!.end, Array.from(long).length);
  for (let i = 1; i < passages.length; i++) eq(passages[i].start, passages[i - 1].end, "contiguous");
  for (const p of passages) {
    const words = sliceCodePoints(long, p);
    ok(/^Mina told me/.test(words.trim()), `starts on a sentence: ${words.slice(0, 30)}`);
    ok(/remembering\.\s*$/.test(words), `ends on a sentence: ${words.slice(-30)}`);
    ok(words.length <= PASSAGE_CHARS + 100, `about the passage size (${words.length})`);
  }
});

Deno.test("passages count code points: an emoji before the split does not shift the spans", () => {
  const note = `🎉 ${Array.from({ length: 30 }, (_, i) => `Jun baked loaf number ${i + 1} and it rose this time.`).join(" ")}`;
  const passages = passagesOf(note);
  ok(passages.length > 1, "split");
  for (const p of passages) ok(/^(🎉 )?Jun baked/.test(sliceCodePoints(note, p).trim()), "each passage starts on a sentence");
});
