// relationship_extract eval runner (plan §10).
//
//   deno run -A evals/extraction/run.ts --mode oracle
//       Checks fixtures against the deterministic pipeline (free, no model).
//   ANTHROPIC_API_KEY=… deno run -A evals/extraction/run.ts --mode live --model claude-opus-5-5 --effort low
//       Calls the model on every fixture (costs money; see the README).
//   deno run -A evals/extraction/run.ts --mode replay --replay evals/results/<run>.json
//       Re-grades saved model outputs through the current pipeline, free.
//
// Options: --sets core,ambiguity,…  --ids a,b  --limit N  --concurrency N
//          --repeat N  --out evals/results  --tag label
//          --smoke   only the locked smoke set (smoke.json), with a per-fixture report
//          --require-frozen   refuse to run unless the corpus matches MANIFEST.json
//          --realistic   (oracle) phrase proposals the way a real model does

import { parseArgs } from "jsr:@std/cli@1/parse-args";
import type { StructuredResult } from "../../supabase/functions/_shared/ai/model.ts";
import { CAPABILITIES, EXTRACTION_EVAL_VERSION } from "../../supabase/functions/_shared/ai/registry.ts";
import { runExtraction } from "../../supabase/functions/_shared/extraction/run.ts";
import { planExtraction } from "../../supabase/functions/_shared/extraction/pipeline.ts";
import type { ModelProposal } from "../../supabase/functions/_shared/extraction/types.ts";
import { type Fixture, loadFixtures, loadRosters, oracleProposal, SETS, toInput } from "./lib/fixture.ts";
import { type FixtureRun, grade } from "./lib/grade.ts";
import { callStats, judge, markdown, type Threshold } from "./lib/report.ts";
import { perFixtureMarkdown, type SmokeCase, verdicts } from "./lib/perfixture.ts";
import { dateBreakdown, layers, layersMarkdown, mergeBreakdown } from "./lib/layers.ts";
import { callerFor } from "./lib/callers.ts";
import { buildManifest, readManifest } from "./manifest.ts";

const DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");

const args = parseArgs(Deno.args, {
  string: ["mode", "model", "effort", "sets", "ids", "limit", "concurrency", "repeat", "out", "replay", "tag"],
  boolean: ["smoke", "require-frozen", "realistic"],
  default: { mode: "oracle", sets: SETS.join(","), concurrency: "4", repeat: "1", out: `${DIR}/../results` },
});

const cap = CAPABILITIES.relationship_extract;
const mode = args.mode as "oracle" | "live" | "replay";
const model = args.model ?? cap.model;
const effort = args.effort === "none" ? null : (args.effort ?? cap.effort) as typeof cap.effort;

const frozen = await readManifest();
const corpus = await buildManifest(frozen?.version ?? EXTRACTION_EVAL_VERSION);
const isFrozen = !!frozen && frozen.corpus_sha256 === corpus.corpus_sha256;
if (args["require-frozen"] && !isFrozen) throw new Error("the corpus differs from MANIFEST.json; refusing a paid run on an unfrozen corpus");
const rosters = await loadRosters(DIR);
let fixtures = await loadFixtures(DIR, args.sets.split(","));
if (args.ids) {
  const ids = new Set(args.ids.split(","));
  fixtures = fixtures.filter((f) => ids.has(f.id));
}
// The smoke set is locked in smoke.json before any run; the list is never
// chosen after seeing model output.
let smokeCases: SmokeCase[] = [];
if (args.smoke) {
  smokeCases = (JSON.parse(await Deno.readTextFile(`${DIR}/smoke.json`)) as { cases: SmokeCase[] }).cases;
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const missing = smokeCases.filter((c) => !byId.has(c.id)).map((c) => c.id);
  if (missing.length) throw new Error(`smoke.json names unknown fixtures: ${missing.join(", ")}`);
  fixtures = smokeCases.map((c) => byId.get(c.id)!);
}
if (args.limit) fixtures = fixtures.slice(0, Number(args.limit));
const repeat = Math.max(1, Number(args.repeat));

let runs: FixtureRun[] = [];
if (mode === "oracle") {
  for (const f of fixtures) {
    const input = toInput(f, rosters);
    const proposal = oracleProposal(f, rosters, input, { realistic: args.realistic });
    runs.push({ fixture: f, input, outcome: planExtraction(input, proposal), call: null, proposal });
  }
} else if (mode === "replay") {
  if (!args.replay) throw new Error("--replay <results.json> is required");
  const saved = JSON.parse(await Deno.readTextFile(args.replay)) as { runs: { id: string; call: StructuredResult | null; proposal: unknown }[] };
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  for (const r of saved.runs) {
    const f = byId.get(r.id);
    if (!f) continue;
    const input = toInput(f, rosters);
    const p = r.proposal as ModelProposal | null;
    runs.push({ fixture: f, input, outcome: p && Array.isArray(p.items) ? planExtraction(input, p) : null, call: r.call, proposal: r.proposal });
  }
} else if (mode === "live") {
  const call = callerFor(model);
  const queue: Fixture[] = [];
  for (let i = 0; i < repeat; i++) queue.push(...fixtures);
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift()!;
      const input = toInput(f, rosters);
      const r = await runExtraction(input, cap, call, { model, effort });
      runs.push({ fixture: f, input, outcome: r.outcome, call: r.call, proposal: r.proposal });
      done++;
      if (done % 10 === 0) console.error(`  ${done}/${fixtures.length * repeat}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(args.concurrency)) }, worker));
  runs.sort((a, b) => fixtures.indexOf(a.fixture) - fixtures.indexOf(b.fixture));
} else {
  throw new Error(`unknown mode ${mode}`);
}

const thresholds = JSON.parse(await Deno.readTextFile(`${DIR}/thresholds.json`)) as Record<string, Threshold>;
const results = judge(grade(runs), thresholds);
const stats = mode === "oracle" ? null : callStats(runs, model);
const counts = Object.fromEntries(SETS.map((s) => [s, fixtures.filter((f) => f.set === s).length]));
const label = `${mode === "oracle" ? "oracle" : `${model}${effort ? `-${effort}` : ""}`}${args.smoke ? "-smoke" : ""}`;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const meta = {
  Mode: mode,
  Model: mode === "oracle" ? "none (perfect proposals through the real pipeline)" : `${model}${effort ? `, effort ${effort}` : ""}`,
  "Prompt version": cap.promptVersion,
  "Eval version": EXTRACTION_EVAL_VERSION,
  Fixtures: `${fixtures.length} (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")})${repeat > 1 ? ` × ${repeat} repeats` : ""}`,
  Run: stamp,
  Commit: Deno.env.get("EVAL_COMMIT") ?? Deno.env.get("GITHUB_SHA") ?? "local",
  Corpus: `${corpus.total} fixtures, sha256 ${corpus.corpus_sha256.slice(0, 16)}…${isFrozen ? " (matches MANIFEST.json)" : " (NOT the frozen manifest)"}`,
};
let md = markdown(`relationship_extract eval — ${label}${args.tag ? ` (${args.tag})` : ""}`, results, stats, meta);
const perFixture = args.smoke ? verdicts(runs, results, smokeCases) : null;
const layered = layers(runs, results);
const dates = dateBreakdown(runs);
const merges = mergeBreakdown(runs);
const bySet = Object.fromEntries(SETS.filter((set) => runs.some((r) => r.fixture.set === set)).map((set) => [
  set,
  judge(grade(runs.filter((r) => r.fixture.set === set)), thresholds).map(({ failures: _f, ...r }) => r),
]));
md += "\n\n" + layersMarkdown(layered, runs);
md += `\n\n## Dates\n\n- Dated items found: ${dates.total} · resolved right: ${dates.right} · of those, ambiguous and correctly flagged: ${dates.flaggedRight} · **silently wrong (saved, wrong date, no flag): ${dates.silentWrong.length}**\n`;
for (const x of dates.silentWrong) md += `  - \`${x.id}\` ${x.detail}\n`;
md += `- Date lost (item kept, its date not stored): ${dates.lost.length}\n`;
for (const x of dates.lost) md += `  - \`${x.id}\` ${x.detail}\n`;
const { rows: mergeRows, ...mergeCounts } = merges;
md += `\n## Merge decisions\n\n${Object.entries(mergeCounts).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n`;
for (const r of mergeRows) md += `  - ${r}\n`;
md += "\n## By set\n\n| Metric | " + Object.keys(bySet).join(" | ") + " |\n|---|" + Object.keys(bySet).map(() => "---|").join("") + "\n";
for (const m of results) {
  md += `| ${m.label} | ${Object.values(bySet).map((rs) => {
    const x = rs.find((y) => y.key === m.key)!;
    return x.pass === false ? `**${x.display}** ✗` : x.display;
  }).join(" | ")} |\n`;
}
if (perFixture) md += "\n\n" + perFixtureMarkdown(runs, perFixture, smokeCases);
console.log(md);

if (mode !== "replay" || args.tag) {
  await Deno.mkdir(args.out, { recursive: true });
  const base = `${args.out}/${stamp}-${label}${args.tag ? `-${args.tag}` : ""}`;
  await Deno.writeTextFile(`${base}.md`, md);
  await Deno.writeTextFile(`${base}.json`, JSON.stringify({
    meta: { ...meta, model, effort, mode },
    metrics: results.map(({ failures, ...r }) => ({ ...r, failures: failures.slice(0, 200) })),
    stats,
    verdicts: perFixture,
    corpus,
    layers: layered,
    dates,
    merges,
    bySet,
    runs: runs.map((r) => ({ id: r.fixture.id, call: r.call, proposal: r.proposal, outcome: r.outcome })),
  }, null, 1));
  console.error(`wrote ${base}.md and .json`);
}

const failed = results.filter((r) => r.pass === false).map((r) => r.key);
if (failed.length) {
  console.error(`below threshold: ${failed.join(", ")}`);
  Deno.exitCode = 1;
}
