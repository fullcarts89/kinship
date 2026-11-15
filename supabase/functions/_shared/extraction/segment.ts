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
//   1. a coordinator ("and", "but", "so", "then", "also", "anyway", "plus"), when the next word past any
//      filler ("um", "ok", "oh"…) is a subject: a subject pronoun, a time adverbial, or a name from People —
//      and the word before the coordinator is not a name ("mark and will are doing", "grace and i are
//      doing", "call Ben Kim and Ben": one subject or one object). A possessive or a kin word after "and"
//      may be an object ("call Ben and his brother"), so it is not a boundary;
//   2. a subject pronoun that can never be an object ("i", "we", "she", "he", "they", and their
//      contractions, apostrophe or not), unless the word before it subordinates or reports ("that", "if",
//      "because", "when", "which", "said", "think"…), joins ("and", "or", "than"), is a preposition or an
//      object pronoun ("ben told me she was leaving"), or heads a noun phrase a determiner introduced one or
//      two words before ("the person she interviewed against", "the job he wanted", "the new place he moved
//      to", "last time we talked": a reduced relative).
//   3. a name from People followed by a verb ("…grumpy about on call keiko offered to cover some of it"),
//      unless the word before the name binds it (the one list rules 2 and 3 share): a coordinator (rule 1
//      decides), a preposition, a determiner or possessive, a kin or role word ("my cousin ben loves…"), a
//      reporting or hedging verb ("i heard ben got the job" stays hearsay), or a name.
// None applies while the sentence so far has no subject of its own: spoken shorthand drops the speaker
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

// Not "ok"/"okay": mid-clause they are adjectives ("he's okay but…", "she is okay and…"); at the very start
// of a note they need no rule (the first word always begins the first sentence).
const COORDINATORS = new Set(["and", "but", "so", "then", "also", "anyway", "plus"]);
/**
 * Fillers a spoken note opens or resumes with ("ok so toby lost his first tooth", "um mom is doing the
 * seventieth"): skipped when looking for a sentence's subject, never a boundary themselves (mid-clause
 * "okay" is an adjective: "he's okay but…"), and never binding the word after them.
 */
const FILLERS = new Set(["ok", "okay", "right", "um", "uh", "oh", "like", "well"]);
/** The fillers that are nothing but fillers, carried into the sentence they precede ("twice uh mark brought…"); "okay", "right", "like", "well" are also words. */
const CARRIED_FILLERS = new Set(["um", "uh", "oh"]);
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
/** "from then", "by then", "until then": a time phrase, not "then" starting a sentence. */
const BEFORE_THEN = new Set(["from", "by", "until", "till", "since", "before", "after"]);
/** Verbs (and the adverbs that sit before one) a sentence's subject is followed by, as spoken notes use them. */
const VERBS = new Set([
  "is", "was", "has", "had", "got", "gets", "said", "says", "told", "tells", "wants", "wanted", "offered", "offers", "asked", "asks",
  "started", "starts", "finished", "moved", "moves", "loves", "likes", "hates", "thinks", "thought", "seems", "seemed", "sees", "saw",
  "called", "texted", "mentioned", "booked", "brought", "bought", "went", "came", "left", "lost", "found", "made", "took", "gave", "spent",
  "owes", "works", "worked", "lives", "lived", "plays", "runs", "ran", "needs", "needed", "might", "will", "would", "can", "cant", "can't",
  "couldnt", "couldn't", "isnt", "isn't", "wasnt", "wasn't", "doesnt", "doesn't", "didnt", "didn't", "hasnt", "hasn't", "also", "just",
  "still", "apparently", "actually", "really", "always", "never", "finally", "recently", "already", "basically", "honestly",
]);
/** Possessives and kin words that open a sentence with a subject of its own ("my dentist retired", "mom said"). */
const SUBJECT_OPENERS = new Set(["my", "our", "his", "her", "their", "mom", "mum", "dad", "mother", "father", "nana", "grandma", "grandpa", "gran", "granny"]);
/** A determiner: the word after it heads a noun phrase, and a subject pronoun right after that noun starts a reduced relative ("the person she interviewed", "the job he wanted", "last time we talked"), not a sentence. */
const DETERMINERS = new Set(["the", "a", "an", "this", "that", "these", "those", "last", "next", "every", "first", "one", "some", "any", "each"]);
/**
 * Before a subject pronoun or a name, these bind it to the clause before it: it is reported, hedged,
 * subordinated, an object, a possession or part of a phrase, never a new sentence. One list for both
 * ("i heard ben got the job" is hearsay, and "i heard she got the job" too; PR #90 re-review).
 */
const BINDS = new Set([
  // Object pronouns: "ben told me she was leaving". Not "it": "…worried about it mom wants us all to…" ends a clause.
  "me", "him", "her", "them", "us",
  // Subordinators and relatives.
  "that", "if", "whether", "because", "cause", "cos", "since", "as", "when", "whenever", "while", "until", "till", "before", "after",
  "which", "who", "whom", "whose", "what", "where", "why", "how", "unless", "though", "although", "like", "than", "so", "and", "or", "but", "nor",
  "whatever", "once", "everything", "anything", "all", "sure", "glad", "maybe", "apparently", "honestly", "basically",
  // Reporting and hedging verbs: what follows is what was said, heard, guessed or felt, not a new sentence.
  "said", "says", "saying", "say", "told", "tells", "telling", "tell", "think", "thinks", "thought", "know", "knows", "knew", "hope", "hopes",
  "hoped", "wish", "wishes", "guess", "guessed", "bet", "mean", "means", "meant", "mentioned", "mentions", "reckon", "figured", "figure",
  "realised", "realized", "realise", "realize", "heard", "hear", "hears", "gather", "gathered", "assume", "assumed", "suppose", "supposed",
  "noticed", "notice", "remember", "remembered", "doubt", "doubted", "worry", "worried", "wonder", "wondered", "owe", "owes", "owed", "miss",
  "missed", "imagine", "imagined", "feel", "felt", "found", "find", "suspect", "suspected", "believe", "believed", "understand", "understood",
  "asked", "ask", "saw", "see", "met", "meet", "expect", "expected", "seems", "seemed", "sounds", "sounded",
  // Prepositions, determiners and possessives.
  "to", "of", "with", "for", "at", "on", "in", "by", "from", "about", "between", "through", "without", "into", "onto", "over", "under",
  "the", "a", "an", "this", "my", "our", "his", "their", "your", "not", "no", "yes",
  // Kin and role words: "my cousin ben loves…" is one noun phrase.
  "cousin", "friend", "friends", "sister", "brother", "aunt", "uncle", "mom", "mum", "dad", "daughter", "son", "wife", "husband", "partner", "boss",
  "neighbour", "neighbor", "colleague", "coworker", "teacher", "doctor", "dr", "mr", "mrs", "ms",
  "dog", "cat", "kid", "kids", "baby", "is", "was", "be", "am", "are", "named", "name", "that's", "thats", "it's", "its",
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

  // A sentence has a subject of its own when it opens with one: a subject pronoun, a time word, a name, a
  // possessive or a determiner and its noun ("the funeral is…", "my dentist retired"). One that opens with a
  // verb ("promised tomasz…", "told her…") is spoken shorthand for "I …".
  const isSubject = (k: number) => k < words.length && (SUBJECT_PRONOUNS.has(words[k].lower) || TIME_WORDS.has(words[k].lower) ||
    SUBJECT_OPENERS.has(words[k].lower) || DETERMINERS.has(words[k].lower) || isName(words[k]));
  // Whether the sentence that starts at word k names its own subject up front (after any coordinators and fillers).
  const hasSubject = (k: number) => {
    let j = k;
    while (j < words.length && (COORDINATORS.has(words[j].lower) || FILLERS.has(words[j].lower))) j++;
    return isSubject(j);
  };

  const starts = [0];
  // A new sentence takes the fillers just before it ("…twice uh | mark brought" → "uh mark brought"), and a
  // run of fillers alone is never a sentence ("ok | so toby lost" stays "ok so toby lost").
  const begin = (i: number) => {
    let b = i;
    const segStart = starts[starts.length - 1];
    while (b - 1 > segStart && CARRIED_FILLERS.has(words[b - 1].lower)) b--;
    if (words.slice(segStart, b).every((x) => FILLERS.has(x.lower) || COORDINATORS.has(x.lower))) return;
    starts.push(b);
  };
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (inQuotes(w.start)) continue;
    if (!hasSubject(starts[starts.length - 1])) continue;
    const prev = words[i - 1];
    // "from then lars is doing…": this "then" is a time phrase, not a coordinator.
    const timeThen = prev.lower === "then" && i >= 2 && BEFORE_THEN.has(words[i - 2].lower);
    // 2. A subject pronoun that is never an object, after a word that does not bind it to the clause before:
    // not a subordinator, a reporting verb, a preposition, an object pronoun, a coordinator or a name, and not
    // a noun a determiner introduced ("the person she interviewed against": a reduced relative).
    const reducedRelative = !TIME_WORDS.has(prev.lower) && !isName(prev) &&
      ((i >= 2 && DETERMINERS.has(words[i - 2].lower)) || (i >= 3 && DETERMINERS.has(words[i - 3].lower) && !COORDINATORS.has(words[i - 2].lower)));
    if (SUBJECT_PRONOUNS.has(w.lower) && !BINDS.has(prev.lower) && (!COORDINATORS.has(prev.lower) || timeThen) && !isName(prev) && !reducedRelative && i + 1 < words.length) {
      begin(i);
      continue;
    }
    // 3. A name followed by a verb, after a word that leaves it free to be a subject.
    if (isName(w) && i + 1 < words.length && VERBS.has(words[i + 1].lower) && !BINDS.has(prev.lower) &&
        (!COORDINATORS.has(prev.lower) || timeThen) && !isName(prev) && !DETERMINERS.has(prev.lower)) {
      begin(i);
      continue;
    }
    // 1. A coordinator, then (past any fillers) a subject. "from then", "by then" are a time phrase.
    if (!COORDINATORS.has(w.lower) || COORDINATORS.has(prev.lower) || (w.lower === "then" && BEFORE_THEN.has(prev.lower))) continue;
    let j = i + 1;
    while (j < words.length && (COORDINATORS.has(words[j].lower) || FILLERS.has(words[j].lower))) j++;
    if (j + 1 >= words.length) continue;
    const next = words[j];
    // "grace and i are doing the turkey trot", "mark and i went": a name that opens the sentence and a pronoun
    // are one subject; "called mom and she is doing better" is a new sentence. "mark and will are doing",
    // "call Ben Kim and Ben": after a name, a coordinator joins two names, never starts a sentence; "and will
    // and grace stayed home" does start one.
    const opener = words.slice(starts[starts.length - 1], i - 1).every((x) => COORDINATORS.has(x.lower) || FILLERS.has(x.lower));
    const subject = (SUBJECT_PRONOUNS.has(next.lower) && !(isName(prev) && opener)) ||
      (!isName(prev) && (TIME_WORDS.has(next.lower) || isName(next)));
    if (subject) begin(i);
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
