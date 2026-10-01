/**
 * AI consent
 *
 * Kinship processes notes with AI only after the user's explicit consent
 * (founder decision D3). Consent lives on the server in
 * `user_settings.ai_consent`, so it survives reinstalls and is enforced by
 * the ai-insight gateway, which refuses calls without it (403). This module
 * keeps an in-memory copy for the synchronous `isAIConfigured()` gate.
 *
 * - Off until the user turns it on, and off whenever we can't confirm it.
 * - Hydrated from the server for the signed-in user; reset on every account
 *   change so one user's consent never carries over to another.
 * - Without a configured backend (local dev / demo builds) the choice is
 *   kept in the on-device store instead, still defaulting to off.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { loadCollection, saveCollection } from "@/lib/localStore";
import type { UserSettings } from "@/types/database";

/**
 * The consent version this build shows the user. Bump it (together with the
 * gateway's AI_CONSENT_VERSION secret) when what is sent to the AI provider
 * changes materially, so users are asked again.
 */
export const AI_CONSENT_VERSION = 1;

const LOCAL_STORE_KEY = "ai-preferences";

export interface AIPreferences {
  /** True only after the user has explicitly consented to AI processing. */
  enabled: boolean;
}

let _prefs: AIPreferences = { enabled: false };
let _hydration: Promise<void> | null = null;

/**
 * Load consent for the current account. Safe to call repeatedly; pass
 * `force` after a sign-in or sign-out so the value is re-read.
 */
export function hydrateAIPreferences(force = false): Promise<void> {
  if (force) _hydration = null;
  if (!_hydration) {
    _hydration = loadConsent()
      .then((enabled) => {
        _prefs = { enabled };
      })
      .catch(() => {
        // Can't confirm consent → behave as if it wasn't given.
        _prefs = { enabled: false };
      });
  }
  return _hydration;
}

/** Forget the in-memory consent (sign-out, account switch). */
export function resetAIPreferences(): void {
  _prefs = { enabled: false };
  _hydration = null;
}

/** True only when the user has consented to AI processing. */
export function isAIEnabled(): boolean {
  return _prefs.enabled;
}

/**
 * Grant or revoke AI consent. Resolves once the server has recorded it;
 * rejects (and leaves the previous value) if it couldn't be saved, so the
 * UI never shows a choice that the server doesn't hold.
 */
export async function setAIEnabled(enabled: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Hand-written DB types (generated types arrive with SCH-08).
    const { error } = await supabase.rpc("set_ai_consent", {
      p_granted: enabled,
      p_version: enabled ? AI_CONSENT_VERSION : null,
    } as never);
    if (error) throw new Error(error.message || "Couldn't save your AI choice");
  } else {
    await saveCollection(LOCAL_STORE_KEY, [{ enabled }]);
  }
  _prefs = { enabled };
}

async function loadConsent(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user?.id;
    if (!userId) return false;
    const { data, error } = await supabase
      .from("user_settings")
      .select("ai_consent, ai_consent_version")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const settings = data as Pick<UserSettings, "ai_consent" | "ai_consent_version"> | null;
    return (
      settings?.ai_consent === true &&
      (settings.ai_consent_version ?? 0) >= AI_CONSENT_VERSION
    );
  }
  const stored = await loadCollection<AIPreferences>(LOCAL_STORE_KEY);
  return stored[0]?.enabled === true;
}
