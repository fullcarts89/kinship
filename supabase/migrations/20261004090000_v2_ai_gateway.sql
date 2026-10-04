-- ============================================================================
-- Kinship 2.0 — Checkpoint C: the AI gateway's server-side writes
-- ============================================================================
-- The ai-gateway edge function (relationship_extract) calls these with the
-- service role, after it has authenticated the user, checked consent, the
-- ai_extraction flag and quota, and validated the model's proposal with the
-- deterministic pipeline (supabase/functions/_shared/extraction/).
--
--   ai_calls                    content-free usage log: no user id, no text,
--                               no names, no prompts, no outputs
--   claim_capture_extraction    one extraction per capture at a time; a
--                               retried request never pays for a second run
--   release_capture_extraction  marks a claimed capture failed (kept raw)
--   write_extraction            items + sources + capture status in one
--                               transaction; re-checks every target server-
--                               side, so a user-written or edited item is
--                               never superseded or merged into
--
-- None of these can be called by the app: EXECUTE is granted to
-- service_role only.
-- ============================================================================

-- ─── ai_calls ───────────────────────────────────────────────────────────────

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
                           'low_confidence', 'bad_kind_subject', 'duplicate', 'too_many_items')
          OR jsonb_typeof(e.value) <> 'number'
          OR NOT (e.value::text ~ '^[0-9]{1,3}$'))
$$;

CREATE TABLE public.ai_calls (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at          timestamptz NOT NULL DEFAULT now(),
  capability          text NOT NULL CHECK (capability ~ '^[a-z_]{1,40}$'),
  -- Model and prompt identifiers only; the patterns leave no room for content.
  model               text NOT NULL CHECK (model ~ '^claude-[a-z0-9-]{1,50}$'),
  prompt_version      text NOT NULL CHECK (prompt_version ~ '^[a-z_]{1,40}/v[0-9]{1,4}$'),
  eval_version        text NOT NULL CHECK (eval_version ~ '^[a-z0-9_.-]{1,40}$'),
  outcome             text NOT NULL CHECK (outcome IN ('ok', 'refused', 'max_tokens', 'invalid_output',
                                                        'timeout', 'rate_limited', 'api_error')),
  -- What the capture needed: auto-save, light confirmation, one question, nothing.
  result              text CHECK (result IN ('auto', 'confirm', 'clarify', 'nothing')),
  input_tokens        integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens       integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cache_read_tokens   integer NOT NULL DEFAULT 0 CHECK (cache_read_tokens >= 0),
  cache_write_tokens  integer NOT NULL DEFAULT 0 CHECK (cache_write_tokens >= 0),
  latency_ms          integer NOT NULL CHECK (latency_ms >= 0),
  items_saved         smallint NOT NULL DEFAULT 0 CHECK (items_saved >= 0),
  items_held          smallint NOT NULL DEFAULT 0 CHECK (items_held >= 0),
  items_dropped       smallint NOT NULL DEFAULT 0 CHECK (items_dropped >= 0),
  -- Counts by reason code, e.g. {"invented_name": 1}.
  drop_reasons        jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (public.ai_drop_reasons_ok(drop_reasons)),
  injection_suspected boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.ai_calls IS
  'Kinship 2.0: one row per AI gateway model call. Content-free by construction: no user id, no text, no names, no prompts, no outputs.';

CREATE INDEX ai_calls_created_idx ON public.ai_calls (created_at);

ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) reads or writes it.
REVOKE ALL ON public.ai_calls FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.ai_calls TO service_role;
REVOKE ALL ON FUNCTION public.ai_drop_reasons_ok(jsonb) FROM PUBLIC, anon, authenticated;
-- The ai_calls CHECK constraint runs it as the inserting role (the gateway's
-- service role). Granted explicitly: newer Supabase projects and branches no
-- longer grant EXECUTE on new functions to service_role by default.
GRANT EXECUTE ON FUNCTION public.ai_drop_reasons_ok(jsonb) TO service_role;

-- ─── claim_capture_extraction ───────────────────────────────────────────────
-- 'claimed'  this call owns the extraction (status → processing)
-- 'done'     already extracted: the retry is answered without a model call
-- 'busy'     another request is extracting it right now
-- 'missing'  not this user's, deleted, or its text was purged

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
     SET status = 'processing'
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

-- ─── release_capture_extraction ─────────────────────────────────────────────
-- The model failed or declined ('failed': the capture stays as the user
-- wrote it, and a later attempt or the worker may try again), or the call
-- never reached the model, e.g. the daily quota was spent ('pending').

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
  UPDATE public.captures SET status = p_status
   WHERE id = p_capture_id AND user_id = p_user_id AND status = 'processing';
END;
$$;

-- ─── write_extraction ───────────────────────────────────────────────────────
-- p_items: the pipeline's saved items (tier auto/confirm), each
--   {kind, person_id, subject_type, related: {id|null, relation, name}|null,
--    statement, detail, certainty, sensitivity, confidence,
--    spans: [{start, end}], action: {type, target_id}}
-- Spans are code points into the capture's text; the quote is filled from
-- the text by memory_item_sources_span_guard, never from the model.

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
    ELSE
      INSERT INTO public.memory_items (
        user_id, kind, person_id, subject_type, subject_related_id, statement, detail,
        certainty, extraction_confidence, sensitivity, status, user_state, supersedes_id, origin)
      VALUES (
        p_user_id, it ->> 'kind', v_person, it ->> 'subject_type', v_related, it ->> 'statement',
        coalesce(it -> 'detail', '{}'::jsonb), it ->> 'certainty', (it ->> 'confidence')::numeric(3, 2),
        it ->> 'sensitivity', 'active', 'unreviewed',
        CASE WHEN v_action = 'supersede' THEN v_target END, 'extracted')
      RETURNING id INTO v_item;
      IF v_action = 'resolves' THEN
        UPDATE public.memory_items SET status = 'resolved' WHERE id = v_target;
      END IF;
    END IF;

    FOR sp IN SELECT value FROM jsonb_array_elements(it -> 'spans') LOOP
      INSERT INTO public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end)
      VALUES (p_user_id, v_item, p_capture_id, 'capture', (sp ->> 'start')::int, (sp ->> 'end')::int);
    END LOOP;

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

REVOKE ALL ON FUNCTION public.claim_capture_extraction(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_capture_extraction(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_extraction(uuid, uuid, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_capture_extraction(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_capture_extraction(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.write_extraction(uuid, uuid, text, boolean, jsonb) TO service_role;
