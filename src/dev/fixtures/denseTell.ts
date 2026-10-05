// DEV/TEST FIXTURE (never shipped into a real account; contract §7.9).
//
// The dense-Tell proof: one realistic note with four different kinds of
// thing in it. There is no model in tests, so the model's reply is written
// here by hand, in the exact structured shape relationship_extract returns
// (supabase/functions/_shared/extraction/types.ts: ModelProposal). Everything
// after that is the product's real code: the gateway's input builder and
// pipeline (grounding, names, dates, merge/supersede, tiers), the write rules,
// sync, the review, the relationship page and What Kinship knows. Nothing
// here decides how anything is shown.
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../supabase/functions/_shared/extraction/types";

export const MATT_NOTE =
  "Matt just got promoted. He's excited but nervous about managing people. He and Jess are thinking about moving to Marin next summer, and I told him I'd introduce him to Alex.";

const NO_DETAIL: ProposedDetail = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};

/** The roster key the gateway gave this person in this run ("p1"…). */
export function keyFor(input: ExtractionInput, name: string): string {
  const p = input.roster.find((r) => r.display_name === name);
  if (!p) throw new Error(`${name} is not on the roster`);
  return p.key;
}

/** The dossier key of an existing memory whose statement starts with these words. */
export function memoryKey(input: ExtractionInput, startsWith: string): string {
  const m = input.dossier.find((d) => d.statement.startsWith(startsWith));
  if (!m) throw new Error(`no dossier item "${startsWith}"`);
  return m.key;
}

function item(
  over: Omit<Partial<ProposedItem>, "detail"> & Pick<ProposedItem, "kind" | "person" | "statement" | "evidence"> & { detail?: Partial<ProposedDetail> },
): ProposedItem {
  return {
    person_mention: null, subject: "person", related_relation: null, related_name: null, certainty: "stated",
    sensitivity: "none", confidence: 0.92, date_text: null, date_direction: "unclear",
    existing: { action: "new", target: null }, ...over, detail: { ...NO_DETAIL, ...(over.detail ?? {}) },
  };
}

/** A plausible model reading of MATT_NOTE: four items, nothing invented. */
export function mattProposal(input: ExtractionInput): ModelProposal {
  const matt = keyFor(input, "Matt");
  return {
    needs_clarification: null,
    items: [
      item({
        kind: "fact", person: matt, person_mention: "Matt", statement: "Matt was promoted",
        evidence: ["Matt just got promoted"], confidence: 0.95, date_direction: "past",
        detail: { category: "work", attribute: "role", value: "promoted" },
      }),
      item({
        kind: "fact", person: matt, person_mention: "He", statement: "Matt is excited but nervous about managing people",
        evidence: ["He's excited but nervous about managing people"], confidence: 0.9, detail: { category: "work" },
      }),
      item({
        kind: "plan", person: matt, person_mention: "He", statement: "Matt and Jess are thinking about moving to Marin next summer",
        evidence: ["He and Jess are thinking about moving to Marin next summer"], certainty: "tentative", confidence: 0.88,
        date_text: "next summer", date_direction: "future", detail: { firmness: "idea", place: "Marin" },
      }),
      item({
        kind: "promise", person: matt, person_mention: "him", subject: "user", statement: "Introduce Matt to Alex",
        evidence: ["I told him I'd introduce him to Alex"], confidence: 0.93, date_direction: "future",
      }),
    ],
  };
}

// ─── Evolving information (progression proofs) ──────────────────────────

export const ANNA_1 = "Anna is interviewing at Stripe.";
export const ANNA_2 = "Anna got the Stripe job!";
export const KNEE_1 = "Ben's knee has been bothering him.";
export const KNEE_2 = "Ben's knee is finally better.";

export function anna1(input: ExtractionInput): ModelProposal {
  return { needs_clarification: null, items: [item({
    kind: "thread", person: keyFor(input, "Anna"), person_mention: "Anna", statement: "Anna is interviewing at Stripe",
    evidence: ["Anna is interviewing at Stripe"], confidence: 0.92, detail: { topic: "interviewing at Stripe" },
  })] };
}

export function anna2(input: ExtractionInput): ModelProposal {
  return { needs_clarification: null, items: [item({
    kind: "fact", person: keyFor(input, "Anna"), person_mention: "Anna", statement: "Anna got the job at Stripe",
    evidence: ["Anna got the Stripe job"], confidence: 0.94, date_direction: "past",
    detail: { category: "work", attribute: "employer", value: "Stripe" },
    existing: { action: "resolves", target: memoryKey(input, "Anna is interviewing") },
  })] };
}

export function knee1(input: ExtractionInput): ModelProposal {
  return { needs_clarification: null, items: [item({
    kind: "fact", person: keyFor(input, "Ben"), person_mention: "Ben", statement: "Ben's knee has been bothering him",
    evidence: ["Ben's knee has been bothering him"], sensitivity: "health", confidence: 0.9,
    detail: { category: "health", attribute: "knee", value: "bothering him" },
  })] };
}

export function knee2(input: ExtractionInput): ModelProposal {
  return { needs_clarification: null, items: [item({
    kind: "fact", person: keyFor(input, "Ben"), person_mention: "Ben", statement: "Ben's knee is better",
    evidence: ["Ben's knee is finally better"], sensitivity: "health", confidence: 0.92,
    detail: { category: "health", attribute: "knee", value: "better" },
    existing: { action: "supersede", target: memoryKey(input, "Ben's knee has been") },
  })] };
}
