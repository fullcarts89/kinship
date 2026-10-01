-- ============================================================================
-- Kinship — AI usage quota
-- ============================================================================
-- Per-user daily call counter for the ai-insight edge function (originally migration 008), which
-- proxies to the Anthropic API. Before every model call the function runs
-- consume_ai_call() with the caller's own JWT and answers 429 once the
-- day's limit (its AI_DAILY_LIMIT secret) is spent. Days roll over at
-- 00:00 UTC. Apply this before deploying the function: without it every
-- AI request fails closed.
--
-- Users can read their own counters but never write them. The only write
-- path is consume_ai_call(), which increments the caller's own row and
-- refuses the anon key and anonymous sign-ins.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     DATE    NOT NULL,
  calls   INTEGER NOT NULL DEFAULT 0 CHECK (calls >= 0),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai usage" ON ai_usage;
CREATE POLICY "Users can view own ai usage"
  ON ai_usage FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- No write policies and no write grants: a user must not be able to reset
-- their own counter through the REST API.
REVOKE ALL ON ai_usage FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ai_usage FROM authenticated;

-- ─── consume_ai_call ────────────────────────────────────────────────────────
-- Spends one call from the caller's quota for today: true if the call may
-- go ahead, false once daily_limit is reached. The upsert holds the row
-- lock while it checks the count, so concurrent requests can't overshoot.
-- SECURITY DEFINER because callers have no write access to ai_usage; it
-- only ever touches the auth.uid() row.

CREATE OR REPLACE FUNCTION public.consume_ai_call(daily_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller UUID := auth.uid();
  spent  INTEGER;
BEGIN
  IF caller IS NULL
     OR coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'consume_ai_call requires a signed-in user'
      USING ERRCODE = '42501';
  END IF;

  IF daily_limit IS NULL OR daily_limit < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage AS u (user_id, day, calls)
  VALUES (caller, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET calls = u.calls + 1
    WHERE u.calls < daily_limit
  RETURNING u.calls INTO spent;

  RETURN spent IS NOT NULL;
END;
$$;

-- Supabase grants EXECUTE on new functions to anon by name, so revoking
-- from PUBLIC alone isn't enough.
REVOKE ALL ON FUNCTION public.consume_ai_call(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_call(INTEGER) TO authenticated;
