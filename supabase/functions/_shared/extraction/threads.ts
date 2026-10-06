// Memory that changes over time (stabilization Gate E).
//
// A relationship's story moves: "Sam is interviewing at Stripe" → "Sam got
// the Stripe job"; "John's knee is bothering him" → "his knee is getting
// better" → "his knee is better"; "Susan is planning to move to Alameda" →
// "Susan is not moving anymore". Each later note updates the earlier memory
// instead of standing beside it as a second, contradictory "current" truth.
//
// The data shape is the one memory already has: the newer item supersedes the
// older (supersedes_id, the older one's status becomes superseded, or resolved
// for an open thread it completes), every item keeps its own sources, and the
// newer one records how it changed things in detail.transition:
//
//   progress    the same story, further along ("getting better")
//   completed   the story reached its end ("got the job", "is better now")
//   cancelled   it isn't happening ("not moving anymore", "the wedding's off")
//
// The model proposes these (prompt v6). This is the deterministic half: it
// recognises the wording of a transition and finds the one memory it is about,
// for the same person and subject, by the words they share (never the
// person's own name). It never invents an update: no clear match, no update;
// two equally good matches, the user is asked which one it replaces.
//
// Shared by the gateway (Deno) and tests: plain TypeScript.

export type Transition = "progress" | "completed" | "cancelled";

const CANCELLED = new RegExp([
  String.raw`\bnot\s+(?:\S+\s+){0,4}?any\s?more\b`,
  String.raw`n['’]t\s+(?:\S+\s+){0,4}?any\s?more\b`,
  String.raw`\bno\s+longer\b`,
  String.raw`\b(?:is|are|was|were)\s*n['’]?t\s+(?:going\s+to|happening)\b`,
  String.raw`\b(?:is|are|was|were)\s+not\s+(?:going\s+to|happening)\b`,
  String.raw`\bwon['’]?t\s+be\b`,
  String.raw`\b(?:cancel+ed|called\s+off|fell\s+through|backed\s+out|pulled\s+out|off\s+the\s+table)\b`,
  String.raw`\b(?:is|are|was|it['’]s|that['’]s)\s+off\b`,
  String.raw`\bdecided\s+(?:not\s+to|against)\b`,
].join("|"), "iu");

const PROGRESS = new RegExp([
  String.raw`\bgetting\s+(?:better|worse|stronger|easier|harder)\b`,
  String.raw`\b(?:improving|on\s+the\s+mend|recovering|healing)\b`,
  String.raw`\b(?:feels?|feeling|doing)\s+(?:a\s+(?:bit|lot)\s+)?better\b`,
  String.raw`\bbetter\s+than\s+(?:before|last)\b`,
].join("|"), "iu");

const COMPLETED = new RegExp([
  String.raw`\bgot\s+(?:the|a|an|her|his|their)\s+(?:\S+\s+){0,2}?(?:job|offer|role|position|promotion|place|apartment|house|lease)\b`,
  String.raw`\bgot\s+(?:in|into|accepted|promoted|married|engaged|hired)\b`,
  String.raw`\b(?:was|were|has\s+been|have\s+been)\s+(?:accepted|hired|promoted)\b`,
  String.raw`\baccepted\s+(?:the|an?)\s+(?:offer|job|role|position)\b`,
  String.raw`\blanded\s+(?:the|a)\b`,
  String.raw`\b(?:is|are)\s+(?:all\s+|completely\s+|fully\s+)?(?:better|healed|recovered|fine|done)\b`,
  String.raw`\b(?:fully\s+)?(?:recovered|healed)\b`,
  String.raw`\b(?:graduated|finished|closed\s+on|moved\s+in|had\s+the\s+baby)\b`,
].join("|"), "iu");

/** How a statement changes an earlier one, from its own words; null when it doesn't read as an update. */
export function transitionOf(statement: string): Transition | null {
  if (CANCELLED.test(statement)) return "cancelled";
  if (PROGRESS.test(statement)) return "progress";
  if (COMPLETED.test(statement)) return "completed";
  return null;
}

/** What a transition may update. */
const TARGET_KINDS: Record<Transition, string[]> = {
  cancelled: ["event", "plan", "thread", "fact", "promise"],
  completed: ["thread", "plan", "event", "fact"],
  progress: ["thread", "fact"],
};

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "at", "for", "with", "from", "by", "about", "as", "into",
  "is", "are", "was", "were", "be", "been", "being", "has", "have", "had", "do", "does", "did", "will", "would", "can",
  "could", "should", "may", "might", "must", "shall", "not", "no", "any", "more", "anymore", "longer", "now", "still",
  "just", "really", "very", "so", "too", "also", "then", "than", "that", "this", "these", "those", "it", "its",
  "he", "she", "they", "him", "her", "them", "his", "hers", "their", "theirs", "you", "your", "yours", "we", "our", "i",
  "my", "me", "said", "says", "say", "told", "tell", "thinks", "think", "going", "get", "gets", "getting", "got",
  "week", "weeks", "month", "months", "year", "years", "next", "last", "this", "today", "tomorrow", "yesterday",
  "summer", "winter", "spring", "fall", "autumn", "weekend", "weekends", "soon", "later", "ago", "again",
  "planning", "plan", "plans", "thinking", "wants", "want", "hoping", "hope", "trying", "try", "starting", "start",
  "better", "worse", "fine", "done", "new", "old", "been", "lot", "bit", "off", "called", "cancelled", "canceled",
]);

/** A rough stem: "moving"/"moved"/"move" → "mov", "Alameda" → "alam", "knees" → "kne". */
function stem(word: string): string {
  let w = word.toLocaleLowerCase().replace(/['’]s$/u, "");
  for (const suffix of ["ing", "ed", "es", "s", "e"]) {
    if (w.length - suffix.length >= 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w.slice(0, 4);
}

interface Token {
  stem: string;
  proper: boolean;
}

function tokens(statement: string, names: Set<string>): Token[] {
  const words = statement.normalize("NFC").match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? [];
  const out: Token[] = [];
  words.forEach((raw, i) => {
    const w = raw.replace(/['’]s$/u, "");
    const k = w.toLocaleLowerCase();
    if (k.length < 3 || STOP.has(k) || names.has(k) || /n['’]t$/u.test(k)) return;
    out.push({ stem: stem(w), proper: i > 0 && /^\p{Lu}/u.test(w) });
  });
  return out;
}

export interface ThreadCandidate {
  id: string;
  kind: string;
  statement: string;
  status: string;
}

export type ThreadMatch =
  | { target: string; action: "supersede" | "resolves"; transition: Transition }
  | { ambiguous: string[]; transition: Transition }
  | null;

/**
 * The one earlier memory a statement updates, among the same person's and
 * subject's live memories. `names` are the people's own names, which say
 * nothing about which story it is.
 */
export function threadTarget(statement: string, candidates: ThreadCandidate[], names: string[]): ThreadMatch {
  const transition = transitionOf(statement);
  if (!transition) return null;
  const nameSet = new Set(names.flatMap((n) => n.toLocaleLowerCase().split(/\s+/u)).filter(Boolean));
  const mine = tokens(statement, nameSet);
  const myStems = new Set(mine.map((t) => t.stem));
  const myProper = new Set(mine.filter((t) => t.proper).map((t) => t.stem));
  const scored = candidates
    .filter((c) => c.status === "active" && TARGET_KINDS[transition].includes(c.kind) && c.statement !== statement)
    .map((c) => {
      const theirs = tokens(c.statement, nameSet);
      const shared = new Set(theirs.map((t) => t.stem).filter((s) => myStems.has(s)));
      const proper = [...shared].filter((s) => myProper.has(s) || theirs.some((t) => t.proper && t.stem === s)).length;
      return { c, score: shared.size, proper };
    })
    // A progress update needs one shared subject ("knee"); ending or
    // cancelling something needs two words, or a shared name ("Stripe").
    // Ending an open story needs only its subject too ("his knee is better").
    .filter((x) => (transition === "progress" || (transition === "completed" && x.c.kind === "thread")
      ? x.score >= 1
      : x.score >= 2 || (x.proper >= 1 && x.score >= 1)))
    .sort((a, b) => b.score - a.score || b.proper - a.proper);
  if (scored.length === 0) return null;
  const top = scored.filter((x) => x.score === scored[0].score && x.proper === scored[0].proper);
  if (top.length > 1) return { ambiguous: top.slice(0, 3).map((x) => x.c.id), transition };
  const target = top[0].c;
  // Every change of the story replaces the earlier line and links to it, so
  // the change can be shown and undone (founder H25).
  return { target: target.id, action: "supersede", transition };
}
