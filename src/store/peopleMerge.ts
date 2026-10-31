// Two People who are one person (PER-05; FD-30e): "Anthony" added by name and
// "Anthony Lopez" from Contacts. The user merges them from the person's page:
// a short picker of plausible matches (same first name or another name they
// go by; never a score), a preview of exactly what moves, then the server's
// merge_people (20261030090000) does it in one transaction: every memory
// with every source, shared lines and mentions re-pointed, related people,
// notes told from their page, conversations, hashed identities and reasons.
// The merged person is archived, never deleted; a journal row lets the user
// undo for 30 days (undo_merge_people), which reverses exactly what moved.
//
// The phone never does the re-pointing itself: it asks the server, then
// syncs, so every device sees one truth. Offline, merging waits.

import type { SupabaseClient } from "@supabase/supabase-js";
import { aliasesOf, firstName, shortName } from "../../supabase/functions/_shared/extraction/names";
import { isInPeople } from "./peopleStates";
import type { MemoryItem, Person, RelatedPerson } from "./repositories";
import type { Data } from "./userStore";

/** How long a merge can be undone (PER-05: 30 days). */
export const MERGE_UNDO_DAYS = 30;

/** A row of people_merges as the phone mirrors it. */
export interface MergeRow extends Data {
  id: string;
  target_id: string;
  source_id: string;
  undone_at: string | null;
  created_at: string;
  deleted_at?: unknown;
}

function fold(s: unknown): string {
  return typeof s === "string" ? s.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase() : "";
}

/** Every name a person goes by, folded: display name, full name, first name, other names. */
export function nameForms(p: Person): string[] {
  const forms = [p.display_name, typeof p.full_name === "string" ? p.full_name : "", firstName(p.display_name), ...aliasesOf(p)]
    .map(fold).filter(Boolean);
  return [...new Set(forms)];
}

/**
 * Who in People might be the same person: shares a first name or another
 * name they go by. Alphabetical; never ranked, never scored. Someone removed
 * from People is never offered (bring them back first), nor the person
 * themself.
 */
export function mergeCandidates(person: Person, people: Person[]): Person[] {
  const mine = new Set(nameForms(person));
  const first = fold(firstName(person.display_name));
  return people
    .filter((p) => p.id !== person.id && isInPeople(p))
    .filter((p) => {
      const theirs = nameForms(p);
      return theirs.some((n) => mine.has(n)) || (!!first && fold(firstName(p.display_name)) === first);
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

/**
 * "Add by name" of a name that is already someone in People (not removed):
 * the person it matches, so the screen can ask "Is this the same Anthony?"
 * before making a second one (founder I3: never a duplicate by accident).
 */
export function sameNameMatch(name: string, people: Person[]): Person | null {
  const k = fold(name);
  if (!k) return null;
  return people.find((p) => isInPeople(p) && nameForms(p).includes(k)) ?? null;
}

/** What the preview reads of a memory: its words (voiced by the caller) and whether it is current. */
export type PreviewItem = Pick<MemoryItem, "id" | "statement" | "status"> & { deleted_at?: unknown };

export interface MergePreview {
  /** The memories that move, in the user's terms (every one; nothing is summarised as a count). */
  memories: string[];
  /** Memories on other pages that stop naming the merged person and name the survivor. */
  shared: string[];
  /** "sister Maria" */
  related: string[];
  /** Conversations the user confirmed with the merged person, as "Messaged · Oct 12". */
  conversations: string[];
  /** The survivor takes the merged person's birthday (they had none). */
  birthday: string | null;
  /** The survivor takes the merged person's contact link (they had none). */
  contactLink: boolean;
  /** The merged person's names the survivor will also go by. */
  alsoKnownAs: string[];
}

const CHANNEL_WORD: Record<string, string> = {
  text: "Messaged", call: "Called", facetime: "FaceTimed", whatsapp: "Messaged", email: "Emailed",
  in_person: "Saw them", video: "Video call", other: "In touch",
};

function shortDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getDate()}`;
}

/**
 * Exactly what a merge would move, before the user says yes. Pure: the
 * caller passes the merged person's items (filed on them), the items shared
 * with them, their related people and their confirmed conversations. Items
 * are given with the words the page shows (voiced), never raw.
 */
export function mergePreview(input: {
  target: Person;
  source: Person;
  /** Live items filed on the merged person. */
  items: PreviewItem[];
  /** Live items filed elsewhere that are shared with them. */
  sharedItems: PreviewItem[];
  related: Pick<RelatedPerson, "relation" | "name">[];
  conversations: { channel: string; occurred_at: string; deleted_at?: unknown }[];
}): MergePreview {
  const { target, source } = input;
  const live = (m: { status: string; deleted_at?: unknown }) => (m.status === "active" || m.status === "resolved") && !m.deleted_at;
  const targetForms = new Set(nameForms(target));
  const also = [source.display_name, typeof source.full_name === "string" ? source.full_name : "", firstName(source.display_name), ...aliasesOf(source)]
    .map((n) => n.trim()).filter((n) => n && !targetForms.has(fold(n)));
  return {
    memories: input.items.filter(live).map((m) => m.statement),
    shared: input.sharedItems.filter(live).map((m) => m.statement),
    related: input.related.map((r) => (r.name ? `${r.relation} ${r.name}` : r.relation)),
    conversations: input.conversations.filter((c) => !c.deleted_at)
      .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)))
      .map((c) => `${CHANNEL_WORD[c.channel] ?? "In touch"} · ${shortDay(c.occurred_at)}`),
    birthday: !target.birthday && source.birthday ? String(source.birthday) : null,
    contactLink: !target.contact_ref && typeof source.contact_ref === "string" && !!source.contact_ref,
    alsoKnownAs: [...new Set(also)],
  };
}

/** The copy the merge sheet uses; `keep`/`merge` are how Kinship says each name. */
export const MERGE_COPY = {
  action: "Merge with someone",
  title: (keep: string) => `Merge into ${keep}`,
  pickTitle: (keep: string) => `Who is also ${keep}?`,
  pickNone: (keep: string) => `No one else in People goes by ${keep}'s name.`,
  pickOthers: "Someone else",
  previewTitle: (merge: string, keep: string) => `Merge ${merge} into ${keep}?`,
  previewLead: (merge: string, keep: string) => `Everything about ${merge} becomes ${keep}'s, with every note it came from. ${merge} leaves People; you can undo this for ${MERGE_UNDO_DAYS} days.`,
  keepOther: (merge: string) => `To keep ${merge}'s name instead, merge from ${merge}'s page.`,
  memories: "Memories that move",
  shared: "Lines that will name them",
  related: "Their people",
  conversations: "Conversations",
  birthday: (keep: string, day: string) => `${keep} takes the birthday ${day}`,
  contactLink: (keep: string) => `${keep} takes the link to Contacts`,
  alsoKnownAs: (keep: string, names: string) => `${keep} will also go by ${names}`,
  nothing: "Nothing is filed on them yet; only the name goes.",
  confirm: "Merge",
  cancel: "Cancel",
  offline: "Kinship needs to be online to merge. Nothing was changed.",
  mergedLine: (merge: string) => `Merged with ${merge}`,
  undo: "Undo",
  undone: (merge: string) => `${merge} is back in People.`,
} as const;

/** Merges into this person the user can still undo (not undone, within 30 days). */
export function undoableMerges(rows: MergeRow[], personId: string, now: Date): MergeRow[] {
  const since = now.getTime() - MERGE_UNDO_DAYS * 86_400_000;
  return rows
    .filter((m) => m.target_id === personId && !m.undone_at && !m.deleted_at && Date.parse(String(m.created_at)) >= since)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

/** People folded into someone else and not undone: never offered as "Removed from People" (their record is a shell). */
export function mergedAwayIds(rows: MergeRow[]): Set<string> {
  return new Set(rows.filter((m) => !m.undone_at && !m.deleted_at).map((m) => m.source_id));
}

export interface MergeTransport {
  merge(targetId: string, sourceId: string): Promise<MergeRow>;
  undo(mergeId: string): Promise<MergeRow>;
}

/** Over Supabase, as the signed-in user (RLS and the function's own owner check apply). */
export function supabaseMergeTransport(client: SupabaseClient): MergeTransport {
  return {
    async merge(targetId, sourceId) {
      const { data, error } = await client.rpc("merge_people", { p_target: targetId, p_source: sourceId });
      if (error) throw error;
      return data as MergeRow;
    },
    async undo(mergeId) {
      const { data, error } = await client.rpc("undo_merge_people", { p_merge_id: mergeId });
      if (error) throw error;
      return data as MergeRow;
    },
  };
}

/** How Kinship says a person's name in the merge sheet (names.ts). */
export function sayName(p: Person): string {
  return shortName(p) || p.display_name;
}
