// The ideas for showing up for one person (src/features/showingup/ideas.ts), from this phone's store:
// their lines voiced as the page shows them, the note's own words behind each, and each line's source.
// Read only when the user opens the control (the screens mount this then), never in the background.
import { provenanceLine } from "@/features/memory/format";
import { misfiledOn, voiced } from "@/features/memory/statements";
import { nextBirthday } from "@/features/setup/setupModel";
import { ideasFor, type Idea } from "@/features/showingup/ideas";
import { daysBetween } from "@/features/today/todayModel";
import { useV2Session } from "@/providers/V2SessionProvider";
import { peopleOf, type MemoryItem, type Person } from "@/store/repositories";
import { todayIso } from "./useV2";
import { useStoreQuery } from "./useStoreQuery";

/** A birthday this close is something to celebrate (it already comes back on its day). */
export const BIRTHDAY_IDEA_DAYS = 7;

export function usePersonIdeas(personId: string | null, about: { itemId: string | null; birthday?: boolean } | null = null): { ideas: Idea[]; person: Person | null; loading: boolean } {
  const { store } = useV2Session();
  const day = todayIso();
  const q = useStoreQuery(store, async (repos) => {
    if (!personId) return { ideas: [] as Idea[], person: null };
    const now = new Date();
    const people = await repos.people.list();
    const person = people.find((p) => p.id === personId && !p.deleted_at) ?? null;
    if (!person) return { ideas: [] as Idea[], person: null };
    const all = ((await store.list("memory_items")) as MemoryItem[]).map((m) => voiced(m, people));
    const items = all.filter((m) => peopleOf(m).includes(personId) && !(m.person_id === personId && misfiledOn(m, person, people)));
    const byItem = await repos.memory.sourcesByItem();
    const quotes = (id: string) => (byItem.get(id) ?? [])
      .filter((s) => s.source_kind === "capture" && !s.deleted_at && typeof s.quote === "string").map((s) => String(s.quote));
    const origins = new Map(items.map((m) => [m.id, m.origin]));
    const provenance = (id: string) => {
      const sources = (byItem.get(id) ?? []).filter((s) => !s.deleted_at);
      if (!sources.length) return null;
      const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const origin = origins.get(id);
      return {
        line: provenanceLine(sources.map((s) => ({ source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at) })), now, typeof origin === "string" ? origin : null),
        noteId: notes[0]?.capture_id ?? null,
      };
    };
    const today = todayIso(now);
    const next = person.birthday ? nextBirthday(person.birthday, today) : null;
    const birthday = next && (about?.birthday || daysBetween(today, next) <= BIRTHDAY_IDEA_DAYS) ? { day: next } : null;
    const aboutItem = about?.itemId ? items.find((m) => m.id === about.itemId) ?? null : null;
    return { ideas: ideasFor({ person, items, today, about: aboutItem, birthday, quotes, provenance }), person };
  }, [personId, about?.itemId ?? null, about?.birthday ?? false, day]);
  return q.data ? { ...q.data, loading: false } : { ideas: [], person: null, loading: true };
}
