// ai-gateway guard rails (Checkpoint C), with fake auth, data, model and
// writes. Run: deno test supabase/functions
import type { StructuredRequest, StructuredResult } from "../_shared/ai/model.ts";
import type { FacetRow, ItemRow } from "../_shared/extraction/context.ts";
import type { PlaceIndex } from "../_shared/semantic/placeIndex.ts";
import type { FacetWrite, LineToRead } from "../_shared/semantic/rederive.ts";
import type { ReportItem, ReportRow } from "../_shared/semantic/report.ts";
import { placeIndex } from "../_shared/semantic/places/dataset.ts";
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
  /** write_facets calls (Phase 4B B3 re-derivation), and when they ran relative to the extraction's write. */
  facetWrites: { items: FacetWrite[]; beforeWrite: boolean }[];
  /** Every service operation, in order (Phase 4B B6: the report may touch only its two tables). */
  ops: string[];
  /** The report writes (B6), and the runs recorded. */
  reports: { userId: string; rule: string; dataset: string; itemIds: string[]; rows: ReportRow[] }[];
  runs: Map<string, string>;
  /** Pages read (B6). */
  pages: { after: string | null; limit: number }[];
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
  removed?: { person_id: string; statement: string }[];
  /** Residence readings of those lines (Phase 4B B3); null: they couldn't be read. */
  facets?: FacetRow[] | null;
  places?: PlaceIndex;
  /** Lines that had a reading and lost it (loadUnread answers for the ids asked). */
  unread?: { line: LineToRead; quotes: string[] }[];
  /** write_facets' answer per line; default written. */
  facetResult?: string;
  /** Every live line of the account (loadLinesPage pages over them by id; B6). */
  lines?: ReportItem[];
  /** The quotes of lines' notes (B6); default each line's statement. */
  quotes?: Record<string, string[]>;
  /** The report write fails (an interrupted run, B6). */
  reportThrows?: boolean;
} = {}): World {
  const w: World = {
    modelCalls: [], writes: [], resolves: [], closes: [], releases: [], logs: [], quota: 0, facetWrites: [], ops: [], reports: [], runs: new Map(), pages: [],
    deps: undefined as unknown as GatewayDeps,
  };
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
    loadItems: (ids, o) => Promise.resolve((opts.items ?? []).filter((m) => ids.includes(m.person_id) || (!!o?.shared && (m.with_person_ids ?? []).some((x) => ids.includes(x))))),
    loadRemoved: () => Promise.resolve(opts.removed ?? []),
    loadLinesPage: (after, limit) => {
      w.pages.push({ after, limit });
      const sorted = [...(opts.lines ?? [])].sort((a, b) => a.id.localeCompare(b.id));
      return Promise.resolve(sorted.filter((l) => !after || l.id > after).slice(0, limit));
    },
    loadQuotes: (ids) => Promise.resolve(Object.fromEntries(ids.map((id) => [id, opts.quotes?.[id] ?? [(opts.lines ?? []).find((l) => l.id === id)?.statement ?? ""]]))),
    loadUnread: (ids) => Promise.resolve((opts.unread ?? []).filter((u) => ids.includes(u.line.id))),
    loadFacets: (ids) => Promise.resolve(opts.facets === null ? null : (opts.facets ?? []).filter((f) => ids.includes(f.memory_item_id))),
    loadReview: () => Promise.resolve(opts.review === undefined ? (w.writes.at(-1)?.review ? { ...w.writes.at(-1)!.review!, created_at: STORED_AT } as StoredReview : null) : opts.review),
    closeReview: (id) => {
      w.closes.push(id);
      return Promise.resolve(opts.closes ?? true);
    },
  };
  const base: ServiceOps = {
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
    writeFacets: (_u, items) => {
      w.facetWrites.push({ items, beforeWrite: w.writes.length === 0 });
      return Promise.resolve(items.map((i) => ({ id: i.memory_item_id, result: opts.facetResult ?? "written" })));
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
    reportRan: (userId, rule, dataset) => Promise.resolve(w.runs.get(`${userId}|${rule}|${dataset}`) ?? null),
    writeReport: (userId, rule, dataset, itemIds, rows) => {
      if (opts.reportThrows) return Promise.reject(new Error("report write failed"));
      w.reports.push({ userId, rule, dataset, itemIds, rows });
      w.runs.set(`${userId}|${rule}|${dataset}`, "2026-10-17T00:00:00Z");
      return Promise.resolve();
    },
  };
  // Every operation recorded by name (the adversarial check: the report touches only its two tables).
  const service = Object.fromEntries(Object.entries(base).map(([name, fn]) => [name, (...args: unknown[]) => {
    w.ops.push(name);
    return (fn as (...a: unknown[]) => unknown)(...args);
  }])) as unknown as ServiceOps;
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
    ...(opts.places ? { places: opts.places } : {}),
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

// ─── K4 (CC-22): the gateway hands the app each name in question, and takes its answer ───

Deno.test("K4: 'Which Sam?' on a line held for 'Which Anthony?' reaches the app (open_names), and a participants answer is resolved and written", async () => {
  const note = "Anthony and Sam love ice skating with Chris";
  const people = [
    { id: "person-anthony", display_name: "Anthony", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-anthony-test", display_name: "Anthony Test", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-sam-eden", display_name: "Sam Eden", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-sam-d", display_name: "Sam Doughty", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-chris", display_name: "Chris", full_name: null, nicknames: [], relationship_label: null, state: "active" },
  ];
  const proposal = {
    items: [{
      ...BEN_PROPOSAL.items[0], kind: "fact", person: "p1", person_mention: "Anthony", statement: note, evidence: [note], date_text: null,
      detail: { ...BEN_PROPOSAL.items[0].detail, event_type: null, event_goal: null, category: "interest" },
    }],
    needs_clarification: null,
  };
  const w = world({ note, people, model: { output: proposal } });
  const first = await call(w, post(extract));
  eq(first.status, 200);
  const [held] = first.body.held as { open_names?: { text: string; candidate_ids: string[] }[]; with_person_ids?: string[] }[];
  eq(held.open_names, [{ text: "Sam", candidate_ids: ["person-sam-eden", "person-sam-d"] }]);
  eq(held.with_person_ids, ["person-chris"]);
  const w2 = world({ note, people, review: { ...w.writes[0].review!, created_at: STORED_AT } as StoredReview });
  const { status } = await call(w2, post(resolveBody([{ index: 0, person_id: "person-anthony-test", participants: [{ text: "Sam", person_id: "person-sam-eden" }] }])));
  eq(status, 200);
  const [it] = w2.resolves[0].items;
  eq([it.person_id, [...(it.with_person_ids ?? [])].sort(), it.statement], ["person-anthony-test", ["person-chris", "person-sam-eden"], note]);
});

Deno.test("reviewer A (13 Oct): a held 'Which Sam?' whose kept line the user has since removed brings nothing back", async () => {
  const note = "Anthony and Sam love ice skating with Chris";
  const people = [
    { id: "person-anthony", display_name: "Anthony", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-sam-eden", display_name: "Sam Eden", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-sam-d", display_name: "Sam Doughty", full_name: null, nicknames: [], relationship_label: null, state: "active" },
    { id: "person-chris", display_name: "Chris", full_name: null, nicknames: [], relationship_label: null, state: "active" },
  ];
  const proposal = {
    items: [{
      ...BEN_PROPOSAL.items[0], kind: "fact", person: "p4", person_mention: "Chris", statement: note, evidence: [note], date_text: null,
      detail: { ...BEN_PROPOSAL.items[0].detail, event_type: null, event_goal: null, category: "interest" },
    }],
    needs_clarification: null,
  };
  const w = world({ note, people, model: { output: proposal } });
  eq((await call(w, post(extract))).status, 200);
  const review = { ...w.writes[0].review!, created_at: STORED_AT } as StoredReview;
  eq(review.items.map((i) => [i.mention, i.twin_person_id]), [["Sam", "person-chris"]]);
  const answer = resolveBody([{ index: 0, person_id: "person-sam-eden" }]);
  // Kept: the answer joins Chris's line.
  const line: ItemRow = {
    id: "m-chris", person_id: "person-chris", kind: "fact", subject_type: "person", subject_related_id: null,
    statement: note, certainty: "stated", status: "active", user_state: "unreviewed", detail: { category: "interest" },
  };
  const kept = world({ note, people, review, items: [line] });
  eq((await call(kept, post(answer))).status, 200);
  eq(kept.resolves[0].items.map((i) => [i.person_id, i.with_person_ids, i.action]), [["person-chris", ["person-sam-eden"], { type: "merge", target_id: "m-chris" }]]);
  // Removed with "Not this": nothing written for it.
  const gone = world({ note, people, review, removed: [{ person_id: "person-chris", statement: note }] });
  eq((await call(gone, post(answer))).status, 200);
  eq(gone.resolves[0]?.items ?? [], []);
});

// ─── Residence (Phase 4B B3) ─────────────────────────────────────────────────

const SUSAN = [{ id: "person-susan", display_name: "Susan", full_name: null, nicknames: [], relationship_label: null, state: "active" }];
const ALAMEDA_LINE: ItemRow = {
  id: "item-alameda", person_id: "person-susan", kind: "fact", subject_type: "person", subject_related_id: null,
  statement: "Susan lives in Alameda", certainty: "stated", status: "active", user_state: "unreviewed", detail: { category: "home" },
};
const ALAMEDA_FACET: FacetRow = {
  memory_item_id: "item-alameda", slot: "residence", value_text: "Alameda", value_norm: "alameda", place_ref: null,
  candidates: [{ ref: "city:5322737", level: "city", ancestors: ["region:US.CA", "country:US"] }], usual_ref: "city:5322737",
};
const homeProposal = (statement: string) => ({
  items: [{
    kind: "fact", person: "p1", person_mention: "Susan", subject: "person", related_relation: null, related_name: null,
    statement, evidence: [statement], certainty: "stated", sensitivity: "none", confidence: 0.95, date_text: null, date_direction: "past",
    detail: {
      event_type: null, event_goal: null, category: "home", attribute: null, value: null, firmness: null, topic: null,
      place: null, milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null,
    },
    existing: { action: "new", target: null },
  }],
  needs_clarification: null,
});
const home = (note: string, over: Parameters<typeof world>[0] = {}) =>
  world({
    note, people: SUSAN, items: [ALAMEDA_LINE], facets: [ALAMEDA_FACET], places: placeIndex(),
    model: { output: homeProposal(note.replace(/[.!]$/u, "")) }, ...over,
  });

Deno.test("B3: a residence is written with its reading and the cue in the user's words", async () => {
  const w = home("Susan moved to Colorado.");
  eq((await call(w, post(extract))).status, 200);
  const [it] = w.writes[0].items;
  eq([it.action, it.detail.transition, it.cue, it.facets?.[0].value_text, it.facets?.[0].usual_ref],
    [{ type: "supersede", target_id: "item-alameda" }, "changed", { start: 6, end: 14 }, "Colorado", "region:US.CO"]);
});

Deno.test("B3: case E is held for one question, stored with the line it asks about", async () => {
  const w = home("Susan moved to California.");
  const { body } = await call(w, post(extract));
  eq([body.tier, body.held.length, body.clarification], ["clarify", 1, null]);
  eq([body.held[0].flags.includes("residence_conflict"), body.held[0].still_in], [true, { target_id: "item-alameda", words: "Alameda", stay: "facet" }]);
  eq(w.writes[0].review?.items[0].still_in?.target_id, "item-alameda", "the review row keeps the question's line");
  eq(w.writes[0].items, [], "nothing is memory before the answer");
});

Deno.test("B3: 'Susan moved' is written as a change of that line, with the reading", async () => {
  const w = home("Susan moved to California.");
  await call(w, post(extract));
  const stored = { ...w.writes[0].review!, created_at: STORED_AT } as StoredReview;
  const answered = home("Susan moved to California.", { review: stored });
  const { status } = await call(answered, post(resolveBody([{ index: 0, moved: true }])));
  eq(status, 200);
  const [it] = answered.resolves[0].items;
  eq([it.action, it.detail.transition, it.facets?.[0].value_text], [{ type: "supersede", target_id: "item-alameda" }, "changed", "California"]);
});

const CALIFORNIA_LINE: ItemRow = { ...ALAMEDA_LINE, id: "item-california", statement: "Susan lives in California" };
const CALIFORNIA_FACET: FacetRow = {
  memory_item_id: "item-california", slot: "residence", value_text: "California", value_norm: "california", place_ref: null,
  candidates: [{ ref: "region:US.CA", level: "region", ancestors: ["country:US"] }], usual_ref: "region:US.CA",
};

Deno.test("B4: the write carries every other line the note closes, and the stored question what 'Susan moved' closes", async () => {
  const both = { items: [CALIFORNIA_LINE, ALAMEDA_LINE], facets: [CALIFORNIA_FACET, ALAMEDA_FACET] };
  const w = home("Susan moved to Colorado.", both);
  eq((await call(w, post(extract))).status, 200);
  const [it] = w.writes[0].items;
  eq([it.action, it.closes, it.detail.transition], [{ type: "supersede", target_id: "item-alameda" }, ["item-california"], "changed"]);
  // A plain "lives in Colorado" beside an edited Alameda asks; the review row keeps what else the answer closes.
  const asked = home("Susan lives in Colorado.", { ...both, items: [CALIFORNIA_LINE, { ...ALAMEDA_LINE, user_state: "edited" }] });
  const { body } = await call(asked, post(extract));
  eq([body.held[0].still_in, asked.writes[0].items], [{ target_id: "item-alameda", words: "Alameda", stay: "words", closes: ["item-california"] }, []]);
  const stored = { ...asked.writes[0].review!, created_at: STORED_AT } as StoredReview;
  const answered = home("Susan lives in Colorado.", { ...both, review: stored });
  await call(answered, post(resolveBody([{ index: 0, moved: true }])));
  const [r] = answered.resolves[0].items;
  eq([r.action, r.closes, r.detail.transition], [{ type: "supersede", target_id: "item-alameda" }, ["item-california"], "changed"]);
  const stayed = home("Susan lives in Colorado.", { ...both, review: stored });
  await call(stayed, post(resolveBody([{ index: 0, moved: false }])));
  eq([stayed.resolves[0].items[0].action.type, stayed.resolves[0].items[0].closes], ["new", undefined]);
});

Deno.test("B3: readings that can't be read, or no place data: the note is understood without residence", async () => {
  const unread = home("Susan moved to Colorado.", { facets: null });
  await call(unread, post(extract));
  eq([unread.writes[0].items[0].facets, unread.writes[0].items[0].action.type], [undefined, "new"], "never as though no line had a reading");
  const none = home("Susan moved to Colorado.", { places: undefined });
  await call(none, post(extract));
  eq(none.writes[0].items[0].facets, undefined);
});

// ─── Re-derivation after an edit (Phase 4B B3; brief §5, N13) ────────────────

// "Susan lives in California", read as California, then edited by the user to "Susan lives in Alameda": the
// B2 trigger tombstoned the reading, so the line has none until it is read again.
const EDITED_LINE: ItemRow = { ...ALAMEDA_LINE, id: "item-edited", user_state: "edited" };
const EDITED_UNREAD = {
  line: {
    id: "item-edited", version: 2, kind: "fact", subject_type: "person", certainty: "stated", sensitivity: "none", with_person_ids: [],
    statement: "Susan lives in Alameda", user_state: "edited",
  },
  quotes: ["Susan lives in California"],
};
const rederiveBody = (ids: unknown) => ({ action: "rederive", input_ref: { memory_item_ids: ids } });

Deno.test("N13: an edit, reported, is read again from the user's own words: owner only, no consent, model or quota", async () => {
  const w = world({ consent: false, flag: false, people: SUSAN, places: placeIndex(), unread: [EDITED_UNREAD] });
  eq((await call(w, post(rederiveBody(["item-edited"]), null))).status, 401);
  for (const bad of [[], "item-edited", ["not-a-uuid"], Array.from({ length: 21 }, () => crypto.randomUUID())]) {
    eq((await call(w, post(rederiveBody(bad)))).status, 400, JSON.stringify(bad));
  }
  const id = "0b5e6c1e-7d5f-4a43-9b2f-3a0d2f6c1e01";
  const ok = world({ consent: false, flag: false, people: SUSAN, places: placeIndex(), unread: [{ ...EDITED_UNREAD, line: { ...EDITED_UNREAD.line, id } }] });
  const { status, body } = await call(ok, post(rederiveBody([id, id])));
  eq([status, body], [200, { status: "rederived", results: [{ id, result: "written" }] }], "content-free");
  const [write] = ok.facetWrites[0].items;
  eq([write.memory_item_id, write.version, write.facets[0].value_text, write.facets[0].usual_ref, write.facets[0].decided_by],
    [id, 2, "Alameda", "city:5322737", "rule"], "the edited words, never the note's California");
  eq([ok.modelCalls.length, ok.quota, ok.logs.length], [0, 0, 0]);
  // Words that no longer say where she lives: nothing written; the line stays without a reading.
  const plain = world({ people: SUSAN, places: placeIndex(), unread: [{ ...EDITED_UNREAD, line: { ...EDITED_UNREAD.line, id, statement: "Susan loves Alameda" } }] });
  eq((await call(plain, post(rederiveBody([id])))).body, { status: "rederived", results: [] });
  eq(plain.facetWrites, []);
  // No place data: nothing to read with.
  const none = world({ people: SUSAN, unread: [EDITED_UNREAD] });
  eq((await call(none, post(rederiveBody([id])))).body, { status: "rederived", results: [] });
});

Deno.test("N13: the next Tell reads an edited line again first, so 'moved to Colorado' closes the edited Alameda as a change", async () => {
  const w = home("Susan moved to Colorado.", { items: [EDITED_LINE], facets: [], unread: [EDITED_UNREAD] });
  eq((await call(w, post(extract))).status, 200);
  eq(w.facetWrites.map((f) => [f.beforeWrite, f.items[0].memory_item_id, f.items[0].facets[0].value_text]), [[true, "item-edited", "Alameda"]]);
  const [it] = w.writes[0].items;
  eq([it.action, it.detail.transition, it.cue], [{ type: "supersede", target_id: "item-edited" }, "changed", { start: 6, end: 14 }]);
});

Deno.test("N13: after the safety net, a bare 'lives in Colorado' asks about the edited Alameda, and 'Actually … not Alameda' corrects it", async () => {
  const bare = home("Susan lives in Colorado.", { items: [EDITED_LINE], facets: [], unread: [EDITED_UNREAD] });
  const { body } = await call(bare, post(extract));
  eq([body.held.length, body.held[0].still_in], [1, { target_id: "item-edited", words: "Alameda", stay: "words" }]);
  eq(bare.writes[0].items, [], "never a silent replacement of the user's own words");
  const note = "Actually Susan lives in Colorado, not Alameda.";
  const corrected = home(note, {
    items: [EDITED_LINE], facets: [], unread: [EDITED_UNREAD],
    model: { output: { ...homeProposal("Susan lives in Colorado"), items: [{ ...homeProposal("Susan lives in Colorado").items[0], evidence: ["Susan lives in Colorado, not Alameda"] }] } },
  });
  await call(corrected, post(extract));
  const [it] = corrected.writes[0].items;
  eq([it.action, it.detail.transition], [{ type: "supersede", target_id: "item-edited" }, "corrected"], "never history");
});

Deno.test("N13: a reading the database refused is never used: the edited line stays as it is (fail open)", async () => {
  const w = home("Susan moved to Colorado.", { items: [EDITED_LINE], facets: [], unread: [EDITED_UNREAD], facetResult: "dropped" });
  await call(w, post(extract));
  eq(w.writes[0].items[0].action.type, "new");
});

// ─── B6: the residence dry run over the caller's own account ─────────────────

const reportBody = (extra: Record<string, unknown> = {}) => ({ action: "semantic_report", ...extra });
let lineN = 0;
function reportLine(statement: string, over: Partial<ReportItem> = {}): ReportItem {
  lineN++;
  return {
    id: `${String(lineN).padStart(8, "0")}-0000-4000-8000-000000000b60`, person_id: "person-susan", kind: "fact", subject_type: "person",
    subject_related_id: null, statement, certainty: "stated", sensitivity: "none", status: "active", user_state: "unreviewed",
    detail: { category: "home" }, with_person_ids: [], supersedes_id: null, closes_ids: [], created_at: `2026-10-${String((lineN % 28) + 1).padStart(2, "0")}T12:00:00Z`, ...over,
  };
}

Deno.test("B6 (17): the report needs the signed-in owner, and is always theirs: a user id in the body is ignored", async () => {
  const w = world({ consent: false, flag: false, places: placeIndex(), lines: [reportLine("Susan lives in Alameda")] });
  eq((await call(w, post(reportBody(), null))).status, 401);
  eq((await call(w, post(reportBody(), "bad"))).status, 401);
  eq(w.reports, []);
  const { status, body } = await call(w, post(reportBody({ user_id: "someone-else", input_ref: { user_id: "someone-else" } })));
  eq(status, 200);
  eq(body.status, "reported");
  eq(w.reports.map((r) => r.userId), ["u1"], "the verified caller, never the body's id");
});

Deno.test("B6: model-free and owner-only: no consent, flag, quota or model; only the two report tables are written, with ids and buckets", async () => {
  const ca = reportLine("Susan lives in California");
  const al = reportLine("Susan lives in Alameda");
  const stay = reportLine("Susan is staying in Denver this week");
  const w = world({ consent: false, flag: false, places: placeIndex(), lines: [ca, al, stay, reportLine("Susan loves pottery", { detail: { category: "interest" } })] });
  const { status, body } = await call(w, post(reportBody()));
  eq(status, 200);
  eq([w.modelCalls.length, w.quota, w.logs.length, w.writes.length, w.facetWrites.length, w.resolves.length], [0, 0, 0, 0, 0, 0]);
  eq(w.ops, ["reportRan", "writeReport"], "nothing else is touched");
  const [r] = w.reports;
  eq([r.rule, r.dataset], ["residence/v1", "places-2026.10"]);
  eq(r.itemIds.length, 4, "every live line, so earlier rows for any of them are cleared");
  eq(r.rows, [
    { memory_item_id: ca.id, bucket: "eligible" }, { memory_item_id: ca.id, bucket: "candidates" }, { memory_item_id: ca.id, bucket: "would_compose" },
    { memory_item_id: al.id, bucket: "eligible" }, { memory_item_id: al.id, bucket: "candidates" }, { memory_item_id: al.id, bucket: "would_compose" },
    { memory_item_id: stay.id, bucket: "not_residence" },
  ]);
  const summary = body.summary as Record<string, unknown>;
  eq([summary.total, summary.examined, summary.eligible], [4, 3, 2]);
  eq((summary.groups as { would_compose: string[][] }).would_compose, [[al.id, ca.id]]);
  // Content-free, in the write and in the reply.
  for (const text of [JSON.stringify(w.reports), JSON.stringify(body)]) {
    eq(/Susan|Alameda|California|Denver|pottery/u.test(text), false, "no words of the user's");
  }
});

Deno.test("B6 (13): run again at the same versions: nothing is read or written a second time, unless asked again", async () => {
  const w = world({ places: placeIndex(), lines: [reportLine("Susan lives in Alameda")] });
  eq((await call(w, post(reportBody()))).body.status, "reported");
  const again = await call(w, post(reportBody()));
  eq([again.status, again.body.status, again.body.rule_version, again.body.dataset_version], [200, "already_reported", "residence/v1", "places-2026.10"]);
  eq([w.reports.length, w.pages.length], [1, 1]);
  eq((await call(w, post(reportBody({ again: true })))).body.status, "reported");
  eq(w.reports.length, 2);
  eq(w.reports[1].rows, w.reports[0].rows, "the same rows again");
});

Deno.test("B6 (14): an interrupted run is never marked complete; the retry reads everything again and writes the same rows", async () => {
  const lines = [reportLine("Susan lives in California"), reportLine("Susan lives in Alameda")];
  const w = world({ places: placeIndex(), lines, reportThrows: true });
  eq((await call(w, post(reportBody()))).status, 500);
  eq([w.reports.length, w.runs.size], [0, 0], "no run recorded");
  const ok = world({ places: placeIndex(), lines });
  eq((await call(ok, post(reportBody()))).body.status, "reported");
  eq(ok.reports[0].rows.length, 6);
  eq(ok.runs.size, 1);
});

Deno.test("B6 (16): an account with more lines than one query returns is read whole, page by page; too many to read whole is refused without a write", async () => {
  const lines = Array.from({ length: 1203 }, (_, i) => i % 400 === 0 ? reportLine("Susan lives in Alameda") : reportLine(`Susan loves hobby ${i}`, { detail: { category: "interest" } }));
  const w = world({ places: placeIndex(), lines });
  const { body } = await call(w, post(reportBody()));
  eq(body.status, "reported");
  eq(w.pages.map((p) => p.limit), [500, 500, 500]);
  eq(w.pages[1].after !== null && w.pages[2].after !== null && w.pages[2].after! > w.pages[1].after!, true, "each page after the last id of the one before");
  eq((body.summary as { total: number }).total, 1203);
  eq(w.reports[0].itemIds.length, 1203);
  // The four Alameda lines are the same place, all current: one chain, so each is eligible, candidates and would_compose.
  eq(w.reports[0].rows.length, 4 * 3, "the four Alameda lines, read across the pages");
  eq((body.summary as { groups: { would_compose: string[][] } }).groups.would_compose[0].length, 4);
  // More than REPORT_MAX_PAGES full pages: refused, nothing written (never a silent truncation).
  const huge = world({ places: placeIndex(), lines: Array.from({ length: 500 * 40 + 1 }, () => reportLine("Susan loves hobby", { detail: { category: "interest" } })) });
  eq((await call(huge, post(reportBody()))).status, 507);
  eq(huge.reports, []);
});

Deno.test("B6 (15): an account with nothing residential: a run with no rows, recorded; no place data: try later, nothing recorded", async () => {
  const w = world({ places: placeIndex(), lines: [reportLine("Susan loves pottery", { detail: { category: "interest" } })] });
  const { body } = await call(w, post(reportBody()));
  eq([body.status, (body.summary as { examined: number }).examined, w.reports[0].rows], ["reported", 0, []]);
  eq(w.runs.size, 1);
  const none = world({ lines: [reportLine("Susan lives in Alameda")] });
  eq((await call(none, post(reportBody()))).status, 503);
  eq([none.reports.length, none.pages.length], [0, 0]);
});
