/**
 * Data mode
 *
 * Kinship runs in one of two modes, fixed at build time:
 *
 * - Signed-in (a backend is configured): the server is the only source of
 *   truth. Hooks show what the server returns for the signed-in user, or an
 *   error. They never fall back to demo content, never save under a
 *   placeholder user, and never keep server data in the on-device store.
 * - Demo (no backend configured, e.g. local UI work): data lives on the
 *   device and bundled demo content (src/data/mock.ts) fills the garden.
 */

import { isSupabaseConfigured } from "@/lib/supabase";

export const isDemoMode = !isSupabaseConfigured;

/** Normalises anything thrown into an Error. */
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
