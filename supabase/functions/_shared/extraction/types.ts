// Shared types for relationship_extract: the server-loaded context, the
// model's raw proposal, and the validated plan the gateway writes.

import type { DatePrecision, Direction } from "./dates.ts";

import type { PersonMention } from "./names.ts";
import type { PlaceIndex } from "../semantic/placeIndex.ts";
import type { FacetLike, Outcome } from "../semantic/relate.ts";
import type { ResidenceFacet } from "../semantic/residence.ts";

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
  /**
   * Other words their own lines use for them ("Wifey" for someone now called
   * "Loo Loo"; founder I12): matched like a nickname, and shown to the model
   * as another name they're called.
   */
  line_names?: string[];
  /**
   * Names they were called before: kept at a rename, or recorded in their
   * lines under an earlier name (founder I12). Code only; never in the prompt.
   */
  earlier_names?: string[];
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
  /** Roster keys of the others this memory is also about (shared memories). Code only; never in the prompt. */
  with_person_keys?: string[];
  /** Also about anyone else at all, in People or not (a shared line is never closed by one person's change). Code only. */
  shared?: boolean;
  /** Its live residence reading (Phase 4B B3), when the server derived one. Code only; never in the prompt. */
  facet?: FacetLike | null;
}

export interface CaptureContext {
  id: string;
  raw_text: string;
  occurred_at: string;
  time_zone: string | null;
  /** Tell was opened from this person's page. */
  context_person_key?: string | null;
  /**
   * The note this one continues ("Tell the rest", Option A; CER-1): the earlier note's words, shown to
   * the model only so a fragment or a pronoun in this note can be understood. Never evidence: every
   * quote is located in this note's own words.
   */
  earlier_text?: string | null;
}

export interface ExtractionInput {
  capture: CaptureContext;
  roster: RosterPerson[];
  related: RosterRelated[];
  dossier: DossierItem[];
  /**
   * People the user removed from People (founder I3). Never shown to the
   * model; code checks a name against them so a removed person is offered
   * back, never re-created as someone new or guessed.
   */
  archived?: ArchivedPerson[];
  /**
   * The place data residence is read with (Phase 4B B3; the gateway's own,
   * never the app's). Without it nothing is read as a residence, and every
   * line relates as before.
   */
  places?: PlaceIndex;
}

export interface ArchivedPerson {
  id: string;
  display_name: string;
  full_name?: string | null;
  nicknames?: string[] | null;
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
  | "too_many_items"
  | "contact_detail"
  // "the writer" left in a statement in a way that couldn't be turned into
  // "you" with certainty (founder native pass F4/F6).
  | "internal_reference"
  // A relationship Kinship already holds, said again ("John is your
  // brother" when John is already your brother): never a second fact (H17).
  | "already_known";

export type Flag =
  | "new_person"
  | "person_ambiguous"
  | "person_disagreement"
  | "pronoun"
  | "pronoun_multiple"
  | "subject_check"
  | "new_related"
  // Founder K27: a name not in People that is a known companion (a pet, a
  // related someone) of the person the line is about: filed on them, never
  // asked "Who is Fluffy?". Shown for a glance, saved on show.
  | "companion_matched"
  | "sensitive"
  | "sensitivity_raised"
  | "reported"
  | "certainty_lowered"
  | "date_ambiguous"
  | "date_coarse"
  | "date_unresolved_sensitive"
  | "protected_target"
  | "mid_confidence"
  | "tradition"
  // The statement is plainly about someone other than the person the model
  // filed it under ("John is your brother" filed on Ben): moved to the person
  // it names, and shown for a yes rather than kept silently.
  | "subject_moved"
  // Stabilization Gate E: this reads as an update to an earlier memory, but
  // two fit equally well; the user says which one it replaces (or neither).
  | "update_check"
  // A stated relationship that differs from the one Kinship holds: asked (H17).
  | "relation_conflict"
  // Stabilization Gate F: also about others in People (one memory, one source).
  | "shared_people"
  // Founder I3: the name is someone the user removed from People. Held to
  // bring them back, never added again as someone new.
  | "person_archived"
  // Founder J4: the model's wording added what the note never says (a name,
  // a number, a sensitive term, a relationship, a lost "not"), so the line
  // keeps the note's own words instead, shown for a glance. Never dropped.
  | "own_words"
  // Founder J11: the model called it a promise and someone commits to
  // something here (or asks the user to), but whose promise it is isn't
  // plain. Held: "Whose promise?" (Yours, or theirs).
  | "promise_owner"
  // Founder J11: the model called it a promise but no one commits to
  // anything in the words. Kept as what it says (the user's plan, or a fact
  // about the person), never a to-do, shown for a glance.
  | "not_a_promise"
  // Founder K4: someone else the line is about goes by a name two or more
  // people share ("Anthony and Sam love ice skating with Chris", two Sams).
  // Held: "Which Sam?" asks about that name only, never the whole line.
  | "participant_ambiguous"
  // Founder K5: the user's own news, kept with the person it names (or asked
  // about), in the line's own words. Shown for a glance, never dropped.
  | "user_news"
  // Phase 4B B3 (case E, §21): a new residence that may be incompatible with
  // one Kinship holds, where a wrong pick would show something false. Held:
  // "Is Susan still in Alameda?" Still there · Susan moved.
  | "residence_conflict";

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
  /** Others in People this one memory is also about ("Ben and John went to Tahoe"); ids. */
  with_person_ids?: string[];
  /** Relationships to the user the note states outright, by person id ("Ben is my brother"). */
  self_relations?: Record<string, string>;
  /**
   * Held only for which person, as the mirror of a line kept for this person
   * from the same sentence ("Sam might be moving… with Michelle", next to
   * "Michelle might be moving… with Sam"): the answer joins that line,
   * never a second copy (founder I10, H13).
   */
  twin_person_id?: string;
  /** The name a held line asks about ("Sam" with two Sams): its choices are only the people it can mean. */
  mention?: string;
  /** People removed from People that the name fits: offered back, never re-created (founder I3). */
  archived_ids?: string[];
  /**
   * For a held "he" or "she": exactly who it can mean, people named before it
   * and then the page's person; never the sentence's object (founder J1).
   */
  candidate_ids?: string[];
  /** The note's own words for who this is about, as resolved ("Wifey", "Sam", "Zed"). Code only. */
  subject_words?: string;
  /**
   * Which words in the statement name which of its people (founder I12/I13).
   * A line still waiting on "who?" has the asked-about words with no person:
   * the answer puts the chosen person there.
   */
  person_mentions?: PersonMention[];
  /**
   * Others the line is about whose name two or more people share, while who
   * the line is about is itself still asked (founder K4): each is its own
   * question with every person that name can mean, answered on its own, and
   * never dropped for being unclear.
   */
  open_names?: OpenName[];
  /**
   * A line told by the model as one piece per person and kept as one in the
   * note's words (founder K4): the piece about who it is filed on, alone
   * ("Anthony loves watching Dragonball Z"). Its words once every other name
   * in it is answered with that same person (founder I13). Code only.
   */
  alone?: string;
  /** Its residence reading, in the note's own words (Phase 4B B3): written with the line, re-checked by the database. */
  facets?: ResidenceFacet[];
  /** The change or correction in the user's words that lets it close a line the user edited (code points; §21). */
  cue?: { start: number; end: number };
  /**
   * The other current lines it closes besides its target, the most specific
   * first (Phase 4B B4, brief §8 rule 2, §10): written as closes_ids, each
   * re-checked by the database as the target is, and restored with it on Undo.
   */
  closes?: string[];
  /**
   * The residence question it is held for: which line, in that line's own
   * words, what "Still there" keeps, and what else "Susan moved" closes
   * (B4: the other lines the reading can't be true with, the most specific first).
   */
  still_in?: { target_id: string; words: string; stay: "facet" | "words"; closes?: string[] };
  /** How it relates to the residence Kinship holds (evals and tests). Code only; never written or sent. */
  residence?: Outcome;
}

/** A name in a line that two or more people go by: asked which one (founder K4). */
export interface OpenName {
  /** The name as the line says it ("Sam"). */
  text: string;
  /** Everyone in People that name can mean, never narrowed. */
  candidate_ids: string[];
  /** People removed from People who went by it too (founder I3): offered back, and asked even with one person left. */
  archived_ids?: string[];
}

export interface Clarification {
  about: "person" | "subject" | "new_person" | "date";
  question: string;
  options: string[];
}

/**
 * What one note's understanding did not get to (founder, 19 Oct 2026: no silent capacity-based loss;
 * 30 Oct 2026, FD-30c: long notes are processed, not pushed back). Since FD-30c every proposal the model
 * makes is judged by the item rules, so nothing is lost to a count. A long note is understood in passages
 * (run.ts), and `unprocessed` holds the code-point spans of passages whose model call failed (a timeout,
 * an error, a refusal), in the note's own words, so the phone can mark them and offer "Tell the rest" or
 * "Try again". `unlocated` stays for proposals whose words could not be placed when a passage call did
 * succeed but the pipeline could not take its spans. Content-free: offsets and a count, never words.
 */
export interface Coverage {
  unprocessed: { start: number; end: number }[];
  unlocated: number;
}

export interface ExtractionOutcome {
  items: PlannedItem[];
  dropped: { reason: DropReason; kind: Kind | null }[];
  clarification: Clarification | null;
  /** What the capture needs: auto-save, a light confirmation, one question, or nothing found. */
  tier: "auto" | "confirm" | "clarify" | "nothing";
  injection_suspected: boolean;
  /** Relationships said again that Kinship already holds, in the user's terms ("John is your brother"). */
  known?: string[];
  /** What this understanding could not take (capacity), when anything; absent when the note was taken whole. */
  coverage?: Coverage;
}

export type { DatePrecision, Direction };
