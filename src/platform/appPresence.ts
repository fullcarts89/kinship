// Whether the app went to the background (founder CC-18, dogfood telemetry):
// a count of trips to the background since launch. A Tell remembers the count
// when it is sent; a higher count when its result shows means the user left
// the app while it was being understood. Nothing else is kept.
import { AppState, type AppStateStatus } from "react-native";

let away = 0;
let watching = false;

/** Starts counting (once); returns nothing to stop: it lasts the launch. */
export function watchPresence(appState: { addEventListener: typeof AppState.addEventListener } = AppState): void {
  if (watching) return;
  watching = true;
  appState.addEventListener("change", (s: AppStateStatus) => {
    if (s === "background") away += 1;
  });
}

/** Trips to the background since launch. */
export function awayCount(): number {
  return away;
}
