// How Kinship names a person in what it says, and which words in a memory
// name which person (founder I12 rename, I13 subject correction; CC-18 option
// A, Gate 0 remediation decision 1b).
//
//   * In a sentence, a name as Contacts gave it is said by its first name
//     ("Michelle"); a name the user typed, or chose by renaming, is said whole
//     ("Cutie Pie", "Aunt Linda").
//   * Each line records, as structured data (memory_items.person_mentions),
//     the words it uses for each person it is about ("Wifey") and the name
//     that person went by when those words were recorded. That record is the
//     one mechanism behind renames (I12) and corrections (I13); nothing else
//     guesses names out of a line's words.
//   * The user's own words stay until the person is explicitly renamed:
//     "Liz got promoted" reads as written while she is still "Elizabeth
//     Chen"; renamed to "Lizzie", it reads "Lizzie got promoted". Source
//     always keeps the note's own words.
//   * A rename also keeps the earlier name as another name the person goes by
//     (people.nicknames), so a later note that still says it finds them.

import { kinshipReference, PRONOUNS } from "./lexicon.ts";

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

/** The run of names a statement opens with: "Ben", "Ben Oxnard", "Sarah and Ben", "Ben's" (possessive dropped). */
const LEADING_NAMES = /^\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*)*(?:\s*(?:,|and|&)\s*\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*)*)*/u;

/** The names a statement leads with, as written ("Sarah and Ben went…" → Sarah, Ben); never a pronoun or "You". */
export function leadingNames(statement: string): string[] {
  const rest = statement.trim().replace(/^You and\s+/u, "");
  const block = rest.match(LEADING_NAMES)?.[0] ?? "";
  return block.split(/\s*(?:,|\band\b|&)\s*/u)
    .map((n) => n.replace(/['’]s$/u, "").trim())
    .filter((n) => n && nameLike(n));
}

// ─── Per-line person mentions (founder I12, I13) ────────────────────────────

/** Which words in a line name which person (memory_items.person_mentions). */
export interface PersonMention {
  /** The person these words name; null while a held line still waits on "who?". */
  person_id: string | null;
  /** The words, exactly as the line writes them ("Wifey", "Ben Oxnard"). */
  text: string;
  /**
   * The person's name in People when these words were recorded as theirs.
   * Null when the words are an earlier name of theirs (or, for older lines,
   * not known): the line then reads with the name they go by now.
   */
  name: string | null;
}

export const MAX_MENTIONS = 8;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const NEW_REF = /^new:[0-7]$/u;

/** A line's stored mentions, keeping only well-formed ones. */
export function mentionsOf(v: unknown): PersonMention[] {
  if (!Array.isArray(v)) return [];
  const out: PersonMention[] = [];
  for (const m of v) {
    if (!m || typeof m !== "object") continue;
    const { person_id, text, name } = m as Record<string, unknown>;
    if (person_id !== null && (typeof person_id !== "string" || !person_id)) continue;
    if (typeof text !== "string" || !text.trim() || text.length > 100) continue;
    if (name !== null && (typeof name !== "string" || name.length > 100)) continue;
    out.push({ person_id, text, name });
  }
  return out.slice(0, MAX_MENTIONS);
}

/** Whether a stored mention may go to the database as written (ids, or "new:N" for someone added in the same answer). */
export function storableMention(m: PersonMention): boolean {
  return typeof m.person_id === "string" && (UUID.test(m.person_id) || NEW_REF.test(m.person_id));
}

const NOT_A_NAME = new Set([...PRONOUNS, "you", "your", "yours", "i", "i'm", "me", "my", "mine", "we", "us", "our", "ours",
  "it", "its", "the", "a", "an", "this", "that", "these", "those", "there", "here", "someone", "somebody", "everyone", "everybody", "nobody"]);

/** Words that can name a person: capitalised, never a pronoun, "you" or a family word ("Mom"). */
function nameLike(text: string): boolean {
  const t = text.trim();
  if (!/^\p{Lu}/u.test(t)) return false;
  const first = fold(firstName(t));
  if (NOT_A_NAME.has(first)) return false;
  return !kinshipReference(t);
}

/** Every capitalised whole-word use of `text` in the statement, with where it is. */
function usesOf(statement: string, text: string): { at: number; word: string }[] {
  if (!text.trim()) return [];
  const out: { at: number; word: string }[] = [];
  for (const m of statement.matchAll(wordRe(text))) {
    if (!/^\p{Lu}/u.test(m[2])) continue;
    out.push({ at: (m.index ?? 0) + m[1].length, word: m[2] });
  }
  return out;
}

/** Replaces the one use of `text` in the statement; null unless it is written there exactly once. */
function replaceOnce(statement: string, text: string, to: string): string | null {
  const uses = usesOf(statement, text);
  if (uses.length !== 1) return null;
  const { at, word } = uses[0];
  return `${statement.slice(0, at)}${to}${statement.slice(at + word.length)}`;
}

/**
 * The words naming someone who goes by any of `forms`, as the statement
 * writes them: the longest form written there exactly once. Null when none
 * is, or when their name appears more than once (which words would be
 * theirs is then a guess).
 */
export function findMention(statement: string, forms: string[]): string | null {
  return locate(statement, forms).text;
}

/**
 * Where the statement names someone going by `forms`: longest names first,
 * a shorter one counted only outside a longer one already found ("Loo" in
 * "Loo Loo" is that same name), so "named twice" means two separate places.
 */
function locate(statement: string, forms: string[]): { text: string | null; repeated: boolean } {
  const usable = [...new Set(forms.map((f) => f.trim()).filter((f) => f && nameLike(f)))].sort((a, b) => b.length - a.length);
  let rest = statement;
  let found = 0;
  let best: string | null = null;
  for (const form of usable) {
    const uses = usesOf(rest, form);
    if (!uses.length) continue;
    found += uses.length;
    best ??= uses[0].word;
    // Set this name aside (same length, never a letter) so a shorter form inside it isn't counted again.
    for (const u of [...uses].reverse()) rest = `${rest.slice(0, u.at)}${"#".repeat(u.word.length)}${rest.slice(u.at + u.word.length)}`;
  }
  if (found > 1) return { text: null, repeated: true };
  return { text: best, repeated: false };
}

/** Whether `p` goes by these words: a name of theirs now, an earlier one, or one their lines use for them (`also`). */
export function goesBy(p: NamedPerson, text: string, also: string[] = []): boolean {
  const k = fold(text.trim());
  return [...currentForms(p), ...aliasesOf(p), ...also].some((n) => fold(n.trim()) === k);
}

/**
 * Whether these words are a name `p` was called before rather than one they
 * go by now: a name kept at a rename (`nicknames`), or one their lines used
 * under an earlier name (`earlier`). Never their current name.
 */
export function isEarlierName(p: NamedPerson, text: string, earlier: string[] = []): boolean {
  const k = fold(text.trim());
  if (currentForms(p).some((n) => fold(n) === k)) return false;
  return [...aliasesOf(p), ...earlier].some((n) => fold(n.trim()) === k);
}

/** The mention to record for words naming `p` in a line written now. */
export function mentionFor(p: NamedPerson, text: string, earlier: string[] = []): PersonMention {
  return { person_id: p.id, text, name: isEarlierName(p, text, earlier) ? null : p.display_name.trim() };
}

export interface MentionSubject {
  person: NamedPerson;
  /** Other words resolved to them: the note's own word for them, names their lines use. */
  also?: string[];
  /** Words their lines used under an earlier name (see isEarlierName). */
  earlier?: string[];
}

/**
 * The mentions for the people a line is about: each person's words in it,
 * found among the names they go by (and the words resolved to them), only
 * where the words are unmistakably theirs: written once, and never also a
 * name of someone else the line is about.
 */
export function recordMentions(statement: string, subjects: MentionSubject[]): PersonMention[] {
  const own = (s: MentionSubject) => [...currentForms(s.person), ...aliasesOf(s.person)];
  const formsOf = (s: MentionSubject) => [...own(s), ...(s.also ?? [])];
  const out: PersonMention[] = [];
  for (const s of subjects) {
    if (out.some((m) => m.person_id === s.person.id)) continue;
    // Their own names first ("Aunt Chrissy" keeps "Aunt"); a name of theirs
    // written twice leaves them unrecorded rather than half-renamed.
    const mine = locate(statement, own(s));
    if (mine.repeated) continue;
    const text = mine.text ?? locate(statement, s.also ?? []).text;
    if (!text) continue;
    const shared = subjects.some((o) => o.person.id !== s.person.id && formsOf(o).some((f) => fold(f.trim()) === fold(text)));
    if (shared) continue;
    out.push(mentionFor(s.person, text, s.earlier));
  }
  return out.slice(0, MAX_MENTIONS);
}

/**
 * How a line reads now (founder I12, decision 1b). Words recorded as a
 * person's under an earlier name of theirs show the name they go by now
 * ("Wifey got promoted" → "Loo Loo got promoted"); words recorded under
 * their current name stay as the user wrote them. Only people the line is
 * about (`linked`), only the recorded words, only when written once.
 */
export function withMentionNames(statement: string, mentions: PersonMention[], people: NamedPerson[], linked: string[]): string {
  let out = statement;
  for (const m of mentions) {
    if (!m.person_id || !linked.includes(m.person_id)) continue;
    const p = people.find((x) => x.id === m.person_id);
    if (!p) continue;
    if (m.name !== null && m.name === p.display_name.trim()) continue;
    const now = shortName(p);
    if (now === m.text) continue;
    out = replaceOnce(out, m.text, now) ?? out;
  }
  return out;
}

/**
 * A line that is now about `to` (founder I13): wherever its recorded words
 * named the person it was about (`fromId`, or the open "who?" of a held line
 * when null), the chosen person's name takes their place, unless the chosen
 * person goes by those very words (a Samantha called Sam: the words stay).
 * With no recorded words for the subject, the words stay as they are.
 */
export function withSubjectReassigned(
  statement: string,
  mentions: PersonMention[],
  fromId: string | null,
  to: MentionSubject,
): { statement: string; mentions: PersonMention[] } {
  const subject = mentions.find((m) => m.person_id === fromId);
  const rest = mentions.filter((m) => m !== subject && m.person_id !== to.person.id);
  const already = mentions.find((m) => m !== subject && m.person_id === to.person.id);
  // The chosen person is already named in the line ("Michelle and Sam…" moved
  // to Sam): their words stay theirs; the old subject's words are left alone.
  if (already) return { statement, mentions: [...rest, already].slice(0, MAX_MENTIONS) };
  if (!subject) {
    const own = recordMentions(statement, [to]);
    return { statement, mentions: [...rest, ...own].slice(0, MAX_MENTIONS) };
  }
  if (goesBy(to.person, subject.text, to.also)) {
    return { statement, mentions: [...rest, mentionFor(to.person, subject.text, to.earlier)].slice(0, MAX_MENTIONS) };
  }
  const name = shortName(to.person);
  const moved = replaceOnce(statement, subject.text, name);
  if (moved === null) return { statement, mentions: rest };
  return { statement: moved, mentions: [...rest, mentionFor(to.person, name, to.earlier)].slice(0, MAX_MENTIONS) };
}

/**
 * The words a person's own lines use for them (founder I12), from those
 * lines' recorded mentions: all of them, and those recorded under an earlier
 * name of theirs.
 */
export function lineNamesOf(p: NamedPerson, rows: { person_mentions?: unknown }[]): { also: string[]; earlier: string[] } {
  const also = new Map<string, string>();
  const earlier = new Map<string, string>();
  for (const row of rows) {
    for (const m of mentionsOf(row.person_mentions)) {
      if (m.person_id !== p.id) continue;
      const k = fold(m.text.trim());
      also.set(k, m.text.trim());
      if (m.name === null || m.name !== p.display_name.trim()) earlier.set(k, m.text.trim());
    }
  }
  return { also: [...also.values()].slice(0, 10), earlier: [...earlier.values()].slice(0, 10) };
}

/**
 * The mentions of a line after the user rewrote its words (their words win,
 * contract §7.4): each person's recorded words that are still written there,
 * now said under the name they go by; and, for anyone else it is about, their
 * name where the new words write it.
 */
export function mentionsAfterEdit(statement: string, before: PersonMention[], subjects: MentionSubject[]): PersonMention[] {
  const kept: PersonMention[] = [];
  for (const s of subjects) {
    const m = before.find((x) => x.person_id === s.person.id);
    if (m && usesOf(statement, m.text).length === 1) kept.push({ person_id: s.person.id, text: m.text, name: s.person.display_name.trim() });
  }
  const rest = subjects.filter((s) => !kept.some((m) => m.person_id === s.person.id));
  return [...kept, ...recordMentions(statement, rest)].slice(0, MAX_MENTIONS);
}
