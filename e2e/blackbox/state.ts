// What the wiring in setup.ts hands the real screens: the signed-in account's
// session (built from the app's own classes), its auth user, its network
// client, and where the router was sent.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { V2Session } from "@/providers/V2SessionProvider";

export const harness: {
  session: V2Session | null;
  user: { id: string; email?: string; user_metadata: Record<string, unknown> } | null;
  client: SupabaseClient | null;
  pushes: string[];
  params: Record<string, string>;
  /** The other app opening (Messages, Phone): the OS boundary, never the app's code. */
  opens: { channel: string; at: number }[];
  appListeners?: Set<(s: string) => void>;
} = { session: null, user: null, client: null, pushes: [], params: {}, opens: [] };
