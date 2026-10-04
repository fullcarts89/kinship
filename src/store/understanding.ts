// Understanding: each note the user tells, from "Kept" to remembered (plan
// §7–§8; Checkpoint D1). One persisted state machine per note, in the user's
// encrypted store (the `understanding` table):
//
//   waiting    told with AI on, not understood yet (offline, or a retry is due)
//   review     understood: the gateway's reading is kept while the user looks
//              at it, and while a held question waits for their answer
//   answering  the user's answer, kept until the gateway has it
//   closing    the user is finished; the server must still settle the note
//   done       nothing more to do
//   kept       not understood (declined, AI off, or it kept failing): the note
//              stays exactly as written
//
// Every step is safe to repeat, so a killed app or a lost reply resumes where
// it was: the gateway never runs the model twice for a note (asking again
// returns "done" with the stored question), an answer that already landed
// comes back "already_resolved", and closing twice is "nothing_waiting".
// What the gateway saves reaches the device by ordinary sync; confirming,
// correcting and "Not this" are ordinary local writes (MemoryRepo).
//
// Analytics are content-free by construction (track's closed schema): tiers,
// kinds and question types only, never text, names or ids.

import { smallCount, track, type ClarificationType, type MemoryKindName } from "@/platform/analytics";
import {
  Gateway,
  GatewayRefused,
  GatewayUnreachable,
  type Clarification,
  type HeldAnswer,
  type HeldItem,
  type Understood,
} from "./gateway";
import { detailForKind, withDate, type SwitchableKind } from "./memoryDetail";
import { repositoriesFor, type MemoryItem, type MemorySource } from "./repositories";
import type { SyncReport } from "./syncEngine";
import { StoreWriteError, type Data, type UserStore } from "./userStore";
import type { SqlValue } from "./sql";

export type UnderstandingState = "waiting" | "review" | "answering" | "closing" | "done" | "kept";

/** What the gateway understood, as the review needs it. */
export interface Reading {
  /** The note as a whole; "unknown" when recovered after a lost reply. */
  tier: "auto" | "confirm" | "clarify" | "nothing" | "unknown";
  /** Memory items saved from this note, and whether they were sure enough to save quietly. */
  saved: { id: string; tier: "auto" | "confirm" }[];
  /** Waiting on the user's answer; empty once answered or settled. */
  held: HeldItem[];
  clarification: Clarification | null;
  /** Which stored question an answer is for. */
  review_created_at: string | null;
  /** Nothing waits on the server for this note any more. */
  settled: boolean;
  /** The answer that settled it, to check it landed after "already_resolved". */
  answered?: HeldAnswer[];
}

export interface PendingAnswer {
  review_created_at: string;
  answers: HeldAnswer[];
}

/** Said once, in human words, when the review changed under the user. */
export type Notice = "changed_elsewhere" | "choose_again";

export interface UnderstandingRow {
  capture_id: string;
  state: UnderstandingState;
  reading: Reading | null;
  answer: PendingAnswer | null;
  notice: Notice | null;
  attempts: number;
  next_at: string | null;
  seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnderstandingOptions {
  /** Server failures before a note is kept as written (an answer is never dropped). */
  maxAttempts?: number;
  /** Wait before retrying after `failures` failed attempts. */
  backoffMs?: (failures: number) => number;
  /** Monotonic milliseconds, for latency buckets only. */
  clock?: () => number;
}

const BACKOFF = [15_000, 60_000, 180_000, 600_000, 1_800_000, 3_600_000];
/** A review seen and then left open (the app went away) is finished as left after this long. */
const LEFT_OPEN_MS = 10 * 60_000;
const PERSON_FLAGS = ["new_person", "person_ambiguous", "person_disagreement", "pronoun_multiple"];

export class Understanding {
  private running: Promise<void> | null = null;
  private again = false;
  /** Reviews on screen right now (not persisted: a relaunch starts with none). */
  private readonly onScreen = new Set<string>();
  private readonly maxAttempts: number;
  private readonly backoffMs: (failures: number) => number;
  private readonly clock: () => number;
  /** The last pass couldn't reach the server. */
  offline = false;

  constructor(
    private readonly store: UserStore,
    private readonly sync: () => Promise<SyncReport>,
    private readonly gateway: Gateway,
    opts: UnderstandingOptions = {},
  ) {
    this.maxAttempts = opts.maxAttempts ?? 6;
    this.backoffMs = opts.backoffMs ?? ((n) => BACKOFF[Math.min(n, BACKOFF.length) - 1] ?? BACKOFF[0]);
    this.clock = opts.clock ?? (() => Date.now());
  }

  // ─── Reads ────────────────────────────────────────────────────────────

  async get(captureId: string): Promise<UnderstandingRow | null> {
    const r = await this.store.db.get<Record<string, SqlValue>>("SELECT * FROM understanding WHERE capture_id = ?", [captureId]);
    return r ? parseRow(r) : null;
  }

  /** Every note still in progress or waiting for the user, oldest first. */
  async open(): Promise<UnderstandingRow[]> {
    const rows = await this.store.db.all<Record<string, SqlValue>>(
      "SELECT * FROM understanding WHERE state NOT IN ('done', 'kept') ORDER BY created_at, capture_id",
    );
    return rows.map(parseRow);
  }

  /** The live memory items this note saved: the reading's, plus any it sourced (after a lost reply). */
  async itemsFor(captureId: string, reading: Reading | null): Promise<MemoryItem[]> {
    const ids = new Set((reading?.saved ?? []).map((s) => s.id));
    for (const s of await this.sourcesOf(captureId)) ids.add(s.memory_item_id);
    const out: MemoryItem[] = [];
    for (const id of ids) {
      const item = (await this.store.get("memory_items", id)) as MemoryItem | null;
      if (item && item.status !== "retracted" && item.status !== "superseded") out.push(item);
    }
    return out;
  }

  // ─── The user's actions ───────────────────────────────────────────────

  /** A note just told with AI on: understood as soon as it can be. */
  async told(captureId: string): Promise<void> {
    const now = this.store.now();
    await this.store.db.run(
      `INSERT INTO understanding (capture_id, state, created_at, updated_at) VALUES (?, 'waiting', ?, ?)
       ON CONFLICT (capture_id) DO NOTHING`,
      [captureId, now, now],
    );
    this.store.notify();
  }

  /** The review is on screen. Reports what was shown, or that it was reopened. */
  async opened(captureId: string): Promise<void> {
    this.onScreen.add(captureId);
    const row = await this.get(captureId);
    if (!row?.reading || row.state !== "review") return;
    const waiting = questionWaiting(row.reading);
    if (row.seen_at) {
      track("review_reopened", { question_waiting: waiting });
      return;
    }
    await this.save(captureId, { seen_at: this.store.now() });
    for (const item of await this.itemsFor(captureId, row.reading)) {
      track("review_item_shown", { tier: tierOf(item.id, row.reading), item_kind: kindName(item.kind) });
    }
    if (waiting) for (const t of questionTypes(row.reading.held)) track("clarification_shown", { type: t });
  }

  /** The user's answer to what was held. Kept here first, so nothing loses it. */
  async answer(captureId: string, answers: HeldAnswer[]): Promise<void> {
    const row = await this.get(captureId);
    const reading = row?.reading;
    if (!row || row.state !== "review" || !reading || !questionWaiting(reading) || !reading.review_created_at) {
      throw new StoreWriteError("nothing is waiting for an answer");
    }
    await this.save(captureId, {
      state: "answering",
      answer: { review_created_at: reading.review_created_at, answers },
      notice: null, attempts: 0, next_at: null,
    });
    for (const a of answers) {
      const type = questionType(reading.held[a.index]);
      if (type) track(a.skip ? "clarification_dismissed" : "clarification_answered", { type });
    }
    this.kick();
  }

  /**
   * The user is finished with the review: "done" confirms what they saw;
   * "idle" and "dismissed" leave items as they are (saved, unreviewed). A
   * question still unanswered keeps waiting, quietly, to be reopened.
   */
  async finish(captureId: string, how: "done" | "idle" | "dismissed"): Promise<void> {
    this.onScreen.delete(captureId);
    const row = await this.get(captureId);
    if (!row?.reading || row.state !== "review") return;
    const reading = row.reading;
    if (how === "done") {
      const memory = repositoriesFor(this.store).memory;
      for (const item of await this.itemsFor(captureId, reading)) {
        if (item.user_state !== "unreviewed") continue;
        await memory.confirm(item.id);
        track("review_item_accepted", { tier: tierOf(item.id, reading), item_kind: kindName(item.kind) });
      }
    }
    const waiting = questionWaiting(reading);
    track("review_left", { how, question_waiting: waiting });
    if (waiting) {
      await this.save(captureId, { notice: null });
      return;
    }
    const capture = await this.store.get("captures", captureId);
    const serverWaits = !reading.settled
      && (capture?.status === "needs_review" || reading.tier === "confirm" || reading.tier === "clarify");
    await this.save(captureId, { state: serverWaits ? "closing" : "done", notice: null, attempts: 0, next_at: null });
    if (serverWaits) this.kick();
  }

  /** Undo: the note and what it alone created go; an older memory it added to stays. */
  async undo(captureId: string): Promise<void> {
    const repos = repositoriesFor(this.store);
    for (const id of await this.createdOnlyBy(captureId)) await repos.memory.retract(id);
    if (await this.store.get("captures", captureId)) await repos.captures.remove(captureId);
    if (await this.get(captureId)) {
      await this.save(captureId, { state: "done", answer: null, notice: null, next_at: null });
    }
    track("undo_capture");
    this.kick();
  }

  /** A correction to a remembered item: the user's word wins (a user_edit source). */
  async correct(
    itemId: string,
    change:
      | { statement: string }
      | { person_id: string }
      | { kind: SwitchableKind }
      | { date: string | null },
  ): Promise<void> {
    const memory = repositoriesFor(this.store).memory;
    const item = (await this.store.get("memory_items", itemId)) as MemoryItem | null;
    if (!item) throw new StoreWriteError("that memory isn't here any more");
    let correction: "statement" | "person" | "kind" | "date";
    if ("statement" in change) {
      const statement = change.statement.normalize("NFC").trim();
      if (!statement) throw new StoreWriteError("say what to remember");
      if (statement === item.statement) return;
      await memory.correct(itemId, { statement });
      correction = "statement";
    } else if ("person_id" in change) {
      if (change.person_id === item.person_id) return;
      // "Sarah's sister" belongs on Sarah's page: moving it would orphan the relation.
      if (item.subject_type === "related") throw new StoreWriteError("this one is about someone close to them");
      if (!(await this.store.get("people", change.person_id))) throw new StoreWriteError("that person isn't here any more");
      await memory.correct(itemId, { person_id: change.person_id });
      correction = "person";
    } else if ("kind" in change) {
      if (change.kind === item.kind) return;
      if (item.kind === "promise" || item.subject_type === "user") throw new StoreWriteError("a promise stays a promise");
      await memory.correct(itemId, {
        kind: change.kind,
        detail: detailForKind(item.kind, (item.detail ?? {}) as Data, change.kind, item.statement),
      });
      correction = "kind";
    } else {
      await memory.correct(itemId, { detail: withDate(item.kind, (item.detail ?? {}) as Data, change.date) });
      correction = "date";
    }
    if (item.origin === "extracted") track("extraction_corrected", { correction, item_kind: kindName(item.kind) });
  }

  /** "Not this": retracted and removed. */
  async reject(itemId: string, captureId?: string): Promise<void> {
    const item = (await this.store.get("memory_items", itemId)) as MemoryItem | null;
    if (!item) return;
    await repositoriesFor(this.store).memory.retract(itemId);
    if (item.origin === "extracted") {
      const row = captureId ? await this.get(captureId) : null;
      track("review_item_rejected", {
        tier: row?.reading ? tierOf(itemId, row.reading) : "later",
        item_kind: kindName(item.kind),
      });
    }
  }

  // ─── Running ──────────────────────────────────────────────────────────

  /**
   * One pass over everything due: sync (so the gateway can read new notes),
   * understand, deliver answers and closes, then sync again for what the
   * server wrote. Concurrent calls share the pass; a call during a pass
   * schedules one more.
   */
  run(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.pass();
        } while (this.again);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  /** Runs in the background; errors are reported, never thrown at the UI. */
  private kick(): void {
    this.run().catch((err: unknown) => {
      console.error(`understanding: pass failed: ${err instanceof Error ? err.name : "error"}`);
    });
  }

  private async pass(): Promise<void> {
    await this.discover();
    const first = await this.sync();
    this.offline = first.offline;
    if (first.offline) {
      this.store.notify();
      return;
    }
    await this.finishLeftOpen();
    let wrote = false;
    for (const row of await this.due()) {
      try {
        if (row.state === "waiting") wrote = (await this.understandNote(row)) || wrote;
        else if (row.state === "answering") wrote = (await this.deliverAnswer(row)) || wrote;
        else if (row.state === "closing") wrote = (await this.deliverClose(row)) || wrote;
      } catch (err) {
        if (!(err instanceof GatewayUnreachable)) throw err;
        this.offline = true;
        break; // no answer: everything stays as it is until the next pass
      }
    }
    if (wrote) {
      const second = await this.sync();
      this.offline = this.offline || second.offline;
      if (!second.offline) await this.afterPull();
    }
    this.store.notify();
  }

  /** Notes told with AI on (here, or pulled from another device) that nothing tracks yet. */
  private async discover(): Promise<void> {
    const captures = await this.store.list("captures");
    for (const c of captures) {
      if (c.status !== "pending" || !c.raw_text) continue;
      if (!(await this.get(c.id as string))) await this.told(c.id as string);
    }
  }

  private async due(): Promise<UnderstandingRow[]> {
    const now = this.store.now();
    const rows = await this.store.db.all<Record<string, SqlValue>>(
      `SELECT * FROM understanding WHERE state IN ('waiting', 'answering', 'closing')
         AND (next_at IS NULL OR next_at <= ?) ORDER BY created_at, capture_id`,
      [now],
    );
    return rows.map(parseRow);
  }

  /**
   * A review the user saw, with nothing asked, that never got its Done or
   * dismissal (the app was killed with the sheet open): finished as left, so
   * the server isn't kept waiting. Items stay as saved. A question never
   * expires here: it waits for the user.
   */
  private async finishLeftOpen(): Promise<void> {
    const cutoff = new Date(Date.parse(this.store.now()) - LEFT_OPEN_MS).toISOString();
    for (const row of await this.open()) {
      if (row.state !== "review" || !row.reading || !row.seen_at || row.seen_at > cutoff) continue;
      if (this.onScreen.has(row.capture_id) || questionWaiting(row.reading)) continue;
      await this.finish(row.capture_id, "idle");
    }
  }

  // ─── Understanding a note ─────────────────────────────────────────────

  private async understandNote(row: UnderstandingRow): Promise<boolean> {
    const id = row.capture_id;
    const capture = await this.store.get("captures", id);
    if (!capture) {
      // Deleted (Undo, or on another device): nothing to understand.
      await this.save(id, { state: "done" });
      return false;
    }
    // Its first sync hasn't gone through (queued, or refused and recorded).
    if ((await this.store.pendingOps()).some((op) => op.tbl === "captures" && op.row_id === id && op.kind === "insert")) {
      return false;
    }
    const started = this.clock();
    let reply: Understood;
    try {
      reply = await this.gateway.understand(id);
    } catch (err) {
      if (err instanceof GatewayRefused) return this.refusedUnderstanding(row, err);
      throw err;
    }
    if (reply.status === "kept") {
      // The model declined this note: kept as written, quietly.
      await this.save(id, { state: "kept", attempts: 0, next_at: null });
      return false;
    }
    if (reply.status === "extracted") {
      track("extraction_completed", {
        items_n: smallCount(reply.saved.length + reply.held.length),
        tier: reply.tier === "confirm" ? "light" : reply.tier === "nothing" ? "none" : reply.tier,
        latency_ms_bucket: latencyBucket(this.clock() - started),
        model_id: "primary",
      });
    }
    const reading: Reading = reply.status === "extracted"
      ? {
          tier: reply.tier,
          saved: reply.saved.filter((s) => s.id).map((s) => ({ id: s.id as string, tier: s.tier === "auto" ? "auto" : "confirm" })),
          held: reply.held,
          clarification: reply.clarification,
          review_created_at: reply.review_created_at,
          settled: reply.held.length === 0 && (reply.tier === "auto" || reply.tier === "nothing"),
        }
      : {
          tier: "unknown",
          saved: [],
          held: reply.held,
          clarification: reply.clarification,
          review_created_at: reply.review_created_at,
          settled: false,
        };
    const nothing = reply.status === "extracted" && reading.saved.length === 0 && reading.held.length === 0;
    await this.save(id, { state: nothing ? "done" : "review", reading, attempts: 0, next_at: null });
    return true;
  }

  private async refusedUnderstanding(row: UnderstandingRow, err: GatewayRefused): Promise<boolean> {
    switch (err.refusal) {
      case "consent_required":
      case "feature_disabled":
      case "invalid_request":
      case "not_found":
        // AI is off for this user, or the note isn't theirs to understand: kept as written.
        await this.save(row.capture_id, { state: "kept", attempts: 0, next_at: null });
        return false;
      case "daily_limit_reached":
        await this.save(row.capture_id, { next_at: this.later((err.retryAfterS ?? 3600) * 1000) });
        return false;
      default:
        await this.failed(row, "kept");
        return false;
    }
  }

  // ─── Delivering the user's answer and "done" ──────────────────────────

  private async deliverAnswer(row: UnderstandingRow): Promise<boolean> {
    const id = row.capture_id;
    const pending = row.answer;
    const reading = row.reading;
    if (!pending || !reading) {
      await this.save(id, { state: "review", answer: null });
      return false;
    }
    try {
      const reply = await this.gateway.answer(id, pending.review_created_at, pending.answers);
      const saved = reply.status === "resolved"
        ? [...reading.saved, ...reply.saved.filter((s) => s.id).map((s) => ({ id: s.id as string, tier: "confirm" as const }))]
        : reading.saved;
      await this.save(id, {
        // Shown if the user is still looking; otherwise it's simply remembered.
        state: this.onScreen.has(id) ? "review" : "done",
        reading: { ...reading, saved, held: [], clarification: null, review_created_at: null, settled: true, answered: pending.answers },
        answer: null, notice: null, attempts: 0, next_at: null,
      });
      return true;
    } catch (err) {
      if (!(err instanceof GatewayRefused)) throw err;
      switch (err.refusal) {
        case "review_changed":
          return this.reaskAfterChange(row);
        case "not_waiting":
          // Answered or dismissed on another device.
          await this.settleElsewhere(row);
          return true;
        case "invalid_answer":
          // A choice that no longer fits (someone was removed meanwhile): ask again.
          await this.save(id, { state: "review", answer: null, notice: "choose_again", attempts: 0, next_at: null });
          return false;
        case "not_found":
          await this.save(id, { state: "done", answer: null });
          return false;
        case "consent_required":
        case "feature_disabled":
          // AI was switched off: an AI reading isn't turned into memory now.
          await this.save(id, {
            state: "done", answer: null,
            reading: { ...reading, held: [], clarification: null, review_created_at: null },
          });
          return false;
        default:
          // The user's answer is never dropped: keep trying, more slowly.
          await this.failed(row, null);
          return false;
      }
    }
  }

  /** The stored question isn't the one answered, or the note changed under it. */
  private async reaskAfterChange(row: UnderstandingRow): Promise<boolean> {
    const id = row.capture_id;
    const reading = row.reading as Reading;
    let now: Understood;
    try {
      now = await this.gateway.understand(id); // "done": the current question, no model call
    } catch (err) {
      if (err instanceof GatewayRefused) {
        await this.failed(row, null);
        return false;
      }
      throw err;
    }
    if (now.status !== "kept" && now.held.length && now.review_created_at && now.review_created_at !== row.answer?.review_created_at) {
      await this.save(id, {
        state: "review", answer: null, notice: "changed_elsewhere", attempts: 0, next_at: null,
        reading: { ...reading, held: now.held, clarification: now.clarification, review_created_at: now.review_created_at, settled: false },
      });
      return false;
    }
    if (now.status !== "kept" && now.held.length) {
      // Same question, different words in the note: the answer can't apply to
      // them, so the held part is let go and the note stays as written.
      try {
        await this.gateway.close(id);
      } catch (err) {
        if (!(err instanceof GatewayRefused)) throw err;
      }
    }
    await this.settleElsewhere(row);
    return true;
  }

  private async settleElsewhere(row: UnderstandingRow): Promise<void> {
    await this.save(row.capture_id, {
      state: "review", answer: null, notice: "changed_elsewhere", attempts: 0, next_at: null,
      reading: { ...(row.reading as Reading), held: [], clarification: null, review_created_at: null, settled: true },
    });
  }

  private async deliverClose(row: UnderstandingRow): Promise<boolean> {
    try {
      await this.gateway.close(row.capture_id);
    } catch (err) {
      if (!(err instanceof GatewayRefused)) throw err;
      if (err.refusal !== "not_found") {
        await this.failed(row, "done");
        return false;
      }
    }
    await this.save(row.capture_id, { state: "done", attempts: 0, next_at: null });
    return true;
  }

  // ─── After the server wrote: reconcile with what sync brought ─────────

  private async afterPull(): Promise<void> {
    for (const row of await this.open()) {
      const reading = row.reading;
      if (row.state !== "review" || !reading) continue;
      // An answer reported as already given: did it land as the user meant?
      if (reading.answered) {
        const items = await this.itemsFor(row.capture_id, reading);
        const missed = reading.answered.some((a) =>
          a.person_id && !items.some((i) => i.person_id === a.person_id));
        await this.save(row.capture_id, {
          reading: { ...reading, answered: undefined },
          ...(missed && row.notice === null ? { notice: "changed_elsewhere" as const } : {}),
        });
      }
      // Recovered after a lost reply, and nothing came of the note.
      if (reading.tier === "unknown" && reading.held.length === 0 && (await this.itemsFor(row.capture_id, reading)).length === 0) {
        const capture = await this.store.get("captures", row.capture_id);
        if (capture?.status !== "needs_review") await this.save(row.capture_id, { state: "done" });
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /** A failed attempt: retry later; past the limit, `giveUp` (or keep retrying slowly). */
  private async failed(row: UnderstandingRow, giveUp: UnderstandingState | null): Promise<void> {
    const attempts = row.attempts + 1;
    if (giveUp && attempts >= this.maxAttempts) {
      await this.save(row.capture_id, { state: giveUp, attempts, next_at: null });
      return;
    }
    await this.save(row.capture_id, { attempts, next_at: this.later(this.backoffMs(attempts)) });
  }

  private later(ms: number): string {
    return new Date(Date.parse(this.store.now()) + ms).toISOString();
  }

  private async sourcesOf(captureId: string): Promise<MemorySource[]> {
    const all = (await this.store.list("memory_item_sources")) as MemorySource[];
    return all.filter((s) => s.capture_id === captureId);
  }

  /** Items whose every live source is this note. */
  private async createdOnlyBy(captureId: string): Promise<string[]> {
    const all = (await this.store.list("memory_item_sources")) as MemorySource[];
    const mine = new Set(all.filter((s) => s.capture_id === captureId).map((s) => s.memory_item_id));
    const out: string[] = [];
    for (const id of mine) {
      if (all.some((s) => s.memory_item_id === id && s.capture_id !== captureId)) continue;
      const item = await this.store.get("memory_items", id);
      if (item) out.push(id);
    }
    return out;
  }

  private async save(captureId: string, patch: Partial<Omit<UnderstandingRow, "capture_id" | "created_at">>): Promise<void> {
    const sets: string[] = [];
    const params: SqlValue[] = [];
    for (const [k, v] of Object.entries(patch)) {
      sets.push(`${k} = ?`);
      params.push(k === "reading" || k === "answer" ? (v === null || v === undefined ? null : JSON.stringify(v)) : (v as SqlValue));
    }
    sets.push("updated_at = ?");
    params.push(this.store.now(), captureId);
    await this.store.db.run(`UPDATE understanding SET ${sets.join(", ")} WHERE capture_id = ?`, params);
    this.store.notify();
  }
}

// ─── Pure helpers ───────────────────────────────────────────────────────

export function questionWaiting(reading: Reading): boolean {
  return !reading.settled && reading.held.length > 0;
}

/** What kind of question a held item needs, in coarse, content-free terms. */
export function questionType(item: HeldItem | undefined): ClarificationType | null {
  if (!item) return null;
  if (item.flags.includes("new_person") && !item.person_id) return "new_person";
  if (!item.person_id || PERSON_FLAGS.some((f) => item.flags.includes(f))) return "person";
  if (item.flags.includes("subject_check")) return "relation";
  if (item.flags.includes("date_unresolved_sensitive")) return "date";
  // Held only for the user's yes (sensitive, or an ambiguous day).
  return "keep";
}

function questionTypes(held: HeldItem[]): ClarificationType[] {
  return [...new Set(held.map(questionType).filter((t): t is ClarificationType => t !== null))];
}

function tierOf(itemId: string, reading: Reading): "auto" | "light" {
  const s = reading.saved.find((x) => x.id === itemId);
  if (s) return s.tier === "auto" ? "auto" : "light";
  return reading.tier === "auto" ? "auto" : "light";
}

const KINDS: readonly MemoryKindName[] = ["fact", "event", "promise", "plan", "thread", "moment", "milestone", "tradition", "context"];

function kindName(kind: string): MemoryKindName {
  return (KINDS as readonly string[]).includes(kind) ? (kind as MemoryKindName) : "context";
}

function latencyBucket(ms: number): "<1s" | "1-3s" | "3-10s" | "10s+" {
  return ms < 1000 ? "<1s" : ms < 3000 ? "1-3s" : ms < 10_000 ? "3-10s" : "10s+";
}

function parseRow(r: Record<string, SqlValue>): UnderstandingRow {
  return {
    capture_id: r.capture_id as string,
    state: r.state as UnderstandingState,
    reading: r.reading ? (JSON.parse(r.reading as string) as Reading) : null,
    answer: r.answer ? (JSON.parse(r.answer as string) as PendingAnswer) : null,
    notice: (r.notice as Notice | null) ?? null,
    attempts: (r.attempts as number) ?? 0,
    next_at: (r.next_at as string | null) ?? null,
    seen_at: (r.seen_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
