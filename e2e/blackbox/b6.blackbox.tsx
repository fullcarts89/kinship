// Phase 4B B6 (the residence dry run, brief §14), through the real app session, the local backend (the B2
// and B3 migrations; B6 adds none), the real ai-gateway served from this branch, and the model replayed.
// The founder's People plus a test "Susan". The app asks the gateway for the report once at launch (an
// empty account: a run with no rows, recorded); told a few notes, the report run again says exactly what
// the approved semantics make of them, as ids and buckets in residence_backfill_report, the run in
// semantic_runs, and nothing else in the database changes: every memory, source, reading, note and person
// row is byte for byte what it was.
import { supabaseGatewayTransport } from "@/store/gateway";
import { canTap, mount, setUp, settle, signedIn, tap, tell, texts, until } from "./app";
import { serverRows, serverRowsIn, useReply as chooseReply } from "./localStack";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John", "Susan"];
const N = {
  california: "Susan lives in California.",
  alameda: "Susan lives in Alameda.",
  denver: "Susan is staying in Denver this week.",
  colorado: "Susan moved to Colorado.",
};
const LABEL: Record<string, string> = {
  [N.california]: "live 1 (16 Oct, N13/N14, founder People + Susan)",
  [N.alameda]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.denver]: "live 1 (16 Oct, B3, founder People + Susan)",
  [N.colorado]: "live 1 (16 Oct, B3, founder People + Susan)",
};
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const TABLES = ["memory_items", "memory_item_sources", "memory_item_facets", "captures", "people", "related_people", "reasons", "contact_events", "capture_reviews"];

type Item = { id: string; statement: string; status: string; deleted_at: string | null };
type Row = { memory_item_id: string; bucket: string; rule_version: string; dataset_version: string };
type Run = { user_id: string; mode: string; rule_version: string; dataset_version: string; ran_at: string };

async function account() {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await acct.engine.sync();
  const susan = (await acct.repos.people.list()).find((p) => p.display_name === "Susan")!;
  return { acct, r, susan };
}
type Account = Awaited<ReturnType<typeof account>>;

async function told(a: Account, note: string) {
  if (!LIVE) await chooseReply(note, LABEL[note]);
  await tell(a.r, note);
  await until(a.r, (s) => s.some((t) => READING.test(t)), `the reading of "${note}"`, 60000);
  await settle(300);
  if (canTap(a.r, "Got it right")) await tap(a.r, "Got it right");
  if (canTap(a.r, "Done") && texts(a.r).includes("Here's what I'll remember.")) await tap(a.r, "Done");
  await settle(300);
  await a.acct.engine.sync();
}

/** Every row of every user table the report must never touch, as the server holds them. */
async function everything(a: Account): Promise<string> {
  const parts: string[] = [];
  for (const t of TABLES) parts.push(JSON.stringify(await serverRows(t, a.acct.userId)));
  return parts.join("\n");
}

async function runs(a: Account): Promise<Run[]> {
  return (await serverRows<Run>("semantic_runs", a.acct.userId)).filter((r) => r.mode === "report");
}

async function reportFor(a: Account): Promise<Row[]> {
  const items = (await serverRows<Item>("memory_items", a.acct.userId)).map((m) => m.id);
  return serverRowsIn<Row>("residence_backfill_report", "memory_item_id", items);
}

/** The report, asked for again (the launch asked once, over an empty account): the gateway's own action, as the owner. */
async function reportAgain(a: Account): Promise<Record<string, unknown>> {
  const reply = await supabaseGatewayTransport(a.acct.client).post({ action: "semantic_report", again: true });
  if (reply.status !== 200) throw new Error(`report: ${reply.status} ${JSON.stringify(reply.body)}`);
  return reply.body as Record<string, unknown>;
}

async function untilRun(a: Account, n: number) {
  for (let i = 0; i < 60 && (await runs(a)).length < n; i++) await settle(250);
}

// The harness mounts the screens over a session it made itself, so the session's first pass (the real app
// runs one when the session starts) happens at the first Tell here. The dry run is asked for on that pass.
it("the session's first pass asks once: one run row for this account; later notes and syncs never ask again", async () => {
  const a = await account();
  expect(await runs(a)).toEqual([]);
  await told(a, N.alameda);
  await untilRun(a, 1);
  const [run] = await runs(a);
  expect([run.user_id, run.mode, run.rule_version, run.dataset_version]).toEqual([a.acct.userId, "report", "residence/v1", "places-2026.10"]);
  await told(a, N.california);
  await a.acct.engine.sync();
  await settle(500);
  expect((await runs(a)).length).toBe(1);
  // What that first run reported stays until asked again: the rows are only ever its own account's lines.
  const items = (await serverRows<Item>("memory_items", a.acct.userId)).map((m) => m.id);
  for (const r of await reportFor(a)) expect(items).toContain(r.memory_item_id);
});

it("California, Alameda, a stay in Denver, then 'moved to Colorado': the report says exactly what the semantics make of them, and changes nothing", async () => {
  const a = await account();
  await told(a, N.california);
  await told(a, N.alameda);
  await told(a, N.denver);
  await untilRun(a, 1);
  const before = await everything(a);
  const body = await reportAgain(a);
  expect(body.status).toBe("reported");
  const summary = body.summary as Record<string, unknown>;
  expect([summary.rule_version, summary.dataset_version, summary.examined, summary.eligible, summary.already_read]).toEqual(["residence/v1", "places-2026.10", 3, 2, 2]);
  expect(JSON.stringify(body)).not.toMatch(/Susan|Alameda|California|Denver/u);
  const items = (await serverRows<Item>("memory_items", a.acct.userId)).filter((m) => !m.deleted_at);
  const id = (re: RegExp) => items.find((m) => re.test(m.statement))!.id;
  const rows = (await reportFor(a)).map((r) => `${r.memory_item_id}:${r.bucket}`).sort();
  expect(rows).toEqual([
    `${id(/Alameda/u)}:candidates`, `${id(/Alameda/u)}:eligible`, `${id(/Alameda/u)}:would_compose`,
    `${id(/California/u)}:candidates`, `${id(/California/u)}:eligible`, `${id(/California/u)}:would_compose`,
    `${id(/Denver/u)}:not_residence`,
  ].sort());
  expect((summary.groups as { would_compose: string[][] }).would_compose).toEqual([[id(/Alameda/u), id(/California/u)]]);
  expect(await everything(a)).toBe(before);

  // The move closes both as a change: history-eligible, no suspect, nothing unknown; Colorado current alone.
  await told(a, N.colorado);
  const before2 = await everything(a);
  const body2 = await reportAgain(a);
  const s2 = body2.summary as { closed: Record<string, number>; groups: Record<string, unknown[]>; buckets: Record<string, number> };
  expect(s2.closed).toEqual({ history_eligible: 2, never_history: 0, history_unknown: 0, no_live_closer: 0 });
  expect([s2.groups.false_supersession_suspect, s2.groups.history_unknown, s2.groups.contradiction, s2.groups.would_compose]).toEqual([[], [], [], []]);
  const rows2 = await reportFor(a);
  expect(rows2.filter((r) => r.bucket === "would_compose")).toEqual([]);
  expect(rows2.filter((r) => r.bucket === "eligible").length).toBe(3);
  expect(await everything(a)).toBe(before2);
  // Run again: the same rows, one run row, nothing duplicated.
  const body3 = await reportAgain(a);
  expect(body3.status).toBe("reported");
  expect((await reportFor(a)).map((r) => `${r.memory_item_id}:${r.bucket}`).sort()).toEqual(rows2.map((r) => `${r.memory_item_id}:${r.bucket}`).sort());
  expect((await runs(a)).length).toBe(1);
  expect(await everything(a)).toBe(before2);
  // Not asked again: the server says it already ran, and reads nothing.
  const plain = await supabaseGatewayTransport(a.acct.client).post({ action: "semantic_report" });
  expect((plain.body as { status: string }).status).toBe("already_reported");
});

it("another account's token can't ask for, or see, this account's report", async () => {
  const a = await account();
  await told(a, N.alameda);
  await untilRun(a, 1);
  await reportAgain(a);
  const mine = await reportFor(a);
  expect(mine.length).toBe(2);
  const b = await account();
  // B's report, asked with B's token and A's id in the body: B's own (empty) account, never A's rows.
  const reply = await supabaseGatewayTransport(b.acct.client).post({ action: "semantic_report", again: true, user_id: a.acct.userId, input_ref: { user_id: a.acct.userId } });
  expect((reply.body as { status: string; summary: { total: number } }).summary.total).toBe(0);
  expect(await reportFor(a)).toEqual(mine);
  // The app's own client (anon key, the owner's session) can't read the report tables at all.
  const { error } = await b.acct.client.from("residence_backfill_report").select("*").limit(1);
  expect(error?.code).toBe("42501");
});
