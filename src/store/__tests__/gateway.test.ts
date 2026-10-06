// The ai-gateway client: typed replies, refusals by the gateway's own codes,
// and "no answer" kept distinct from a refusal.
import type { SupabaseClient } from "@supabase/supabase-js";
import { Gateway, GatewayRefused, GatewayUnreachable, supabaseGatewayTransport, type TransportReply } from "@/store/gateway";

const CAPTURE = "11111111-1111-4111-8111-111111111111";

function replying(...replies: TransportReply[]) {
  const sent: Record<string, unknown>[] = [];
  return {
    sent,
    gateway: new Gateway({
      async post(body) {
        sent.push(body);
        const r = replies.shift();
        if (!r) throw new GatewayUnreachable("nothing scripted");
        return r;
      },
    }),
  };
}

it("asks with ids only, and reads what was understood", async () => {
  const { gateway, sent } = replying({
    status: 200, retryAfter: null,
    body: { status: "extracted", tier: "clarify", saved: [], held: [{ statement: "x", tier: "hold", flags: [] }],
      clarification: { about: "person", question: "Which Sam do you mean?", options: [] }, review_created_at: "2026-10-09T02:14:05.123456+00:00" },
  });
  const r = await gateway.understand(CAPTURE);
  expect(sent).toEqual([{ capability: "relationship_extract", input_ref: { capture_id: CAPTURE } }]);
  expect(r).toMatchObject({ status: "extracted", tier: "clarify", review_created_at: "2026-10-09T02:14:05.123456+00:00" });
});

it("sends an answer with the review it answers, and closes", async () => {
  const { gateway, sent } = replying(
    { status: 200, retryAfter: null, body: { status: "already_resolved" } },
    { status: 200, retryAfter: null, body: { status: "nothing_waiting" } },
  );
  expect(await gateway.answer(CAPTURE, "2026-10-09T02:14:05Z", [{ index: 0, skip: true }])).toEqual({ status: "already_resolved" });
  expect(await gateway.close(CAPTURE)).toEqual({ status: "nothing_waiting" });
  expect(sent).toEqual([
    { capability: "relationship_extract", action: "resolve_review", input_ref: { capture_id: CAPTURE },
      review_created_at: "2026-10-09T02:14:05Z", answers: [{ index: 0, skip: true }] },
    { action: "close_review", input_ref: { capture_id: CAPTURE } },
  ]);
});

it("turns refusals into their codes, with the reason and retry time when given", async () => {
  const { gateway } = replying(
    { status: 403, retryAfter: null, body: { error: "consent_required" } },
    { status: 400, retryAfter: null, body: { error: "invalid_answer", reason: "relation_not_in_note" } },
    { status: 429, retryAfter: "3600", body: { error: "daily_limit_reached" } },
    { status: 401, retryAfter: null, body: { code: 401, message: "Invalid JWT" } },
    { status: 502, retryAfter: null, body: null },
    { status: 418, retryAfter: null, body: { error: "something new" } },
  );
  const refusal = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return e instanceof GatewayRefused ? [e.refusal, e.reason, e.retryAfterS] : String(e);
    }
    return "no refusal";
  };
  expect(await refusal(gateway.understand(CAPTURE))).toEqual(["consent_required", null, null]);
  expect(await refusal(gateway.answer(CAPTURE, "t", []))).toEqual(["invalid_answer", "relation_not_in_note", null]);
  expect(await refusal(gateway.understand(CAPTURE))).toEqual(["daily_limit_reached", null, 3600]);
  expect(await refusal(gateway.understand(CAPTURE))).toEqual(["unauthorized", null, null]);
  expect(await refusal(gateway.understand(CAPTURE))).toEqual(["try_later", null, null]);
  expect(await refusal(gateway.understand(CAPTURE))).toEqual(["internal_error", null, null]);
});

describe("over supabase-js", () => {
  function client(result: unknown) {
    const invoke = jest.fn().mockResolvedValue(result);
    return { invoke, client: { functions: { invoke } } as unknown as SupabaseClient };
  }

  it("posts to ai-gateway with a timeout and passes the reply through", async () => {
    const { invoke, client: c } = client({ data: { status: "kept" }, error: null, response: new Response("{}", { status: 200 }) });
    const reply = await supabaseGatewayTransport(c, 5000).post({ a: 1 });
    expect(invoke).toHaveBeenCalledWith("ai-gateway", { body: { a: 1 }, timeout: 5000 });
    expect(reply).toEqual({ status: 200, body: { status: "kept" }, retryAfter: null, serverMs: null });
  });

  it("passes ai-gateway's own time (Server-Timing) through for latency telemetry", async () => {
    const response = new Response("{}", { status: 200, headers: { "Server-Timing": "total;dur=3150" } });
    const { client: c } = client({ data: { status: "kept" }, error: null, response });
    expect((await supabaseGatewayTransport(c).post({})).serverMs).toBe(3150);
  });

  it("reads an HTTP refusal's body and Retry-After", async () => {
    const response = new Response(JSON.stringify({ error: "daily_limit_reached" }), { status: 429, headers: { "Retry-After": "120" } });
    const err = Object.assign(new Error("non-2xx"), { name: "FunctionsHttpError" });
    const { client: c } = client({ data: null, error: err, response });
    expect(await supabaseGatewayTransport(c).post({})).toEqual({ status: 429, body: { error: "daily_limit_reached" }, retryAfter: "120", serverMs: null });
  });

  it("no answer at all (offline, timeout, relay) is GatewayUnreachable", async () => {
    for (const name of ["FunctionsFetchError", "FunctionsRelayError"]) {
      const { client: c } = client({ data: null, error: Object.assign(new Error("x"), { name }), response: undefined });
      await expect(supabaseGatewayTransport(c).post({})).rejects.toBeInstanceOf(GatewayUnreachable);
    }
  });

  it("a request that ran out of time is told apart from no connection", async () => {
    const timedOut = Object.assign(new Error("x"), { name: "FunctionsFetchError", context: { name: "TimeoutError" } });
    const { client: c } = client({ data: null, error: timedOut, response: undefined });
    await expect(supabaseGatewayTransport(c).post({})).rejects.toThrow("timeout");
  });
});
