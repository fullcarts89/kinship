// Residence, read from the user's own words (Phase 4B B3; brief §5, §7;
// founder CC-19, CC-20). Deterministic, server-side, versioned
// (residence/v1). The model contributes nothing here: the place words are
// the note's own characters inside the line's own span, never the model's
// statement or detail, and only the place data resolves them.
//
//   when    a stated, non-sensitive fact about the person or their related
//           person, shared with no one, whose own words say where they live
//           now: lives in, living in, is based in, resides in; moved to,
//           has moved to, relocated to; now lives in; lives in … now
//   never   a stay, a visit, a trip, "until", this week / weekend / month,
//           for the summer; grew up, used to live, lived in, is from, was
//           born in; a move to come; doesn't live, no longer lives; an
//           address; "a" or "her" anything
//   value   the place phrase after the verb, cut at punctuation, at "and",
//           "with", "since", "for", a time word and the like; a trailing
//           ", <region or country>" belongs to it ("Alameda, CA")
//   reading every reading of the words in the place data, by population;
//           more than five is too many (the words only); a qualifier in the
//           same words narrows them, and pins the one left (§7); the usual
//           reading is the only one, or one five times the next
//   cue     change (moved to, relocated, now lives in, lives in … now) or
//           correction (actually, not <words>, I was wrong, I meant,
//           correction), in the same span, as the database re-reads it
//           (20261016090000_v2_closure_of_edited_lines)
//
// A name the data doesn't know keeps its words, with no reading: it can be
// the same as another, or be moved away from, and never composes. A missing
// reading fails open everywhere (§7).

import { type Candidate, foldPlace, type PlaceIndex, type Reading, withoutThe } from "./placeIndex.ts";

export const RULE_VERSION = "residence/v1";
/** More readings than this: the words only (§5). */
export const MAX_CANDIDATES = 5;
/** The usual reading has at least this many times the people of the next (§7). */
export const USUAL_RATIO = 5;

/** A residence facet as write_extraction accepts it (20261015090000). */
export interface ResidenceFacet {
  slot: "residence";
  value_text: string;
  value_norm: string;
  place_ref: string | null;
  candidates: Candidate[];
  usual_ref: string | null;
  decided_by: "rule" | "user";
  rule_version: string;
  dataset_version: string | null;
}

/**
 * A cue in the user's words, code points into the note: a change ("moved
 * to"), a correction ("actually"), or "not <words>", which corrects only
 * the line whose place those words name (relate.ts decides, per line).
 */
export type CueKind = "change" | "correction" | "not";

export interface Cue {
  kind: CueKind;
  start: number;
  end: number;
  /** The cue's own words ("moved to", "Actually", "not Alameda"). */
  text: string;
}

export interface Residence {
  facet: ResidenceFacet;
  /** Where the place words are in the note (code points). */
  value: { start: number; end: number };
  /** Every cue in the same span, at most one of each kind. */
  cues: Cue[];
}

/** The lines that may carry a residence facet: as public.residence_facet_eligible. */
export function residenceEligible(item: {
  kind: string;
  subject_type: string;
  certainty: string;
  sensitivity: string;
  with_person_ids?: readonly string[] | null;
}): boolean {
  return item.kind === "fact" && (item.subject_type === "person" || item.subject_type === "related") &&
    item.certainty === "stated" && item.sensitivity === "none" && (item.with_person_ids?.length ?? 0) === 0;
}

// ─── Wording ────────────────────────────────────────────────────────────────

const MOVED = String.raw`(?:(?:has|have|had|just|recently|finally|since)\s+)*(?:moved|relocated)(?:\s+back)?(?:\s+from\s+[^.,;:!?\n]{1,60}?)?\s+to`;
const NOW_LIVES = String.raw`now\s+(?:lives|living|resides|residing|is\s+based|based|is\s+living)\s+in`;
const LIVES = String.raw`(?:lives|live|living|resides|reside|residing|is\s+based|are\s+based|based|is\s+living|are\s+living)\s+in`;
const VERB = new RegExp(String.raw`\b(?:(?<moved>${MOVED})|(?<now>${NOW_LIVES})|(?<lives>${LIVES}))\s+`, "iu");

/** Just before the verb: not a residence ("doesn't live in", "used to live in", "wants to move to"). */
const NOT_BEFORE = new RegExp(String.raw`(?:\b(?:not|never|no\s+longer|used\s+to|wants?\s+to|plans?\s+to|planning\s+to|going\s+to|about\s+to|hopes?\s+to|hoping\s+to|might|may|could|would|should|will|shall|thinking\s+(?:about|of)|considering)|n['’]t|['’]ll)\s+(?:\S+\s+){0,2}$`, "iu");

/** Anywhere in its words: a stay, never where someone lives (§5, case F). */
const TEMPORARY = new RegExp([
  String.raw`\bstay(?:s|ed|ing)?\b`, String.raw`\bvisit(?:s|ed|ing)?\b`, String.raw`\bin\s+town\b`, String.raw`\buntil\b`,
  String.raw`\btill\b`, String.raw`\bthis\s+(?:week|weekend|month)\b`, String.raw`\bfor\s+the\s+(?:summer|winter|spring|fall|autumn|holidays?|semester)\b`,
  String.raw`\bfor\s+(?:a\s+few|a\s+couple\s+of|a|one|two|three|some)\s+(?:days?|weeks?|months?)\b`,
  String.raw`\bon\s+(?:a\s+)?(?:trip|vacation|holiday)\b`, String.raw`\btemporarily\b`, String.raw`\bfor\s+now\b`,
].join("|"), "iu");

/** Words that end a place phrase. */
const STOP = new Set([
  "and", "with", "since", "for", "near", "by", "at", "on", "off", "outside", "close", "because", "but", "so", "who",
  "which", "that", "where", "while", "when", "now", "then", "these", "those", "this", "last", "next", "ago", "again",
  "too", "also", "though", "although", "if", "until", "till", "from", "to", "after", "before", "during", "right", "just",
  "still", "anymore", "in", "of", "as", "or", "nowadays", "today", "currently", "permanently", "together", "alone",
  "happily", "full", "part", "year", "years", "month", "months", "week", "weeks", "day", "days", "is", "was",
]);

/** Never the start of a place: "a van", "her parents' house", "an apartment". */
const NOT_A_PLACE = new Set([
  "a", "an", "my", "his", "her", "their", "our", "your", "its", "this", "that", "some", "one", "another", "which",
  "what", "there", "here", "it", "them", "him", "me", "us",
]);

const ABBREVIATIONS = new Set(["st", "mt", "ft", "ste"]);

interface Word {
  text: string;
  start: number;
  end: number;
}

/** Words from the start of `s`, while separated by plain spaces; a comma, full stop or anything else ends the run. */
function wordsAt(s: string, from: number, max = 8): { words: Word[]; stop: number } {
  const words: Word[] = [];
  let i = from;
  const WORD = /^[\p{L}\p{N}](?:[\p{L}\p{M}\p{N}'’-]|\.(?=\p{L}))*\.?/u;
  while (words.length < max) {
    const m = WORD.exec(s.slice(i));
    if (!m) break;
    let text = m[0];
    let ended = false;
    if (text.endsWith(".")) {
      const bare = text.slice(0, -1);
      // "St." and "D.C." keep their full stop; a sentence's own full stop ends the phrase.
      if (!ABBREVIATIONS.has(bare.toLowerCase()) && !/^(?:\p{L}\.)+\p{L}$/u.test(bare)) {
        text = bare;
        ended = true;
      }
    }
    words.push({ text, start: i, end: i + text.length });
    i += text.length;
    if (ended) break;
    const gap = /^ +/u.exec(s.slice(i));
    if (!gap || gap[0].length > 2) break;
    if (!WORD.test(s.slice(i + gap[0].length))) break;
    i += gap[0].length;
  }
  return { words, stop: words.length ? words[words.length - 1].end : from };
}

const capitalised = (w: string) => /^\p{Lu}/u.test(w);

/**
 * The place phrase that starts at `from` in `s`: its main words and any
 * qualifiers (", CA"), as offsets into `s`. Null when what follows the verb
 * isn't a place ("a van", "her car", an address).
 */
function placePhrase(s: string, from: number, places: PlaceIndex): { main: Word; quals: Word[]; end: number } | null {
  const { words } = wordsAt(s, from);
  if (!words.length) return null;
  const lead = words[0].text.toLowerCase() === "the" ? 1 : 0;
  const first = words[lead];
  if (!first || NOT_A_PLACE.has(first.text.toLowerCase()) || /\p{N}/u.test(first.text)) return null;

  // The run the words themselves give: capitalised words after a capitalised
  // start ("Logan Square"), or up to a stop word ("alameda with her wife").
  let cut = lead + 1;
  while (cut < words.length) {
    const w = words[cut].text;
    if (STOP.has(w.toLowerCase()) || /\p{N}/u.test(w)) break;
    if (capitalised(first.text) && !capitalised(w)) break;
    cut++;
  }
  // A longer name the data knows wins ("Bosnia and Herzegovina", "Isle of Man").
  let take = cut;
  for (let k = Math.min(words.length, lead + 5); k > cut; k--) {
    if (words.slice(lead, k).some((w) => /\p{N}/u.test(w.text))) continue;
    if (places.readings(s.slice(words[lead].start, words[k - 1].end)).length) {
      take = k;
      break;
    }
  }
  const main: Word = { text: s.slice(words[0].start, words[take - 1].end), start: words[0].start, end: words[take - 1].end };
  if (/\p{N}/u.test(main.text)) return null;
  const known = places.readings(main.text).length > 0;
  // Lower-case words the data doesn't know aren't a place ("lives in fear").
  if (!known && !capitalised(first.text)) return null;

  // ", CA", ", Texas", ", USA": a region or country qualifies the place.
  const quals: Word[] = [];
  let end = main.end;
  while (quals.length < 2) {
    const comma = /^,\s?/u.exec(s.slice(end));
    if (!comma) break;
    const next = wordsAt(s, end + comma[0].length, 3).words;
    let found: Word | null = null;
    for (let k = next.length; k >= 1 && !found; k--) {
      const text = s.slice(next[0].start, next[k - 1].end);
      if (places.readings(text).some((r) => r.level !== "city")) found = { text, start: next[0].start, end: next[k - 1].end };
    }
    if (!found) break;
    quals.push(found);
    end = found.end;
  }
  if (end - from > 100) return null;
  return { main, quals, end };
}

/** The readings of a phrase, narrowed by its qualifiers; the pinned one when they leave exactly one. */
export function readPlace(main: string, quals: string[], places: PlaceIndex): { candidates: Reading[]; place_ref: string | null } {
  let readings = places.readings(main);
  for (const q of quals) {
    const containers = places.readings(q).filter((r) => r.level !== "city").map((r) => r.ref);
    readings = readings.filter((r) => r.ancestors.some((a) => containers.includes(a)));
  }
  if (readings.length > MAX_CANDIDATES) return { candidates: [], place_ref: null };
  return { candidates: readings, place_ref: quals.length && readings.length === 1 ? readings[0].ref : null };
}

/** The usual reading (§7): the only one, or one with five times the people of the next. */
export function usualOf(readings: Reading[]): string | null {
  if (readings.length === 1) return readings[0].ref;
  if (readings.length < 2) return null;
  const [a, b] = readings;
  return a.population > 0 && a.population >= USUAL_RATIO * b.population ? a.ref : null;
}

/** value_norm: folded, without a leading "the". */
export function normOf(words: string): string {
  return withoutThe(foldPlace(words));
}

// ─── Cues ───────────────────────────────────────────────────────────────────

const CORRECTION = /\b(?:actually|i\s+was\s+wrong|i\s+meant|correction)\b/iu;
const NOT_WORDS = /\bnot\s+(?:in\s+)?(?:the\s+)?[\p{L}][^.,;:!?\n]{0,60}/iu;

/** The note's code points between two UTF-16 offsets of `s`, which starts at code point `base`. */
function cp(s: string, base: number, utf16: number): number {
  return base + Array.from(s.slice(0, utf16)).length;
}

/**
 * The residence a line's own words state, read from the first of its spans
 * that says one; null when none does. `note` is the capture's text (NFC);
 * spans are code points into it.
 */
export function residenceOf(note: string, spans: readonly { start: number; end: number }[], places: PlaceIndex): Residence | null {
  const chars = Array.from(note);
  for (const sp of spans) {
    const s = chars.slice(sp.start, sp.end).join("");
    const m = VERB.exec(s);
    if (!m || m.index === undefined) continue;
    if (NOT_BEFORE.test(s.slice(0, m.index)) || TEMPORARY.test(s)) continue;
    const at = m.index + m[0].length;
    const phrase = placePhrase(s, at, places);
    if (!phrase) continue;

    const valueText = s.slice(phrase.main.start, phrase.end);
    const { candidates, place_ref } = readPlace(phrase.main.text, phrase.quals.map((q) => q.text), places);
    const facet: ResidenceFacet = {
      slot: "residence",
      value_text: valueText,
      value_norm: normOf(valueText),
      place_ref,
      candidates: candidates.map(({ ref, level, ancestors }) => ({ ref, level, ancestors })),
      usual_ref: place_ref ?? usualOf(candidates),
      decided_by: "rule",
      rule_version: RULE_VERSION,
      dataset_version: places.version,
    };
    if (!facet.value_norm) continue;

    const cues: Cue[] = [];
    const after = s.slice(phrase.end);
    const not = NOT_WORDS.exec(after);
    if (not && not.index !== undefined) {
      const text = not[0].trimEnd();
      const from = phrase.end + not.index;
      cues.push({ kind: "not", start: cp(s, sp.start, from), end: cp(s, sp.start, from + text.length), text });
    }
    const corr = CORRECTION.exec(s);
    if (corr && corr.index !== undefined) {
      cues.push({ kind: "correction", start: cp(s, sp.start, corr.index), end: cp(s, sp.start, corr.index + corr[0].length), text: corr[0] });
    }
    if (m.groups?.moved || m.groups?.now) {
      const text = m[0].trimEnd();
      cues.push({ kind: "change", start: cp(s, sp.start, m.index), end: cp(s, sp.start, m.index + text.length), text });
    } else {
      const now = /^\s+now\b/iu.exec(after);
      if (now) {
        const end = phrase.end + now[0].length;
        cues.push({ kind: "change", start: cp(s, sp.start, m.index), end: cp(s, sp.start, end), text: s.slice(m.index, end) });
      }
    }
    return {
      facet,
      value: { start: cp(s, sp.start, phrase.main.start), end: cp(s, sp.start, phrase.end) },
      cues,
    };
  }
  return null;
}
