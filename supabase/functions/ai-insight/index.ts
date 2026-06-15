// Supabase Edge Function: ai-insight
//
// Server-side proxy for Kinship's AI signal boosting. Holds the
// Anthropic API key (set via `supabase secrets set ANTHROPIC_API_KEY=...`)
// so it never ships in the app bundle. The app invokes this with a
// compact person context and receives one warm, specific suggestion.
//
// Deploy:  supabase functions deploy ai-insight
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-opus-4-8";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Mode: extract_promise — classify a note for a held commitment
    if (body.mode === "extract_promise") {
      const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
      const response = await client.messages.create({
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
            content: `Note about ${body.person_name} (today is ${body.today}):\n"${String(body.text).slice(0, 500)}"`,
          },
        ],
      });
      const textBlock =
        response.stop_reason === "refusal"
          ? null
          : response.content.find((b: { type: string }) => b.type === "text");
      const extraction =
        textBlock && "text" in textBlock ? JSON.parse(textBlock.text) : null;
      return new Response(JSON.stringify({ extraction }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: season_reflection — close a tending season warmly
    if (body.mode === "season_reflection") {
      const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: REFLECT_SCHEMA },
        },
        system: REFLECT_SYSTEM,
        messages: [
          {
            role: "user",
            content: JSON.stringify(
              {
                seasonName: body.seasonName,
                people: body.people,
                sampleMemories: body.sampleMemories,
              },
              null,
              2,
            ),
          },
        ],
      });
      const textBlock =
        response.stop_reason === "refusal"
          ? null
          : response.content.find((b: { type: string }) => b.type === "text");
      const reflection =
        textBlock && "text" in textBlock
          ? JSON.parse(textBlock.text).reflection
          : null;
      return new Response(JSON.stringify({ reflection }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { context } = body;
    if (!context) {
      return new Response(JSON.stringify({ error: "missing context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: INSIGHT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is everything I know about this person:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return new Response(JSON.stringify({ insight: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = response.content.find(
      (b: { type: string }) => b.type === "text",
    );
    const insight = text && "text" in text ? JSON.parse(text.text) : null;

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
