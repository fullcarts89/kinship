// One structured-output call to Claude, shared by the gateway and the eval
// harness so both run the exact same request shape.

import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import type { Effort } from "./registry.ts";

export interface StructuredRequest {
  model: string;
  effort: Effort | null;
  system: string;
  schema: Record<string, unknown>;
  content: string;
  maxTokens: number;
  timeoutMs: number;
}

export type Outcome = "ok" | "refused" | "max_tokens" | "invalid_output" | "timeout" | "rate_limited" | "api_error";

export interface StructuredResult {
  outcome: Outcome;
  output: unknown;
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
  latencyMs: number;
  /** HTTP status or error class; never content. */
  errorKind: string | null;
}

export type ModelCaller = (req: StructuredRequest) => Promise<StructuredResult>;

export function anthropicCaller(apiKey: string | undefined, opts: { maxRetries?: number } = {}): ModelCaller {
  const client = new Anthropic({ apiKey, maxRetries: opts.maxRetries ?? 1 });
  return async (req) => {
    const started = performance.now();
    const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    try {
      const response = await client.messages.create(
        {
          model: req.model,
          max_tokens: req.maxTokens,
          output_config: {
            ...(req.effort ? { effort: req.effort } : {}),
            format: { type: "json_schema", schema: req.schema },
          },
          // The system prompt is identical on every call: cache it.
          system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: req.content }],
        } as Anthropic.MessageCreateParamsNonStreaming,
        { timeout: req.timeoutMs },
      );
      const latencyMs = Math.round(performance.now() - started);
      usage.input = response.usage.input_tokens ?? 0;
      usage.output = response.usage.output_tokens ?? 0;
      usage.cacheRead = response.usage.cache_read_input_tokens ?? 0;
      usage.cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
      if (response.stop_reason === "refusal") return { outcome: "refused", output: null, usage, latencyMs, errorKind: null };
      if (response.stop_reason === "max_tokens") return { outcome: "max_tokens", output: null, usage, latencyMs, errorKind: null };
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") return { outcome: "invalid_output", output: null, usage, latencyMs, errorKind: "no_text" };
      try {
        return { outcome: "ok", output: JSON.parse(block.text), usage, latencyMs, errorKind: null };
      } catch {
        return { outcome: "invalid_output", output: null, usage, latencyMs, errorKind: "json" };
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started);
      if (err instanceof Anthropic.APIConnectionTimeoutError) return { outcome: "timeout", output: null, usage, latencyMs, errorKind: "timeout" };
      if (err instanceof Anthropic.RateLimitError) return { outcome: "rate_limited", output: null, usage, latencyMs, errorKind: "429" };
      if (err instanceof Anthropic.APIError) return { outcome: "api_error", output: null, usage, latencyMs, errorKind: String(err.status ?? "api") };
      return { outcome: "api_error", output: null, usage, latencyMs, errorKind: "unknown" };
    }
  };
}
