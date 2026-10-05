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
// Stabilization Gate B: the model is now asked to write "you" itself (prompt
// v6), so this is a defensive guard, and a wide one: "Writer told Michelle…"
// (no "the", capitalised) is the internal reference too, and so is a "their"
// or "they'd" that points back at the user ("you and their daughter Kaiya" →
// "you and your daughter Kaiya"). Two more renderings live here because both
// sides need them: a pronoun the user has just resolved becomes the person's
// name ("He wants to go back" → "John wants to go back"), and a promise reads
// as the user's own to-do ("Send Michelle that restaurant").
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

/** The internal words for the author, as they may appear bare ("Writer told…"). */
const BARE = String.raw`(?:writer|user|author|narrator)`;
/** Words that make a bare "writer" someone's job, not the note's author ("a writer", "his favourite author"). */
const DETERMINERS = new Set(["a", "an", "the", "my", "your", "his", "her", "their", "our", "its", "this", "that", "every", "each", "any",
  "favourite", "favorite", "famous", "great", "good", "best", "new", "old", "former", "fellow", "technical", "freelance", "staff",
  "travel", "food", "sports", "fiction", "children's", "children’s", "ghost", "song", "script", "screen", "copy", "tech", "power", "heavy",
  "first", "real", "is", "was", "as", "be", "been", "being", "become", "became", "becoming", "professional", "published", "aspiring"]);

/**
 * "Writer told Michelle…", "and writer", "Author's sister": the internal
 * reference without "the". Normalised to "the writer" so the rules below
 * apply. A bare word after a determiner or an adjective is left alone ("Ben
 * is a writer", "her favourite author").
 */
function normaliseBare(statement: string): string {
  const re = new RegExp(String.raw`(^|[^\p{L}'’])(${BARE})(?=['’]s\b|[^\p{L}'’]|$)`, "giu");
  return statement.replace(re, (m: string, lead: string, word: string, offset: number, whole: string) => {
    const before = whole.slice(0, offset + lead.length).trimEnd();
    const prev = (before.match(/([\p{L}'’]+)$/u)?.[1] ?? "").toLocaleLowerCase();
    if (prev && (DETERMINERS.has(prev) || prev === "note's" || prev === "note’s")) return m;
    const capitalised = /^\p{Lu}/u.test(word);
    const sentenceStart = before === "" || /[.!?:;]$/u.test(before);
    // Lower case mid-sentence ("asked writer to…") only after the words that take a person.
    if (!capitalised && !sentenceStart && !/^(and|with|to|for|told|asked|tell|ask|reminded|promised|gave|sent|invited|called|texted|met)$/u.test(prev)) {
      return m;
    }
    return `${lead}${sentenceStart ? "The" : "the"} writer`;
  });
}

/** Whether a statement still refers to the user as "the writer" (or "the user", or a bare "Writer"). */
export function mentionsInternalSelf(statement: string): boolean {
  return SELF_RE.test(statement) || normaliseBare(statement) !== statement;
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
  if (!mentionsInternalSelf(statement)) {
    // Already "you", from before this guard knew about "their" (stored rows):
    // "You and their daughter Kaiya", "You told Michelle they'd send her…".
    const repaired = repairStoredYou(statement);
    return { text: repaired, certain: true, changed: repaired !== statement };
  }
  let certain = true;
  let text = normaliseBare(statement);
  const plural = hasOtherPlural(text);

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

  // A "their", "they'd" or "them" that points back at the user is "you" too:
  // the model calls the author "they" ("Writer told Michelle they'd send her
  // that restaurant", "the writer and their daughter Kaiya"). Only when no one
  // else in the statement could be "they"; otherwise it's left, and not
  // certain.
  if (/\b(they|their|theirs|them|themselves|themself)\b|\bthey['’](d|ll|re|ve)\b/iu.test(text)) {
    if (plural) certain = false;
    else text = theyToYou(text);
  }

  // "Ben and you booked…" reads as "You and Ben booked…".
  text = text.replace(/^([\p{Lu}][\p{L}\p{M}'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}'’-]*)?)\s+and\s+you\b/u, "You and $1");
  // Sentence starts are capitalised: "you and Ben are…" → "You and Ben are…".
  text = text.replace(/(^|[.!?]\s+)(you|your|yourself|yours)\b/gu, (_m, lead: string, w: string) => lead + capital(w));
  if (mentionsInternalSelf(text)) certain = false;
  return { text, certain, changed: true };
}

/**
 * Someone else in the statement who could be "they": two other people joined
 * ("Ben and Sara"), or a plural group ("the kids", "her parents"). The user
 * with someone ("the writer and Ben") isn't: "their" there is "your".
 */
function hasOtherPlural(text: string): boolean {
  const noSelf = text.replace(new RegExp(String.raw`\b${SELF}\b(?:\s+and\s+[\p{L}'’]+)?|\b[\p{L}'’]+\s+and\s+${SELF}\b`, "giu"), "SELF");
  if (/\b\p{Lu}[\p{L}'’-]*\s+(?:and|&)\s+\p{Lu}[\p{L}'’-]*/u.test(noSelf.replace(/^SELF\b/u, ""))) return true;
  return /\b(kids|children|parents|family|friends|folks|guys|team|couple|twins|everyone|people|both|siblings|brothers|sisters|grandparents|neighbou?rs|boys|girls|cousins|in-laws|roommates|coworkers|colleagues)\b/iu.test(noSelf);
}

/**
 * Lines already turned into "you" that kept the model's "they" for the user.
 * Only the shapes where "they" can be no one else: "you and their …" and
 * "you told/promised Michelle they'd …".
 */
function repairStoredYou(text: string): string {
  if (!/\byou\b/iu.test(text) || !/\bthe(y|ir)\b|\bthey['’]/iu.test(text)) return text;
  return text
    .replace(/\b(you|You)(\s+and\s+)their\b/gu, "$1$2your")
    .replace(/\b(you|You)(\s+(?:told|promised|assured|said to)\s+\p{Lu}[\p{L}\p{M}'’-]*\s+(?:that\s+)?)they(['’]d|['’]ll|\s+would|\s+will)\b/gu, "$1$2you$3");
}

/** "they'd" → "you'd", "their" → "your", "them" → "you", "they are" → "you are". */
function theyToYou(text: string): string {
  const keepCase = (orig: string, rep: string) => (/^\p{Lu}/u.test(orig) ? capital(rep) : rep);
  return text
    .replace(/\bthey(['’])(d|ll|re|ve)\b/giu, (m: string, q: string, tail: string) => keepCase(m, `you${q}${tail}`))
    .replace(/\bthemsel(?:f|ves)\b/giu, (m: string) => keepCase(m, "yourself"))
    .replace(/\btheirs\b/giu, (m: string) => keepCase(m, "yours"))
    .replace(/\btheir\b/giu, (m: string) => keepCase(m, "your"))
    .replace(/\bthem\b/giu, (m: string) => keepCase(m, "you"))
    .replace(/\bthey(\s+)(is|was|has|does)\b/giu, (m: string, sp: string, v: string) => keepCase(m, `you${sp}${AUX[v.toLowerCase()] ?? v}`))
    .replace(/\bthey\b/giu, (m: string) => keepCase(m, "you"));
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

// ─── After the user said who ────────────────────────────────────────────────

/**
 * "He wants to go back to Tahoe in December", once the user said "he" is John:
 * "John wants to go back to Tahoe in December". A leading he / she / his / her
 * becomes the name; anything else is left as it is.
 */
export function withResolvedName(statement: string, name: string): string {
  const first = name.trim().split(/\s+/u)[0];
  if (!first) return statement;
  return statement
    .replace(/^(He|She)(\s)/u, `${first}$2`)
    .replace(/^(He|She)['’]s(\s)/u, `${first}'s$2`)
    .replace(/^(His|Her)(\s)/u, `${first}'s$2`);
}

// ─── The user's own promises ────────────────────────────────────────────────

/**
 * A promise the user made, read as their own to-do (Gate B): "You told
 * Michelle you'd send her that restaurant" → "Send Michelle that restaurant";
 * "You said you'd introduce Matt to Alex" → "Introduce Matt to Alex". Only
 * when the words allow it; anything else is left as it is.
 */
export function promiseLine(statement: string): string {
  const s = statement.trim().replace(/[.]$/u, "");
  const told = s.match(/^You\s+(?:told|promised|assured)\s+(\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*)?)\s+(?:that\s+)?you(?:['’]d|['’]ll|\s+would|\s+will)\s+(.+)$/u);
  if (told) {
    const [, who, rest] = told;
    // "send her that restaurant": the pronoun is the person told.
    const named = rest.replace(/^(\S+)\s+(her|him|them)\b/u, `$1 ${who}`);
    if (named !== rest) return capital(named);
    if (new RegExp(`\\b${who.split(/\s+/u)[0]}\\b`, "u").test(rest)) return capital(rest);
    return statement;
  }
  const said = s.match(/^You\s+(?:said|promised|offered)\s+(?:that\s+)?(?:you(?:['’]d|['’]ll|\s+would|\s+will)|to)\s+(.+)$/u);
  if (said) return capital(said[1]);
  const will = s.match(/^You(?:['’]ll|\s+will|\s+need\s+to|\s+have\s+to|\s+should|['’]re\s+going\s+to|\s+are\s+going\s+to)\s+(.+)$/u);
  if (will) return capital(will[1]);
  return statement;
}
