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
//       The real prompt, the live model (runExtraction, passages and all) and the pipeline. Costs money;
//       the estimate is printed first (--dry-run prints only the estimate). Raw outputs are saved under
//       evals/results/cmr1/ for replay.
//   deno run -A --config evals/deno.json evals/cmr1/run.ts --mode replay --replay evals/results/cmr1/<run>.json[.gz]
//       Re-grades saved model outputs through the current pipeline (free). With --shared <dir>, through
//       another tree's supabase/functions/_shared (main's, say), so one paid run grades baseline and
//       candidate on identical model outputs.
//
// Options: --split dev|heldout|all (default all)  --categories a,b  --ids a,b  --limit N
//          --model <id> --effort low|medium|high|none   (passthrough, as evals/extraction/run.ts)
//          --repeat N (live; default 1; release-candidate runs use 3)  --concurrency N  --out <dir>  --tag <label>
//          --shared <dir>     the supabase/functions/_shared to run the pipeline from (default: this tree's)
//          --max-failures N   how many failing cases to list per informational metric (gated ones always list up to 100)
//          --dump-ids a,b     for these narrative ids, print the note, roster, the model's raw items and the pipeline's outcome
//          --dry-run          (live) print the call count and cost estimate, run nothing
//          --require-frozen   refuse unless the whole corpus matches MANIFEST.json
//          --refreeze <why>   the held-out set changed on purpose: rewrite MANIFEST.json, then run

import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { resolve, toFileUrl } from "jsr:@std/path@1";
import type { StructuredResult } from "../../supabase/functions/_shared/ai/model.ts";
import { costUsd } from "../../supabase/functions/_shared/ai/registry.ts";
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
  string: ["mode", "split", "categories", "ids", "limit", "model", "effort", "repeat", "concurrency", "out", "tag", "replay", "refreeze", "shared", "max-failures", "dump-ids"],
  boolean: ["realistic", "require-frozen", "dry-run"],
  default: { mode: "oracle", split: "all", repeat: "1", concurrency: "4", out: `${DIR}/../results/cmr1` },
});

const mode = args.mode as "oracle" | "live" | "replay";
if (!["oracle", "live", "replay"].includes(mode)) throw new Error(`unknown mode ${mode}`);
const split = args.split as "dev" | "heldout" | "all";
if (!["dev", "heldout", "all"].includes(split)) throw new Error(`--split must be dev, heldout or all`);

// ── The pipeline: this tree's supabase/functions/_shared, or another tree's (--shared) ──
const sharedDir = args.shared ? resolve(args.shared) : resolve(`${DIR}/../../supabase/functions/_shared`);
const sharedUrl = toFileUrl(sharedDir).href.replace(/\/$/, "");
type PipelineModule = typeof import("../../supabase/functions/_shared/extraction/pipeline.ts");
type RunModule = typeof import("../../supabase/functions/_shared/extraction/run.ts");
type ContextModule = typeof import("../../supabase/functions/_shared/extraction/context.ts");
type RegistryModule = typeof import("../../supabase/functions/_shared/ai/registry.ts");
const { planExtraction } = await import(`${sharedUrl}/extraction/pipeline.ts`) as PipelineModule;
const { runExtraction, passagesOf, MAX_PASSAGES } = await import(`${sharedUrl}/extraction/run.ts`) as RunModule;
const { buildInput } = await import(`${sharedUrl}/extraction/context.ts`) as ContextModule;
const { CAPABILITIES } = await import(`${sharedUrl}/ai/registry.ts`) as RegistryModule;

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

// ── Cost before any call (live): one call per passage, a long note in several ──
const TOKENS_PER_CALL = { input: 2600, output: 450, cacheRead: 0, cacheWrite: 0 };
let estimate = "";
if (mode === "live") {
  const tells = corpus.reduce((a, n) => a + n.steps.length, 0);
  const calls = corpus.reduce((a, n) => a + n.steps.reduce((b, s) => b + Math.min(MAX_PASSAGES, passagesOf(s.note.normalize("NFC")).length), 0), 0) * repeat;
  const cost = costUsd(model, { input: TOKENS_PER_CALL.input * calls, output: TOKENS_PER_CALL.output * calls, cacheRead: 0, cacheWrite: 0 });
  estimate = `${calls} model calls (${tells} Tells × ${repeat} repeat${repeat > 1 ? "s" : ""}, long notes in passages) ≈ ${Number.isNaN(cost) ? "unknown price for this model" : `$${cost.toFixed(2)}`} at list prices for ${model}${effort ? ` (${effort})` : ""}, assuming ~${TOKENS_PER_CALL.input} input and ~${TOKENS_PER_CALL.output} output tokens per call`;
  console.error(`Estimated cost: ${estimate}`);
  if (args["dry-run"]) {
    console.log(`Estimated cost: ${estimate}`);
    Deno.exit(0);
  }
}

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
  propose: (n: Narrative, step: number, input: ReturnType<typeof stepInput>, state: ReturnType<typeof freshState>) => Promise<{ proposal: ModelProposal | null; outcome?: ExtractionOutcome | null; call: StructuredResult | null; latencyMs?: number }>,
): Promise<void> {
  let state = freshState();
  for (let s = 0; s < n.steps.length; s++) {
    const input = stepInput(n, s, rosters, state, buildInput);
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
  const total = queue.length;
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
      if (done % 10 === 0) console.error(`  ${done}/${total}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(args.concurrency)) }, worker));
  const order = new Map(corpus.map((n, i) => [n.id, i]));
  runs.sort((a, b) => (order.get(a.narrative.id)! - order.get(b.narrative.id)!) || a.repeat - b.repeat || a.step - b.step);
}

// ── Grade: per split, never blended ──
const thresholds = JSON.parse(await Deno.readTextFile(`${DIR}/thresholds.json`)) as Record<string, Threshold>;
const gradeOpts = { plan: planExtraction };
const splits = (["dev", "heldout"] as const).filter((s) => runs.some((r) => r.narrative.split === s));
const graded: Record<string, { metrics: MetricResult[]; verdicts: Verdict[]; stats: ReturnType<typeof callStats> | null }> = {};
for (const s of splits) {
  const rs = runs.filter((r) => r.narrative.split === s);
  const { metrics, verdicts } = grade(rs, rosters, gradeOpts);
  graded[s] = { metrics: judge(metrics, thresholds), verdicts, stats: mode === "oracle" ? null : callStats(rs, model) };
}
const byCategory: Record<string, Record<string, MetricResult>> = {};
for (const c of CATEGORIES) {
  const rs = runs.filter((r) => r.narrative.category === c);
  if (!rs.length) continue;
  byCategory[c] = Object.fromEntries(judge(grade(rs, rosters, gradeOpts).metrics, thresholds).map((m) => [m.key, { ...m, failures: [] }]));
}
const bySource: Record<string, Record<string, MetricResult>> = {};
for (const src of ["typed", "voice"] as const) {
  const rs = runs.filter((r) => r.narrative.source === src);
  if (!rs.length) continue;
  bySource[src] = Object.fromEntries(judge(grade(rs, rosters, gradeOpts).metrics, thresholds).map((m) => [m.key, { ...m, failures: [] }]));
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
  Pipeline: args.shared ? `${sharedDir} (--shared)` : "this tree's supabase/functions/_shared",
  "Prompt version": cap.promptVersion,
  Split: split,
  Narratives: `${corpus.length} (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}); ${runs.length} Tells graded${repeat > 1 ? ` (× ${repeat} repeats)` : ""}`,
  Run: stamp,
  Commit: Deno.env.get("EVAL_COMMIT") ?? Deno.env.get("GITHUB_SHA") ?? (await gitHead()),
  Corpus: `${now.version}: ${now.total} narratives, ${now.heldout.ids.length} held out, sha256 ${now.corpus_sha256.slice(0, 16)}…${isFrozen ? " (matches MANIFEST.json)" : " (NOT the frozen manifest)"}`,
  ...(estimate ? { "Estimated cost": estimate } : {}),
};

/** The one table the founder reads: the release metrics per split, this mode. */
function summary(): string[] {
  const rows: [string, string][] = [
    ["Per-fact recall", "fact_recall"],
    ["Per-fact precision", "fact_precision"],
    ["Identity errors: fabricated", "fabricated_identity"],
    ["Identity errors: wrong person", "wrong_person"],
    ["Unnecessary clarification (Tells)", "unnecessary_clarification"],
    ["Silent loss (facts)", "silent_loss"],
    ["Omitted by model, reported as understood", "omitted_reported_understood"],
    ["Omitted by model (any)", "omitted_by_model"],
    ["Rejected by pipeline", "rejected_by_pipeline"],
    ["Showing Up: unsafe eligibility", "eligibility_unsafe"],
    ["Tells retrievable", "tell_retrievable"],
  ];
  const cell = (s: string, key: string) => {
    const x = graded[s].metrics.find((y) => y.key === key);
    if (!x) return "—";
    const mark = x.informational ? "" : x.pass === false ? " ✗" : x.pass === true ? " ✓" : "";
    return `${x.display}${mark}`;
  };
  const out = [`| ${mode === "oracle" ? "Oracle" : mode === "live" ? "Live" : "Replay"} | ${splits.map((s) => s === "dev" ? "Dev" : "Held-out").join(" | ")} | Target |`, `|---|${splits.map(() => "---|").join("")}---|`];
  for (const [name, key] of rows) {
    const t = graded[splits[0]].metrics.find((y) => y.key === key)?.threshold ?? "—";
    out.push(`| ${name} | ${splits.map((s) => cell(s, key)).join(" | ")} | ${t} |`);
  }
  if (mode !== "oracle") {
    out.push(`| Latency p50 (end to end) | ${splits.map((s) => graded[s].stats?.p50 != null ? `${graded[s].stats!.p50} ms` : "—").join(" | ")} | no material regression |`);
    out.push(`| Latency p95 (end to end) | ${splits.map((s) => graded[s].stats?.p95 != null ? `${graded[s].stats!.p95} ms` : "—").join(" | ")} | ≤ +25% vs baseline |`);
  }
  return out;
}

const md: string[] = [`# CMR-1 eval — ${label}${args.tag ? ` (${args.tag})` : ""}`, ""];
for (const [k, v] of Object.entries(meta)) md.push(`- **${k}:** ${v}`);
md.push("", "## Summary", "", ...summary());
for (const s of splits) {
  md.push("", `## ${s === "dev" ? "Dev split" : "Held-out split"}`, "");
  md.push(...table(graded[s].metrics));
  if (graded[s].stats) md.push("", `### Calls (${s})`, "", ...callsMarkdown(graded[s].stats!));
}
const keyMetrics = ["fact_recall", "fact_precision", "silent_loss", "omitted_reported_understood", "wrong_person", "unnecessary_clarification", "correct_clarification", "fabricated_identity", "grounding_violations", "duplicate_memories", "eligibility_unsafe", "eligibility_date_mismatch"];
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
// Every gated miss listed in full (per fact, with its id) so a job summary is readable without the artifact;
// informational metrics keep the shorter list unless --max-failures raises it.
const maxFailures = Math.max(1, Number(args["max-failures"] ?? 15));
for (const s of splits) {
  const gated = graded[s].metrics.filter((r) => !r.informational);
  const info = graded[s].metrics.filter((r) => r.informational);
  const f = [...failures(gated, Math.max(maxFailures, 100)), ...failures(info, maxFailures)];
  if (f.length) md.push("", `## Failures (${s})`, "", ...f);
}
// The model's own proposals for named narratives, beside what the pipeline made of them (synthetic corpus only):
// what a fix has to be built from when a miss shows up on live outputs that cannot be downloaded.
const dumpIds = new Set(String(args["dump-ids"] ?? "").split(",").map((x) => x.trim()).filter(Boolean));
if (dumpIds.size) {
  md.push("", `## Raw proposals (${[...dumpIds].join(", ")})`, "");
  for (const r of runs.filter((x) => dumpIds.has(x.narrative.id))) {
    const items = (r.proposal as ModelProposal | null)?.items ?? [];
    const block = {
      tell: `${r.narrative.id}#${r.step}@${r.repeat}`,
      note: r.input.capture.raw_text,
      context_person_key: r.input.capture.context_person_key ?? null,
      roster: r.input.roster.map((p) => [p.key, p.display_name, p.relationship_label ?? null]),
      related: r.input.related.map((x) => [x.key, x.person_key, x.relation, x.name ?? null]),
      clarification_asked: (r.proposal as ModelProposal | null)?.needs_clarification ?? null,
      model_items: items.map((i) => ({
        kind: i.kind, person: i.person, person_mention: i.person_mention, subject: i.subject, related_relation: i.related_relation,
        related_name: i.related_name, statement: i.statement, evidence: i.evidence, certainty: i.certainty, sensitivity: i.sensitivity,
        confidence: i.confidence, date_text: i.date_text,
      })),
      outcome: r.outcome ? {
        tier: r.outcome.tier,
        items: r.outcome.items.map((i) => ({ statement: i.statement, person_key: i.person_key, subject: i.subject_type, related: i.related ?? null, tier: i.tier, flags: i.flags, new_person_name: i.new_person_name ?? null })),
        dropped: r.outcome.dropped,
        clarification: r.outcome.clarification ?? null,
        coverage: r.outcome.coverage ?? null,
      } : null,
      crashed: r.crashed ?? null,
    };
    md.push("<details><summary>" + block.tell + "</summary>", "", "```json", JSON.stringify(block, null, 1), "```", "", "</details>");
  }
}
console.log(md.join("\n"));

if (mode !== "replay" || args.tag) {
  await Deno.mkdir(args.out, { recursive: true });
  const base = `${args.out}/${stamp}-${label}${args.tag ? `-${args.tag}` : ""}`;
  await Deno.writeTextFile(`${base}.md`, md.join("\n"));
  await Deno.writeTextFile(`${base}.json`, JSON.stringify({
    meta: { ...meta, model, effort, mode, split, repeat, realistic: !!args.realistic, shared: args.shared ?? null },
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
