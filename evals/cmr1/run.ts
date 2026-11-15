// CMR-1 (Core Memory Reliability) eval runner: natural narratives with per-fact ledgers through the
// real extraction entry points, graded per split (dev, held-out) and per mode, never as one blended
// pass rate.
//
//   deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle
//       Perfect proposals built from the ledgers, through the real planExtraction (free). Proves the
//       deterministic code honours the ledger; what fails here is a pipeline finding on this commit.
//   deno run -A --config evals/deno.json evals/cmr1/run.ts --mode oracle --realistic
//       The same, with each fact's recorded live-model shape where the ledger has one (free).
//   ANTHROPIC_API_KEY=… deno run -A --config evals/deno.json evals/cmr1/run.ts --mode live --split dev --repeat 3
//       The real prompt, the live model (runExtraction, passages and all) and the pipeline. Costs money.
//       Raw outputs are saved under evals/results/cmr1/ for replay.
//   deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json[.gz]
//       Re-grades saved model outputs through the current pipeline (free). CI runs this for baselines.
//
// Options: --split dev|heldout|all (default all)  --categories a,b  --ids a,b  --limit N
//          --model <id> --effort low|medium|high|none   (passthrough, as evals/extraction/run.ts)
//          --repeat N (live; default 1; release-candidate runs use 3)  --concurrency N  --out <dir>  --tag <label>
//          --require-frozen   refuse unless the whole corpus matches MANIFEST.json
//          --refreeze <why>   the held-out set changed on purpose: rewrite MANIFEST.json, then run

import { parseArgs } from "jsr:@std/cli@1/parse-args";
import type { StructuredResult } from "../../supabase/functions/_shared/ai/model.ts";
import { CAPABILITIES } from "../../supabase/functions/_shared/ai/registry.ts";
import { runExtraction } from "../../supabase/functions/_shared/extraction/run.ts";
import { planExtraction } from "../../supabase/functions/_shared/extraction/pipeline.ts";
import type { ExtractionOutcome, ModelProposal, PlannedItem } from "../../supabase/functions/_shared/extraction/types.ts";
import { callerFor } from "../extraction/lib/callers.ts";
import { readResults } from "../extraction/lib/results.ts";
import { advance, CATEGORIES, freshState, loadCorpus, loadRosters, locateFact, type Narrative, stepInput, validateCorpus } from "./lib/corpus.ts";
import { oracleProposal } from "./lib/oracle.ts";
import { grade, type Metric, type StepRun, type Verdict } from "./lib/grade.ts";
import { callsMarkdown, callStats, failures, judge, type MetricResult, pct, table, type Threshold } from "./lib/report.ts";
import { buildManifest, readManifest, writeManifest } from "./manifest.ts";

const DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const VERSION_FALLBACK = "cmr1-v1";

const args = parseArgs(Deno.args, {
  string: ["mode", "split", "categories", "ids", "limit", "model", "effort", "repeat", "concurrency", "out", "tag", "replay", "refreeze"],
  boolean: ["realistic", "require-frozen"],
  default: { mode: "oracle", split: "all", repeat: "1", concurrency: "4", out: `${DIR}/../results/cmr1` },
});

const mode = args.mode as "oracle" | "live" | "replay";
if (!["oracle", "live", "replay"].includes(mode)) throw new Error(`unknown mode ${mode}`);
const split = args.split as "dev" | "heldout" | "all";
if (!["dev", "heldout", "all"].includes(split)) throw new Error(`--split must be dev, heldout or all`);
const cap = CAPABILITIES.relationship_extract;
const model = args.model ?? cap.model;
const effort = args.effort === "none" ? null : (args.effort ?? cap.effort) as typeof cap.effort;
const repeat = Math.max(1, Number(args.repeat));

// ── Corpus, validated, against the frozen manifest ──
const rosters = await loadRosters(DIR);
const all = await loadCorpus(DIR, args.categories ? args.categories.split(",") : CATEGORIES);
const problems = validateCorpus(all, rosters);
if (problems.length) {
  console.error(`the corpus has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  Deno.exit(2);
}
const frozen = await readManifest();
const full = await loadCorpus(DIR);
const now = await buildManifest(frozen?.version ?? VERSION_FALLBACK, full);
if (args.refreeze) {
  await writeManifest(now);
  console.error(`re-froze the corpus (${now.heldout.ids.length} held out): ${args.refreeze}`);
} else if (frozen && frozen.heldout.sha256 !== now.heldout.sha256) {
  const was = new Set(frozen.heldout.ids);
  const is = new Set(now.heldout.ids);
  const added = now.heldout.ids.filter((i) => !was.has(i));
  const removed = frozen.heldout.ids.filter((i) => !is.has(i));
  throw new Error(
    `the held-out set differs from MANIFEST.json (${added.length} added: ${added.join(",") || "none"}; ${removed.length} removed: ${removed.join(",") || "none"}; the rest changed in place). ` +
      `Held-out cases are frozen so their numbers always refer to the same narratives. Pass --refreeze "<why>" to freeze the new set deliberately.`,
  );
} else if (!frozen && mode !== "oracle") {
  throw new Error("no MANIFEST.json: freeze the corpus first (manifest.ts --write <version>)");
}
const isFrozen = !!frozen && frozen.corpus_sha256 === now.corpus_sha256;
if (args["require-frozen"] && !isFrozen) throw new Error("the corpus differs from MANIFEST.json; refusing a paid run on an unfrozen corpus");

let corpus = split === "all" ? all : all.filter((n) => n.split === split);
if (args.ids) {
  const ids = new Set(args.ids.split(","));
  corpus = corpus.filter((n) => ids.has(n.id));
}
if (args.limit) corpus = corpus.slice(0, Number(args.limit));

// ── Run every narrative, step by step, carrying the kept lines forward as the next step's memory ──
interface Saved {
  id: string;
  step: number;
  repeat: number;
  call: StructuredResult | null;
  proposal: unknown;
  latencyMs?: number;
}

const runs: StepRun[] = [];

/** One narrative, all its steps, in one repeat. `propose` gets the proposal for a step (model or oracle). */
async function runNarrative(
  n: Narrative,
  rep: number,
  propose: (n: Narrative, step: number, input: ReturnType<typeof stepInput>, state: ReturnType<typeof freshState>) => Promise<{ proposal: ModelProposal | null; outcome?: ExtractionOutcome | null; call: StructuredResult | null; factOfIndex?: string[]; latencyMs?: number }>,
): Promise<void> {
  let state = freshState();
  for (let s = 0; s < n.steps.length; s++) {
    const input = stepInput(n, s, rosters, state);
    const got = await propose(n, s, input, state);
    let outcome: ExtractionOutcome | null = got.outcome ?? null;
    let crashed: string | undefined;
    if (outcome === null && got.proposal && Array.isArray(got.proposal.items)) {
      try {
        outcome = planExtraction(input, got.proposal);
      } catch (err) {
        crashed = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      }
    }
    runs.push({ narrative: n, step: s, repeat: rep, input, outcome, call: got.call, proposal: got.proposal, crashed, latencyMs: got.latencyMs });
    // Which fact a kept line answers, so a later step's merge or supersede can name it.
    const spansOf = n.facts.filter((f) => f.step === s).map((f) => ({ f, span: locateFact(n, f) }));
    const factOf = (it: PlannedItem): string | null =>
      spansOf.find(({ f, span }) => f.kind.includes(it.kind) && it.spans.some((x) => x.start < span.end && span.start < x.end))?.f.id ??
        spansOf.find(({ span }) => it.spans.some((x) => x.start < span.end && span.start < x.end))?.f.id ?? null;
    state = advance(n, s, outcome, state, factOf);
  }
}

if (mode === "oracle") {
  for (const n of corpus) {
    await runNarrative(n, 0, (n, s, input, state) => {
      const { proposal } = oracleProposal(n, s, rosters, input, state, { realistic: args.realistic });
      return Promise.resolve({ proposal, call: null });
    });
  }
} else if (mode === "replay") {
  if (!args.replay) throw new Error("--replay <results.json[.gz]> is required");
  const saved = await readResults<{ runs: Saved[] }>(args.replay);
  const byKey = new Map(saved.runs.map((r) => [`${r.id}#${r.step}@${r.repeat}`, r]));
  const reps = new Set(saved.runs.map((r) => r.repeat));
  for (const n of corpus) {
    for (const rep of [...reps].sort()) {
      if (!byKey.has(`${n.id}#0@${rep}`)) continue;
      await runNarrative(n, rep, (n, s) => {
        const r = byKey.get(`${n.id}#${s}@${rep}`);
        const p = r?.proposal as ModelProposal | null | undefined;
        return Promise.resolve({ proposal: p && Array.isArray(p.items) ? p : null, call: r?.call ?? null, latencyMs: r?.latencyMs });
      });
    }
  }
} else {
  const call = callerFor(model);
  const queue: { n: Narrative; rep: number }[] = [];
  for (let i = 0; i < repeat; i++) for (const n of corpus) queue.push({ n, rep: i });
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const { n, rep } = queue.shift()!;
      await runNarrative(n, rep, async (_n, _s, input) => {
        const started = performance.now();
        const r = await runExtraction(input, cap, call, { model, effort });
        return { proposal: r.proposal, outcome: r.outcome, call: r.call, latencyMs: Math.round(performance.now() - started) };
      });
      done++;
      if (done % 10 === 0) console.error(`  ${done}/${queue.length + done}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(args.concurrency)) }, worker));
  const order = new Map(corpus.map((n, i) => [n.id, i]));
  runs.sort((a, b) => (order.get(a.narrative.id)! - order.get(b.narrative.id)!) || a.repeat - b.repeat || a.step - b.step);
}

// ── Grade: per split, never blended ──
const thresholds = JSON.parse(await Deno.readTextFile(`${DIR}/thresholds.json`)) as Record<string, Threshold>;
const splits = (["dev", "heldout"] as const).filter((s) => runs.some((r) => r.narrative.split === s));
const graded: Record<string, { metrics: MetricResult[]; verdicts: Verdict[]; stats: ReturnType<typeof callStats> | null }> = {};
for (const s of splits) {
  const rs = runs.filter((r) => r.narrative.split === s);
  const { metrics, verdicts } = grade(rs, rosters);
  graded[s] = { metrics: judge(metrics, thresholds), verdicts, stats: mode === "oracle" ? null : callStats(rs, model) };
}
const byCategory: Record<string, Record<string, MetricResult>> = {};
for (const c of CATEGORIES) {
  const rs = runs.filter((r) => r.narrative.category === c);
  if (!rs.length) continue;
  byCategory[c] = Object.fromEntries(judge(grade(rs, rosters).metrics, thresholds).map((m) => [m.key, { ...m, failures: [] }]));
}
const bySource: Record<string, Record<string, MetricResult>> = {};
for (const src of ["typed", "voice"] as const) {
  const rs = runs.filter((r) => r.narrative.source === src);
  if (!rs.length) continue;
  bySource[src] = Object.fromEntries(judge(grade(rs, rosters).metrics, thresholds).map((m) => [m.key, { ...m, failures: [] }]));
}

// Repeat stability (live/replay with --repeat): facts whose verdict differs between repeats.
const unstable: string[] = [];
if (repeat > 1 || new Set(runs.map((r) => r.repeat)).size > 1) {
  const byFact = new Map<string, Set<string>>();
  for (const s of splits) {
    for (const v of graded[s].verdicts) {
      const k = `${v.narrative}#${v.step}/${v.fact}`;
      byFact.set(k, (byFact.get(k) ?? new Set()).add(`${v.observed}:${v.pass}`));
    }
  }
  for (const [k, set] of byFact) if (set.size > 1) unstable.push(`${k} (${[...set].join(" / ")})`);
}

// ── Report ──
const label = `${mode === "oracle" ? (args.realistic ? "oracle-realistic" : "oracle") : `${model}${effort ? `-${effort}` : ""}`}-${split}`;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const counts = Object.fromEntries(CATEGORIES.map((c) => [c, corpus.filter((n) => n.category === c).length]).filter(([, v]) => v));
const meta: Record<string, string> = {
  Mode: mode + (args.realistic ? " (realistic shapes)" : ""),
  Model: mode === "oracle" ? "none (perfect proposals from the ledgers through the real pipeline)" : `${model}${effort ? `, effort ${effort}` : ""}`,
  "Prompt version": cap.promptVersion,
  Split: split,
  Narratives: `${corpus.length} (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}); ${runs.length} Tells graded${repeat > 1 ? ` (× ${repeat} repeats)` : ""}`,
  Run: stamp,
  Commit: Deno.env.get("EVAL_COMMIT") ?? Deno.env.get("GITHUB_SHA") ?? (await gitHead()),
  Corpus: `${now.version}: ${now.total} narratives, ${now.heldout.ids.length} held out, sha256 ${now.corpus_sha256.slice(0, 16)}…${isFrozen ? " (matches MANIFEST.json)" : " (NOT the frozen manifest)"}`,
};
const md: string[] = [`# CMR-1 eval — ${label}${args.tag ? ` (${args.tag})` : ""}`, ""];
for (const [k, v] of Object.entries(meta)) md.push(`- **${k}:** ${v}`);
for (const s of splits) {
  md.push("", `## ${s === "dev" ? "Dev split" : "Held-out split"}`, "");
  md.push(...table(graded[s].metrics));
  if (graded[s].stats) md.push("", `### Calls (${s})`, "", ...callsMarkdown(graded[s].stats!));
}
const keyMetrics = ["fact_recall", "fact_precision", "silent_loss", "wrong_person", "unnecessary_clarification", "correct_clarification", "fabricated_identity", "grounding_violations", "duplicate_memories", "eligibility_errors"];
md.push("", "## By category", "", "| Metric | " + Object.keys(byCategory).join(" | ") + " |", "|---|" + Object.keys(byCategory).map(() => "---|").join(""));
for (const key of keyMetrics) {
  const row = Object.values(byCategory).map((ms) => {
    const x = ms[key];
    return x ? (x.pass === false ? `**${x.display}** ✗` : x.display) : "—";
  });
  md.push(`| ${key} | ${row.join(" | ")} |`);
}
md.push("", "## By source (typed vs voice-style)", "", "| Metric | " + Object.keys(bySource).join(" | ") + " |", "|---|" + Object.keys(bySource).map(() => "---|").join(""));
for (const key of keyMetrics) {
  md.push(`| ${key} | ${Object.values(bySource).map((ms) => ms[key] ? (ms[key].pass === false ? `**${ms[key].display}** ✗` : ms[key].display) : "—").join(" | ")} |`);
}
if (unstable.length) {
  md.push("", `## Unstable across repeats (${unstable.length})`, "");
  for (const u of unstable.slice(0, 40)) md.push(`- ${u}`);
}
for (const s of splits) {
  const f = failures(graded[s].metrics);
  if (f.length) md.push("", `## Failures (${s})`, "", ...f);
}
console.log(md.join("\n"));

if (mode !== "replay" || args.tag) {
  await Deno.mkdir(args.out, { recursive: true });
  const base = `${args.out}/${stamp}-${label}${args.tag ? `-${args.tag}` : ""}`;
  await Deno.writeTextFile(`${base}.md`, md.join("\n"));
  await Deno.writeTextFile(`${base}.json`, JSON.stringify({
    meta: { ...meta, model, effort, mode, split, repeat, realistic: !!args.realistic },
    splits: Object.fromEntries(splits.map((s) => [s, {
      metrics: graded[s].metrics.map(({ failures, ...r }) => ({ ...r, failures: failures.slice(0, 300) })),
      stats: graded[s].stats,
      verdicts: graded[s].verdicts,
    }])),
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([c, ms]) => [c, Object.fromEntries(Object.entries(ms).map(([k, m]) => [k, { display: m.display, value: m.value, pass: m.pass }]))])),
    bySource: Object.fromEntries(Object.entries(bySource).map(([c, ms]) => [c, Object.fromEntries(Object.entries(ms).map(([k, m]) => [k, { display: m.display, value: m.value, pass: m.pass }]))])),
    unstable,
    corpus: now,
    runs: runs.map((r): Saved & { outcome: ExtractionOutcome | null; crashed?: string } => ({
      id: r.narrative.id, step: r.step, repeat: r.repeat, call: r.call, proposal: r.proposal, latencyMs: r.latencyMs, outcome: r.outcome, crashed: r.crashed,
    })),
  }, null, 1));
  console.error(`wrote ${base}.md and .json`);
}

const failed = splits.flatMap((s) => graded[s].metrics.filter((r) => r.pass === false && !r.informational).map((r) => `${s}:${r.key}`));
if (failed.length) {
  console.error(`below target: ${failed.join(", ")}`);
  Deno.exitCode = 1;
}

async function gitHead(): Promise<string> {
  try {
    const p = new Deno.Command("git", { args: ["rev-parse", "HEAD"], stdout: "piped", stderr: "null" });
    const out = await p.output();
    return out.success ? new TextDecoder().decode(out.stdout).trim() : "local";
  } catch {
    return "local";
  }
}

export type { Metric };
export { pct };
