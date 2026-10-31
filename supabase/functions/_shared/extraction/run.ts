// relationship_extract end to end, minus I/O: prompt → model → plan.
// The gateway and the eval harness both call this.
//
// Long notes (founder, 30 Oct 2026, FD-30c: processed, not pushed back): a note past LONG_NOTE_CHARS is
// understood in passages, one model call each, in parallel, every call seeing the whole note (so "he"
// is still Leo in the third passage) and proposing only for its passage. The proposals are merged and
// judged as one note; the pipeline folds repeats. A passage whose call fails is recorded as not got to
// (Coverage.unprocessed), so the phone can mark those words and offer to tell them again; nothing is
// lost to a count. Calibration (19 Oct 2026): the model takes about 1.5 s per proposal, so a passage of
// PASSAGE_CHARS stays well inside the 45 s call deadline even when every clause is a detail.

import type { Capability } from "../ai/registry.ts";
import type { ModelCaller, StructuredResult } from "../ai/model.ts";
import { buildUserContent, type Passage } from "../prompts/relationship_extract/v7.ts";
import { planExtraction } from "./pipeline.ts";
import { codePointLength, locateEvidence, utf16ToCodePoint } from "../spans.ts";
import type { ExtractionInput, ExtractionOutcome, ModelProposal, ProposedItem } from "./types.ts";

/** A note up to this many characters is one call, as before. */
export const LONG_NOTE_CHARS = 700;
/** The size a passage grows to before the next sentence starts a new one. */
export const PASSAGE_CHARS = 450;
/** Passages understood at once; a note longer than that leaves the rest as not got to (never silent). */
export const MAX_PASSAGES = 6;

export interface ExtractRun {
  call: StructuredResult;
  /** Null unless the model answered with a well-formed proposal. */
  outcome: ExtractionOutcome | null;
  proposal: ModelProposal | null;
  /** How the note was read: one call, or this many passages, of which `failed` got no answer. */
  passages: number;
  failed: number;
}

export interface ModelOverride {
  model?: string;
  effort?: Capability["effort"];
}

/**
 * The passages a note is understood in: whole sentences, grown to about PASSAGE_CHARS each, as
 * code-point spans. One passage for a note up to LONG_NOTE_CHARS.
 */
export function passagesOf(text: string): Passage[] {
  const length = codePointLength(text);
  if (text.length <= LONG_NOTE_CHARS) return [{ start: 0, end: length }];
  const sentences: { start: number; end: number }[] = [];
  const re = /[^.!?\n]+(?:[.!?]+|\n+|$)\s*/gu;
  for (const m of text.matchAll(re)) {
    if (!m[0].trim()) continue;
    const start = m.index ?? 0;
    sentences.push({ start, end: start + m[0].length });
  }
  if (!sentences.length) return [{ start: 0, end: length }];
  const out: { start: number; end: number }[] = [];
  let current: { start: number; end: number } | null = null;
  for (const s of sentences) {
    if (current && s.end - current.start > PASSAGE_CHARS) {
      out.push(current);
      current = null;
    }
    current = current ? { start: current.start, end: s.end } : { ...s };
  }
  if (current) out.push(current);
  return out.map((p) => ({ start: utf16ToCodePoint(text, p.start), end: utf16ToCodePoint(text, Math.min(text.length, p.end)) }));
}

export async function runExtraction(
  input: ExtractionInput,
  cap: Capability,
  call: ModelCaller,
  override: ModelOverride = {},
): Promise<ExtractRun> {
  const request = (content: string) => call({
    model: override.model ?? cap.model,
    effort: override.effort !== undefined ? override.effort : cap.effort,
    system: cap.system,
    schema: cap.schema,
    content,
    maxTokens: cap.maxTokens,
    timeoutMs: cap.timeoutMs,
  });

  const text = input.capture.raw_text;
  const passages = passagesOf(text);
  if (passages.length === 1) {
    const result = await request(buildUserContent(input));
    if (result.outcome !== "ok") return { call: result, outcome: null, proposal: null, passages: 1, failed: 1 };
    const proposal = asProposal(result.output);
    if (!proposal) return { call: { ...result, outcome: "invalid_output", errorKind: "shape" }, outcome: null, proposal: null, passages: 1, failed: 1 };
    return { call: result, outcome: planExtraction(input, proposal), proposal, passages: 1, failed: 0 };
  }

  // A long note: one call per passage, at once, each seeing the whole note. Passages past MAX_PASSAGES
  // are not asked for this time and are recorded as not got to, like a failed one.
  const asked = passages.slice(0, MAX_PASSAGES);
  const results = await Promise.all(asked.map((p) => request(buildUserContent(input, p))));
  const merged: ProposedItem[] = [];
  let clarification: ModelProposal["needs_clarification"] = null;
  const unprocessed: Passage[] = passages.slice(MAX_PASSAGES);
  let failed = unprocessed.length;
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let latencyMs = 0;
  let firstFailure: StructuredResult | null = null;
  results.forEach((result, i) => {
    usage.input += result.usage.input;
    usage.output += result.usage.output;
    usage.cacheRead += result.usage.cacheRead;
    usage.cacheWrite += result.usage.cacheWrite;
    latencyMs = Math.max(latencyMs, result.latencyMs);
    const proposal = result.outcome === "ok" ? asProposal(result.output) : null;
    if (!proposal) {
      failed++;
      unprocessed.push(asked[i]);
      firstFailure ??= result.outcome === "ok" ? { ...result, outcome: "invalid_output", errorKind: "shape" } : result;
      return;
    }
    clarification ??= proposal.needs_clarification;
    for (const item of proposal.items) if (inPassage(text, item, asked[i])) merged.push(item);
  });
  if (failed === passages.length) {
    const result = firstFailure ?? results[0];
    return { call: { ...result, usage, latencyMs }, outcome: null, proposal: null, passages: passages.length, failed };
  }
  const proposal: ModelProposal = { items: merged, needs_clarification: clarification };
  const call_: StructuredResult = { outcome: "ok", output: proposal, usage, latencyMs, errorKind: null };
  return {
    call: call_,
    outcome: planExtraction(input, proposal, { unprocessed: unprocessed.sort((a, b) => a.start - b.start) }),
    proposal,
    passages: passages.length,
    failed,
  };
}

/**
 * Whether a passage's proposal rests on its own passage: its first quote, placed in the note (nearest
 * the passage when the words occur twice), overlaps the passage. A proposal about another passage is
 * that passage's to make; one whose words can't be placed is kept for the pipeline to judge.
 */
function inPassage(text: string, item: ProposedItem, passage: Passage): boolean {
  const quote = Array.isArray(item?.evidence) ? item.evidence.find((q): q is string => typeof q === "string" && !!q.trim()) : undefined;
  if (!quote) return true;
  const found = locateEvidence(text, quote.trim(), (passage.start + passage.end) / 2);
  if (!found.ok) return found.reason !== "ambiguous";
  return found.span.start < passage.end && found.span.end > passage.start;
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
