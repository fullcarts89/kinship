/**
 * AI Insight Service — the "signal boosting" layer.
 *
 * Turns a person's quick notes, interests, memories, and interaction
 * history into one warm, specific suggestion ("Her sister's wedding was
 * in June — ask how it went") plus a conversation starter.
 *
 * Two transports, checked in order:
 *   1. Supabase Edge Function `ai-insight` (production) — the Anthropic
 *      API key lives server-side in the function's secrets; the app
 *      never sees it.
 *   2. EXPO_PUBLIC_ANTHROPIC_API_KEY (DEV ONLY) — calls the Claude API
 *      directly from the device. Anything in an
 *      EXPO_PUBLIC_ env var is embedded in the app bundle, so this path
 *      must never be used in a release build. It exists so the feature
 *      can be exercised in Expo Go before the backend is connected.
 *
 * When neither is configured, isAIConfigured() is false and callers fall
 * back to the heuristic engines — the app never breaks without AI.
 *
 * Results are cached on-device per person, keyed by a digest of the
 * inputs, so a profile visit only costs a request when something about
 * the relationship actually changed.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { loadCollection, saveCollection } from "@/lib/localStore";
import type { Person, Memory, Interaction, PersonPromise } from "@/types/database";

// ─── Configuration ──────────────────────────────────────────────────────────

const DEV_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "";
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL ?? "claude-opus-4-8";

export function isAIConfigured(): boolean {
  return isSupabaseConfigured || DEV_API_KEY.length > 0;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonInsight {
  /** Short warm headline, e.g. "The wedding was in June" */
  headline: string;
  /** One or two sentences explaining the opening, grounded in the data. */
  body: string;
  /** A message the user could send nearly verbatim. */
  conversation_starter: string;
}

interface CachedInsight extends PersonInsight {
  person_id: string;
  digest: string;
  created_at: string;
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You help someone nurture a real-life relationship inside Kinship, a calm "living garden" app. Given what they know about one person — quick notes they jotted down, shared memories, interests, and recent contact — surface the single most caring, specific opening they have right now.

Rules (inviolable):
- Never guilt or gap-shame ("you haven't talked in...", "it's been a while"). Never urgency ("don't forget", "you should").
- Be invitational and warm, like a thoughtful friend nudging gently.
- Ground the suggestion in a SPECIFIC detail from the notes or memories when one exists — names, events, plans. Notes are the highest-signal input: a note like "sister's wedding is in June" after June means asking how the wedding went.
- If dates suggest something already happened, frame as a follow-up; if upcoming, as anticipation.
- If there's truly nothing specific, suggest something gentle tied to their interests or relationship type.
- The conversation starter must sound like the user, casual and human — not like an assistant wrote it. No emoji unless natural.
- Headline: at most 8 words. Body: at most 2 sentences. Starter: at most 2 sentences.`;

const INSIGHT_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: {
      type: "string" as const,
      description: "Warm headline, max 8 words, no guilt or urgency",
    },
    body: {
      type: "string" as const,
      description:
        "1-2 sentences explaining the opening, grounded in a specific detail",
    },
    conversation_starter: {
      type: "string" as const,
      description: "A casual, human message the user could send nearly verbatim",
    },
  },
  required: ["headline", "body", "conversation_starter"],
  additionalProperties: false,
};

// ─── Promise extraction (Phase 2 of Tending Seasons spec) ──────────────────

export interface PromiseExtraction {
  is_promise: boolean;
  promise_text: string | null;
  due_hint: string | null;
}

const EXTRACT_SYSTEM = `You detect whether a short personal note contains a commitment the WRITER made to the person the note is about. Only first-person commitments by the writer count ("I said I'd...", "need to send her...", "told him I'd..."). Things the OTHER person promised do not count. Plans that are facts, not the writer's obligations ("her wedding is in June"), do not count.

If a commitment exists: rewrite it as a short imperative ("Send Tom the book link"), and extract a due hint ONLY if one is stated — as an ISO date (YYYY-MM-DD) when derivable from today's date, otherwise the stated phrase ("after the wedding"). Be conservative: when unsure, is_promise is false.`;

const EXTRACT_SCHEMA = {
  type: "object" as const,
  properties: {
    is_promise: { type: "boolean" as const },
    promise_text: {
      type: ["string", "null"] as const,
      description: "Short imperative form, or null",
    },
    due_hint: {
      type: ["string", "null"] as const,
      description: "ISO date or stated phrase, or null",
    },
  },
  required: ["is_promise", "promise_text", "due_hint"],
  additionalProperties: false,
};

/**
 * Classify a saved note for a commitment. Returns null when AI isn't
 * configured or the call fails — callers simply skip the suggestion.
 * The result only ever powers a "hold onto it?" prompt; nothing is
 * auto-created.
 */
export async function extractPromiseFromText(
  text: string,
  personName: string
): Promise<PromiseExtraction | null> {
  if (!isAIConfigured()) return null;
  const payload = {
    text: text.slice(0, 500),
    person_name: personName,
    today: new Date().toISOString().slice(0, 10),
  };
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.functions.invoke("ai-insight", {
        body: { mode: "extract_promise", ...payload },
      });
      if (error || !data?.extraction) return null;
      return data.extraction as PromiseExtraction;
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": DEV_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: EXTRACT_SCHEMA },
        },
        system: EXTRACT_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Note about ${payload.person_name} (today is ${payload.today}):\n"${payload.text}"`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.stop_reason === "refusal") return null;
    const textBlock = (data.content ?? []).find(
      (b: { type: string }) => b.type === "text"
    );
    if (!textBlock?.text) return null;
    return JSON.parse(textBlock.text) as PromiseExtraction;
  } catch {
    return null;
  }
}

// ─── Season reflection (Phase 4) ────────────────────────────────────────────

const REFLECT_SYSTEM = `You write one short, warm reflection paragraph closing a "season" of intentional friendship-tending in Kinship, a calm garden app. You receive what actually happened: people tended, memories kept, moments shared.

Rules (inviolable):
- Report only what HAPPENED. Never name what didn't happen, never compare against intentions, never imply falling short.
- If little happened, say less — one true warm sentence beats manufactured positivity.
- Ground it in specifics (names, a memory detail) when available.
- 2-4 sentences, second person ("you"), warm but not saccharine. No emoji.`;

const REFLECT_SCHEMA = {
  type: "object" as const,
  properties: {
    reflection: { type: "string" as const, description: "2-4 warm sentences" },
  },
  required: ["reflection"],
  additionalProperties: false,
};

export interface SeasonReflectionInput {
  seasonName: string;
  people: { name: string; memoriesKept: number; momentsShared: number }[];
  sampleMemories: string[];
}

export async function generateSeasonReflection(
  input: SeasonReflectionInput
): Promise<string | null> {
  if (!isAIConfigured()) return null;
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.functions.invoke("ai-insight", {
        body: { mode: "season_reflection", ...input },
      });
      if (error || !data?.reflection) return null;
      return data.reflection as string;
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": DEV_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: REFLECT_SCHEMA },
        },
        system: REFLECT_SYSTEM,
        messages: [
          { role: "user", content: JSON.stringify(input, null, 2) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.stop_reason === "refusal") return null;
    const textBlock = (data.content ?? []).find(
      (b: { type: string }) => b.type === "text"
    );
    if (!textBlock?.text) return null;
    return (JSON.parse(textBlock.text) as { reflection: string }).reflection;
  } catch {
    return null;
  }
}

// ─── Context assembly ───────────────────────────────────────────────────────

export interface InsightInput {
  person: Person;
  memories: Memory[];
  interactions: Interaction[];
  /** Open promises — the conversation starter can build on them. */
  promises?: PersonPromise[];
}

function buildContext({ person, memories, interactions, promises }: InsightInput) {
  const recentMemories = [...memories]
    .sort((a, b) => (b.occurred_at || b.created_at).localeCompare(a.occurred_at || a.created_at))
    .slice(0, 5)
    .map((m) => ({
      content: m.content.slice(0, 280),
      emotion: m.emotion,
      when: (m.occurred_at || m.created_at).slice(0, 10),
    }));

  const recentInteractions = [...interactions]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((i) => ({
      type: i.type,
      note: i.note ? i.note.slice(0, 200) : null,
      when: i.created_at.slice(0, 10),
    }));

  return {
    today: new Date().toISOString().slice(0, 10),
    name: person.name,
    relationship: person.relationship_type,
    interests: person.interests ?? [],
    notes: (person.notes ?? []).map((n) => ({
      text: n.text.slice(0, 280),
      when: n.created_at.slice(0, 10),
    })),
    recent_memories: recentMemories,
    recent_interactions: recentInteractions,
    open_promises: (promises ?? [])
      .filter((p) => p.status === "open")
      .slice(0, 3)
      .map((p) => ({ text: p.text, due_hint: p.due_hint })),
  };
}

/** Stable digest of the inputs — cache key component. Not cryptographic. */
function digestOf(context: unknown): string {
  const s = JSON.stringify(context);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return String(hash);
}

// ─── On-device cache ────────────────────────────────────────────────────────

const CACHE_KEY = "ai-insights";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let _cache: CachedInsight[] | null = null;

async function loadCache(): Promise<CachedInsight[]> {
  if (_cache === null) {
    _cache = await loadCollection<CachedInsight>(CACHE_KEY);
  }
  return _cache;
}

function persistCache(): void {
  if (_cache) saveCollection(CACHE_KEY, _cache.slice(0, 100));
}

// ─── Transport ──────────────────────────────────────────────────────────────

async function callViaEdgeFunction(
  context: ReturnType<typeof buildContext>
): Promise<PersonInsight | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("ai-insight", {
    body: { context },
  });
  if (error || !data?.insight) return null;
  return data.insight as PersonInsight;
}

/**
 * DEV ONLY — direct call from the device. The key is visible in the
 * bundle; never configure EXPO_PUBLIC_ANTHROPIC_API_KEY for a release.
 *
 * Raw fetch by necessity, not preference: the official @anthropic-ai/sdk
 * imports node:fs at its entry point, which Metro cannot bundle for
 * React Native. The production path (the ai-insight edge function) uses
 * the official SDK; this dev path mirrors its exact request shape.
 */
async function callDirect(
  context: ReturnType<typeof buildContext>
): Promise<PersonInsight | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": DEV_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "low", // short, simple generation — keep mobile latency tight
        format: { type: "json_schema", schema: INSIGHT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is everything I know about this person:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const response = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };

  if (response.stop_reason === "refusal") return null;
  const text = response.content?.find((b) => b.type === "text");
  if (!text?.text) return null;
  try {
    return JSON.parse(text.text) as PersonInsight;
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate (or return cached) insight for a person. Returns null when AI
 * isn't configured, the inputs are too thin to say anything specific, or
 * the request fails — callers fall back to the heuristic engine.
 */
export async function generatePersonInsight(
  input: InsightInput
): Promise<PersonInsight | null> {
  if (!isAIConfigured()) return null;

  // Nothing to boost: no notes, no memories, no noted interactions.
  const hasSignal =
    (input.person.notes?.length ?? 0) > 0 ||
    input.memories.length > 0 ||
    input.interactions.some((i) => i.note);
  if (!hasSignal) return null;

  const context = buildContext(input);
  const digest = digestOf(context);

  const cache = await loadCache();
  const cached = cache.find((c) => c.person_id === input.person.id);
  if (
    cached &&
    cached.digest === digest &&
    Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS
  ) {
    return cached;
  }

  try {
    const insight = isSupabaseConfigured
      ? await callViaEdgeFunction(context)
      : await callDirect(context);
    if (!insight) return null;

    _cache = [
      {
        ...insight,
        person_id: input.person.id,
        digest,
        created_at: new Date().toISOString(),
      },
      ...cache.filter((c) => c.person_id !== input.person.id),
    ];
    persistCache();
    return insight;
  } catch {
    // Network/auth failure — quiet fallback to heuristics.
    return null;
  }
}
