/**
 * Orientation Hook
 *
 * Manages the first-time user orientation flow state.
 * Persists completion/skip status in expo-secure-store so the
 * orientation only shows once per install.
 *
 * Uses module-level shared state (matching locallyCreatedMemories
 * pattern) so all screens see the same step in real time.
 *
 * The orientation has 4 steps across 2 screens:
 *   Steps 1–2: Home screen (garden overview, individual plant)
 *   Steps 3–4: Person Profile (action buttons, reflect/memory)
 *
 * After completing or skipping, the orientation never shows again
 * unless the user taps "Replay orientation" in Settings.
 */

import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "kinship.orientation.status";

export type OrientationStatus = "active" | "completed" | "skipped";

/** Total number of orientation steps. */
export const ORIENTATION_TOTAL_STEPS = 4;

/**
 * Which screen each step targets.
 * Used by screens to check if they should render the overlay.
 */
export const ORIENTATION_STEP_SCREEN: Record<number, string> = {
  1: "home",
  2: "home",
  3: "person",
  4: "person",
};

// ─── Module-level shared state ──────────────────────────────────────────────
// Shared across all hook instances so every screen sees the same orientation
// state. Matches the locallyCreatedMemories / locallyCreatedInteractions
// pattern used elsewhere in the codebase.

let _currentStep = 1;
let _status: OrientationStatus | null = null;
let _isLoaded = false;
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOrientation() {
  const [, rerender] = useState(0);

  // Subscribe to module-level state changes
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  // Load persisted status from SecureStore on first mount (globally)
  useEffect(() => {
    if (_isLoaded) return;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored === "completed" || stored === "skipped") {
          _status = stored;
        } else {
          _status = "active";
        }
      } catch {
        _status = "active";
      }
      _isLoaded = true;
      notifyListeners();
    })();
  }, []);

  /** Whether the orientation overlay should be displayed. */
  const isActive = _isLoaded && _status === "active";

  /** Advance to the next step, or complete if on the last step. */
  const advance = useCallback(async () => {
    if (_currentStep >= ORIENTATION_TOTAL_STEPS) {
      _status = "completed";
      notifyListeners();
      try {
        await SecureStore.setItemAsync(STORAGE_KEY, "completed");
      } catch {
        // Silent
      }
    } else {
      _currentStep += 1;
      notifyListeners();
    }
  }, []);

  /** Skip the orientation entirely. */
  const skip = useCallback(async () => {
    _status = "skipped";
    notifyListeners();
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, "skipped");
    } catch {
      // Silent
    }
  }, []);

  /** Reset orientation so it can be replayed (Settings → Replay). */
  const reset = useCallback(async () => {
    _currentStep = 1;
    _status = "active";
    notifyListeners();
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {
      // Silent
    }
  }, []);

  return {
    currentStep: _currentStep,
    isActive,
    isLoaded: _isLoaded,
    status: _status,
    advance,
    skip,
    reset,
    totalSteps: ORIENTATION_TOTAL_STEPS,
  };
}
