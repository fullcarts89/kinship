// relationship_extract end to end, minus I/O: prompt → model → plan.
// The gateway and the eval harness both call this.

import type { Capability } from "../ai/registry.ts";
import type { ModelCaller, StructuredResult } from "../ai/model.ts";
import { buildUserContent } from "../prompts/relationship_extract/v5.ts";
import { planExtraction } from "./pipeline.ts";
import type { ExtractionInput, ExtractionOutcome, ModelProposal } from "./types.ts";

export interface ExtractRun {
  call: StructuredResult;
  /** Null unless the model answered with a well-formed proposal. */
  outcome: ExtractionOutcome | null;
  proposal: ModelProposal | null;
}

export interface ModelOverride {
  model?: string;
  effort?: Capability["effort"];
}

export async function runExtraction(
  input: ExtractionInput,
  cap: Capability,
  call: ModelCaller,
  override: ModelOverride = {},
): Promise<ExtractRun> {
  const result = await call({
    model: override.model ?? cap.model,
    effort: override.effort !== undefined ? override.effort : cap.effort,
    system: cap.system,
    schema: cap.schema,
    content: buildUserContent(input),
    maxTokens: cap.maxTokens,
    timeoutMs: cap.timeoutMs,
  });
  if (result.outcome !== "ok") return { call: result, outcome: null, proposal: null };
  const proposal = asProposal(result.output);
  if (!proposal) return { call: { ...result, outcome: "invalid_output", errorKind: "shape" }, outcome: null, proposal: null };
  return { call: result, outcome: planExtraction(input, proposal), proposal };
}

function asProposal(v: unknown): ModelProposal | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  // The schema uses "" for a detail that doesn't apply; the pipeline expects null.
  const items = o.items.map((it) => {
    if (!it || typeof it !== "object") return it;
    const detail = (it as Record<string, unknown>).detail;
    if (!detail || typeof detail !== "object") return it;
    const d = Object.fromEntries(Object.entries(detail as Record<string, unknown>).map(([k, v]) => [k, v === "" ? null : v]));
    return { ...(it as Record<string, unknown>), detail: d };
  });
  return { items: items as ModelProposal["items"], needs_clarification: (o.needs_clarification ?? null) as ModelProposal["needs_clarification"] };
}
