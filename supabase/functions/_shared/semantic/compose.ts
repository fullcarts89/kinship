// What a person's residence lines say together (Phase 4B B5; brief §9, §11,
// §12; founder CC-19, CC-20). Pure and deterministic: it runs at read time on
// the phone, over the lines' mirrored readings (memory_item_facets), and
// stores nothing. No model and no place data: containment and levels are
// read from the facets themselves (brief §20), so the phone never needs the
// dataset.
//
//   group    the current residence lines of one person, subject and related
//            person (the caller's: active, a stated unshared fact, with a
//            live reading; residenceEligible says which lines may have one)
//   order    the most specific first (city < region < country, as relate.ts
//            ranks them), ties to the newest told
//   chain    each line must contain the next under the usual-reading guard
//            (relate.ts pairClass: E ⊇ N, or the SAME reading). Any other
//            pair means no composition: every line stays its own (fail open).
//            A DISJOINT pair among current lines is one the comparator should
//            have closed: the caller reports it, content-free (compose_degraded)
//   words    "Lives in " + each line's own value_text, most specific first,
//            joined with ", ". Lines with the same reading are said once, in
//            the most specific line's words, and stay members (their notes are
//            the line's provenance). Nothing is expanded, normalised or added:
//            "Alameda, CA" stays "Alameda, CA", never "California"
//   carries  its member item ids (the union of their sources is the caller's
//            to read), the rule version and the dataset versions. It is a
//            view: never a memory row, never a dossier line, never evidence
//   history  the same renderer, "Previously lived in ", over a chain the
//            closer records as a change (§11): changed, completed or
//            cancelled. A correction, a refinement, a progress chain, a
//            replacement with no cue and a supersession from before 4B (no
//            transition) are never history (CC-20)

import { type FacetLike, pairClass, specificityOf } from "./relate.ts";
import { residenceEligible } from "./residence.ts";

export const COMPOSE_RULE_VERSION = "compose/v1";

/** The approved wording (brief §9, §11). */
export const RESIDENCE_PREFIX = { current: "Lives in ", previous: "Previously lived in " } as const;

/** One current residence line, as the composer reads it. */
export interface ComposeMember {
  /** The memory item. */
  id: string;
  facet: FacetLike & { dataset_version?: string | null };
  /** When it was told (ISO); ties among equally specific lines go to the newest. */
  told: string;
}

/** A composed line: a view over its members, in their own words. */
export interface Composed {
  /** "Lives in Alameda, California". */
  text: string;
  /** Every member, the most specific first: a line whose reading another member already says stays a member. */
  memberIds: string[];
  /** The words shown, in order: only members' own value_text. */
  words: string[];
  rule_version: string;
  /** The dataset versions the members' readings came from (usually one). */
  dataset_versions: string[];
}

export interface ComposeResult {
  /** One line when the group composes; else one line per member (fail open). */
  lines: Composed[];
  /**
   * A chain the comparator keeps pairwise compatible was broken (a DISJOINT
   * pair among current lines). Reported content-free; the lines are shown
   * apart, never merged.
   */
  degraded: boolean;
}

/** Whether a line may be read as a current residence, with its reading (the caller's selection, brief §8 "current"). */
export function currentResidence(
  item: { status: string; deleted_at?: unknown; kind: string; subject_type: string; certainty: string; sensitivity: string; with_person_ids?: readonly string[] | null },
  facet: { slot?: string; deleted_at?: unknown } | null | undefined,
): boolean {
  return item.status === "active" && !item.deleted_at && residenceEligible(item) &&
    !!facet && (facet.slot ?? "residence") === "residence" && !facet.deleted_at;
}

/** The lines that compose together: one person, subject and related person (never across people, brief §8 guard). */
export function residenceGroupKey(item: { person_id: string; subject_type: string; subject_related_id?: string | null }): string {
  return `${item.person_id}|${item.subject_type}|${item.subject_related_id ?? ""}`;
}

function mostSpecificFirst(a: ComposeMember, b: ComposeMember): number {
  return specificityOf(a.facet) - specificityOf(b.facet) || b.told.localeCompare(a.told) || a.id.localeCompare(b.id);
}

function versionsOf(members: readonly ComposeMember[]): string[] {
  return [...new Set(members.map((m) => m.facet.dataset_version).filter((v): v is string => typeof v === "string" && !!v))].sort();
}

function render(members: readonly ComposeMember[], prefix: string): Composed {
  const words: string[] = [];
  members.forEach((m, i) => {
    // The same reading is said once, in the most specific line's words.
    if (i > 0 && pairClass(members[i - 1].facet, m.facet) === "SAME") return;
    words.push(m.facet.value_text);
  });
  return {
    text: `${prefix}${words.join(", ")}`,
    memberIds: members.map((m) => m.id),
    words,
    rule_version: COMPOSE_RULE_VERSION,
    dataset_versions: versionsOf(members),
  };
}

/**
 * One group's lines as one line when they chain, else each on its own.
 * `previous` renders a closed chain as history ("Previously lived in …");
 * whether it may be shown is historyEligible's call.
 */
export function composeResidence(members: readonly ComposeMember[], opts: { previous?: boolean } = {}): ComposeResult {
  const prefix = opts.previous ? RESIDENCE_PREFIX.previous : RESIDENCE_PREFIX.current;
  const sorted = [...members].sort(mostSpecificFirst);
  if (sorted.length === 0) return { lines: [], degraded: false };
  let chain = true;
  let degraded = false;
  for (let i = 0; i + 1 < sorted.length; i++) {
    // The more specific line (N) must lie inside the next (E), or read the same.
    const cls = pairClass(sorted[i].facet, sorted[i + 1].facet);
    if (cls === "E_CONTAINS_N" || cls === "SAME") continue;
    chain = false;
    // Unknown or ambiguous readings are kept apart on purpose (§7, N14); two current lines that can't both
    // be true are what the comparator keeps from happening. Read as it read them: the newer line as N.
    const [newer, older] = sorted[i].told >= sorted[i + 1].told ? [sorted[i], sorted[i + 1]] : [sorted[i + 1], sorted[i]];
    if (pairClass(newer.facet, older.facet) === "DISJOINT") degraded = true;
  }
  if (chain) return { lines: [render(sorted, prefix)], degraded: false };
  return { lines: sorted.map((m) => render([m], prefix)), degraded };
}

/** The transitions that are evidence of a change (§11, CC-20). */
export const HISTORY_TRANSITIONS: readonly string[] = ["changed", "completed", "cancelled"];

/**
 * Whether a closed line may be shown as history: every live line that
 * replaced or closed it records a change. No closer (nothing live replaces
 * it), a correction, progress, or no transition at all (a plain replacement,
 * or a supersession from before 4B) means never.
 */
export function historyEligible(closers: readonly { transition?: unknown }[]): boolean {
  return closers.length > 0 && closers.every((c) => typeof c.transition === "string" && HISTORY_TRANSITIONS.includes(c.transition));
}
