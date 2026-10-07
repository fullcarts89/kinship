// Feature flags for the signed-in user (FLG-02). The shell is decided once
// per launch (useLaunchShell); other flags update when the app returns to the
// foreground, so a switch-off (e.g. Tell) applies without a relaunch. The
// server enforces its own flags (ai_extraction) on every call regardless.

import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { buildEntryShell, type EntryShell } from "@/platform/entryShell";
import { FlagRepo, secureStoreFlagCache, supabaseFlagSource, type Flags } from "@/store/flags";

let repo: FlagRepo | null = null;
let launch: { userId: string; flags: Flags } | null = null;
let live: { userId: string; flags: Flags } | null = null;
const listeners = new Set<() => void>();

function flagRepo(): FlagRepo | null {
  if (!supabase || !isSupabaseConfigured) return null;
  repo ??= new FlagRepo(supabaseFlagSource(supabase), secureStoreFlagCache());
  return repo;
}

function publish(): void {
  for (const l of [...listeners]) l();
}

async function launchFlags(userId: string): Promise<Flags> {
  if (launch?.userId === userId) return launch.flags;
  const r = flagRepo();
  const flags = r ? await r.atLaunch(userId) : {};
  launch = { userId, flags };
  if (live?.userId !== userId) live = { userId, flags };
  void refreshFlags(userId);
  return flags;
}

async function refreshFlags(userId: string): Promise<void> {
  const fresh = await flagRepo()?.refresh(userId);
  if (fresh && launch?.userId === userId) {
    live = { userId, flags: fresh };
    publish();
  }
}

/** Sign-out: forget this session's flags and the device's copy. */
export async function forgetFlags(): Promise<void> {
  launch = null;
  live = null;
  publish();
  try {
    await secureStoreFlagCache().clear();
  } catch {
    // Nothing kept.
  }
}

/**
 * The shell for an account's flags: 2.0 when shell_v2 is on. In the 2.0
 * build (EXPO_PUBLIC_V2_ENTRY=1) an unknown answer (no server answer in time,
 * an error, nothing kept on this phone) is 2.0 too: only the server's
 * explicit "off" opens 1.0 there, so rollout stays per account and a slow
 * start never drops a 2.0 account into 1.0 (founder I8). Elsewhere unknown
 * stays 1.0.
 */
export function shellFor(flags: Flags | null, build: EntryShell | null = buildEntryShell()): EntryShell {
  if (flags?.shell_v2 === true) return "v2";
  if (build === "v2" && flags?.shell_v2 !== false) return "v2";
  return "v1";
}

/**
 * Whether a 1.0 deep link (a notification 1.0's Home scheduled) may open a
 * 1.0 screen now: only in a 1.0 session. In the 2.0 build, never while the
 * launch is still deciding (founder I8).
 */
export function legacyRoutesAllowed(build: EntryShell | null = buildEntryShell()): boolean {
  if (launch) return shellFor(launch.flags, build) === "v1";
  return build !== "v2";
}

/** Which shell this launch uses; null while deciding (see shellFor). */
export function useLaunchShell(userId: string | null): "v1" | "v2" | null {
  const [shell, setShell] = useState<"v1" | "v2" | null>(() =>
    !userId ? "v1" : launch?.userId === userId ? shellFor(launch.flags) : null);
  useEffect(() => {
    if (!userId) {
      setShell("v1");
      return;
    }
    let cancelled = false;
    launchFlags(userId).then(
      (f) => !cancelled && setShell(shellFor(f)),
      () => !cancelled && setShell(shellFor(null)),
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return shell;
}

/** This account's flags, refreshed on returning to the foreground. Unknown is off. */
export function useFlags(userId: string | null): Flags {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    if (userId) void launchFlags(userId).then(l);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && userId) void refreshFlags(userId);
    });
    return () => {
      listeners.delete(l);
      sub.remove();
    };
  }, [userId]);
  return userId && live?.userId === userId ? live.flags : {};
}
