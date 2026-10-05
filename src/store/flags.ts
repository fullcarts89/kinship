// Feature flags in the app (plan §25; tickets FLG-02 and FLG-04). The server
// decides: my_flags() resolves each flag's default, rollout percentage and
// any per-account override for the signed-in user (user_flag_overrides,
// writable only with the service role). Server-enforced flags such as
// ai_extraction are checked again by the server on every call; the app's
// copy only decides what to show.
//
// At launch the app asks the server first (a few seconds at most), so an
// account switched on is on at its very next launch. Without an answer in
// time (offline, a slow start), it decides from the last answer kept on the
// device, and an answer that arrives late is still kept for next time.
// Unknown is off: no flag ever turns on by accident.

import type { SupabaseClient } from "@supabase/supabase-js";

export type FlagKey =
  | "shell_v2"
  | "memory_v2"
  | "tell"
  | "ai_extraction"
  | "relationship_page_v2"
  | "voice_capture";

export type Flags = Readonly<Record<string, boolean>>;

/** The server's answer for the signed-in user. Throws when it can't be had. */
export interface FlagSource {
  fetch(): Promise<Flags>;
}

/** One device-local slot for the signed-in user's last answer. */
export interface FlagCache {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
}

export function isOn(flags: Flags, key: FlagKey): boolean {
  return flags[key] === true;
}

export class FlagRepo {
  constructor(
    private readonly source: FlagSource,
    private readonly cache: FlagCache,
    private readonly timeoutMs = 4000,
  ) {}

  /** What to launch with: the server's answer if it comes in time, else this user's last known flags, else all off. */
  async atLaunch(userId: string): Promise<Flags> {
    return (await this.refresh(userId)) ?? (await this.cached(userId)) ?? {};
  }

  /**
   * Asks the server and returns its answer, or null if none came in time.
   * Every answer is remembered on the device, even one that arrives after
   * the wait, so a slow start never leaves a stale copy behind.
   */
  async refresh(userId: string): Promise<Flags | null> {
    const answer = this.source.fetch().then(async (flags) => {
      try {
        await this.cache.write(JSON.stringify({ user_id: userId, flags }));
      } catch {
        // Not remembered: the next launch asks again.
      }
      return flags;
    });
    answer.catch(() => undefined);
    try {
      return await withTimeout(answer, this.timeoutMs);
    } catch {
      return null;
    }
  }

  private async cached(userId: string): Promise<Flags | null> {
    try {
      const raw = await this.cache.read();
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { user_id?: unknown; flags?: unknown };
      // Another account's flags are never used for this one.
      if (parsed.user_id !== userId || !parsed.flags || typeof parsed.flags !== "object") return null;
      const out: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(parsed.flags as Record<string, unknown>)) out[k] = v === true;
      return out;
    } catch {
      return null;
    }
  }
}

export function supabaseFlagSource(client: SupabaseClient): FlagSource {
  return {
    async fetch() {
      const { data, error } = await client.rpc("my_flags");
      if (error) throw new Error("flags unavailable");
      const out: Record<string, boolean> = {};
      for (const row of (data ?? []) as { key: unknown; enabled: unknown }[]) {
        if (typeof row.key === "string") out[row.key] = row.enabled === true;
      }
      return out;
    },
  };
}

const CACHE_KEY = "kinship.flags";

/** SecureStore on the device (this device only); cleared on sign-out. */
export function secureStoreFlagCache(): FlagCache {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ss = () => require("expo-secure-store") as typeof import("expo-secure-store");
  return {
    read: () => ss().getItemAsync(CACHE_KEY),
    write: (value) => ss().setItemAsync(CACHE_KEY, value, { keychainAccessible: ss().AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
    clear: () => ss().deleteItemAsync(CACHE_KEY),
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
