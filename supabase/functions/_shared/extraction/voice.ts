// The user is "you" (founder native pass, F4/F6).
//
// The extraction prompt calls the note's author "the writer", and the model
// sometimes carries that into a statement ("John is the writer's brother").
// Statements are read by the user, in the user's own app, so "the writer" must
// never reach them. This rewrites the internal reference into the second
// person ("John is your brother", "You and Ben are skiing Tahoe") and says
// whether the rewrite is certain. The extraction pipeline drops a statement it
// can't rewrite with certainty (silence beats a wrong detail); screens use the
// best-effort text for anything already stored, so the phrase is never shown.
//
// Shared by the gateway (Deno) and the app: plain TypeScript, no imports.

/** The phrases that mean the note's author. */
const SELF = String.raw`the\s+(?:note['’]?s\s+)?(?:writer|user|author|narrator)`;
const SELF_RE = new RegExp(String.raw`\b${SELF}\b`, "iu");

export interface Voiced {
  text: string;
  /** False when a verb after "you" might be left in the wrong form. */
  certain: boolean;
  changed: boolean;
}

/** Whether a statement still refers to the user as "the writer" (or "the user"). */
export function mentionsInternalSelf(statement: string): boolean {
  return SELF_RE.test(statement);
}

const AUX: Record<string, string> = {
  is: "are", was: "were", has: "have", does: "do",
  "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't", "doesn't": "don't",
  "isn’t": "aren’t", "wasn’t": "weren’t", "hasn’t": "haven’t", "doesn’t": "don’t",
};
/** Words that leave the verb alone after "you" (modals, past forms, adverbs that pass the verb along). */
const KEEP_AFTER = new Set([
  "will", "would", "can", "could", "should", "shall", "might", "may", "must", "did", "had", "didn't", "didn’t",
  "won't", "won’t", "can't", "can’t", "couldn't", "couldn’t", "wouldn't", "wouldn’t", "shouldn't", "shouldn’t",
  "and", "or", "to", "too", "also", "now", "then", "both", "together", "once", "first",
]);
const ADVERBS = new Set(["always", "never", "often", "usually", "still", "just", "really", "sometimes", "also", "already", "only", "recently"]);
/** "-s" words that aren't third-person verbs. */
const NOT_VERBS = new Set(["always", "sometimes", "perhaps", "afterwards", "towards", "this", "his", "hers", "its", "yes", "plus", "thus", "ourselves"]);
/** Words before "the writer" that make it the subject of what follows ("Ben said the writer is…"). */
const SUBJECT_LEADS = new Set([
  "that", "when", "while", "because", "if", "since", "until", "after", "before", "so", "and", "or", "but",
  "said", "says", "thinks", "knows", "hopes", "heard", "told", "believes", "realized", "realised",
]);

/** "wants" → "want", "watches" → "watch", "tries" → "try"; null when it isn't a plain -s verb. */
function baseForm(word: string): string | null {
  const w = word.toLocaleLowerCase();
  if (!/^[a-z]+s$/u.test(w) || NOT_VERBS.has(w) || w.length < 3 || w.endsWith("ss") || w.endsWith("us") || w.endsWith("is")) return null;
  if (/[^aeiou]ies$/u.test(w)) return word.slice(0, -3) + "y";
  if (/(?:ches|shes|sses|xes|zes|oes)$/u.test(w)) return word.slice(0, -2);
  return word.slice(0, -1);
}

function capital(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/**
 * Rewrites "the writer" (and "the user", "the author", "the note's writer")
 * into "you" / "your", fixing the verb that follows when it is the subject.
 */
export function yourVoice(statement: string): Voiced {
  if (!mentionsInternalSelf(statement)) return { text: statement, certain: true, changed: false };
  let certain = true;
  let text = statement;

  // Reflexive: "the writer themself" → "yourself".
  text = text.replace(new RegExp(String.raw`\b${SELF}\s+(?:themselves|themself|himself|herself)\b`, "giu"), "yourself");

  // Possessive or contraction: "the writer's sister" → "your sister";
  // "the writer's going" (= is going) → "you're going".
  text = text.replace(new RegExp(String.raw`\b${SELF}['’]s(\s+)(\S+)`, "giu"), (_m, sp: string, next: string) =>
    /ing\b/u.test(next) ? `you're${sp}${next}` : `your${sp}${next}`);
  text = text.replace(new RegExp(String.raw`\b${SELF}['’]s\b`, "giu"), "yours");

  // "the writer" followed by its verb, when it is the subject.
  const re = new RegExp(String.raw`\b${SELF}\b(\s+)?([\p{L}'’]+)?`, "giu");
  text = text.replace(re, (match: string, sp: string | undefined, next: string | undefined, offset: number, whole: string) => {
    const before = whole.slice(0, offset).trimEnd();
    const prevWord = (before.match(/([\p{L}'’]+)[,;:]?$/u)?.[1] ?? "").toLocaleLowerCase();
    const isSubject = before === "" || /[.!?]$/u.test(before) || SUBJECT_LEADS.has(prevWord) || /,$/u.test(before);
    if (!next) return "you";
    const space = sp ?? "";
    const lower = next.toLocaleLowerCase();
    if (!isSubject) {
      // Object position ("brought the writer tiles"). An auxiliary right after
      // it still means it was the subject ("Ben thinks the writer is…").
      if (AUX[lower]) return `you${space}${AUX[lower]}`;
      return `you${space}${next}`;
    }
    if (AUX[lower]) return `you${space}${AUX[lower]}`;
    if (KEEP_AFTER.has(lower) || /ed$/u.test(lower) || !/s$/u.test(lower)) return `you${space}${next}`;
    if (ADVERBS.has(lower)) return `you${space}${next}`;
    const base = baseForm(next);
    if (base) return `you${space}${base}`;
    certain = false;
    return `you${space}${next}`;
  });

  // "the writer always runs" → "you always run": an adverb passed the verb along.
  text = text.replace(/\b(you|You)(\s+)(always|never|often|usually|still|just|really|sometimes|also|already|only|recently)(\s+)([a-z]+s)\b/gu,
    (m: string, you: string, s1: string, adv: string, s2: string, verb: string) => {
      const base = baseForm(verb);
      return base ? `${you}${s1}${adv}${s2}${base}` : m;
    });

  // "Ben and you booked…" reads as "You and Ben booked…".
  text = text.replace(/^([\p{Lu}][\p{L}\p{M}'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}'’-]*)?)\s+and\s+you\b/u, "You and $1");
  // Sentence starts are capitalised: "you and Ben are…" → "You and Ben are…".
  text = text.replace(/(^|[.!?]\s+)(you|your|yourself|yours)\b/gu, (_m, lead: string, w: string) => lead + capital(w));
  if (mentionsInternalSelf(text)) certain = false;
  return { text, certain, changed: true };
}

/** What a screen shows: the second-person text, never the internal reference. */
export function displayStatement(statement: string): string {
  return yourVoice(statement).text;
}

// ─── Whose statement is it? ─────────────────────────────────────────────────

/** Words a statement can start with that are never a person's name. */
const NOT_A_LEAD = new Set(["you", "your", "the", "a", "an", "his", "her", "their", "our", "my", "he", "she", "they", "we", "it", "this", "that", "mom", "dad", "mum"]);

function key(word: string): string {
  return word.normalize("NFC").toLowerCase().replace(/[’‘`]/gu, "'").normalize("NFD").replace(/\p{M}+/gu, "").replace(/'s$/u, "").trim();
}

/**
 * The name a statement leads with ("John is your brother" → "John",
 * "John Oxnard is…" → "John Oxnard", "John's dog died" → "John"); null for
 * "You and Ben…", "His…", "Ben and Sam…".
 */
export function leadingName(statement: string): string | null {
  const words = statement.trim().split(/\s+/u).map((w) => w.replace(/[.,;:!?]+$/u, ""));
  const w0 = words[0] ?? "";
  if (!/^\p{Lu}/u.test(w0)) return null;
  const possessive = /['’]s$/u.test(w0);
  const first = w0.replace(/['’]s$/u, "");
  if (!first || NOT_A_LEAD.has(key(first))) return null;
  if (possessive) return first;
  let name = first;
  let next = 1;
  const w1 = words[1] ?? "";
  if (/^\p{Lu}/u.test(w1) && !/^(and|or)$/iu.test(w1)) {
    name = `${first} ${w1.replace(/['’]s$/u, "")}`;
    next = 2;
  }
  // "Ben and Sam…", "Ben & Sam…": a pair, not one person.
  if (/^(and|&|or)$/iu.test(words[next] ?? "")) return null;
  return name;
}

/** Whether a statement's words name this person (any of their names, or their first name). */
export function statementNames(statement: string, names: string[]): boolean {
  const words = new Set((statement.match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []).map(key));
  return names.filter(Boolean).some((n) => {
    const k = key(n);
    return words.has(k) || words.has(k.split(/\s+/u)[0]);
  });
}

/**
 * For a statement filed on `filed`: the one other person it plainly leads
 * with, when it doesn't name `filed` at all ("John is your brother" on Ben's
 * page → John). Null when it's fine where it is or it can't be told.
 */
export function aboutSomeoneElse<P extends { names: string[] }>(statement: string, filed: P, others: P[]): P | null {
  const lead = leadingName(statement);
  if (!lead || statementNames(statement, filed.names)) return null;
  const k = key(lead);
  const first = k.split(/\s+/u)[0];
  const match = others.filter((o) => o !== filed && o.names.filter(Boolean).some((n) => {
    const nk = key(n);
    return nk === k || nk.split(/\s+/u)[0] === first;
  }));
  return match.length === 1 ? match[0] : null;
}
