/**
 * Auth Helper
 *
 * Provides the authenticated user's ID from the Supabase session.
 * Throws an explicit error if no session exists — prevents silent
 * reads/writes with a placeholder ID.
 *
 * All service files should use `getAuthUserId()` instead of a
 * hardcoded PLACEHOLDER_USER_ID.
 */

import { supabase } from "@/lib/supabase";

/**
 * Get the current authenticated user's ID.
 *
 * @throws {Error} If Supabase is not configured or no session exists.
 */
export async function getAuthUserId(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message || "Authentication error");

  if (!session?.user?.id) {
    throw new Error(
      "Not authenticated. Please sign in to continue."
    );
  }

  return session.user.id;
}
