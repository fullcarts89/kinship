// relationship_extract, steps 3–7 of plan §7: everything after the model.
//
// The model proposes; this file decides. It is deterministic and has no
// I/O, so the evaluation harness exercises exactly the code the gateway runs.
//
//   ground    every item needs exact evidence in the note (spans derived here,
//             never taken from the model); names, numbers, relations and
//             sensitive terms in the statement must come from the note or the
//             user's own roster; instruction-like text is never memory
//   resolve   person: exact → nickname → context person → ask. Two candidates
//             always ask. A pronoun must point at someone named in the note.
//   guard     certainty can only be lowered by hedged wording; sensitivity can
//             only be raised; a negated note can't become a positive statement
//   date      the model's date words, resolved by dates.ts
//   relate    merge / supersede / resolve proposals checked against the
//             dossier; never across subjects; never onto an item the user
//             wrote or edited; a hedged item never replaces a firm one
//   tier      plan §8: auto, light confirmation, hold for one question, drop

import { addDays, localDay, iso, resolveDate, type DateResolution } from "./dates.ts";
import {
  capCertainty,
  floorSensitivity,
  fold,
  hasNegation,
  inventedRelations,
  inventedSensitiveTerms,
  userIsActor,
  kinshipReference,
  looksLikeInstruction,
  nameKey,
  PRONOUNS,
  relationKey,
  sentenceAround,
  wordingCertainty,
  wordsOf,
} from "./lexicon.ts";
import { codePointLength, locateEvidence, type Span } from "../spans.ts";
import type {
  Clarification,
  DossierItem,
  DropReason,
  EventType,
  ExtractionInput,
  ExtractionOutcome,
  Flag,
  Kind,
  ModelProposal,
  PlannedItem,
  PlannedSpan,
  ProposedItem,
  RosterPerson,
  Tier,
} from "./types.ts";
import { ASPECTS, CERTAINTIES, EVENT_TYPES, FACT_CATEGORIES, FIRMNESS, KINDS, RECURRENCES, SENSITIVITIES, SUBJECTS } from "./types.ts";

export const MAX_ITEMS = 8;
export const AUTO_SAVE_CONFIDENCE = 0.85;
export const DROP_BELOW_CONFIDENCE = 0.6;
/** Floor for items held because code confirms the person or subject is ambiguous. */
export const HOLD_FLOOR_CONFIDENCE = 0.3;
const WHO_AMBIGUITY: Flag[] = ["person_ambiguous", "pronoun_multiple", "subject_check"];
export const THREAD_FOLLOWUP_DAYS = 42;
const QUOTE_MAX = 200;

/** Deterministic follow-up policy by event type (plan §13; never the model's call). */
export const FOLLOWUP_POLICY: Record<EventType, "before" | "after" | "both" | "none"> = {
  race: "after", surgery: "both", medical: "both", exam: "both", interview: "both",
  move: "after", trip: "after", wedding: "both", birth: "after", funeral: "after",
  job_start: "after", school_start: "after", celebration: "both", other: "none",
};

const CERTAINTY_RANK = { stated: 3, planned: 2, reported: 1, tentative: 1, wished: 0 } as const;

export function planExtraction(input: ExtractionInput, proposal: ModelProposal): ExtractionOutcome {
  const text = input.capture.raw_text.normalize("NFC");
  const ctx = new Context(input, text);
  const dropped: ExtractionOutcome["dropped"] = [];
  const items: PlannedItem[] = [];

  const proposed = Array.isArray(proposal?.items) ? proposal.items : [];
  for (const [i, raw] of proposed.entries()) {
    if (i >= MAX_ITEMS) {
      dropped.push({ reason: "too_many_items", kind: null });
      continue;
    }
    const result = planItem(ctx, raw);
    if ("drop" in result) dropped.push({ reason: result.drop, kind: KINDS.includes(raw?.kind) ? raw.kind : null });
    else {
      const dup = items.find((p) => sameItem(p, result.item));
      if (dup) {
        // Same thing twice in one note: keep one, with both spans.
        for (const s of result.item.spans) if (!dup.spans.some((d) => d.start === s.start)) dup.spans.push(s);
        dropped.push({ reason: "duplicate", kind: result.item.kind });
      } else items.push(result.item);
    }
  }

  const clarification = chooseClarification(ctx, items);
  const tier = items.length === 0
    ? "nothing"
    : items.some((i) => i.tier === "hold")
    ? "clarify"
    : items.some((i) => i.tier === "confirm")
    ? "confirm"
    : "auto";
  return { items, dropped, clarification, tier, injection_suspected: ctx.injection };
}

// ─── Context ────────────────────────────────────────────────────────────────

class Context {
  readonly byKey = new Map<string, RosterPerson>();
  readonly dossier = new Map<string, DossierItem>();
  readonly folded: string;
  readonly knownNames: Set<string>;
  readonly knownRelations: string[];
  readonly injection: boolean;
  readonly anchor: string;

  constructor(readonly input: ExtractionInput, readonly text: string) {
    for (const p of input.roster) this.byKey.set(p.key, p);
    for (const d of input.dossier) this.dossier.set(d.key, d);
    this.folded = fold(text);
    this.knownNames = new Set(
      input.roster.flatMap((p) => [p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])])
        .concat(input.related.map((r) => r.name ?? ""))
        .flatMap((n) => wordsOf(n))
        .map(nameKey),
    );
    this.knownRelations = [
      ...input.roster.map((p) => p.relationship_label ?? ""),
      ...input.roster.map((p) => p.display_name),
      ...input.related.map((r) => r.relation),
    ];
    this.injection = text.split(/(?<=[.!?\n])/).some((s) => looksLikeInstruction(s));
    this.anchor = input.capture.occurred_at;
  }

  inNote(words: string): boolean {
    return this.folded.includes(fold(words).trim());
  }

  /** Roster people a name could mean: display name, full name, first name, nickname. */
  candidatesFor(mention: string): RosterPerson[] {
    // "Aunt Chrissy", "Dr. Patel", "my friend Ben" → the name itself.
    const k = nameKey(mention).replace(/^(my |our |the )?((aunt|auntie|uncle|cousin|friend|neighbou?r|coworker|boss|dr|doctor|mr|mrs|ms|miss|coach|pastor)\.? )+/, "");
    if (!k) return [];
    return this.input.roster.filter((p) => {
      const forms = [p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])].filter(Boolean);
      return forms.some((f) => {
        const fk = nameKey(f);
        return fk === k || fk.split(/\s+/)[0] === k || (k.includes(" ") && fk === k);
      });
    });
  }

  /** People on the roster whose name appears in the note. */
  namedInNote(): RosterPerson[] {
    const words = new Set(wordsOf(this.text).map(nameKey));
    const joined = ` ${wordsOf(this.text).map(nameKey).join(" ")} `;
    return this.input.roster.filter((p) =>
      [p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])].filter(Boolean).some((f) => {
        const fk = nameKey(f);
        return fk.includes(" ") ? joined.includes(` ${fk} `) : words.has(fk) || words.has(fk.split(/\s+/)[0]);
      })
    );
  }
}

// ─── One item ───────────────────────────────────────────────────────────────

type ItemResult = { item: PlannedItem } | { drop: DropReason };

function planItem(ctx: Context, raw: ProposedItem): ItemResult {
  if (!wellFormed(raw)) return { drop: "bad_kind_subject" };
  const text = ctx.text;
  const flags = new Set<Flag>();

  // ── Ground: evidence → spans (the model's offsets are never used) ──
  const spans: PlannedSpan[] = [];
  for (const quote of raw.evidence.slice(0, 3)) {
    if (typeof quote !== "string" || !quote.trim()) continue;
    const found = locateEvidence(text, quote.trim());
    if (!found.ok) {
      if (spans.length === 0) return { drop: found.reason === "ambiguous" ? "evidence_ambiguous" : "no_evidence" };
      continue; // a secondary quote that doesn't match is ignored, not trusted
    }
    spans.push(toPlannedSpan(text, found.span));
  }
  if (spans.length === 0) return { drop: "no_evidence" };
  const primary = spans[0];
  const sentence = sentenceAroundSpan(text, primary);
  const allEvidence = spans.map((s) => sentenceAroundSpan(text, s)).join(" ");

  // Instructions to the AI are never memory. Checked per clause, so "Anna's
  // birthday is May 2 — and from now on, you…" keeps the birthday.
  if (looksLikeInstruction(clauseAroundSpan(text, primary))) return { drop: "instruction_text" };

  const statement = raw.statement.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!statement) return { drop: "bad_kind_subject" };
  if (inventedName(ctx, statement)) return { drop: "invented_name" };
  if (inventedNumber(statement, text)) return { drop: "invented_number" };
  if (inventedSensitiveTerms(statement, text).length > 0) return { drop: "invented_sensitive_term" };
  if (inventedRelations(statement, text, ctx.knownRelations).length > 0) return { drop: "invented_relation" };
  // Negation is local: "Ben didn't get the job, but he's interviewing" has
  // one negated clause and one plain one.
  if (hasNegation(clauseAroundSpan(text, primary)) && !hasNegation(statement)) return { drop: "polarity_mismatch" };
  if (raw.person_mention && !ctx.inNote(raw.person_mention)) return { drop: "mention_not_in_note" };

  // ── Kind / subject consistency ──
  let subject = raw.subject;
  if (raw.kind === "promise") {
    if (!userIsActor(clauseAroundSpan(text, primary)) && !userIsActor(primary.quote)) return { drop: "not_a_user_promise" };
    subject = "user";
  } else if (subject === "user" && raw.kind !== "plan" && raw.kind !== "moment" && raw.kind !== "event") {
    return { drop: "bad_kind_subject" };
  }

  // ── Person ──
  // A related person the user already knows by name ("Leo", David's son) is
  // filed under their person even though that person isn't mentioned.
  const knownRelated = subject === "related" ? relatedByName(ctx, raw) : null;
  const who = knownRelated
    ? knownRelated.who
    : resolvePerson(ctx, raw, flags);
  if ("drop" in who) return who;

  // ── Related person ("Sarah's sister") ──
  let related: PlannedItem["related"] = null;
  if (knownRelated) {
    if (knownRelated.flag) flags.add(knownRelated.flag);
    related = knownRelated.related;
  } else if (subject === "related") {
    const relation = noteRelation(ctx, (raw.related_relation ?? "").trim());
    if (!relation) return { drop: "invented_relation" };
    const name = raw.related_name && ctx.inNote(raw.related_name) ? raw.related_name.trim() : null;
    const existing = who.person_key
      ? ctx.input.related.filter((r) =>
        r.person_key === who.person_key && relationKey(r.relation) === relationKey(relation) &&
        (!name || !r.name || nameKey(r.name) === nameKey(name))
      )
      : [];
    if (existing.length === 1) {
      related = { id: existing[0].id, relation: existing[0].relation, name: existing[0].name ?? name };
    } else {
      // A new related row (or two siblings we can't tell apart): confirm.
      related = { id: null, relation: relation.toLowerCase().slice(0, 100), name };
      flags.add(existing.length > 1 ? "person_ambiguous" : "new_related");
    }
  } else if (who.person_key) {
    // "Sarah's sister has surgery" filed as Sarah herself is the costliest
    // subject error; if the evidence says "<name>'s <relation>", ask.
    const person = ctx.byKey.get(who.person_key)!;
    if (possessiveRelation(sentence, person)) flags.add("subject_check");
  }

  // ── Certainty: wording can only lower it ──
  const cap = capCertainty(raw.certainty, wordingCertainty(certaintyText(text, spans, raw)));
  const certainty = cap.certainty;
  if (cap.lowered) flags.add("certainty_lowered");
  if (certainty === "reported") flags.add("reported");

  // ── Sensitivity: wording can only raise it ──
  const floor = floorSensitivity(raw.sensitivity, allEvidence, raw.kind === "event" ? raw.detail.event_type : null);
  const sensitivity = floor.sensitivity;
  if (floor.raised) flags.add("sensitivity_raised");
  if (sensitivity !== "none") flags.add("sensitive");

  // ── Date: the model's words, our calendar ──
  let resolution: DateResolution | null = null;
  if (raw.date_text && raw.date_text.trim()) {
    const words = raw.date_text.trim();
    if (ctx.inNote(words)) {
      resolution = resolveDate(words, ctx.anchor, ctx.input.capture.time_zone, raw.date_direction);
      if (resolution.ambiguous) flags.add("date_ambiguous");
      if (["week", "season", "month"].includes(resolution.precision) && raw.kind !== "plan") flags.add("date_coarse");
    }
    // Date words that aren't in the note are ignored, never resolved.
  }

  const detail = buildDetail(ctx, raw.kind, raw, resolution, sentence);
  if ("drop" in detail) return detail;
  if (raw.kind === "tradition") flags.add("tradition"); // plan §5: never inferred silently
  if (raw.kind === "event" && (sensitivity === "health" || sensitivity === "death_grief") &&
      (!resolution || !resolution.date) && wordsOf(sentence).some((w) => DATEISH.has(w))) {
    flags.add("date_unresolved_sensitive");
  }

  // ── Existing memory: merge / supersede / resolve ──
  const action = relate(ctx, raw, {
    kind: raw.kind,
    person_key: who.person_key,
    subject,
    related_id: related?.id ?? null,
    certainty,
    detail: detail.detail,
  }, flags);

  // ── Confidence and tier ──
  let confidence = clamp01(Number(raw.confidence));
  if (flags.has("certainty_lowered") || flags.has("sensitivity_raised") || flags.has("person_disagreement")) {
    confidence = Math.min(confidence, 0.84);
  }
  // A model unsure *who* an item is about ("Sam" with two Sams) is right to
  // be unsure: when code independently finds the same ambiguity, the item is
  // held for one question (never saved) instead of silently dropped.
  const heldForWho = WHO_AMBIGUITY.some((f) => flags.has(f));
  if (confidence < (heldForWho ? HOLD_FLOOR_CONFIDENCE : DROP_BELOW_CONFIDENCE)) return { drop: "low_confidence" };
  if (confidence < AUTO_SAVE_CONFIDENCE) flags.add("mid_confidence");

  const tier = tierFor(flags);
  return {
    item: {
      kind: raw.kind,
      person_id: who.person_id,
      person_key: who.person_key,
      new_person_name: who.new_person_name,
      subject_type: subject,
      related,
      statement,
      detail: detail.detail,
      certainty,
      sensitivity,
      confidence: Math.round(confidence * 100) / 100,
      spans,
      action,
      tier,
      flags: [...flags],
      date_rule: resolution?.rule ?? null,
    },
  };
}

// A pronoun that could point at two named people ("Ben and Josh went
// climbing. He fell.") waits for the user, like any other ambiguity.
const HOLD_FLAGS: Flag[] = ["new_person", "person_ambiguous", "person_disagreement", "pronoun_multiple", "subject_check", "date_unresolved_sensitive"];

function tierFor(flags: Set<Flag>): Tier {
  if (HOLD_FLAGS.some((f) => flags.has(f))) return "hold";
  if (flags.size > 0) return "confirm"; // any other flag means "show it, let them fix it"
  return "auto";
}

function wellFormed(raw: ProposedItem): boolean {
  return !!raw && typeof raw === "object" &&
    KINDS.includes(raw.kind) && SUBJECTS.includes(raw.subject) &&
    CERTAINTIES.includes(raw.certainty) && SENSITIVITIES.includes(raw.sensitivity) &&
    typeof raw.statement === "string" && Array.isArray(raw.evidence) &&
    typeof raw.person === "string" && !!raw.detail && typeof raw.detail === "object" &&
    !!raw.existing && typeof raw.existing === "object";
}

/**
 * The relation word as the note says it. The model may normalise ("mother"
 * for the note's "mom"); a synonym is accepted only when exactly one word in
 * the note has the same canonical relation, and that word is what's stored.
 */
function noteRelation(ctx: Context, relation: string): string | null {
  if (!relation) return null;
  if (ctx.inNote(relation)) return relation;
  const key = kinshipReference(relation); // only real relation words take a synonym
  if (!key) return null;
  const matches = [...new Set(wordsOf(ctx.text).filter((w) => relationKey(w) === key))];
  return matches.length === 1 ? matches[0] : null;
}

/**
 * The words whose hedges bind this item: the main sentence, every quoted
 * sentence, and a short sentence right after the main one ("Ben got the
 * job. I think."). A quoted sentence that carries an event's goal hedges the
 * goal, not the event ("He's hoping to break four hours" leaves the race firm).
 */
function certaintyText(text: string, spans: PlannedSpan[], raw: ProposedItem): string {
  const parts = [sentenceAroundSpan(text, spans[0])];
  const goal = raw.kind === "event" && typeof raw.detail?.event_goal === "string" && raw.detail.event_goal.trim()
    ? fold(raw.detail.event_goal.trim())
    : null;
  for (const sp of spans.slice(1)) {
    const sentence = sentenceAroundSpan(text, sp);
    if (goal && fold(sentence).includes(goal)) continue;
    parts.push(sentence);
  }
  const next = sentenceAfter(text, spans[0]);
  if (next && wordsOf(next).length <= 4) parts.push(next);
  return parts.join(" ");
}

/** The sentence that follows the one holding `span`, or null. */
function sentenceAfter(text: string, span: PlannedSpan): string | null {
  const boundary = /[.!?\n]/;
  let b = Array.from(text).slice(0, span.end).join("").length;
  if (!(b > 0 && boundary.test(text[b - 1]))) {
    while (b < text.length && !boundary.test(text[b])) b++;
    b++;
  }
  while (b < text.length && boundary.test(text[b])) b++;
  const rest = text.slice(b);
  const m = rest.match(/^[^.!?\n]*[.!?\n]?/);
  const next = m ? m[0].trim() : "";
  return next ? next : null;
}

function toPlannedSpan(text: string, span: Span): PlannedSpan {
  const chars = Array.from(text);
  const quote = chars.slice(span.start, span.end).join("");
  return { start: span.start, end: span.end, quote: Array.from(quote).slice(0, QUOTE_MAX).join("") };
}

function sentenceAroundSpan(text: string, span: PlannedSpan): string {
  const chars = Array.from(text);
  const from = chars.slice(0, span.start).join("").length;
  const to = chars.slice(0, span.end).join("").length;
  return sentenceAround(text, from, to);
}

function clauseAroundSpan(text: string, span: PlannedSpan): string {
  const chars = Array.from(text);
  const from = chars.slice(0, span.start).join("").length;
  const to = chars.slice(0, span.end).join("").length;
  const boundary = /[.!?\n,;:—–()]/;
  let a = from;
  while (a > 0 && !boundary.test(text[a - 1]) && !/\bbut $/i.test(text.slice(Math.max(0, a - 4), a))) a--;
  // A quote ending in its own punctuation ends its clause there (the next
  // sentence, e.g. an injected instruction, is not part of this item).
  let b = to > from && boundary.test(text[to - 1]) ? to - 1 : to;
  while (b < text.length && !boundary.test(text[b]) && !/^ but\b/i.test(text.slice(b, b + 4))) b++;
  // The quote itself always counts, even if it spans a boundary.
  return text.slice(Math.min(a, from), Math.max(b, to));
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

// ─── Grounding checks ───────────────────────────────────────────────────────

const ALWAYS_OK = new Set([
  "i", "i'm", "i've", "i'll", "i'd", "the", "a", "an", "he", "she", "they", "his", "her", "their", "we", "our",
  "you", "your", "user", "it", "this", "that", "there", "on", "in", "at", "for", "and", "but", "or", "to",
  "mom", "dad", "mum",
]);

/**
 * A capitalised word in the statement that is neither in the note nor the
 * user's roster is an invented name (or an invented place, date or label).
 * The first word is held to the same rule unless it's a common function
 * word, so "Ben…" must be grounded but "The…" needn't be.
 */
function inventedName(ctx: Context, statement: string): boolean {
  const tokens = statement.match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? [];
  for (const t of tokens) {
    if (!/^\p{Lu}/u.test(t)) continue;
    const k = nameKey(t);
    if (ALWAYS_OK.has(k)) continue;
    if (ctx.knownNames.has(k)) continue;
    if (ctx.folded.normalize("NFD").replace(/\p{M}+/gu, "").includes(k)) continue;
    return true;
  }
  return false;
}

function inventedNumber(statement: string, text: string): boolean {
  const nums = statement.match(/\d+(?:[.:,]\d+)*/g) ?? [];
  return nums.some((n) => !text.includes(n));
}

function possessiveRelation(sentence: string, person: RosterPerson): boolean {
  const s = fold(sentence);
  const names = [person.display_name, person.full_name ?? "", ...(person.nicknames ?? [])].filter(Boolean);
  return names.some((n) => {
    const first = fold(n).split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${first}'s (?:\\w+ )?(mom|mother|mum|dad|father|sister|brother|son|daughter|kid|kids|wife|husband|partner|boyfriend|girlfriend|fianc\\S*|grandma|grandmother|grandpa|grandfather|aunt|uncle|cousin|niece|nephew|boss|roommate|friend|baby|parents?)\\b`).test(s);
  });
}

const DATEISH = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "tonight",
  "next", "week", "weekend", "month", "today",
]);

// ─── Person resolution ──────────────────────────────────────────────────────

function relatedByName(ctx: Context, raw: ProposedItem): { who: Who; related: PlannedItem["related"]; flag: Flag | null } | null {
  const name = raw.related_name?.trim();
  if (!name || !ctx.inNote(name)) return null;
  const rows = ctx.input.related.filter((r) => r.name && nameKey(r.name) === nameKey(name));
  if (rows.length !== 1) return null;
  const row = rows[0];
  const owner = ctx.byKey.get(row.person_key);
  if (!owner) return null;
  // The model must agree whose relative this is (or leave it to us).
  const agrees = raw.person === row.person_key || raw.person === "unknown" || raw.person === "new";
  return {
    who: { person_id: owner.id, person_key: owner.key, new_person_name: null },
    related: { id: row.id, relation: row.relation, name: row.name ?? name },
    flag: agrees ? null : "person_disagreement",
  };
}

type Who = { person_id: string | null; person_key: string | null; new_person_name: string | null } | { drop: DropReason };

function resolvePerson(ctx: Context, raw: ProposedItem, flags: Set<Flag>): Who {
  const mention = (raw.person_mention ?? "").trim();
  const modelKey = raw.person;
  const context = ctx.input.capture.context_person_key ?? null;
  const pick = (p: RosterPerson) => ({ person_id: p.id, person_key: p.key, new_person_name: null });
  const unresolved = (flag: Flag, name: string | null = null) => {
    flags.add(flag);
    return { person_id: null, person_key: null, new_person_name: name };
  };

  // No mention: only the person Tell was opened from can be implied
  // ("Starts kindergarten Tuesday" on David's page).
  if (!mention) {
    if (context && ctx.byKey.has(context) && (modelKey === context || modelKey === "unknown")) return pick(ctx.byKey.get(context)!);
    if (ctx.byKey.has(modelKey) && ctx.namedInNote().some((p) => p.key === modelKey)) return pick(ctx.byKey.get(modelKey)!);
    return unresolved("person_ambiguous");
  }

  const folded = fold(mention).replace(/'s$/, "");
  // "Sarah's sister" names Sarah; the relation is the subject's business.
  const possessor = mention.match(/^(.+?)['’]s\s+\S/u)?.[1];
  if (possessor && !PRONOUNS.has(fold(possessor))) {
    return resolvePerson(ctx, { ...raw, person_mention: possessor }, flags);
  }

  // Pronouns: must point at someone the note names, or the context person.
  if (PRONOUNS.has(folded)) {
    flags.add("pronoun");
    const named = ctx.namedInNote();
    const allowed = new Set([...named.map((p) => p.key), ...(context ? [context] : [])]);
    if (!ctx.byKey.has(modelKey) || !allowed.has(modelKey)) return unresolved("person_ambiguous");
    if (allowed.size > 1) flags.add("pronoun_multiple");
    return pick(ctx.byKey.get(modelKey)!);
  }

  // "my mom", "Mom", "my sister": the roster person with that name or label.
  const kin = kinshipReference(mention);
  if (kin) {
    const matches = ctx.input.roster.filter((p) =>
      [p.display_name, ...(p.nicknames ?? [])].some((n) => relationKey(n) === kin) ||
      (p.relationship_label ? wordsOf(p.relationship_label).some((w) => relationKey(w) === kin) : false)
    );
    if (matches.length === 1) {
      if (modelKey !== matches[0].key && modelKey !== "unknown" && modelKey !== "new") flags.add("person_disagreement");
      return pick(matches[0]);
    }
    if (matches.length > 1) return unresolved("person_ambiguous");
    // Not on the roster: "her mom" is usually a related person, handled by subject.
    if (ctx.byKey.has(modelKey) && raw.subject === "related") return pick(ctx.byKey.get(modelKey)!);
    return unresolved("person_ambiguous");
  }

  // A name.
  const candidates = ctx.candidatesFor(mention);
  if (candidates.length === 0) {
    // Someone not on the roster. Must look like a name and be in the note.
    if (!/^\p{Lu}/u.test(mention)) return unresolved("person_ambiguous");
    return unresolved("new_person", mention.replace(/['’]s$/, "").slice(0, 100));
  }
  if (candidates.length === 1) {
    const c = candidates[0];
    if (modelKey !== c.key) {
      // The model filed it under someone else, or as new: ask instead of guessing.
      return modelKey === "new" ? pick(c) : unresolved("person_disagreement");
    }
    return pick(c);
  }
  // Two or more people share the name: the context person settles it, or the
  // note naming exactly one of them by their label ("Chris, my neighbor").
  if (context && candidates.some((c) => c.key === context)) return pick(ctx.byKey.get(context)!);
  const byLabel = candidates.filter((c) => {
    const words = wordsOf(c.relationship_label ?? "").filter((w) => w.length > 2);
    return words.length > 0 && words.every((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(ctx.folded));
  });
  if (byLabel.length === 1 && byLabel[0].key === modelKey) return pick(byLabel[0]);
  return unresolved("person_ambiguous");
}

// ─── Detail ─────────────────────────────────────────────────────────────────

const SEASON_OF_MONTH = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];

function buildDetail(
  ctx: Context,
  kind: Kind,
  raw: ProposedItem,
  r: DateResolution | null,
  sentence: string,
): { detail: Record<string, unknown> } | { drop: DropReason } {
  const d = raw.detail;
  const grounded = (v: string | null | undefined, max = 200): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.normalize("NFC").replace(/\s+/g, " ").trim();
    if (!t || codePointLength(t) > max) return undefined;
    // Every content word must be the user's own.
    const words = wordsOf(t).filter((w) => w.length > 2);
    return words.every((w) => ctx.folded.includes(w)) ? t : undefined;
  };
  const hint = r && raw.date_text ? raw.date_text.trim().slice(0, 200) : undefined;
  const dayDate = r?.precision === "day" ? r.date ?? undefined : undefined;
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  };

  switch (kind) {
    case "fact":
      set("category", FACT_CATEGORIES.includes(d.category as never) ? d.category : "other");
      set("attribute", grounded(d.attribute, 100));
      set("value", grounded(d.value));
      break;
    case "event": {
      const type: EventType = EVENT_TYPES.includes(d.event_type as never) ? d.event_type! : "other";
      set("event_type", type);
      set("followup_policy", FOLLOWUP_POLICY[type]);
      set("date_precision", r?.date ? r.precision : "unknown");
      if (r?.date) {
        set("date", r.date);
        if (r.date_end && r.date_end !== r.date) set("date_end", r.date_end);
      }
      set("date_hint", hint);
      set("time_of_day", grounded(d.time_of_day, 50));
      set("event_goal", grounded(d.event_goal));
      break;
    }
    case "promise":
      set("due_hint", hint);
      set("due_date", dayDate);
      break;
    case "plan": {
      set("firmness", FIRMNESS.includes(d.firmness as never) ? d.firmness : "idea");
      set("when_hint", hint);
      set("date", dayDate);
      if (r?.precision === "season" && r.date) set("season", SEASON_OF_MONTH[Number(r.date.slice(5, 7)) - 1]);
      break;
    }
    case "thread":
      set("topic", grounded(d.topic) ?? Array.from(sentence.trim()).slice(0, 200).join(""));
      set("followup_after_days", THREAD_FOLLOWUP_DAYS);
      break;
    case "moment":
      set("date", dayDate);
      set("date_hint", hint); // the user's words, so a flagged date can be shown and fixed (C-4)
      set("place", grounded(d.place));
      break;
    case "milestone":
      set("milestone_type", grounded(d.milestone_type, 100) ?? "other");
      set("anniversary", false);
      set("date", dayDate);
      set("date_hint", hint);
      break;
    case "tradition": {
      if (!RECURRENCES.includes(d.recurrence as never)) return { drop: "bad_kind_subject" };
      const anchor = grounded(d.anchor);
      if (!anchor) return { drop: "no_evidence" };
      set("recurrence", d.recurrence);
      set("anchor", anchor);
      break;
    }
    case "context":
      set("aspect", ASPECTS.includes(d.aspect as never) ? d.aspect : "other");
      break;
  }
  return { detail: out };
}

// ─── Existing memory ────────────────────────────────────────────────────────

interface NewShape {
  kind: Kind;
  person_key: string | null;
  subject: string;
  related_id: string | null;
  certainty: keyof typeof CERTAINTY_RANK;
  detail: Record<string, unknown>;
}

const SUPERSEDE_FROM: Record<Kind, Kind[]> = {
  fact: ["fact"],
  event: ["event", "plan"],
  plan: ["plan"],
  promise: ["promise"],
  thread: ["thread"],
  moment: [],
  milestone: [],
  tradition: [],
  context: [],
};

function relate(ctx: Context, raw: ProposedItem, n: NewShape, flags: Set<Flag>): PlannedItem["action"] {
  const none = { type: "new" as const, target_id: null };
  if (!n.person_key) return none;
  const proposedTarget = raw.existing?.target ? ctx.dossier.get(raw.existing.target) : undefined;
  const sameSubject = (t: DossierItem) =>
    t.person_key === n.person_key && t.subject_type === n.subject &&
    (n.subject !== "related" || (t.related_key ? ctx.input.related.find((r) => r.key === t.related_key)?.id === n.related_id : false));
  const protectedItem = (t: DossierItem) => t.user_state === "edited" || t.user_state === "user_authored";

  // Deterministic exact dedupe first: same event on the same day is one event.
  if (n.kind === "event" && n.detail.date) {
    const twin = ctx.input.dossier.find((t) =>
      t.kind === "event" && sameSubject(t) && t.detail.event_type === n.detail.event_type &&
      typeof t.detail.date === "string" && withinDays(t.detail.date as string, n.detail.date as string, 0)
    );
    if (twin) {
      if (protectedItem(twin)) {
        flags.add("protected_target");
        return none;
      }
      return { type: "merge", target_id: twin.id };
    }
  }

  const action = raw.existing?.action;
  if (!proposedTarget || action === "new" || !action) return none;
  // Never across subjects, whatever the model says.
  if (!sameSubject(proposedTarget)) return none;
  if (protectedItem(proposedTarget)) {
    flags.add("protected_target");
    return none;
  }
  const firm = n.certainty === "stated" || n.certainty === "planned";
  switch (action) {
    case "merge": {
      if (proposedTarget.kind !== n.kind) return none;
      if (CERTAINTY_RANK[proposedTarget.certainty] !== CERTAINTY_RANK[n.certainty]) return none;
      if (n.kind === "event") {
        if (proposedTarget.detail.event_type !== n.detail.event_type) return none;
        const a = proposedTarget.detail.date as string | undefined;
        const b = n.detail.date as string | undefined;
        if (a && b && !withinDays(a, b, 3)) return none;
      }
      return { type: "merge", target_id: proposedTarget.id };
    }
    case "supersede": {
      // "Mike may leave Google" never replaces "Mike works at Google".
      if (!firm) return none;
      if (!SUPERSEDE_FROM[n.kind].includes(proposedTarget.kind)) return none;
      if (CERTAINTY_RANK[n.certainty] < CERTAINTY_RANK[proposedTarget.certainty]) return none;
      // A fact replaces a fact about the same kind of thing ("works at" by
      // "left"), not an unrelated one; "other" matches anything.
      const a = proposedTarget.detail.category;
      const b = n.detail.category;
      if (n.kind === "fact" && a !== b && a !== "other" && b !== "other") return none;
      return { type: "supersede", target_id: proposedTarget.id };
    }
    case "resolves": {
      if (!firm || proposedTarget.kind !== "thread" || proposedTarget.status !== "active") return none;
      return { type: "resolves", target_id: proposedTarget.id };
    }
  }
  return none;
}

function withinDays(a: string, b: string, days: number): boolean {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) <= days * 86_400_000;
}

function sameItem(a: PlannedItem, b: PlannedItem): boolean {
  if (a.kind !== b.kind || a.person_key !== b.person_key || a.subject_type !== b.subject_type) return false;
  if (a.related?.id !== b.related?.id || a.related?.relation !== b.related?.relation) return false;
  if (a.kind === "event" && a.detail.event_type === b.detail.event_type && a.detail.date && a.detail.date === b.detail.date) return true;
  return fold(a.statement) === fold(b.statement);
}

// ─── The one question ───────────────────────────────────────────────────────

function chooseClarification(ctx: Context, items: PlannedItem[]): Clarification | null {
  const held = items.filter((i) => i.tier === "hold");
  if (held.length === 0) return null;
  // Highest-value ambiguity first: whose page it goes on.
  const ambiguous = held.find((i) =>
    i.flags.includes("person_ambiguous") || i.flags.includes("person_disagreement") || i.flags.includes("pronoun_multiple")
  );
  if (ambiguous) {
    const mention = mentionFor(ctx, ambiguous);
    const candidates = mention ? ctx.candidatesFor(mention) : [];
    const options = (candidates.length > 1 ? candidates : ctx.namedInNote())
      .slice(0, 4)
      .map((p) => (p.relationship_label ? `${p.display_name} (${p.relationship_label})` : p.display_name));
    return {
      about: "person",
      question: mention && /^\p{Lu}/u.test(mention) ? `Which ${mention} do you mean?` : "Who is this about?",
      options: [...options, "Someone else"],
    };
  }
  const subject = held.find((i) => i.flags.includes("subject_check"));
  if (subject && subject.person_key) {
    const p = ctx.byKey.get(subject.person_key)!;
    const rel = possessiveRelationWord(sentenceAroundSpan(ctx.text, subject.spans[0]), p) ?? "family";
    return {
      about: "subject",
      question: `Is this about ${p.display_name}, or ${p.display_name}'s ${rel}?`,
      options: [p.display_name, `${p.display_name}'s ${rel}`],
    };
  }
  const fresh = held.find((i) => i.flags.includes("new_person") && i.new_person_name);
  if (fresh) {
    return {
      about: "new_person",
      question: `Is ${fresh.new_person_name} someone new?`,
      options: [`Add ${fresh.new_person_name}`, "Someone already here"],
    };
  }
  return { about: "date", question: "When is it?", options: ["Pick a date", "No date"] };
}

function mentionFor(ctx: Context, item: PlannedItem): string | null {
  // The capitalised words in the evidence that match two or more roster people.
  for (const s of item.spans) {
    for (const w of s.quote.match(/\p{Lu}[\p{L}'’-]*/gu) ?? []) {
      const clean = w.replace(/['’]s$/, "");
      if (ctx.candidatesFor(clean).length > 1) return clean;
    }
  }
  for (const s of item.spans) {
    const w = s.quote.match(/\p{Lu}[\p{L}'’-]*/u)?.[0];
    if (w && !ALWAYS_OK.has(nameKey(w))) return w.replace(/['’]s$/, "");
  }
  return null;
}

function possessiveRelationWord(sentence: string, person: RosterPerson): string | null {
  const first = fold(person.display_name).split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return fold(sentence).match(new RegExp(`\\b${first}'s (?:\\w+ )?([a-z-]+)`))?.[1] ?? null;
}

// Re-exported for tests.
export const _internal = { inventedName: (input: ExtractionInput, s: string) => inventedName(new Context(input, input.capture.raw_text), s), addDays, localDay, iso };
