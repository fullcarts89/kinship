// Turns graded metrics and call stats into the per-metric report.

import { costUsd } from "../../../supabase/functions/_shared/ai/registry.ts";
import type { FixtureRun, Metric } from "./grade.ts";

export interface Threshold {
  min?: number;
  max?: number;
  max_error?: number;
}

export interface MetricResult extends Metric {
  value: number | null;
  display: string;
  threshold: string;
  pass: boolean | null;
}

export function judge(metrics: Metric[], thresholds: Record<string, Threshold>): MetricResult[] {
  return metrics.map((m) => {
    const t = thresholds[m.key] ?? {};
    if (m.type === "count") {
      const pass = t.max === undefined ? null : m.num <= t.max;
      return { ...m, value: m.num, display: String(m.num), threshold: t.max === undefined ? "—" : `≤ ${t.max}`, pass };
    }
    if (m.den === 0) return { ...m, value: null, display: "n/a (no cases)", threshold: describe(t), pass: null };
    const rate = m.num / m.den;
    if (t.max_error !== undefined) {
      const err = 1 - rate;
      return { ...m, value: err, display: `${pct(err)} error (${m.den - m.num}/${m.den})`, threshold: `≤ ${pct(t.max_error)} error`, pass: err <= t.max_error + 1e-12 };
    }
    const pass = t.min === undefined ? null : rate >= t.min - 1e-12;
    return { ...m, value: rate, display: `${pct(rate)} (${m.num}/${m.den})`, threshold: describe(t), pass };
  });
}

function describe(t: Threshold): string {
  if (t.min !== undefined) return `≥ ${pct(t.min)}`;
  if (t.max_error !== undefined) return `≤ ${pct(t.max_error)} error`;
  if (t.max !== undefined) return `≤ ${t.max}`;
  return "—";
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(x === 1 || x === 0 ? 0 : 1)}%`;
}

export interface CallStats {
  calls: number;
  outcomes: Record<string, number>;
  p50: number | null;
  p95: number | null;
  meanInput: number;
  meanOutput: number;
  meanCacheRead: number;
  costPerCall: number;
  totalCost: number;
}

export function callStats(runs: FixtureRun[], model: string): CallStats {
  const calls = runs.filter((r) => r.call);
  const outcomes: Record<string, number> = {};
  for (const r of calls) outcomes[r.call!.outcome] = (outcomes[r.call!.outcome] ?? 0) + 1;
  const lat = calls.filter((r) => r.call!.outcome === "ok").map((r) => r.call!.latencyMs).sort((a, b) => a - b);
  const q = (p: number) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : null);
  const sum = (f: (r: FixtureRun) => number) => calls.reduce((a, r) => a + f(r), 0);
  const total = sum((r) => costUsd(model, r.call!.usage) || 0);
  const n = Math.max(1, calls.length);
  return {
    calls: calls.length,
    outcomes,
    p50: q(0.5),
    p95: q(0.95),
    meanInput: Math.round(sum((r) => r.call!.usage.input) / n),
    meanOutput: Math.round(sum((r) => r.call!.usage.output) / n),
    meanCacheRead: Math.round(sum((r) => r.call!.usage.cacheRead) / n),
    costPerCall: total / n,
    totalCost: total,
  };
}

export function markdown(title: string, results: MetricResult[], stats: CallStats | null, meta: Record<string, string>, maxFailures = 12): string {
  const out: string[] = [`# ${title}`, ""];
  for (const [k, v] of Object.entries(meta)) out.push(`- **${k}:** ${v}`);
  out.push("", "| Metric | Result | Threshold | |", "|---|---|---|---|");
  for (const r of results) {
    out.push(`| ${r.label} | ${r.display} | ${r.threshold} | ${r.pass === null ? "—" : r.pass ? "PASS" : "**FAIL**"} |`);
  }
  if (stats) {
    out.push("", "## Calls", "");
    out.push(`- Calls: ${stats.calls} · outcomes ${JSON.stringify(stats.outcomes)}`);
    out.push(`- Latency (successful calls): p50 ${stats.p50 ?? "—"} ms · p95 ${stats.p95 ?? "—"} ms`);
    out.push(`- Tokens per call (mean): input ${stats.meanInput} · cached input read ${stats.meanCacheRead} · output ${stats.meanOutput}`);
    out.push(`- Cost: $${stats.costPerCall.toFixed(4)} per call · $${stats.totalCost.toFixed(2)} total (list prices)`);
  }
  const failing = results.filter((r) => r.failures.length > 0);
  if (failing.length) {
    out.push("", "## Failures", "");
    for (const r of failing) {
      out.push(`### ${r.label} (${r.failures.length})`, "");
      for (const f of r.failures.slice(0, maxFailures)) out.push(`- \`${f.id}\` ${f.detail}`);
      if (r.failures.length > maxFailures) out.push(`- … ${r.failures.length - maxFailures} more in the JSON results`);
      out.push("");
    }
  }
  return out.join("\n");
}
