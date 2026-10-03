// Per-fixture report for small runs (the live smoke set): what the model
// proposed, what the deterministic pipeline did with it, and whether the
// fixture passed. Model errors that the pipeline caught are listed, not
// hidden: "the model was right" and "the model was wrong but Kinship caught
// it" are different results.

import type { FixtureRun } from "./grade.ts";
import type { MetricResult } from "./report.ts";
import type { ModelProposal, PlannedItem } from "../../../supabase/functions/_shared/extraction/types.ts";
import { fixtureKey } from "./fixture.ts";

export interface SmokeCase {
  id: string;
  category: string;
  why: string;
}

/** Flags that mean a guard changed or contradicted the model's proposal. */
const GUARD_FLAGS = new Set(["certainty_lowered", "sensitivity_raised", "person_disagreement", "protected_target", "subject_check"]);

export interface FixtureVerdict {
  id: string;
  category: string;
  pass: boolean;
  failures: string[];
  /** Drop reasons and guard flags: places where code overrode the model. */
  interventions: string[];
  tier: string;
}

export function verdicts(runs: FixtureRun[], results: MetricResult[], cases: SmokeCase[]): FixtureVerdict[] {
  const gated = results.filter((r) => r.pass !== null);
  return runs.map((run) => {
    const id = run.fixture.id;
    const failures = gated.flatMap((r) => r.failures.filter((f) => f.id === id).map((f) => `${r.key}: ${f.detail}`));
    const o = run.outcome;
    const interventions = o
      ? [
        ...o.dropped.map((d) => `dropped ${d.kind ?? "item"} (${d.reason})`),
        ...o.items.flatMap((i) => i.flags.filter((f) => GUARD_FLAGS.has(f)).map((f) => `${f} on "${i.statement}"`)),
        ...(o.injection_suspected ? ["injection_suspected"] : []),
      ]
      : [];
    return {
      id,
      category: cases.find((c) => c.id === id)?.category ?? run.fixture.set,
      pass: failures.length === 0,
      failures,
      interventions,
      tier: o ? (o.items.length === 0 && o.dropped.length > 0 && o.tier === "nothing" ? "dropped" : o.tier) : `no outcome (${run.call?.outcome ?? "none"})`,
    };
  });
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function proposedLine(p: ModelProposal["items"][number], run: FixtureRun): string {
  const who = p.person === "new" ? `new:${p.person_mention ?? "?"}` : run.input.roster.find((r) => r.key === p.person)?.display_name ?? p.person;
  const bits = [
    `${p.kind}`,
    `${who}/${p.subject}${p.related_relation ? `(${p.related_relation})` : ""}`,
    p.certainty,
    p.sensitivity,
    p.date_text ? `date "${p.date_text}" ${p.date_direction}` : null,
    p.existing?.action && p.existing.action !== "new" ? `${p.existing.action}:${p.existing.target}` : null,
    p.detail?.event_type ? `type ${p.detail.event_type}` : null,
    p.detail?.event_goal ? `goal "${p.detail.event_goal}"` : null,
    `conf ${p.confidence}`,
  ].filter(Boolean);
  return `"${p.statement}" [${bits.join(", ")}]`;
}

function plannedLine(i: PlannedItem): string {
  const d = i.detail as Record<string, unknown>;
  const date = d.date ? `${d.date}${d.date_end ? `–${d.date_end}` : ""}` : d.due_date ?? null;
  const bits = [
    i.tier.toUpperCase(),
    i.kind,
    `${fixtureKey(i.person_id, i.new_person_name)}/${i.subject_type}${i.related ? `(${i.related.relation})` : ""}`,
    i.certainty,
    i.sensitivity,
    date ? `date ${date}` : null,
    d.event_type ? `type ${d.event_type}` : null,
    d.event_goal ? `goal "${d.event_goal}"` : null,
    i.action.type !== "new" ? `${i.action.type}:${i.action.target_id}` : null,
    i.flags.length ? `flags ${i.flags.join("+")}` : null,
  ].filter(Boolean);
  return `"${i.statement}" [${bits.join(", ")}]`;
}

export function perFixtureMarkdown(runs: FixtureRun[], v: FixtureVerdict[], cases: SmokeCase[]): string {
  const out: string[] = ["## Per fixture", ""];
  const passed = v.filter((x) => x.pass).length;
  const rescued = v.filter((x) => x.interventions.some((s) => !s.startsWith("injection_suspected"))).length;
  out.push(`- Passed: ${passed}/${v.length} · fixtures where code overrode the model: ${rescued}`, "");
  out.push("| Fixture | Category | Final tier | Pass | Interventions |", "|---|---|---|---|---|");
  for (const x of v) out.push(`| \`${x.id}\` | ${x.category} | ${x.tier} | ${x.pass ? "PASS" : "**FAIL**"} | ${cell(x.interventions.join("; ") || "—")} |`);
  out.push("");
  for (const run of runs) {
    const x = v.find((y) => y.id === run.fixture.id)!;
    const c = cases.find((y) => y.id === run.fixture.id);
    out.push(`### \`${run.fixture.id}\` — ${x.pass ? "PASS" : "FAIL"}`, "");
    out.push(`- **Note:** ${run.fixture.note}`);
    if (c) out.push(`- **Expected:** ${c.why}`);
    const p = run.proposal as ModelProposal | null;
    if (!p) out.push(`- **Model:** no usable proposal (${run.call?.outcome ?? "none"})`);
    else {
      out.push(`- **Model proposed** (${p.items.length} item${p.items.length === 1 ? "" : "s"}${p.needs_clarification ? `, clarification ${p.needs_clarification.about}` : ""}):`);
      for (const it of p.items) out.push(`  - ${proposedLine(it, run)}`);
    }
    if (run.outcome) {
      out.push(`- **Final** (tier ${run.outcome.tier}):`);
      for (const it of run.outcome.items) out.push(`  - ${plannedLine(it)}`);
      if (run.outcome.items.length === 0) out.push("  - nothing saved");
      if (run.outcome.clarification) out.push(`  - question: "${run.outcome.clarification.question}" (${run.outcome.clarification.about})`);
    }
    if (x.interventions.length) out.push(`- **Interventions:** ${x.interventions.join("; ")}`);
    if (x.failures.length) out.push(`- **Failures:** ${x.failures.join("; ")}`);
    if (run.call) out.push(`- **Call:** ${run.call.outcome}, ${run.call.latencyMs} ms, in ${run.call.usage.input} / out ${run.call.usage.output} / cache read ${run.call.usage.cacheRead} / cache write ${run.call.usage.cacheWrite}`);
    out.push("");
  }
  return out.join("\n");
}
