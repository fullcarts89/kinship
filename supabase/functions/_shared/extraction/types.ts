// Shared types for relationship_extract: the server-loaded context, the
// model's raw proposal, and the validated plan the gateway writes.

import type { DatePrecision, Direction } from "./dates.ts";

export const KINDS = ["fact", "event", "promise", "plan", "thread", "moment", "milestone", "tradition", "context"] as const;
export type Kind = (typeof KINDS)[number];
export const SUBJECTS = ["person", "related", "user", "shared"] as const;
export type SubjectType = (typeof SUBJECTS)[number];
export const CERTAINTIES = ["stated", "tentative", "reported", "planned", "wished"] as const;
export type Certainty = (typeof CERTAINTIES)[number];
export const SENSITIVITIES = ["none", "health", "death_grief", "conflict", "money", "other_private"] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];
export const EVENT_TYPES = [
  "race", "surgery", "medical", "exam", "interview", "move", "trip", "wedding", "birth",
  "funeral", "job_start", "school_start", "celebration", "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const FACT_CATEGORIES = ["family", "work", "home", "health", "interest", "preference", "pet", "other"] as const;
export const FIRMNESS = ["idea", "intended", "scheduled"] as const;
export const RECURRENCES = ["yearly", "seasonal", "monthly"] as const;
export const ASPECTS = ["how_met", "shared_interest", "inside_joke", "place", "other"] as const;
export const ACTIONS = ["new", "merge", "supersede", "resolves"] as const;
export type Action = (typeof ACTIONS)[number];

// ─── Context the gateway loads server-side (never from the client body) ─────

export interface RosterPerson {
  /** Short key shown to the model ("p1"); the model never sees ids. */
  key: string;
  id: string;
  display_name: string;
  full_name?: string | null;
  nicknames?: string[];
  relationship_label?: string | null;
}

export interface RosterRelated {
  key: string;
  id: string;
  person_key: string;
  relation: string;
  name?: string | null;
}

export interface DossierItem {
  key: string;
  id: string;
  person_key: string;
  kind: Kind;
  subject_type: SubjectType;
  related_key?: string | null;
  statement: string;
  certainty: Certainty;
  status: "active" | "resolved";
  user_state: "unreviewed" | "confirmed" | "edited" | "user_authored";
  detail: Record<string, unknown>;
}

export interface CaptureContext {
  id: string;
  raw_text: string;
  occurred_at: string;
  time_zone: string | null;
  /** Tell was opened from this person's page. */
  context_person_key?: string | null;
}

export interface ExtractionInput {
  capture: CaptureContext;
  roster: RosterPerson[];
  related: RosterRelated[];
  dossier: DossierItem[];
}

// ─── The model's proposal (structured output; untrusted) ────────────────────

export interface ProposedDetail {
  event_type: EventType | null;
  event_goal: string | null;
  category: (typeof FACT_CATEGORIES)[number] | null;
  attribute: string | null;
  value: string | null;
  firmness: (typeof FIRMNESS)[number] | null;
  topic: string | null;
  place: string | null;
  milestone_type: string | null;
  recurrence: (typeof RECURRENCES)[number] | null;
  anchor: string | null;
  aspect: (typeof ASPECTS)[number] | null;
  time_of_day: string | null;
}

export interface ProposedItem {
  kind: Kind;
  /** A roster key ("p1"), "new" for someone not on the roster, or "unknown". */
  person: string;
  /** The exact words in the note that refer to that person ("Ben", "he", "my mom"). */
  person_mention: string | null;
  subject: SubjectType;
  related_relation: string | null;
  related_name: string | null;
  statement: string;
  /** Exact quotes copied from the note. The first is the main evidence. */
  evidence: string[];
  certainty: Certainty;
  sensitivity: Sensitivity;
  confidence: number;
  date_text: string | null;
  date_direction: Direction;
  detail: ProposedDetail;
  existing: { action: Action; target: string | null };
}

export interface ModelProposal {
  items: ProposedItem[];
  needs_clarification: { about: "person" | "subject" | "date"; mention: string | null } | null;
}

// ─── The validated plan ─────────────────────────────────────────────────────

export type Tier = "auto" | "confirm" | "hold";

/** Why an item was dropped or demoted. Content-free; safe to log as counts. */
export type DropReason =
  | "no_evidence"
  | "evidence_ambiguous"
  | "invented_name"
  | "invented_number"
  | "invented_sensitive_term"
  | "invented_relation"
  | "mention_not_in_note"
  | "polarity_mismatch"
  | "not_a_user_promise"
  | "instruction_text"
  | "low_confidence"
  | "bad_kind_subject"
  | "duplicate"
  | "too_many_items";

export type Flag =
  | "new_person"
  | "person_ambiguous"
  | "person_disagreement"
  | "pronoun"
  | "pronoun_multiple"
  | "subject_check"
  | "new_related"
  | "sensitive"
  | "sensitivity_raised"
  | "reported"
  | "certainty_lowered"
  | "date_ambiguous"
  | "date_coarse"
  | "date_unresolved_sensitive"
  | "protected_target"
  | "mid_confidence"
  | "tradition";

export interface PlannedSpan {
  start: number;
  end: number;
  quote: string;
}

export interface PlannedItem {
  kind: Kind;
  /** Null for a person not yet on the roster (always held). */
  person_id: string | null;
  person_key: string | null;
  new_person_name: string | null;
  subject_type: SubjectType;
  /** Existing related_people row, or a new one to create (id null). */
  related: { id: string | null; relation: string; name: string | null } | null;
  statement: string;
  detail: Record<string, unknown>;
  certainty: Certainty;
  sensitivity: Sensitivity;
  confidence: number;
  spans: PlannedSpan[];
  action: { type: Action; target_id: string | null };
  tier: Tier;
  flags: Flag[];
  /** For evals and the response: which date rule fired (no content). */
  date_rule: string | null;
}

export interface Clarification {
  about: "person" | "subject" | "new_person" | "date";
  question: string;
  options: string[];
}

export interface ExtractionOutcome {
  items: PlannedItem[];
  dropped: { reason: DropReason; kind: Kind | null }[];
  clarification: Clarification | null;
  /** What the capture needs: auto-save, a light confirmation, one question, or nothing found. */
  tier: "auto" | "confirm" | "clarify" | "nothing";
  injection_suspected: boolean;
}

export type { DatePrecision, Direction };
