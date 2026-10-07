// Deterministic word lists behind the extraction guards. They can only make
// the pipeline MORE careful: lower certainty, raise sensitivity, drop an
// item, or ask. They never upgrade anything the model said.

import type { Certainty, Sensitivity } from "./types.ts";

/** Lower-cased, NFC, curly apostrophes straightened. */
export function fold(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/[’‘`]/g, "'");
}

/** Accent-insensitive comparison key for names ("José" ≈ "jose"). */
export function nameKey(text: string): string {
  return fold(text).normalize("NFD").replace(/\p{M}+/gu, "").replace(/'s$/, "").trim();
}

/**
 * A statement's words as a bag, ignoring "and", "&" and "with", so a mirrored
 * reading of one shared memory matches: "Michelle might be moving to
 * Australia with Sam" = "Sam might be moving to Australia with Michelle".
 */
export function mirrorBag(statement: string): string {
  return wordsOf(fold(statement)).filter((w) => w !== "and" && w !== "&" && w !== "with").sort().join(" ");
}

// ─── Certainty ──────────────────────────────────────────────────────────────

const TENTATIVE = /\b(may|might|maybe|possibly|perhaps|probably|could|thinking (about|of)|considering|weighing|toying with|hoping|hopes to|wants to|wanna|plans? to maybe|not sure|unsure|undecided|on the fence|i guess|i think|i believe|i suspect|potentially|likely|unlikely|rumou?red?|if)\b/;
const REPORTED = /\b(i heard|heard that|apparently|supposedly|according to|someone said|i was told|rumou?r has it)\b/;
const WISHED = /\b(sometime|some time|someday|some day|one day|one of these days|we should|we'd love to|would love to|would be fun to|been meaning to|eventually)\b/;

/**
 * The weakest certainty the wording allows, or null when it reads as plain.
 * "I think Anna said…" → reported; "Mike may leave" → tentative;
 * "skiing sometime" → wished.
 */
export function wordingCertainty(sentence: string): Certainty | null {
  // "May" the month and "sometime in November" are dates, not hedges.
  const s = fold(sentence)
    .replace(/\b(in|on|by|until|till|since|from|through|early|late|mid|this|next|last|of)[ -]may\b/g, "$1 month")
    .replace(/\bmay (?=\d)/g, "month ")
    .replace(/\b(sometime|some time) (?=in (january|february|march|april|may|june|july|august|september|october|november|december)\b)/g, "")
    .replace(/\b(sometime|some time) (?=(this|next) (spring|summer|autumn|fall|winter|year|month|week)\b)/g, "");
  if (/\bi think\b/.test(s) && /\b(said|says|mentioned|told)\b/.test(s)) return "reported";
  if (REPORTED.test(s)) return "reported";
  if (WISHED.test(s)) return "wished";
  if (TENTATIVE.test(s)) return "tentative";
  return null;
}

/** Certainty a stored item may hold given its wording (never stronger). */
export function capCertainty(model: Certainty, wording: Certainty | null): { certainty: Certainty; lowered: boolean } {
  if (wording === null) return { certainty: model, lowered: false };
  // Firm values the wording contradicts are lowered; hedged values the model
  // chose are kept (the model may know "reported" from context).
  if (model === "stated" || model === "planned") return { certainty: wording, lowered: true };
  return { certainty: model, lowered: false };
}

// ─── Negation ───────────────────────────────────────────────────────────────

const NEGATION = /\b(not|no|never|didn't|didnt|doesn't|doesnt|don't|dont|isn't|isnt|wasn't|wasnt|won't|wont|can't|cant|couldn't|couldnt|hasn't|hasnt|haven't|havent|hadn't|hadnt|aren't|arent|weren't|werent|shouldn't|wouldn't|no longer|nobody|neither|nor|failed to|turned down|rejected|cancel(?:l?ed)?|called off|fell through)\b/;

/** Positive idioms built from negative words ("can't wait to tell Ben"). */
const POSITIVE_IDIOMS = /\b(?:can't|cant|cannot|can not) wait\b|\bcouldn't be (?:happier|prouder|more excited)\b|\bno doubt\b|\bnot only\b/g;

/** True when the text carries a negation or a reversal word. */
export function hasNegation(text: string): boolean {
  return NEGATION.test(fold(text).replace(POSITIVE_IDIOMS, " "));
}

const SCOPE_STOP = new Set([
  "the", "and", "his", "her", "hers", "their", "they", "she", "him", "was", "were", "is", "are", "has", "have", "had", "with",
  "for", "that", "this", "from", "about", "into", "who", "writer", "writer's", "also", "too", "now", "just", "really",
]);
const stem = (w: string) => (w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, "") : w);

/**
 * Negation scoped to the part of the words that carries the statement:
 * "Ben hates surprises, so no surprise party" negates the party, not the
 * fact. The quote is split into clauses; the clause(s) sharing the most
 * content words with the statement decide. A tie, or no overlap at all,
 * falls back to the whole clause (the careful reading).
 */
export function negatedWhereStated(clause: string, statement: string): boolean {
  const parts = clause.split(/[,;:—–]|\s+(?:but|so|though|although|because|since|and then)\s+/i).map((x) => x.trim()).filter(Boolean);
  if (parts.length <= 1) return hasNegation(clause);
  const words = new Set(wordsOf(statement).filter((w) => w.length > 2 && !SCOPE_STOP.has(w)).map(stem));
  const scores = parts.map((part) => new Set(wordsOf(part).filter((w) => w.length > 2 && !SCOPE_STOP.has(w)).map(stem).filter((w) => words.has(w))).size);
  const best = Math.max(...scores);
  if (best === 0) return hasNegation(clause);
  return parts.some((part, i) => scores[i] === best && hasNegation(part));
}

// ─── Sensitivity ────────────────────────────────────────────────────────────

const SENSITIVE: [Exclude<Sensitivity, "none">, RegExp][] = [
  ["death_grief", /\b(died|dies|dying|passed away|passed on|death|dead|funeral|memorial service|burial|buried|grief|grieving|mourning|lost (?:her|his|their|my) (?:mom|mother|dad|father|husband|wife|partner|son|daughter|brother|sister|baby|grandma|grandmother|grandpa|grandfather|dog|cat)|miscarri\w*|stillborn|terminally ill|terminal (?:illness|cancer|diagnosis)|hospice|suicide)\b/],
  ["health", /\b(surgery|surgeries|operation|hospital|hospitali[sz]ed|er visit|emergency room|icu|cancer|tumou?r|chemo\w*|radiation|diagnos\w*|biopsy|scan results|mri|ct scan|stroke|heart attack|seizure|illness|ill|sick|disease|infection|covid|flu|pneumonia|diabetes|dementia|alzheimer'?s|parkinson'?s|injur\w*|broke (?:her|his|their) (?:leg|arm|wrist|ankle|hip)|fracture\w*|concussion|rehab|therapy|therapist|depress\w*|anxiety|panic attacks?|mental health|adhd|autism|eating disorder|addiction|sober|sobriety|relapse|pregnan\w*|expecting a baby|ivf|fertility|due date|in labou?r|went into labou?r|c-section|postpartum|recovering|recovery|doctor|doctor's|clinic|appointment with (?:a|her|his|the) (?:doctor|specialist|oncologist|surgeon)|medication|meds|prognosis|treatment|physical therapy|knee replacement|hip replacement|mastectomy|colonoscopy|mammogram|ultrasound|checkup|check-up|blood test|lab results|comes home from the hospital)\b/],
  ["conflict", /\b(divorc\w*|separat(?:ed|ing|ion)|split up|splitting up|broke up|breaking up|break-up|breakup|cheat\w*|affair|estranged|not speaking|stopped talking|falling out|fell out|fight|fighting|fought|argument|custody|restraining order|lawsuit|sued|suing|arrest\w*|jail|prison|abuse\w*|abusive|toxic)\b/],
  ["money", /\b(laid off|layoffs?|got fired|was fired|lost (?:her|his|their) job|unemploy\w*|out of work|bankrupt\w*|debt|debts|broke|can't afford|cant afford|money (?:trouble|problems|issues)|struggling financially|financial(?:ly)? (?:trouble|stress|problems)|evict\w*|foreclos\w*|loan|loans|salary|pay cut|mortgage)\b/],
  ["other_private", /\b(coming out|came out|gay|lesbian|bisexual|transgender|trans|immigration status|visa|deport\w*|undocumented|religion|converted)\b/],
];

/** Every sensitivity the wording implies, strongest first. */
export function wordingSensitivities(text: string): Exclude<Sensitivity, "none">[] {
  const s = fold(text);
  return SENSITIVE.filter(([, re]) => re.test(s)).map(([k]) => k);
}

const RANK: Record<Sensitivity, number> = { none: 0, other_private: 1, money: 2, conflict: 3, health: 4, death_grief: 5 };

/** The model's label, raised (never lowered) to what the wording implies. */
export function floorSensitivity(model: Sensitivity, text: string, eventType: string | null): { sensitivity: Sensitivity; raised: boolean } {
  const implied: Sensitivity[] = [...wordingSensitivities(text)];
  if (eventType === "surgery" || eventType === "medical") implied.push("health");
  if (eventType === "funeral") implied.push("death_grief");
  if (model !== "none" || implied.length === 0) return { sensitivity: model, raised: false };
  const strongest = implied.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
  return { sensitivity: strongest, raised: true };
}

/** Sensitive vocabulary in `generated` that never appears in `source` (invented diagnoses). */
export function inventedSensitiveTerms(generated: string, source: string): string[] {
  const g = fold(generated);
  const src = fold(source);
  const out: string[] = [];
  for (const [, re] of SENSITIVE) {
    const global = new RegExp(re.source, "g");
    for (const m of g.matchAll(global)) {
      const term = m[0];
      if (!src.includes(term) && !SENSITIVE_PARAPHRASE_OK(term, src)) out.push(term);
    }
  }
  return out;
}

/** A few safe paraphrases the statement may use for words in the note. */
function SENSITIVE_PARAPHRASE_OK(term: string, src: string): boolean {
  const pairs: [RegExp, RegExp][] = [
    [/^(surgery|operation)$/, /\b(surgery|operation|operated)\b/],
    [/^(hospital|hospitali[sz]ed)$/, /\b(hospital|hospitali[sz]ed|er|icu)\b/],
    [/^(died|death|dead|passed away)$/, /\b(died|passed|death|dead|lost)\b/],
    [/^pregnan\w*$/, /\b(pregnan\w*|expecting|baby on the way)\b/],
    [/^(divorc\w*)$/, /\bdivorc\w*\b/],
    [/^(fight|fighting|fought|argument)$/, /\b(fight|fighting|fought|argu\w*)\b/],
    [/^(laid off|lost (her|his|their) job)$/, /\b(laid off|layoff|lost (her|his|their) job|let go)\b/],
    [/^(sick|ill|illness)$/, /\b(sick|ill|illness|unwell)\b/],
    [/^(recovering|recovery)$/, /\b(recover\w*|surgery|operation)\b/],
  ];
  return pairs.some(([t, s]) => t.test(term) && s.test(src));
}

// ─── Relations ──────────────────────────────────────────────────────────────

export const RELATION_WORDS = [
  "mom", "mother", "mum", "mama", "dad", "father", "papa", "parents", "sister", "brother", "sibling",
  "son", "daughter", "kid", "kids", "child", "children", "baby", "wife", "husband", "partner", "spouse",
  "girlfriend", "boyfriend", "fiance", "fiancé", "fiancee", "fiancée", "grandma", "grandmother", "grandpa",
  "grandfather", "grandson", "granddaughter", "aunt", "uncle", "cousin", "niece", "nephew", "stepmom",
  "stepdad", "stepson", "stepdaughter", "in-law", "mother-in-law", "father-in-law", "sister-in-law",
  "brother-in-law", "roommate", "boss", "coworker", "colleague", "neighbor", "neighbour", "friend",
  "best friend", "ex", "ex-wife", "ex-husband",
];

const RELATION_SYNONYMS: Record<string, string[]> = {
  mom: ["mom", "mother", "mum", "mama", "mommy"],
  dad: ["dad", "father", "papa", "daddy"],
  wife: ["wife", "spouse", "partner"],
  husband: ["husband", "spouse", "partner"],
  kid: ["kid", "kids", "child", "children", "son", "daughter"],
  grandma: ["grandma", "grandmother", "nana", "granny"],
  grandpa: ["grandpa", "grandfather", "granddad"],
};

/** Canonical relation key ("mother" → "mom"). */
export function relationKey(word: string): string {
  const w = fold(word).trim();
  for (const [k, syn] of Object.entries(RELATION_SYNONYMS)) if (syn.includes(w)) return k;
  return w;
}

/** Relation words used in `generated` that appear neither in the note nor in known labels. */
export function inventedRelations(generated: string, source: string, known: string[]): string[] {
  const g = fold(generated);
  // "brothers" in the note allows "brother" (founder G11: "John and Ben are
  // brothers" was dropped for inventing the singular).
  const singular = (w: string) => [w, w.replace(/ies$/u, "y"), w.replace(/ren$/u, ""), w.replace(/s$/u, "")];
  const allowed = new Set([...wordsOf(source), ...known.flatMap((k) => wordsOf(k))].flatMap(singular).map(relationKey));
  const out: string[] = [];
  for (const w of RELATION_WORDS) {
    if (w === "friend" || w === "baby") continue; // too generic to police
    if (new RegExp(`\\b${w.replace(/[-]/g, "\\-")}s?\\b`).test(g) && !allowed.has(relationKey(w))) out.push(w);
  }
  return out;
}

export function wordsOf(text: string): string[] {
  return fold(text).split(/[^\p{L}\p{N}'-]+/u).filter(Boolean).map((w) => w.replace(/'s$/, ""));
}

// ─── Pronouns and kinship references ────────────────────────────────────────

export const PRONOUNS = new Set(["he", "him", "his", "she", "her", "hers", "they", "them", "their", "theirs", "himself", "herself", "themselves"]);

/** "my mom", "mom", "my sister" → the relation word; otherwise null. */
export function kinshipReference(mention: string): string | null {
  const m = fold(mention).trim().match(/^(?:my |our )?([a-z-]+)$/);
  if (!m) return null;
  const k = relationKey(m[1]);
  return RELATION_WORDS.map(relationKey).includes(k) ? k : null;
}

// ─── Promises ───────────────────────────────────────────────────────────────

const USER_COMMITMENT = /\b(i'll|i will|i'm going to|im going to|i am going to|i said i'd|i said i would|i told (?:him|her|them|\w+) i'd|i told (?:him|her|them|\w+) i would|i promised|i offered to|i owe|i need to|i have to|i've got to|i gotta|i should|i must|i agreed to|i'm supposed to|im supposed to|i'm bringing|i'm taking|i'm sending|i'm calling|remind me to|i'd send|i'd call|i'd bring|i'd help|need to (?:send|call|text|bring|get|book|buy|return|email|ask|check)|gotta|let me)\b/;

/** True when the wording has the user committing to something. */
export function isUserCommitment(sentence: string): boolean {
  return USER_COMMITMENT.test(fold(sentence));
}

const SELF_NOTE_START = /^(?:let's|lets|gonna|going to|i'm gonna|im gonna|i|i'm|im|i've|i'll|i'd|me|need|needs|have to|gotta|must|should|remember|don't forget|dont forget|ask|send|call|text|email|bring|return|buy|get|book|check|drop|dropping|bringing|sending|calling|texting|taking|picking|making|getting|buying|booking|returning|todo|to do|reminder)\b/;

/**
 * Whether the user is the one acting in this clause: an explicit commitment
 * ("I'll…", "I promised…"), or a note-to-self with no other subject
 * ("Dropping off a lasagna tomorrow", "Ask Priya how it went"). "Ben said
 * he'd pick up the cake" is Ben's promise, not the user's.
 */
export function userIsActor(clause: string): boolean {
  const c = fold(clause).replace(/^[^\p{L}]+/u, "").replace(/^(also|and|oh|ok|okay|so|then|plus|btw)[,]?\s+/, "");
  return USER_COMMITMENT.test(c) || SELF_NOTE_START.test(c);
}

// ─── Prompt injection ───────────────────────────────────────────────────────

const INSTRUCTION = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.!?\n]{0,40}\b(instructions?|prompts?|system|above|previous|prior)\b/,
  /\b(system prompt|developer (message|mode)|jailbreak|you are now|act as|pretend (to be|you are)|new instructions?|from now on,? you)\b/,
  /^\W*(please |now |also |and )?(mark|label|tag|set|record|list|save|store|classify|change|update|make)\b[^.!?\n]{0,40}\bas (my|his|her|their|a|an|the)\b/,
  /\b(output|print|reveal|repeat|return|show)\b[^.!?\n]{0,20}\b(your|the) (prompt|instructions|system|rules|json schema)\b/,
  /^\W*(please |now |also |and )?(delete|erase|wipe|remove)\b[^.!?\n]{0,30}\b(all|every|everything|my data|the database|memories|records)\b/,
  /\bas an ai\b|\bassistant:|\buser:|\bsystem:|<\/?(system|instructions?|note)>/,
];

/** True when a sentence reads as instructions to the AI rather than news about someone. */
export function looksLikeInstruction(sentence: string): boolean {
  const s = fold(sentence);
  return INSTRUCTION.some((re) => re.test(s));
}

// ─── Sentences ──────────────────────────────────────────────────────────────

/** The sentence(s) of `text` that contain the UTF-16 range [from, to). */
export function sentenceAround(text: string, from: number, to: number): string {
  const boundary = /[.!?\n]/;
  let a = from;
  while (a > 0 && !boundary.test(text[a - 1])) a--;
  // A quote that ends with its own full stop ("Ben runs Chicago Sunday.")
  // ends its sentence there; never read on into the next one.
  let b = to > from && boundary.test(text[to - 1]) ? to - 1 : to;
  while (b < text.length && !boundary.test(text[b])) b++;
  return text.slice(a, Math.min(text.length, b + 1));
}

// ─── Relationships to the user, as the note states them ─────────────────────

/** The relations a note can state to its writer ("my brother"), singular. */
const SELF_RELATIONS = [
  "brother", "sister", "sibling", "mom", "mother", "dad", "father", "son", "daughter", "kid", "child", "wife", "husband",
  "partner", "girlfriend", "boyfriend", "fiance", "fiancé", "fiancee", "fiancée", "grandma", "grandmother", "grandpa",
  "grandfather", "grandson", "granddaughter", "aunt", "uncle", "cousin", "niece", "nephew", "stepmom", "stepdad",
  "stepson", "stepdaughter", "mother-in-law", "father-in-law", "sister-in-law", "brother-in-law", "best friend",
  "boss", "coworker", "colleague", "roommate", "neighbor", "neighbour",
];
const REL_ALT = [...SELF_RELATIONS].sort((a, b) => b.length - a.length).join("|");
const NAME_RE = "\\p{Lu}[\\p{L}\\p{M}'’-]*";

/** Capitalised words that are never a person ("Every Christmas, my daughter Kaiya"). */
const NOT_PEOPLE = new Set([
  "i", "my", "our", "we", "the", "and", "but", "so", "every", "each", "also", "today", "tomorrow", "yesterday",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april",
  "may", "june", "july", "august", "september", "october", "november", "december", "christmas", "thanksgiving",
  "easter", "halloween", "hanukkah", "diwali", "eid", "new", "spring", "summer", "fall", "autumn", "winter",
]);

function singularRelation(word: string): string {
  const w = fold(word).trim();
  if (w === "children") return "child";
  if (SELF_RELATIONS.includes(w)) return w;
  const s = w.replace(/s$/u, "");
  return SELF_RELATIONS.includes(s) ? s : w;
}

/**
 * "my daughter Kaiya", "our son Max", "my older brother, John": what the
 * writer calls someone, then their name (founder H20). The phrase is
 * structure (SELF → daughter → Kaiya), never a name: null for anything else.
 */
export function selfRelationPhrase(text: string): { relation: string; name: string } | null {
  const m = text.normalize("NFC").trim().match(new RegExp(
    `^(?:my|our)\\s+(?:(?:older|younger|little|big|baby|twin|oldest|youngest|eldest)\\s+)?(${REL_ALT})\\s*,?\\s+(${NAME_RE}(?:\\s+${NAME_RE})?)`,
    "iu",
  ));
  if (!m || NOT_PEOPLE.has(fold(m[2]))) return null;
  return { relation: singularRelation(m[1]), name: m[2].replace(/['’]s$/u, "") };
}

/**
 * Relationships to the writer that the note states outright, by the name it
 * gives: "Ben is my brother", "Ben and John are my brothers", "my daughter
 * Kaiya", "Kaiya, my daughter", "Ben is the youngest sibling of myself, John
 * and Susan". Never inferred ("Ben's mom" is not the writer's mom; "Bryce
 * Lara's hubby" is Lara's). Names are as written; the caller matches them.
 */
export function statedSelfRelations(note: string): { name: string; relation: string }[] {
  const text = note.normalize("NFC");
  const out: { name: string; relation: string }[] = [];
  const add = (name: string, rel: string) => {
    if (NOT_PEOPLE.has(fold(name).replace(/['’]s$/u, ""))) return;
    const relation = singularRelation(rel);
    if (!out.some((o) => fold(o.name) === fold(name))) out.push({ name: name.replace(/['’]s$/u, ""), relation });
  };
  // "Ben is my brother", "Ben and John are my brothers", "Ben, John and Susan are my siblings".
  const listIs = new RegExp(`((?:${NAME_RE})(?:\\s*,\\s*${NAME_RE})*(?:\\s*,?\\s+and\\s+${NAME_RE})?)\\s+(?:is|are|was|were)\\s+(?:both\\s+|all\\s+)?(?:my|our)\\s+(?:(?:older|younger|little|big|baby|twin|oldest|youngest|eldest)\\s+)?(${REL_ALT})s?\\b`, "gu");
  for (const m of text.matchAll(listIs)) {
    for (const n of m[1].split(/\s*,\s*|\s+and\s+/u)) if (n && /^\p{Lu}/u.test(n)) add(n, m[2]);
  }
  // "my daughter Kaiya", "my brother, Ben".
  for (const m of text.matchAll(new RegExp(`\\b(?:my|our)\\s+(?:(?:older|younger|little|big|baby|twin)\\s+)?(${REL_ALT})\\s*,?\\s+(${NAME_RE})`, "giu"))) {
    if (/^\p{Lu}/u.test(m[2])) add(m[2], m[1]);
  }
  // "Kaiya, my daughter".
  for (const m of text.matchAll(new RegExp(`(${NAME_RE}),\\s+(?:my|our)\\s+(${REL_ALT})\\b`, "gu"))) add(m[1], m[2]);
  // "Ben is the youngest sibling of myself, John and Susan": everyone in the list shares it.
  const of = new RegExp(`(${NAME_RE})\\s+is\\s+(?:the|a|an)\\s+(?:\\w+\\s+)?(${REL_ALT})\\s+of\\s+(?:myself|me)\\b((?:\\s*,\\s*${NAME_RE})*(?:\\s*,?\\s+and\\s+${NAME_RE})?)`, "gu");
  for (const m of text.matchAll(of)) {
    add(m[1], m[2]);
    for (const n of m[3].split(/\s*,\s*|\s+and\s+/u)) if (n && /^\p{Lu}/u.test(n)) add(n, m[2]);
  }
  return out;
}

// ─── Someone else's promise to the writer ───────────────────────────────────

/**
 * "Tyler said he'd send me his contractor's number", "she promised to call
 * me", "he'll send me the link": a commitment by someone else, to the writer.
 * Kept as theirs (waiting on them), never under "You said you'd".
 */
// What someone can commit to doing for the user.
const FOR_ME = "send|get|give|bring|call|text|email|share|introduce|lend|drop off|pick up|show|forward|mail|return|pay|buy|make|lend|help|cover|set up|hook";

export function theyPromisedMe(clause: string): boolean {
  const c = fold(clause);
  // "Tyler said he'd send me…", "promised she would…"
  return /\b(?:said|says|promised|offered|told me)\b[^.!?]{0,20}\b(?:he|she|they)(?:'d|'ll| would| will| was going to| is going to)\b/u.test(c)
    // "Tyler promised to send me…", "offered to lend us…"
    || /\b(?:promised|offered|agreed)\s+to\s+\w+(?:\s+\w+)?\s+(?:me|us)\b/u.test(c)
    // "Tyler promised me his contractor's number", "owes me $20"
    || /\b(?:promised|owes)\s+(?:me|us)\b/u.test(c)
    // "Tyler will send me…", "Tyler's going to text me…", "he'll bring us…":
    // anyone but the user ("I'll send him" is the user's own, caught first).
    || new RegExp(`(?:^|[,;]\\s*|\\b(?:and|but|so|then)\\s+)(?!(?:i|we|i'll|we'll|i'm|we're)\\b)[\\p{L}'’-]+(?:\\s+[\\p{L}'’-]+)?(?:'ll| will|'s going to| is going to| are going to| is gonna)\\s+(?:${FOR_ME})\\b[^.!?]{0,40}\\b(?:me|us)\\b`, "u").test(c);
}

// ─── Pets ───────────────────────────────────────────────────────────────────

const ANIMAL = /\b(dog|dogs|puppy|pup|cat|cats|kitten|kitty|pet|pets|horse|pony|bunny|rabbit|bird|parrot|hamster|guinea pig|ferret|lizard|turtle|tortoise|fish)\b/u;
const VET = /\b(vet|vets|veterinarian|veterinary|animal hospital)\b/u;

/**
 * A pet's health, not a person's: "Ben's dog Mochi has a vet appointment
 * Friday". Pet visits aren't the protected human health that waits for a yes
 * (stabilization: pet health). A person's own health words, or a death, still
 * count.
 */
export function aboutAnimalHealth(text: string): boolean {
  const t = fold(text);
  if (VET.test(t)) return true;
  if (!ANIMAL.test(t)) return false;
  // "the dog had surgery", "his cat is sick": the health word follows the animal closely.
  return /\b(dog|dogs|puppy|pup|cat|cats|kitten|kitty|pet|pets|horse|pony|bunny|rabbit|bird|parrot|hamster|ferret)\b(?:\s+\p{L}+){0,4}\s+(?:has|had|is|was|needs|got|going for|getting)\b/u.test(t);
}
