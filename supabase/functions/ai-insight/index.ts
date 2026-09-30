// Supabase Edge Function: ai-insight
//
// Server-side proxy for Kinship's AI signal boosting. Holds the
// Anthropic API key (set via `supabase secrets set ANTHROPIC_API_KEY=...`)
// so it never ships in the app bundle. The app invokes this with a
// compact person context and receives one warm, specific suggestion.
//
// Guard rails, in the order they run:
//   1. The caller must be a signed-in, non-anonymous user, checked with
//      Supabase Auth. The platform's JWT check passes for the public anon
//      key the app ships, so it can't be the only gate.            → 401
//   2. The body is size-capped and validated per mode; only validated
//      fields ever reach a prompt.                                  → 400
//   3. Per-user daily quota via consume_ai_call() (migration 008).  → 429
//   4. Anything else is logged here; the client gets a generic code. → 500
//
// Deploy:  supabase functions deploy ai-insight   (keep JWT verification on)
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional: AI_MODEL, AI_DAILY_LIMIT (default 50), AI_ALLOWED_ORIGINS

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-opus-4-8";

/** Model calls each signed-in user may make per UTC day. */
const DAILY_LIMIT = positiveInt(Deno.env.get("AI_DAILY_LIMIT"), 50);

/**
 * Every mode answers with a few short JSON fields (well under 300 tokens).
 * This caps what any single call can cost while leaving headroom for brief
 * thinking on models where it's always on.
 */
const MAX_OUTPUT_TOKENS = 2048;

/**
 * Input ceilings. The app (src/lib/aiInsightService.ts) trims its payloads
 * to fit; anything over is rejected with 400, never silently truncated.
 * Text lengths are JS string lengths, matching the app's .slice() calls.
 */
const LIMITS = {
  bodyBytes: 64 * 1024,
  contextChars: 16_000, // JSON.stringify(context).length
  shortText: 100, // names, labels, interests, due hints
  noteText: 280, // one note, memory, interaction note, or promise
  extractText: 500, // the note checked by extract_promise
  interests: 20,
  notes: 20,
  memories: 5,
  interactions: 5,
  promises: 3,
  seasonPeople: 10,
  sampleMemories: 5,
  count: 100_000,
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/**
 * The native app makes no CORS requests, so by default no browser origin
 * is allowed. A web build would list its origin(s) here, comma-separated.
 */
const ALLOWED_ORIGINS = (Deno.env.get("AI_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

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
  type: "object",
  properties: {
    headline: { type: "string", description: "Warm headline, max 8 words, no guilt or urgency" },
    body: { type: "string", description: "1-2 sentences explaining the opening, grounded in a specific detail" },
    conversation_starter: { type: "string", description: "A casual, human message the user could send nearly verbatim" },
  },
  required: ["headline", "body", "conversation_starter"],
  additionalProperties: false,
};

const EXTRACT_SYSTEM = `You detect whether a short personal note contains a commitment the WRITER made to the person the note is about. Only first-person commitments by the writer count ("I said I'd...", "need to send her...", "told him I'd..."). Things the OTHER person promised do not count. Plans that are facts, not the writer's obligations ("her wedding is in June"), do not count.

If a commitment exists: rewrite it as a short imperative ("Send Tom the book link"), and extract a due hint ONLY if one is stated — as an ISO date (YYYY-MM-DD) when derivable from today's date, otherwise the stated phrase ("after the wedding"). Be conservative: when unsure, is_promise is false.`;

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    is_promise: { type: "boolean" },
    promise_text: { type: ["string", "null"], description: "Short imperative form, or null" },
    due_hint: { type: ["string", "null"], description: "ISO date or stated phrase, or null" },
  },
  required: ["is_promise", "promise_text", "due_hint"],
  additionalProperties: false,
};

const REFLECT_SYSTEM = `You write one short, warm reflection paragraph closing a "season" of intentional friendship-tending in Kinship, a calm garden app. You receive what actually happened: people tended, memories kept, moments shared.

Rules (inviolable):
- Report only what HAPPENED. Never name what didn't happen, never compare against intentions, never imply falling short.
- If little happened, say less — one true warm sentence beats manufactured positivity.
- Ground it in specifics (names, a memory detail) when available.
- 2-4 sentences, second person ("you"), warm but not saccharine. No emoji.`;

const REFLECT_SCHEMA = {
  type: "object",
  properties: {
    reflection: { type: "string", description: "2-4 warm sentences" },
  },
  required: ["reflection"],
  additionalProperties: false,
};

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, cors);
  }

  let userId = "unknown";
  try {
    const caller = await authenticate(req);
    if (!caller) {
      return json({ error: "unauthorized" }, 401, cors);
    }
    userId = caller.userId;

    // Validate before spending quota: a malformed request costs nothing.
    const request = parseRequest(record(await readJson(req), "body"));

    const { data: allowed, error } = await caller.db.rpc("consume_ai_call", {
      daily_limit: DAILY_LIMIT,
    });
    if (error) throw new Error(`quota check failed: ${error.message}`);
    if (allowed !== true) {
      return json({ error: "daily_limit_reached" }, 429, {
        ...cors,
        "Retry-After": String(secondsUntilUtcMidnight()),
      });
    }

    return json(request.respond(await generate(request)), 200, cors);
  } catch (err) {
    if (err instanceof InputError) {
      console.warn(`ai-insight: rejected input from ${userId}: ${err.message}`);
      return json({ error: err.code }, 400, cors);
    }
    console.error(`ai-insight: request from ${userId} failed:`, err);
    return json({ error: "internal_error" }, 500, cors);
  }
});

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * Resolves the caller from their Supabase access token. Null for anything
 * that isn't a signed-in, non-anonymous user — including the anon key,
 * which carries no user. The returned client acts as that user, so the
 * quota RPC runs under their identity and RLS.
 */
async function authenticate(req: Request) {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await db.auth.getUser(token);
  // A rejected token (4xx: anon key, expired, revoked session) is the
  // caller's problem → 401. Auth erroring or unreachable is ours → 500.
  const status = error?.status ?? 0;
  if (error && (status < 400 || status >= 500)) throw error;
  const user = data.user;
  if (!user || user.is_anonymous) return null;
  return { userId: user.id, db };
}

// ─── Request parsing ────────────────────────────────────────────────────────

class InputError extends Error {
  constructor(
    readonly code: "invalid_request" | "input_too_large",
    detail: string,
  ) {
    super(detail);
  }
}

interface ModelRequest {
  system: string;
  schema: Record<string, unknown>;
  content: string;
  /** Wraps the model's output in the response shape the app expects. */
  respond: (output: unknown) => Record<string, unknown>;
}

/** Reads the JSON body under a hard byte cap; Content-Length can be absent or wrong. */
async function readJson(req: Request): Promise<unknown> {
  if (Number(req.headers.get("Content-Length")) > LIMITS.bodyBytes) {
    throw new InputError("input_too_large", "body over the byte limit");
  }
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  for await (const chunk of req.body ?? []) {
    bytes += chunk.byteLength;
    if (bytes > LIMITS.bodyBytes) {
      throw new InputError("input_too_large", "body over the byte limit");
    }
    raw += decoder.decode(chunk, { stream: true });
  }
  raw += decoder.decode();
  try {
    return JSON.parse(raw);
  } catch {
    throw new InputError("invalid_request", "body is not valid JSON");
  }
}

function parseRequest(body: Record<string, unknown>): ModelRequest {
  switch (body.mode) {
    case undefined:
      return insightRequest(body);
    case "extract_promise":
      return extractRequest(body);
    case "season_reflection":
      return reflectionRequest(body);
    default:
      throw new InputError("invalid_request", "unknown mode");
  }
}

/** Default mode: one suggestion from a person context built by the app. */
function insightRequest(body: Record<string, unknown>): ModelRequest {
  if (JSON.stringify(body.context ?? null).length > LIMITS.contextChars) {
    throw new InputError("input_too_large", `context over ${LIMITS.contextChars} characters`);
  }
  const c = record(body.context, "context");
  // Rebuilt field by field (same order as the app's buildContext), so
  // unknown fields never reach the prompt.
  const context = {
    today: isoDay(c.today, "context.today"),
    name: requiredText(c.name, "context.name", LIMITS.shortText),
    relationship: text(c.relationship, "context.relationship", LIMITS.shortText),
    interests: list(c.interests, "context.interests", LIMITS.interests, (v, path) =>
      text(v, path, LIMITS.shortText)
    ),
    notes: list(c.notes, "context.notes", LIMITS.notes, (v, path) => {
      const note = record(v, path);
      return {
        text: text(note.text, `${path}.text`, LIMITS.noteText),
        when: isoDay(note.when, `${path}.when`),
      };
    }),
    recent_memories: list(
      c.recent_memories,
      "context.recent_memories",
      LIMITS.memories,
      (v, path) => {
        const memory = record(v, path);
        return {
          content: text(memory.content, `${path}.content`, LIMITS.noteText),
          emotion: nullableText(memory.emotion, `${path}.emotion`, LIMITS.shortText),
          when: isoDay(memory.when, `${path}.when`),
        };
      },
    ),
    recent_interactions: list(
      c.recent_interactions,
      "context.recent_interactions",
      LIMITS.interactions,
      (v, path) => {
        const interaction = record(v, path);
        return {
          type: text(interaction.type, `${path}.type`, LIMITS.shortText),
          note: nullableText(interaction.note, `${path}.note`, LIMITS.noteText),
          when: isoDay(interaction.when, `${path}.when`),
        };
      },
    ),
    open_promises: list(c.open_promises, "context.open_promises", LIMITS.promises, (v, path) => {
      const promise = record(v, path);
      return {
        text: text(promise.text, `${path}.text`, LIMITS.noteText),
        due_hint: nullableText(promise.due_hint, `${path}.due_hint`, LIMITS.shortText),
      };
    }),
  };
  return {
    system: SYSTEM_PROMPT,
    schema: INSIGHT_SCHEMA,
    content: `Here is everything I know about this person:\n${JSON.stringify(context, null, 2)}`,
    respond: (insight) => ({ insight }),
  };
}

/** extract_promise: classify a note for a held commitment. */
function extractRequest(body: Record<string, unknown>): ModelRequest {
  const note = requiredText(body.text, "text", LIMITS.extractText);
  const personName = text(body.person_name, "person_name", LIMITS.shortText);
  const today = isoDay(body.today, "today");
  return {
    system: EXTRACT_SYSTEM,
    schema: EXTRACT_SCHEMA,
    content: `Note about ${personName} (today is ${today}):\n"${note}"`,
    respond: (extraction) => ({ extraction }),
  };
}

/** season_reflection: close a tending season warmly. */
function reflectionRequest(body: Record<string, unknown>): ModelRequest {
  const season = {
    seasonName: requiredText(body.seasonName, "seasonName", LIMITS.shortText),
    people: list(body.people, "people", LIMITS.seasonPeople, (v, path) => {
      const person = record(v, path);
      return {
        name: text(person.name, `${path}.name`, LIMITS.shortText),
        memoriesKept: count(person.memoriesKept, `${path}.memoriesKept`),
        momentsShared: count(person.momentsShared, `${path}.momentsShared`),
      };
    }),
    sampleMemories: list(body.sampleMemories, "sampleMemories", LIMITS.sampleMemories, (v, path) =>
      text(v, path, LIMITS.noteText)
    ),
  };
  return {
    system: REFLECT_SYSTEM,
    schema: REFLECT_SCHEMA,
    content: JSON.stringify(season, null, 2),
    respond: (output) => ({
      reflection: (output as { reflection?: string } | null)?.reflection ?? null,
    }),
  };
}

// ─── Field validators ───────────────────────────────────────────────────────

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InputError("invalid_request", `${path}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, max: number): string {
  if (typeof value !== "string") {
    throw new InputError("invalid_request", `${path}: expected a string`);
  }
  if (value.length > max) {
    throw new InputError("input_too_large", `${path}: over ${max} characters`);
  }
  return value;
}

function requiredText(value: unknown, path: string, max: number): string {
  const s = text(value, path, max);
  if (!s.trim()) throw new InputError("invalid_request", `${path}: empty`);
  return s;
}

function nullableText(value: unknown, path: string, max: number): string | null {
  return value === null || value === undefined ? null : text(value, path, max);
}

function isoDay(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InputError("invalid_request", `${path}: expected YYYY-MM-DD`);
  }
  return value;
}

function count(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > LIMITS.count) {
    throw new InputError("invalid_request", `${path}: expected a small non-negative integer`);
  }
  return value;
}

/** A missing list is an empty one; a present one must be an array under max. */
function list<T>(
  value: unknown,
  path: string,
  max: number,
  item: (value: unknown, path: string) => T,
): T[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new InputError("invalid_request", `${path}: expected an array`);
  }
  if (value.length > max) {
    throw new InputError("input_too_large", `${path}: over ${max} items`);
  }
  return value.map((v, i) => item(v, `${path}[${i}]`));
}

// ─── Model call ─────────────────────────────────────────────────────────────

/** One structured-output call. Null when the model declines or runs out of room. */
async function generate({ system, schema, content }: ModelRequest): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema },
    },
    system,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") return null;
  if (response.stop_reason === "max_tokens") {
    console.warn("ai-insight: output hit max_tokens; returning no result");
    return null;
  }
  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? JSON.parse(block.text) : null;
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function secondsUntilUtcMidnight(now = new Date()): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((midnight - now.getTime()) / 1000);
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
