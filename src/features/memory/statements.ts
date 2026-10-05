// How a remembered statement reaches the screen (founder native pass F4/F6).
//
// Two guards that hold for everything already stored, whatever the server
// does (the gateway applies the same rules before saving, once deployed):
//   * the user is "you": "the writer" (the extraction prompt's word) is never
//     shown; "John is the writer's brother" reads "John is your brother";
//   * a statement that plainly leads with someone else ("John is your
//     brother", kept on Ben) stays off Ben's portrait and his People line
//     (silence beats a wrong detail). It still shows in What Kinship knows,
//     where the user can move it to John or change its words.
import { aboutSomeoneElse, displayStatement } from "../../../supabase/functions/_shared/extraction/voice";

export { displayStatement };

/** The item with its statement as the user should read it. */
export function voiced<T extends { statement: string }>(item: T): T {
  const statement = displayStatement(item.statement);
  return statement === item.statement ? item : { ...item, statement };
}

interface Named {
  id: string;
  display_name: string;
  full_name?: unknown;
  nicknames?: unknown;
}

function names(p: Named): string[] {
  const nick = Array.isArray(p.nicknames) ? p.nicknames.filter((n): n is string => typeof n === "string") : [];
  return [p.display_name, typeof p.full_name === "string" ? p.full_name : "", ...nick];
}

/**
 * The other person a statement filed on `person` is plainly about, if any.
 * Only person-subject statements are checked: "Sarah's sister…" (related)
 * and "You and Ben…" (shared) are about their page's person by design.
 */
export function misfiledOn<P extends Named>(
  item: { statement: string; subject_type?: unknown },
  person: P,
  people: P[],
): P | null {
  if (item.subject_type && item.subject_type !== "person") return null;
  const wrap = (p: P) => ({ p, names: names(p) });
  const all = people.map(wrap);
  const filed = all.find((x) => x.p.id === person.id) ?? wrap(person);
  return aboutSomeoneElse(item.statement, filed, all)?.p ?? null;
}
