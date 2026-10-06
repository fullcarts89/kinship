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
  async shown(reasonId: string, personId: string, day: string): Promise<void> {
    const state = await this.read();
    if (state.local[reasonId]?.firstShown) return;
    await this.patch(reasonId, { firstShown: day });
    const primaries = [...state.primaries.filter((p) => p.reasonId !== reasonId), { personId, reasonId, day }].slice(-50);
    await setMeta(this.store.db, PRIMARIES, JSON.stringify(primaries));
    this.store.notify();
  }

  async dismissed(reasonId: string, at: string): Promise<void> {
    await this.patch(reasonId, { dismissed: at });
    this.store.notify();
  }

  /** Kinship opened a conversation: remembered for the return check. */
  async handedOff(handoff: Handoff): Promise<void> {
    await this.patch(handoff.reasonId, { acted: handoff.at });
    await setMeta(this.store.db, HANDOFF, JSON.stringify(handoff));
    this.store.notify();
  }

  /** The other app never opened: the hand-off didn't happen. */
  async cancel(reasonId: string): Promise<void> {
    const { handoff } = await this.read();
    if (handoff?.reasonId === reasonId && !handoff.answered) await setMeta(this.store.db, HANDOFF, JSON.stringify(null));
    await this.patch(reasonId, { acted: undefined });
    this.store.notify();
  }

  /** The return check's answer. "Not yet" lets the reason speak again while its window lasts. */
  async answered(answer: "yes" | "not_yet", at: string): Promise<Handoff | null> {
    const { handoff } = await this.read();
    if (!handoff) return null;
    await setMeta(this.store.db, HANDOFF, JSON.stringify({ ...handoff, answered: answer }));
    if (answer === "yes") await this.patch(handoff.reasonId, { done: at });
    else await this.patch(handoff.reasonId, { acted: undefined });
    this.store.notify();
    return handoff;
  }
}
