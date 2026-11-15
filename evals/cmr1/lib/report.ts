// Thresholds, call statistics and the markdown report for a CMR-1 run.

import { costUsd } from "../../../supabase/functions/_shared/ai/registry.ts";
import type { Metric, StepRun } from "./grade.ts";

export interface Threshold {
  min?: number;
  max?: number;
  /** For a rate of bad cases ("unnecessary clarification ≤ 2%"). */
  max_rate?: number;
  note?: string;
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
    if (t.max_rate !== undefined) {
      const bad = 1 - rate;
      return { ...m, value: bad, display: `${pct(bad)} (${m.den - m.num}/${m.den})`, threshold: `≤ ${pct(t.max_rate)}`, pass: bad <= t.max_rate + 1e-12 };
    }
    const pass = t.min === undefined ? null : rate >= t.min - 1e-12;
    return { ...m, value: rate, display: `${pct(rate)} (${m.num}/${m.den})`, threshold: describe(t), pass };
  });
}

function describe(t: Threshold): string {
  if (t.min !== undefined) return `≥ ${pct(t.min)}`;
  if (t.max_rate !== undefined) return `≤ ${pct(t.max_rate)}`;
  if (t.max !== undefined) return `≤ ${t.max}`;
  return "—";
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(x === 1 || x === 0 ? 0 : 1)}%`;
}

export interface CallStats {
  tells: number;
  outcomes: Record<string, number>;
  /** End-to-end latency of one Tell's understanding (every passage), successful ones. */
  p50: number | null;
  p95: number | null;
  max: number | null;
  totals: { input: number; output: number; cacheRead: number; cacheWrite: number };
  totalCost: number;
  costPerTell: number;
}

export function callStats(runs: StepRun[], model: string): CallStats {
  const calls = runs.filter((r) => r.call);
  const outcomes: Record<string, number> = {};
  for (const r of calls) outcomes[r.call!.outcome] = (outcomes[r.call!.outcome] ?? 0) + 1;
  const lat = calls.filter((r) => r.call!.outcome === "ok").map((r) => r.latencyMs ?? r.call!.latencyMs).sort((a, b) => a - b);
  const q = (p: number) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : null);
  const sum = (f: (r: StepRun) => number) => calls.reduce((a, r) => a + f(r), 0);
  const total = sum((r) => costUsd(model, r.call!.usage) || 0);
  return {
    tells: calls.length,
    outcomes,
    p50: q(0.5),
    p95: q(0.95),
    max: lat.length ? lat[lat.length - 1] : null,
    totals: {
      input: sum((r) => r.call!.usage.input),
      output: sum((r) => r.call!.usage.output),
      cacheRead: sum((r) => r.call!.usage.cacheRead),
      cacheWrite: sum((r) => r.call!.usage.cacheWrite),
    },
    totalCost: total,
    costPerTell: total / Math.max(1, calls.length),
  };
}

export function table(results: MetricResult[]): string[] {
  const out = ["| Metric | Result | Target | |", "|---|---|---|---|"];
  for (const r of results) {
    const verdict = r.informational ? "info" : r.pass === null ? "—" : r.pass ? "PASS" : "**FAIL**";
    out.push(`| ${r.label} | ${r.display} | ${r.threshold} | ${verdict} |`);
  }
  return out;
}

export function failures(results: MetricResult[], max = 15): string[] {
  const out: string[] = [];
  const failing = results.filter((r) => r.failures.length > 0);
  if (!failing.length) return out;
  for (const r of failing) {
    out.push(`### ${r.label} (${r.failures.length})`, "");
    for (const f of r.failures.slice(0, max)) out.push(`- \`${f.id}\` ${f.detail}`);
    if (r.failures.length > max) out.push(`- … ${r.failures.length - max} more in the JSON results`);
    out.push("");
  }
  return out;
}

export function callsMarkdown(stats: CallStats): string[] {
  return [
    `- Tells understood: ${stats.tells} · call outcomes ${JSON.stringify(stats.outcomes)}`,
    `- End-to-end latency (successful Tells, every passage): p50 ${stats.p50 ?? "—"} ms · p95 ${stats.p95 ?? "—"} ms · max ${stats.max ?? "—"} ms`,
    `- Tokens in total: input ${stats.totals.input} · output ${stats.totals.output} · cache read ${stats.totals.cacheRead} · cache write ${stats.totals.cacheWrite}`,
    `- Cost: $${stats.costPerTell.toFixed(4)} per Tell · $${stats.totalCost.toFixed(2)} total (list prices)`,
  ];
}
