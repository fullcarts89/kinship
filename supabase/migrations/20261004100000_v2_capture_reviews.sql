-- ============================================================================
-- Kinship 2.0 — durable pending review (Checkpoint C, founder decision C-2)
-- ============================================================================
-- Items that wait for the user (which Sam? Sarah or Sarah's sister? a new
-- person?) are never memory_items until the user answers (C-2). But the
-- question itself must survive an app restart, and answering it must not
-- cost a second model run that could read the note differently.
--
-- capture_reviews holds, per capture, the pipeline's held items and its one
-- question, exactly as the extraction produced them:
--
--   * not memory: nothing reads it as relationship memory; it has no
--     provenance rows and no status of its own;
--   * written by write_extraction_with_review in the same transaction as the
--     saved items, so a capture is never needs_review without its question;
--   * readable by its owner under RLS; never written by the app;
--   * gone when the capture is deleted (tombstoned or hard-deleted) or its
--     text purged, when the user closes it, or 30 days after it was made;
--   * closing it settles the capture: status extracted, and the note's text
--     is purged if the user chose delete_after_extraction.
--
-- Turning an answer into memory (the held item, now with a known person)
-- goes through the gateway as a service-role write; that endpoint and the
-- client sheet are later work (see docs/phase1/checkpoint-c-ai-verification.md).
--
-- Also: moments and milestones keep the user's date words (date_hint), so a
-- date flagged ambiguous (C-4) can be shown as written and corrected.
-- ============================================================================

-- ─── 1. memory_detail_ok: date_hint on moments and milestones ──────────────

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
      allowed := ARRAY['category', 'attribute', 'value'];
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
      allowed := ARRAY['topic', 'followup_after_days', 'last_checked'];
      required := ARRAY['topic', 'followup_after_days'];
    WHEN 'moment' THEN
      allowed := ARRAY['date', 'date_hint', 'place', 'photo_ids'];
      required := ARRAY[]::text[];
    WHEN 'milestone' THEN
      allowed := ARRAY['date', 'date_hint', 'milestone_type', 'anniversary'];
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

  IF d ? 'date' AND d ? 'date_end' AND (d ->> 'date_end')::date < (d ->> 'date')::date THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;


-- ─── 2. capture_reviews ─────────────────────────────────────────────────────

CREATE TABLE public.capture_reviews (
  capture_id         uuid PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Prompt + model that produced it, as on the capture.
  extraction_version text NOT NULL
                       CHECK (extraction_version ~ '^[a-z_]{1,40}/v[0-9]{1,4}\+claude-[a-z0-9-]{1,50}$'),
  -- The pipeline's held items: the proposed interpretation, spans in code
  -- points into the capture's text, flags. Validated on write.
  items              jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'
                                           AND jsonb_array_length(items) BETWEEN 1 AND 8),
  -- The one question, generated by code from a template: {about, question, options}.
  clarification      jsonb CHECK (clarification IS NULL OR jsonb_typeof(clarification) = 'object'),
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT now() + interval '30 days',
  FOREIGN KEY (capture_id, user_id) REFERENCES public.captures (id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.capture_reviews IS
  'Kinship 2.0: extraction results waiting for the user''s answer (C-2). Not memory; cleared on answer, capture deletion, text purge or after 30 days.';

CREATE INDEX capture_reviews_user_idx ON public.capture_reviews (user_id);
CREATE INDEX capture_reviews_expiry_idx ON public.capture_reviews (expires_at);

ALTER TABLE public.capture_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read" ON public.capture_reviews
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND expires_at > now());

REVOKE ALL ON public.capture_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.capture_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capture_reviews TO service_role;

-- ─── 3. A deleted capture or purged text takes its review with it ──────────

CREATE OR REPLACE FUNCTION public.capture_reviews_follow_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.raw_text IS NULL THEN
    DELETE FROM public.capture_reviews WHERE capture_id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_reviews_follow_capture() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER captures_clear_review AFTER UPDATE OF deleted_at, raw_text ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.capture_reviews_follow_capture();

-- ─── 4. Settling a capture once nothing waits on the user ──────────────────
-- Shared by close_capture_review (the user answered or dismissed it) and
-- purge_expired_capture_reviews (nobody answered for 30 days).

CREATE OR REPLACE FUNCTION public.settle_capture_review(p_user_id uuid, p_capture_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cap record;
BEGIN
  DELETE FROM public.capture_reviews WHERE capture_id = p_capture_id AND user_id = p_user_id;
  SELECT id, retention, status INTO cap FROM public.captures
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND OR cap.status <> 'needs_review' THEN
    RETURN false;
  END IF;
  UPDATE public.captures SET status = 'extracted' WHERE id = p_capture_id;
  -- "Delete my note after it's understood": the excerpts on each saved
  -- item's sources remain for the Source view (C-6).
  IF cap.retention = 'delete_after_extraction' THEN
    UPDATE public.captures SET raw_text = NULL WHERE id = p_capture_id AND raw_text IS NOT NULL;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_capture_review(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The user answered the question (after the answer was written) or dismissed it.
CREATE OR REPLACE FUNCTION public.close_capture_review(p_capture_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'close_capture_review requires a signed-in user' USING ERRCODE = '42501';
  END IF;
  RETURN public.settle_capture_review(auth.uid(), p_capture_id);
END;
$$;
REVOKE ALL ON FUNCTION public.close_capture_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_capture_review(uuid) TO authenticated;

-- Unanswered for 30 days: the question goes, the note is settled as it is.
-- Service role only; scheduled (pg_cron) with the other purges.
CREATE OR REPLACE FUNCTION public.purge_expired_capture_reviews()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN SELECT capture_id, user_id FROM public.capture_reviews WHERE expires_at <= now() LOOP
    PERFORM public.settle_capture_review(r.user_id, r.capture_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_capture_reviews() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_capture_reviews() TO service_role;

-- ─── 5. write_extraction_with_review ────────────────────────────────────────
-- write_extraction plus the held items and question, in one transaction.
-- p_review: null, or {items: [...1–8], clarification: {about, question, options} | null}.
-- Each held item: {kind, person_id: uuid|null, new_person_name, subject_type,
-- related, statement, detail, certainty, sensitivity, confidence,
-- spans: [{start, end}], action, flags}. person_id, when set, must be the
-- user's; spans must lie inside the capture's text.

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
     OR jsonb_array_length(p_review -> 'items') NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'review items must be an array of 1 to 8' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.write_extraction_with_review(uuid, uuid, text, boolean, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_extraction_with_review(uuid, uuid, text, boolean, jsonb, jsonb) TO service_role;

-- ─── 6. Drop reason: contact_detail (stage 2) ───────────────────────────────
-- The pipeline now drops phone numbers and emails proposed as memory (D2);
-- the usage log counts the new reason like the others (still content-free).

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
                           'contact_detail')
          OR jsonb_typeof(e.value) <> 'number'
          OR NOT (e.value::text ~ '^[0-9]{1,3}$'))
$$;
REVOKE ALL ON FUNCTION public.ai_drop_reasons_ok(jsonb) FROM PUBLIC, anon, authenticated;
