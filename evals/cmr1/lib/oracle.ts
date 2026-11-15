// Perfect proposals from the ledger. Running them through the real planExtraction proves the
// deterministic code honours what the ledger says (a ledger error found here costs nothing; one found
// in a paid run costs a run). With `realistic`, a fact's `oracle_shape` replaces fields with the shape
// a live model has been seen to give (a padded mention, a wrong person key, a subjectless statement),
// so the guards that exist for those shapes are exercised for free.

import type {
  ExtractionInput,
  ModelProposal,
  ProposedItem,
} from "../../../supabase/functions/_shared/extraction/types.ts";
import { dossierKey, type Fact, type Narrative, type RosterDef, type StepState } from "./corpus.ts";

const EMPTY_DETAIL: ProposedItem["detail"] = {
  event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
  place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
};

/** Whether the oracle proposes this fact at all: anything the product should see, never what it should not. */
export function oracleProposes(f: Fact): boolean {
  if (f.optional) return false;
  return f.disposition.some((d) => d !== "excluded" && d !== "not_understood_recoverable");
}

/** The name as the note says it, so the mention is the note's own words. */
function mentionIn(note: string, names: string[]): string | null {
  const folded = note.toLowerCase();
  for (const name of names) {
    if (!name) continue;
    const at = folded.indexOf(name.toLowerCase());
    if (at >= 0 && !/\p{L}/u.test(folded[at - 1] ?? " ") && !/\p{L}/u.test(folded[at + name.length] ?? " ")) return note.slice(at, at + name.length);
  }
  return null;
}

export function oracleProposal(
  n: Narrative,
  stepIndex: number,
  rosters: Record<string, RosterDef>,
  input: ExtractionInput,
  state: StepState,
  opts: { realistic?: boolean } = {},
): { proposal: ModelProposal; factOfIndex: string[] } {
  const r = rosters[n.roster];
  const note = n.steps[stepIndex].note;
  const promptKey = (k: string) => input.roster.find((p) => p.id === `id-${k}`)?.key ?? "unknown";
  const items: ProposedItem[] = [];
  const factOfIndex: string[] = [];
  let ask: ModelProposal["needs_clarification"] = null;

  for (const f of n.facts) {
    if (f.step !== stepIndex || !oracleProposes(f)) continue;
    const kind = f.kind[0];
    const isNew = f.subject.startsWith("new:");
    const isUser = f.subject === "user";
    const isNone = f.subject === "none";
    const filedKey = isUser ? f.on[0] : isNew || isNone ? null : f.subject;
    const person = isNew ? "new" : isNone ? "unknown" : filedKey ? promptKey(filedKey) : "unknown";
    const rosterPerson = filedKey && !filedKey.startsWith("new:") ? r.people.find((p) => p.key === filedKey) : undefined;
    const names = rosterPerson ? [rosterPerson.name, ...(rosterPerson.nick ?? []), rosterPerson.full ?? ""] : [];
    const mention = f.mention !== undefined
      ? f.mention
      : isNew
      ? mentionIn(note, [f.subject.slice(4)]) ?? f.subject.slice(4)
      : isUser
      ? mentionIn(f.span, names) ?? mentionIn(note, names)
      : mentionIn(f.span, names) ?? mentionIn(note, names);
    const subject = isUser ? "user" : f.subject_type[0];
    const wantsAsk = f.disposition.includes("clarify") && f.clarification.includes("which-person") && !f.disposition.includes("retained");
    const [actType, actTarget] = (f.action?.[0] ?? (f.dedup_of ? `merge:${f.dedup_of}` : "new")).split(":");
    const targetMemory = actTarget ? state.memoryOf.get(actTarget) : undefined;
    const targetKey = targetMemory ? dossierKey(input, targetMemory) : null;
    const certainty = f.certainty?.[0] ?? (kind === "plan" ? "planned" : "stated");
    const item: ProposedItem = {
      kind,
      person,
      person_mention: mention ?? null,
      subject,
      related_relation: subject === "related" ? f.relation?.[0] ?? null : null,
      related_name: subject === "related" ? f.rname ?? null : null,
      statement: f.statement ?? f.span,
      evidence: [f.span],
      certainty,
      sensitivity: f.sensitivity?.[0] ?? "none",
      confidence: wantsAsk ? 0.5 : isNew ? 0.9 : 0.95,
      date_text: f.date_text ?? null,
      date_direction: f.dir ?? (f.date_text ? "future" : "unclear"),
      detail: {
        ...EMPTY_DETAIL,
        event_type: kind === "event" ? ((f.event_type?.[0] ?? "other") as ProposedItem["detail"]["event_type"]) : null,
        category: kind === "fact" ? ((f.category ?? "other") as ProposedItem["detail"]["category"]) : null,
        firmness: kind === "plan" ? "intended" : null,
        topic: kind === "thread" ? f.span.slice(0, 80) : null,
        aspect: kind === "context" ? "other" : null,
      },
      existing: { action: targetKey ? (actType as ProposedItem["existing"]["action"]) : "new", target: targetKey },
    };
    const shaped = opts.realistic && f.oracle_shape ? { ...item, ...f.oracle_shape, detail: { ...item.detail, ...((f.oracle_shape.detail as object) ?? {}) } } as ProposedItem : item;
    items.push(shaped);
    factOfIndex.push(f.id);
    if (wantsAsk && !ask) ask = { about: "person", mention: mention ?? null };
  }
  return { proposal: { items, needs_clarification: ask }, factOfIndex };
}
