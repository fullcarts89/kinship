-- ============================================================================
-- Kinship 2.0 — temporal context on non-event memories (Checkpoint C.1)
-- ============================================================================
-- Product invariant: when the timing in what the user said matters to a
-- durable memory, Kinship keeps it even when the memory is not an event.
--
--   * fact: date, date_end, date_precision, date_hint — when the fact became
--     true ("moved to Boston last month", "has worked at Google since 2018").
--     A duration with no anchor ("for three years") keeps only date_hint.
--   * milestone and moment: date_end and date_precision join date and
--     date_hint, so "in 2024" or "last weekend" keep their year or range
--     instead of being cut to a single day or dropped.
--   * thread: date_hint, so an ambiguous date on a thread can be confirmed
--     in the user's own words (C-4).
--
-- Dates are always produced by the deterministic resolver, never by the
-- model; coarse or ambiguous expressions carry their precision and the
-- user's words, never an invented exact day. Forward-only: this redefines
-- the validator from 20261004100000 and changes no stored row.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.memory_detail_ok(p_kind text, d jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  allowed text[];
  required text[];
  k text;
  v jsonb;
BEGIN
  IF d IS NULL OR jsonb_typeof(d) <> 'object' THEN
    RETURN false;
  END IF;

  CASE p_kind
    WHEN 'fact' THEN
      allowed := ARRAY['category', 'attribute', 'value',
                       'date', 'date_end', 'date_precision', 'date_hint'];
      required := ARRAY['category'];
    WHEN 'event' THEN
      allowed := ARRAY['date', 'date_end', 'date_precision', 'time_of_day', 'date_hint',
                       'event_type', 'followup_policy', 'event_goal'];
      required := ARRAY['date_precision', 'event_type', 'followup_policy'];
    WHEN 'promise' THEN
      allowed := ARRAY['due_hint', 'due_date', 'outcome'];
      required := ARRAY[]::text[];
    WHEN 'plan' THEN
      allowed := ARRAY['when_hint', 'season', 'date', 'firmness'];
      required := ARRAY['firmness'];
    WHEN 'thread' THEN
      allowed := ARRAY['topic', 'followup_after_days', 'last_checked', 'date_hint'];
      required := ARRAY['topic', 'followup_after_days'];
    WHEN 'moment' THEN
      allowed := ARRAY['date', 'date_end', 'date_precision', 'date_hint', 'place', 'photo_ids'];
      required := ARRAY[]::text[];
    WHEN 'milestone' THEN
      allowed := ARRAY['date', 'date_end', 'date_precision', 'date_hint', 'milestone_type', 'anniversary'];
      required := ARRAY['milestone_type', 'anniversary'];
    WHEN 'tradition' THEN
      allowed := ARRAY['recurrence', 'anchor', 'since_year'];
      required := ARRAY['recurrence', 'anchor'];
    WHEN 'context' THEN
      allowed := ARRAY['aspect'];
      required := ARRAY['aspect'];
    ELSE
      RETURN false;
  END CASE;

  IF NOT (d ?& required) THEN
    RETURN false;
  END IF;

  FOR k, v IN SELECT key, value FROM jsonb_each(d) LOOP
    IF NOT (k = ANY (allowed)) THEN
      RETURN false;
    END IF;
    IF NOT (CASE k
      WHEN 'date' THEN public.v2_is_iso_date(v)
      WHEN 'date_end' THEN public.v2_is_iso_date(v)
      WHEN 'due_date' THEN public.v2_is_iso_date(v)
      WHEN 'last_checked' THEN public.v2_is_iso_date(v)
      WHEN 'category' THEN v #>> '{}' IN ('family', 'work', 'home', 'health', 'interest',
                                          'preference', 'pet', 'other') AND jsonb_typeof(v) = 'string'
      WHEN 'date_precision' THEN v #>> '{}' IN ('day', 'week', 'month', 'season', 'year', 'unknown')
                                 AND jsonb_typeof(v) = 'string'
      WHEN 'event_type' THEN v #>> '{}' IN ('race', 'surgery', 'medical', 'exam', 'interview', 'move',
                                            'trip', 'wedding', 'birth', 'funeral', 'job_start',
                                            'school_start', 'celebration', 'other')
                             AND jsonb_typeof(v) = 'string'
      WHEN 'followup_policy' THEN v #>> '{}' IN ('before', 'after', 'both', 'none')
                                  AND jsonb_typeof(v) = 'string'
      WHEN 'outcome' THEN v #>> '{}' IN ('kept', 'released') AND jsonb_typeof(v) = 'string'
      WHEN 'firmness' THEN v #>> '{}' IN ('idea', 'intended', 'scheduled') AND jsonb_typeof(v) = 'string'
      WHEN 'season' THEN v #>> '{}' IN ('spring', 'summer', 'autumn', 'winter')
                         AND jsonb_typeof(v) = 'string'
      WHEN 'recurrence' THEN v #>> '{}' IN ('yearly', 'seasonal', 'monthly') AND jsonb_typeof(v) = 'string'
      WHEN 'aspect' THEN v #>> '{}' IN ('how_met', 'shared_interest', 'inside_joke', 'place', 'other')
                         AND jsonb_typeof(v) = 'string'
      WHEN 'followup_after_days' THEN jsonb_typeof(v) = 'number' AND (v::text ~ '^[0-9]+$')
                                      AND v::text::int BETWEEN 1 AND 365
      WHEN 'since_year' THEN jsonb_typeof(v) = 'number' AND (v::text ~ '^[0-9]{4}$')
      WHEN 'anniversary' THEN jsonb_typeof(v) = 'boolean'
      WHEN 'photo_ids' THEN jsonb_typeof(v) = 'array' AND jsonb_array_length(v) <= 20
                            AND NOT EXISTS (
                              SELECT 1 FROM jsonb_array_elements(v) e
                              WHERE jsonb_typeof(e) <> 'string'
                                 OR NOT (e #>> '{}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
      ELSE jsonb_typeof(v) = 'string' AND char_length(v #>> '{}') BETWEEN 1 AND 200
    END) THEN
      RETURN false;
    END IF;
  END LOOP;

  -- A range needs its start.
  IF d ? 'date_end' AND NOT d ? 'date' THEN
    RETURN false;
  END IF;
  IF d ? 'date' AND d ? 'date_end' AND (d ->> 'date_end')::date < (d ->> 'date')::date THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;
