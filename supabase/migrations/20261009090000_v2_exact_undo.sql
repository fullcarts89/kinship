-- ============================================================================
-- Kinship 2.0 — Undo is exact: a closed thread and a silenced Moment come back
-- (founder N8, CC-20: a trust invariant, at the earliest schema opportunity)
-- ============================================================================
-- Two gaps in Undo (and "Not this") found in the Phase 4 code review:
--
--   * A note that resolved an open thread ("Ben got the job" closing "Ben is
--     waiting to hear about the job") stored no link to it, so taking the
--     note back left the thread closed. The new item now records the thread
--     it closed (resolves_id), and when that item stops being current
--     (deleted or retracted while active or resolved) the thread opens
--     again, unless another live item still closes it.
--   * Replacing a memory silences its open Today reasons (suppressed). Undo
--     brings the memory back (20261004140000), but the refresh could never
--     reopen its reason: the same key already existed (ON CONFLICT DO
--     NOTHING). A suppressed reason that is produced again now opens again.
--     Dismissed, done, acted and expired reasons are untouched.
--
-- resolves_id is written only by write_extraction (the gateway's write, also
-- used by resolve_capture_review); the app can't set it. Forward-only: adds a
-- column and replaces three functions; no stored row changes.
-- ============================================================================

-- ─── The thread a note closed ────────────────────────────────────────────────

ALTER TABLE public.memory_items ADD COLUMN resolves_id uuid;
ALTER TABLE public.memory_items
  ADD CONSTRAINT memory_items_resolves_fk FOREIGN KEY (resolves_id, user_id)
    REFERENCES public.memory_items (id, user_id) ON DELETE SET NULL (resolves_id),
  ADD CONSTRAINT memory_items_resolves_not_self CHECK (resolves_id IS NULL OR resolves_id <> id);
CREATE INDEX memory_items_resolves_idx ON public.memory_items (resolves_id) WHERE resolves_id IS NOT NULL;

COMMENT ON COLUMN public.memory_items.resolves_id IS
  'The open thread this item closed (status resolved), so Undo and "Not this" can open it again (founder N8).';

-- The app never sets it (column UPDATE is granted per column, and it isn't).
ALTER POLICY "Owner can create" ON public.memory_items
  WITH CHECK ((select auth.uid()) = user_id AND extraction_confidence IS NULL AND origin <> 'extracted'
              AND resolves_id IS NULL);

-- ─── write_extraction: as 20261008090000, plus resolves_id ───────────────────

CREATE OR REPLACE FUNCTION public.write_extraction(
  p_user_id uuid,
  p_capture_id uuid,
  p_extraction_version text,
  p_needs_review boolean,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cap record;
  it jsonb;
  sp jsonb;
  t record;
  v_action text;
  v_target uuid;
  v_person uuid;
  v_related uuid;
  v_item uuid;
  v_with uuid[];
  v_mentions jsonb;
  v_rel record;
  v_out jsonb := '[]'::jsonb;
BEGIN
  IF p_extraction_version IS NULL OR p_extraction_version !~ '^[a-z_]{1,40}/v[0-9]{1,4}\+claude-[a-z0-9-]{1,50}$' THEN
    RAISE EXCEPTION 'bad extraction version' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 8 THEN
    RAISE EXCEPTION 'items must be an array of at most 8' USING ERRCODE = '22023';
  END IF;

  -- Only the request that claimed the capture may write its extraction.
  SELECT id, retention INTO cap FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND status = 'processing'
     AND deleted_at IS NULL AND raw_text IS NOT NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'capture is not claimed for extraction' USING ERRCODE = '55000';
  END IF;

  FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_person := (it ->> 'person_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.people
                    WHERE id = v_person AND user_id = p_user_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'person is not this user''s' USING ERRCODE = '23503';
    END IF;
    IF jsonb_typeof(it -> 'spans') <> 'array' OR jsonb_array_length(it -> 'spans') = 0 THEN
      RAISE EXCEPTION 'an extracted item needs a span' USING ERRCODE = '23514';
    END IF;

    -- The others it is also about (one memory, one source): the user's own people.
    v_with := '{}'::uuid[];
    IF it ? 'with_person_ids' AND jsonb_typeof(it -> 'with_person_ids') = 'array' THEN
      SELECT coalesce(array_agg(DISTINCT e::uuid), '{}'::uuid[]) INTO v_with
        FROM jsonb_array_elements_text(it -> 'with_person_ids') e
       WHERE e::uuid <> v_person;
      IF cardinality(v_with) > 7 OR EXISTS (
           SELECT 1 FROM unnest(v_with) w
            WHERE NOT EXISTS (SELECT 1 FROM public.people
                               WHERE id = w AND user_id = p_user_id AND deleted_at IS NULL)) THEN
        RAISE EXCEPTION 'a shared person is not this user''s' USING ERRCODE = '23503';
      END IF;
    END IF;

    -- Which words name which of them (founder I12/I13).
    v_mentions := public.person_mentions_clean(it -> 'person_mentions', v_person, v_with);

    -- The related person: an existing row of this person, or a new one.
    v_related := NULL;
    IF it ->> 'subject_type' = 'related' THEN
      IF it -> 'related' ->> 'id' IS NOT NULL THEN
        SELECT id INTO v_related FROM public.related_people
         WHERE id = (it -> 'related' ->> 'id')::uuid AND person_id = v_person
           AND user_id = p_user_id AND deleted_at IS NULL;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'related person is not this person''s' USING ERRCODE = '23503';
        END IF;
      ELSE
        INSERT INTO public.related_people (user_id, person_id, relation, name)
        VALUES (p_user_id, v_person, it -> 'related' ->> 'relation', it -> 'related' ->> 'name')
        RETURNING id INTO v_related;
      END IF;
    END IF;

    -- Re-check the target here, not only in the gateway: by now the user may
    -- have edited it. Anything doubtful becomes a new item instead.
    v_action := coalesce(it -> 'action' ->> 'type', 'new');
    v_target := (it -> 'action' ->> 'target_id')::uuid;
    IF v_action IN ('merge', 'supersede', 'resolves') THEN
      SELECT id, kind, person_id, subject_type, subject_related_id, status, user_state INTO t
        FROM public.memory_items
       WHERE id = v_target AND user_id = p_user_id AND deleted_at IS NULL
       FOR UPDATE;
      IF NOT FOUND
         OR t.user_state IN ('edited', 'user_authored')
         OR t.person_id <> v_person
         OR t.subject_type <> it ->> 'subject_type'
         OR t.subject_related_id IS DISTINCT FROM v_related
         OR (v_action = 'merge' AND (t.kind <> it ->> 'kind' OR t.status <> 'active'))
         OR (v_action = 'supersede' AND t.status NOT IN ('active', 'resolved'))
         OR (v_action = 'resolves' AND (t.kind <> 'thread' OR t.status <> 'active')) THEN
        v_action := 'new';
      END IF;
    ELSE
      v_action := 'new';
    END IF;
    IF v_action = 'new' THEN
      v_target := NULL;
    END IF;

    IF v_action = 'merge' THEN
      v_item := v_target;
      IF cardinality(v_with) > 0 OR jsonb_array_length(v_mentions) > 0 THEN
        UPDATE public.memory_items
           SET with_person_ids = ARRAY(SELECT DISTINCT x FROM unnest(with_person_ids || v_with) x),
               person_mentions = public.person_mentions_merge(person_mentions, v_mentions, statement)
         WHERE id = v_item;
      END IF;
    ELSE
      INSERT INTO public.memory_items (
        user_id, kind, person_id, subject_type, subject_related_id, statement, detail,
        certainty, extraction_confidence, sensitivity, status, user_state, supersedes_id, origin, with_person_ids,
        person_mentions, resolves_id)
      VALUES (
        p_user_id, it ->> 'kind', v_person, it ->> 'subject_type', v_related, it ->> 'statement',
        coalesce(it -> 'detail', '{}'::jsonb), it ->> 'certainty', (it ->> 'confidence')::numeric(3, 2),
        it ->> 'sensitivity', 'active', 'unreviewed',
        CASE WHEN v_action = 'supersede' THEN v_target END, 'extracted', v_with,
        v_mentions, CASE WHEN v_action = 'resolves' THEN v_target END)
      RETURNING id INTO v_item;
      IF v_action = 'resolves' THEN
        UPDATE public.memory_items SET status = 'resolved' WHERE id = v_target;
      END IF;
    END IF;

    FOR sp IN SELECT value FROM jsonb_array_elements(it -> 'spans') LOOP
      INSERT INTO public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end)
      VALUES (p_user_id, v_item, p_capture_id, 'capture', (sp ->> 'start')::int, (sp ->> 'end')::int);
    END LOOP;

    -- A relationship to the user the note states outright ("Ben is my
    -- brother"): kept on the person, never over one the user already set.
    IF it ? 'self_relations' AND jsonb_typeof(it -> 'self_relations') = 'object' THEN
      FOR v_rel IN SELECT key, value FROM jsonb_each_text(it -> 'self_relations') LOOP
        IF NOT (v_rel.key::uuid = v_person OR v_rel.key::uuid = ANY (v_with))
           OR coalesce(btrim(v_rel.value), '') = '' OR char_length(v_rel.value) > 50 THEN
          RAISE EXCEPTION 'a relationship must be to someone this memory is about' USING ERRCODE = '22023';
        END IF;
        UPDATE public.people SET relationship_label = btrim(v_rel.value)
         WHERE id = v_rel.key::uuid AND user_id = p_user_id AND deleted_at IS NULL
           AND coalesce(btrim(relationship_label), '') = '';
      END LOOP;
    END IF;

    v_out := v_out || jsonb_build_object('id', v_item, 'action', v_action);
  END LOOP;

  UPDATE public.captures
     SET status = CASE WHEN p_needs_review THEN 'needs_review' ELSE 'extracted' END,
         extraction_version = p_extraction_version
   WHERE id = p_capture_id;
  -- "Delete my note after it's understood": once nothing is waiting on the
  -- user, the text goes; the quotes on each source remain for the Source view.
  IF cap.retention = 'delete_after_extraction' AND NOT p_needs_review THEN
    UPDATE public.captures SET raw_text = NULL WHERE id = p_capture_id;
  END IF;
  RETURN v_out;
END;
$$;

-- ─── Undo and "Not this": what an item closed comes back ─────────────────────
-- As 20261004140000, plus: the thread the item resolved opens again.

CREATE OR REPLACE FUNCTION public.memory_items_restore_superseded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target uuid;
  cur record;
  prior jsonb;
  hops int := 0;
BEGIN
  IF OLD.status NOT IN ('active', 'resolved') THEN
    RETURN NULL;
  END IF;
  IF NOT ((OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
          OR (OLD.status <> 'retracted' AND NEW.status = 'retracted')) THEN
    RETURN NULL;
  END IF;

  -- The thread this item closed opens again, as it was before it was
  -- closed, unless another live item still closes it (founder N8).
  IF NEW.resolves_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.memory_items o
                      WHERE o.resolves_id = NEW.resolves_id AND o.user_id = NEW.user_id AND o.id <> NEW.id
                        AND o.deleted_at IS NULL AND o.status <> 'retracted') THEN
    SELECT h.snapshot INTO prior FROM public.memory_item_history h
     WHERE h.memory_item_id = NEW.resolves_id AND h.user_id = NEW.user_id
       AND h.snapshot ->> 'status' = 'active'
     ORDER BY h.item_version DESC, h.created_at DESC
     LIMIT 1;
    UPDATE public.memory_items
       SET status = 'active',
           valid_to = CASE WHEN prior IS NULL THEN valid_to ELSE (prior ->> 'valid_to')::date END
     WHERE id = NEW.resolves_id AND user_id = NEW.user_id AND status = 'resolved' AND deleted_at IS NULL;
    prior := NULL;
  END IF;

  -- What it replaced: the nearest item down the chain that still exists.
  target := NEW.supersedes_id;
  IF target IS NULL THEN
    RETURN NULL;
  END IF;
  LOOP
    SELECT id, status, deleted_at, supersedes_id INTO cur
      FROM public.memory_items WHERE id = target AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
    EXIT WHEN cur.deleted_at IS NULL AND cur.status <> 'retracted';
    hops := hops + 1;
    IF cur.supersedes_id IS NULL OR hops > 50 THEN
      RETURN NULL;
    END IF;
    target := cur.supersedes_id;
  END LOOP;

  IF cur.status <> 'superseded' THEN
    RETURN NULL;
  END IF;
  -- Still replaced by something else that is live.
  IF EXISTS (SELECT 1 FROM public.memory_items o
              WHERE o.supersedes_id = target AND o.user_id = NEW.user_id AND o.id <> NEW.id
                AND o.deleted_at IS NULL AND o.status <> 'retracted') THEN
    RETURN NULL;
  END IF;

  SELECT h.snapshot INTO prior FROM public.memory_item_history h
   WHERE h.memory_item_id = target AND h.user_id = NEW.user_id
     AND h.snapshot ->> 'status' IN ('active', 'resolved')
   ORDER BY h.item_version DESC, h.created_at DESC
   LIMIT 1;

  UPDATE public.memory_items
     SET status = coalesce(prior ->> 'status', 'active'),
         valid_to = CASE WHEN prior IS NULL THEN valid_to ELSE (prior ->> 'valid_to')::date END
   WHERE id = target AND user_id = NEW.user_id AND status = 'superseded' AND deleted_at IS NULL;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_restore_superseded() FROM PUBLIC, anon, authenticated;

-- ─── reasons_refresh: as 20261005090000, plus reopening (N8) ─────────────────

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
    INSERT INTO public.reasons AS r (user_id, person_id, type, window_start, window_end, score, state, dedupe_key)
    VALUES (p_user_id, c.person_id, c.type,
            (c.w_start::timestamp AT TIME ZONE p_time_zone),
            ((c.w_end + 1)::timestamp AT TIME ZONE p_time_zone),
            c.score, 'candidate', c.type || ':' || c.item_id || ':' || c.d)
    -- Founder N8: a reason that was silenced because its memory was replaced
    -- (or its person paused) speaks again once the memory is back and the
    -- reason is produced again. Dismissed, done, acted or expired stay so.
    ON CONFLICT (user_id, dedupe_key) DO UPDATE SET state = 'candidate'
      WHERE r.state = 'suppressed' AND r.deleted_at IS NULL
    RETURNING id INTO v_reason;
    IF v_reason IS NOT NULL THEN
      INSERT INTO public.reason_evidence (reason_id, memory_item_id, user_id) VALUES (v_reason, c.item_id, p_user_id)
      ON CONFLICT DO NOTHING;
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
