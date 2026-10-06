/**
 * Stall telemetry for freeze investigation (G5)
 *
 * A timer that should tick every TICK_MS. When it fires late by more than
 * STALL_MS while the app stayed in the foreground, the JavaScript thread
 * was blocked: reported as `app_stall` with a duration bucket and whether
 * Tell work was running. Nothing else: no screen, no content.
 *
 * Started only when analytics is installed (analyticsSetup.ts).
 */

import { AppState, type AppStateStatus } from "react-native";
import { durationBucketOf, track } from "@/platform/analytics";

const TICK_MS = 250;
const STALL_MS = 1000;

let work = 0;

/** Tell work (understanding a note) started or finished. */
export function tellWork(running: boolean): void {
  work = Math.max(0, work + (running ? 1 : -1));
}

export interface StallMonitorDeps {
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  appState?: { currentState: AppStateStatus | null; addEventListener: typeof AppState.addEventListener };
}

/** Starts watching; returns a stop function. */
export function startStallMonitor(deps: StallMonitorDeps = {}): () => void {
  const now = deps.now ?? (() => Date.now());
  const every = deps.setInterval ?? ((fn: () => void, ms: number) => setInterval(fn, ms));
  const stop = deps.clearInterval ?? ((h: unknown) => clearInterval(h as ReturnType<typeof setInterval>));
  const appState = deps.appState ?? AppState;
  // At launch the state can read "unknown"; only background / inactive are away.
  const away = (st: AppStateStatus | null) => st === "background" || st === "inactive";
  let active = !away(appState.currentState);
  let last = now();
  const sub = appState.addEventListener("change", (s) => {
    active = !away(s);
    // Time in the background is not a stall.
    last = now();
  });
  const handle = every(() => {
    const t = now();
    const late = t - last - TICK_MS;
    last = t;
    if (active && late >= STALL_MS) track("app_stall", { duration_bucket: durationBucketOf(late), tell_work: work > 0 });
  }, TICK_MS);
  return () => {
    stop(handle);
    sub.remove();
  };
}
