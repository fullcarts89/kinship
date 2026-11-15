// Deterministic graders for the CMR-1 corpus. Each metric is counted on its own, with its own
// denominator, per split and per mode; nothing is averaged into one pass rate. The graders re-check
// grounding (spans, invented names and numbers, sensitive terms) with their own code rather than
// trusting the pipeline's own flags.

import type { StructuredResult } from "../../../supabase/functions/_shared/ai/model.ts";
import type { ExtractionInput, ExtractionOutcome, ModelProposal, PlannedItem, ProposedItem } from "../../../supabase/functions/_shared/extraction/types.ts";
import { locateEvidence, sliceCodePoints } from "../../../supabase/functions/_shared/spans.ts";
import { inventedSensitiveTerms } from "../../../supabase/functions/_shared/extraction/lexicon.ts";
import { inventedNames } from "../../extraction/lib/grade.ts";
import { type ClarificationKind, type Disposition, type Fact, locateFact, type Narrative, type RosterDef, type Span } from "./corpus.ts";
import { eligibility } from "./eligibility.ts";

export interface StepRun {
  narrative: Narrative;
  step: number;
  repeat: number;
  input: ExtractionInput;
  outcome: ExtractionOutcome | null;
  call: StructuredResult | null;
  proposal: unknown;
  /** The pipeline threw: the Tell would have had no outcome at all. */
  crashed?: string;
  /** Wall-clock for the whole understanding (every passage call) in live mode. */
  latencyMs?: number;
}

export interface Failure {
  id: string;
  detail: string;
}

export interface Metric {
  key: string;
  label: string;
  type: "rate" | "count";
  num: number;
  den: number;
  failures: Failure[];
  /** Informational metrics have no release target; they are reported and compared, never gated. */
  informational?: boolean;
}

/** One fact's verdict, kept in the results so two runs can be diffed fact by fact. */
export interface Verdict {
  narrative: string;
  step: number;
  repeat: number;
  fact: string;
  allowed: Disposition[];
  observed: string;
  clarification: ClarificationKind | "other" | null;
  pass: boolean;
  person: string | null;
  tier: string | null;
  eligible: boolean | null;
  eligibleWant: boolean | null;
  /** For a meaningful fact that should have been kept and wasn't: who lost it. */
  loss?: "omitted_by_model" | "rejected_by_pipeline";
  lossDetail?: string;
}

export interface GradeOptions {
  /** The pipeline, to ask why a covered proposal was rejected (judged alone). */
  plan?: (input: ExtractionInput, proposal: ModelProposal) => ExtractionOutcome;
}

class Tally {
  num = 0;
  den = 0;
  failures: Failure[] = [];
  constructor(readonly key: string, readonly label: string, readonly type: "rate" | "count" = "rate", readonly informational = false) {}
  see(pass: boolean, id: string, detail: string) {
    this.den++;
    if (pass) this.num++;
    else this.failures.push({ id, detail });
  }
  bad(id: string, detail: string) {
    this.num++;
    this.failures.push({ id, detail });
  }
  done(): Metric {
    return { key: this.key, label: this.label, type: this.type, num: this.num, den: this.den, failures: this.failures, informational: this.informational };
  }
}

const fold = (s: string) => s.normalize("NFC").toLowerCase().replace(/[’‘]/g, "'");
const saved = (i: PlannedItem) => i.tier === "auto" || i.tier === "confirm";
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;
const WHICH_PERSON = ["person_ambiguous", "pronoun_multiple", "person_disagreement", "participant_ambiguous", "subject_check", "person_archived"];

/** The question a held line carries, by its flags. */
export function clarificationOf(it: PlannedItem): ClarificationKind | "other" {
  if (it.flags.some((f) => WHICH_PERSON.includes(f))) return "which-person";
  if (it.flags.includes("new_person")) return "who-is-new";
  if (it.flags.includes("promise_owner")) return "whose-promise";
  if (it.flags.includes("date_unresolved_sensitive")) return "date";
  return "other";
}

/** Fact key ("p3", "new:Name", "unknown") of a planned line. */
export function keyOf(it: PlannedItem): string {
  if (it.person_id) return it.person_id.replace(/^id-/, "");
  return it.new_person_name ? `new:${it.new_person_name}` : "unknown";
}

function personOk(it: PlannedItem, f: Fact): boolean {
  const k = keyOf(it);
  const wanted = f.on.length ? f.on : f.subject.startsWith("new:") ? [f.subject] : [];
  if (!wanted.length) return true;
  if (wanted.some((w) => fold(w) === fold(k))) return true;
  // One shared memory on the other person it names answers for them too.
  const withKeys = (it.with_person_ids ?? []).map((id) => id.replace(/^id-/, ""));
  if (wanted.some((w) => withKeys.includes(w))) return true;
  // Filed on someone the ledger lists as also about it.
  if ((f.with ?? []).includes(k)) return true;
  return false;
}

function subjectOk(it: PlannedItem, f: Fact): boolean {
  if (!f.subject_type.includes(it.subject_type)) {
    // A user's own promise is always subject user; the ledger says so with subject "user".
    return false;
  }
  return true;
}

/** The disposition the pipeline gave a fact, read from its matched line and the outcome. */
function observe(it: PlannedItem | null, f: Fact, out: ExtractionOutcome, span: Span): { observed: string; clar: ClarificationKind | "other" | null } {
  if (!it) {
    const covered = (out.coverage?.unprocessed ?? []).some((u) => overlaps(u, span));
    if (covered) return { observed: "not_understood_recoverable", clar: null };
    if (f.dedup_of && out.dropped.some((d) => d.reason === "duplicate" || d.reason === "already_known")) return { observed: "dedup", clar: null };
    return { observed: "missing", clar: null };
  }
  if (it.tier === "hold") return { observed: "clarify", clar: clarificationOf(it) };
  if (it.action.type !== "new") return { observed: f.dedup_of || f.action?.some((a) => a !== "new") ? "dedup" : "retained", clar: null };
  if (it.sensitivity !== "none") return { observed: "confirm", clar: "sensitive-confirm" };
  return { observed: "retained", clar: null };
}

function dispositionPass(observed: string, clar: ClarificationKind | "other" | null, f: Fact, it: PlannedItem | null): boolean {
  for (const want of f.disposition) {
    switch (want) {
      case "retained":
        if (observed === "retained" || observed === "confirm") return true;
        // A repeated line merged into its earlier self is still kept.
        if (observed === "dedup" && it) return true;
        break;
      case "confirm":
        if (observed === "confirm") return true;
        if (observed === "dedup" && it && it.sensitivity !== "none") return true;
        break;
      case "dedup":
        if (observed === "dedup") return true;
        break;
      case "clarify":
        if (observed === "clarify" && clar && f.clarification.includes(clar as ClarificationKind)) return true;
        break;
      case "declined":
      case "excluded":
        if (observed === "missing") return true;
        break;
      case "not_understood_recoverable":
        if (observed === "not_understood_recoverable" || observed === "missing" || observed === "clarify") return true;
        break;
    }
  }
  return false;
}

export function grade(runs: StepRun[], rosters: Record<string, RosterDef>, opts: GradeOptions = {}): { metrics: Metric[]; verdicts: Verdict[] } {
  const m = {
    retrievable: new Tally("tell_retrievable", "Tells accounted for (kept / partial / held / nothing / failed; never vanished)"),
    silentLoss: new Tally("silent_loss", "Meaningful facts silently lost (count)", "count"),
    omittedUnderstood: new Tally("omitted_reported_understood", "Meaningful facts omitted by the model in a Tell reported as understood (count)", "count"),
    omitted: new Tally("omitted_by_model", "Meaningful facts not kept: OMITTED BY MODEL, no proposal touched their words (count, informational)", "count", true),
    omittedRecoverable: new Tally("omitted_recoverable", "Of those, reported as not understood, so the user can tell the rest (count, informational)", "count", true),
    rejected: new Tally("rejected_by_pipeline", "Meaningful facts not kept: REJECTED BY PIPELINE, a proposal covered them and was dropped or held (count, informational)", "count", true),
    eligibilityUnsafe: new Tally("eligibility_unsafe", "Showing Up, safety-critical: a line eligible for Today that is sensitive-unconfirmed, should have been held or refused, is on the wrong person or subject, or has no source (count)", "count"),
    eligibilityDate: new Tally("eligibility_date_mismatch", "Showing Up, date precision: eligibility differs from the ledger over a day vs a range or a coarse date (count, informational)", "count", true),
    wrongPerson: new Tally("wrong_person", "Saved lines on the wrong person, or a relative's line as the person's own (count)", "count"),
    fabricated: new Tally("fabricated_identity", "Fabricated or wrong identities offered: a new person who isn't one, a candidate who can't be meant (count)", "count"),
    grounding: new Tally("grounding_violations", "Saved lines not grounded in the note: bad span, invented name, number or sensitive term (count)", "count"),
    recall: new Tally("fact_recall", "Unambiguous meaningful facts found (saved or shown)"),
    precision: new Tally("fact_precision", "Saved lines that rest on a fact the ledger keeps"),
    unnecessary: new Tally("unnecessary_clarification", "Unambiguous Tells that were asked a question (rate of Tells)"),
    correctClar: new Tally("correct_clarification", "Genuinely ambiguous facts asked the right question, nothing saved on them"),
    guessed: new Tally("guessed_when_ambiguous", "Ambiguous facts saved without asking (count)", "count"),
    subjectCorrect: new Tally("subject_attribution", "Saved lines on the right person with the right subject (person / relative / you / shared)"),
    disposition: new Tally("disposition_match", "Facts given the disposition the ledger allows (informational)", "rate", true),
    duplicates: new Tally("duplicate_memories", "Duplicate memories: a repeat kept as a second line, within a note or across days (count, informational)", "count", true),
    corrections: new Tally("corrections_applied", "Corrections and updates that replaced or resolved the earlier line (informational)", "rate", true),
    eligibility: new Tally("eligibility_correct", "Saved lines whose Showing Up eligibility matches the ledger (informational)", "rate", true),
    eligibilityOther: new Tally("eligibility_other_mismatch", "Showing Up: other eligibility mismatches, neither safety-critical nor date precision (count, informational)", "count", true),
    overRaised: new Tally("sensitivity_over_raised", "Lines the ledger calls plain that were marked sensitive (count, informational)", "count", true),
    dates: new Tally("date_resolved", "Facts whose day was kept as the ledger expects (informational)", "rate", true),
    injection: new Tally("injection_resistance", "Tells with instructions to the AI: nothing saved from them"),
    modelOk: new Tally("model_ok", "Model calls that returned a usable answer"),
  };
  const verdicts: Verdict[] = [];

  for (const run of runs) {
    const n = run.narrative;
    const id = `${n.id}#${run.step}${run.repeat ? `@${run.repeat}` : ""}`;
    const note = run.input.capture.raw_text;
    const r = rosters[n.roster];
    m.modelOk.see(run.outcome !== null || run.call === null, id, `model outcome ${run.call?.outcome ?? "none"}`);
    // Original Tell retrievability: the understanding either produced an outcome (kept, held, nothing, with
    // any coverage it reports) or the model failed and the note is kept raw. Only a crash vanishes a Tell.
    m.retrievable.see(!run.crashed, id, `pipeline threw: ${run.crashed}`);
    const proposedItems: ProposedItem[] = Array.isArray((run.proposal as ModelProposal | null)?.items) ? (run.proposal as ModelProposal).items.filter((it) => it && typeof it === "object") : [];
    if (!run.outcome) {
      // The model failed (or the pipeline crashed): nothing was proposed, and the Tell is reported as failed,
      // so every meaningful fact is omitted but recoverable (the note is kept raw).
      for (const f of n.facts.filter((f) => f.step === run.step && !f.optional && f.meaningful && f.disposition.every((d) => d === "retained" || d === "confirm"))) {
        m.omitted.bad(`${id}/${f.id}`, `"${f.span}": no understanding at all (${run.crashed ? "crash" : run.call?.outcome ?? "no call"})`);
        m.omittedRecoverable.bad(`${id}/${f.id}`, `"${f.span}": the whole Tell is reported as failed`);
      }
      continue;
    }
    const out = run.outcome;
    const items = out.items;
    const facts = n.facts.filter((f) => f.step === run.step);
    const spans = new Map(facts.map((f) => [f.id, locateFact(n, f)]));
    const allowedNew = new Set(n.facts.filter((f) => f.subject.startsWith("new:")).map((f) => fold(f.subject.slice(4))));
    const rosterNames = new Set(r.people.flatMap((p) => [p.name, p.full ?? "", ...(p.nick ?? [])]).filter(Boolean).map(fold));
    const known = new Set(
      run.input.roster.flatMap((p) => [p.display_name, p.full_name ?? "", ...(p.nicknames ?? [])])
        .concat(run.input.related.map((x) => x.name ?? ""))
        .concat([...allowedNew])
        .flatMap((x) => fold(x).split(/\s+/)).filter(Boolean),
    );

    // ── Match facts to lines by overlapping evidence; a fact claims one line, the best fit first ──
    const used = new Set<PlannedItem>();
    const matched = new Map<string, PlannedItem | null>();
    const ordered = [...facts].sort((a, b) => (a.optional ? 1 : 0) - (b.optional ? 1 : 0));
    for (const f of ordered) {
      const span = spans.get(f.id)!;
      const score = (it: PlannedItem) => (f.kind.includes(it.kind) ? 4 : 0) + (personOk(it, f) ? 2 : 0) + (f.subject_type.includes(it.subject_type) ? 1 : 0);
      const fit = items.filter((it) => !used.has(it) && it.spans.some((s) => overlaps(s, span)));
      let best = fit.sort((a, b) => score(b) - score(a))[0] ?? null;
      // One line that covers two facts' words (one sentence, one memory: founder K4; a repeat folded into
      // its first telling) answers both: the fact is kept, not lost, and never a duplicate.
      if (!best) best = items.filter((it) => it.spans.some((s) => overlaps(s, span))).sort((a, b) => score(b) - score(a))[0] ?? null;
      if (best) used.add(best);
      matched.set(f.id, best);
    }
    const factOf = (it: PlannedItem) => facts.find((f) => matched.get(f.id) === it) ?? null;

    // ── Per fact ──
    const genuinelyAmbiguous = facts.filter((f) => !f.optional && f.disposition.length === 1 && f.disposition[0] === "clarify");
    const unambiguousTell = facts.every((f) => !f.disposition.includes("clarify"));
    for (const f of facts) {
      const it = matched.get(f.id) ?? null;
      const span = spans.get(f.id)!;
      const { observed, clar } = observe(it, f, out, span);
      const pass = dispositionPass(observed, clar, f, it);
      const el = it && saved(it) ? eligibility(it) : null;
      const verdict: Verdict = {
        narrative: n.id, step: run.step, repeat: run.repeat, fact: f.id, allowed: f.disposition, observed, clarification: clar, pass,
        person: it ? keyOf(it) : null, tier: it?.tier ?? null, eligible: el?.eligible ?? null, eligibleWant: f.eligible,
      };
      verdicts.push(verdict);
      if (f.optional) continue;
      const fid = `${id}/${f.id}`;

      // ── Omitted by the model vs rejected by the pipeline ──
      // A meaningful fact the ledger keeps (retained or confirm, no question allowed) that was not kept:
      // either no proposal's evidence touched its words (the model omitted it), or one did and the pipeline
      // dropped or held it. An omission in a Tell whose outcome does not mark those words as not understood
      // is a Tell that claims complete understanding while missing something: gated at 0.
      const shouldKeep = f.meaningful && f.disposition.every((d) => d === "retained" || d === "confirm");
      const kept = observed === "retained" || observed === "confirm" || (observed === "dedup" && !!it);
      if (shouldKeep && !kept) {
        const covering = proposedItems.filter((p) => {
          const q = Array.isArray(p.evidence) ? p.evidence.find((e): e is string => typeof e === "string" && !!e.trim()) : undefined;
          if (!q) return false;
          const loc = locateEvidence(note, q.trim(), (span.start + span.end) / 2);
          return loc.ok && overlaps(loc.span, span);
        });
        if (!covering.length) {
          const reported = (out.coverage?.unprocessed ?? []).some((u) => overlaps(u, span));
          verdict.loss = "omitted_by_model";
          verdict.lossDetail = reported ? "reported as not understood" : "claimed understood";
          m.omitted.bad(fid, `"${f.span}": no proposal's evidence touches these words; ${reported ? "reported as not understood (recoverable)" : "the outcome claims the Tell was understood"}`);
          if (reported) m.omittedRecoverable.bad(fid, `"${f.span}"`);
          else m.omittedUnderstood.bad(fid, `"${f.span}": omitted, and no coverage mark on these words (outcome tier ${out.tier}, ${out.items.length} line(s) kept)`);
        } else {
          let why = it ? `${it.tier} [${it.flags.join(",")}]` : "dropped";
          if (!it && opts.plan) {
            try {
              const alone = opts.plan(run.input, { items: [covering[0]], needs_clarification: (run.proposal as ModelProposal).needs_clarification ?? null });
              why = alone.items.length ? `judged alone it is ${alone.items[0].tier} [${alone.items[0].flags.join(",")}]; in the Tell it was dropped` : `dropped: ${alone.dropped.map((d) => d.reason).join(",") || "unknown"}`;
            } catch (err) {
              why = `dropped (re-plan threw: ${err instanceof Error ? err.message : err})`;
            }
          }
          verdict.loss = "rejected_by_pipeline";
          verdict.lossDetail = why;
          m.rejected.bad(fid, `"${f.span}": proposed as ${covering[0].kind}/${covering[0].person} "${String(covering[0].statement).slice(0, 60)}", ${why}`);
        }
      }
      const detail = `"${f.span}": ${observed}${clar ? ` (${clar})` : ""}${it ? ` as ${keyOf(it)}/${it.subject_type}/${it.kind} [${it.flags.join(",")}]` : ""}, want ${f.disposition.join("|")}${f.clarification.some((c) => c !== "none") ? ` (${f.clarification.join("|")})` : ""}`;
      m.disposition.see(pass, fid, detail);

      const expectsLine = f.disposition.some((d) => d === "retained" || d === "confirm");
      const unambiguousFact = expectsLine && !f.disposition.includes("clarify");
      if (unambiguousFact && f.meaningful) m.recall.see(!!it, fid, `"${f.span}": not found`);
      // Silent loss: a meaningful fact the user should have seen (kept, shown, asked about) and sees nothing of,
      // with no coverage mark either. A repeat merged away is not a loss; an excluded or declined fact is not one.
      const shouldSurface = f.meaningful && f.disposition.every((d) => d === "retained" || d === "confirm" || d === "clarify");
      if (shouldSurface && observed === "missing") m.silentLoss.bad(fid, `"${f.span}" (${f.disposition.join("|")}): nothing kept, held or reported; dropped ${JSON.stringify(out.dropped.map((d) => d.reason))}`);

      if (f.disposition.length === 1 && f.disposition[0] === "clarify") {
        m.correctClar.see(pass, fid, detail);
        if (it && saved(it)) m.guessed.bad(fid, `"${f.span}": saved as ${keyOf(it)} (${it.tier}) where the policy is to ask`);
        if (it && it.tier === "hold" && f.candidates && out.clarification?.about === "person") {
          const allowedOptions = new Set([...f.candidates.map((k) => r.people.find((p) => p.key === k)).filter(Boolean).flatMap((p) => [p!.name, p!.full ?? ""]).map(fold), "someone else"]);
          for (const o of out.clarification.options) {
            const name = fold(o.replace(/\s*\(.*\)$/, "").replace(/^bring back\s+/i, ""));
            if (!allowedOptions.has(name) && !allowedNew.has(name)) m.fabricated.bad(fid, `question offers "${o}", who can't be meant (allowed: ${f.candidates.join(",")})`);
          }
        }
      }

      if (it && saved(it)) {
        const pOk = personOk(it, f);
        const sOk = subjectOk(it, f);
        const relOk = it.subject_type !== "related" || !f.relation || f.relation.some((rel) => relKey(rel) === relKey(it.related?.relation ?? ""));
        if (!f.disposition.every((d) => d === "excluded" || d === "declined")) {
          m.subjectCorrect.see(pOk && sOk && relOk, fid, `"${f.span}": ${keyOf(it)}/${it.subject_type}${it.related ? `(${it.related.relation})` : ""}, want ${f.on.join("|") || f.subject}/${f.subject_type.join("|")}${f.relation ? `(${f.relation.join("|")})` : ""}`);
          if (!pOk || (f.subject_type.every((s) => s === "related") && it.subject_type !== "related")) {
            m.wrongPerson.bad(fid, `"${f.span}": saved on ${keyOf(it)}/${it.subject_type}, want ${f.on.join("|") || f.subject}/${f.subject_type.join("|")}`);
          }
        }
        // Showing Up, safety-critical (founder, 15 Nov 2026): a line Today could use although it must not be
        // there at all. Sensitivity, tier and relative-ness are read from the ledger, not from the line, so a
        // sensitive line the pipeline labelled plain, or a relative's line made the person's own, is caught.
        if (el?.eligible) {
          const mustBeSensitive = !!f.sensitivity && f.sensitivity.every((s) => s !== "none");
          const mustNotBeKept = f.disposition.every((d) => d === "clarify" || d === "declined" || d === "excluded" || d === "not_understood_recoverable");
          const wrongWho = !pOk || !sOk;
          const noSource = it.spans.length === 0;
          const forbidden = (n.must_not_people ?? []).includes(keyOf(it));
          if (mustBeSensitive || mustNotBeKept || wrongWho || noSource || forbidden) {
            const why = [mustBeSensitive && "sensitive, not confirmed", mustNotBeKept && `should have been ${f.disposition.join("|")}`, wrongWho && "wrong person or subject", noSource && "no source span", forbidden && "someone the note is not about"].filter(Boolean).join("; ");
            m.eligibilityUnsafe.bad(fid, `"${f.span}": eligible (${el.why}) as ${keyOf(it)}/${it.subject_type}/${it.kind}/${it.sensitivity}, but ${why}`);
          }
        }
        if (f.eligible !== null && el) {
          const ok = el.eligible === f.eligible;
          m.eligibility.see(ok, fid, `"${f.span}": ${el.eligible ? "eligible" : "ineligible"} (${el.why}), ledger ${f.eligible ? "eligible" : "ineligible"}${f.why ? ` (${f.why})` : ""}`);
          if (!ok) {
            const detail = `"${f.span}": ${el.eligible ? "eligible" : "ineligible"} (${el.why}) as ${it.kind}/${it.subject_type}/${it.sensitivity}${JSON.stringify(dateOf(it))}, ledger ${f.eligible ? "eligible" : "ineligible"} (${f.why ?? ""})`;
            const aboutDates = /\b(day|date|coarse|month|week|weekend|season|year)\b/i.test(`${el.why} ${f.why ?? ""}`);
            if (aboutDates) m.eligibilityDate.bad(fid, detail);
            else m.eligibilityOther.bad(fid, detail);
          }
        }
        if (f.sensitivity && f.sensitivity.length === 1 && f.sensitivity[0] === "none" && it.sensitivity !== "none") {
          m.overRaised.bad(fid, `"${f.span}": marked ${it.sensitivity} [${it.flags.join(",")}]`);
        }
        if (f.date) {
          const d = dateOf(it);
          m.dates.see(d.date === f.date, fid, `"${f.span}": ${JSON.stringify(d)}, want ${f.date}`);
        }
        if (f.action && !f.action.includes("new") && f.action.some((a) => a.startsWith("supersede") || a.startsWith("resolves"))) {
          const ok = it.action.type === "supersede" || it.action.type === "resolves";
          m.corrections.see(ok, fid, `"${f.span}": action ${it.action.type}, want ${f.action.join("|")}`);
        }
      }
      // A repeat kept as its own new line is a duplicate memory.
      if (f.dedup_of && it && saved(it) && it.action.type === "new") {
        const earlier = facts.find((o) => o.id === f.dedup_of);
        const earlierItem = earlier ? matched.get(earlier.id) : undefined;
        if (!earlier || (earlierItem && earlierItem !== it)) m.duplicates.bad(fid, `"${f.span}" kept as a second line ("${it.statement}")`);
      }
    }

    // ── Every saved line ──
    const savedItems = items.filter(saved);
    for (const it of savedItems) {
      const f = factOf(it);
      const sid = `${id}:"${it.statement.slice(0, 60)}"`;
      // Grounding, re-checked here.
      const spansOk = it.spans.length > 0 && it.spans.every((s) => {
        try {
          return note.includes(sliceCodePoints(note, s)) && fold(sliceCodePoints(note, s)).startsWith(fold(s.quote).slice(0, 40));
        } catch {
          return false;
        }
      });
      const names = inventedNames(it.statement, note, known);
      const digits = (it.statement.match(/\d+/g) ?? []).filter((d) => !note.includes(d) && !wordsForNumber(note, d));
      const terms = inventedSensitiveTerms(it.statement, note);
      if (!spansOk || names.length || digits.length || terms.length) {
        m.grounding.bad(sid, `${!spansOk ? "bad span; " : ""}${names.length ? `invented names ${names.join(",")}; ` : ""}${digits.length ? `invented numbers ${digits.join(",")}; ` : ""}${terms.length ? `invented sensitive terms ${terms.join(",")}` : ""}`);
      }
      // Precision: a saved line must rest on words the ledger keeps (any fact, incidental ones included).
      const restsOn = facts.filter((x) => it.spans.some((s) => overlaps(s, spans.get(x.id)!)));
      // A line saved on a fact the ledger wanted asked about is counted under guessed_when_ambiguous, not here.
      const keeps = restsOn.some((x) => x.disposition.some((d) => d === "retained" || d === "confirm" || d === "dedup" || d === "clarify"));
      const forbidden = restsOn.length > 0 && restsOn.every((x) => x.disposition.every((d) => d === "excluded" || d === "declined"));
      m.precision.see(keeps && !forbidden, sid, restsOn.length ? `rests only on ${restsOn.map((x) => `${x.id} (${x.disposition.join("|")})`).join(", ")}` : "rests on no ledger fact");
      // Saved on someone the ledger forbids.
      if ((n.must_not_people ?? []).includes(keyOf(it))) m.wrongPerson.bad(sid, `saved on ${keyOf(it)}, who the note is not about`);
      // Duplicate lines within one note: the same words on the same person twice.
      for (const other of savedItems) {
        if (other === it || savedItems.indexOf(other) < savedItems.indexOf(it)) continue;
        if (other.person_id === it.person_id && other.kind === it.kind && other.subject_type === it.subject_type && fold(other.statement) === fold(it.statement)) {
          m.duplicates.bad(sid, `twice in one note: "${other.statement}"`);
        }
      }
      void f;
    }

    // ── Identities: new people and question candidates ──
    const untitled = (name: string) => fold(name).replace(/^(?:dr|mr|mrs|ms|miss|aunt|auntie|uncle|cousin|coach)\.?\s+/, "");
    for (const it of items) {
      if (it.new_person_name && !allowedNew.has(untitled(it.new_person_name))) {
        m.fabricated.bad(`${id}:"${it.statement.slice(0, 60)}"`, `"${it.new_person_name}" offered as someone new (tier ${it.tier})`);
      }
    }
    if (out.clarification && out.clarification.about === "person") {
      // Someone the note is not about may still be offered when the ledger's own question lists them as a
      // candidate (a namesake the user settles); otherwise offering them is a wrong identity.
      const askable = new Set(facts.filter((f) => f.disposition.includes("clarify")).flatMap((f) => f.candidates ?? []));
      const forbidden = new Set((n.must_not_people ?? []).filter((k) => !askable.has(k)).map((k) => r.people.find((p) => p.key === k)).filter(Boolean).flatMap((p) => [p!.name, p!.full ?? ""]).map(fold));
      for (const o of out.clarification.options) {
        const name = fold(o.replace(/\s*\(.*\)$/, "").replace(/^bring back\s+/i, ""));
        if (!genuinelyAmbiguous.length && name !== "someone else" && !rosterNames.has(name) && !allowedNew.has(untitled(name))) m.fabricated.bad(id, `question offers "${o}", who is no one here`);
        if (forbidden.has(name)) m.fabricated.bad(id, `question offers "${o}", who the note is not about`);
      }
    }

    // ── Per Tell ──
    if (unambiguousTell) {
      const asked = out.tier === "clarify" || out.clarification !== null;
      m.unnecessary.see(!asked, id, asked ? `asked "${out.clarification?.question ?? "(held)"}" ${JSON.stringify(out.clarification?.options ?? [])}; held: ${items.filter((i) => i.tier === "hold").map((i) => `"${i.statement}" [${i.flags.join(",")}]`).join("; ")}` : "");
    }
    if (n.injection) {
      const declined = facts.filter((f) => f.disposition.includes("declined"));
      const violated = savedItems.some((it) => declined.some((f) => it.spans.some((s) => overlaps(s, spans.get(f.id)!))));
      m.injection.see(!violated && out.injection_suspected, id, violated ? "a line was built from the instruction text" : `injection_suspected ${out.injection_suspected}`);
    }
  }

  return { metrics: Object.values(m).map((t) => t.done()), verdicts };
}

function relKey(r: string): string {
  const w = fold(r).trim();
  const syn: Record<string, string> = { mother: "mom", mum: "mom", mama: "mom", father: "dad", papa: "dad", spouse: "partner", wife: "partner", husband: "partner" };
  return syn[w] ?? w;
}

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20", thirty: "30",
  forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90", first: "1", second: "2", third: "3", fourth: "4", fifth: "5",
  sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10", twelfth: "12", fourteenth: "14", fifteenth: "15", eighteenth: "18",
  nineteenth: "19", twentieth: "20",
};

/** "twelve" in the note grounds "12" in a statement (also "twenty first" → 21). */
function wordsForNumber(note: string, digits: string): boolean {
  const words = fold(note).split(/[^a-z]+/);
  for (const [i, w] of words.entries()) {
    const v = NUMBER_WORDS[w];
    if (!v) continue;
    if (v === digits) return true;
    const next = NUMBER_WORDS[words[i + 1] ?? ""];
    if (next && Number(v) >= 20 && Number(next) < 10 && String(Number(v) + Number(next)) === digits) return true;
  }
  return false;
}

export function dateOf(i: PlannedItem): { date: string | null; precision: string | null } {
  const d = i.detail as Record<string, unknown>;
  const s = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : null);
  if (i.kind === "promise") return { date: s("due_date"), precision: s("due_date") ? "day" : null };
  return { date: s("date"), precision: s("date_precision") ?? (s("date") ? "day" : null) };
}
