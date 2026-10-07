// How Kinship names a person in what it says, and finds their name in a
// memory's words (founder round 4: I12 rename, I13 subject correction;
// KINSHIP_2_DECISIONS CC-18, option A).
//
//   * In a sentence, a name as Contacts gave it is said by its first name
//     ("Michelle"); a name the user typed, or chose by renaming, is said whole
//     ("Cutie Pie", "Aunt Linda").
//   * A rename keeps the earlier name as another name the person goes by
//     (people.nicknames): the full earlier name, and its first name when a
//     memory of theirs actually used it ("Wifey" from "Wifey Liu"). Their
//     memories then show the current name where the earlier one was written;
//     nothing stored is rewritten, and Source keeps the note's own words.
//   * Names are found only as whole words (a possessive "Wifey's" included),
//     only in memories linked to that person, and never where the same name
//     is someone else's too.

export interface NamedPerson {
  id: string;
  display_name: string;
  full_name?: unknown;
  nicknames?: unknown;
}

/** The person's other names (earlier names kept on rename). */
export function aliasesOf(p: NamedPerson): string[] {
  return Array.isArray(p.nicknames)
    ? p.nicknames.filter((n): n is string => typeof n === "string" && n.trim().length > 0).map((n) => n.trim())
    : [];
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? "";
}

/**
 * The name Kinship says in a sentence. A name exactly as Contacts gave it
 * (the full name is the name, never renamed) is shortened to its first word;
 * a name the user typed (no full name) or chose by renaming is said whole. A
 * record that doesn't say (no full_name field at all) reads as before: the
 * first word.
 */
export function shortName(p: NamedPerson): string {
  const name = p.display_name.trim();
  if (aliasesOf(p).length) return name;
  if (p.full_name === undefined) return firstName(name);
  return typeof p.full_name === "string" && p.full_name.trim() === name ? firstName(name) : name;
}

function fold(s: string): string {
  return s.normalize("NFC").toLocaleLowerCase().replace(/[’‘`]/gu, "'");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The name as a whole word (a possessive after it is fine; never inside another word). */
function wordRe(name: string): RegExp {
  const words = name.trim().split(/\s+/u).map(escapeRe).join("\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{M}'’-])(${words})(?![\\p{L}\\p{M}]|-\\p{L})`, "giu");
}

/** Whether the statement uses this name as a name: a whole, capitalised word. */
export function usesName(statement: string, name: string): boolean {
  if (!name.trim()) return false;
  for (const m of statement.matchAll(wordRe(name))) if (/^\p{Lu}/u.test(m[2])) return true;
  return false;
}

/** Every capitalised whole-word use of `from` becomes `to`; a possessive stays a possessive. */
export function replaceName(statement: string, from: string, to: string): string {
  if (!from.trim() || !to.trim()) return statement;
  return statement.replace(wordRe(from), (m, pre: string, word: string) => (/^\p{Lu}/u.test(word) ? `${pre}${to}` : m));
}

/** The names a person goes by now: display and full name, and their first names. */
function currentForms(p: NamedPerson): string[] {
  const full = typeof p.full_name === "string" ? p.full_name : "";
  return [p.display_name, full, firstName(p.display_name), firstName(full)].filter((n) => n.trim().length > 0);
}

/**
 * A memory linked to these people (filed on one, shared with the others), as
 * it reads with their current names: an earlier name of theirs, written as a
 * whole word, shows as the name they go by now ("Wifey has a new job" →
 * "Cutie Pie has a new job"). Never for an earlier name that is also anyone
 * else's name (`everyone`), so nothing is ever renamed on a guess.
 */
export function withCurrentNames(statement: string, linked: NamedPerson[], everyone: NamedPerson[]): string {
  let out = statement;
  for (const p of linked) {
    const now = new Set(currentForms(p).map(fold));
    const aliases = aliasesOf(p).filter((a) => !now.has(fold(a))).sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
      const k = fold(alias);
      const someoneElse = everyone.some((o) => o.id !== p.id && [...currentForms(o), ...aliasesOf(o)].some((n) => fold(n) === k));
      if (someoneElse) continue;
      out = replaceName(out, alias, shortName(p));
    }
  }
  return out;
}

/**
 * The other names a person goes by once renamed to `next`: the earlier full
 * name, and its first name when one of their memories used it (`statements`),
 * kept newest last, never the new name itself, at most 10.
 */
export function aliasesAfterRename(p: NamedPerson, next: string, statements: string[]): string[] {
  const prev = p.display_name.trim();
  const first = firstName(prev);
  const add = [prev, ...(first && first !== prev && statements.some((s) => usesName(s, first)) ? [first] : [])];
  const nextForms = new Set([next, firstName(next)].map(fold));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of [...aliasesOf(p), ...add]) {
    const k = fold(n);
    if (nextForms.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out.slice(-10);
}

/** "Wifey's friend…", "Ben's sister…": a possessive that names whose relative the line is about. */
const RELATIVE_AFTER = /^['’]s\s+(?:(?:best|old|new|little|big|older|younger|step|ex|future|late)[- ]?)?(?:friends?|sisters?|brothers?|siblings?|mom|mum|mother|dad|father|parents?|wife|husband|partner|girlfriend|boyfriend|fianc[eé]e?|sons?|daughters?|kids?|child|children|baby|cousins?|aunt|uncle|niece|nephew|grandma|grandpa|grandmother|grandfather|boss|manager|coworkers?|co-workers?|colleagues?|neighbou?rs?|roommates?|teacher|coach|doctor|in-laws?|family)\b/iu;

/** One or more names leading a statement: "Ben", "Ben Oxnard", "Sarah and Ben", "Ben's". */
const LEADING_NAMES = /^\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*)*(?:\s*(?:,|and|&)\s*\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*)*)*/u;

/**
 * A line moved from the wrong person to the right one (founder I13): where
 * the wrong person is who the line is about, named at its start ("Wifey has
 * a new job…", "Ben's new job…", "Sarah and Ben went…", "You and Wifey
 * are…"), the right person's name takes their place. Null when the line
 * doesn't name them as its subject ("She has a new job", "John is Ben's
 * brother", "Wifey's friend from work is moving"): its words are left alone.
 */
export function withSubjectMoved(statement: string, from: NamedPerson, to: NamedPerson): string | null {
  const prefix = statement.match(/^You and\s+/u)?.[0] ?? "";
  const rest = statement.slice(prefix.length);
  const block = rest.match(LEADING_NAMES)?.[0];
  if (!block) return null;
  const full = new Set([from.display_name, typeof from.full_name === "string" ? from.full_name : "", ...aliasesOf(from)]
    .map((n) => n.trim()).filter(Boolean));
  const forms = [...new Set([...full, ...[...full].map(firstName)])].sort((a, b) => b.length - a.length);
  for (const form of forms) {
    const pattern = form.split(/\s+/u).map(escapeRe).join("\\s+");
    const hit = new RegExp(`(^|[^\\p{L}\\p{M}'’-])(${pattern})(?![\\p{L}\\p{M}]|-\\p{L})`, "u").exec(block);
    if (!hit) continue;
    const at = hit.index + hit[1].length;
    const after = rest.slice(at + hit[2].length);
    // "Wifey's friend" is about the friend: whose friend stays as said.
    if (RELATIVE_AFTER.test(after)) return null;
    const name = full.has(form) && form.includes(" ") ? to.display_name.trim() : shortName(to);
    const moved = `${prefix}${rest.slice(0, at)}${name}${after}`;
    return moved === statement ? null : moved;
  }
  return null;
}
