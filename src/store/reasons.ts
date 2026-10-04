// Today's reasons for the session (plan §13–15): asks the server to refresh
// the user's reasons (refresh_my_reasons: deterministic, their own data
// only), then syncs so the new rows arrive in the encrypted store. Records
// what the user did with a reason in reason_events when online; offline, the
// device's own record (reasonLocal.ts) still governs Today.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReasonEvent =
  | "shown"
  | "acted"
  | "dismissed_not_now"
  | "return_yes"
  | "return_not_yet";

export interface ReasonsTransport {
  refresh(timeZone: string | null): Promise<void>;
  record(reasonId: string, event: ReasonEvent, channel?: string): Promise<void>;
}

const MIN_INTERVAL_MS = 10 * 60 * 1000;

export class Reasons {
  private last = Number.NEGATIVE_INFINITY;
  private running: Promise<void> | null = null;

  constructor(
    private readonly transport: ReasonsTransport,
    private readonly sync: () => Promise<unknown>,
    private readonly clock: () => number = Date.now,
  ) {}

  /** At most every 10 minutes unless forced (a new note was just understood). */
  refresh(opts: { force?: boolean; timeZone?: string | null } = {}): Promise<void> {
    if (this.running) return this.running;
    if (!opts.force && this.clock() - this.last < MIN_INTERVAL_MS) return Promise.resolve();
    this.running = (async () => {
      try {
        await this.transport.refresh(opts.timeZone ?? null);
        this.last = this.clock();
        await this.sync();
      } catch {
        // Offline or refused: Today uses what's already on the device.
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  record(reasonId: string, event: ReasonEvent, channel?: string): void {
    this.transport.record(reasonId, event, channel).catch(() => undefined);
  }
}

/** Over Supabase, as the signed-in user. */
export function supabaseReasonsTransport(client: SupabaseClient): ReasonsTransport {
  return {
    async refresh(timeZone) {
      const { error } = await client.rpc("refresh_my_reasons", { p_time_zone: timeZone });
      if (error) throw error;
    },
    async record(reasonId, event, channel) {
      const { error } = await client.from("reason_events").insert({
        reason_id: reasonId, event, surface: "today", ...(channel ? { channel } : {}),
      });
      if (error) throw error;
    },
  };
}
