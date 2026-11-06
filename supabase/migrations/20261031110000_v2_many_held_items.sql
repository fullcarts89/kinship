-- FD-30c, the other half (31 Oct 2026): held items. A long note judged whole can hold more than eight lines
-- for the user's answer (a person to ask about, a sensitive yes, a date): write_extraction_with_review and
-- the capture_reviews table both refused a review of more than eight and failed the whole note ("Couldn't
-- understand this yet"), exactly as write_extraction did before 20261031090000. Both limits are raised to
-- 200, the pipeline's own guard. Forward-only; the function is re-created unchanged but for the ceiling;
-- no data changes.

ALTER TABLE public.capture_reviews DROP CONSTRAINT IF EXISTS capture_reviews_items_check;
ALTER TABLE public.capture_reviews ADD CONSTRAINT capture_reviews_items_check
  CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 200);

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
  RETURN v_out;
END;
$$;
