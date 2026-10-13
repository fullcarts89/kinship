// The conversations the user confirmed with someone (founder I2: "know it +
// ask it"), as the quiet trail under Between you: "You messaged · Oct 12",
// and what it was about in their own words. Only conversations the user
// said happened (a return check's Yes, or their own entry); opening Messages
// is never one. History, never analytics: no counts, frequency, streaks or
// "last contacted".
import { momentLabel } from "@/features/memory/format";
import type { MemoryItem, Person } from "@/store/repositories";
import { shortName } from "../../../supabase/functions/_shared/extraction/names";
import type { TrailLine } from "./portraitModel";

export interface ContactEventRow {
  id: string;
  person_id: string;
  channel: string;
  occurred_at: string;
  memory_item_id?: string | null;
  deleted_at?: string | null;
}

/** The ways to say "you were in touch", by channel (the user's channel, never a brand). */
export function trailVerb(channel: string, person: Person | null): string {
  switch (channel) {
    case "text":
    case "whatsapp":
      return "You messaged";
    case "email":
      return "You emailed";
    case "call":
      return "You called";
    case "facetime":
    case "video":
      return "You had a video call";
    case "in_person":
      return person ? `You saw ${shortName(person) || person.display_name}` : "You saw them";
    default:
      return "You were in touch";
  }
}

/**
 * Every confirmed conversation with them, newest first. "About" is the
 * memory it was about, in the words the page shows (`items` are voiced by the
 * caller), while that memory is current and about them.
 */
export function trailFor(contacts: ContactEventRow[], items: MemoryItem[], person: Person, now: Date): TrailLine[] {
  const byId = new Map(items.map((m) => [m.id, m]));
  const theirs = (m: MemoryItem) => m.person_id === person.id || (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(person.id));
  return contacts
    .filter((c) => c.person_id === person.id && !c.deleted_at && typeof c.occurred_at === "string")
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.id.localeCompare(a.id))
    .map((c) => {
      const m = c.memory_item_id ? byId.get(c.memory_item_id) : undefined;
      const current = !!m && !m.deleted_at && (m.status === "active" || m.status === "resolved") && theirs(m);
      return { id: c.id, label: `${trailVerb(c.channel, person)} · ${momentLabel(c.occurred_at, now, false)}`, about: current ? m!.statement : null };
    });
}

/** Their promises the user has reached them about since its day (founder K2, K3): no longer "Waiting on …". */
export function reachedAbout(contacts: ContactEventRow[], items: MemoryItem[], localDay: (iso: string) => string): Set<string> {
  const out = new Set<string>();
  for (const m of items) {
    const due = (m.detail as Record<string, unknown> | null)?.due_date;
    if (m.kind !== "promise" || typeof due !== "string") continue;
    if (contacts.some((c) => !c.deleted_at && c.memory_item_id === m.id && c.person_id === m.person_id && localDay(c.occurred_at) >= due)) out.add(m.id);
  }
  return out;
}
