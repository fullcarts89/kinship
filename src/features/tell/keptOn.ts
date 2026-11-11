// Every Tell is kept where the user can find it (founder, 10 Nov 2026, after a spoken note about Kaiya
// came back "Nothing to remember in that one": "This needs to be logged every time. That's a tender
// moment you're sharing with Kinship"). This supersedes J4's "Nothing to remember" for a note that kept
// no line: the note itself is kept, in the user's words, on the page of whoever it was told about.
//
//   told about   a note told from someone's page (context person) belongs on their page;
//   names        otherwise, each person in People the note names by their own name, whole words, any
//                case; a name two people share places it on neither (never a guess about who);
//   no one       a note that names no one in People is said to be kept, in the user's words.
//
// Pure: the review's card and a person's Pages read the same rule.
import type { Person } from "@/store/repositories";
import { firstName, shortName } from "../../../supabase/functions/_shared/extraction/names";
import { nameSpans } from "./voice/names";

type NamedPerson = Pick<Person, "id" | "display_name"> & { full_name?: string | null; deleted_at?: unknown; state?: unknown };

/** Who a note belongs with, in People's order: the person it was told about, else the people it names. */
export function keptOnPeople(
  note: { raw_text: string | null; context_person_id: string | null },
  people: readonly NamedPerson[],
): string[] {
  const here = people.filter((p) => !p.deleted_at && p.state !== "archived");
  if (note.context_person_id && here.some((p) => p.id === note.context_person_id)) return [note.context_person_id];
  const text = note.raw_text ?? "";
  if (!text.trim()) return [];
  // Each name a person goes by, and who goes by it.
  const owners = new Map<string, Set<string>>();
  for (const p of here) {
    const full = p.display_name.trim();
    for (const name of new Set([full, firstName(full)])) {
      if (name.length < 2) continue;
      const key = name.toLocaleLowerCase();
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key)!.add(p.id);
    }
  }
  const found = new Set<string>();
  for (const span of nameSpans(text, [...owners.keys()])) {
    const who = owners.get(text.slice(span.start, span.end).toLocaleLowerCase());
    if (who && who.size === 1) found.add([...who][0]);
  }
  return here.filter((p) => found.has(p.id)).map((p) => p.id);
}

/** "Kept on Kaiya's page.", "Kept on Kaiya's and Ben's pages.", or "Kept your words." for no one. */
export function keptOnCopy(names: readonly string[]): string {
  if (!names.length) return "Kept your words.";
  const owned = names.map((n) => `${n}'s`);
  if (owned.length === 1) return `Kept on ${owned[0]} page.`;
  const list = owned.length === 2 ? owned.join(" and ") : `${owned.slice(0, -1).join(", ")} and ${owned[owned.length - 1]}`;
  return `Kept on ${list} pages.`;
}

/** The names the card says, as the app says them elsewhere. */
export function keptOnNames(ids: readonly string[], people: readonly NamedPerson[]): string[] {
  return ids.map((id) => people.find((p) => p.id === id)).filter((p): p is NamedPerson => !!p).map((p) => shortName(p as Parameters<typeof shortName>[0]));
}
