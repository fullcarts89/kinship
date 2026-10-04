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
  const s = fold(sentence);
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

/** True when the text carries a negation or a reversal word. */
export function hasNegation(text: string): boolean {
  return NEGATION.test(fold(text));
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
  const allowed = new Set([...wordsOf(source), ...known.flatMap((k) => wordsOf(k))].map(relationKey));
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
