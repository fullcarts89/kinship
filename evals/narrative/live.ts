// Natural-narrative probe (CER-1, issue #63): runs one or more realistic notes through the real
// prompt, the live model and the real pipeline, from a person's page and as a general Tell, and
// prints per-proposal outcomes (kept / held / dropped, the person, the flags, the question).
//
//   ANTHROPIC_API_KEY=… deno run -A --config supabase/functions/deno.json evals/narrative/live.ts [--ids s1,s4] [--page] [--general] [--save dir]
//
// Synthetic people only. The roster is `rosters.json` here; the notes are `corpus.json`.
import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { anthropicCaller } from "../../supabase/functions/_shared/ai/model.ts";
import { CAPABILITIES } from "../../supabase/functions/_shared/ai/registry.ts";
import { runExtraction } from "../../supabase/functions/_shared/extraction/run.ts";
import type { ExtractionInput, ExtractionOutcome, ModelProposal, RosterPerson } from "../../supabase/functions/_shared/extraction/types.ts";

const DIR = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const args = parseArgs(Deno.args, { string: ["ids", "save", "replay"], boolean: ["page", "general"], default: {} });

interface Person { key: string; name: string; full?: string; nick?: string[]; label?: string }
interface Scenario { id: string; title: string; note: string; page?: string; occurred_at?: string }

const roster: Person[] = JSON.parse(await Deno.readTextFile(`${DIR}/rosters.json`)).people;
let scenarios: Scenario[] = JSON.parse(await Deno.readTextFile(`${DIR}/corpus.json`)).scenarios;
if (args.ids) {
  const ids = new Set(String(args.ids).split(","));
  scenarios = scenarios.filter((s) => ids.has(s.id));
}
const modes: ("page" | "general")[] = args.page && !args.general ? ["page"] : args.general && !args.page ? ["general"] : ["page", "general"];

function inputFor(s: Scenario, mode: "page" | "general"): ExtractionInput {
  const people: RosterPerson[] = roster.map((p) => ({
    key: p.key, id: `id-${p.key}`, display_name: p.name, full_name: p.full ?? null, nicknames: p.nick ?? [], relationship_label: p.label ?? null,
  }));
  const page = mode === "page" && s.page ? people.find((p) => p.name === s.page) : undefined;
  return {
    capture: { id: `c-${s.id}-${mode}`, raw_text: s.note, occurred_at: s.occurred_at ?? "2026-10-30T18:00:00Z", time_zone: "America/Los_Angeles", context_person_key: page?.key ?? null },
    roster: people,
    related: [],
    dossier: [],
  };
}

function describe(input: ExtractionInput, proposal: ModelProposal | null, outcome: ExtractionOutcome | null): string {
  const lines: string[] = [];
  const name = (key: string | null) => key ? (input.roster.find((p) => p.key === key)?.display_name ?? key) : "—";
  if (!proposal || !outcome) return "  (no proposal)";
  lines.push(`  model proposed ${proposal.items.length} item(s)${proposal.needs_clarification ? `; model asks: ${JSON.stringify(proposal.needs_clarification)}` : ""}`);
  for (const it of proposal.items) lines.push(`    · [${it.kind}/${it.subject}] ${it.person} "${it.person_mention}" ${it.related_relation ? `(${it.related_relation} ${it.related_name ?? ""}) ` : ""}— ${it.statement}`);
  lines.push(`  pipeline: tier=${outcome.tier}, ${outcome.items.length} planned, ${outcome.dropped.length} dropped${outcome.coverage ? `, coverage ${JSON.stringify(outcome.coverage)}` : ""}`);
  for (const it of outcome.items) {
    lines.push(`    ${it.tier === "hold" ? "HELD" : it.tier === "confirm" ? "CONFIRM" : "kept"} [${it.kind}/${it.subject}] ${name(it.person_key)}${it.new_person_name ? ` new:${it.new_person_name}` : ""}${it.related ? ` (${it.related.relation} ${it.related.name ?? ""})` : ""} — ${it.statement}${it.flags.length ? `  {${it.flags.join(",")}}` : ""}`);
  }
  for (const d of outcome.dropped) lines.push(`    dropped: ${d.reason} (${d.kind})`);
  if (outcome.clarification) lines.push(`  QUESTION: ${outcome.clarification.question} ${JSON.stringify(outcome.clarification.options)}`);
  return lines.join("\n");
}

const key = Deno.env.get("ANTHROPIC_API_KEY");
const call = anthropicCaller(key, { maxRetries: 0 });
const cap = CAPABILITIES.relationship_extract;
const saved: Record<string, unknown> = {};
for (const s of scenarios) {
  for (const mode of modes) {
    if (mode === "page" && !s.page) continue;
    const input = inputFor(s, mode);
    const started = performance.now();
    const run = await runExtraction(input, cap, call);
    const ms = Math.round(performance.now() - started);
    console.log(`\n=== ${s.id} · ${s.title} · ${mode === "page" ? `on ${s.page}'s page` : "general Tell"} · ${run.call.outcome} · ${ms} ms · out ${run.call.usage.output} tok`);
    console.log(`  note: ${s.note}`);
    console.log(describe(input, run.proposal, run.outcome));
    saved[`${s.id}-${mode}`] = { input, proposal: run.proposal, call: { outcome: run.call.outcome, usage: run.call.usage, latencyMs: run.call.latencyMs } };
  }
}
if (args.save) {
  await Deno.mkdir(String(args.save), { recursive: true });
  const file = `${args.save}/narrative-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await Deno.writeTextFile(file, JSON.stringify(saved, null, 1));
  console.log(`\nsaved ${file}`);
}
