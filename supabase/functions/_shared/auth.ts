// Shared by Kinship's edge functions.

/** The parts of a Supabase `auth.getUser()` result Kinship relies on. */
export interface GetUserResult {
  data: { user: { id: string; is_anonymous?: boolean } | null };
  error: { status?: number; message?: string } | null;
}

/**
 * Decides who is calling from Supabase Auth's answer. A rejected token
 * (4xx: the public anon key, an expired or revoked session, a deleted user)
 * means "not allowed in" → null. Auth erroring or unreachable is ours →
 * throws, so the caller gets a 500 rather than a misleading 401. Anonymous
 * sign-ins are never allowed in.
 *
 * (ai-insight carries an identical copy in its handler.ts; it moves here
 * when that function is next deployed.)
 */
export function verifiedUserId(result: GetUserResult): string | null {
  const status = result.error?.status ?? 0;
  if (result.error && (status < 400 || status >= 500)) {
    throw new Error(`auth unavailable (${status || "no status"})`);
  }
  const user = result.data.user;
  if (result.error || !user || user.is_anonymous) return null;
  return user.id;
}

/** Extracts a bearer token from the Authorization header. */
export function bearerToken(req: Request): string | null {
  return req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}
