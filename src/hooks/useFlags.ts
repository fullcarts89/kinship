// Feature flags for the signed-in user (FLG-02). The shell is decided once
// per launch (useLaunchShell); other flags update when the app returns to the
// foreground, so a switch-off (e.g. Tell) applies without a relaunch. The
// server enforces its own flags (ai_extraction) on every call regardless.

import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { FlagRepo, isOn, secureStoreFlagCache, supabaseFlagSource, type Flags } from "@/store/flags";

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

/** Which shell this launch uses; null while deciding. 1.0 unless shell_v2 is on for this account. */
export function useLaunchShell(userId: string | null): "v1" | "v2" | null {
  const [shell, setShell] = useState<"v1" | "v2" | null>(() =>
    !userId ? "v1" : launch?.userId === userId ? (isOn(launch.flags, "shell_v2") ? "v2" : "v1") : null);
  useEffect(() => {
    if (!userId) {
      setShell("v1");
      return;
    }
    let cancelled = false;
    launchFlags(userId).then(
      (f) => !cancelled && setShell(isOn(f, "shell_v2") ? "v2" : "v1"),
      () => !cancelled && setShell("v1"),
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
