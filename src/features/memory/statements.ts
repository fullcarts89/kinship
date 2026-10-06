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
//   * (stabilization Gate B) a line whose "he" the user already resolved names
//     the person ("He wants to go back…" on John → "John wants to go back…");
//     a promise the user made reads as their own to-do ("Send Michelle that
//     restaurant").
import { aboutSomeoneElse, displayStatement, promiseLine, withResolvedName } from "../../../supabase/functions/_shared/extraction/voice";

export { displayStatement };

/**
 * The item with its statement as the user should read it. Pass the user's
 * people to name a leading "He"/"She" by the person it's filed on.
 */
export function voiced<T extends { statement: string; kind?: unknown; subject_type?: unknown; person_id?: unknown }>(
  item: T,
  people?: unknown,
): T {
  let statement = displayStatement(item.statement);
  if (Array.isArray(people) && typeof item.person_id === "string" && /^(He|She|His|Her)\b/u.test(statement)) {
    const p = (people as Named[]).find((x) => x.id === item.person_id);
    if (p && (item.subject_type === undefined || item.subject_type === "person" || item.subject_type === "shared")) {
      statement = withResolvedName(statement, p.display_name);
    }
  }
  if (item.kind === "promise" && (item.subject_type === undefined || item.subject_type === "user")) statement = promiseLine(statement);
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
