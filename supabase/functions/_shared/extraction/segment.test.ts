// Spoken sentences of an unpunctuated transcript (CMR-1 C; the CMR-1 eval's voice notes se-002, se-011,
// vl-004, vl-006). Conservative: punctuated text and short notes are one sentence as before.
// Run: deno test supabase/functions
import { isSpokenRun, spokenSentenceAt, spokenSentences } from "./segment.ts";
import { sentenceAround } from "./lexicon.ts";
import { planExtraction } from "./pipeline.ts";
import type { ExtractionInput, ModelProposal, ProposedItem } from "./types.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
const texts = (text: string, names: string[] = []) => spokenSentences(text, names).map((s) => text.slice(s.start, s.end));

Deno.test("segment: a transcript with no punctuation is cut where a new subject begins", () => {
  // se-002
  eq(texts("seun's dad passed away on sunday the funeral is next saturday in houston he's flying out tomorrow i want to send flowers", ["Seun"]), [
    "seun's dad passed away on sunday the funeral is next saturday in houston",
    "he's flying out tomorrow",
    "i want to send flowers",
  ]);
  // se-011
  eq(texts("amara's husband had a stroke on monday he's stable now shes at the hospital most days i told her not to worry about the review", ["Amara"]), [
    "amara's husband had a stroke on monday",
    "he's stable now",
    "shes at the hospital most days",
    "i told her not to worry about the review",
  ]);
});

Deno.test("segment: a coordinator starts a sentence only before a subject; a pair of names is one subject or one object", () => {
  // vl-004, shortened.
  const note = "nana is moving to the ground floor flat december first mark and will are doing the heavy lifting and i said id take the boxes of books to her new place on the saturday after so december fifth um toby has a soccer tournament on the twenty first in albany and grace asked if we could come and i said we would try";
  eq(texts(note, ["Nana", "Mark", "Will", "Toby", "Grace"]), [
    "nana is moving to the ground floor flat december first mark and will are doing the heavy lifting",
    "and i said id take the boxes of books to her new place on the saturday after so december fifth",
    "um toby has a soccer tournament on the twenty first in albany",
    "and grace asked if we could come",
    "and i said we would try",
  ]);
  // vl-006, shortened: "i said id cover" is its own sentence, so whose promise it is can be read from it.
  const work = "amara is dropping to four days from december and wants fridays for her book i said id cover her vendor calls on fridays which is fine honestly";
  eq(texts(work, ["Amara"]), [
    "amara is dropping to four days from december and wants fridays for her book",
    "i said id cover her vendor calls on fridays which is fine honestly",
  ]);
  // Spoken shorthand drops the speaker: the "i" that follows is the same speaker, not a new sentence (CMR-1 eval cm-003).
  eq(texts("promised tomasz the revised proposal by wednesday and i need to loop in keiko on the pricing before then", ["Tomasz", "Keiko"]).length, 1);
  // Never between a verb and its object, never after a word that binds the pronoun to its clause.
  eq(texts("i told ben and sarah that i would come and that we should bring the kids along too this time", ["Ben", "Sarah"]).length, 1);
  eq(texts("she said she loves hiking because it clears her head and i think that is lovely to hear from her", []), [
    "she said she loves hiking because it clears her head",
    "and i think that is lovely to hear from her",
  ]);
});

Deno.test("segment: punctuated text, a short note and a quoted phrase are left alone", () => {
  const typed = "I got the job and I'm moving to Austin";
  eq(isSpokenRun(typed), false, "a short note is one sentence");
  eq(texts(typed), [typed]);
  const punctuated = "Seun's dad passed away on Sunday. The funeral is next Saturday in Houston, he's flying out tomorrow and I want to send flowers.";
  eq(isSpokenRun(punctuated), false);
  eq(texts(punctuated, ["Seun"]), [punctuated.slice(0, punctuated.length - 1)]);
  eq(sentenceAround(punctuated, 0, 5), "Seun's dad passed away on Sunday.", "the punctuated sentence helper is unchanged");
  const quoted = 'ben told me "and i quote she said we should all come on sunday" which was very him and then he left early as usual for the gym';
  const parts = texts(quoted, ["Ben"]);
  eq(parts.some((p) => p.startsWith("and i quote") || p.startsWith("she said we")), false, "nothing cut inside the quote");
  eq(parts.at(-1), "and then he left early as usual for the gym");
});

Deno.test("segment: the sentence helpers read a spoken run by its spoken sentences", () => {
  const note = "amara's husband had a stroke on monday he's stable now shes at the hospital most days i told her not to worry about the review";
  const at = note.indexOf("i told her");
  eq(sentenceAround(note, at, at + 10, ["Amara"]), "i told her not to worry about the review");
  eq(spokenSentenceAt(note, 0, 5, ["Amara"]), { start: 0, end: "amara's husband had a stroke on monday".length });
  // Through the pipeline: the line is kept or held on its own sentence (who "shes" is stays Workstream B's rule).
  const ROSTER = [{ key: "p1", id: "id-amara", display_name: "Amara", full_name: null, nicknames: [], relationship_label: "colleague" }];
  const input: ExtractionInput = {
    capture: { id: "c1", raw_text: note, occurred_at: "2026-11-10T20:00:00Z", time_zone: "America/Los_Angeles", context_person_key: null },
    roster: ROSTER, related: [], dossier: [],
  };
  const item: ProposedItem = {
    kind: "fact", person: "p1", person_mention: "shes", subject: "person", related_relation: null, related_name: null,
    statement: "Amara is at the hospital most days", evidence: ["shes at the hospital most days"], certainty: "stated", sensitivity: "none",
    confidence: 0.9, date_text: null, date_direction: "unclear",
    detail: { event_type: null, event_goal: null, category: "other", attribute: null, value: null, firmness: null, topic: null, place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null },
    existing: { action: "new", target: null },
  };
  const out = planExtraction(input, { items: [item], needs_clarification: null } as ModelProposal);
  eq(out.items.map((i) => [i.statement, i.spans.map((sp) => sp.quote)]), [["Amara is at the hospital most days", ["shes at the hospital most days"]]]);
  eq(out.dropped, []);
});
