// Side-by-side model comparison from saved eval results (no model calls).
//   deno run -A --config evals/deno.json evals/extraction/compare.ts evals/results/a.json evals/results/b.json …

interface Saved {
  meta: { model: string; effort: string | null; Fixtures: string; Run: string };
  metrics: { key: string; label: string; display: string; threshold: string; pass: boolean | null }[];
  stats: { p50: number | null; p95: number | null; costPerCall: number; totalCost: number; calls: number; outcomes: Record<string, number> } | null;
}

const files = Deno.args;
if (files.length === 0) throw new Error("pass one or more results .json files");
const runs: Saved[] = [];
for (const f of files) runs.push(JSON.parse(await Deno.readTextFile(f)));

const head = runs.map((r) => `${r.meta.model}${r.meta.effort ? ` (${r.meta.effort})` : ""}`);
const out: string[] = ["| Metric | Threshold | " + head.join(" | ") + " |", "|---|---|" + head.map(() => "---|").join("")];
for (const m of runs[0].metrics) {
  const cells = runs.map((r) => {
    const x = r.metrics.find((y) => y.key === m.key);
    if (!x) return "—";
    return x.pass === false ? `**${x.display}** ✗` : x.display;
  });
  out.push(`| ${m.label} | ${m.threshold} | ${cells.join(" | ")} |`);
}
const stat = (f: (s: NonNullable<Saved["stats"]>) => string) => runs.map((r) => (r.stats ? f(r.stats) : "—")).join(" | ");
out.push(`| Latency p50 / p95 | p50 3 s, p95 7 s | ${stat((s) => `${((s.p50 ?? 0) / 1000).toFixed(1)} s / ${((s.p95 ?? 0) / 1000).toFixed(1)} s`)} |`);
out.push(`| Cost per call (list) | ≤ $0.03 | ${stat((s) => `$${s.costPerCall.toFixed(4)}`)} |`);
out.push(`| Cost of this run | — | ${stat((s) => `$${s.totalCost.toFixed(2)}`)} |`);
out.push(`| Call outcomes | — | ${stat((s) => Object.entries(s.outcomes).map(([k, v]) => `${k} ${v}`).join(", "))} |`);
out.push(`| Thresholds missed | 0 | ${runs.map((r) => String(r.metrics.filter((x) => x.pass === false).length)).join(" | ")} |`);
console.log(out.join("\n"));
