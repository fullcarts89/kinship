// What this device remembers about Today's reasons (plan §13, §15): which
// were shown and when, which the user acted on or put aside, and the last
// hand-off Kinship opened (for the return check). Kept in the encrypted
// store's meta table; the server keeps its own record through reason_events
// when online. Ids, days and a channel, plus the return question's own words
// for the last hand-off (the reason, so the user knows what it's asking about).

import type { Handoff, LocalReason } from "@/features/today/todayModel";
import { getMeta, setMeta } from "./schema";
import type { UserStore } from "./userStore";

const REASONS = "reasons_local";
const PRIMARIES = "reasons_primaries";
const HANDOFF = "reasons_handoff";

export interface ReasonLocalState {
  local: Record<string, LocalReason>;
  primaries: { personId: string; reasonId: string; day: string }[];
  handoff: Handoff | null;
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class ReasonLocal {
  /**
   * Every write, one at a time: each reads and rewrites the same record, so
   * an answer, a "shown" from a sync and a "Not now" can never undo one
   * another, and a second tap sees the first (founder K3, N6, I2).
   */
  private queue: Promise<unknown> = Promise.resolve();

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  constructor(private readonly store: UserStore) {}

  async read(): Promise<ReasonLocalState> {
    const db = this.store.db;
    return {
      local: parse(await getMeta(db, REASONS), {}),
      primaries: parse(await getMeta(db, PRIMARIES), []),
      handoff: parse(await getMeta(db, HANDOFF), null),
    };
  }

  private async patch(id: string, change: Partial<LocalReason>): Promise<void> {
    const db = this.store.db;
    const all = parse<Record<string, LocalReason>>(await getMeta(db, REASONS), {});
    all[id] = { ...all[id], ...change };
    // Keep the last 200 reasons; older ones have long expired.
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - 200))) delete all[k];
    await setMeta(db, REASONS, JSON.stringify(all));
  }

  /** The moment was shown today (once per day is enough). */
  shown(reasonId: string, personId: string, day: string): Promise<void> {
    return this.serial(() => this.shownNow(reasonId, personId, day));
  }

  private async shownNow(reasonId: string, personId: string, day: string): Promise<void> {
    const state = await this.read();
    if (state.local[reasonId]?.firstShown) return;
    await this.patch(reasonId, { firstShown: day });
    const primaries = [...state.primaries.filter((p) => p.reasonId !== reasonId), { personId, reasonId, day }].slice(-50);
    await setMeta(this.store.db, PRIMARIES, JSON.stringify(primaries));
    this.store.notify();
  }

  dismissed(reasonId: string, at: string): Promise<void> {
    return this.serial(async () => {
      await this.patch(reasonId, { dismissed: at });
      this.store.notify();
    });
  }

  /** Kinship opened a conversation: remembered for the return check. */
  handedOff(handoff: Handoff): Promise<void> {
    return this.serial(async () => {
      await this.patch(handoff.reasonId, { acted: handoff.at });
      await setMeta(this.store.db, HANDOFF, JSON.stringify(handoff));
      this.store.notify();
    });
  }

  /**
   * The other app never opened: the hand-off didn't happen. Marked "not yet",
   * so a sync's "acted" (sent before the app opened) doesn't silence it.
   */
  cancel(reasonId: string, at: string = new Date().toISOString()): Promise<void> {
    return this.serial(async () => {
      const { handoff } = await this.read();
      if (handoff?.reasonId === reasonId && !handoff.answered) await setMeta(this.store.db, HANDOFF, JSON.stringify(null));
      await this.patch(reasonId, { acted: undefined, notYet: at });
      this.store.notify();
    });
  }

  /**
   * A conversation about this promise was "Not this" (founder I2, K3): its
   * "Waiting on …" may ask again, as it does on every other phone.
   */
  reopenWaiting(itemId: string): Promise<void> {
    return this.serial(async () => {
      const all = parse<Record<string, LocalReason>>(await getMeta(this.store.db, REASONS), {});
      for (const id of Object.keys(all)) {
        if (id.startsWith(`waiting:${itemId}:`)) all[id] = { ...all[id], done: undefined, acted: undefined };
      }
      await setMeta(this.store.db, REASONS, JSON.stringify(all));
      this.store.notify();
    });
  }

  /**
   * The return check's answer, once per hand-off: null when nothing waits for
   * one, or it was already answered (a second tap changes nothing). "Not yet"
   * lets the reason speak again while its window lasts, also after a sync has
   * brought the server's "acted" back (founder N6).
   */
  answered(answer: "yes" | "not_yet" | "put_aside", at: string, record?: (h: Handoff) => Promise<void>): Promise<Handoff | null> {
    return this.serial(() => this.answerOnce(answer, at, record));
  }

  /**
   * `record` runs first, before the answer is kept: if the app is closed in
   * between, the question is still there and asks again, and `record` must
   * be safe to run twice (returnLoop.ts writes the conversation by a key of
   * the hand-off, so a second run finds it).
   */
  private async answerOnce(answer: "yes" | "not_yet" | "put_aside", at: string, record?: (h: Handoff) => Promise<void>): Promise<Handoff | null> {
    const { handoff } = await this.read();
    if (!handoff || handoff.answered) return null;
    if (record) await record(handoff);
    await setMeta(this.store.db, HANDOFF, JSON.stringify({ ...handoff, answered: answer }));
    if (answer === "yes") await this.patch(handoff.reasonId, { done: at, notYet: undefined });
    // "Didn't happen" (RSN-06): put aside, as "Not now" does; it never speaks again, and nothing is recorded.
    else if (answer === "put_aside") await this.patch(handoff.reasonId, { acted: undefined, dismissed: at });
    else await this.patch(handoff.reasonId, { acted: undefined, notYet: at });
    this.store.notify();
    return handoff;
  }
}
