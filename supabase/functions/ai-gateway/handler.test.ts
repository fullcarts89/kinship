// ai-gateway guard rails (Checkpoint C), with fake auth, data, model and
// writes. Run: deno test supabase/functions
import type { StructuredRequest, StructuredResult } from "../_shared/ai/model.ts";
import { type CallLog, createGateway, type GatewayCaller, type GatewayDeps, type PendingReview, type ServiceOps, type WriteItem } from "./handler.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const CAPTURE = "00000000-0000-0000-0000-000000000c01";
const NOTE = "Ben runs Chicago Sunday. He's hoping to break four hours.";

const BEN_PROPOSAL = {
  items: [{
    kind: "event", person: "p1", person_mention: "Ben", subject: "person", related_relation: null, related_name: null,
    statement: "Ben runs Chicago Sunday", evidence: ["Ben runs Chicago Sunday", "He's hoping to break four hours"],
    certainty: "stated", sensitivity: "none", confidence: 0.95, date_text: "Sunday", date_direction: "future",
    detail: {
      event_type: "race", event_goal: "break four hours", category: null, attribute: null, value: null, firmness: null, topic: null,
      place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
    },
    existing: { action: "new", target: null },
  }],
  needs_clarification: null,
};

interface World {
  deps: GatewayDeps;
  modelCalls: StructuredRequest[];
  writes: { needsReview: boolean; items: WriteItem[]; version: string; review: PendingReview | null }[];
  releases: string[];
  logs: CallLog[];
  quota: number;
}

function world(opts: {
  consent?: boolean;
  flag?: boolean;
  capture?: boolean;
  claim?: "claimed" | "done" | "busy" | "missing";
  quota?: boolean;
  model?: Partial<StructuredResult> & { output?: unknown };
  writeThrows?: boolean;
  logThrows?: boolean;
  note?: string;
  people?: { id: string; display_name: string; full_name: string | null; nicknames: string[]; relationship_label: string | null; state: string }[];
  review?: PendingReview | null;
} = {}): World {
  const w: World = { modelCalls: [], writes: [], releases: [], logs: [], quota: 0, deps: undefined as unknown as GatewayDeps };
  const caller: GatewayCaller = {
    userId: "u1",
    hasConsent: () => Promise.resolve(opts.consent ?? true),
    consume: () => {
      w.quota++;
      return Promise.resolve(opts.quota ?? true);
    },
    flagEnabled: (key) => Promise.resolve(key === "ai_extraction" && (opts.flag ?? true)),
    loadCapture: (id) =>
      Promise.resolve(opts.capture === false || id !== CAPTURE ? null : {
        id, raw_text: opts.note ?? NOTE, occurred_at: "2026-10-09T02:14:00Z", time_zone: "America/Chicago", context_person_id: null,
      }),
    loadPeople: () => Promise.resolve({
      people: opts.people ?? [{ id: "person-ben", display_name: "Ben", full_name: "Ben Ortiz", nicknames: [], relationship_label: "college roommate", state: "active" }],
      related: [],
    }),
    loadItems: () => Promise.resolve([]),
    loadReview: () => Promise.resolve(opts.review ?? null),
  };
  const service: ServiceOps = {
    claim: () => Promise.resolve(opts.claim ?? "claimed"),
    release: (_u, _c, status) => {
      w.releases.push(status);
      return Promise.resolve();
    },
    write: (_u, _c, version, needsReview, items, review) => {
      if (opts.writeThrows) return Promise.reject(new Error("write failed (23503)"));
      w.writes.push({ needsReview, items, version, review });
      return Promise.resolve(items.map((_, i) => ({ id: `item-${i}`, action: "new" })));
    },
    log: (row) => {
      if (opts.logThrows) return Promise.reject(new Error("log down"));
      w.logs.push(row);
      return Promise.resolve();
    },
  };
  w.deps = {
    authenticate: (token) => Promise.resolve(token === "good" ? caller : null),
    model: (req) => {
      w.modelCalls.push(req);
      return Promise.resolve({
        outcome: "ok", output: BEN_PROPOSAL, usage: { input: 2100, output: 600, cacheRead: 1800, cacheWrite: 0 }, latencyMs: 2900, errorKind: null,
        ...opts.model,
      } as StructuredResult);
    },
    service,
    dailyLimit: 50,
    consentVersion: 1,
    allowedOrigins: [],
  };
  return w;
}

function post(body: unknown, token: string | null = "good"): Request {
  return new Request("http://local/ai-gateway", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const extract = { capability: "relationship_extract", input_ref: { capture_id: CAPTURE } };
const call = async (w: World, req: Request) => {
  const res = await createGateway(w.deps)(req);
  return { status: res.status, body: await res.json() };
};

Deno.test("refuses before spending anything: auth, consent, body, flag, ownership", async () => {
  let w = world();
  eq((await call(w, post(extract, null))).status, 401);
  eq((await call(w, post(extract, "anon-key"))).status, 401);
  w = world({ consent: false });
  eq(await call(w, post(extract)), { status: 403, body: { error: "consent_required" } });
  w = world();
  eq((await call(w, post("{not json"))).status, 400);
  eq((await call(w, post({ capability: "reason_generate", input_ref: { capture_id: CAPTURE } }))).status, 400);
  eq((await call(w, post({ capability: "relationship_extract", input_ref: { capture_id: "x; drop table" } }))).status, 400);
  eq((await call(w, post("x".repeat(5000)))).status, 400);
  w = world({ flag: false });
  eq(await call(w, post(extract)), { status: 403, body: { error: "feature_disabled" } });
  w = world({ capture: false });
  eq((await call(w, post(extract))).status, 404);
  eq(w.modelCalls.length + w.quota, 0, "no model call and no quota spent on any refusal");
});

Deno.test("one extraction per capture: a retry after success costs nothing", async () => {
  let w = world({ claim: "done" });
  eq(await call(w, post(extract)), { status: 200, body: { status: "done", held: [], clarification: null } });
  eq([w.modelCalls.length, w.quota], [0, 0]);
  w = world({ claim: "busy" });
  eq((await call(w, post(extract))).status, 409);
  eq(w.modelCalls.length, 0);
});

Deno.test("quota spent: the capture is handed back untouched", async () => {
  const w = world({ quota: false });
  eq((await call(w, post(extract))).status, 429);
  eq(w.releases, ["pending"]);
  eq(w.modelCalls.length, 0);
});

Deno.test("the vertical slice end to end: model → pipeline → one write → content-free log", async () => {
  const w = world();
  const { status, body } = await call(w, post({ ...extract, dossier: ["Ben is my brother"], roster: [{ name: "Mallory" }] }));
  eq(status, 200);
  eq(body.tier, "auto");
  eq(body.saved.length, 1);
  eq(body.saved[0].detail, { event_type: "race", followup_policy: "after", date_precision: "day", date: "2026-10-11", date_hint: "Sunday", event_goal: "break four hours" });
  eq(body.saved[0].id, "item-0");
  eq(w.writes.length, 1);
  eq(w.writes[0].needsReview, false);
  eq(w.writes[0].version, "relationship_extract/v2+claude-opus-5-5");
  eq(w.writes[0].items[0].spans, [{ start: 0, end: 23 }, { start: 25, end: 56 }]);
  eq(w.writes[0].items[0].person_id, "person-ben");
  // The model saw the server's data, never the request body's.
  const content = w.modelCalls[0].content;
  eq([content.includes("Mallory"), content.includes("my brother"), content.includes("Ben")], [false, false, true]);
  eq(w.modelCalls[0].model, "claude-opus-5-5");
  eq(w.modelCalls[0].effort, "low");
  // The log has numbers and identifiers only.
  const log = JSON.stringify(w.logs[0]);
  for (const word of ["Ben", "Chicago", "four hours", "Sunday", "u1", "person-ben", CAPTURE]) {
    eq(log.includes(word), false, `log contains "${word}"`);
  }
  eq(w.logs[0].outcome, "ok");
  eq(w.logs[0].items_saved, 1);
});

Deno.test("a declined note is kept raw, quietly; other model failures ask to retry later", async () => {
  let w = world({ model: { outcome: "refused", output: null } });
  eq(await call(w, post(extract)), { status: 200, body: { status: "kept" } });
  eq(w.releases, ["failed"]);
  eq(w.writes.length, 0);
  eq(w.logs[0].outcome, "refused");
  w = world({ model: { outcome: "timeout", output: null } });
  eq((await call(w, post(extract))).status, 503);
  eq(w.releases, ["failed"]);
  w = world({ model: { outcome: "ok", output: { not: "a proposal" } } });
  eq((await call(w, post(extract))).status, 503);
  eq(w.logs[0].outcome, "invalid_output");
});

Deno.test("a failed write releases the capture and leaks nothing", async () => {
  const w = world({ writeThrows: true });
  const errors: string[] = [];
  const original = console.error;
  console.error = (...a: unknown[]) => errors.push(a.map(String).join(" "));
  try {
    eq(await call(w, post(extract)), { status: 500, body: { error: "internal_error" } });
  } finally {
    console.error = original;
  }
  eq(w.releases, ["failed"]);
  eq(errors.some((e) => e.includes("Ben") || e.includes("Chicago")), false);
});

Deno.test("a broken usage log never fails the user's request", async () => {
  const w = world({ logThrows: true });
  eq((await call(w, post(extract))).status, 200);
});

// C-2: a held item and its question are stored with the extraction, and a
// reopened app gets them back without a second model run.
Deno.test("held items are stored with the extraction and returned on reopen without a model call", async () => {
  const SAMS = [
    { id: "person-sam-lee", display_name: "Sam", full_name: "Sam Lee", nicknames: [], relationship_label: null, state: "active" },
    { id: "person-sam-diaz", display_name: "Sam", full_name: "Samantha Diaz", nicknames: [], relationship_label: null, state: "active" },
  ];
  const samProposal = {
    items: [{
      ...BEN_PROPOSAL.items[0], kind: "fact", person: "p1", person_mention: "Sam", statement: "Sam got the job",
      evidence: ["Sam got the job!"], confidence: 0.4, date_text: null,
      detail: { ...BEN_PROPOSAL.items[0].detail, event_type: null, event_goal: null, category: "work" },
    }],
    needs_clarification: { about: "person", mention: "Sam" },
  };
  let w = world({ note: "Sam got the job!", people: SAMS, model: { output: samProposal } });
  const first = await call(w, post(extract));
  eq(first.status, 200);
  eq(first.body.tier, "clarify");
  eq(w.writes.length, 1);
  eq(w.writes[0].items, [], "nothing becomes memory");
  eq(w.writes[0].needsReview, true);
  eq(w.writes[0].review?.items.map((i) => i.statement), ["Sam got the job"]);
  eq(w.writes[0].review?.clarification?.about, "person");

  w = world({ claim: "done", review: w.writes[0].review });
  const again = await call(w, post(extract));
  eq(again.body.held.map((i: { statement: string }) => i.statement), ["Sam got the job"]);
  eq(again.body.clarification.about, "person");
  eq([w.modelCalls.length, w.quota], [0, 0], "no second model run, no quota");
});
