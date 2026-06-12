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
    const { context } = await req.json();
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
