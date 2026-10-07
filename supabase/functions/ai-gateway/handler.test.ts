// ai-gateway guard rails (Checkpoint C), with fake auth, data, model and
// writes. Run: deno test supabase/functions
import type { StructuredRequest, StructuredResult } from "../_shared/ai/model.ts";
import type { ItemRow } from "../_shared/extraction/context.ts";
import type { ResolvedItem } from "../_shared/extraction/resolve.ts";
import {
  type CallLog,
  createGateway,
  type GatewayCaller,
  type GatewayDeps,
  type PendingReview,
  ServiceError,
  type ServiceOps,
  type StoredReview,
  type WriteItem,
} from "./handler.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const CAPTURE = "00000000-0000-0000-0000-000000000c01";
const STORED_AT = "2026-10-09T02:14:05.123456+00:00";
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
  resolves: { createdAt: string; items: ResolvedItem[]; newPeople: { ref: string; display_name: string }[] }[];
  closes: string[];
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
  review?: StoredReview | null;
  resolveResult?: Awaited<ReturnType<ServiceOps["resolve"]>> | ServiceError;
  closes?: boolean;
  /** Memory already kept, per person (loadItems answers for the ids asked). */
  items?: ItemRow[];
} = {}): World {
  const w: World = { modelCalls: [], writes: [], resolves: [], closes: [], releases: [], logs: [], quota: 0, deps: undefined as unknown as GatewayDeps };
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
    loadItems: (ids) => Promise.resolve((opts.items ?? []).filter((m) => ids.includes(m.person_id))),
    loadReview: () => Promise.resolve(opts.review === undefined ? (w.writes.at(-1)?.review ? { ...w.writes.at(-1)!.review!, created_at: STORED_AT } as StoredReview : null) : opts.review),
    closeReview: (id) => {
      w.closes.push(id);
      return Promise.resolve(opts.closes ?? true);
    },
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
    resolve: (_u, _c, createdAt, items, newPeople) => {
      if (opts.resolveResult instanceof ServiceError) return Promise.reject(opts.resolveResult);
      w.resolves.push({ createdAt, items, newPeople });
      return Promise.resolve(opts.resolveResult ?? {
        status: "resolved", items: items.map((_, i) => ({ id: `resolved-${i}`, action: "new" })),
        people: Object.fromEntries(newPeople.map((p, i) => [p.ref, `new-person-${i}`])),
      });
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
  eq(await call(w, post(extract)), { status: 200, body: { status: "done", held: [], clarification: null, review_created_at: null } });
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
  eq(w.writes[0].version, "relationship_extract/v6+claude-opus-5-5");
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

  eq(first.body.review_created_at, STORED_AT, "the answer can say which version of the question it answers");
  eq(w.writes[0].review?.items[0].confidence, 0.4, "held items keep their confidence…");
  eq(w.writes[0].review?.items[0].action, { type: "new", target_id: null }, "…and the proposed action, for the write after the answer");

  w = world({ claim: "done", review: { ...w.writes[0].review!, created_at: STORED_AT } as StoredReview });
  const again = await call(w, post(extract));
  eq(again.body.held.map((i: { statement: string }) => i.statement), ["Sam got the job"]);
  eq(again.body.clarification.about, "person");
  eq(again.body.review_created_at, STORED_AT);
  eq([w.modelCalls.length, w.quota], [0, 0], "no second model run, no quota");
});

// ─── Checkpoint D1: answering what was held ─────────────────────────────────

const SAM_NOTE = "Sam got the job!";
const SAMS = [
  { id: "person-sam-lee", display_name: "Sam", full_name: "Sam Lee", nicknames: [], relationship_label: null, state: "active" },
  { id: "person-sam-diaz", display_name: "Sam", full_name: "Samantha Diaz", nicknames: [], relationship_label: null, state: "active" },
];
const HELD_SAM: StoredReview = {
  items: [{
    kind: "fact", person_id: null, new_person_name: null, subject_type: "person", related: null, statement: "Sam got the job",
    detail: { category: "work" }, certainty: "stated", sensitivity: "none", confidence: 0.7, action: { type: "new", target_id: null },
    tier: "hold", flags: ["person_ambiguous"], spans: [{ start: 0, end: 15, quote: "Sam got the job" }],
  }],
  clarification: { about: "person", question: "Which Sam do you mean?", options: ["Sam", "Sam", "Someone else"] },
  created_at: STORED_AT,
};
const resolveBody = (answers: unknown, createdAt = STORED_AT) => ({
  action: "resolve_review", input_ref: { capture_id: CAPTURE }, review_created_at: createdAt, answers,
});

Deno.test("an answer is checked, written and closed in one step, with no model call", async () => {
  const w = world({ note: SAM_NOTE, people: SAMS, review: HELD_SAM });
  const { status, body } = await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }])));
  eq(status, 200);
  eq(body.status, "resolved");
  eq(body.saved.map((i: { person_id: string; statement: string; id: string }) => [i.person_id, i.statement, i.id]), [["person-sam-lee", "Sam got the job", "resolved-0"]]);
  eq(w.resolves.length, 1);
  eq(w.resolves[0].createdAt, STORED_AT);
  eq(w.resolves[0].items[0].spans, [{ start: 0, end: 15, quote: "Sam got the job" }]);
  eq([w.modelCalls.length, w.quota, w.logs.length], [0, 0, 0], "no model, no quota, nothing to log");
});

Deno.test("I10: the answer to a held mirror's 'which Sam' joins the line kept for its twin (loaded for the answer), never a second copy", async () => {
  const note = "Michelle and Sam might be moving to Australia.";
  const quote = "Michelle and Sam might be moving to Australia";
  const people = [
    { id: "person-michelle", display_name: "Michelle Lee", full_name: "Michelle Lee", nicknames: [], relationship_label: null, state: "active" },
    ...SAMS,
  ];
  const mirror: StoredReview = {
    items: [{
      kind: "thread", person_id: null, new_person_name: null, subject_type: "person", related: null,
      statement: "Sam might be moving to Australia with Michelle", detail: { topic: "moving to Australia" }, certainty: "tentative",
      sensitivity: "none", confidence: 0.9, action: { type: "new", target_id: null }, tier: "hold", flags: ["person_ambiguous"],
      spans: [{ start: 0, end: quote.length, quote }], twin_person_id: "person-michelle", mention: "Sam",
    }],
    clarification: { about: "person", question: "Which Sam do you mean?", options: ["Sam", "Sam", "Someone else"] },
    created_at: STORED_AT,
  };
  const kept: ItemRow = {
    id: "item-michelle", person_id: "person-michelle", kind: "thread", subject_type: "person", subject_related_id: null,
    statement: "Michelle might be moving to Australia with Sam", certainty: "tentative", status: "active", user_state: "unreviewed",
    detail: { topic: "moving to Australia" },
  };
  const w = world({ note, people, review: mirror, items: [kept] });
  const { status } = await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }])));
  eq(status, 200);
  const [it] = w.resolves[0].items;
  eq([it.person_id, it.action, it.with_person_ids], ["person-michelle", { type: "merge", target_id: "item-michelle" }, ["person-sam-lee"]]);
});

Deno.test("someone new is added only when the user says so", async () => {
  const maya: StoredReview = {
    ...HELD_SAM,
    items: [{ ...HELD_SAM.items[0], new_person_name: "Maya", statement: "Maya got the job", flags: ["new_person"], spans: [{ start: 0, end: 16, quote: "Maya got the job" }] }],
    clarification: { about: "new_person", question: "Is Maya someone new?", options: ["Add Maya", "Someone already here"] },
  };
  const w = world({ note: "Maya got the job!", people: SAMS, review: maya });
  const { body } = await call(w, post(resolveBody([{ index: 0, new_person: true }])));
  eq(w.resolves[0].newPeople, [{ ref: "new:0", display_name: "Maya" }]);
  eq(body.saved[0].person_id, "new-person-0");
  eq(body.new_people, ["new-person-0"]);
});

Deno.test("answers that don't fit, or that arrive late, are refused without a write", async () => {
  let w = world({ note: SAM_NOTE, people: SAMS, review: HELD_SAM });
  eq(await call(w, post(resolveBody([{ index: 0, person_id: "someone-elses-person" }]))), { status: 400, body: { error: "invalid_answer", reason: "unknown_person" } });
  eq(await call(w, post(resolveBody([]))), { status: 400, body: { error: "invalid_answer", reason: "unanswered" } });
  eq((await call(w, post(resolveBody("everything")))).status, 400);
  eq((await call(w, post(resolveBody(Array.from({ length: 9 }, (_, i) => ({ index: i, skip: true })))))).status, 400);
  eq(await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }], "2026-10-01T00:00:00Z"))), { status: 409, body: { error: "review_changed" } });
  eq(w.resolves.length, 0, "nothing reached the database");
  // Already answered (a retry after a lost reply), dismissed or expired.
  w = world({ note: SAM_NOTE, people: SAMS, review: null });
  eq(await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }]))), { status: 200, body: { status: "already_resolved" } });
  // Not the caller's note (RLS shows them nothing).
  w = world({ capture: false, people: SAMS, review: HELD_SAM });
  eq(await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }]))), { status: 404, body: { error: "not_found" } });
});

Deno.test("the database's last word: changed review, vanished person, deleted note", async () => {
  const cases: [string, number, string][] = [["40001", 409, "review_changed"], ["23503", 409, "invalid_answer"], ["P0002", 404, "not_found"], ["55000", 409, "not_waiting"]];
  for (const [code, status, error] of cases) {
    const w = world({ note: SAM_NOTE, people: SAMS, review: HELD_SAM, resolveResult: new ServiceError(code) });
    eq(await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }]))), { status, body: { error } }, code);
  }
  const lost = world({ note: SAM_NOTE, people: SAMS, review: HELD_SAM, resolveResult: { status: "already_resolved" } });
  eq((await call(lost, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }])))).body, { status: "already_resolved" });
});

Deno.test("answering needs consent and the flag; \"not now\" needs only the owner", async () => {
  let w = world({ consent: false, note: SAM_NOTE, people: SAMS, review: HELD_SAM });
  eq((await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }])))).status, 403);
  w = world({ flag: false, note: SAM_NOTE, people: SAMS, review: HELD_SAM });
  eq(await call(w, post(resolveBody([{ index: 0, person_id: "person-sam-lee" }]))), { status: 403, body: { error: "feature_disabled" } });
  eq(w.resolves.length, 0);
  // Dismissing works even with AI switched off.
  w = world({ consent: false, flag: false });
  eq(await call(w, post({ action: "close_review", input_ref: { capture_id: CAPTURE } })), { status: 200, body: { status: "closed" } });
  eq(w.closes, [CAPTURE]);
  w = world({ closes: false });
  eq(await call(w, post({ action: "close_review", input_ref: { capture_id: CAPTURE } })), { status: 200, body: { status: "nothing_waiting" } });
  eq((await call(w, post({ action: "close_review", input_ref: { capture_id: CAPTURE } }, null))).status, 401);
  eq((await call(w, post({ action: "close_review", input_ref: { capture_id: "nope" } }))).status, 400);
  eq((await call(w, post({ action: "delete_everything", input_ref: { capture_id: CAPTURE } }))).status, 400);
});

// ─── D1 founder review: confirmation that protects trust ────────────────────

Deno.test("a sensitive reading is held for the user's yes, never saved because a sheet appeared", async () => {
  const note = "Sarah has surgery Thursday.";
  const surgery = {
    items: [{
      ...BEN_PROPOSAL.items[0], person: "p1", person_mention: "Sarah", statement: "Sarah has surgery Thursday",
      evidence: ["Sarah has surgery Thursday"], sensitivity: "health", date_text: "Thursday",
      detail: { ...BEN_PROPOSAL.items[0].detail, event_type: "surgery", event_goal: null },
    }],
    needs_clarification: null,
  };
  const w = world({
    note,
    model: { output: surgery },
    people: [{ id: "person-sarah", display_name: "Sarah", full_name: null, nicknames: [], relationship_label: null, state: "active" }],
  });
  const { status, body } = await call(w, post(extract));
  eq(status, 200);
  eq(body.saved, [], "nothing became memory");
  eq(body.held.map((i: { statement: string; tier: string }) => [i.statement, i.tier]), [["Sarah has surgery", "confirm"]]);
  eq(w.writes[0].items, [], "no memory item written");
  eq(w.writes[0].needsReview, true);
  eq(w.writes[0].review?.items.length, 1, "kept as a pending review, so it survives a restart");
  eq(typeof body.review_created_at, "string");

  // An empty answer is not a yes.
  const held: StoredReview = { items: w.writes[0].review!.items as unknown as StoredReview["items"], clarification: null, created_at: STORED_AT };
  const w2 = world({ note, review: held, people: [{ id: "person-sarah", display_name: "Sarah", full_name: null, nicknames: [], relationship_label: null, state: "active" }] });
  eq(await call(w2, post(resolveBody([{ index: 0 }]))), { status: 400, body: { error: "invalid_answer", reason: "bad_answer" } });
  eq(w2.resolves.length, 0);
  // "Remember this" writes it, as proposed.
  const yes = await call(w2, post(resolveBody([{ index: 0, accept: true }])));
  eq(yes.body.status, "resolved");
  eq(w2.resolves[0].items.map((i) => [i.person_id, i.statement, i.sensitivity]), [["person-sarah", "Sarah has surgery", "health"]]);
});

Deno.test("every answer says how long the gateway took (Server-Timing), and nothing else about the request", async () => {
  for (const req of [post(extract), post(extract, null), post("{not json")]) {
    const res = await createGateway(world().deps)(req);
    const timing = res.headers.get("Server-Timing") ?? "";
    if (!/^total;dur=\d+$/.test(timing)) throw new Error(`no Server-Timing: ${timing}`);
    await res.body?.cancel();
  }
});
