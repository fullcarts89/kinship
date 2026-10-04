-- ============================================================================
-- Kinship 2.0 — reasons to connect, v0 (Phase 2 vertical slice; plan §13–15)
-- ============================================================================
-- The first two candidate types, derived deterministically from the user's
-- own remembered events. No model: the app phrases a reason from fixed,
-- grounded templates and the event's own words (plan §14: "the model never
-- proposes a reason"; reason_generate comes later).
--
--   upcoming_event   an event whose follow-up policy is 'before' or 'both':
--                    the day before (2–3 days before a celebration or wedding)
--   event_followup   an event whose policy is 'after' or 'both': the day after
--                    it ends (race, interview, exam, trip return…); 3–7 days
--                    after a move, a job start or a school start
--
-- Only events that:
--   * are active, live, about a person (not the user), on an active person;
--   * have an exact day (date_precision 'day' or unset with a date): a
--     coarse date never produces a reason, because the reason would have to
--     guess the day;
--   * have sensitivity 'none'. Hard times (health, loss) are their own
--     reason type with their own tone rules and are not in v0.
-- An item the user confirmed or edited and one Kinship understood are both
-- eligible; the app weighs them (plan §13 ranking: evidence).
--
-- reasons_refresh(user, today, tz) is the engine: it creates the candidates
-- whose window hasn't ended and opens within a week, with their evidence;
-- suppresses open v0 reasons whose evidence no longer produces them (a date
-- changed, a policy changed, the item was retracted); and expires open
-- reasons whose window has passed. Idempotent (dedupe_key = type:item:day).
--
-- refresh_my_reasons(time_zone) is what the app calls when Today opens: the
-- caller's own reasons only, "today" in the caller's time zone (the saved
-- user_settings.time_zone, else the one the app sends, else UTC). There is
-- no schedule yet (pg_cron isn't installed); a nightly run joins the
-- notification work (E15).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reasons_refresh(p_user_id uuid, p_today date, p_time_zone text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c record;
  v_reason uuid;
  v_keys text[] := ARRAY[]::text[];
  v_open integer;
BEGIN
  IF p_user_id IS NULL OR p_today IS NULL THEN
    RAISE EXCEPTION 'user and day are required' USING ERRCODE = '22023';
  END IF;
  IF p_time_zone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_time_zone) THEN
    RAISE EXCEPTION 'unknown time zone' USING ERRCODE = '22023';
  END IF;

  FOR c IN
    WITH events AS (
      SELECT m.id AS item_id, m.person_id,
             (m.detail ->> 'date')::date AS d,
             coalesce((m.detail ->> 'date_end')::date, (m.detail ->> 'date')::date) AS d_end,
             m.detail ->> 'event_type' AS event_type,
             m.detail ->> 'followup_policy' AS policy
        FROM public.memory_items m
        JOIN public.people p ON p.id = m.person_id AND p.user_id = m.user_id
       WHERE m.user_id = p_user_id
         AND m.kind = 'event'
         AND m.status = 'active'
         AND m.deleted_at IS NULL
         AND m.subject_type = 'person'
         AND m.sensitivity = 'none'
         AND m.detail ? 'date'
         AND coalesce(m.detail ->> 'date_precision', 'day') = 'day'
         AND p.state = 'active'
         AND p.deleted_at IS NULL
    ),
    candidates AS (
      SELECT 'upcoming_event'::text AS type, e.item_id, e.person_id, e.d,
             CASE WHEN e.event_type IN ('celebration', 'wedding') THEN e.d - 3 ELSE e.d - 1 END AS w_start,
             e.d - 1 AS w_end,
             85::numeric AS score
        FROM events e
       WHERE e.policy IN ('before', 'both')
      UNION ALL
      SELECT 'event_followup', e.item_id, e.person_id, e.d,
             CASE WHEN e.event_type IN ('move', 'job_start', 'school_start') THEN e.d + 3 ELSE e.d_end + 1 END,
             CASE WHEN e.event_type IN ('move', 'job_start', 'school_start') THEN e.d + 7
                  WHEN e.event_type = 'trip' THEN e.d_end + 3
                  ELSE e.d_end + 2 END,
             90::numeric
        FROM events e
       WHERE e.policy IN ('after', 'both')
    )
    SELECT * FROM candidates
     WHERE w_end >= p_today AND w_start <= p_today + 7
  LOOP
    v_keys := v_keys || (c.type || ':' || c.item_id || ':' || c.d);
    v_reason := NULL;
    INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, score, state, dedupe_key)
    VALUES (p_user_id, c.person_id, c.type,
            (c.w_start::timestamp AT TIME ZONE p_time_zone),
            ((c.w_end + 1)::timestamp AT TIME ZONE p_time_zone),
            c.score, 'candidate', c.type || ':' || c.item_id || ':' || c.d)
    ON CONFLICT (user_id, dedupe_key) DO NOTHING
    RETURNING id INTO v_reason;
    IF v_reason IS NOT NULL THEN
      INSERT INTO public.reason_evidence (reason_id, memory_item_id, user_id) VALUES (v_reason, c.item_id, p_user_id);
    END IF;
  END LOOP;

  -- Evidence that no longer produces the reason (date or policy changed, item
  -- gone, person paused): an open v0 reason is suppressed, never left to speak.
  UPDATE public.reasons r SET state = 'suppressed'
   WHERE r.user_id = p_user_id
     AND r.type IN ('upcoming_event', 'event_followup')
     AND r.state IN ('candidate', 'scheduled', 'surfaced')
     AND r.deleted_at IS NULL
     AND r.window_end > (p_today::timestamp AT TIME ZONE p_time_zone)
     AND NOT (r.dedupe_key = ANY (v_keys));

  -- A window that has passed: expired (an acted-on reason waits for its return check a day longer).
  UPDATE public.reasons r SET state = 'expired'
   WHERE r.user_id = p_user_id
     AND r.deleted_at IS NULL
     AND ((r.state IN ('candidate', 'scheduled', 'surfaced')
           AND r.window_end <= (p_today::timestamp AT TIME ZONE p_time_zone))
       OR (r.state = 'acted'
           AND r.window_end <= ((p_today - 1)::timestamp AT TIME ZONE p_time_zone)));

  SELECT count(*) INTO v_open FROM public.reasons r
   WHERE r.user_id = p_user_id AND r.state IN ('candidate', 'scheduled', 'surfaced', 'acted') AND r.deleted_at IS NULL;
  RETURN v_open;
END;
$$;

REVOKE ALL ON FUNCTION public.reasons_refresh(uuid, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reasons_refresh(uuid, date, text) TO service_role;

COMMENT ON FUNCTION public.reasons_refresh(uuid, date, text) IS
  'Kinship 2.0 reasons v0: deterministic upcoming_event / event_followup candidates from the user''s own events.';

-- The caller's own reasons, refreshed for "today" where they are.
CREATE OR REPLACE FUNCTION public.refresh_my_reasons(p_time_zone text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tz text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  SELECT s.time_zone INTO v_tz FROM public.user_settings s WHERE s.user_id = v_user;
  IF v_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = v_tz) THEN
    v_tz := p_time_zone;
  END IF;
  IF v_tz IS NULL OR char_length(v_tz) > 64 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = v_tz) THEN
    v_tz := 'UTC';
  END IF;
  RETURN public.reasons_refresh(v_user, (now() AT TIME ZONE v_tz)::date, v_tz);
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_reasons(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_reasons(text) TO authenticated;

COMMENT ON FUNCTION public.refresh_my_reasons(text) IS
  'Kinship 2.0: refresh the signed-in user''s reasons v0 for today in their time zone (called when Today opens).';
