// Model adapters for the eval runner. Everything else in the harness (the
// corpus, the production context builder, the pipeline, the graders) is
// provider-neutral and speaks ModelCaller; a new provider adds a branch here
// that returns the same StructuredResult shape. Cost is reported only for
// models with a known price.

import { anthropicCaller, type ModelCaller } from "../../../supabase/functions/_shared/ai/model.ts";

export function callerFor(model: string): ModelCaller {
  if (model.startsWith("claude-")) {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    // No SDK retries: a failed call is reported, not hidden.
    return anthropicCaller(key, { maxRetries: 0 });
  }
  throw new Error(`no eval adapter for model "${model}" (add one in evals/extraction/lib/callers.ts)`);
}
