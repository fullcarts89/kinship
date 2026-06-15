/**
 * AI Preferences
 *
 * Holds the user's opt-out for AI processing. When disabled, Kinship sends
 * nothing to Anthropic's API — promise detection, person insights, and
 * season reflections all fall back to the on-device heuristic engines, the
 * same as when AI isn't configured at all.
 *
 * AI is on by default (opt-out, not opt-in), so the gate has to answer
 * synchronously for `isAIConfigured()`. The setting lives in a module-level
 * flag that is hydrated from disk once per launch via `hydrateAIPreferences`;
 * until hydration completes the default (enabled) is used, matching the
 * app's prior behaviour.
 */

import { loadCollection, saveCollection } from "@/lib/localStore";

const STORE_KEY = "ai-preferences";

export interface AIPreferences {
  /** When false, the user has opted out of all AI processing. Default true. */
  enabled: boolean;
}

const DEFAULTS: AIPreferences = { enabled: true };

let _prefs: AIPreferences = { ...DEFAULTS };
let _hydration: Promise<void> | null = null;

/** Hydrate the AI opt-out from disk exactly once per app launch. */
export function hydrateAIPreferences(): Promise<void> {
  if (!_hydration) {
    _hydration = loadCollection<AIPreferences>(STORE_KEY).then((stored) => {
      const saved = stored[0];
      if (saved && typeof saved.enabled === "boolean") {
        _prefs = { enabled: saved.enabled };
      }
    });
  }
  return _hydration;
}

/** True unless the user has explicitly turned AI off. */
export function isAIEnabled(): boolean {
  return _prefs.enabled;
}

/** Toggle AI processing on or off and persist the choice. */
export function setAIEnabled(enabled: boolean): void {
  _prefs = { enabled };
  saveCollection(STORE_KEY, [_prefs]);
}
