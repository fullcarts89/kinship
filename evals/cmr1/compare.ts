// Baseline vs candidate from two saved CMR-1 result files (.json or .json.gz), no model calls.
//   deno run -A --config evals/deno.json evals/cmr1/compare.ts <baseline.json[.gz]> <candidate.json[.gz]>
// Prints every metric per split side by side with its delta, the facts whose verdict changed, and the
// end-to-end latency with its change. Exits 1 when the candidate regresses: a gated metric that passed
// and now fails, a gated metric that got worse, or p50/p95 more than `latency_regression` above the baseline.

import { readResults } from "../extraction/lib/results.ts";
import type { Verdict } from "./lib/grade.ts";
import type { MetricResult, Threshold } from "./lib/report.ts";

interface Saved {
  meta: Record<string, string | number | boolean | null>;
  splits: Record<string, { metrics: MetricResult[]; stats: { p50: number | null; p95: number | null; totalCost: number; tells: number } | null; verdicts: Verdict[] }>;
}

const DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const [a, b] = Deno.args;
if (!a || !b) throw new Error("pass a baseline and a candidate results file");
const base = await readResults<Saved>(a);
const cand = await readResults<Saved>(b);
const thresholds = JSON.parse(await Deno.readTextFile(`${DIR}/thresholds.json`)) as Record<string, Threshold>;
const latencyMax = thresholds.latency_regression?.max ?? 0.25;

const out: string[] = [];
out.push(`Baseline: ${base.meta.Mode} · ${base.meta.Model} · ${base.meta.Commit} · ${base.meta.Run}`);
out.push(`Candidate: ${cand.meta.Mode} · ${cand.meta.Model} · ${cand.meta.Commit} · ${cand.meta.Run}`);
let regressions = 0;

/** Lower is better for counts and bad-rates; higher for the rest. */
function better(m: MetricResult, from: number | null, to: number | null): "better" | "worse" | "same" | "n/a" {
  if (from === null || to === null) return "n/a";
  if (Math.abs(from - to) < 1e-9) return "same";
  // More omissions reported as not understood (told again, never lost) is better (founder item 2).
  const lowerIsBetter = (m.type === "count" && m.key !== "omitted_recoverable") || m.key === "unnecessary_clarification";
  return (to < from) === lowerIsBetter ? "better" : "worse";
}

for (const split of Object.keys(cand.splits)) {
  const bs = base.splits[split];
  const cs = cand.splits[split];
  if (!bs) {
    out.push("", `## ${split}: not in the baseline`);
    continue;
  }
  out.push("", `## ${split}`, "", "| Metric | Target | Baseline | Candidate | Change |", "|---|---|---|---|---|");
  for (const m of cs.metrics) {
    const x = bs.metrics.find((y) => y.key === m.key);
    const dir = x ? better(m, x.value, m.value) : "n/a";
    const flag = m.pass === false ? " ✗" : "";
    const baseFlag = x?.pass === false ? " ✗" : "";
    const change = dir === "same" ? "same" : dir === "n/a" ? "—" : dir === "better" ? "better" : "**worse**";
    out.push(`| ${m.label} | ${m.threshold} | ${x ? x.display + baseFlag : "—"} | ${m.display}${flag} | ${change} |`);
    if (!m.informational && x && ((x.pass !== false && m.pass === false) || dir === "worse")) regressions++;
  }
  if (bs.stats && cs.stats) {
    const row = (name: string, from: number | null, to: number | null) => {
      if (from === null || to === null) return `| ${name} | — | ${from ?? "—"} | ${to ?? "—"} | — |`;
      const ratio = to / Math.max(1, from) - 1;
      const bad = ratio > latencyMax;
      if (bad) regressions++;
      return `| ${name} | ≤ +${Math.round(latencyMax * 100)}% | ${from} ms | ${to} ms | ${ratio >= 0 ? "+" : ""}${(ratio * 100).toFixed(0)}%${bad ? " **regression**" : ""} |`;
    };
    out.push(row("Latency p50 (end to end)", bs.stats.p50, cs.stats.p50));
    out.push(row("Latency p95 (end to end)", bs.stats.p95, cs.stats.p95));
    out.push(`| Cost of the run | — | $${bs.stats.totalCost.toFixed(2)} | $${cs.stats.totalCost.toFixed(2)} | — |`);
  }
  // Facts whose verdict changed.
  const key = (v: Verdict) => `${v.narrative}#${v.step}@${v.repeat}/${v.fact}`;
  const before = new Map(bs.verdicts.map((v) => [key(v), v]));
  const fixed: string[] = [];
  const broken: string[] = [];
  const moved: string[] = [];
  for (const v of cs.verdicts) {
    const w = before.get(key(v));
    if (!w) continue;
    if (w.pass && !v.pass) broken.push(`${key(v)}: ${w.observed} → ${v.observed}${v.clarification ? ` (${v.clarification})` : ""} as ${v.person}`);
    else if (!w.pass && v.pass) fixed.push(`${key(v)}: ${w.observed} → ${v.observed}`);
    else if (w.observed !== v.observed || w.person !== v.person) moved.push(`${key(v)}: ${w.observed}/${w.person} → ${v.observed}/${v.person}`);
  }
  if (broken.length) out.push("", `### ${split}: facts that now fail (${broken.length})`, "", ...broken.slice(0, 60).map((x) => `- ${x}`));
  if (fixed.length) out.push("", `### ${split}: facts that now pass (${fixed.length})`, "", ...fixed.slice(0, 60).map((x) => `- ${x}`));
  if (moved.length) out.push("", `### ${split}: facts that changed without changing verdict (${moved.length})`, "", ...moved.slice(0, 40).map((x) => `- ${x}`));
}
out.push("", regressions ? `**${regressions} regression(s).**` : "No regressions.");
console.log(out.join("\n"));
if (regressions) Deno.exitCode = 1;
