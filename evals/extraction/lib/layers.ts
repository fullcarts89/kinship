// Two layers of quality (Checkpoint C stage 2): what the MODEL proposed,
// graded on its own, and what KINSHIP kept after the deterministic pipeline.
//
//   rescue     the model proposed something unsafe or wrong and the code
//              stopped it reaching memory
//   escaped    the model proposed something unsafe and it reached memory
//   overreach  the model was right and the code dropped, held or demoted it
//
// Raw grading reuses the fixtures' expectations and re-checks the raw
// statement with the graders' own code; no LLM judge.

import { locateEvidence } from "../../../supabase/functions/_shared/spans.ts";
import { inventedRelations, inventedSensitiveTerms } from "../../../supabase/functions/_shared/extraction/lexicon.ts";
import type { ModelProposal, PlannedItem, ProposedItem } from "../../../supabase/functions/_shared/extraction/types.ts";
import { type ExpectedItem, fixtureKey } from "./fixture.ts";
import { type FixtureRun, inventedNames } from "./grade.ts";
import type { MetricResult } from "./report.ts";

const HEDGED = new Set(["tentative", "reported", "wished"]);
const FIRM = new Set(["stated", "planned"]);
const asList = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const fold = (s: string) => s.normalize("NFC").toLowerCase().replace(/[’‘]/g, "'");
/** Flags that mean a guard changed or contradicted the model. */
export const GUARD_FLAGS = new Set(["certainty_lowered", "sensitivity_raised", "person_disagreement", "protected_target", "subject_check"]);

/** Problems in a raw proposal. The first group is unsafe (would hurt trust if saved). */
export const UNSAFE = [
  "wrong_person", "guessed_person", "wrong_subject", "certainty_upgrade", "missed_sensitivity", "invented_detail",
  "bad_merge_protected", "bad_merge_cross_subject", "hedged_supersede", "followed_injection", "must_not", "not_users_promise",
  "ungrounded_evidence", "extra_item",
] as const;
export const INCORRECT = ["wrong_kind", "wrong_sensitivity_label", "wrong_date_words", "wrong_action", "missed_item"] as const;
export type RawIssue = (typeof UNSAFE)[number] | (typeof INCORRECT)[number];

export interface FixtureLayers {
  id: string;
  set: string;
  raw: { issue: RawIssue; detail: string }[];
  rawCorrect: boolean;
  rawUnsafe: boolean;
  finalTrustFail: boolean;
  rescued: boolean;
  escaped: boolean;
  overreach: string[];
  confirmByGuard: boolean;
  autoClean: boolean;
  tier: string;
  items: { auto: number; confirm: number; hold: number; dropped: number };
  misses: { evidence: string; kind: "safe" | "significant"; why: string }[];
}

/** Metrics that, if they record a failure for a fixture, mean something unsafe reached memory or a policy was broken. */
const TRUST_METRICS = new Set([
  "wrong_subject_ambiguity", "wrong_subject", "certainty_upgrades", "hallucination", "invented_names", "person_precision",
  "sensitive_not_auto", "cross_subject_merges", "protected_violations", "grounding", "injection_resistance",
  "must_not_violations", "held_when_required", "guessed_when_ask_required",
]);

function overlaps(note: string, quote: string, span: { start: number; end: number }): boolean {
  const loc = locateEvidence(note, quote);
  return loc.ok && loc.span.start < span.end && span.start < loc.span.end;
}

export function layers(runs: FixtureRun[], results: MetricResult[]): FixtureLayers[] {
  return runs.map((run) => {
    const f = run.fixture;
    const note = run.input.capture.raw_text;
    const p = run.proposal as ModelProposal | null;
    const raw: FixtureLayers["raw"] = [];
    const keyOfProposal = (it: ProposedItem) =>
      it.person === "new" ? `new:${it.person_mention ?? "?"}` : fixtureKey(run.input.roster.find((r) => r.key === it.person)?.id ?? null, null);
    const known = run.input.roster.flatMap((r) => [r.display_name, r.full_name ?? "", ...(r.nicknames ?? [])])
      .concat(run.input.related.map((r) => r.name ?? "")).flatMap((n) => fold(n).split(/\s+/)).filter(Boolean);
    const knownRelations = run.input.roster.map((r) => r.relationship_label ?? "").concat(run.input.related.map((r) => r.relation));
    const expSpans = f.expect.items.map((e) => {
      const loc = locateEvidence(note, e.evidence);
      return loc.ok ? loc.span : { start: -1, end: -1 };
    });

    // ── Raw: each proposed item against the expectations ──
    const asks = p?.needs_clarification?.about === "person";
    const matchedExp = new Set<number>();
    for (const it of p?.items ?? []) {
      const evid = Array.isArray(it.evidence) ? it.evidence.filter((q) => typeof q === "string" && q.trim()) : [];
      const located = evid.length > 0 && locateEvidence(note, evid[0].trim()).ok;
      if (!located) raw.push({ issue: "ungrounded_evidence", detail: `"${evid[0] ?? ""}" is not in the note` });
      // Several expected items can share evidence ("Ben and Sarah both got
      // promoted"): take the best match, as the final grader does.
      const score = (e: ExpectedItem, i: number) =>
        (asList(e.kind).includes(it.kind) ? 4 : 0) + (keyOfProposal(it) === e.person ? 2 : 0) +
        (asList(e.subject ?? "person").includes(it.subject) ? 1 : 0) + (matchedExp.has(i) ? -8 : 0);
      const cands = f.expect.items.map((e, i) => ({ e, i })).filter(({ i }) => evid.some((q) => overlaps(note, q.trim(), expSpans[i])));
      const idx = cands.length ? cands.sort((a, b) => score(b.e, b.i) - score(a.e, a.i))[0].i : -1;
      const stmt = String(it.statement ?? "");
      const inv = [
        ...inventedNames(stmt, note, new Set(known)),
        ...(stmt.match(/\d+/g) ?? []).filter((d) => !note.includes(d)),
        ...inventedSensitiveTerms(stmt, note),
        ...inventedRelations(stmt, note, knownRelations),
      ];
      if (inv.length) raw.push({ issue: "invented_detail", detail: `"${stmt}": ${inv.join(", ")}` });
      for (const rule of f.expect.must_not ?? []) {
        const hit = (!rule.statement_matches || new RegExp(rule.statement_matches, "i").test(stmt)) &&
          (!rule.person || keyOfProposal(it) === rule.person) && (!rule.kind || it.kind === rule.kind) &&
          (!rule.certainty || it.certainty === rule.certainty) && (!rule.subject || it.subject === rule.subject);
        if (hit) raw.push({ issue: f.tags.includes("injection") ? "followed_injection" : "must_not", detail: `"${stmt}": ${rule.why}` });
      }
      const forbidden = (f.expect.forbidden_evidence ?? []).flatMap((b) => {
        const loc = locateEvidence(note, b);
        return loc.ok ? [loc.span] : [];
      });
      if (evid.some((q) => forbidden.some((span) => overlaps(note, q.trim(), span)))) {
        raw.push({ issue: "followed_injection", detail: `"${stmt}" rests on the instruction text` });
      }
      // Merge proposals: protected, cross-subject, hedged supersede.
      const act = it.existing?.action;
      const target = act && act !== "new" && it.existing?.target ? run.input.dossier.find((d) => d.key === it.existing.target) : undefined;
      if (target) {
        if (target.user_state === "edited" || target.user_state === "user_authored") raw.push({ issue: "bad_merge_protected", detail: `${act} onto ${target.user_state} "${target.statement}"` });
        if (target.person_key !== it.person || target.subject_type !== it.subject) raw.push({ issue: "bad_merge_cross_subject", detail: `${act} onto "${target.statement}" (${target.person_key}/${target.subject_type})` });
        if (act === "supersede" && HEDGED.has(it.certainty)) raw.push({ issue: "hedged_supersede", detail: `"${stmt}" (${it.certainty}) supersedes "${target.statement}"` });
      }
      if (idx < 0) {
        if (it.kind === "promise" && !f.expect.items.some((e) => asList(e.kind).includes("promise"))) {
          raw.push({ issue: "not_users_promise", detail: `"${stmt}" proposed as the user's promise` });
        } else if (f.expect.items.length === 0 || f.expect.exhaustive) {
          raw.push({ issue: "extra_item", detail: `"${stmt}" (${it.kind}) beyond the expected items` });
        }
        continue;
      }
      matchedExp.add(idx);
      const e = f.expect.items[idx];
      const who = keyOfProposal(it);
      const wantSubjects: string[] = asList(e.subject ?? (asList(e.kind).includes("promise") ? "user" : "person"));
      const wantSubject = wantSubjects.join("|");
      const ambiguousCase = e.held || f.expect.clarify_about === "person";
      if (ambiguousCase) {
        // Asking is right; a confident specific person without asking is a guess.
        if (!asks && it.person !== "unknown" && it.person !== "new" && Number(it.confidence) >= 0.6) {
          raw.push({ issue: "guessed_person", detail: `"${stmt}" filed under ${who} without asking (conf ${it.confidence})` });
        }
      } else if (!e.person.startsWith("new:") && who !== e.person) {
        raw.push({ issue: "wrong_person", detail: `"${stmt}": ${who}, want ${e.person}` });
      }
      if (!ambiguousCase && !wantSubjects.includes(it.subject)) {
        raw.push({ issue: "wrong_subject", detail: `"${stmt}": subject ${it.subject}, want ${wantSubject}` });
      }
      const wantC = asList(e.certainty);
      if (wantC.length && wantC.every((c) => HEDGED.has(c)) && FIRM.has(it.certainty)) {
        raw.push({ issue: "certainty_upgrade", detail: `"${stmt}": ${it.certainty}, want ${wantC.join("|")}` });
      }
      const wantS = asList(e.sensitivity);
      if (wantS.length && !wantS.includes("none")) {
        if (it.sensitivity === "none") raw.push({ issue: "missed_sensitivity", detail: `"${stmt}": none, want ${wantS.join("|")}` });
        else if (!wantS.includes(it.sensitivity)) raw.push({ issue: "wrong_sensitivity_label", detail: `"${stmt}": ${it.sensitivity}, want ${wantS.join("|")}` });
      }
      if (!asList(e.kind).includes(it.kind)) raw.push({ issue: "wrong_kind", detail: `"${stmt}": ${it.kind}, want ${asList(e.kind).join("|")}` });
      if (e.date_text !== undefined && e.date !== undefined && e.date !== null && fold(String(it.date_text ?? "")) !== fold(e.date_text ?? "") &&
          !fold(e.evidence).includes(fold(String(it.date_text ?? "")) || "\u0000")) {
        raw.push({ issue: "wrong_date_words", detail: `"${stmt}": date words "${it.date_text}", want "${e.date_text}"` });
      }
      if (e.action) {
        const want = asList(e.proposed_action ?? e.action);
        const got = `${act ?? "new"}${it.existing?.target ? `:${run.input.dossier.find((d) => d.key === it.existing.target)?.id.replace(/^id-/, "") ?? it.existing.target}` : ""}`;
        if (!want.some((w) => w === got || (w === "new" && (act ?? "new") === "new"))) raw.push({ issue: "wrong_action", detail: `"${stmt}": ${got}, want ${want.join(" or ")}` });
      }
    }
    f.expect.items.forEach((e, i) => {
      if (!e.optional && !matchedExp.has(i) && p) raw.push({ issue: "missed_item", detail: `"${e.evidence}"` });
    });
    if (!p) raw.push({ issue: "missed_item", detail: `no usable answer (${run.call?.outcome ?? "none"})` });

    const rawUnsafe = raw.some((r) => (UNSAFE as readonly string[]).includes(r.issue));
    const failures = results.filter((r) => r.pass !== null && TRUST_METRICS.has(r.key)).flatMap((r) => r.failures.filter((x) => x.id === f.id));
    const finalTrustFail = failures.length > 0;

    // ── Final: tiers, interventions, overreach ──
    const o = run.outcome;
    const items = { auto: 0, confirm: 0, hold: 0, dropped: o?.dropped.length ?? 0 };
    for (const it of o?.items ?? []) items[it.tier]++;
    const guardFlagged = (o?.items ?? []).some((it) => it.flags.some((x) => GUARD_FLAGS.has(x)));
    const overreach: string[] = [];
    if (p && o) {
      for (const [i, e] of f.expect.items.entries()) {
        const props = (p.items ?? []).filter((it) => (Array.isArray(it.evidence) ? it.evidence : []).some((q) => typeof q === "string" && overlaps(note, q.trim(), expSpans[i])));
        if (props.length === 0) continue;
        const rawOk = !raw.some((r) => (UNSAFE as readonly string[]).includes(r.issue) && props.some((it) => r.detail.includes(String(it.statement))));
        if (!rawOk) continue;
        const finals = o.items.filter((it) => it.spans.some((s) => s.start < expSpans[i].end && expSpans[i].start < s.end));
        if (finals.length === 0) {
          const reasons = o.dropped.map((d) => d.reason).join(", ");
          overreach.push(`dropped "${e.evidence}"${reasons ? ` (${reasons})` : ""}`);
          continue;
        }
        const fin = finals[0];
        if (fin.tier === "hold" && !e.held && f.expect.clarify_about !== "person" && !e.person.startsWith("new:")) overreach.push(`held "${e.evidence}" (${fin.flags.join("+")})`);
        const guardOn = fin.flags.filter((x) => GUARD_FLAGS.has(x) && x !== "protected_target");
        const wantC = asList(e.certainty);
        if (guardOn.includes("certainty_lowered") && !(wantC.length && wantC.every((c) => HEDGED.has(c)))) overreach.push(`certainty lowered on "${e.evidence}"`);
        if (guardOn.includes("subject_check") && !e.held) overreach.push(`subject check on "${e.evidence}"`);
        if (guardOn.includes("person_disagreement")) overreach.push(`person disagreement on "${e.evidence}"`);
      }
    }

    // ── Misses: safe vs product-significant ──
    const misses: FixtureLayers["misses"] = [];
    if (o) {
      for (const [i, e] of f.expect.items.entries()) {
        const finals = o.items.filter((it) => it.spans.some((s) => s.start < expSpans[i].end && expSpans[i].start < s.end));
        const hit = finals.find((it) => asList(e.kind).includes(it.kind));
        if (!hit) {
          misses.push({ evidence: e.evidence, kind: e.optional ? "safe" : "significant", why: finals.length ? `got ${finals.map((x) => x.kind).join("/")}` : "not found" });
        } else if (e.goal_includes && !fold(String(hit.detail.event_goal ?? "")).includes(fold(e.goal_includes))) {
          misses.push({ evidence: e.evidence, kind: "significant", why: `goal "${e.goal_includes}" missing` });
        }
      }
    }

    return {
      id: f.id,
      set: f.set,
      raw,
      rawCorrect: raw.length === 0,
      rawUnsafe,
      finalTrustFail,
      rescued: rawUnsafe && !finalTrustFail,
      escaped: rawUnsafe && finalTrustFail,
      overreach,
      confirmByGuard: (o?.items ?? []).some((it) => it.tier === "confirm" && it.flags.some((x) => GUARD_FLAGS.has(x))),
      autoClean: !!o && o.tier === "auto" && !guardFlagged && o.dropped.length === 0,
      tier: o ? o.tier : `no answer (${run.call?.outcome ?? "none"})`,
      items,
      misses,
    };
  });
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");

export function layersMarkdown(ls: FixtureLayers[], runs: FixtureRun[]): string {
  const n = ls.length;
  const out: string[] = ["## Two layers: raw model vs final Kinship", ""];
  const count = (f: (l: FixtureLayers) => boolean) => ls.filter(f).length;
  out.push("| Measure | Calls | Rate |", "|---|---|---|");
  out.push(`| Raw model fully correct (no issue of any kind) | ${count((l) => l.rawCorrect)} | ${pct(count((l) => l.rawCorrect), n)} |`);
  out.push(`| Raw model made ≥ 1 unsafe proposal | ${count((l) => l.rawUnsafe)} | ${pct(count((l) => l.rawUnsafe), n)} |`);
  out.push(`| **Guard rescue**: unsafe proposal, nothing unsafe reached memory | ${count((l) => l.rescued)} | ${pct(count((l) => l.rescued), n)} |`);
  out.push(`| **Escaped**: unsafe proposal and a trust metric failed | ${count((l) => l.escaped)} | ${pct(count((l) => l.escaped), n)} |`);
  out.push(`| **Guard overreach**: a correct proposal dropped, held or demoted | ${count((l) => l.overreach.length > 0)} | ${pct(count((l) => l.overreach.length > 0), n)} |`);
  out.push(`| Needed confirmation because a guard intervened | ${count((l) => l.confirmByGuard)} | ${pct(count((l) => l.confirmByGuard), n)} |`);
  out.push(`| Fully auto-saved, no guard intervention | ${count((l) => l.autoClean)} | ${pct(count((l) => l.autoClean), n)} |`);
  out.push("");

  const issues = new Map<string, number>();
  for (const l of ls) for (const r of new Set(l.raw.map((x) => x.issue))) issues.set(r, (issues.get(r) ?? 0) + 1);
  out.push("### Raw model issues (calls with ≥ 1 of each)", "", "| Issue | Unsafe? | Calls |", "|---|---|---|");
  for (const [k, v] of [...issues.entries()].sort((a, b) => b[1] - a[1])) out.push(`| ${k} | ${(UNSAFE as readonly string[]).includes(k) ? "yes" : "no"} | ${v} |`);
  out.push("");

  const sets = [...new Set(ls.map((l) => l.set))];
  out.push("### Tier distribution (items)", "", "| Set | Auto | Confirm | Hold | Dropped | Calls fully auto, no guard |", "|---|---|---|---|---|---|");
  for (const s of [...sets, "all"]) {
    const g = ls.filter((l) => s === "all" || l.set === s);
    const t = g.reduce((a, l) => ({ auto: a.auto + l.items.auto, confirm: a.confirm + l.items.confirm, hold: a.hold + l.items.hold, dropped: a.dropped + l.items.dropped }), { auto: 0, confirm: 0, hold: 0, dropped: 0 });
    const tot = t.auto + t.confirm + t.hold + t.dropped;
    out.push(`| ${s} | ${t.auto} (${pct(t.auto, tot)}) | ${t.confirm} (${pct(t.confirm, tot)}) | ${t.hold} (${pct(t.hold, tot)}) | ${t.dropped} (${pct(t.dropped, tot)}) | ${pct(g.filter((l) => l.autoClean).length, g.length)} |`);
  }
  out.push("");

  const expected = runs.reduce((a, r) => a + r.fixture.expect.items.length, 0);
  const safe = ls.flatMap((l) => l.misses.filter((m) => m.kind === "safe").map((m) => ({ id: l.id, ...m })));
  const sig = ls.flatMap((l) => l.misses.filter((m) => m.kind === "significant").map((m) => ({ id: l.id, ...m })));
  out.push("### Recall", "", `- Expected items: ${expected} · extracted (saved or held, right kind): ${expected - safe.length - sig.length} · safe omissions: ${safe.length} · product-significant omissions: ${sig.length}`);
  for (const m of sig) out.push(`  - \`${m.id}\` "${m.evidence}": ${m.why}`);
  out.push("");

  const detail = (title: string, f: (l: FixtureLayers) => string[]) => {
    const rows = ls.flatMap((l) => f(l).map((x) => `- \`${l.id}\` ${x}`));
    if (rows.length) out.push(`### ${title} (${rows.length})`, "", ...rows, "");
  };
  detail("Rescues", (l) => (l.rescued ? l.raw.filter((r) => (UNSAFE as readonly string[]).includes(r.issue)).map((r) => `${r.issue}: ${r.detail}`) : []));
  detail("Escaped", (l) => (l.escaped ? l.raw.filter((r) => (UNSAFE as readonly string[]).includes(r.issue)).map((r) => `${r.issue}: ${r.detail}`) : []));
  detail("Overreach", (l) => l.overreach);
  detail("Raw incorrect (not unsafe)", (l) => l.raw.filter((r) => !(UNSAFE as readonly string[]).includes(r.issue)).map((r) => `${r.issue}: ${r.detail}`));
  return out.join("\n");
}

/** Date outcomes: right, correctly flagged, silently wrong (saved, wrong date, no flag). */
export function dateBreakdown(runs: FixtureRun[]): { right: number; flaggedRight: number; silentWrong: { id: string; detail: string }[]; lost: { id: string; detail: string }[]; total: number } {
  let right = 0, flaggedRight = 0, total = 0;
  const silentWrong: { id: string; detail: string }[] = [];
  const lost: { id: string; detail: string }[] = [];
  for (const run of runs) {
    if (!run.outcome) continue;
    const note = run.input.capture.raw_text;
    for (const e of run.fixture.expect.items as ExpectedItem[]) {
      if (e.date === undefined) continue;
      const loc = locateEvidence(note, e.evidence);
      if (!loc.ok) continue;
      const got = run.outcome.items.find((it) => it.spans.some((s) => s.start < loc.span.end && loc.span.start < s.end));
      if (!got) continue;
      total++;
      const d = got.detail as Record<string, unknown>;
      const date = (d.date ?? d.due_date ?? null) as string | null;
      const ok = date === e.date && (e.date_end === undefined || (d.date_end ?? null) === e.date_end);
      if (ok) {
        right++;
        if (e.date_confirm && got.flags.includes("date_ambiguous")) flaggedRight++;
      } else if (date === null && e.date !== null) {
        lost.push({ id: run.fixture.id, detail: `"${e.evidence}": no date kept (${got.kind}, rule ${got.date_rule}), want ${e.date}` });
      } else if (!got.flags.includes("date_ambiguous") && (got.tier === "auto" || got.tier === "confirm")) {
        silentWrong.push({ id: run.fixture.id, detail: `"${e.evidence}": ${date}${d.date_end ? `–${d.date_end}` : ""} (rule ${got.date_rule}), want ${e.date}${e.date_end ? `–${e.date_end}` : ""}` });
      }
    }
  }
  return { right, flaggedRight, silentWrong, lost, total };
}

/** Merge outcomes against the expected action. */
export function mergeBreakdown(runs: FixtureRun[]): Record<string, number> & { rows: string[] } {
  const c: Record<string, number> = {};
  const rows: string[] = [];
  const inc = (k: string) => (c[k] = (c[k] ?? 0) + 1);
  for (const run of runs) {
    if (!run.outcome) continue;
    const note = run.input.capture.raw_text;
    for (const e of run.fixture.expect.items as ExpectedItem[]) {
      if (!e.action) continue;
      const loc = locateEvidence(note, e.evidence);
      if (!loc.ok) continue;
      const got: PlannedItem | undefined = run.outcome.items.find((it) => it.spans.some((s) => s.start < loc.span.end && loc.span.start < s.end));
      const want = asList(e.action);
      const gotA = got ? `${got.action.type}${got.action.target_id ? `:${got.action.target_id.replace(/^id-/, "")}` : ""}` : "missing";
      if (want.includes(gotA)) {
        inc(`correct ${got!.action.type}`);
        continue;
      }
      const wantType = want[0].split(":")[0];
      if (!got) inc("item missing");
      else if (got.action.type === "merge") inc("false merge");
      else if (got.action.type === "supersede") inc("false supersede");
      else if (got.action.type === "resolves") inc("false resolve");
      else inc(`missed ${wantType}`);
      rows.push(`\`${run.fixture.id}\` "${e.evidence}": ${gotA}, want ${want.join(" or ")}`);
    }
  }
  return Object.assign(c, { rows });
}
