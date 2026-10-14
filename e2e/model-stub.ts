// The model, for the acceptance harness only (never production): the real
// ai-gateway, served locally (`npx supabase functions serve`), is pointed
// here with ANTHROPIC_BASE_URL. Nothing in the gateway changes.
//
//   replay (default)  answers each note with a captured structured reply from
//                     e2e/replies/*.json, chosen by the note's exact words and
//                     the variant selected with POST /__variant.
//   record            forwards the request unchanged to the real Messages API
//                     (ANTHROPIC_API_KEY from the ignored env file) and saves
//                     the structured reply to e2e/.captured/ (gitignored).
//                     Capped at RECORD_LIMIT calls per run.
//
// Run: deno run --allow-net --allow-read --allow-write --allow-env e2e/model-stub.ts [--record]

const PORT = Number(Deno.env.get("STUB_PORT") ?? 8790);
const RECORD = Deno.args.includes("--record");
const RECORD_LIMIT = Number(Deno.env.get("RECORD_LIMIT") ?? 20);
const here = new URL(".", import.meta.url).pathname;

interface Variant { label: string; output: unknown }
interface Reply { note: string; variants: Variant[] }

function loadReplies(): Map<string, Reply> {
  const out = new Map<string, Reply>();
  for (const f of Deno.readDirSync(`${here}replies`)) {
    if (!f.name.endsWith(".json")) continue;
    const r = JSON.parse(Deno.readTextFileSync(`${here}replies/${f.name}`)) as Reply;
    out.set(r.note, r);
  }
  return out;
}

const selected = new Map<string, string>();
let recorded = 0;

function noteOf(body: { messages?: { content?: unknown }[] }): string | null {
  const content = body.messages?.[0]?.content;
  const text = typeof content === "string" ? content
    : Array.isArray(content) ? content.map((c) => (c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : "")).join("") : "";
  const m = text.match(/<note>\n([\s\S]*?)\n<\/note>/u);
  return m ? m[1].replace(/<\\\/note/giu, "</note") : null;
}

/** The roster as the gateway sent it: display name → key ("Chris" → "p5"). */
function rosterOf(body: { messages?: { content?: unknown }[] }): Map<string, string> {
  const content = body.messages?.[0]?.content;
  const text = typeof content === "string" ? content
    : Array.isArray(content) ? content.map((c) => (c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : "")).join("") : "";
  const block = text.match(/<roster>\n([\s\S]*?)\n?<\/roster>/u)?.[1] ?? "";
  const out = new Map<string, string>();
  for (const line of block.split("\n")) {
    const m = line.match(/^(p\d+): ([^·]+?)(?: · |$)/u);
    if (m) out.set(m[2].trim(), m[1]);
  }
  return out;
}

/** Existing memories as the gateway sent them: statement → key ("Anthony and Sam love…" → "m1"). */
function memoriesOf(body: { messages?: { content?: unknown }[] }): Map<string, string> {
  const content = body.messages?.[0]?.content;
  const text = typeof content === "string" ? content
    : Array.isArray(content) ? content.map((c) => (c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : "")).join("") : "";
  const block = text.match(/<existing_memories>\n([\s\S]*?)\n?<\/existing_memories>/u)?.[1] ?? "";
  const out = new Map<string, string>();
  for (const line of block.split("\n")) {
    const m = line.match(/^(m\d+): .*? — (.*)$/u);
    if (m) out.set(m[2].trim(), m[1]);
  }
  return out;
}

/** Replies name people as "@Display Name" and existing memories as "@memory:<its words>"; the account's own keys replace them. */
function withKeys(v: unknown, roster: Map<string, string>, memories = new Map<string, string>()): unknown {
  if (typeof v === "string" && v.startsWith("@memory:")) return memories.get(v.slice(8)) ?? null;
  if (typeof v === "string" && v.startsWith("@")) return roster.get(v.slice(1)) ?? "unknown";
  if (Array.isArray(v)) return v.map((x) => withKeys(x, roster, memories));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "person" || k === "target" || typeof x === "object" ? withKeys(x, roster, memories) : x]));
  return v;
}
function withNames(v: unknown, roster: Map<string, string>): unknown {
  const byKey = new Map([...roster].map(([name, key]) => [key, name]));
  const walk = (x: unknown, field = ""): unknown => {
    if (typeof x === "string" && field === "person" && byKey.has(x)) return `@${byKey.get(x)}`;
    if (Array.isArray(x)) return x.map((y) => walk(y, field));
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y, k)]));
    return x;
  };
  return walk(v);
}

function message(output: unknown, model: string) {
  return {
    id: `msg_stub_${crypto.randomUUID()}`, type: "message", role: "assistant", model,
    content: [{ type: "text", text: JSON.stringify(output) }], stop_reason: "end_turn", stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  };
}

Deno.serve({ port: PORT, hostname: "0.0.0.0" }, async (req) => {
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === "/__variant") {
    const { note, label } = await req.json() as { note: string; label: string };
    selected.set(note, label);
    return Response.json({ ok: true });
  }
  if (req.method !== "POST" || !url.pathname.endsWith("/v1/messages")) return new Response("not found", { status: 404 });
  const raw = await req.text();
  const body = JSON.parse(raw) as { model?: string; messages?: { content?: unknown }[] };
  const note = noteOf(body);
  if (RECORD) {
    if (recorded >= RECORD_LIMIT) return Response.json({ type: "error", error: { type: "overloaded_error", message: "record limit" } }, { status: 529 });
    recorded++;
    const key = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const started = performance.now();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", body: raw,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01" },
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { content?: { type: string; text?: string }[]; usage?: unknown; stop_reason?: string };
      const block = json.content?.find((c) => c.type === "text");
      Deno.mkdirSync(`${here}.captured`, { recursive: true });
      const output = block?.text ? JSON.parse(block.text) : null;
      Deno.writeTextFileSync(`${here}.captured/${Date.now()}-${recorded}.json`, JSON.stringify({
        note, model: body.model, status: res.status, stop_reason: json.stop_reason, usage: json.usage,
        latency_ms: Math.round(performance.now() - started), output: withNames(output, rosterOf(body)),
      }, null, 2));
    } catch { /* an error body is passed through as it came */ }
    return new Response(text, { status: res.status, headers: { "content-type": "application/json" } });
  }
  const reply = note ? loadReplies().get(note) : undefined;
  if (!reply) return Response.json({ type: "error", error: { type: "invalid_request_error", message: `no captured reply for this note` } }, { status: 400 });
  const label = selected.get(note!) ?? reply.variants[0].label;
  const v = reply.variants.find((x) => x.label === label) ?? reply.variants[0];
  return Response.json(message(withKeys(v.output, rosterOf(body), memoriesOf(body)), body.model ?? "stub"));
});
console.log(`model stub on :${PORT} (${RECORD ? `record, up to ${RECORD_LIMIT}` : "replay"})`);
