// Sentences of a spoken note that has no sentence punctuation (CMR-1 C, 15 Nov 2026).
//
// A voice transcript often arrives as one long run of words ("seun's dad passed away on sunday the funeral
// is next saturday in houston he's flying out tomorrow i want to send flowers"). Read as one sentence, every
// sentence-scoped check (the clause a negation lives in, whose promise "i said id" is, a possessive
// relation beside a name) sees the whole transcript. This is a deterministic, conservative segmentation
// for a spoken run: text with no punctuation at all (no stop, no comma) and at least SPOKEN_RUN_WORDS
// words, which a typed note practically never is. It splits only at boundaries that cannot be inside a
// clause, and never inside a quoted phrase or between a verb and its object. Punctuated text, and a short
// unpunctuated note ("I got the job and I'm moving to Austin"), are never touched: the sentence helpers
// keep their byte-identical behaviour for them.
//
// Boundaries, each starting a new segment:
//   1. a coordinator or filler ("and", "but", "so", "then", "also", "anyway", "plus", "oh", "um", "uh",
//      "ok", "okay"), when the next real word is a subject: a subject pronoun, a time adverbial, or a name
//      from People that is not part of a pair ("mark and will are doing", "call Ben Kim and Ben": one
//      subject or one object). A possessive or a kin word after "and" may be an object ("call Ben and his
//      brother"), so it is not a boundary;
//   2. a subject pronoun that can never be an object ("i", "we", "she", "he", "they", and their
//      contractions, apostrophe or not), unless the word before it subordinates or reports ("that", "if",
//      "because", "when", "which", "said", "think"…), joins ("and", "or", "than") or is a preposition.
// Neither applies while the sentence so far has no subject of its own: spoken shorthand drops the speaker
// ("promised tomasz the proposal by wednesday and i need to loop in keiko"), and the "i" that follows is
// that same speaker's, not a new sentence.
//
// Offsets are UTF-16 indices into the text as given (what the sentence helpers index with).
// Plain TypeScript with no imports beyond the lexicon's helpers' contract: none.

export interface Segment {
  start: number;
  end: number;
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const TERMINAL = /[.!?\n]/u;
const ANY_PUNCTUATION = /[.!?\n,;:]/u;
/** A spoken run is at least this many words with no punctuation at all. */
export const SPOKEN_RUN_WORDS = 12;
const QUOTE = /["“”]/gu;

const COORDINATORS = new Set(["and", "but", "so", "then", "also", "anyway", "plus", "oh", "um", "uh", "ok", "okay"]);
/** Pronouns that are only ever a subject (object forms are him, her, them, us, me). */
const SUBJECT_PRONOUNS = new Set([
  "i", "we", "she", "he", "they",
  // Apostrophe-less forms only where they are not also a word ("ill", "were", "wed", "shed" are).
  "i'm", "i've", "i'd", "i'll", "im", "ive", "id",
  "we're", "we've", "we'd", "we'll", "weve",
  "she's", "she'd", "she'll", "shes",
  "he's", "he'd", "he'll", "hes", "hed",
  "they're", "they've", "they'd", "they'll", "theyre", "theyve", "theyd", "theyll",
]);
const TIME_WORDS = new Set([
  "yesterday", "today", "tonight", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "last", "next", "this", "later", "afterwards", "earlier", "meanwhile",
]);
/** Before a subject pronoun these make it part of the clause before it: never a boundary. */
const NO_BREAK_BEFORE = new Set([
  "that", "if", "whether", "because", "cause", "cos", "since", "as", "when", "whenever", "while", "until", "till", "before", "after",
  "which", "who", "whom", "whose", "what", "where", "why", "how", "unless", "though", "although", "like", "than", "so", "and", "or", "but", "nor",
  "said", "says", "saying", "say", "told", "tells", "telling", "tell", "think", "thinks", "thought", "know", "knows", "knew", "hope", "hopes",
  "hoped", "wish", "wishes", "guess", "bet", "mean", "means", "meant", "mentioned", "mentions", "reckon", "figured", "figure", "realised",
  "realized", "sure", "glad", "maybe", "apparently", "honestly", "basically", "where", "whatever", "once", "everything", "anything", "all",
  "to", "of", "with", "for", "at", "on", "in", "by", "from", "about", "between", "through", "without", "into", "onto", "over", "under",
  "the", "a", "an", "not", "no", "yes",
]);

/** True when the text has any sentence punctuation. */
export function hasSentencePunctuation(text: string): boolean {
  return TERMINAL.test(text);
}

/**
 * True when the text reads as a spoken run: no punctuation at all and at least SPOKEN_RUN_WORDS words.
 * Only such a note is cut into spoken sentences; everything else keeps its punctuation's sentences.
 */
export function isSpokenRun(text: string): boolean {
  return !ANY_PUNCTUATION.test(text) && (text.match(WORD) ?? []).length >= SPOKEN_RUN_WORDS;
}

/**
 * The spoken sentences of a note with no sentence punctuation, as UTF-16 spans covering every word (a
 * segment ends at its last word). A punctuated note, or one that gives no boundary, is one segment.
 */
export function spokenSentences(text: string, names: readonly string[] = []): Segment[] {
  const words = [...text.matchAll(WORD)].map((m) => ({ text: m[0], lower: plain(m[0]), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  if (!words.length) return [{ start: 0, end: text.length }];
  if (!isSpokenRun(text)) return [{ start: words[0].start, end: words[words.length - 1].end }];
  const nameKeys = new Set(names.flatMap((n) => {
    const k = plain(n);
    const first = k.split(/\s+/u)[0];
    return k ? (first && first !== k ? [k, first] : [k]) : [];
  }));
  const isName = (w: { lower: string }) => nameKeys.has(w.lower);
  const quoted = quotedRanges(text);
  const inQuotes = (at: number) => quoted.some(([a, b]) => at > a && at < b);

  const isSubject = (k: number) => k < words.length && (SUBJECT_PRONOUNS.has(words[k].lower) || TIME_WORDS.has(words[k].lower) ||
    words[k].lower === "my" || words[k].lower === "our" || isName(words[k]));
  // Whether the sentence that starts at word k names its own subject up front (after any coordinators).
  const hasSubject = (k: number) => {
    let j = k;
    while (j < words.length && COORDINATORS.has(words[j].lower)) j++;
    return isSubject(j);
  };

  const starts = [0];
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (inQuotes(w.start)) continue;
    if (!hasSubject(starts[starts.length - 1])) continue;
    const prev = words[i - 1];
    // 2. A subject pronoun that is never an object, after a word that does not bind it to the clause before.
    if (SUBJECT_PRONOUNS.has(w.lower) && !NO_BREAK_BEFORE.has(prev.lower) && !COORDINATORS.has(prev.lower) && !isName(prev) && i + 1 < words.length) {
      starts.push(i);
      continue;
    }
    // 1. A coordinator or filler, then a subject.
    if (!COORDINATORS.has(w.lower) || COORDINATORS.has(prev.lower)) continue;
    let j = i + 1;
    while (j < words.length && COORDINATORS.has(words[j].lower)) j++;
    if (j + 1 >= words.length) continue;
    const next = words[j];
    const subject = SUBJECT_PRONOUNS.has(next.lower) || TIME_WORDS.has(next.lower) ||
      (isName(next) && !isName(prev) && !isName(words[j + 1]) && words[j + 1].lower !== "and");
    if (subject) starts.push(i);
  }
  const unique = [...new Set(starts)].sort((a, b) => a - b);
  return unique.map((s, k) => ({ start: words[s].start, end: words[(k + 1 < unique.length ? unique[k + 1] : words.length) - 1].end }));
}

/**
 * The spoken sentence holding [from, to) (UTF-16), as one span: the segments it touches, joined. For
 * anything but a spoken run, or a span outside every word, the whole text.
 */
export function spokenSentenceAt(text: string, from: number, to: number, names: readonly string[] = []): Segment {
  const segments = spokenSentences(text, names);
  const touched = segments.filter((s) => s.start < Math.max(to, from + 1) && s.end > from);
  if (!touched.length) return { start: 0, end: text.length };
  return { start: touched[0].start, end: touched[touched.length - 1].end };
}

function plain(word: string): string {
  return word.normalize("NFC").toLowerCase().replace(/[’]/gu, "'").replace(/'s$/u, "");
}

function quotedRanges(text: string): [number, number][] {
  const marks = [...text.matchAll(QUOTE)].map((m) => m.index ?? 0);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < marks.length; i += 2) out.push([marks[i], marks[i + 1]]);
  return out;
}
