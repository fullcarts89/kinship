-- ============================================================================
-- Kinship 2.0 — native trust and memory stabilization (Gates C, E, F)
-- ============================================================================
-- Founder's second native pass. Forward-only; changes no stored row.
--
--   * Evolving memory (Gate E): when a new memory updates an older one
--     ("got the Stripe job" after "interviewing at Stripe"; "knee is getting
--     better" after "knee is bothering him"; "not moving anymore" after
--     "planning to move"), the older one is superseded or resolved as before
--     (history kept, its sources untouched), and the newer one records how:
--     detail.transition = progress | completed | cancelled. The chain
--     (supersedes_id) is the thread's history. Plans and threads may also
--     carry a resolved date or season ("next summer").
--   * Someone else's promise to the user (Gate F): "Tyler said he'd send me
--     his contractor's number Wednesday" is a promise with subject 'person'
--     (theirs), never under "You said you'd". A promise with subject 'user'
--     is still the user's own.
--   * One memory, several people (Gate F): "Ben and John went to Tahoe" is one
--     memory with one source, on Ben (person_id) and also on John
--     (with_person_ids), never two copies.
--   * Relationships the note states outright ("Ben is my brother", "my
--     daughter Kaiya"): write_extraction sets the person's relationship_label
--     when it is empty (self_relations), never over the user's own.
-- ============================================================================

-- ─── detail: transition, and dates on plans and threads ─────────────────────

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
                       'date', 'date_end', 'date_precision', 'date_hint', 'transition'];
      required := ARRAY['category'];
    WHEN 'event' THEN
      allowed := ARRAY['date', 'date_end', 'date_precision', 'time_of_day', 'date_hint',
                       'event_type', 'followup_policy', 'event_goal', 'transition'];
      required := ARRAY['date_precision', 'event_type', 'followup_policy'];
    WHEN 'promise' THEN
      allowed := ARRAY['due_hint', 'due_date', 'outcome', 'transition'];
      required := ARRAY[]::text[];
    WHEN 'plan' THEN
      allowed := ARRAY['when_hint', 'season', 'date', 'date_end', 'date_precision', 'firmness', 'transition'];
      required := ARRAY['firmness'];
    WHEN 'thread' THEN
      allowed := ARRAY['topic', 'followup_after_days', 'last_checked', 'date_hint',
                       'date', 'date_end', 'date_precision', 'transition'];
      required := ARRAY['topic', 'followup_after_days'];
    WHEN 'moment' THEN
      allowed := ARRAY['date', 'date_end', 'date_precision', 'date_hint', 'place', 'photo_ids', 'transition'];
      required := ARRAY[]::text[];
    WHEN 'milestone' THEN
      allowed := ARRAY['date', 'date_end', 'date_precision', 'date_hint', 'milestone_type', 'anniversary', 'transition'];
      required := ARRAY['milestone_type', 'anniversary'];
    WHEN 'tradition' THEN
      allowed := ARRAY['recurrence', 'anchor', 'since_year', 'transition'];
      required := ARRAY['recurrence', 'anchor'];
    WHEN 'context' THEN
      allowed := ARRAY['aspect', 'transition'];
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
      WHEN 'transition' THEN v #>> '{}' IN ('progress', 'completed', 'cancelled') AND jsonb_typeof(v) = 'string'
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

-- ─── Someone else's promise to the user ──────────────────────────────────────

ALTER TABLE public.memory_items DROP CONSTRAINT memory_items_check1;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_promise_subject
  CHECK (kind <> 'promise' OR subject_type IN ('user', 'person'));

-- ─── One memory, several people ──────────────────────────────────────────────

ALTER TABLE public.memory_items ADD COLUMN with_person_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_with_people
  CHECK (cardinality(with_person_ids) <= 7 AND NOT (person_id = ANY (with_person_ids)));
CREATE INDEX memory_items_with_people_idx ON public.memory_items USING gin (with_person_ids);

-- Everyone a memory is about is one of the user's own people.
CREATE OR REPLACE FUNCTION public.memory_items_with_people_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF cardinality(NEW.with_person_ids) > 0 AND EXISTS (
       SELECT 1 FROM unnest(NEW.with_person_ids) w
        WHERE NOT EXISTS (SELECT 1 FROM public.people p
                           WHERE p.id = w AND p.user_id = NEW.user_id)) THEN
    RAISE EXCEPTION 'a shared person is not this user''s' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.memory_items_with_people_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER memory_items_with_people_guard BEFORE INSERT OR UPDATE OF with_person_ids ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_with_people_guard();

-- The user may add or take someone off a memory ("Is this the Michelle who's
-- married to Sam?" → yes; or "Both").
GRANT UPDATE (with_person_ids) ON public.memory_items TO authenticated;

-- ─── write_extraction: shared people and stated relationships ────────────────
-- As 20261004090000, plus: each item may carry with_person_ids (the user's own
-- people, at most 7) and self_relations ({person_id: "brother"}, for the
-- people the item is about); a merge adds its people to the memory merged into.

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
      IF cardinality(v_with) > 0 THEN
        UPDATE public.memory_items
           SET with_person_ids = ARRAY(SELECT DISTINCT x FROM unnest(with_person_ids || v_with) x)
         WHERE id = v_item;
      END IF;
    ELSE
      INSERT INTO public.memory_items (
        user_id, kind, person_id, subject_type, subject_related_id, statement, detail,
        certainty, extraction_confidence, sensitivity, status, user_state, supersedes_id, origin, with_person_ids)
      VALUES (
        p_user_id, it ->> 'kind', v_person, it ->> 'subject_type', v_related, it ->> 'statement',
        coalesce(it -> 'detail', '{}'::jsonb), it ->> 'certainty', (it ->> 'confidence')::numeric(3, 2),
        it ->> 'sensitivity', 'active', 'unreviewed',
        CASE WHEN v_action = 'supersede' THEN v_target END, 'extracted', v_with)
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

-- ─── resolve_capture_review: "Add Kaiya", with what the note says she is ─────
-- As 20261004130000, plus: a new person may carry the relationship the note
-- states to the user ("my daughter Kaiya" → relationship_label 'daughter'),
-- only in a word the note itself uses.

CREATE OR REPLACE FUNCTION public.resolve_capture_review(
  p_user_id uuid,
  p_capture_id uuid,
  p_review_created_at timestamptz,
  p_items jsonb,
  p_new_people jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cap record;
  rev record;
  np jsonb;
  it jsonb;
  sp jsonb;
  v_ref text;
  v_id uuid;
  v_start int;
  v_end int;
  v_map jsonb := '{}'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_out jsonb;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 8 THEN
    RAISE EXCEPTION 'items must be an array of at most 8' USING ERRCODE = '22023';
  END IF;
  IF p_new_people IS NOT NULL AND (jsonb_typeof(p_new_people) <> 'array' OR jsonb_array_length(p_new_people) > 8) THEN
    RAISE EXCEPTION 'new people must be an array of at most 8' USING ERRCODE = '22023';
  END IF;

  SELECT id, status, raw_text INTO cap FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'capture not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT capture_id, extraction_version, created_at INTO rev FROM public.capture_reviews
   WHERE capture_id = p_capture_id AND user_id = p_user_id AND expires_at > now()
   FOR UPDATE;
  IF NOT FOUND THEN
    -- Answered already (a retry after a lost reply), dismissed, or expired.
    RETURN jsonb_build_object('status', 'already_resolved');
  END IF;
  IF p_review_created_at IS NULL OR rev.created_at <> p_review_created_at THEN
    RAISE EXCEPTION 'the review changed' USING ERRCODE = '40001';
  END IF;
  IF cap.status <> 'needs_review' OR cap.raw_text IS NULL THEN
    RAISE EXCEPTION 'capture is not waiting on the user' USING ERRCODE = '55000';
  END IF;

  -- Every quoted span must still read the same (quotes are kept to their
  -- first 200 code points, as the gateway stores them).
  FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(it -> 'spans') IS DISTINCT FROM 'array' OR jsonb_array_length(it -> 'spans') = 0 THEN
      RAISE EXCEPTION 'an item needs a span' USING ERRCODE = '23514';
    END IF;
    FOR sp IN SELECT value FROM jsonb_array_elements(it -> 'spans') LOOP
      v_start := (sp ->> 'start')::int;
      v_end := (sp ->> 'end')::int;
      IF v_start IS NULL OR v_end IS NULL OR v_start < 0 OR v_end <= v_start OR v_end > char_length(cap.raw_text) THEN
        RAISE EXCEPTION 'a span is outside the note' USING ERRCODE = '23514';
      END IF;
      IF left(substr(cap.raw_text, v_start + 1, v_end - v_start), 200) IS DISTINCT FROM sp ->> 'quote' THEN
        RAISE EXCEPTION 'the note changed since it was understood' USING ERRCODE = '40001';
      END IF;
    END LOOP;
  END LOOP;

  -- People the user explicitly added in the answer: named in the note itself.
  FOR np IN SELECT value FROM jsonb_array_elements(coalesce(p_new_people, '[]'::jsonb)) LOOP
    v_ref := np ->> 'ref';
    IF v_ref IS NULL OR v_ref !~ '^new:[0-7]$' OR v_map ? v_ref
       OR coalesce(btrim(np ->> 'display_name'), '') = ''
       OR position(lower(btrim(np ->> 'display_name')) IN lower(cap.raw_text)) = 0 THEN
      RAISE EXCEPTION 'a new person must be named in the note' USING ERRCODE = '22023';
    END IF;
    -- "Add Kaiya" from "my daughter Kaiya": the relationship the note states,
    -- in its own word (the gateway found it; it must be in the note too).
    IF np ? 'relationship_label' AND (
         coalesce(btrim(np ->> 'relationship_label'), '') = '' OR char_length(np ->> 'relationship_label') > 50
         OR position(lower(btrim(np ->> 'relationship_label')) IN lower(cap.raw_text)) = 0) THEN
      RAISE EXCEPTION 'a relationship must be the note''s own word' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.people (user_id, display_name, relationship_label)
    VALUES (p_user_id, btrim(np ->> 'display_name'), nullif(btrim(np ->> 'relationship_label'), ''))
    RETURNING id INTO v_id;
    v_map := v_map || jsonb_build_object(v_ref, v_id);
  END LOOP;

  FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF (it ->> 'person_id') LIKE 'new:%' THEN
      IF NOT v_map ? (it ->> 'person_id') THEN
        RAISE EXCEPTION 'unknown new person' USING ERRCODE = '22023';
      END IF;
      it := jsonb_set(it, '{person_id}', v_map -> (it ->> 'person_id'));
    END IF;
    v_items := v_items || jsonb_build_array(it);
  END LOOP;

  -- The same write as any extraction; nothing waits on the user afterwards.
  UPDATE public.captures SET status = 'processing' WHERE id = p_capture_id;
  v_out := public.write_extraction(p_user_id, p_capture_id, rev.extraction_version, false, v_items);
  DELETE FROM public.capture_reviews WHERE capture_id = p_capture_id;
  RETURN jsonb_build_object('status', 'resolved', 'items', v_out, 'people', v_map);
END;
$$;
