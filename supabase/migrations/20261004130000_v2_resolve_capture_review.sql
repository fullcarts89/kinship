-- ============================================================================
-- Kinship 2.0 — answering a held extraction (Checkpoint D1; C-2 resolve)
-- ============================================================================
-- A held item ("Which Sam?", "Is Maya someone new?", "Sarah, or Sarah's
-- sister?") waits in capture_reviews without being memory. The ai-gateway
-- applies the user's answer to the stored interpretation and checks it again
-- deterministically (supabase/functions/_shared/extraction/resolve.ts); no
-- model is called. resolve_capture_review then, in one transaction:
--
--   * checks the capture is the user's, live and still waiting on them, and
--     that the review is the one they answered (created_at);
--   * checks every quoted span still reads the same in the note: a note
--     edited since the extraction is asked about again, never written
--     against different words;
--   * creates a person only when the user explicitly chose "Add <name>",
--     with the name the note itself gave;
--   * writes the answered items through write_extraction: the same path,
--     ownership checks and merge/supersede re-checks as any extraction
--     (a user-written or edited target is never touched);
--   * deletes the review and settles the capture (with
--     delete_after_extraction, the note's text goes here, its quotes stay on
--     each source).
--
-- Idempotent: a retry after a lost reply finds no review and answers
-- already_resolved; nothing is written twice. Service role only.
-- ============================================================================

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
    INSERT INTO public.people (user_id, display_name)
    VALUES (p_user_id, btrim(np ->> 'display_name'))
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

REVOKE ALL ON FUNCTION public.resolve_capture_review(uuid, uuid, timestamptz, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_capture_review(uuid, uuid, timestamptz, jsonb, jsonb) TO service_role;
