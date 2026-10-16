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

import { inYourWords, leadingName, statementNames, withSpokenName, yourVoice } from "./voice.ts";
import { findMention, leadingNames, MAX_MENTIONS, type MentionSubject, namesAsName, recordMentions, saysWord, shortName, usesName } from "./names.ts";
import { threadTarget, transitionOf, type Transition } from "./threads.ts";
import { addDays, localDay, iso, resolveDate, type DateResolution } from "./dates.ts";
import {
  aboutAnimalHealth,
  capCertainty,
  floorSensitivity,
  statedSelfRelations,
  selfRelationPhrase,
  theyPromisedMe,
  commitsSomeone,
  fold,
  hasNegation,
  negatedWhereStated,
  inventedRelations,
  inventedSensitiveTerms,
  userIsActor,
  kinshipReference,
  looksLikeInstruction,
  mirrorBag,
  nameKey,
  PRONOUNS,
  relationKey,
  sentenceAround,
  wordingCertainty,
  wordingSensitivities,
  withoutPossessive,
  wordsOf,
} from "./lexicon.ts";
import { codePointLength, locateEvidence, type Span } from "../spans.ts";
import { needsAcceptance } from "./acceptance.ts";
import { type CurrentResidence, namesLine, type Outcome, pairClass, relateResidence } from "../semantic/relate.ts";
import { residenceEligible, residenceOf, type ResidenceFacet } from "../semantic/residence.ts";
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
  OpenName,
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
/** A plain same-day phrase, as the user said it (founder K20). */
const SAME_DAY = /\b(?:today|tonight|this (?:morning|afternoon|evening))\b/giu;
/** Any other word for when: with one of these too, the day isn't plain, so none is taken. */
const OTHER_WHEN = /\b(?:tomorrow|yesterday|weekend|week|month|year|next|last|later|soon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d)/iu;
const CONTACT_DETAIL = /\b(phone|cell|mobile|landline)\b|\bnew number\b|\bnumber (?:ends|ending) in\b|[\w.+-]+@[\w-]+\.[a-z]{2,}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/i;
/** Floor for items held because code confirms the person or subject is ambiguous. */
export const HOLD_FLOOR_CONFIDENCE = 0.3;
const WHO_AMBIGUITY: Flag[] = ["person_ambiguous", "pronoun_multiple", "subject_check", "person_archived"];
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
  const ctx = new Context(input, text, proposal?.needs_clarification ?? null);
  const dropped: ExtractionOutcome["dropped"] = [];
  const items: PlannedItem[] = [];
  const known: string[] = [];

  const proposed = oneSentenceOneMemory(input, text, Array.isArray(proposal?.items) ? proposal.items : [], proposal?.needs_clarification ?? null);
  // Every line's own words, so a hedge in one never hedges another (founder I12b).
  ctx.evidence = proposed.slice(0, MAX_ITEMS).map((raw) => evidenceSpans(text, raw));
  for (const [i, raw] of proposed.entries()) {
    if (i >= MAX_ITEMS) {
      dropped.push({ reason: "too_many_items", kind: null });
      continue;
    }
    const result = planItem(ctx, raw, i);
    if ("drop" in result) {
      dropped.push({ reason: result.drop, kind: KINDS.includes(raw?.kind) ? raw.kind : null });
      if (result.drop === "already_known" && result.known && !known.includes(result.known)) known.push(result.known);
    }
    else {
      // "Ben and John went to Tahoe", told once for each of them, in either
      // order: one shared memory (founder H13).
      const shared = items.find((p) => sameSharedPlanned(p, result.item));
      const dup = shared ?? items.find((p) => sameItem(p, result.item));
      if (!dup) sharedTwin(ctx, result.item);
      if (dup) {
        // Same thing twice in one note: keep one, with both spans.
        for (const s of result.item.spans) if (!dup.spans.some((d) => d.start === s.start)) dup.spans.push(s);
        dropped.push({ reason: "duplicate", kind: result.item.kind });
      } else items.push(result.item);
    }
  }

  collapseMirrors(ctx, items, dropped);
  settleOpenNames(items);
  markHeldMirrors(ctx, items);
  const clarification = chooseClarification(ctx, items);
  recordItemMentions(ctx, items);
  const tier = items.length === 0
    ? "nothing"
    : items.some((i) => i.tier === "hold")
    ? "clarify"
    : items.some((i) => i.tier === "confirm")
    ? "confirm"
    : "auto";
  return { items, dropped, clarification, tier, injection_suspected: ctx.injection, ...(known.length ? { known } : {}) };
}

// ─── Context ────────────────────────────────────────────────────────────────

class Context {
  readonly byKey = new Map<string, RosterPerson>();
  /** Each proposed line's evidence, by its place in the proposal (founder I12b). */
  evidence: PlannedSpan[][] = [];
  readonly dossier = new Map<string, DossierItem>();
  readonly folded: string;
  readonly knownNames: Set<string>;
  readonly knownRelations: string[];
  readonly injection: boolean;
  readonly anchor: string;

  constructor(readonly input: ExtractionInput, readonly text: string, readonly ask: ModelProposal["needs_clarification"] = null) {
    for (const p of input.roster) this.byKey.set(p.key, p);
    for (const d of input.dossier) this.dossier.set(d.key, d);
    this.folded = fold(text);
    this.knownNames = new Set(
      input.roster.flatMap((p) => namesFor(p))
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

  private words?: { key: string; at: number; cap: boolean }[];

  /** Where the note first names this person (a code-unit offset), or -1 (founder J1). */
  namedAt(p: RosterPerson): number {
    this.words ??= [...this.text.matchAll(/[\p{L}][\p{L}\p{M}'’-]*/gu)]
      .map((m) => ({ key: nameKey(m[0]), at: m.index ?? 0, cap: /^\p{Lu}/u.test(m[0]) }));
    const words = this.words;
    let best = -1;
    for (const form of namesFor(p)) {
      const parts = (form.match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []).map(nameKey);
      if (!parts.length) continue;
      // The whole name, or (written as a name) the first name of a longer one, as namedInNote reads it.
      const at = words.findIndex((w, i) =>
        parts.every((part, j) => words[i + j]?.key === part) || (parts.length > 1 && w.key === parts[0] && w.cap));
      if (at >= 0 && (best < 0 || words[at].at < best)) best = words[at].at;
    }
    return best;
  }

  /** Roster people a name could mean: display name, full name, first name, nickname. */
  candidatesFor(mention: string): RosterPerson[] {
    // "Aunt Chrissy", "Dr. Patel", "my friend Ben" → the name itself.
    const k = nameKey(mention).replace(/^(my |our |the )?((aunt|auntie|uncle|cousin|friend|neighbou?r|coworker|boss|dr|doctor|mr|mrs|ms|miss|coach|pastor)\.? )+/, "");
    if (!k) return [];
    return this.input.roster.filter((p) => {
      const forms = namesFor(p);
      return forms.some((f) => {
        const fk = nameKey(f);
        return fk === k || fk.split(/\s+/)[0] === k || (k.includes(" ") && fk === k);
      });
    });
  }

  /** People removed from People a name could mean (founder I3): never the model's, never guessed. */
  archivedFor(mention: string): string[] {
    const k = nameKey(mention).replace(/^(my |our |the )?((aunt|auntie|uncle|cousin|friend|neighbou?r|coworker|boss|dr|doctor|mr|mrs|ms|miss|coach|pastor)\.? )+/, "");
    if (!k) return [];
    return (this.input.archived ?? []).filter((p) =>
      [p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])].filter(Boolean).some((f) => {
        const fk = nameKey(f);
        return fk === k || fk.split(/\s+/)[0] === k;
      })
    ).map((p) => p.id);
  }

  /** People on the roster whose name appears in the note. */
  namedInNote(): RosterPerson[] {
    const words = new Set(wordsOf(this.text).map(nameKey));
    const joined = ` ${wordsOf(this.text).map(nameKey).join(" ")} `;
    // People picked from Contacts carry their full name ("Ben Oxnard") while
    // notes say "Ben": a first name counts when the note writes it as a name
    // (capitalised), so "will" never means Will Park.
    const capitalised = new Set(
      (this.text.normalize("NFC").match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []).filter((w) => /^\p{Lu}/u.test(w)).map(nameKey),
    );
    return this.input.roster.filter((p) =>
      namesFor(p).some((f) => {
        const fk = nameKey(f);
        if (!fk.includes(" ")) return words.has(fk);
        return joined.includes(` ${fk} `) || capitalised.has(fk.split(/\s+/)[0]);
      })
    );
  }
}

// ─── One item ───────────────────────────────────────────────────────────────

type ItemResult = { item: PlannedItem } | { drop: DropReason; known?: string };

function planItem(ctx: Context, proposed: ProposedItem, index = -1): ItemResult {
  let raw = proposed;
  // "Sarah and I always get dumplings after the opera" recurs, but on no
  // calendar we model: keep it as shared context (still confirmed) rather
  // than dropping it.
  const looseTradition = raw?.kind === "tradition" && !RECURRENCES.includes(raw.detail?.recurrence as never);
  if (looseTradition) raw = { ...raw, kind: "context", detail: { ...raw.detail, aspect: ASPECTS.includes(raw.detail?.aspect as never) ? raw.detail.aspect : "other" } };
  if (!wellFormed(raw)) return { drop: "bad_kind_subject" };
  // A tradition whose anchor isn't in the note's words ("Amanda and I watch
  // every Warriors playoff game together", founder G24, used to be dropped):
  // its anchor is taken from the note ("every … "), or it's kept as what the
  // two of them share. Never dropped for the model's wording.
  if (raw.kind === "tradition" && !groundedIn(ctx, raw.detail?.anchor)) {
    const anchor = everyPhrase(raw.evidence.filter((e): e is string => typeof e === "string").join(" "));
    raw = anchor && groundedIn(ctx, anchor)
      ? { ...raw, detail: { ...raw.detail, anchor } }
      : { ...raw, kind: "context", detail: { ...raw.detail, aspect: "shared_interest" } };
  }
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
  // Contact details are never relationship memory (D2): Kinship keeps them elsewhere.
  if (CONTACT_DETAIL.test(statement) || CONTACT_DETAIL.test(primary.quote)) return { drop: "contact_detail" };
  // Names, numbers, sensitive terms and relationships in the statement must
  // be the note's, its negation kept, and "the writer" turned into "you"
  // with certainty. When the model's wording fails any of these, the line
  // keeps the note's own words instead (founder J4: "Wifey got a raise" read
  // as "your wife" was dropped whole): what the model inferred is stripped,
  // never the memory with it, and the line is shown for a glance.
  // Negation is local: "Ben didn't get the job, but he's interviewing" has
  // one negated clause and one plain one.
  const voiced = yourVoice(statement);
  const negationLost = negatedWhereStated(clauseAroundSpan(text, primary), statement) && !hasNegation(statement);
  const unfaithful = inventedName(ctx, statement) || inventedNumber(statement, text) ||
    inventedSensitiveTerms(statement, text).length > 0 || inventedRelations(statement, text, ctx.knownRelations).length > 0 ||
    negationLost || !voiced.certain;
  // Never an instruction or a contact detail, whichever quote it was in.
  let said = unfaithful
    ? ownWords(text, spans.filter((s, i) => i === 0 ||
      (!looksLikeInstruction(clauseAroundSpan(text, s)) && !looksLikeInstruction(sentenceAroundSpan(text, s)) && !CONTACT_DETAIL.test(s.quote))))
    : voiced.text;
  if (unfaithful) flags.add("own_words");
  // A mention the note never says ("your wife" for "Wifey") is the model's
  // inference: who the line is about is decided without it, and asked when
  // it can't be (never a reason to lose the line).
  if (raw.person_mention && !ctx.inNote(raw.person_mention)) raw = { ...raw, person_mention: null };

  // ── Kind / subject consistency ──
  let subject = raw.subject;
  // The user's own news read as a fact or a milestone about the user (founder K5).
  let userNews = false;
  const clause = clauseAroundSpan(text, primary);
  const mine = userIsActor(clause) || userIsActor(primary.quote);
  const theirs = !mine && (theyPromisedMe(clause) || theyPromisedMe(primary.quote) || theyPromisedMe(sentence));
  // Someone else's commitment to the user ("Tyler said he'd send me his
  // contractor's number Wednesday") is a promise too, theirs: waiting on them,
  // with its day, never under "You said you'd" (Gate F). The model often
  // reads it as something ongoing; the words decide.
  if (theirs && (raw.kind === "thread" || raw.kind === "fact" || raw.kind === "event")) raw = { ...raw, kind: "promise", subject: "person" };
  if (raw.kind === "promise") {
    if (mine) subject = "user";
    else if (theirs) subject = "person";
    else if (commitsSomeone(clause) || commitsSomeone(primary.quote) || commitsSomeone(sentence)) {
      // Someone commits to something here, or asks the user to ("Anna asked
      // me to water her plants"), but whose promise it is isn't plain
      // (founder J11): kept, and asked "Whose promise?". Never guessed,
      // never dropped.
      subject = raw.subject === "person" ? "person" : "user";
      flags.add("promise_owner");
    } else {
      // No one commits to anything in these words ("he's booking the
      // flights", "Can't wait to tell Ben"): not a promise, and never a
      // to-do. Kept as what it says, shown for a glance (founder J11): the
      // user's own plan, or a fact about the person. A commitment only the
      // model's wording carries gives way to the note's own words.
      raw = raw.subject === "user"
        ? { ...raw, kind: "plan" }
        : { ...raw, kind: "fact", subject: raw.subject === "shared" || raw.subject === "related" ? raw.subject : "person" };
      subject = raw.subject;
      flags.add("not_a_promise");
      if (commitsSomeone(said)) {
        said = ownWords(text, spans.slice(0, 1));
        flags.add("own_words");
      }
    }
  } else if (subject === "user" && raw.kind !== "plan" && raw.kind !== "moment" && raw.kind !== "event") {
    // "I got the job, and can't wait to tell Loo Loo", read as a fact or a
    // milestone about the user, used to be dropped here, so a note with
    // clear meaning came back "Nothing to remember" (founder K5). It is the
    // user's news with someone in People: kept for them, in the sentence's
    // own words (decided once who it is with is known, below).
    userNews = true;
  }
  // "I got the job and want to tell Loo Loo later", read only as the plan to
  // tell her: the news it tells is the user's own clause just before it, and
  // is kept with it, in the note's words (founder K5; reviewer E, 13 Oct).
  // Never anyone else's words: see toldNews.
  if (raw.kind === "plan" && subject === "user") {
    const told = toldNews(ctx, text, primary, said, index);
    const words = told ? ownWords(text, [told]) : "";
    if (told && /^You\s/u.test(words)) {
      spans.splice(0, 1, told);
      said = words;
      flags.add("own_words");
    }
  }

  // ── Person ──
  // A relationship the note never says, for someone's related person ("Alex
  // got a raise" read as Ben's boyfriend Alex): the inferred relationship is
  // stripped, never a reason to lose the memory (founder J4). The line is
  // about the person its words name, decided or asked like anyone else's;
  // with no name, about the person filed, and asked ("Is this about Ben?").
  if (subject === "related" && !relatedByName(ctx, raw) && !noteRelation(ctx, (raw.related_relation ?? "").trim())) {
    const named = raw.related_name?.trim();
    subject = "person";
    raw = named && ctx.inNote(named)
      ? { ...raw, subject, related_relation: null, related_name: null, person: "new", person_mention: named }
      : { ...raw, subject, related_relation: null, related_name: null };
    flags.add(named && ctx.inNote(named) ? "subject_moved" : "subject_check");
  }
  // A related person the user already knows by name ("Leo", David's son) is
  // filed under their person even though that person isn't mentioned.
  const knownRelated = subject === "related" ? relatedByName(ctx, raw) : null;
  let who = knownRelated
    ? knownRelated.who
    : resolvePerson(ctx, raw, flags);
  if ("drop" in who) return who;
  if (userNews) {
    // Founder K5: the user's own news ("I got the job, and can't wait to tell
    // Loo Loo") is kept, in the line's own words as already checked above
    // (never widened to more of the note), never dropped. Whose page:
    //   * the one person the user tells, texts, calls, sees… in its sentence
    //     (or a short sentence right after with no subject of its own: "I got
    //     the job! Can't wait to tell Loo Loo.");
    //   * else the person the line's own quotes name, confirmed by the code
    //     ("tell my wife" → her label; the mention resolved);
    //   * else the model's person or the page's, only when the sentence
    //     confirms it ("…for Ben", "…with Ben");
    //   * else the page it was told on, when the sentence names no one;
    //   * else asked "Who is this about?" (Don't keep this). "with" or "for"
    //     never decides on its own ("moving to Austin", "saving for May").
    // Someone not in People is asked as for anyone; someone removed is offered back (J4, I3).
    if (!who.new_person_name && !who.archived_ids?.length) {
      const near = withFollowing(text, primary, sentence);
      const told = whoTheUserTells(ctx, near);
      const page = ctx.input.capture.context_person_key ? ctx.byKey.get(ctx.input.capture.context_person_key) : undefined;
      const unsure = flags.has("person_ambiguous") || flags.has("person_disagreement") || flags.has("pronoun_multiple");
      // The model's mention counts only inside the line's own quotes: "Ben" in "…and Ben's new number is…" is another clause's.
      const mention = fold((raw.person_mention ?? "").trim());
      const quoted = mention && spans.some((sp) =>
        new RegExp(`(?<![\\p{L}\\p{M}])${mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{M}])`, "u").test(fold(sp.quote)));
      const byWords = who.person_key && !unsure && quoted && !SELF_WORDS.has(mention.replace(/['’](re|ve|ll|d|m)$/u, ""))
        ? ctx.byKey.get(who.person_key) : undefined;
      const modelOnly = who.person_key && !byWords ? ctx.byKey.get(who.person_key) : undefined;
      let only: RosterPerson | undefined;
      // Someone removed from People is told: asked, never guessed past or filed on the page (I3; reviewer A, r3).
      if (told.removed.length) only = undefined;
      else if (told.strong.length) only = told.strong.length === 1 ? told.strong[0] : undefined;
      else if (byWords) only = byWords;
      else {
        only = [modelOnly, page].find((p): p is RosterPerson => !!p && told.weak.includes(p));
        if (!only && !told.named.length && page) only = page;
      }
      flags.delete("person_ambiguous");
      flags.delete("person_disagreement");
      flags.delete("pronoun_multiple");
      if (only) {
        if (who.person_key && who.person_key !== only.key) flags.add("subject_moved");
        who = { person_id: only.id, person_key: only.key, new_person_name: null };
      } else if (told.removed.length) {
        // "Bring back Ben?", or "Which Ben do you mean?" with Ben Kim and Bring back Ben (I3).
        const said = told.removed[0].said;
        flags.add(ctx.candidatesFor(said).length ? "person_ambiguous" : "person_archived");
        who = { person_id: null, person_key: null, new_person_name: null, archived_ids: told.removed.map((r) => r.id), mention: said };
      } else {
        flags.add("person_ambiguous");
        who = { person_id: null, person_key: null, new_person_name: null };
      }
    }
    if (raw.kind === "tradition" || raw.kind === "context") {
      // What the user shares with them: theirs together, as it was proposed.
      raw = { ...raw, subject: "shared" };
      subject = "shared";
    } else {
      // "You can't wait to tell Loo Loo" is what the user means to do; "You
      // got the job" or "You finished the quilt for Ben" is something of
      // theirs with them (Between you).
      raw = { ...raw, kind: INTENDS.test(said) ? "plan" : "moment", detail: { ...raw.detail } };
    }
    flags.add("user_news");
  }
  // A statement that plainly leads with someone else ("John is your
  // brother") is never left on the page the model chose (Ben's).
  if (subject === "person" && who.person_key && !knownRelated) who = refileBySubject(ctx, said, who, flags);

  // A relationship to the user, said again (founder H17): already known is
  // never a second fact; a different one is asked about, never overwritten.
  if (raw.kind === "fact" && subject === "person" && who.person_key) {
    const stated = relationIn(said);
    const label = ctx.byKey.get(who.person_key)?.relationship_label?.trim();
    if (stated && label) {
      if (sameRelation(stated, label)) return { drop: "already_known", known: said };
      flags.add("relation_conflict");
    }
  }

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
    // On the user's own news the only question is whose page ("tell Ben's wife" isn't about her, reviewer B).
    if (!userNews && possessiveRelation(sentence, person)) flags.add("subject_check");
  }

  // ── Certainty: wording can only lower it ──
  // "Wifey got promoted on Monday and said she might be moving to Seattle":
  // the "might" is the Seattle line's own word, so it never hedges the
  // promotion (founder I12b). A hedge on this line, or outside every line
  // ("I think…"), still holds.
  const cap = capCertainty(raw.certainty, wordingCertainty(certaintyText(withoutOtherLines(ctx, text, spans, index), spans, raw)));
  const certainty = cap.certainty;
  if (cap.lowered) flags.add("certainty_lowered");
  if (certainty === "reported") flags.add("reported");

  // ── Sensitivity: wording can only raise it ──
  // The user's own news: from its own words, never a neighbouring clause about someone else (reviewer B).
  // …and its own statement ("You got the job after finishing chemo", reviewer A, r3).
  const floor = floorSensitivity(raw.sensitivity, userNews ? [...spans.map((sp) => sp.quote), said].join(" ") : allEvidence, raw.kind === "event" ? raw.detail.event_type : null);
  let sensitivity = floor.sensitivity;
  // A pet's vet visit isn't a person's protected health (founder G43): it
  // doesn't wait for a yes. A death, or the person's own health, still does.
  if (sensitivity === "health" && aboutAnimalHealth(`${allEvidence} ${said}`)) sensitivity = "none";
  else if (floor.raised) flags.add("sensitivity_raised");
  if (sensitivity !== "none") flags.add("sensitive");

  // ── Date: the model's words, our calendar ──
  // Traditions and context hold no date (the words stay in the anchor or
  // statement), so there is nothing to resolve or confirm for them.
  let resolution: DateResolution | null = null;
  if (raw.date_text && raw.date_text.trim() && raw.kind !== "tradition" && raw.kind !== "context") {
    const words = raw.date_text.trim();
    if (ctx.inNote(words)) {
      resolution = resolveDate(words, ctx.anchor, ctx.input.capture.time_zone, raw.date_direction);
      if (resolution.ambiguous) flags.add("date_ambiguous");
      if (["week", "season", "month"].includes(resolution.precision) && raw.kind !== "plan") flags.add("date_coarse");
    }
    // Date words that aren't in the note are ignored, never resolved.
  }
  // Something the user means to do today ("I need to call John tonight") whose day the model didn't
  // return: the line's own words say it, so Today still has it (founder K20). Only one plain same-day
  // phrase in the line's evidence, never a guess between two.
  if (!resolution?.date && (raw.kind === "promise" || raw.kind === "plan" || raw.kind === "event") && raw.date_direction !== "past") {
    const sameDay = spans.flatMap((sp) => [...sp.quote.matchAll(SAME_DAY)].map((m) => m[0].toLowerCase()));
    if (new Set(sameDay).size === 1 && !spans.some((sp) => OTHER_WHEN.test(sp.quote))) {
      const day = resolveDate(sameDay[0], ctx.anchor, ctx.input.capture.time_zone, "future");
      if (day.date && day.precision === "day") resolution = day;
    }
  }

  // Something the note says already happened, with no day at all ("John and
  // Ben went to Tahoe"), isn't an undated event to come: it's a past fact,
  // never shown as "No date yet · Something happening" (founder G32c).
  // Sensitive ones stay events, held for the user's yes.
  if (raw.kind === "event" && raw.date_direction === "past" && !resolution?.date && sensitivity === "none" && !raw.date_text?.trim()) {
    raw = { ...raw, kind: "fact", detail: { ...raw.detail, category: raw.detail.category ?? "other" } };
  }
  const detail = buildDetail(ctx, raw.kind, raw, resolution, sentence);
  if ("drop" in detail) return detail;
  if (raw.kind === "tradition") flags.add("tradition"); // plan §5: never inferred silently
  if (raw.kind === "event" && (sensitivity === "health" || sensitivity === "death_grief") &&
      (!resolution || !resolution.date) && wordsOf(sentence).some((w) => DATEISH.has(w))) {
    flags.add("date_unresolved_sensitive");
  }

  // ── Existing memory: merge / supersede / resolve, or an update to a story ──
  const relation = relate(ctx, raw, {
    kind: raw.kind,
    person_key: who.person_key,
    subject,
    related_id: related?.id ?? null,
    certainty,
    detail: detail.detail,
    statement: said,
  }, flags);
  let action = relation.action;
  if (relation.transition && action.type !== "new") detail.detail.transition = relation.transition;
  if (relation.replaces) {
    // Two earlier memories fit equally: the user says which one this replaces.
    flags.add("update_check");
    detail.detail._replaces = relation.replaces.map((id) => ({ id, statement: ctx.input.dossier.find((d) => d.id === id)?.statement ?? "" }));
  }

  // ── Confidence and tier ──
  let confidence = clamp01(Number(raw.confidence));
  if (flags.has("certainty_lowered") || flags.has("sensitivity_raised") || flags.has("person_disagreement")) {
    confidence = Math.min(confidence, 0.84);
  }
  // The model asked who this is about ("he's" with Ben and Josh both named).
  // When code confirms two people fit those words, ask instead of filing it.
  // A "subject" question about a pronoun ("he's") is the same question.
  // A name the line has as someone else it is about ("which Sam?" on Chris's
  // "Anthony and Sam love ice skating with Chris") is asked on its own, as K4
  // asks it: never who the whole line is about (founder K4, 13 Oct live runs).
  if ((ctx.ask?.about === "person" || (ctx.ask?.about === "subject" && isPronounMention(ctx.ask.mention))) &&
      ctx.ask.mention && askConfirmed(ctx, ctx.ask.mention, raw) &&
      spans.some((s) => fold(s.quote).includes(fold(ctx.ask!.mention!).trim())) &&
      (isPronounMention(ctx.ask.mention) || !raw.person_mention?.trim() || isPronounMention(raw.person_mention) ||
        nameKey(withoutPossessive(raw.person_mention)) === nameKey(withoutPossessive(ctx.ask.mention)))) {
    flags.add(PRONOUNS.has(fold(ctx.ask.mention).replace(/'(s|ll|d|re)$/, "").trim()) ? "pronoun_multiple" : "person_ambiguous");
  }
  if (looseTradition) flags.add("tradition");
  // A model unsure *who* an item is about ("Sam" with two Sams) is right to
  // be unsure: when code independently finds the same ambiguity, the item is
  // held for one question (never saved) instead of silently dropped.
  const heldForWho = WHO_AMBIGUITY.some((f) => flags.has(f));
  if (confidence < (heldForWho ? HOLD_FLOOR_CONFIDENCE : DROP_BELOW_CONFIDENCE)) return { drop: "low_confidence" };
  if (confidence < AUTO_SAVE_CONFIDENCE) flags.add("mid_confidence");

  // ── Who else it is about, and what they are to the user ──
  // "Ben and John went to Tahoe": one memory, on Ben and also on John, never
  // two copies. Only people the statement itself names, and only when who it
  // is about is settled.
  const unsure = flags.has("pronoun_multiple") || flags.has("person_ambiguous") || flags.has("person_disagreement");
  // Founder K4: everyone else it names stays part of it while who it is
  // about is still asked ("Anthony and Sam love ice skating with Chris":
  // Chris is never lost to "Which Anthony?"), and a name two people share is
  // asked about on its own, never dropped.
  const settled = who.person_id && !unsure ? who.person_key : null;
  const others = subject !== "related" && raw.kind !== "promise"
    ? participantsOf(ctx, said, spans, settled, settled ? null : subjectWords(raw, who), who.candidate_ids, statement)
    : { resolved: [], open: [] };
  const withPeople = others.resolved;
  if (withPeople.length) flags.add("shared_people");
  if (others.open.length && !settled) flags.add("participant_ambiguous");
  // "Ben is my brother", "my daughter Kaiya": a relationship the note states
  // outright, for the people this memory is about. Never inferred.
  const selfRelations: Record<string, string> = {};
  if (who.person_id && !unsure) {
    const about = new Set([who.person_id, ...withPeople.map((p) => p.id)]);
    for (const { name, relation } of statedSelfRelations(text)) {
      const found = ctx.candidatesFor(name);
      if (found.length === 1 && about.has(found[0].id)) selfRelations[found[0].id] = relation;
    }
  }

  // ── Residence (Phase 4B B3): the user's words, the place data, the relation table ──
  // Only once who and what it is about are settled; a line whose person is
  // still asked keeps its words, with no residence reading (fail open).
  const home = !unsure && !flags.has("subject_check") && who.person_key
    ? residenceStep(ctx, raw, spans, {
      kind: raw.kind, person_key: who.person_key, subject, related_id: related?.id ?? null, certainty, sensitivity,
      with_person_ids: withPeople.map((p) => p.id),
    }, action)
    : null;
  if (home) {
    if (home.decides) {
      action = home.action;
      delete detail.detail.transition;
      if (home.transition) detail.detail.transition = home.transition;
      // A residence decided by the table settles which line it replaces.
      flags.delete("update_check");
      flags.delete("protected_target");
      delete detail.detail._replaces;
    }
    if (home.ask) flags.add("residence_conflict");
  }
  const tier = tierFor(flags);
  // Relative time words that would go stale ("in two weeks", "next summer")
  // leave the statement once the day or season is kept (Gate F temporal);
  // the screen shows when, from the date.
  const timeless = stripRelativeTime(said, raw.date_text, resolution);
  return {
    item: {
      kind: raw.kind,
      person_id: who.person_id,
      person_key: who.person_key,
      new_person_name: who.new_person_name,
      subject_type: subject,
      related,
      // A leading "He"/"She" the pipeline is sure about names the person (Gate B);
      // one still in question keeps it until the user answers (resolve.ts).
      statement: who.person_key && subject !== "related" && !unsure
        ? withSpokenName(timeless, spokenName(ctx.byKey.get(who.person_key)))
        : timeless,
      detail: detail.detail,
      certainty,
      sensitivity,
      confidence: Math.round(confidence * 100) / 100,
      spans,
      action,
      tier,
      flags: [...flags],
      date_rule: resolution?.rule ?? null,
      ...(withPeople.length ? { with_person_ids: withPeople.map((p) => p.id) } : {}),
      ...(Object.keys(selfRelations).length ? { self_relations: selfRelations } : {}),
      // Someone removed from People the name fits (founder I3): offered back.
      ...(who.archived_ids?.length ? { archived_ids: who.archived_ids, ...(who.mention ? { mention: who.mention } : {}) } : {}),
      ...(subjectWords(raw, who) ? { subject_words: subjectWords(raw, who)! } : {}),
      ...(who.candidate_ids && tier === "hold" ? { candidate_ids: who.candidate_ids } : {}),
      ...(others.open.length ? { open_names: others.open } : {}),
      ...(ALONE.has(proposed) && tier === "hold" ? { alone: ALONE.get(proposed)! } : {}),
      ...(home ? { facets: [home.facet] } : {}),
      ...(home?.cue ? { cue: home.cue } : {}),
      ...(home?.closes.length ? { closes: home.closes } : {}),
      ...(home?.ask ? { still_in: home.ask } : {}),
      ...(home ? { residence: home.outcome } : {}),
    },
  };
}

/** The note's own words for who a line is about, as a name ("my daughter Kaiya" → Kaiya; "Ben's" → Ben). */
function subjectWords(raw: ProposedItem, who: { new_person_name: string | null; mention?: string }): string | null {
  const mention = (raw.person_mention ?? "").split(/\s*[,(]/u)[0];
  // "Chris' dog Fluffy" names Chris (founder K7), as "Sarah's sister" names Sarah.
  const possessor = mention.match(/^(.+?)['’]s\s+\S/u)?.[1] ?? mention.match(/^(.+?s)['’]\s+\S/iu)?.[1];
  const words = who.mention ?? who.new_person_name ?? (possessor ?? mention)
    .replace(/^(?:my|our)\s+\S+\s+/iu, "")
    .replace(/['’]s$/u, "").replace(/(?<=s)['’]$/iu, "")
    .trim();
  return words || null;
}

const UNSETTLED: Flag[] = ["person_ambiguous", "pronoun_multiple", "person_disagreement", "new_person", "person_archived"];

/**
 * Which words in each line name which of its people (founder I12/I13), once
 * its words and people are settled: what a later rename shows the new name
 * in place of, and what a correction moves. A line still waiting on "who?"
 * keeps the asked-about words for no one yet: the answer puts the chosen
 * person there (resolve.ts).
 */
function recordItemMentions(ctx: Context, items: PlannedItem[]): void {
  const subject = (p: RosterPerson, words?: string): MentionSubject => ({
    person: p,
    also: [...(p.line_names ?? []), ...(words ? [words] : [])],
    earlier: p.earlier_names,
  });
  for (const item of items) {
    const settled = !!item.person_key && !item.flags.some((f) => UNSETTLED.includes(f));
    const person = settled ? ctx.byKey.get(item.person_key!) : undefined;
    const subjects: MentionSubject[] = person ? [subject(person, item.subject_words)] : [];
    for (const id of item.with_person_ids ?? []) {
      const p = ctx.input.roster.find((r) => r.id === id);
      if (p) subjects.push(subject(p));
    }
    const mentions = recordMentions(item.statement, subjects);
    if (!person) {
      const asked = findMention(item.statement, [item.mention, item.subject_words].filter((w): w is string => !!w));
      if (asked && !mentions.some((m) => m.text === asked)) mentions.unshift({ person_id: null, text: asked, name: null });
    }
    // Each open name keeps its words for no one yet: its own answer fills it (founder K4).
    for (const o of item.open_names ?? []) {
      const text = findMention(item.statement, [o.text]);
      if (text && !mentions.some((m) => fold(m.text) === fold(text))) mentions.push({ person_id: null, text, name: null });
    }
    if (mentions.length) item.person_mentions = mentions.slice(0, MAX_MENTIONS);
  }
}

/** Whether every content word of `v` is the user's own. */
function groundedIn(ctx: Context, v: unknown): boolean {
  if (typeof v !== "string" || !v.trim()) return false;
  return wordsOf(v).filter((w) => w.length > 2).every((w) => ctx.folded.includes(w));
}

/**
 * The note's own words for a line, said to the user (founder J4): its quotes
 * in the note's order, with what lies between them when that is only
 * punctuation ("Emma told me she's gay — I'm the first person she's told"),
 * and an ellipsis for anything else. Never the model's words.
 */
function ownWords(text: string, spans: PlannedSpan[]): string {
  const chars = Array.from(text);
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = "";
  let end = -1;
  for (const s of sorted) {
    if (end >= 0 && s.start < end) {
      if (s.end > end) out += chars.slice(end, s.end).join("");
    } else {
      const gap = end >= 0 ? chars.slice(end, s.start).join("") : "";
      out += end < 0 ? "" : /\p{L}|\p{N}/u.test(gap) ? " … " : gap;
      out += chars.slice(s.start, s.end).join("");
    }
    end = Math.max(end, s.end);
  }
  return inYourWords(out.replace(/\s+/gu, " ").trim().replace(/[.。]+$/u, "").trim()).slice(0, 500);
}

/** "You want to tell Loo Loo later": the plan only tells someone, without saying what. */
const TELL_ONLY = new RegExp(
  "^(?:you\\s+)?(?:really\\s+|just\\s+)?(?:can['’]?t wait to|cannot wait to|want to|are going to|will|plan to|need to|have to|hope to|are excited to|are looking forward to)\\s+" +
    "(?:tell|text|call|show|ring|message|email)\\s+(?:my\\s+\\p{Ll}+|\\p{Lu}[\\p{L}\\p{M}'’-]*(?:\\s+\\p{Lu}[\\p{L}\\p{M}'’-]*)?|him|her|them|everyone|everybody)" +
    "(?:\\s+(?:later|tonight|tomorrow|soon|first|today|right away|this weekend))?\\s*[.!]?$",
  "iu",
);

/**
 * The user's own good news a plan to tell someone may carry (founder K5): a
 * short, fixed set of shapes and nothing else in the clause, so nothing
 * private, sensitive or anyone else's can ride along (reviewers B and A).
 */
const OWN_NEWS = new RegExp(
  "^I(?:['’]ve|\\s+have)?\\s+(?:just\\s+|finally\\s+)?(?:" +
    "(?:got|landed|accepted)\\s+(?:the|a|my)\\s+(?:new\\s+)?(?:job|offer|promotion|raise|role|position|internship|scholarship|apartment|place)" +
    "|got\\s+(?:promoted|engaged|hired|accepted|in)" +
    "|passed\\s+(?:the|my)\\s+(?:exam|test|bar|boards|driving test)" +
    "|graduated" +
    "|bought\\s+(?:a|the|our|my)\\s+(?:house|home|car|apartment|place)" +
    "|(?:finished|ran)\\s+(?:the|my|a)\\s+(?:marathon|half marathon|race)" +
  ")$|^I\\s+(?:didn['’]t|did not)\\s+get\\s+(?:the|a|my)\\s+(?:job|offer|promotion|raise|role|position|internship|scholarship)$",
  "u",
);

/**
 * "I got the job and want to tell Loo Loo later": the user's own news a plan
 * that only tells someone tells, just before it in the same sentence, joined
 * by "and" or a comma. Only an OWN_NEWS clause, only when no other line of
 * the note already holds it (that line keeps it, with its own yes), only
 * when the plan's own quote is the telling, and never longer than a quote
 * may be; otherwise null, and the plan stays as it is.
 */
function toldNews(ctx: Context, text: string, span: PlannedSpan, said: string, index: number): PlannedSpan | null {
  if (!TELL_ONLY.test(said.trim()) || !TELL_ONLY.test(span.quote.trim())) return null;
  const chars = Array.from(text);
  let a = span.start;
  while (a > 0 && !/[.!?\n]/u.test(chars[a - 1])) a--;
  const m = chars.slice(a, span.start).join("").match(/^(\s*)(.*?)\s*(?:,\s*and|,|\band)\s*$/u);
  const news = m?.[2]?.trim();
  if (!m || !news || !OWN_NEWS.test(news)) return null;
  const start = a + Array.from(m[1]).length;
  const end = start + Array.from(news).length;
  if (span.end - start > 200) return null;
  if (ctx.evidence.some((other, j) => j !== index && other.some((s) => s.start < end && start < s.end))) return null;
  return { start, end: span.end, quote: chars.slice(start, span.end).join("") };
}

/** Something the user means to do, in their line's own words ("can't wait to tell Loo Loo", "want to call Ben"). */
const INTENDS = /\b(?:can['’]?t wait to|cannot wait to|wants? to|going to|gonna|will|['’]ll|plan(?:s|ning)? to|need(?:s)? to|have to|hope to|looking forward to)\b/u;

/** Verbs whose object is someone the user tells, sees or reaches (founder K5): enough on their own. */
// Seeing, meeting, visiting or showing fit a place or a month as well ("visiting Paris", "meet May 3"): never deciding (reviewer A, r3).
const TELLS = "tell|tells|told|telling|text|texts|texted|texting|call|calls|called|calling|ring|" +
  "thank|thanked|thanking|ask|asked|asking|invite|invited|inviting|congratulate|congratulated|hug|hugged|" +
  "message|messaged|messaging|email|emailed|emailing";
/** Words that only confirm who it is with ("…with Ben", "…for Ben"): never enough on their own. */
const WITH_OR_FOR = "with|for";

/** The line's sentence, and a short one right after it with no subject of its own ("I got the job! Can't wait to tell Loo Loo."). */
function withFollowing(text: string, span: PlannedSpan, sentence: string): string {
  const next = sentenceAfter(text, span);
  // Only a sentence that is itself the telling ("Can't wait to tell Loo Loo."): never one with a subject of its own
  // ("Hope called Ben.", "Can't believe Sarah called Ben.", reviewer A, r3).
  const telling = new RegExp(`^(?:can['’]?t wait|cannot wait|can not wait|(?:so\\s+)?excited|looking forward|want|wanna|going|gonna|need|have)\\s+(?:to\\s+)?(?:${TELLS})\\s`, "iu");
  return next && telling.test(next) ? `${sentence} ${next}` : sentence;
}

/**
 * Who a sentence says the user tells, sees or does something with or for
 * (founder K5), by name as written (capitalised: "hope" is never Hope):
 * `strong` after a verb of telling or reaching, with anyone listed after
 * them ("tell Ben and Loo Loo"); `weak` after "with" or "for"; `named` all
 * the people in People it names; `removed`, people removed from People told
 * the same way (offered back, I3).
 */
function whoTheUserTells(ctx: Context, sentence: string): { strong: RosterPerson[]; weak: RosterPerson[]; named: RosterPerson[]; removed: { id: string; said: string }[] } {
  const esc = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The verb may open the sentence ("Tell Loo Loo…"); the name must be written as a name.
  const lower = sentence.replace(/(^|[.!?]\s+)(\p{Lu})/gu, (_m, a: string, b: string) => a + b.toLowerCase());
  // "tell Ben's wife" tells someone else: a possessive is never the one told.
  const after = (words: string, n: string) =>
    new RegExp(`\\b(?:${words})\\s+(?:my\\s+\\p{Ll}+\\s+)?${esc(n)}(?![\\p{L}\\p{M}]|['’]s?(?![\\p{L}\\p{M}]))`, "u").test(lower) && usesName(sentence, n);
  const formsOf = (names: string[]) => names.filter(Boolean).flatMap((f) => [f, f.split(/\s+/u)[0]]).filter((n) => usesName(sentence, n));
  const named = ctx.namedInNote().filter((p) => formsOf(namesFor(p)).length > 0);
  const listedAfter = (people: RosterPerson[]) => {
    for (const p of named) {
      if (people.includes(p)) continue;
      const listed = people.some((t) => formsOf(namesFor(t)).some((a) => formsOf(namesFor(p)).some((b) =>
        new RegExp(`${esc(a)}(?:['’]s)?\\s*(?:,|and|&)\\s*${esc(b)}(?![\\p{L}\\p{M}])`, "u").test(sentence))));
      if (listed) people.push(p);
    }
    return people;
  };
  // "tell Ben Kim" tells Ben Kim, not also a Ben (reviewer A, r3): a name told only inside someone's longer name isn't told.
  const toldAs = (p: RosterPerson) => formsOf(namesFor(p)).filter((n) => after(TELLS, n));
  const told = named.filter((p) => toldAs(p).length > 0);
  const strong = listedAfter(told.filter((p) => !told.some((q) => q !== p &&
    toldAs(q).some((long) => toldAs(p).every((short) => fold(long).startsWith(`${fold(short)} `))))));
  const weak = listedAfter(named.filter((p) => formsOf(namesFor(p)).some((n) => after(WITH_OR_FOR, n))));
  // Someone removed is told unless every use of their name is inside a longer name told for someone in People
  // ("tell Ben Kim" with a removed Ben, "tell Loo Loo" with a removed Loo; reviewer A, r4), never when they are
  // also named on their own ("tell Ben Kim and Ben"), and their own full name is theirs (reviewer A, r5).
  const removed = (ctx.input.archived ?? []).flatMap((r) => {
    const said = formsOf([r.display_name, r.full_name ?? "", ...(r.nicknames ?? [])])
      .sort((a, b) => b.length - a.length).find((n) => after(TELLS, n));
    if (!said) return [];
    let rest = sentence;
    for (const q of told) {
      for (const long of toldAs(q)) if (fold(long).startsWith(`${fold(said)} `)) rest = rest.replace(new RegExp(esc(long), "gu"), " ");
    }
    return rest !== sentence && !usesName(rest, said) ? [] : [{ id: r.id, said }];
  });
  return { strong, weak, named, removed };
}

const NOT_A_NAME_AFTER = new Set(["his", "her", "their", "my", "your", "our", "its", "the", "a", "an", "this", "that"]);
const CALENDAR = new Set(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const TITLES = new Set(["aunt", "auntie", "uncle", "cousin", "dr", "mr", "mrs", "ms", "miss", "grandma", "grandpa", "coach"]);

/**
 * Whether the model's own statement writes `name` as a name (reviewer A, r4–r5): capitalised, and not only
 * because of where it sits. Never the first word of a sentence ("Grant funding…", "Hope is…"), a month or a
 * weekday ("in May"), after "his", "the" and the like ("his Mom"), or inside another capitalised name ("the
 * Gates Grant").
 */
function modelWritesAsName(text: string, name: string): boolean {
  if (CALENDAR.has(fold(name).trim())) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{M}'’-])${name.trim().split(/\s+/u).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")}(?![\\p{L}\\p{M}]|-\\p{L})`, "gu");
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (!/^\p{Lu}/u.test(m[0])) continue;
    const before = text.slice(0, at);
    if (/(?:^|[.!?]\s*)$/u.test(before.trimEnd()) || before.trim() === "") continue;
    const prev = before.match(/([\p{L}'’.-]+)\s+$/u)?.[1] ?? "";
    if (NOT_A_NAME_AFTER.has(fold(prev))) continue;
    if (/^\p{Lu}/u.test(prev) && !TITLES.has(fold(prev).replace(/\.$/u, ""))) continue;
    return true;
  }
  return false;
}

/** "every Warriors playoff game" → "Warriors playoff game"; null without one. */
function everyPhrase(text: string): string | null {
  const m = text.normalize("NFC").match(/\b(?:every|each)\s+([^,.;!?]+?)(?:\s+together)?(?=[,.;!?]|$)/iu);
  const anchor = m?.[1]?.trim();
  return anchor && anchor.length <= 80 ? anchor : null;
}

/**
 * Everyone else on the roster this statement names, with their name also in
 * its evidence (founder K4). One person a name can mean is part of it; a
 * name two or more people share ("Sam") is an open name, asked about on its
 * own with every person it can mean: never guessed onto anyone, and never
 * dropped. Who the line is about is left out: settled (`ownerKey`), or still
 * asked under its own words (`ownerWords`, or a "he" that can mean
 * `ownerCandidates`).
 */
function participantsOf(
  ctx: Context,
  statement: string,
  spans: PlannedSpan[],
  ownerKey: string | null,
  ownerWords: string | null,
  ownerCandidates?: string[],
  // The model's own statement: a line kept in the note's lower-case words ("ben and maya are coming over friday")
  // still knows "Maya" is a name from it (reviewer A, r4).
  modelStatement = statement,
): { resolved: RosterPerson[]; open: OpenName[] } {
  const quotes = spans.map((s) => s.quote).join(" ");
  const resolved: RosterPerson[] = [];
  const open: OpenName[] = [];
  const asked = ownerWords ? nameKey(ownerWords) : null;
  // In both the line and its evidence, and written as a name in one of them (reviewer A, r2): a note typed in
  // lower case still names Chris when the line writes "Chris", and a script without capitals names as written;
  // a word written as a word ("grant", "hope", "mom") is never someone (reviewer A, r3).
  const forms = (names: string[]) => [...names, ...names.map((n) => n.split(/\s+/u)[0])];
  const asName = (n: string) => namesAsName(statement, n) || namesAsName(quotes, n) || modelWritesAsName(modelStatement, n);
  const named = (names: string[]) => forms(names).some((n) => saysWord(statement, n) && saysWord(quotes, n) && asName(n));
  // A full name in the note's own words settles the name only when every use of it there is that full name
  // ("Ben went to Tahoe with Tyler Shaffer"), never when it's also said alone ("Ben and Sam went…, but Sam Eden stayed home").
  const esc = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const settles = (full: string, first: string) => {
    const q = fold(quotes);
    const f = fold(full);
    if (!f.includes(" ") || !new RegExp(`(?<![\\p{L}\\p{M}])${esc(f)}(?![\\p{L}\\p{M}])`, "u").test(q)) return false;
    const rest = q.split(f).join(" ");
    return !new RegExp(`(?<![\\p{L}\\p{M}])${esc(fold(first))}(?![\\p{L}\\p{M}])`, "u").test(rest);
  };
  // Everyone in People, as `named` reads them: "sam" in a note typed in lower case is Sam Eden's first name too.
  for (const p of ctx.input.roster) {
    if (p.key === ownerKey || resolved.some((o) => o.id === p.id)) continue;
    // Who a "he" can mean is asked as who the line is about, never added as someone else (amb-071).
    if (ownerCandidates?.includes(p.id)) continue;
    const names = namesFor(p);
    if (!named(names)) continue;
    // The name as the line writes it, whole names and nicknames first: "Sammy" is Sam Eden's own nickname,
    // never "which Sam?" (reviewer A, r3: a first name ahead of the nickname lost Sam Eden).
    const form = forms(names).find((n) => namesAsName(statement, n)) ?? forms(names).find((n) => saysWord(statement, n) && asName(n)) ?? names[0];
    const first = form.split(/\s+/u)[0];
    const sharing = ctx.candidatesFor(form.includes(" ") ? form : first);
    const whole = names.some((n) => settles(n, first));
    const settledByName = sharing.some((c) => c.id !== p.id && namesFor(c).some((n) => settles(n, first)));
    if (settledByName) continue;
    // Someone removed from People goes by it too (founder I3): a full name settles it; a first name alone is
    // asked ("Which Chris?"), never attached on a guess and never dropped.
    const removedToo = !whole && !form.includes(" ") ? ctx.archivedFor(first) : [];
    if ((sharing.length > 1 || removedToo.length) && !whole) {
      // The name is who the line is about (settled, or asked as such): not someone else.
      if (sharing.some((c) => c.key === ownerKey) || nameKey(first) === asked) continue;
      if (ownerCandidates?.some((id) => sharing.some((c) => c.id === id))) continue;
      if (!open.some((o) => nameKey(o.text) === nameKey(first))) {
        open.push({ text: first, candidate_ids: sharing.map((c) => c.id), ...(removedToo.length ? { archived_ids: removedToo } : {}) });
      }
      continue;
    }
    if (asked && names.some((n) => nameKey(n) === asked || nameKey(n.split(/\s+/u)[0]) === asked)) continue;
    resolved.push(p);
  }
  return { resolved: resolved.slice(0, 7), open: open.slice(0, 3) };
}

// A weekday is relative too: "Wednesday" means a different day next week.
const RELATIVE_TIME = /\b(today|tonight|tomorrow|yesterday|this|next|last|coming|in\s+(?:a|an|one|two|three|four|five|six|a\s+few|\d+)\s+(?:days?|weeks?|months?|years?)|weekend|soon|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/iu;

/**
 * "Ben is going to Dan's wedding in two weeks" → "Ben is going to Dan's
 * wedding", once the date is kept: relative words go stale, the date doesn't.
 * Only when the date resolved, the words are relative, and they're in the
 * statement; hedges ("thinking about") are never touched.
 */
function stripRelativeTime(statement: string, dateText: string | null | undefined, r: DateResolution | null): string {
  if (!r?.date || !dateText || !RELATIVE_TIME.test(dateText)) return statement;
  const words = dateText.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:\\s*,)?\\s+(?:on|in|at|by|for|from)?\\s*${words}\\b`, "iu");
  const out = statement.replace(re, "").replace(/\s{2,}/gu, " ").replace(/\s+([,.;!?])/gu, "$1").trim();
  // Never leave a statement that's only a stub ("Ben is going to").
  return out.split(/\s+/u).length >= 3 && !/\b(to|at|on|in|for|by|from|the|a|an)$/iu.test(out) ? out : statement;
}

function isPronounMention(mention: string | null | undefined): boolean {
  return !!mention && PRONOUNS.has(fold(mention).replace(/'(s|ll|d|re)$/, "").trim());
}

/** Code's own check of the model's "who?": a pronoun with two named people, or a name two people share. */
function askConfirmed(ctx: Context, mention: string, raw?: ProposedItem): boolean {
  const m = fold(mention).replace(/'(s|ll|d|re)$/, "").trim();
  if (PRONOUNS.has(m)) {
    return raw
      ? pronounReferents(ctx, raw, mention).allowed.length > 1
      : ctx.namedInNote().length + (ctx.input.capture.context_person_key ? 1 : 0) > 1;
  }
  return ctx.candidatesFor(mention).length > 1;
}

// A pronoun that could point at two named people ("Ben and Josh went
// climbing. He fell.") waits for the user, like any other ambiguity.
const HOLD_FLAGS: Flag[] = ["new_person", "person_ambiguous", "person_disagreement", "pronoun_multiple", "subject_check", "date_unresolved_sensitive", "update_check", "relation_conflict", "person_archived", "promise_owner", "participant_ambiguous", "residence_conflict"];

function tierFor(flags: Set<Flag>): Tier {
  if (HOLD_FLAGS.some((f) => flags.has(f))) return "hold";
  if (flags.size > 0) return "confirm"; // any other flag means "show it, let them fix it"
  return "auto";
}

// ─── One sentence about several people is one memory (founder K4, 13 Oct) ───

/** Words a restatement adds, drops or swaps ("loves", "goes", "with"): never what a line is about. */
const RESTATED = new Set([
  "the", "and", "with", "for", "who", "that", "this", "they", "them", "their", "his", "her", "him", "you", "your",
  "are", "was", "were", "been", "has", "have", "had", "does", "did", "goes", "going", "went", "love", "loves",
  "loved", "like", "likes", "liked", "enjoy", "enjoys", "enjoyed", "both", "also", "too", "together", "really", "all",
]);

/**
 * The live model often tells one sentence about several people as one line
 * each, in its own words, each dropping the others ("Anthony loves ice
 * skating with Chris", "Sam loves ice skating with Chris", "Chris goes ice
 * skating with Anthony and Sam"). Each of those was then its own memory,
 * asked about on its own: the K4 question loop, a person renamed in
 * another's line, one memory per person (founder's 13 Oct native pass,
 * reproduced with the live model). When one sentence of the note is told as
 * such pieces — each filed on a different person it names, the same kind and
 * the same content, at least one of them leaving out someone the others name
 * — they become one line in the sentence's own words, filed on the one person
 * among them the note itself settles (else the first it names); the rest are
 * asked as K4 asks them. Left alone: lines that each name everyone (mirrors,
 * `collapseMirrors`), different things said of different people ("Ben got a
 * job and Sam had a baby"), a sentence about the user ("John and Ben are my
 * brothers": one relation each) or with more in it than the pieces.
 *
 * And when the model keeps nothing but asks who a name in the note is, the
 * sentence is kept, held for the user's answer: never "Nothing to remember".
 */
/** The merged line's piece about its owner alone, by the merged line (see `PlannedItem.alone`). */
const ALONE = new WeakMap<ProposedItem, string>();

function oneSentenceOneMemory(input: ExtractionInput, text: string, proposed: ProposedItem[], asked: ModelProposal["needs_clarification"]): ProposedItem[] {
  const nameWords = new Set(input.roster.flatMap((p) => namesFor(p)).flatMap((n) => wordsOf(fold(n))));
  const content = (t: string) => new Set(wordsOf(fold(t)).map((w) => w.replace(/(?<=\p{L}{3})s$/u, ""))
    .filter((w) => w.length > 2 && !RESTATED.has(w) && !nameWords.has(w)));
  const people = (mention: string | null) => {
    const m = (mention ?? "").trim();
    if (!m || PRONOUNS.has(fold(m))) return [];
    const k = nameKey(withoutPossessive(m));
    return input.roster.filter((p) => namesFor(p).some((n) => nameKey(n) === k || nameKey(n).split(/\s+/u)[0] === k));
  };
  const said = (statement: string, mention: string) => saysWord(statement, mention);
  if (!proposed.length && asked?.about === "person" && asked.mention && fold(text).includes(fold(asked.mention))) {
    const at = fold(text).indexOf(fold(asked.mention));
    const sentence = sentenceAround(text, at, at + asked.mention.length).trim().replace(/[.!?]+$/u, "");
    if (sentence && !wordsOf(fold(sentence)).some((w) => SELF_WORDS.has(w))) {
      return [{
        kind: "fact", person: "unknown", person_mention: asked.mention, subject: "person", related_relation: null, related_name: null,
        statement: sentence, evidence: [sentence], certainty: "stated", sensitivity: "none", confidence: 0.5, date_text: null,
        date_direction: "future", existing: { action: "new", target: null },
        detail: { event_type: null, event_goal: null, category: null, attribute: null, value: null, firmness: null, topic: null,
          place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null },
      } as ProposedItem];
    }
  }
  const bySentence = new Map<string, number[]>();
  proposed.forEach((raw, i) => {
    if (!wellFormed(raw) || raw.subject !== "person" || !["fact", "thread", "context"].includes(raw.kind) || raw.date_text) return;
    if (!raw.person_mention?.trim() || PRONOUNS.has(fold(raw.person_mention.trim()))) return;
    const spans = evidenceSpans(text, raw);
    if (!spans.length) return;
    const sentence = sentenceAroundSpan(text, spans[0]).trim();
    bySentence.set(sentence, [...(bySentence.get(sentence) ?? []), i]);
  });
  const replaced = new Map<number, ProposedItem | null>();
  for (const [sentence, idx] of bySentence) {
    if (idx.length < 2) continue;
    const group = idx.map((i) => proposed[i]);
    // Each piece's name as the sentence says it: the model may write the whole name ("Anthony Lopez")
    // where the note says "Anthony" (founder K16, 14 Oct). A name the sentence doesn't say leaves it alone.
    const spoken = (m: string) => said(sentence, m) ? m : said(sentence, m.split(/\s+/u)[0]) ? m.split(/\s+/u)[0] : null;
    const mentions = group.map((g) => spoken(g.person_mention!.trim()));
    if (mentions.some((m) => m === null)) continue;
    const names = mentions as string[];
    if (new Set(names.map(fold)).size !== group.length) continue;
    if (wordsOf(fold(sentence)).some((w) => SELF_WORDS.has(w)) || RELATIVE_TIME.test(sentence)) continue;
    // Everyone of the user's people the sentence names, by the word it uses ("Anthony", "Sam", "Chris").
    const named = [...new Set(input.roster.flatMap((p) => namesFor(p).flatMap((n) => [n, n.split(/\s+/u)[0]]))
      .filter((n) => n && said(sentence, n)).map((n) => n.split(/\s+/u)[0]))];
    // Pieces: at least one line leaves out someone the sentence names (and another line names): a line
    // filed on Chris naming everyone, and one on Anthony leaving out Sam, is still one sentence in pieces.
    if (!group.some((g) => [...names, ...named].some((m) => !said(g.statement, m) && group.some((h) => said(h.statement, m))))) continue;
    const whole = content(sentence);
    const each = group.map((g) => content(g.statement));
    const common = each.reduce((a, b) => new Set([...a].filter((w) => b.has(w))));
    const told = new Set(each.flatMap((w) => [...w]));
    if (!common.size || each.some((w) => !w.size || [...w].filter((x) => whole.has(x)).length * 5 < w.size * 3)) continue;
    if ([...whole].filter((w) => told.has(w)).length * 3 < whole.size * 2) continue;
    const at = (i: number) => fold(sentence).indexOf(fold(names[i]));
    // Filed on the one person the note itself settles, by the name it says: "Anthony" filed by the model on
    // Anthony Lopez is still a question when there are two Anthonys (never a guess).
    const settled = group.findIndex((g, i) => g.person !== "unknown" && g.person !== "new" && people(names[i]).length === 1);
    const o = settled >= 0 ? settled : group.map((_, i) => i).sort((a, b) => at(a) - at(b))[0];
    const owner = settled >= 0 ? group[o] : { ...group[o], person: people(names[o]).length === 1 ? group[o].person : "unknown" };
    const words = sentence.replace(/[.!?]+$/u, "");
    const confidence = Math.max(...group.map((g) => clamp01(Number(g.confidence))));
    const merged: ProposedItem = { ...owner, person_mention: names[o], statement: words, evidence: [words], confidence, existing: { action: "new", target: null } };
    const own = names[o];
    if (said(owner.statement, own) && names.every((m) => fold(m) === fold(own) || !said(owner.statement, m))) {
      ALONE.set(merged, owner.statement.trim().replace(/[.!?]+$/u, ""));
    }
    replaced.set(idx[0], merged);
    for (const i of idx.slice(1)) replaced.set(i, null);
  }
  // A line about several people filed on one whose name two people share
  // ("Anthony and Sam love ice skating with Chris" on a Sam) is filed on the
  // one its words lead with: every shared name is then asked as one of the
  // others, where "Not sure" keeps the line (founder K4, run B).
  const lead = (raw: ProposedItem): ProposedItem => {
    if (!wellFormed(raw) || raw.subject !== "person" || !["fact", "thread", "context"].includes(raw.kind) || raw.date_text) return raw;
    const m = raw.person_mention?.trim() ?? "";
    if (!m || people(m).length < 2) return raw;
    const names = leadingNames(raw.statement);
    if (names.length < 2 || !names.slice(1).some((n) => fold(n) === fold(m)) || fold(names[0]) === fold(m)) return raw;
    const first = people(names[0]);
    if (!first.length) return raw;
    return { ...raw, person: first.length === 1 ? first[0].key : "unknown", person_mention: names[0] };
  };
  return proposed.flatMap((raw, i) => replaced.has(i) ? (replaced.get(i) ? [replaced.get(i)!] : []) : [lead(raw)]);
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
  const goal = raw.kind === "event" && typeof raw.detail?.event_goal === "string" && raw.detail.event_goal.trim()
    ? fold(raw.detail.event_goal.trim())
    : null;
  // In one sentence too: "running the Berlin half in April, wants to go under
  // two hours" leaves the race firm; the clause carrying the goal is the goal's.
  const main = sentenceAroundSpan(text, spans[0]);
  const parts = [goal ? main.split(/(?<=[,;—–])/).filter((c) => !fold(c).includes(goal)).join("") : main];
  for (const sp of spans.slice(1)) {
    const sentence = sentenceAroundSpan(text, sp);
    if (goal && fold(sentence).includes(goal)) continue;
    parts.push(sentence);
  }
  const next = sentenceAfter(text, spans[0]);
  if (next && wordsOf(next).length <= 4) parts.push(next);
  return parts.join(" ");
}

/** Where a proposed line's evidence is in the note (the same grounding planItem does). */
function evidenceSpans(text: string, raw: ProposedItem): PlannedSpan[] {
  const out: PlannedSpan[] = [];
  for (const quote of Array.isArray(raw?.evidence) ? raw.evidence.slice(0, 3) : []) {
    if (typeof quote !== "string" || !quote.trim()) continue;
    const found = locateEvidence(text, quote.trim());
    if (found.ok) out.push(toPlannedSpan(text, found.span));
  }
  return out;
}

/** The note with the other lines' own words blanked out (never words this line shares). */
function withoutOtherLines(ctx: Context, text: string, own: PlannedSpan[], index: number): string {
  const others = ctx.evidence.flatMap((spans, j) => (j === index ? [] : spans))
    .filter((s) => !own.some((t) => s.start < t.end && t.start < s.end));
  if (!others.length) return text;
  const chars = Array.from(text);
  for (const s of others) for (let i = s.start; i < s.end && i < chars.length; i++) chars[i] = " ";
  return chars.join("");
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

// "writer" is the prompt's own word for the user ("Writer thinks Anna said…"), never a name.
// Prompt v6 says "you" for the user, so "You're dropping off a lasagna" is grounded.
const ALWAYS_OK = new Set([
  "i", "i'm", "i've", "i'll", "i'd", "the", "a", "an", "he", "she", "they", "his", "her", "their", "we", "our",
  "you", "you're", "you've", "you'll", "you'd", "your", "yours", "yourself", "user", "writer", "writer's", "it", "this", "that", "there", "on", "in", "at", "for", "and", "but", "or", "to",
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

const POSSESSED_RELATION = "mom|mother|mum|dad|father|sister|brother|son|daughter|kid|kids|wife|husband|partner|boyfriend|girlfriend|fianc\\S*|grandma|grandmother|grandpa|grandfather|aunt|uncle|cousin|niece|nephew|boss|roommate|friend|baby|parents?";

function possessiveRelation(sentence: string, person: RosterPerson): boolean {
  const s = fold(sentence);
  const names = namesFor(person);
  return names.some((n) => {
    const first = fold(n).split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${first}(?:'s|(?<=s)') (?:\\w+ )?(${POSSESSED_RELATION})\\b`).test(s);
  });
}

const DATEISH = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "tonight",
  "next", "week", "weekend", "month", "today",
]);

// ─── Whose statement is it? ─────────────────────────────────────────────────

/** Every name someone goes by: display, full, kept earlier names, and the words their own lines use for them (founder I12). */
function namesFor(p: RosterPerson): string[] {
  return [p.display_name, p.full_name ?? "", ...(p.nicknames ?? []), ...(p.line_names ?? [])].filter(Boolean);
}

/**
 * The founder build kept "John is the writer's brother" on Ben's page: the
 * model filed it under Ben (named in the note) and nothing checked the
 * statement itself. When a person-subject statement leads with a name that
 * isn't the filed person's, and doesn't name the filed person at all, it is
 * about the person it names: that roster person (shown for a yes), someone
 * new ("Add John?"), or, if the name fits two people, a question.
 */
function refileBySubject(
  ctx: Context,
  statement: string,
  who: { person_id: string | null; person_key: string | null; new_person_name: string | null; archived_ids?: string[]; mention?: string },
  flags: Set<Flag>,
): { person_id: string | null; person_key: string | null; new_person_name: string | null; archived_ids?: string[]; mention?: string } {
  const filed = who.person_key ? ctx.byKey.get(who.person_key) : null;
  const lead = leadingName(statement);
  if (!filed || !lead || statementNames(statement, namesFor(filed))) return who;
  const firstOnly = lead.split(/\s+/u)[0];
  // The name must be the note's own (the invented-name check already holds
  // the statement to that); a full name only counts if the note says it.
  const said = ctx.inNote(lead) ? lead : ctx.inNote(firstOnly) ? firstOnly : null;
  if (!said) return who;
  let candidates = ctx.candidatesFor(said);
  if (candidates.length === 0 && said !== firstOnly) candidates = ctx.candidatesFor(firstOnly);
  // Someone removed from People: offered back, never re-created (founder I3).
  const removed = ctx.archivedFor(said).length ? ctx.archivedFor(said) : ctx.archivedFor(firstOnly);
  if (removed.length) {
    flags.add(candidates.length ? "person_ambiguous" : "person_archived");
    return { person_id: null, person_key: null, new_person_name: null, archived_ids: removed, mention: said };
  }
  if (candidates.length === 1) {
    if (candidates[0].key === filed.key) return who;
    flags.add("subject_moved");
    return { person_id: candidates[0].id, person_key: candidates[0].key, new_person_name: null };
  }
  flags.add(candidates.length === 0 ? "new_person" : "person_ambiguous");
  // Asked under the name it leads with ("Which Sam?"), never everyone the line names.
  return { person_id: null, person_key: null, new_person_name: candidates.length === 0 ? said.slice(0, 100) : null, ...(candidates.length > 1 ? { mention: said } : {}) };
}

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

const SELF_WORDS = new Set(["i", "me", "my", "myself", "we", "us", "our", "ourselves", "you", "your", "yourself", "you and i", "me and you"]);

type Who = {
  person_id: string | null; person_key: string | null; new_person_name: string | null; archived_ids?: string[]; mention?: string;
  /** For a pronoun held to ask: exactly who it can mean (founder J1). */
  candidate_ids?: string[];
} | { drop: DropReason };

const SINGULAR_PRONOUNS = new Set(["he", "him", "his", "himself", "she", "her", "hers", "herself"]);

/**
 * Who a pronoun can mean (founder J1): the people the note names before it,
 * in the note's order, then the person whose page it was told on. Never
 * someone named only after it. `at` is where the pronoun is in the note.
 */
function pronounReferents(ctx: Context, raw: ProposedItem, mention: string): { allowed: RosterPerson[]; at: number } {
  const at = pronounAt(ctx, raw, mention);
  const named = ctx.namedInNote()
    .map((p) => ({ p, n: ctx.namedAt(p) }))
    .filter(({ n }) => n >= 0 && (at < 0 || n < at))
    .sort((a, b) => a.n - b.n)
    .map(({ p }) => p);
  const context = ctx.input.capture.context_person_key ?? null;
  const page = context ? ctx.byKey.get(context) : undefined;
  return { allowed: page && !named.includes(page) ? [...named, page] : named, at };
}

/** Where the line's pronoun is in the note (in its own quote first), or -1. */
function pronounAt(ctx: Context, raw: ProposedItem, mention: string): number {
  const re = new RegExp(`(?<![\\p{L}'’])${mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu");
  for (const quote of Array.isArray(raw.evidence) ? raw.evidence : []) {
    if (typeof quote !== "string" || !quote.trim()) continue;
    const found = locateEvidence(ctx.text, quote.trim());
    if (!found.ok) continue;
    const chars = Array.from(ctx.text);
    const from = chars.slice(0, found.span.start).join("").length;
    const m = re.exec(chars.slice(found.span.start, found.span.end).join(""));
    if (m) return from + m.index;
  }
  return re.exec(ctx.text)?.index ?? -1;
}

/**
 * Nothing before the pronoun could be someone else (founder J1): no other
 * capitalised word than "I" and the page person's own names, and no
 * relation word ("my friend Zed visited. He…" is asked, never guessed).
 */
function noOneElseBefore(ctx: Context, at: number, page: RosterPerson): boolean {
  if (at < 0) return false;
  const before = ctx.text.slice(0, at);
  const theirs = new Set(namesFor(page).flatMap((n) => (n.match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []).map(nameKey)));
  const capitals = (before.match(/\p{Lu}[\p{L}\p{M}'’-]*/gu) ?? []).filter((w) => w !== "I" && !theirs.has(nameKey(w)));
  return capitals.length === 0 && !wordsOf(before).some((w) => kinshipReference(w));
}

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
    // The statement leads with a name the note says ("Anthony and Sam love
    // ice skating with Chris", filed on no one): that name is who it's about,
    // decided or asked under its own words (founder K4), never one "Who is
    // this about?" for everyone it names.
    // Only when the model said it couldn't tell ("unknown"; never over its "new"), only a
    // name someone in People goes by ("Last weekend…" is no one), and never a possessive
    // ("Ben's coworker Josh…" is about Josh).
    const lead = modelKey === "unknown" ? leadingNames(raw.statement)[0] : undefined;
    const possessive = !!lead && new RegExp(`^${lead.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:['’]s\\b|(?<=s)['’])`, "u").test(raw.statement.trim());
    if (lead && !possessive && ctx.inNote(lead) && !SELF_WORDS.has(fold(lead)) && ctx.candidatesFor(lead).length > 0) {
      const r = resolvePerson(ctx, { ...raw, person_mention: lead }, flags);
      return "drop" in r || r.person_key ? r : { ...r, mention: r.mention ?? lead };
    }
    return unresolved("person_ambiguous");
  }

  // "We", "I", "you": the user, never a person's name ("We're skiing Tahoe" on
  // Ben's page). The mention says nothing about who else it's about, so it's
  // treated as no mention: only the context person or a named one can be meant.
  if (SELF_WORDS.has(fold(mention).replace(/['’](re|ve|ll|d|m)$/u, ""))) return resolvePerson(ctx, { ...raw, person_mention: null }, flags);

  // "My daughter Kaiya": the name, and the relation picks between namesakes (H20).
  const phrase = selfRelationPhrase(mention);
  if (phrase && ctx.inNote(phrase.name)) {
    const named = ctx.candidatesFor(phrase.name);
    const fits = named.filter((p) => p.relationship_label && wordsOf(p.relationship_label).some((w) => relationKey(w) === relationKey(phrase.relation)));
    if (named.length > 1 && fits.length === 1) return pick(fits[0]);
    return resolvePerson(ctx, { ...raw, person_mention: phrase.name }, flags);
  }

  // "Chris, my neighbor" / "Chris (my neighbor)": the name; the label settles ties below.
  const labelled = mention.match(/^(.+?)\s*[,(]\s*(?:my|our)\s+[^,()]+[,)]?$/u);
  if (labelled) return resolvePerson(ctx, { ...raw, person_mention: labelled[1].trim() }, flags);
  // "his dad", "her mom" for a related subject: the pronoun names the person.
  const pronounRelation = fold(mention).match(/^(his|her|their)\s+\S+$/);
  if (pronounRelation && raw.subject === "related") return resolvePerson(ctx, { ...raw, person_mention: pronounRelation[1] }, flags);

  const folded = withoutPossessive(fold(mention));
  // "Sarah's sister" names Sarah, as "Chris' dog" names Chris (founder K7);
  // the relation is the subject's business.
  const possessor = mention.match(/^(.+?)['’]s\s+\S/u)?.[1] ?? mention.match(/^(.+?s)['’]\s+\S/iu)?.[1];
  if (possessor && !PRONOUNS.has(fold(possessor))) {
    return resolvePerson(ctx, { ...raw, person_mention: possessor }, flags);
  }

  // Pronouns: must point at someone the note names before them, or the
  // person whose page it was told on (founder J1). Never someone named only
  // after it: in "He loves Susan", Susan is who he loves, never "he". A
  // line held to ask carries exactly who it can mean.
  if (PRONOUNS.has(folded)) {
    flags.add("pronoun");
    const { allowed, at } = pronounReferents(ctx, raw, mention);
    const ids = allowed.map((p) => p.id);
    const chosen = ctx.byKey.get(modelKey);
    // On someone's page with no one else before it, "he" or "she" is that
    // person: also when the model filed it on someone it can't be (the
    // sentence's object) or couldn't tell, as long as nothing before it
    // could be anyone else. "New" (someone not in People) is asked.
    const page = context && allowed.length === 1 && allowed[0].key === context ? allowed[0] : null;
    if (page && SINGULAR_PRONOUNS.has(folded) &&
        (chosen?.key === page.key || (modelKey !== "new" && noOneElseBefore(ctx, at, page)))) {
      return pick(page);
    }
    if (!chosen || !allowed.some((p) => p.key === modelKey)) return { ...unresolved("person_ambiguous"), candidate_ids: ids };
    if (allowed.length > 1) {
      flags.add("pronoun_multiple");
      return { ...pick(chosen), candidate_ids: ids };
    }
    return pick(chosen);
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
  // Someone the user removed from People (founder I3): offered back, never
  // added again as someone new; with someone here who fits too, asked.
  const removed = ctx.archivedFor(withoutPossessive(mention));
  if (removed.length) {
    flags.add(candidates.length ? "person_ambiguous" : "person_archived");
    return { person_id: null, person_key: null, new_person_name: null, archived_ids: removed, mention: withoutPossessive(mention) };
  }
  if (candidates.length === 0) {
    // Someone not on the roster. Must look like a name and be in the note.
    if (!/^\p{Lu}/u.test(mention)) return unresolved("person_ambiguous");
    return unresolved("new_person", withoutPossessive(mention).slice(0, 100));
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
  // C.1: the time a memory happened or began, kept on every kind that can
  // carry it, at the precision the user gave ("in 2024" is a year, "last
  // weekend" a range). Only the resolver writes dates; the user's words go
  // in date_hint, so a coarse or ambiguous time is shown as written.
  const when = () => {
    if (r?.date) {
      set("date", r.date);
      if (r.date_end && r.date_end !== r.date) set("date_end", r.date_end);
      set("date_precision", r.precision);
    }
    set("date_hint", hint);
  };

  switch (kind) {
    case "fact":
      set("category", FACT_CATEGORIES.includes(d.category as never) ? d.category : "other");
      set("attribute", grounded(d.attribute, 100));
      set("value", grounded(d.value));
      when(); // when it became true: "since 2018", "moved last month"
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
      if (r?.precision === "season" && r.date) {
        set("season", SEASON_OF_MONTH[Number(r.date.slice(5, 7)) - 1]);
        set("date", r.date);
        if (r.date_end && r.date_end !== r.date) set("date_end", r.date_end);
        set("date_precision", "season");
      }
      break;
    }
    case "thread":
      set("topic", grounded(d.topic) ?? Array.from(sentence.trim()).slice(0, 200).join(""));
      set("followup_after_days", THREAD_FOLLOWUP_DAYS);
      // "Thinking about moving to Marin next summer": the season is kept, not
      // only the words (stabilization; the follow-up is still the thread's own).
      when();
      break;
    case "moment":
      when();
      set("place", grounded(d.place));
      break;
    case "milestone":
      set("milestone_type", grounded(d.milestone_type, 100) ?? "other");
      set("anniversary", false);
      when();
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
  /** The statement as the user will read it (for recognising an update). */
  statement: string;
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

interface Relation {
  action: PlannedItem["action"];
  /** How this updates the memory it supersedes or resolves (Gate E). */
  transition: Transition | null;
  /** Two or three equally good matches: ask the user which one (ids). */
  replaces?: string[];
}

/**
 * The model's merge / supersede / resolve, checked; then, when the model left
 * it "new", the deterministic reading of an update (threads.ts): a firm
 * "not moving anymore", "got the job" or "getting better" updates the one
 * earlier memory of the same person and subject it is plainly about.
 */
function relate(ctx: Context, raw: ProposedItem, n: NewShape, flags: Set<Flag>): Relation {
  const transition = transitionOf(n.statement);
  const byModel = relateByModel(ctx, raw, n, flags, transition);
  // A story that changed ("not interviewing anymore", "got the job") replaces
  // the earlier line: one current truth, the old one kept as its history and
  // linked to it (founder H25). "Resolved" stays for a question answered.
  if (byModel.type === "resolves" && transition) return { action: { type: "supersede", target_id: byModel.target_id }, transition };
  if (byModel.type !== "new") return { action: byModel, transition };
  if (!transition || !n.person_key || flags.has("protected_target")) return { action: byModel, transition: null };
  // A hedge never updates anything ("might not move after all").
  if (n.certainty === "tentative" || n.certainty === "wished") return { action: byModel, transition: null };
  const person = ctx.byKey.get(n.person_key);
  const candidates = ctx.input.dossier.filter((t) =>
    t.person_key === n.person_key && t.subject_type === n.subject && t.status === "active" &&
    t.user_state !== "edited" && t.user_state !== "user_authored" &&
    (n.subject !== "related" || (t.related_key ? ctx.input.related.find((r) => r.key === t.related_key)?.id === n.related_id : false))
  );
  const names = person ? namesFor(person) : [];
  const match = threadTarget(n.statement, candidates.map((c) => ({ id: c.id, kind: c.kind, statement: c.statement, status: c.status })), names);
  if (!match) return { action: byModel, transition: null };
  if ("ambiguous" in match) {
    return { action: { type: "supersede", target_id: match.ambiguous[0] }, transition: match.transition, replaces: match.ambiguous };
  }
  return { action: { type: match.action, target_id: match.target }, transition: match.transition };
}

function relateByModel(ctx: Context, raw: ProposedItem, n: NewShape, flags: Set<Flag>, transition: Transition | null): PlannedItem["action"] {
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
      // "I need to call John tonight", told again the next day, is the next day's call: merged into
      // yesterday's line it would keep yesterday's day and never reach Today (founder K20, as K10).
      if ((n.kind === "promise" || n.kind === "plan") && !keepsDay(proposedTarget.detail, n.detail)) return none;
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
      // A cancellation or an ending closes what it ends, whatever kind that
      // was: "not moving anymore" (a fact) closes "planning to move" (an
      // event); otherwise kinds must match as before (Gate C1/E).
      const acrossKinds = (transition === "cancelled" || transition === "completed") &&
        ["fact", "event", "plan", "thread", "promise"].includes(proposedTarget.kind);
      if (!SUPERSEDE_FROM[n.kind].includes(proposedTarget.kind) && !acrossKinds) return none;
      if (CERTAINTY_RANK[n.certainty] < CERTAINTY_RANK[proposedTarget.certainty]) return none;
      // A fact replaces a fact about the same kind of thing ("works at" by
      // "left"), not an unrelated one; "other" matches anything.
      const a = proposedTarget.detail.category;
      const b = n.detail.category;
      if (n.kind === "fact" && proposedTarget.kind === "fact" && !acrossKinds && a !== b && a !== "other" && b !== "other") return none;
      return { type: "supersede", target_id: proposedTarget.id };
    }
    case "resolves": {
      if (!firm || proposedTarget.kind !== "thread" || proposedTarget.status !== "active") return none;
      return { type: "resolves", target_id: proposedTarget.id };
    }
  }
  return none;
}

// ─── Residence (Phase 4B B3; brief §5, §8, §21) ─────────────────────────────

interface ResidenceStep {
  /** The line's reading, written with it (the database keeps it only on a line written as new, never on a merge). */
  facet: ResidenceFacet;
  outcome: Outcome;
  /** The table decided the action (else today's stands: a plan, a thread, nothing). */
  decides: boolean;
  action: PlannedItem["action"];
  transition: "changed" | "corrected" | null;
  /** The cue that lets it close a line the user edited (the database re-reads it). */
  cue: { start: number; end: number } | null;
  /** The other lines it closes besides its target, the most specific first (B4; the database re-checks each). */
  closes: string[];
  /** Held: "Is Susan still in Alameda?" */
  ask: NonNullable<PlannedItem["still_in"]> | null;
}

/**
 * A line whose own words say where someone lives now, related to the
 * residence lines Kinship holds for the same person and subject (relate.ts).
 * Every other line, and every relation to a line that isn't a residence,
 * keeps today's path. Null when the line isn't a residence, or there is no
 * place data.
 */
function residenceStep(
  ctx: Context,
  raw: ProposedItem,
  spans: PlannedSpan[],
  n: {
    kind: Kind;
    person_key: string;
    subject: string;
    related_id: string | null;
    certainty: string;
    sensitivity: string;
    with_person_ids: string[];
  },
  todays: PlannedItem["action"],
): ResidenceStep | null {
  const places = ctx.input.places;
  if (!places || !residenceEligible({ ...n, subject_type: n.subject })) return null;
  const found = residenceOf(ctx.text, spans, places);
  if (!found) return null;

  const sameSubject = (d: DossierItem) =>
    d.person_key === n.person_key && d.subject_type === n.subject &&
    (n.subject !== "related" || (d.related_key ? ctx.input.related.find((r) => r.key === d.related_key)?.id === n.related_id : false));
  const current: CurrentResidence[] = ctx.input.dossier
    .map((d, order) => ({ d, order }))
    .filter(({ d }) => d.facet && d.kind === "fact" && d.status === "active" && !d.shared && sameSubject(d))
    .map(({ d, order }) => ({
      id: d.id, facet: d.facet!, order, protected: d.user_state === "edited" || d.user_state === "user_authored",
    }));
  // The model's single supersede proposal, for lines whose place the data doesn't know.
  const proposed = raw.existing?.action === "supersede" && raw.existing.target ? ctx.dossier.get(raw.existing.target) : undefined;
  const modelTarget = proposed && current.some((c) => c.id === proposed.id) ? proposed.id : null;
  const decision = relateResidence(found, current, modelTarget);
  const none = { type: "new" as const, target_id: null };
  const base = { facet: found.facet, outcome: decision.outcome, cue: null, closes: [], ask: null, transition: null };

  switch (decision.outcome) {
    case "SAME":
      return { ...base, decides: true, action: { type: "merge", target_id: decision.target } };
    case "SUPERSEDES":
      // The most specific line is what it replaces; every other line it can't be true with closes with it
      // (brief §8 rule 2, B4), each re-checked by the database and restored with it on Undo (§10).
      return {
        ...base, decides: true, action: { type: "supersede", target_id: decision.closes[0] }, transition: decision.transition,
        cue: decision.cue ? { start: decision.cue.start, end: decision.cue.end } : null,
        closes: decision.closes.slice(1),
      };
    case "CONFLICT":
      return {
        ...base, decides: true, action: none,
        ask: {
          target_id: decision.asks.id, words: decision.asks.facet.value_text, stay: decision.stay,
          ...(decision.closes.length > 1 ? { closes: decision.closes.slice(1) } : {}),
        },
      };
  }

  // NEW or REFINES: nothing of the residence Kinship holds closes. Today's
  // action stands only where it isn't a residence relation of its own.
  const target = todays.type !== "new" && todays.target_id ? ctx.input.dossier.find((d) => d.id === todays.target_id) : undefined;
  if (!target) return { ...base, decides: false, action: todays };
  // Never a line the table read, and never a shared one: one person's move
  // never closes a line about two people.
  if (current.some((c) => c.id === target.id) || target.shared) return { ...base, decides: true, action: none };
  // A residence told before B3 (no reading of its own): the model may still
  // replace it as today, but never with a place that fits it ("California"
  // after "Alameda"), and never on a guess between two readings.
  const earlier = target.kind === "fact" ? residenceOf(target.statement, [{ start: 0, end: Array.from(target.statement).length }], places) : null;
  if (!earlier) return { ...base, decides: false, action: todays };
  const cls = pairClass(found.facet, earlier.facet);
  if (todays.type === "merge") return { ...base, decides: true, action: cls === "SAME" ? todays : none };
  if (todays.type !== "supersede" || (cls !== "DISJOINT" && cls !== "UNKNOWN")) return { ...base, decides: true, action: none };
  const named = found.cues.find((c) => namesLine(c, earlier.facet));
  const cue = named ?? found.cues.find((c) => c.kind === "correction") ?? found.cues.find((c) => c.kind === "change") ?? null;
  return {
    ...base, outcome: "SUPERSEDES", decides: true, action: todays,
    transition: !cue ? null : cue.kind === "change" ? "changed" : "corrected",
  };
}

function withinDays(a: string, b: string, days: number): boolean {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) <= days * 86_400_000;
}

function sameItem(a: PlannedItem, b: PlannedItem): boolean {
  if (a.kind !== b.kind || a.person_key !== b.person_key || a.subject_type !== b.subject_type) return false;
  // Two lines still waiting on "who?" under different names ("Anthony", "Sam")
  // are about different people, whatever their words (founder K4).
  if (!a.person_key && fold(a.subject_words ?? "") !== fold(b.subject_words ?? "")) return false;
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
  const removed = held.find((i) => i.flags.includes("person_archived") && i.mention);
  if (removed?.mention) {
    return { about: "person", question: `${removed.mention} was removed from People.`, options: [`Bring back ${removed.mention}`, "Someone else"] };
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
  // A residence question is the app's own ("Is Susan still in Alameda?", from the
  // line it asks about): there is no stored question for it.
  if (held.every((i) => i.flags.includes("residence_conflict") && !i.flags.some((f) => f !== "residence_conflict" && HOLD_FLAGS.includes(f)))) {
    return null;
  }
  return { about: "date", question: "When is it?", options: ["Pick a date", "No date"] };
}

function mentionFor(ctx: Context, item: PlannedItem): string | null {
  // The capitalised words in the evidence that match two or more roster people.
  for (const s of item.spans) {
    for (const w of s.quote.match(/\p{Lu}[\p{L}'’-]*/gu) ?? []) {
      const clean = withoutPossessive(w);
      if (ctx.candidatesFor(clean).length > 1) return clean;
    }
  }
  for (const s of item.spans) {
    const w = s.quote.match(/\p{Lu}[\p{L}'’-]*/u)?.[0];
    if (w && !ALWAYS_OK.has(nameKey(w))) return withoutPossessive(w);
  }
  return null;
}

function possessiveRelationWord(sentence: string, person: RosterPerson): string | null {
  const first = fold(person.display_name).split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const s = fold(sentence);
  // The relation itself ("Chris's younger sister" → sister), else the word right after the name: never the
  // verb after it ("Chris's sister went…" was offered as "Chris's went", reviewer A).
  // "sister-in-law" stays whole (reviewer A, r3).
  return s.match(new RegExp(`\\b${first}(?:'s|(?<=s)') (?:\\w+ )?(${POSSESSED_RELATION})(?![\\w-])`))?.[1] ??
    s.match(new RegExp(`\\b${first}(?:'s|(?<=s)') ([a-z-]+)`))?.[1] ?? null;
}

// Re-exported for tests.
export const _internal = { inventedName: (input: ExtractionInput, s: string) => inventedName(new Context(input, input.capture.raw_text), s), addDays, localDay, iso };

// ─── Shared memories, whatever the order of the names (founder H13) ─────────

/** The words of a statement as a bag, so "Ben and John went…" = "John and Ben went…". */
function wordBag(statement: string): string {
  return wordsOf(fold(statement)).filter((w) => w !== "and" && w !== "&").sort().join(" ");
}

function participants(personKey: string | null, withKeys: string[] | undefined): string {
  return [personKey ?? "", ...(withKeys ?? [])].filter(Boolean).sort().join(",");
}

/** Dates agree when both are missing, or both are the same day. */
/** A line's own day: an event's or plan's date, a promise's due date. */
function dayOfDetail(d: Record<string, unknown>): string | null {
  return typeof d.date === "string" ? d.date : typeof d.due_date === "string" ? d.due_date : null;
}

function sameWhen(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const da = dayOfDetail(a);
  const db = dayOfDetail(b);
  return !da || !db || da === db;
}

/** Merging `next` into `kept` loses no day: `next` has none, or the same one (founder K10, K20). */
function keepsDay(kept: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const day = dayOfDetail(next);
  return !day || day === dayOfDetail(kept);
}

function sameSharedPlanned(a: PlannedItem, b: PlannedItem): boolean {
  if (!sameKindFamily(a.kind, b.kind) || a.subject_type !== b.subject_type) return false;
  const pa = [a.person_id ?? "", ...(a.with_person_ids ?? [])].filter(Boolean).sort().join(",");
  const pb = [b.person_id ?? "", ...(b.with_person_ids ?? [])].filter(Boolean).sort().join(",");
  return pa.includes(",") && pa === pb && wordBag(a.statement) === wordBag(b.statement) && sameWhen(a.detail, b.detail);
}

/**
 * The same shared memory, already remembered for any of the people in it
 * ("John and Ben went to Tahoe", on John), becomes one memory: this one is
 * filed with it and merged, never a second current line. Told again with
 * some of its people still asked ("Anthony and Sam love ice skating with
 * Chris", kept for Sam Eden and Chris on 12 Oct; founder K4, 13 Oct), it is
 * still that memory: the people it has stay, a name it already has someone
 * for is never asked again, and the rest are asked to join it. Never when a
 * name in it means someone else this time. Different days or different words
 * stay separate (silence beats a wrong merge).
 */
function sharedTwin(ctx: Context, item: PlannedItem): void {
  if (item.action.type !== "new" || !item.person_key || !(item.with_person_ids?.length || item.open_names?.length)) return;
  const keyOfId = new Map(ctx.input.roster.map((r) => [r.id, r.key]));
  const withKeys = (item.with_person_ids ?? []).map((id) => keyOfId.get(id)).filter((k): k is string => !!k);
  const mine = participants(item.person_key, withKeys);
  const mineKeys = new Set([item.person_key, ...withKeys]);
  const words = new Set(wordsOf(fold(item.statement)));
  const saysAName = (k: string) => {
    const p = ctx.byKey.get(k);
    return !!p && namesFor(p).some((n) => words.has(fold(n)) || words.has(fold(n).split(/\s+/u)[0]));
  };
  const sharesAName = (a: string, b: string) => {
    const pa = ctx.byKey.get(a);
    const pb = ctx.byKey.get(b);
    if (!pa || !pb) return false;
    const of = (p: RosterPerson) => new Set(namesFor(p).flatMap((n) => [fold(n), fold(n).split(/\s+/u)[0]]).filter((n) => words.has(n)));
    const nb = of(pb);
    return [...of(pa)].some((n) => nb.has(n));
  };
  const twin = ctx.input.dossier.find((t) => {
    if (t.status !== "active" || !sameKindFamily(t.kind, item.kind) || t.subject_type !== item.subject_type) return false;
    if (t.user_state === "edited" || t.user_state === "user_authored") return false;
    if (wordBag(t.statement) !== wordBag(item.statement) || !keepsDay(t.detail, item.detail)) return false;
    if (participants(t.person_key, t.with_person_keys) === mine) return true;
    const theirs = new Set([t.person_key, ...(t.with_person_keys ?? [])]);
    if (![...mineKeys].some((k) => theirs.has(k))) return false;
    const onlyTheirs = [...theirs].filter((k) => !mineKeys.has(k));
    const onlyMine = [...mineKeys].filter((k) => !theirs.has(k));
    return onlyTheirs.every(saysAName) && !onlyTheirs.some((a) => onlyMine.some((b) => sharesAName(a, b)));
  });
  if (!twin) return;
  const owner = ctx.byKey.get(twin.person_key);
  if (!owner) return;
  const theirKeys = [twin.person_key, ...(twin.with_person_keys ?? [])];
  const others = [...new Set([...theirKeys, item.person_key, ...withKeys])].filter((k) => k !== twin.person_key)
    .map((k) => ctx.byKey.get(k)?.id).filter((id): id is string => !!id).slice(0, 7);
  item.person_id = owner.id;
  item.person_key = owner.key;
  item.with_person_ids = others;
  // A name the memory already has someone for was answered when it was kept: never asked again.
  const theirIds = new Set(theirKeys.map((k) => ctx.byKey.get(k)?.id).filter((id): id is string => !!id));
  if (item.open_names) {
    const open = item.open_names.filter((o) => !o.candidate_ids.some((id) => theirIds.has(id)));
    if (open.length) item.open_names = open;
    else delete item.open_names;
  }
  // Merged as what it already is ("went to Tahoe" kept as an event before).
  if (item.kind !== twin.kind) {
    item.kind = twin.kind;
    item.detail = { ...twin.detail };
  }
  item.action = { type: "merge", target_id: twin.id };
}

/** The same thing in the same sentence, its names in any order (a mirrored reading). */
function mirrors(a: PlannedItem, b: PlannedItem): boolean {
  return sameKindFamily(a.kind, b.kind) && a.subject_type === b.subject_type && a.subject_type !== "related" &&
    sameWhen(a.detail, b.detail) && mirrorBag(a.statement) === mirrorBag(b.statement) &&
    a.spans.some((s) => b.spans.some((t) => s.start < t.end && t.start < s.end));
}

/**
 * One sentence about several people, read once for each of them (founder
 * K4, K1): "Anthony and Tyler are brothers" and "Tyler and Anthony are
 * brothers" are one memory, on both. Lines that are each settled become the
 * first of them, also about the others; lines that are each still waiting
 * on "who?" become one line, its other names asked on their own. A settled
 * line with others still in question keeps them as questions that join it
 * (founder I10, `markHeldMirrors`). Never across sentences or different words.
 */
function collapseMirrors(ctx: Context, items: PlannedItem[], dropped: ExtractionOutcome["dropped"]): void {
  const groups: PlannedItem[][] = [];
  for (const it of items) {
    const g = groups.find((x) => x.some((y) => mirrors(y, it)));
    if (g) g.push(it);
    else groups.push([it]);
  }
  for (const g of groups) {
    if (g.length < 2) continue;
    const settled = g.filter((i) => i.person_id && i.tier !== "hold");
    const waiting = g.filter((i) => !i.person_id && i.tier === "hold" && i.flags.includes("person_ambiguous") && !i.twin_person_id);
    const keep = settled[0] ?? waiting[0];
    if (!keep) continue;
    const merged = keep.person_id ? settled.slice(1) : waiting.slice(1);
    for (const m of merged) {
      const people = [...(keep.with_person_ids ?? []), ...(m.person_id ? [m.person_id] : []), ...(m.with_person_ids ?? [])];
      const withIds = [...new Set(people)].filter((id) => id !== keep.person_id).slice(0, 7);
      if (withIds.length) keep.with_person_ids = withIds;
      if (!keep.person_id) {
        // Its name in question is one more name to ask about on the kept line.
        const open = [...(keep.open_names ?? [])];
        const own = m.subject_words ? [{ text: m.subject_words, candidate_ids: ctx.candidatesFor(m.subject_words).map((p) => p.id) }] : [];
        for (const o of [...own, ...(m.open_names ?? [])]) {
          if (fold(o.text) !== fold(keep.subject_words ?? "") && !open.some((x) => fold(x.text) === fold(o.text))) open.push(o);
        }
        if (open.length) {
          keep.open_names = open;
          if (!keep.flags.includes("participant_ambiguous")) keep.flags.push("participant_ambiguous");
        }
      }
      for (const sp of m.spans) if (!keep.spans.some((x) => x.start === sp.start && x.end === sp.end)) keep.spans.push(sp);
      if (keep.with_person_ids?.length && !keep.flags.includes("shared_people")) keep.flags.push("shared_people");
      items.splice(items.indexOf(m), 1);
      dropped.push({ reason: "duplicate", kind: m.kind });
    }
  }
}

/**
 * Open names (founder K4), once mirrors are one: a name another line of the
 * same sentence is itself asked about is asked once, there. On a line still
 * waiting on "who?", each is a question of its own on that line. On a
 * settled line, the line is kept and each name becomes a question that joins
 * it once answered (as founder I10): the memory is never held hostage to
 * "Which Sam?".
 */
function settleOpenNames(items: PlannedItem[]): void {
  for (const it of [...items]) {
    const open = (it.open_names ?? []).filter((o) =>
      !items.some((x) => x !== it && !x.person_id && x.tier === "hold" && fold(x.subject_words ?? "") === fold(o.text) && mirrors(x, it)) &&
      (o.candidate_ids.length > 1 || (!!o.archived_ids?.length && o.candidate_ids.length === 1))
    );
    if (!open.length) {
      delete it.open_names;
      it.flags = it.flags.filter((f) => f !== "participant_ambiguous");
      if (!it.flags.some((f) => HOLD_FLAGS.includes(f)) && it.tier === "hold") it.tier = tierFor(new Set(it.flags));
      continue;
    }
    // Its own person is truly decided (never a "he" still in question), and the
    // line is saved now (not waiting for a yes, an answer or anything else):
    // only then is it kept and each name asked on its own (I10). Otherwise
    // every name waits on the same line, so one answer, or one "Don't keep
    // this", decides all of it (reviewer A, 13 Oct).
    const settled = !!it.person_id && !it.flags.some((f) => UNSETTLED.includes(f));
    const savedNow = settled && (it.tier === "auto" || (it.tier === "confirm" && !needsAcceptance(it)));
    if (!savedNow) {
      it.open_names = open;
      if (!it.flags.includes("participant_ambiguous")) it.flags.push("participant_ambiguous");
      it.tier = "hold";
      continue;
    }
    delete it.open_names;
    const twins: PlannedItem[] = open.map((o) => ({
      ...it,
      person_id: null,
      person_key: null,
      new_person_name: null,
      detail: { ...it.detail },
      spans: it.spans.map((sp) => ({ ...sp })),
      action: { type: "new", target_id: null },
      tier: "hold",
      // Asked only which person the name is: nothing else of the kept line's (reviewer A, 13 Oct).
      flags: ["person_ambiguous"],
      with_person_ids: undefined,
      self_relations: undefined,
      person_mentions: undefined,
      candidate_ids: undefined,
      twin_person_id: it.person_id!,
      mention: o.text,
      subject_words: o.text,
      alone: undefined,
      // Someone removed who went by it too is offered back (I3).
      ...(o.archived_ids?.length ? { archived_ids: o.archived_ids } : {}),
    }));
    items.splice(items.indexOf(it) + 1, 0, ...twins);
  }
}

/**
 * "Michelle and Sam might be moving to Australia" with two Sams: the model
 * mirrors it, one line for each of them. Michelle's is kept; Sam's is held
 * only because two people are called Sam. It is the same memory, so the held
 * line asks only which Sam (its mention), knows the kept line it mirrors, and
 * its answer joins that line (resolve.ts), never a second copy (founder I10,
 * reopening H13). Only a true mirror: same words in any order, the same
 * sentence of the note, the same kind of thing on the same day, each line
 * naming the other's person.
 */
function markHeldMirrors(ctx: Context, items: PlannedItem[]): void {
  for (const h of items) {
    if (h.tier !== "hold" || h.person_id || !h.flags.includes("person_ambiguous") || h.twin_person_id) continue;
    const mention = h.subject_words && ctx.candidatesFor(h.subject_words).length > 1 ? h.subject_words : mentionFor(ctx, h);
    if (!mention || ctx.candidatesFor(mention).length < 2) continue;
    const twin = items.find((p) =>
      p !== h && p.person_id && p.person_key && sameKindFamily(p.kind, h.kind) && p.subject_type === h.subject_type &&
      // Others it already names (Chris, founder K4) are the kept line's people too.
      (h.with_person_ids ?? []).every((id) => id === p.person_id || (p.with_person_ids ?? []).includes(id)) &&
      sameWhen(p.detail, h.detail) && mirrorBag(p.statement) === mirrorBag(h.statement) &&
      p.spans.some((s) => h.spans.some((t) => s.start < t.end && t.start < s.end)) &&
      statementNames(p.statement, [mention]) && namesPerson(h.statement, ctx.byKey.get(p.person_key))
    );
    if (!twin?.person_id) continue;
    h.twin_person_id = twin.person_id;
    h.mention = mention;
  }
}

/** A person's name as Kinship says it: "Ben" from "Ben Oxnard", a chosen "Cutie Pie" whole (founder I12). */
function spokenName(p: RosterPerson | undefined): string {
  return p ? shortName(p) : "";
}

function namesPerson(statement: string, p: RosterPerson | undefined): boolean {
  return !!p && statementNames(statement, namesFor(p));
}

/** Something that happened, however it was filed: an event, a fact or a moment. */
function sameKindFamily(a: string, b: string): boolean {
  const happened = ["event", "fact", "moment"];
  return a === b || (happened.includes(a) && happened.includes(b));
}

// ─── Relationships said again (founder H17) ─────────────────────────────────

/** "John is your brother", "Ben is your younger brother": the relation, for a statement that only says that. */
function relationIn(statement: string): string | null {
  const m = statement.normalize("NFC").trim().replace(/[.!]$/u, "")
    .match(/^\p{Lu}[\p{L}\p{M}'’-]*(?:\s+\p{Lu}[\p{L}\p{M}'’-]*)?\s+is\s+your\s+(?:(?:older|younger|little|big|baby|twin|oldest|youngest|eldest)\s+)?([\p{L}-]+(?:\s+[\p{L}-]+)?)$/u);
  return m ? m[1].toLocaleLowerCase() : null;
}

const SIBLING = new Set(["brother", "sister", "sibling"]);
const PARENT = new Set(["mom", "mother", "dad", "father", "parent"]);
const CHILD = new Set(["son", "daughter", "kid", "child"]);

/** Same relationship, in the user's words or Kinship's ("sibling" fits "brother"). */
function sameRelation(a: string, b: string): boolean {
  const x = relationKey(a), y = relationKey(b);
  if (x === y) return true;
  return [SIBLING, PARENT, CHILD].some((g) => g.has(x) && g.has(y) && (x === "sibling" || y === "sibling" || x === "parent" || y === "parent" || x === "child" || y === "child" || x === "kid" || y === "kid"));
}
