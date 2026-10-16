-- ============================================================================
-- Kinship 2.0 — a later explicit change may close a line the user edited
-- (Phase 4B step B3; brief docs/product/phase4-implementation-brief.md §21;
-- founder CC-24, 16 Oct 2026: designed and approved as written)
-- ============================================================================
-- A user's edit is high-authority current truth at that point in time, not
-- immutable. A later grounded statement of the user's own can close it; a
-- model inference alone never can. Until now write_extraction dropped every
-- closure of an edited or user-written line. Now such a line (the
-- supersede target, or an id in `closes`) is closed only when one of these
-- holds, and dropped (fail open) otherwise, as before:
--
--   (a) the new line records a change or a correction (detail.transition
--       `changed` or `corrected`) and sends `cue: {start, end}`, code points
--       into the note, inside one of its own spans, whose characters the
--       database reads itself and finds to be a cue phrase of brief §8 for
--       that transition: moved to, has moved, relocated to, now lives in,
--       lives in … now (change); actually, I was wrong, I meant, correction,
--       or "not <the closed line's place, in its own words>" (correction).
--       A gateway can't assert a cue the user didn't write;
--   (b) the call comes from resolve_capture_review for an answered item
--       whose stored question was the residence question about that very
--       line ("Is Susan still in Alameda?"), answered "Susan moved": the
--       answer is written as a change. The stored review row (the held item
--       with that question, its person and its words), never the item
--       JSON, says which line the answer may close.
--
-- Narrower than §21's words, on purpose: the closed line is a residence
-- line (it has a live residence facet), not shared with anyone, and the new
-- line may carry one too (a stated, unshared, non-sensitive fact with its
-- own residence reading). Every other re-check is unchanged: same person,
-- subject and related person, live, active or resolved, at most 8 closures.
-- The apply and restore triggers and the facets are unchanged.
--
-- Provenance: the closed line keeps user_state `edited` and its history;
-- closing changes only its status and valid_to, so exact Undo (or "Not
-- this" on the closer) returns the edited version, never a pre-edit one.
-- Whether it may appear as history is the closer's transition (§11):
-- `changed` may, `corrected` never.
--
-- Forward-only. Replaces two function bodies (write_extraction from
-- 20261015090000, resolve_capture_review from 20261008090000) and adds two
-- small internal helpers. No table or column changes; no stored row is
-- updated; no backfill.
--
-- Reverse (a forward migration, if ever needed): restore write_extraction
-- from 20261015090000 and resolve_capture_review from 20261008090000; drop
-- edited_line_closure_ok and span_signature.
-- ============================================================================

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- A line's spans as "start-end,…", in order: how an answered item is matched
-- to the held item it answers.
CREATE OR REPLACE FUNCTION public.span_signature(p_spans jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN jsonb_typeof(p_spans) = 'array' THEN
    (SELECT string_agg((s ->> 'start') || '-' || (s ->> 'end'), ',' ORDER BY (s ->> 'start')::int, (s ->> 'end')::int)
       FROM jsonb_array_elements(p_spans) s
      WHERE jsonb_typeof(s) = 'object' AND (s ->> 'start') ~ '^[0-9]{1,6}$' AND (s ->> 'end') ~ '^[0-9]{1,6}$')
  END
$$;

REVOKE ALL ON FUNCTION public.span_signature(jsonb) FROM PUBLIC, anon, authenticated;

-- May the item `p_item` of this note close `p_target`, a line the user
-- edited or wrote? (a) or (b) above, on residence lines only. Never an
-- error: anything doubtful is false.
CREATE OR REPLACE FUNCTION public.edited_line_closure_ok(
  p_user_id uuid,
  p_capture_id uuid,
  p_text text,
  p_item jsonb,
  p_target uuid,
  p_with uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_transition text := p_item -> 'detail' ->> 'transition';
  v_words text;
  v_start int;
  v_end int;
  v_cue text;
  v_setting text;
  v_answered jsonb;
BEGIN
  IF v_transition IS NULL OR v_transition NOT IN ('changed', 'corrected') OR p_text IS NULL THEN
    RETURN false;
  END IF;
  -- The new line may read as a residence, and does.
  IF p_item ->> 'kind' IS DISTINCT FROM 'fact'
     OR NOT public.residence_facet_eligible(p_item ->> 'kind', p_item ->> 'subject_type', p_item ->> 'certainty',
                                            p_item ->> 'sensitivity', p_with)
     OR jsonb_typeof(p_item -> 'facets') IS DISTINCT FROM 'array'
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_item -> 'facets') f
                     WHERE jsonb_typeof(f) = 'object' AND f ->> 'slot' = 'residence') THEN
    RETURN false;
  END IF;
  -- The line it closes: the user's own residence line, about no one else.
  SELECT f.value_text INTO v_words
    FROM public.memory_items m
    JOIN public.memory_item_facets f
      ON f.memory_item_id = m.id AND f.user_id = m.user_id AND f.slot = 'residence' AND f.deleted_at IS NULL
   WHERE m.id = p_target AND m.user_id = p_user_id AND m.deleted_at IS NULL AND m.kind = 'fact'
     AND m.status IN ('active', 'resolved') AND m.user_state IN ('edited', 'user_authored')
     AND cardinality(m.with_person_ids) = 0;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- (b) The stored residence question about this line, answered "Susan moved".
  v_setting := current_setting('kinship.residence_answers', true);
  IF v_transition = 'changed' AND coalesce(v_setting, '') <> '' THEN
    v_answered := v_setting::jsonb;
    IF v_answered ->> 'capture' = p_capture_id::text
       AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_answered -> 'answers') a
                    WHERE a ->> 'target' = p_target::text
                      AND a ->> 'spans' = public.span_signature(p_item -> 'spans')) THEN
      RETURN true;
    END IF;
  END IF;

  -- (a) A cue in the user's own words, inside one of the item's spans.
  IF jsonb_typeof(p_item -> 'cue') IS DISTINCT FROM 'object'
     OR (p_item -> 'cue' ->> 'start') !~ '^[0-9]{1,6}$' OR (p_item -> 'cue' ->> 'end') !~ '^[0-9]{1,6}$' THEN
    RETURN false;
  END IF;
  v_start := (p_item -> 'cue' ->> 'start')::int;
  v_end := (p_item -> 'cue' ->> 'end')::int;
  IF v_end <= v_start OR v_end > char_length(p_text) OR jsonb_typeof(p_item -> 'spans') IS DISTINCT FROM 'array'
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_item -> 'spans') s
                     WHERE jsonb_typeof(s) = 'object'
                       AND (s ->> 'start') ~ '^[0-9]{1,6}$' AND (s ->> 'end') ~ '^[0-9]{1,6}$'
                       AND v_start >= (s ->> 'start')::int AND v_end <= (s ->> 'end')::int) THEN
    RETURN false;
  END IF;
  v_cue := lower(btrim(regexp_replace(substr(p_text, v_start + 1, v_end - v_start), '\s+', ' ', 'g')));
  IF v_transition = 'changed' THEN
    RETURN v_cue ~ '^((has|have|had|just|recently|finally|since) )*(moved|relocated)( back)?( from [^.,;:!?]{1,60})? to$'
        OR v_cue ~ '^now (lives|living|resides|residing|is based|based|is living) in$'
        OR v_cue ~ '^(lives|live|living|resides|reside|residing|is based|are based|based|is living|are living) in .{1,100} now$';
  END IF;
  RETURN v_cue ~ '^(actually|i was wrong|i meant|correction)$'
      OR (v_cue ~ '^not ' AND position(lower(v_words) IN v_cue) > 0);
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.edited_line_closure_ok(uuid, uuid, text, jsonb, uuid, uuid[]) FROM PUBLIC, anon, authenticated;

-- ─── write_extraction: an edited line closes only on the user's own evidence ─
-- As 20261015090000, plus: a supersede target or a closes id that the user
-- edited or wrote is kept when edited_line_closure_ok says so (above);
-- otherwise dropped as before.

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
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 8 THEN
    RAISE EXCEPTION 'items must be an array of at most 8' USING ERRCODE = '22023';
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
                      AND public.edited_line_closure_ok(p_user_id, p_capture_id, cap.raw_text, it, v_target, v_with)))
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
  RETURN v_out;
END;
$$;


-- ─── resolve_capture_review: "Susan moved" may close the line it asked about ─
-- As 20261008090000, plus: the answered items whose stored question was the
-- residence question about the line they now replace, as a change, are
-- passed to write_extraction (in this transaction only).

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

  -- The same write as any extraction; nothing waits on the user afterwards.
  UPDATE public.captures SET status = 'processing' WHERE id = p_capture_id;
  v_out := public.write_extraction(p_user_id, p_capture_id, rev.extraction_version, false, v_items);
  PERFORM set_config('kinship.residence_answers', '', true);
  DELETE FROM public.capture_reviews WHERE capture_id = p_capture_id;
  RETURN jsonb_build_object('status', 'resolved', 'items', v_out, 'people', v_map);
END;
$$;

