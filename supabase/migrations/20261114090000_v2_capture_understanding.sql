-- CMR-1 (Core Memory Reliability), Workstream C: the note's understanding, durable and visible
-- (14 Nov 2026). Three things, all forward-only, no data changes.
--
-- 1. captures.understanding: what the understanding of a note came to, written by the server alone and
--    pulled by the app with the row (every write here goes through the row guard, so version and
--    updated_at move and the ordinary sync of captures carries it):
--      kept      at least one memory line was written from this note
--      nothing   the understanding ran, nothing was kept and nothing is held; the note stays as the
--                user's words
--      partial   some kept, with coverage gaps or not-understood spans (captures.coverage says where)
--      held      a review or question is waiting on the user
--      declined  the user declined the reading ("Don't keep this" for every held line, or "not now");
--                the Tell itself remains
--      failed    the understanding failed (a timeout, an error, a refusal; status is 'failed' too)
--      NULL      not yet understood (pending or processing), or a row older than this migration
--    It is settled by capture_understanding_settle at the end of write_extraction (kept / partial /
--    nothing), write_extraction_with_review (held), resolve_capture_review (kept / partial / declined),
--    settle_capture_review ("not now": declined; the 30-day purge: nothing), and set directly by
--    release_capture_extraction ('failed') and claim_capture_extraction (NULL: a fresh understanding).
--    A BEFORE INSERT guard keeps it NULL on every new row, whoever inserts it.
--
-- 2. captures.coverage may now carry `not_understood`: the places (code-point spans) of proposals the
--    understanding read but could keep nothing from, beside `unprocessed` (passages whose model call
--    failed) and `unlocated` (a count of those whose words were not found). Same shape rules, same
--    ceiling of 64 spans, offsets only, never words. A row without the key is as before.
--
-- 3. ai_drop_reasons_ok learns the two drop reasons the gateway has logged since October
--    (internal_reference, already_known): a call that dropped a line for either reason could not write
--    its content-free usage row at all, so those understandings were missing from ai_calls.
--
-- Release order: this migration must be in production (merged to main) before the ai-gateway that
-- writes `not_understood` is deployed, or set_capture_coverage refuses the write (22023). An older
-- gateway keeps working with the column and the wider CHECK in place: it calls the same functions with
-- the same signatures, and the functions settle `understanding` for it.

-- ─── understanding: the column, its guard, and how it is settled ──────────────

ALTER TABLE public.captures
  ADD COLUMN understanding text
    CHECK (understanding IS NULL OR understanding IN ('kept', 'nothing', 'partial', 'held', 'declined', 'failed'));

COMMENT ON COLUMN public.captures.understanding IS
  'Kinship 2.0 CMR-1: what the understanding of this note came to (kept, nothing, partial, held, declined, failed); NULL until understood. Written by the server only; the app reads it.';

-- Whoever inserts a note, its understanding has not happened yet.
CREATE OR REPLACE FUNCTION public.captures_understanding_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.understanding := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.captures_understanding_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER captures_understanding_guard BEFORE INSERT ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.captures_understanding_guard();

-- What the note's understanding comes to now, from what the database holds: a review waiting (held); a
-- live line of this note (partial when the note has coverage gaps, else kept); otherwise declined when
-- the user answered (p_answered) and nothing when the understanding simply found nothing. Written only
-- when it changes; returns the state. Service paths only (every caller is SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.capture_understanding_settle(p_user_id uuid, p_capture_id uuid, p_answered boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_held boolean;
  v_kept boolean;
  v_gaps boolean;
  v_state text;
BEGIN
  SELECT coverage IS NOT NULL INTO v_gaps FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.capture_reviews r
                  WHERE r.capture_id = p_capture_id AND r.user_id = p_user_id AND r.expires_at > now()) INTO v_held;
  SELECT EXISTS (SELECT 1 FROM public.memory_item_sources s
                   JOIN public.memory_items m ON m.id = s.memory_item_id
                  WHERE s.capture_id = p_capture_id AND s.user_id = p_user_id AND s.deleted_at IS NULL
                    AND m.deleted_at IS NULL AND m.status IN ('active', 'resolved')) INTO v_kept;
  v_state := CASE
    WHEN v_held THEN 'held'
    WHEN v_kept AND coalesce(v_gaps, false) THEN 'partial'
    WHEN v_kept THEN 'kept'
    WHEN coalesce(p_answered, false) THEN 'declined'
    ELSE 'nothing'
  END;
  UPDATE public.captures SET understanding = v_state
   WHERE id = p_capture_id AND user_id = p_user_id AND understanding IS DISTINCT FROM v_state;
  RETURN v_state;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_understanding_settle(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_understanding_settle(uuid, uuid, boolean) TO service_role;

-- ─── coverage: not_understood joins unprocessed and unlocated ──────────────────

-- An array of at most 64 spans, each exactly {start, end} in whole code points, forwards, inside a note.
CREATE OR REPLACE FUNCTION public.coverage_spans_ok(a jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(a) = 'array'
     AND jsonb_array_length(a) <= 64
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(a) s
        WHERE jsonb_typeof(s) <> 'object'
           OR NOT (s ? 'start') OR NOT (s ? 'end')
           OR jsonb_typeof(s->'start') <> 'number' OR jsonb_typeof(s->'end') <> 'number'
           OR (s->>'start')::numeric < 0
           OR (s->>'end')::numeric <= (s->>'start')::numeric
           OR (s->>'end')::numeric > 5000
           OR (s->>'start')::numeric <> floor((s->>'start')::numeric)
           OR (s->>'end')::numeric <> floor((s->>'end')::numeric)
           OR (SELECT count(*) FROM jsonb_object_keys(s)) <> 2
     )
$$;
REVOKE ALL ON FUNCTION public.coverage_spans_ok(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coverage_spans_ok(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.capture_coverage_ok(c jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(c) = 'object'
     AND (c ? 'v') AND (c ? 'unprocessed') AND (c ? 'unlocated')
     AND c->>'v' = '1'
     AND jsonb_typeof(c->'unlocated') = 'number'
     AND (c->>'unlocated')::numeric >= 0 AND (c->>'unlocated')::numeric = floor((c->>'unlocated')::numeric)
     AND public.coverage_spans_ok(c->'unprocessed')
     AND (NOT (c ? 'not_understood') OR public.coverage_spans_ok(c->'not_understood'))
     AND (SELECT count(*) FROM jsonb_object_keys(c)) = 3 + CASE WHEN c ? 'not_understood' THEN 1 ELSE 0 END
$$;

COMMENT ON COLUMN public.captures.coverage IS
  'Kinship 2.0 Option A + CMR-1: what the understanding did not get to, as the note''s own spans (code points into raw_text): unprocessed (passages whose model call failed), not_understood (proposals it read but could keep nothing from) and a count of unplaced ones; NULL when the note was taken whole. Written by the gateway only.';

-- ─── the usage log counts every drop reason the gateway has ────────────────────

CREATE OR REPLACE FUNCTION public.ai_drop_reasons_ok(d jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(d) = 'object'
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each(d) e
       WHERE e.key NOT IN ('no_evidence', 'evidence_ambiguous', 'invented_name', 'invented_number',
                           'invented_sensitive_term', 'invented_relation', 'mention_not_in_note',
                           'polarity_mismatch', 'not_a_user_promise', 'instruction_text',
                           'low_confidence', 'bad_kind_subject', 'duplicate', 'too_many_items',
                           'contact_detail', 'internal_reference', 'already_known')
          OR jsonb_typeof(e.value) <> 'number'
          OR NOT (e.value::text ~ '^[0-9]{1,3}$'))
$$;

-- ─── the gateway's writes, each settling the understanding ──────────────────────
-- claim_capture_extraction, release_capture_extraction (20261004090000), settle_capture_review
-- (20261004100000), write_extraction and resolve_capture_review (20261031100000) and
-- write_extraction_with_review (20261031110000), each re-created as it was but for the lines marked
-- CMR-1 C3. Signatures and grants unchanged.

CREATE OR REPLACE FUNCTION public.claim_capture_extraction(p_user_id uuid, p_capture_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cur text;
BEGIN
  UPDATE public.captures
     -- A fresh understanding begins: its outcome is not yet known (CMR-1 C3).
     SET status = 'processing', understanding = NULL
   WHERE id = p_capture_id AND user_id = p_user_id
     AND deleted_at IS NULL AND raw_text IS NOT NULL
     AND (status IN ('pending', 'failed', 'skipped')
          -- A worker that died mid-call doesn't hold the capture forever.
          OR (status = 'processing' AND updated_at < now() - interval '2 minutes'));
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  SELECT status INTO cur FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL AND raw_text IS NOT NULL;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  RETURN CASE WHEN cur IN ('extracted', 'needs_review') THEN 'done' ELSE 'busy' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_capture_extraction(p_user_id uuid, p_capture_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('failed', 'pending') THEN
    RAISE EXCEPTION 'a released capture is failed or pending' USING ERRCODE = '22023';
  END IF;
  -- 'failed': the understanding failed, and the phone may say so (CMR-1 C3). 'pending': it never ran,
  -- so its outcome is not yet known.
  UPDATE public.captures SET status = p_status, understanding = CASE WHEN p_status = 'failed' THEN 'failed' END
   WHERE id = p_capture_id AND user_id = p_user_id AND status = 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_capture_review(p_user_id uuid, p_capture_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cap record;
  v_expired boolean;
BEGIN
  -- Whether the question ran out unanswered (the purge) or the user set it aside ("not now").
  SELECT expires_at <= now() INTO v_expired FROM public.capture_reviews
   WHERE capture_id = p_capture_id AND user_id = p_user_id;
  DELETE FROM public.capture_reviews WHERE capture_id = p_capture_id AND user_id = p_user_id;
  SELECT id, retention, status INTO cap FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND OR cap.status <> 'needs_review' THEN
    RETURN false;
  END IF;
  UPDATE public.captures SET status = 'extracted' WHERE id = p_capture_id;
  -- Nothing waits any more (CMR-1 C3): kept or partial when a line of this note is live; otherwise
  -- declined when the user set the question aside, nothing when it simply ran out.
  PERFORM public.capture_understanding_settle(p_user_id, p_capture_id, NOT coalesce(v_expired, false));
  -- "Delete my note after it's understood": the excerpts on each saved
  -- item's sources remain for the Source view (C-6).
  IF cap.retention = 'delete_after_extraction' THEN
    UPDATE public.captures SET raw_text = NULL WHERE id = p_capture_id AND raw_text IS NOT NULL;
  END IF;
  RETURN true;
END;
$$;

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
  f jsonb;
  t record;
  v_action text;
  v_target uuid;
  v_person uuid;
  v_related uuid;
  v_item uuid;
  v_with uuid[];
  v_mentions jsonb;
  v_rel record;
  v_cand uuid;
  v_closes uuid[];
  v_slots text[];
  v_res jsonb;
  v_out jsonb := '[]'::jsonb;
BEGIN
  IF p_extraction_version IS NULL OR p_extraction_version !~ '^[a-z_]{1,40}/v[0-9]{1,4}\+claude-[a-z0-9-]{1,50}$' THEN
    RAISE EXCEPTION 'bad extraction version' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'items must be an array of at most 200' USING ERRCODE = '22023';
  END IF;

  -- Only the request that claimed the capture may write its extraction.
  SELECT id, retention, raw_text INTO cap FROM public.captures
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
         OR (t.user_state IN ('edited', 'user_authored')
             AND NOT (v_action = 'supersede'
                      AND (public.edited_line_closure_ok(p_user_id, p_capture_id, cap.raw_text, it, v_target, v_with)
                           OR public.user_chose_closure(p_capture_id, it, v_target))))
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

    -- The other items it closes: each re-checked as the target is; a
    -- doubtful one is dropped, never an error (brief §1 E).
    v_closes := '{}'::uuid[];
    IF v_action IN ('new', 'supersede') AND jsonb_typeof(it -> 'closes') = 'array' THEN
      FOR v_cand IN
        SELECT lower(e #>> '{}')::uuid FROM jsonb_array_elements(it -> 'closes') WITH ORDINALITY x(e, n)
         WHERE jsonb_typeof(e) = 'string'
           AND (e #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         ORDER BY n
      LOOP
        EXIT WHEN cardinality(v_closes) >= 8;
        CONTINUE WHEN v_cand = ANY (v_closes) OR v_cand IS NOT DISTINCT FROM v_target;
        SELECT id, person_id, subject_type, subject_related_id, status, user_state INTO t
          FROM public.memory_items
         WHERE id = v_cand AND user_id = p_user_id AND deleted_at IS NULL
         FOR UPDATE;
        CONTINUE WHEN NOT FOUND
          OR (t.user_state IN ('edited', 'user_authored')
              AND NOT public.edited_line_closure_ok(p_user_id, p_capture_id, cap.raw_text, it, v_cand, v_with))
          OR t.person_id <> v_person
          OR t.subject_type <> it ->> 'subject_type'
          OR t.subject_related_id IS DISTINCT FROM v_related
          OR t.status NOT IN ('active', 'resolved');
        v_closes := v_closes || v_cand;
      END LOOP;
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
        person_mentions, resolves_id, closes_ids)
      VALUES (
        p_user_id, it ->> 'kind', v_person, it ->> 'subject_type', v_related, it ->> 'statement',
        coalesce(it -> 'detail', '{}'::jsonb), it ->> 'certainty', (it ->> 'confidence')::numeric(3, 2),
        it ->> 'sensitivity', 'active', 'unreviewed',
        CASE WHEN v_action = 'supersede' THEN v_target END, 'extracted', v_with,
        v_mentions, CASE WHEN v_action = 'resolves' THEN v_target END, v_closes)
      RETURNING id INTO v_item;
      IF v_action = 'resolves' THEN
        UPDATE public.memory_items SET status = 'resolved' WHERE id = v_target;
      END IF;
    END IF;

    FOR sp IN SELECT value FROM jsonb_array_elements(it -> 'spans') LOOP
      INSERT INTO public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end)
      VALUES (p_user_id, v_item, p_capture_id, 'capture', (sp ->> 'start')::int, (sp ->> 'end')::int);
    END LOOP;

    -- Its residence reading: only on a line written as new that may carry one,
    -- and only in the note's own characters inside one of its spans (§5).
    v_slots := '{}'::text[];
    IF v_action <> 'merge' AND jsonb_typeof(it -> 'facets') = 'array'
       AND public.residence_facet_eligible(it ->> 'kind', it ->> 'subject_type', it ->> 'certainty',
                                           it ->> 'sensitivity', v_with) THEN
      FOR f IN SELECT value FROM jsonb_array_elements(it -> 'facets') LOOP
        CONTINUE WHEN NOT public.facet_input_ok(f) OR (f ->> 'slot') = ANY (v_slots);
        CONTINUE WHEN NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(it -> 'spans') s
           WHERE position(f ->> 'value_text' IN
                   substr(cap.raw_text, (s ->> 'start')::int + 1, (s ->> 'end')::int - (s ->> 'start')::int)) > 0);
        INSERT INTO public.memory_item_facets (
          user_id, memory_item_id, slot, value_text, value_norm, place_ref, candidates, usual_ref,
          decided_by, rule_version, dataset_version)
        VALUES (
          p_user_id, v_item, f ->> 'slot', f ->> 'value_text', f ->> 'value_norm', f ->> 'place_ref',
          coalesce(f -> 'candidates', '[]'::jsonb), f ->> 'usual_ref', f ->> 'decided_by',
          f ->> 'rule_version', f ->> 'dataset_version');
        v_slots := v_slots || (f ->> 'slot');
      END LOOP;
    END IF;

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

    v_res := jsonb_build_object('id', v_item, 'action', v_action);
    IF it ? 'closes' THEN
      v_res := v_res || jsonb_build_object('closes', to_jsonb(v_closes));
    END IF;
    IF it ? 'facets' THEN
      v_res := v_res || jsonb_build_object('facets', cardinality(v_slots));
    END IF;
    v_out := v_out || v_res;
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
  -- What this understanding came to, for every phone (CMR-1 C3): kept, partial or nothing here; a review
  -- written after this call (write_extraction_with_review) makes it held, and an answer settles it again.
  PERFORM public.capture_understanding_settle(p_user_id, p_capture_id, false);
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_extraction_with_review(
  p_user_id uuid,
  p_capture_id uuid,
  p_extraction_version text,
  p_needs_review boolean,
  p_items jsonb,
  p_review jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_out jsonb;
  v_len integer;
  it jsonb;
  sp jsonb;
  c jsonb;
BEGIN
  IF p_review IS NOT NULL AND NOT p_needs_review THEN
    RAISE EXCEPTION 'a pending review needs needs_review' USING ERRCODE = '22023';
  END IF;
  -- Text length in code points, before write_extraction can purge it.
  SELECT char_length(raw_text) INTO v_len FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL;

  v_out := public.write_extraction(p_user_id, p_capture_id, p_extraction_version, p_needs_review, p_items);

  IF p_review IS NULL THEN
    RETURN v_out;
  END IF;
  IF jsonb_typeof(p_review) <> 'object' OR jsonb_typeof(p_review -> 'items') <> 'array'
     OR jsonb_array_length(p_review -> 'items') NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'review items must be an array of 1 to 200' USING ERRCODE = '22023';
  END IF;
  FOR it IN SELECT value FROM jsonb_array_elements(p_review -> 'items') LOOP
    IF jsonb_typeof(it) <> 'object' OR char_length(coalesce(it ->> 'statement', '')) NOT BETWEEN 1 AND 500 THEN
      RAISE EXCEPTION 'a held item needs a statement' USING ERRCODE = '23514';
    END IF;
    IF it ->> 'person_id' IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.people
          WHERE id = (it ->> 'person_id')::uuid AND user_id = p_user_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'person is not this user''s' USING ERRCODE = '23503';
    END IF;
    IF jsonb_typeof(it -> 'spans') <> 'array' OR jsonb_array_length(it -> 'spans') = 0 THEN
      RAISE EXCEPTION 'a held item needs a span' USING ERRCODE = '23514';
    END IF;
    FOR sp IN SELECT value FROM jsonb_array_elements(it -> 'spans') LOOP
      IF (sp ->> 'start')::int < 0 OR (sp ->> 'end')::int <= (sp ->> 'start')::int
         OR (sp ->> 'end')::int > v_len THEN
        RAISE EXCEPTION 'a held item''s span is outside the note' USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END LOOP;
  c := p_review -> 'clarification';
  IF c IS NOT NULL AND jsonb_typeof(c) <> 'null' AND (
       jsonb_typeof(c) <> 'object'
       OR coalesce(c ->> 'about', '') NOT IN ('person', 'subject', 'new_person', 'date')
       OR char_length(coalesce(c ->> 'question', '')) NOT BETWEEN 1 AND 300
       OR jsonb_typeof(c -> 'options') <> 'array' OR jsonb_array_length(c -> 'options') > 6) THEN
    RAISE EXCEPTION 'bad clarification' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.capture_reviews (capture_id, user_id, extraction_version, items, clarification)
  VALUES (p_capture_id, p_user_id, p_extraction_version, p_review -> 'items',
          CASE WHEN c IS NULL OR jsonb_typeof(c) = 'null' THEN NULL ELSE c END)
  ON CONFLICT (capture_id) DO UPDATE
    SET extraction_version = EXCLUDED.extraction_version, items = EXCLUDED.items,
        clarification = EXCLUDED.clarification, created_at = now(),
        expires_at = now() + interval '30 days';
  -- Something waits on the user: held (CMR-1 C3).
  PERFORM public.capture_understanding_settle(p_user_id, p_capture_id, false);
  RETURN v_out;
END;
$$;

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
  v_answers jsonb := '[]'::jsonb;
  v_chosen jsonb := '[]'::jsonb;
  v_out jsonb;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'items must be an array of at most 200' USING ERRCODE = '22023';
  END IF;
  IF p_new_people IS NOT NULL AND (jsonb_typeof(p_new_people) <> 'array' OR jsonb_array_length(p_new_people) > 50) THEN
    RAISE EXCEPTION 'new people must be an array of at most 50' USING ERRCODE = '22023';
  END IF;

  SELECT id, status, raw_text INTO cap FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'capture not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT capture_id, extraction_version, created_at, items INTO rev FROM public.capture_reviews
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
    -- Words for someone added in this answer name them by their new id.
    IF jsonb_typeof(it -> 'person_mentions') = 'array' THEN
      it := jsonb_set(it, '{person_mentions}', (
        SELECT coalesce(jsonb_agg(CASE
                 WHEN jsonb_typeof(e) = 'object' AND (e ->> 'person_id') LIKE 'new:%' AND v_map ? (e ->> 'person_id')
                 THEN jsonb_set(e, '{person_id}', v_map -> (e ->> 'person_id'))
                 ELSE e END), '[]'::jsonb)
          FROM jsonb_array_elements(it -> 'person_mentions') e));
    END IF;
    v_items := v_items || jsonb_build_array(it);
  END LOOP;

  -- "Is Susan still in Alameda?" answered "Susan moved" (brief §21 b): the
  -- stored question, not the item, says which line that answer may close.
  -- An answered item replacing a line as a change counts only when a held
  -- item of this review, with the same person and words, was asked about
  -- exactly that line. write_extraction reads the list for this capture,
  -- in this transaction only.
  FOR it IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    CONTINUE WHEN it -> 'action' ->> 'type' IS DISTINCT FROM 'supersede'
              OR it -> 'detail' ->> 'transition' IS DISTINCT FROM 'changed';
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(rev.items) h
                WHERE jsonb_typeof(h -> 'flags') = 'array' AND h -> 'flags' ? 'residence_conflict'
                  AND h -> 'still_in' ->> 'target_id' = it -> 'action' ->> 'target_id'
                  AND h ->> 'person_id' = it ->> 'person_id'
                  AND public.span_signature(h -> 'spans') = public.span_signature(it -> 'spans')) THEN
      v_answers := v_answers || jsonb_build_object('target', it -> 'action' ->> 'target_id',
                                                   'spans', public.span_signature(it -> 'spans'));
    END IF;
  END LOOP;
  PERFORM set_config('kinship.residence_answers',
                     jsonb_build_object('capture', p_capture_id, 'answers', v_answers)::text, true);

  -- "Does this replace what you told me?" answered with the line (CER-1, 31 Oct 2026): a held item of
  -- this review, with the same person and words, offered exactly that line under _replaces, and the
  -- user chose it. Only then may the answer close a line the user edited or wrote (trust invariant 4:
  -- the user's edit wins, and here the user is the one replacing it). write_extraction reads the list
  -- for this capture, in this transaction only. A line held for "Who is this about?" has no person until
-- answered; its replace answer then counts when the answered person is the closed line's own (write_extraction
-- compares the person: a mismatch is a new line, never a closure).
  v_chosen := '[]'::jsonb;
  FOR it IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    CONTINUE WHEN it -> 'action' ->> 'type' IS DISTINCT FROM 'supersede' OR it -> 'action' ->> 'target_id' IS NULL;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(rev.items) h
                WHERE jsonb_typeof(h -> 'flags') = 'array' AND h -> 'flags' ? 'update_check'
                  AND jsonb_typeof(h -> 'detail' -> '_replaces') = 'array'
                  AND EXISTS (SELECT 1 FROM jsonb_array_elements(h -> 'detail' -> '_replaces') o
                               WHERE o ->> 'id' = it -> 'action' ->> 'target_id')
                  AND (h ->> 'person_id' IS NULL OR h ->> 'person_id' = it ->> 'person_id')
                  AND public.span_signature(h -> 'spans') = public.span_signature(it -> 'spans')) THEN
      v_chosen := v_chosen || jsonb_build_object('target', it -> 'action' ->> 'target_id',
                                                 'spans', public.span_signature(it -> 'spans'));
    END IF;
  END LOOP;
  PERFORM set_config('kinship.user_closures',
                     jsonb_build_object('capture', p_capture_id, 'closures', v_chosen)::text, true);

  -- The same write as any extraction; nothing waits on the user afterwards.
  UPDATE public.captures SET status = 'processing' WHERE id = p_capture_id;
  v_out := public.write_extraction(p_user_id, p_capture_id, rev.extraction_version, false, v_items);
  PERFORM set_config('kinship.residence_answers', '', true);
  PERFORM set_config('kinship.user_closures', '', true);
  DELETE FROM public.capture_reviews WHERE capture_id = p_capture_id;
  -- The user answered: kept (or partial) when a line of this note is live, else declined (CMR-1 C3).
  PERFORM public.capture_understanding_settle(p_user_id, p_capture_id, true);
  RETURN jsonb_build_object('status', 'resolved', 'items', v_out, 'people', v_map);
END;
$$;
