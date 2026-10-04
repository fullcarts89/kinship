// The AI capability registry (plan §9). One entry per narrow capability:
// which prompt version, which model and effort, and the limits around the
// call. Every stored output and every usage-log row records the prompt
// version and model, so an extraction can be traced to what produced it.
//
// Governance (D12): capabilities start on Claude Opus 5.5. A cheaper model
// replaces it only for a capability whose eval suite shows parity, with the
// founder's approval during beta. Change `model` only with an eval run
// attached to the PR.

import * as extract from "../prompts/relationship_extract/v2.ts";

export type Effort = "low" | "medium" | "high";

export interface Capability {
  name: string;
  promptVersion: string;
  system: string;
  schema: Record<string, unknown>;
  model: string;
  /** Omitted for models without the effort control (Haiku 4.5). */
  effort: Effort | null;
  maxTokens: number;
  timeoutMs: number;
  /** The eval suite version this prompt + model passed (recorded in usage logs). */
  evalVersion: string;
  /** Server feature flag that must be on for the caller. */
  flag: string;
  /**
   * Server-side refusal fallback. Off for relationship_extract: the fallback
   * model hasn't passed this capability's evals, and a refused note is kept
   * raw (plan §9), which is the safe outcome.
   */
  fallbacks: boolean;
}

// v2.1: the frozen stage-2 corpus, with six documented fixture corrections (evals/extraction/MANIFEST.json).
export const EXTRACTION_EVAL_VERSION = "extraction-v2.1";

export const CAPABILITIES: Record<string, Capability> = {
  relationship_extract: {
    name: "relationship_extract",
    promptVersion: extract.VERSION,
    system: extract.SYSTEM,
    schema: extract.SCHEMA as unknown as Record<string, unknown>,
    model: "claude-opus-5-5",
    effort: "low",
    maxTokens: 8000,
    timeoutMs: 45_000,
    evalVersion: EXTRACTION_EVAL_VERSION,
    flag: "ai_extraction",
    fallbacks: false,
  },
};

/** Models compared by the eval harness, with list prices per million tokens. */
export const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number; effort: boolean }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, effort: true },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5, effort: true },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25, effort: false },
};

export function costUsd(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  const p = MODEL_PRICES[model];
  if (!p) return NaN;
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1_000_000;
}
