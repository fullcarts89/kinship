// Grounding a proposed line in the note's own words when its quote appears more than once (CMR-1 C1;
// founder device 10 Nov 2026, K34/K35: a spoken note kept with every word twice came back "Nothing to
// remember", because every quote appeared twice and both lines were dropped as `evidence_ambiguous`).
//
// The gateway never trusts a model's offsets; it locates the exact quote (spans.ts). A quote found once
// is placed. A quote found twice used to be dropped. Now the occurrences are told apart by grounded
// context, deterministically, with no model call:
//
//   1. who the line is about: the occurrence whose sentence names that person, or whose nearest name
//      before it is theirs, over one whose nearest name is someone else's;
//   2. the line's other quotes, where they were found once, point at the occurrence beside them;
//   3. true repetition, only when neither of those tells the occurrences apart: every occurrence sits in
//      the same words (the same text before and after it, or the whole note repeats) and its sentence
//      names the same people → the same fact, placed once, at its first occurrence;
//
// and when those do not agree, or none applies, the quote stays ambiguous: never a guess. The caller
// then records the candidate places as not understood (Coverage.not_understood), so the phone can
// show them and offer to tell them again. Everything compares the note's own text; nothing is invented.

import { codePointLength, type Span, utf16ToCodePoint } from "../spans.ts";
import { fold, nameKey, PRONOUNS, sentenceAround, wordsOf } from "./lexicon.ts";
export { hasSentencePunctuation, isSpokenRun, type Segment, sentenceSpans, SPOKEN_RUN_WORDS, spokenSentenceAt, spokenSentences } from "./segment.ts";

/** Code points of context compared on each side of an occurrence. */
const CONTEXT = 80;
/** The least context (both sides together) that may call two occurrences the same words said again. */
const MIN_CONTEXT = 20;
/** A line's other quote points at an occurrence only this near (code points). */
const ANCHOR_REACH = 300;

export interface GroundHint {
  /** Spans of this line's other quotes that were found once: an occurrence beside one of them is the one. */
  anchors?: Span[];
  /** How the note may write the person the line is about (display name, full name, nicknames). */
  personNames?: string[];
  /** How the note may write everyone else in People. */
  otherNames?: string[];
}

export type GroundResult =
  | { ok: true; span: Span; how: "unique" | "repeated" | "anchor" | "person" }
  | { ok: false; reason: "empty" | "not_found" | "ambiguous"; candidates: Span[] };

/** Every code-point span where the quote occurs (both in NFC), in order. */
export function occurrencesOf(text: string, evidence: string): Span[] {
  const haystack = text.normalize("NFC");
  const needle = evidence.normalize("NFC");
  if (!needle.length) return [];
  const length = codePointLength(needle);
  const out: Span[] = [];
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    const prev = haystack.charCodeAt(i - 1);
    const curr = haystack.charCodeAt(i);
    if (i > 0 && prev >= 0xd800 && prev <= 0xdbff && curr >= 0xdc00 && curr <= 0xdfff) continue;
    const start = utf16ToCodePoint(haystack, i);
    out.push({ start, end: start + length });
  }
  return out;
}

/**
 * Places a quote in the note. One occurrence is placed as before. Several are told apart by the rules
 * above, in order; a quote they cannot settle is ambiguous, with every place it could be.
 */
export function groundEvidence(text: string, evidence: string, hint: GroundHint = {}): GroundResult {
  const quote = evidence.normalize("NFC");
  if (!quote.trim()) return { ok: false, reason: "empty", candidates: [] };
  const found = occurrencesOf(text, quote);
  if (found.length === 0) return { ok: false, reason: "not_found", candidates: [] };
  if (found.length === 1) return { ok: true, span: found[0], how: "unique" };

  const chars = Array.from(text.normalize("NFC"));
  const names = [...(hint.personNames ?? []), ...(hint.otherNames ?? [])];
  // Who it is about, and the line's other quotes, come first: two people's identical words in identical
  // surroundings ("Ann, who is five…, is really into princesses. Bea, who is five…, is really into
  // princesses.") are two facts, and the one about Bea must rest on Bea's words (reviewer of PR #90).
  const byPerson = hint.personNames?.length ? byWho(chars, found, hint.personNames, hint.otherNames ?? []) : null;
  const byAnchor = hint.anchors?.length ? nearAnchors(found, hint.anchors) : null;
  if (byAnchor && byPerson) {
    return byAnchor.start === byPerson.start ? { ok: true, span: byAnchor, how: "anchor" } : { ok: false, reason: "ambiguous", candidates: found };
  }
  if (byAnchor) return { ok: true, span: byAnchor, how: "anchor" };
  if (byPerson) return { ok: true, span: byPerson, how: "person" };
  // Nothing tells them apart: the same words said again, in the same words, naming the same people.
  if (sameNamesAround(chars, found, names) && (sameWordsAgain(chars, found) || noteRepeats(text, quote))) {
    return { ok: true, span: found[0], how: "repeated" };
  }
  return { ok: false, reason: "ambiguous", candidates: found };
}

/**
 * Rule 3a: every occurrence is preceded and followed by the same words. Each side is compared over the
 * context every occurrence has (the shortest available, up to CONTEXT), lower-cased with spaces
 * collapsed, and together the compared sides must be long enough to mean anything. A note said twice
 * ("…like princesses She is the silliest…" K34) passes on the words inside the copies; "Anna is great.
 * She loves hiking. Beth is fun. She loves hiking." fails on "Anna is great" against "Beth is fun".
 */
function sameWordsAgain(chars: string[], found: Span[]): boolean {
  const norm = plainWords;
  const before = Math.min(CONTEXT, ...found.map((s) => s.start));
  const after = Math.min(CONTEXT, ...found.map((s) => chars.length - s.end));
  if (before + after < MIN_CONTEXT) return false;
  const lead = found.map((s) => norm(chars.slice(s.start - before, s.start).join("")));
  const tail = found.map((s) => norm(chars.slice(s.end, s.end + after).join("")));
  return lead.every((l) => l === lead[0]) && tail.every((t) => t === tail[0]);
}

/**
 * Rule 3b: the whole note is one passage said again and again ("She loves hiking. She loves hiking."):
 * the folded text repeats with the period between the quote's occurrences, wherever both copies exist.
 */
function noteRepeats(text: string, quote: string): boolean {
  const f = plainWords(text);
  const q = plainWords(quote);
  if (!q) return false;
  const at: number[] = [];
  for (let i = f.indexOf(q); i !== -1; i = f.indexOf(q, i + 1)) at.push(i);
  if (at.length < 2) return false;
  const d = at[1] - at[0];
  if (d <= 0 || at.some((a, i) => i > 0 && a - at[i - 1] !== d)) return false;
  // Every copy must be a copy: the repeated stretch is at least the quote and some of its surroundings.
  if (d < q.length) return false;
  for (let i = 0; i + d < f.length; i++) if (f[i] !== f[i + d]) return false;
  return true;
}

/** The text as words alone: lower case, punctuation gone, one space between words (a copy's join and the note's end differ only so). */
function plainWords(s: string): string {
  return fold(s).replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/gu, " ").trim();
}

/**
 * Every occurrence has the same people from People in subject position (or none): a copy of a sentence,
 * not a sentence about someone else that happens to be worded the same way.
 */
function sameNamesAround(chars: string[], found: Span[], names: string[]): boolean {
  const keys = new Set(nameKeys(names));
  if (!keys.size) return true;
  const sets = found.map((s) => [...subjectWords(chars, s, names)].filter((k) => keys.has(k)).sort().join(" "));
  return sets.every((x) => x === sets[0]);
}

/**
 * The words in subject position for an occurrence: those before it inside its sentence, and its own first
 * word ("Kaiya is the silliest…"). Never a word after the quote ("Krystal is fun. She loves hiking with Ann"
 * is Krystal's, not Ann's; PR #90 review). As name keys.
 */
function subjectWords(chars: string[], s: Span, names: readonly string[]): Set<string> {
  const text = chars.join("");
  const from = chars.slice(0, s.start).join("").length;
  const to = chars.slice(0, s.end).join("").length;
  const sentence = sentenceAround(text, from, to, names);
  const sentenceStart = text.indexOf(sentence, Math.max(0, from - sentence.length));
  const lead = new Set(wordsOf(text.slice(sentenceStart < 0 ? 0 : sentenceStart, from)).map(nameKey));
  const firstWord = wordsOf(text.slice(from, to))[0];
  if (firstWord) lead.add(nameKey(firstWord));
  return lead;
}

/** Rule 2: the one occurrence nearest every anchor (the line's quotes found once), within reach. */
function nearAnchors(found: Span[], anchors: Span[]): Span | null {
  let chosen: Span | null = null;
  for (const a of anchors) {
    const mid = (a.start + a.end) / 2;
    const distances = found.map((s) => Math.abs((s.start + s.end) / 2 - mid));
    const best = Math.min(...distances);
    if (best > ANCHOR_REACH) continue;
    const winners = found.filter((_, i) => distances[i] === best);
    if (winners.length !== 1) return null;
    if (chosen && chosen.start !== winners[0].start) return null;
    chosen = winners[0];
  }
  return chosen;
}

/**
 * Rule 1: who each occurrence is about, by the note's own names. An occurrence whose sentence names
 * the line's person before the quote (subject position, and no one else there) scores 2; one whose
 * nearest name before it is theirs, 1; one whose nearest name before it is someone else's, −1. The one
 * best occurrence is chosen; a tie is never broken.
 */
function byWho(chars: string[], found: Span[], personNames: string[], otherNames: string[]): Span | null {
  const mine = new Set(nameKeys(personNames));
  const theirs = new Set(nameKeys(otherNames).filter((k) => !mine.has(k)));
  if (!mine.size) return null;
  const text = chars.join("");
  const words = [...text.matchAll(/[\p{L}][\p{L}\p{M}'’-]*/gu)].map((m) => ({
    key: nameKey(m[0]), at: utf16ToCodePoint(text, m.index ?? 0),
  }));
  const scores = found.map((s) => {
    // Only a name in subject position counts (subjectWords; PR #90 review).
    const lead = subjectWords(chars, s, [...personNames, ...otherNames]);
    const namesMine = [...mine].some((k) => lead.has(k));
    const namesTheirs = [...theirs].some((k) => lead.has(k));
    if (namesMine && !namesTheirs) return 2;
    if (namesMine && namesTheirs) return 0;
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].at >= s.start) continue;
      if (mine.has(words[i].key)) return 1;
      if (theirs.has(words[i].key)) return -1;
    }
    return 0;
  });
  const best = Math.max(...scores);
  const winners = found.filter((_, i) => scores[i] === best);
  return winners.length === 1 ? winners[0] : null;
}

/** Words that start a longer form without naming anyone ("my wife", "the twins", "Dr Patel"). */
const NOT_A_NAME_WORD = new Set([
  "my", "our", "your", "his", "her", "their", "the", "a", "an", "this", "that", "these", "those", "mr", "mrs", "ms", "miss", "dr", "doctor",
  "aunt", "auntie", "uncle", "cousin", "coach", "pastor", "little", "big", "old", "new",
]);

/**
 * The single-word keys a person may be written as: each form, and the first word of a longer one when it
 * can be a name on its own (never a determiner, a possessive, a title or a word of two letters or fewer).
 */
function nameKeys(names: string[]): string[] {
  return names.flatMap((n) => {
    const k = nameKey(n);
    if (!k || PRONOUNS.has(k)) return [];
    const first = k.split(/\s+/u)[0];
    const firstCounts = first && first !== k && first.length > 2 && !NOT_A_NAME_WORD.has(first) && !PRONOUNS.has(first);
    return firstCounts ? [k, first] : [k];
  });
}

/**
 * What a proposed line's quotes come to in the note (the one grounding planItem and the sentence
 * grouping share). The first quote is the main one: unplaceable, the line has no ground; ambiguous
 * after every rule, the line is held back with the places it could be. Later quotes that were found
 * once are kept; one found several times is taken beside the main quote, else left out, never trusted.
 */
export function groundQuotes(
  text: string,
  quotes: readonly unknown[],
  hint: Omit<GroundHint, "anchors">,
): { spans: Span[]; drop?: "no_evidence" | "evidence_ambiguous"; candidates?: Span[] } {
  const clean = quotes.slice(0, 3).filter((q): q is string => typeof q === "string" && !!q.trim()).map((q) => q.trim());
  if (!clean.length) return { spans: [], drop: "no_evidence" };
  const all = clean.map((q) => occurrencesOf(text, q));
  const unique = all.map((o) => (o.length === 1 ? o[0] : null));
  const spans: Span[] = [];
  for (const [i, q] of clean.entries()) {
    const anchors = i === 0
      ? unique.filter((u, j): u is Span => j !== 0 && !!u)
      : spans.length ? [spans[0]] : unique.filter((u, j): u is Span => j !== i && !!u);
    const g = groundEvidence(text, q, { ...hint, anchors });
    if (g.ok) {
      spans.push(g.span);
      continue;
    }
    if (i === 0) return g.reason === "ambiguous" ? { spans: [], drop: "evidence_ambiguous", candidates: g.candidates } : { spans: [], drop: "no_evidence" };
    // A later quote that doesn't match is ignored, not trusted.
  }
  return spans.length ? { spans } : { spans: [], drop: "no_evidence" };
}
