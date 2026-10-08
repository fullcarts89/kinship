-- ============================================================================
-- Kinship 2.0 — per-line person mentions (Gate 0 remediation, 8 Oct 2026)
-- ============================================================================
-- Founder native findings I12 (a rename left the old name in every line) and
-- I13 (choosing the right person kept the wrong name in the words); founder
-- decision 1b: the user's own words stay until the person is explicitly
-- renamed. Forward-only and additive: one new column with its checks, the two
-- server writes that fill it, and a conservative one-time backfill. No
-- statement, note or source is changed by this migration.
--
--   * memory_items.person_mentions: which words in a line name which of the
--     people it is about, and the name that person went by when the words
--     were recorded as theirs:
--       [{"person_id": uuid, "text": "Wifey", "name": "Wifey Liu" | null}]
--     The app shows a person's current name in place of exactly those words
--     when that name differs from "name" (an explicit rename since), or when
--     "name" is null (the words are an earlier name of theirs). Otherwise the
--     user's words stay as written. Source always shows the note.
--   * write_extraction and resolve_capture_review carry it; a merge adds the
--     incoming people's words to the memory merged into.
--   * backfill_person_mentions() fills lines that have none, by rules that
--     never guess (see the function). A line about someone whose start names
--     a person it could not safely record is listed, with a reason and no
--     content, in person_mentions_backfill_report (service role only).
--
-- Reverse: DROP COLUMN memory_items.person_mentions; DROP TABLE
-- person_mentions_backfill_report; DROP the pm_* and person_mentions_*
-- functions and the guard trigger; restore write_extraction and
-- resolve_capture_review from 20261006090000.
-- ============================================================================

-- ─── The column ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.person_mentions_ok(m jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(m) = 'array' AND jsonb_array_length(m) <= 8 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(m) e
     WHERE jsonb_typeof(e) <> 'object'
        OR EXISTS (SELECT 1 FROM jsonb_object_keys(e) k WHERE k NOT IN ('person_id', 'text', 'name'))
        OR jsonb_typeof(e -> 'person_id') IS DISTINCT FROM 'string'
        OR (e ->> 'person_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        OR jsonb_typeof(e -> 'text') IS DISTINCT FROM 'string'
        OR char_length(btrim(e ->> 'text')) NOT BETWEEN 1 AND 100
        OR NOT (e ? 'name')
        OR jsonb_typeof(e -> 'name') NOT IN ('string', 'null')
        OR coalesce(char_length(e ->> 'name'), 0) > 100)
$$;

ALTER TABLE public.memory_items ADD COLUMN person_mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_person_mentions
  CHECK (public.person_mentions_ok(person_mentions));

-- Every person a line's words name is one of the user's own people.
CREATE OR REPLACE FUNCTION public.memory_items_mentions_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- (A malformed entry is the check constraint's to refuse.)
  IF jsonb_typeof(NEW.person_mentions) = 'array' AND jsonb_array_length(NEW.person_mentions) > 0 AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(NEW.person_mentions) e
        WHERE jsonb_typeof(e) = 'object'
          AND coalesce(e ->> 'person_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND NOT EXISTS (SELECT 1 FROM public.people p
                           WHERE p.id::text = lower(e ->> 'person_id') AND p.user_id = NEW.user_id)) THEN
    RAISE EXCEPTION 'a mentioned person is not this user''s' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.memory_items_mentions_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER memory_items_mentions_guard BEFORE INSERT OR UPDATE OF person_mentions ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_mentions_guard();

-- The app keeps them with the user's own corrections (a person moved, words edited).
GRANT UPDATE (person_mentions) ON public.memory_items TO authenticated;

-- The mentions `p_add` brings, for people `p_have` has none for and whose
-- words are in `p_statement`; at most eight in all.
CREATE OR REPLACE FUNCTION public.person_mentions_merge(p_have jsonb, p_add jsonb, p_statement text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
    FROM (
      SELECT e, ord FROM jsonb_array_elements(coalesce(p_have, '[]'::jsonb)) WITH ORDINALITY h(e, ord)
      UNION ALL
      SELECT a.e, 100 + a.ord FROM jsonb_array_elements(coalesce(p_add, '[]'::jsonb)) WITH ORDINALITY a(e, ord)
       WHERE position(a.e ->> 'text' IN coalesce(p_statement, '')) > 0
         AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p_have, '[]'::jsonb)) x
                          WHERE x ->> 'person_id' = a.e ->> 'person_id')
      ORDER BY 2
      LIMIT 8
    ) s
$$;

-- An item's mentions, as sent by the gateway: only well-formed ones, only for
-- the people the item is about, at most eight. Never fails the write.
CREATE OR REPLACE FUNCTION public.person_mentions_clean(p_mentions jsonb, p_person uuid, p_with uuid[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'person_id', lower(e ->> 'person_id'),
           'text', btrim(e ->> 'text'),
           'name', CASE WHEN jsonb_typeof(e -> 'name') = 'string' AND char_length(e ->> 'name') <= 100 THEN e -> 'name' ELSE 'null'::jsonb END)), '[]'::jsonb)
    FROM (
      SELECT e FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_mentions) = 'array' THEN p_mentions ELSE '[]'::jsonb END) e
       WHERE jsonb_typeof(e) = 'object'
         AND jsonb_typeof(e -> 'person_id') = 'string'
         AND jsonb_typeof(e -> 'text') = 'string'
         AND char_length(btrim(e ->> 'text')) BETWEEN 1 AND 100
         AND lower(e ->> 'person_id') IN (SELECT x::text FROM unnest(array_prepend(p_person, coalesce(p_with, '{}'::uuid[]))) x)
       LIMIT 8
    ) s
$$;

-- ─── write_extraction: each item's mentions ─────────────────────────────────
-- As 20261006090000, plus: each item may carry person_mentions (for the people
-- it is about); a merge adds the incoming people's words to the memory merged
-- into when its words name them too.

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
        person_mentions)
      VALUES (
        p_user_id, it ->> 'kind', v_person, it ->> 'subject_type', v_related, it ->> 'statement',
        coalesce(it -> 'detail', '{}'::jsonb), it ->> 'certainty', (it ->> 'confidence')::numeric(3, 2),
        it ->> 'sensitivity', 'active', 'unreviewed',
        CASE WHEN v_action = 'supersede' THEN v_target END, 'extracted', v_with,
        v_mentions)
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

-- ─── resolve_capture_review: words for someone added in the answer ───────────
-- As 20261006090000, plus: a mention of someone the answer adds ("Add Zed")
-- names them by their new id.

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

  -- The same write as any extraction; nothing waits on the user afterwards.
  UPDATE public.captures SET status = 'processing' WHERE id = p_capture_id;
  v_out := public.write_extraction(p_user_id, p_capture_id, rev.extraction_version, false, v_items);
  DELETE FROM public.capture_reviews WHERE capture_id = p_capture_id;
  RETURN jsonb_build_object('status', 'resolved', 'items', v_out, 'people', v_map);
END;
$$;

-- ─── Backfill: lines told before this migration ──────────────────────────────

-- Regular-expression text for a name: escaped, any run of spaces matching any.
CREATE OR REPLACE FUNCTION public.pm_re(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(regexp_replace(btrim(t), '([^[:alnum:][:space:]])', '\\\1', 'g'), '\s+', '\\s+', 'g')
$$;

-- Every capitalised whole-word use of `t` in `s`, as written (a possessive after it is fine).
CREATE OR REPLACE FUNCTION public.pm_uses(s text, t text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(m[2]), '{}'::text[])
    FROM regexp_matches(coalesce(s, ''), '(^|[^[:alpha:]''’-])(' || public.pm_re(t) || ')(?![[:alpha:]]|-[[:alpha:]])', 'gi') m
   WHERE coalesce(btrim(t), '') <> '' AND m[2] ~ '^[[:upper:]]'
$$;

-- Words that can name a person: capitalised; never a pronoun, "you", a family
-- word ("Mom"), a day or a month.
CREATE OR REPLACE FUNCTION public.pm_name_like(t text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(btrim(t), '') ~ '^[[:upper:]]'
     AND lower(split_part(btrim(t), ' ', 1)) <> ALL (ARRAY[
       'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs', 'himself', 'herself',
       'themselves', 'you', 'your', 'yours', 'i', 'i''m', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'it', 'its',
       'the', 'a', 'an', 'this', 'that', 'these', 'those', 'there', 'here', 'someone', 'somebody', 'everyone',
       'everybody', 'nobody', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
       'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
       'november', 'december', 'today', 'tomorrow', 'yesterday', 'tonight'])
     AND lower(btrim(t)) <> ALL (ARRAY[
       'mom', 'mother', 'mum', 'mama', 'mommy', 'dad', 'father', 'papa', 'daddy', 'parents', 'sister', 'brother',
       'sibling', 'son', 'daughter', 'kid', 'kids', 'child', 'children', 'baby', 'wife', 'husband', 'partner',
       'spouse', 'girlfriend', 'boyfriend', 'fiance', 'fiancé', 'fiancee', 'fiancée', 'grandma', 'grandmother',
       'grandpa', 'grandfather', 'grandson', 'granddaughter', 'aunt', 'uncle', 'cousin', 'niece', 'nephew',
       'stepmom', 'stepdad', 'stepson', 'stepdaughter', 'in-law', 'mother-in-law', 'father-in-law',
       'sister-in-law', 'brother-in-law', 'roommate', 'boss', 'coworker', 'colleague', 'neighbor', 'neighbour',
       'friend', 'best friend', 'ex', 'ex-wife', 'ex-husband'])
$$;

-- The names someone goes by now: display and full name, and their first words.
CREATE OR REPLACE FUNCTION public.pm_forms(p_display text, p_full text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT f) FILTER (WHERE coalesce(f, '') <> ''), '{}'::text[])
    FROM unnest(ARRAY[btrim(p_display), btrim(p_full), split_part(btrim(p_display), ' ', 1), split_part(btrim(coalesce(p_full, '')), ' ', 1)]) f
$$;

-- Where `s` names someone going by `forms`, as written there: longest names
-- first, a shorter one counted only outside a longer one already found ("Loo"
-- inside "Loo Loo" is that same name). NULL when none is written, or when
-- they are named in two separate places (which words would be theirs is then
-- a guess).
CREATE OR REPLACE FUNCTION public.pm_find(s text, forms text[])
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  f text;
  u text[];
  best text;
  found int := 0;
  rest text := coalesce(s, '');
BEGIN
  FOR f IN SELECT y FROM (SELECT DISTINCT btrim(x) AS y FROM unnest(forms) x WHERE coalesce(btrim(x), '') <> '') z
            WHERE public.pm_name_like(y) ORDER BY char_length(y) DESC, y LOOP
    u := public.pm_uses(rest, f);
    CONTINUE WHEN cardinality(u) = 0;
    found := found + cardinality(u);
    best := coalesce(best, u[1]);
    -- Set this name aside so a shorter form inside it isn't counted again.
    rest := regexp_replace(rest, '(^|[^[:alpha:]''’-])(' || public.pm_re(f) || ')(?![[:alpha:]]|-[[:alpha:]])', '\1#', 'gi');
  END LOOP;
  IF found <> 1 THEN
    RETURN NULL;
  END IF;
  RETURN best;
END;
$$;

-- The name a statement opens with ("Wifey got promoted" → Wifey; "Ben's new
-- job" → Ben), when it reads as a name.
CREATE OR REPLACE FUNCTION public.pm_lead(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN public.pm_name_like(l) THEN l END
    FROM (SELECT regexp_replace(substring(btrim(coalesce(s, '')) from '^([[:upper:]][[:alpha:]''’-]*(?:\s+[[:upper:]][[:alpha:]''’-]*)*)'),
                                '[''’]s$', '') AS l) x
$$;

CREATE TABLE public.person_mentions_backfill_report (
  memory_item_id uuid PRIMARY KEY REFERENCES public.memory_items (id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reason         text NOT NULL CHECK (reason IN (
                   'names_someone_else', 'names_someone_close', 'repeated_in_line', 'shared_line',
                   'common_word', 'used_once', 'used_for_others')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.person_mentions_backfill_report IS
  'Lines the person-mention backfill (20261008090000) could not fill without guessing: an id and a reason, never content. Service role only.';
ALTER TABLE public.person_mentions_backfill_report ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.person_mentions_backfill_report FROM PUBLIC, anon, authenticated;

-- Fills person_mentions for lines that have none, never guessing:
--
--   1. The names a line's people go by now (display name, full name, their
--      first words) or went by (kept at a rename, people.nicknames), anywhere
--      in its words, when written exactly once and never also a name of
--      someone else the line is about. A current name is recorded under the
--      current name (the words stay); a kept earlier name is recorded as
--      earlier (the line reads with the name they go by now).
--   2. A name the line opens with that the person's record has lost (renamed
--      before renames kept earlier names: "Wifey got promoted" on someone now
--      called "Loo Loo"), only when all of these hold: the person has been
--      renamed (has kept earlier names); the line is about them alone; the
--      words are not a pronoun, "you", a family word, a day or a month; they
--      are nobody's name in People and no relative's or pet's name; they are
--      written once in the line; they open at least two of that person's own
--      lines and no one else's (edited lines don't count); and the user never
--      writes them in lowercase in any line (so they are a name, not a word
--      like "Dinner"). Recorded as an earlier name.
--
-- A line about someone whose opening name could not be recorded this way is
-- listed in person_mentions_backfill_report with why. Nothing else changes:
-- not the words, not the note, not the sources. Safe to run again: it only
-- fills lines that have no mentions.
CREATE OR REPLACE FUNCTION public.backfill_person_mentions()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  r record;
  p record;
  o record;
  v_mentions jsonb;
  v_text text;
  v_lead text;
  v_lead_text text[];
  v_reason text;
  v_owner uuid;
  v_recorded int := 0;
  v_reported int := 0;
BEGIN
  -- Who each opening name belongs to: the person whose own unedited lines,
  -- about them alone, open with it.
  IF to_regclass('pg_temp.pm_leads') IS NOT NULL THEN
    DROP TABLE pg_temp.pm_leads;
  END IF;
  CREATE TEMP TABLE pm_leads AS
    SELECT m.user_id, m.person_id, lower(public.pm_lead(m.statement)) AS lead, count(*)::int AS n
      FROM public.memory_items m
     WHERE m.deleted_at IS NULL AND m.subject_type = 'person' AND cardinality(m.with_person_ids) = 0
       AND m.user_state <> 'edited' AND public.pm_lead(m.statement) IS NOT NULL
     GROUP BY 1, 2, 3;

  FOR r IN SELECT m.id, m.user_id, m.person_id, m.with_person_ids, m.subject_type, m.statement
             FROM public.memory_items m
            WHERE m.deleted_at IS NULL AND m.person_mentions = '[]'::jsonb
            ORDER BY m.user_id, m.created_at, m.id
  LOOP
    v_mentions := '[]'::jsonb;
    v_reason := NULL;

    -- 1. Names they go by now, or went by (kept at a rename).
    FOR p IN SELECT pe.id, pe.display_name, pe.full_name, coalesce(pe.nicknames, '{}'::text[]) AS nicknames
               FROM public.people pe
              WHERE pe.user_id = r.user_id AND pe.deleted_at IS NULL
                AND pe.id = ANY (array_prepend(r.person_id, r.with_person_ids))
              ORDER BY (pe.id = r.person_id) DESC, pe.id
    LOOP
      v_text := public.pm_find(r.statement, public.pm_forms(p.display_name, p.full_name) || p.nicknames);
      CONTINUE WHEN v_text IS NULL;
      -- Never words that are also a name of someone else this line is about.
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.people x
         WHERE x.user_id = r.user_id AND x.deleted_at IS NULL AND x.id <> p.id
           AND x.id = ANY (array_prepend(r.person_id, r.with_person_ids))
           AND lower(v_text) IN (SELECT lower(f) FROM unnest(public.pm_forms(x.display_name, x.full_name) || coalesce(x.nicknames, '{}'::text[])) f));
      v_mentions := v_mentions || jsonb_build_array(jsonb_build_object(
        'person_id', p.id,
        'text', v_text,
        'name', CASE WHEN lower(v_text) IN (SELECT lower(f) FROM unnest(public.pm_forms(p.display_name, p.full_name)) f)
                     THEN to_jsonb(btrim(p.display_name)) ELSE 'null'::jsonb END));
    END LOOP;

    -- 2. An opening name their record has lost.
    IF r.subject_type = 'person' AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(v_mentions) e WHERE e ->> 'person_id' = r.person_id::text) THEN
      v_lead := public.pm_lead(r.statement);
      SELECT pe.id, pe.display_name, pe.full_name, coalesce(pe.nicknames, '{}'::text[]) AS nicknames INTO o
        FROM public.people pe WHERE pe.id = r.person_id AND pe.user_id = r.user_id;
      IF v_lead IS NOT NULL AND FOUND THEN
        v_lead_text := public.pm_uses(r.statement, v_lead);
        -- Whose lines open with it: the one person with two or more such
        -- lines of their own (unedited, about them alone) and nobody else.
        v_owner := NULL;
        SELECT l.person_id INTO v_owner FROM pg_temp.pm_leads l
         WHERE l.user_id = r.user_id AND l.lead = lower(v_lead) AND l.n >= 2
           AND NOT EXISTS (SELECT 1 FROM pg_temp.pm_leads k
                            WHERE k.user_id = l.user_id AND k.lead = l.lead AND k.person_id <> l.person_id);
        IF EXISTS (SELECT 1 FROM public.people x
                    WHERE x.user_id = r.user_id AND x.deleted_at IS NULL
                      AND lower(v_lead) IN (SELECT lower(f) FROM unnest(public.pm_forms(x.display_name, x.full_name) || coalesce(x.nicknames, '{}'::text[])) f)) THEN
          -- Someone's name (theirs written twice, or another person's: never recorded).
          v_reason := CASE WHEN lower(v_lead) IN (SELECT lower(f) FROM unnest(public.pm_forms(o.display_name, o.full_name) || o.nicknames) f)
                           THEN 'repeated_in_line' ELSE 'names_someone_else' END;
        ELSIF v_owner IS NOT NULL AND v_owner <> r.person_id THEN
          -- The name other lines use for someone else (a line moved before I13).
          v_reason := 'used_for_others';
        ELSIF cardinality(o.nicknames) = 0 THEN
          -- Never renamed: their own words stay as written either way.
          v_reason := NULL;
        ELSIF EXISTS (SELECT 1 FROM public.related_people rp
                       WHERE rp.user_id = r.user_id AND rp.deleted_at IS NULL AND lower(btrim(rp.name)) = lower(v_lead)) THEN
          v_reason := 'names_someone_close';
        ELSIF cardinality(r.with_person_ids) > 0 THEN
          v_reason := 'shared_line';
        ELSIF cardinality(v_lead_text) <> 1 THEN
          v_reason := 'repeated_in_line';
        ELSIF EXISTS (SELECT 1 FROM public.memory_items w
                       WHERE w.user_id = r.user_id AND w.deleted_at IS NULL
                         AND w.statement ~ ('(^|[^[:alpha:]''’-])' || public.pm_re(lower(v_lead)) || '(?![[:alpha:]]|-[[:alpha:]])')) THEN
          -- Written in lowercase somewhere ("dinner"): a word, not a name.
          v_reason := 'common_word';
        ELSIF v_owner = r.person_id THEN
          v_mentions := v_mentions || jsonb_build_array(jsonb_build_object(
            'person_id', r.person_id, 'text', v_lead_text[1], 'name', 'null'::jsonb));
        ELSIF EXISTS (SELECT 1 FROM pg_temp.pm_leads k
                       WHERE k.user_id = r.user_id AND k.lead = lower(v_lead) AND k.person_id <> r.person_id) THEN
          v_reason := 'used_for_others';
        ELSE
          v_reason := 'used_once';
        END IF;
      END IF;
      IF v_reason IS NOT NULL THEN
        INSERT INTO public.person_mentions_backfill_report (memory_item_id, user_id, reason)
        VALUES (r.id, r.user_id, v_reason)
        ON CONFLICT (memory_item_id) DO UPDATE SET reason = excluded.reason, created_at = now();
        v_reported := v_reported + 1;
      END IF;
    END IF;

    IF jsonb_array_length(v_mentions) > 0 THEN
      UPDATE public.memory_items SET person_mentions = v_mentions WHERE id = r.id;
      DELETE FROM public.person_mentions_backfill_report WHERE memory_item_id = r.id AND v_reason IS NULL;
      v_recorded := v_recorded + 1;
    END IF;
  END LOOP;

  DROP TABLE pg_temp.pm_leads;
  RAISE NOTICE 'person mentions backfill: % lines filled, % lines listed in person_mentions_backfill_report', v_recorded, v_reported;
  RETURN jsonb_build_object('filled', v_recorded, 'reported', v_reported);
END;
$$;
REVOKE ALL ON FUNCTION public.backfill_person_mentions() FROM PUBLIC, anon, authenticated;

SELECT public.backfill_person_mentions();
