// Someone added after they were mentioned (founder G20/G34; stabilization
// Gate F). "Sam is married to Michelle" was told before Michelle was in
// People; adding Michelle later never silently merges her with it. Her page
// asks once, quietly: "Is this the Michelle in 'Sam is married to Michelle'?"
// Yes puts that memory on her page too (one memory, one source) or, for a
// relative remembered on someone else ("Sam's wife Michelle"), links that
// record to her. No is remembered and never asked again. Pure: the hook
// supplies people, memory and what was already answered.
import { statementNames } from "../../../supabase/functions/_shared/extraction/voice";
import type { MemoryItem, Person, RelatedPerson } from "@/store/repositories";

export interface LinkSuggestion {
  /** Stable key, for "No" to be remembered. */
  key: string;
  kind: "item" | "related";
  /** The memory or related record it would connect. */
  targetId: string;
  /** "Is this the Michelle in “Sam is married to Michelle”?" */
  prompt: string;
}

function first(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? "";
}

function fold(s: string): string {
  return s.normalize("NFKC").toLocaleLowerCase();
}

export function linkSuggestions(input: {
  person: Person;
  people: Person[];
  items: MemoryItem[];
  related: RelatedPerson[];
  /** Keys the user already answered. */
  answered: Set<string>;
}): LinkSuggestion[] {
  const { person } = input;
  const name = first(person.display_name);
  if (!name) return [];
  const out: LinkSuggestion[] = [];
  const nameOf = (id: string) => input.people.find((p) => p.id === id)?.display_name.split(/\s+/u)[0] ?? "someone";
  // A relative remembered by name on someone else ("Sam's wife Michelle").
  for (const r of input.related) {
    if (r.person_id === person.id || !r.name || fold(first(r.name)) !== fold(name)) continue;
    if (typeof r.promoted_person_id === "string" && r.promoted_person_id) continue;
    const key = `related:${r.id}:${person.id}`;
    if (input.answered.has(key)) continue;
    out.push({ key, kind: "related", targetId: r.id, prompt: `Is this ${nameOf(r.person_id)}'s ${r.relation}, ${r.name}?` });
  }
  // A memory on someone else that names them ("Sam is married to Michelle").
  for (const m of input.items) {
    if (m.person_id === person.id || m.status !== "active" || m.deleted_at) continue;
    if (Array.isArray(m.with_person_ids) && m.with_person_ids.includes(person.id)) continue;
    if (!statementNames(m.statement, [name])) continue;
    const key = `item:${m.id}:${person.id}`;
    if (input.answered.has(key)) continue;
    out.push({ key, kind: "item", targetId: m.id, prompt: `Is this the ${name} in “${m.statement}”?` });
  }
  return out.slice(0, 3);
}
