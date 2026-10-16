-- ============================================================================
-- Kinship 2.0 — residence facets and multi-item closure: the schema
-- (Phase 4B step B2; brief docs/product/phase4-implementation-brief.md §1 A–G)
-- ============================================================================
-- Infrastructure only: nothing writes a facet or a closure until the gateway
-- sends them (B3, B4), and nothing displays one until B5. Forward-only and
-- additive: no stored row is updated, and no existing column changes meaning
-- (brief §2).
--
--   * memory_item_facets (§1 A): one derived reading per memory item and slot
--     ("residence" only in v1): the note's own words for the place, their
--     folded form, and the place readings found for them. Written only by the
--     server (write_extraction, write_facets), pulled by the phone, readable
--     by the owner and never writable by the app. Derived and rebuildable.
--   * memory_items.closes_ids (§1 B): the other current items a superseding
--     item closed. supersedes_id stays the one most specific item it
--     replaced. Server-written: not in the app's UPDATE grant, and the insert
--     policy requires it empty. (resolves_id shipped in B0, 20261009090000.)
--   * detail.transition (§1 C) gains `corrected` and `changed`. A missing
--     transition still means "replaced as current truth only" (CC-20).
--   * Triggers (§1 D): closing applies to every closes_ids item as
--     supersedes_id does; Undo and "Not this" restore each of them too, and
--     "still replaced by something live" also looks in other items'
--     closes_ids; a line's facet is tombstoned when its words, person,
--     subject, related person, kind, certainty, sensitivity or shared people
--     change, or when it is deleted or retracted. A superseded item keeps its
--     facet (history needs it).
--   * RPCs (§1 E): write_extraction (and so resolve_capture_review, which
--     hands its items to it) accepts per item `closes` and `facets`, and
--     re-checks them against the database as targets are re-checked today. A
--     doubtful id or facet is dropped (fail open), never an error.
--     write_facets is the gateway-only path for re-derivation and the
--     approved backfill. (reasons_refresh reopening shipped in B0.)
--   * residence_backfill_report and semantic_runs (§1 F): server-only, no
--     content (ids, buckets and versions).
--   * purge_tombstones also purges facet tombstones after 30 days, as every
--     mirrored table's are.
--
-- Not in the database: the place data (§6; supabase/functions/_shared/
-- semantic/places/, built by scripts/semantic/build-places.ts).
--
-- Reverse (a forward migration, if ever needed): DROP TABLE
-- memory_item_facets, residence_backfill_report, semantic_runs; DROP COLUMN
-- memory_items.closes_ids with its check, index and trigger; restore
-- memory_detail_ok from 20261006090000, memory_items_apply_supersede from
-- 20261002220000, write_extraction and memory_items_restore_superseded from
-- 20261009090000, purge_tombstones from 20261002230000 and the insert policy
-- from 20261009090000; drop the new helper functions.
-- ============================================================================

-- ─── C. detail.transition: corrected and changed ────────────────────────────
-- As 20261006090000; the only change is the transition list.

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
      -- progress, completed, cancelled (Gate E); corrected (a correction cue:
      -- never history) and changed (an explicit change cue or the user's
      -- "She moved": history-eligible), CC-20.
      WHEN 'transition' THEN v #>> '{}' IN ('progress', 'completed', 'cancelled', 'corrected', 'changed')
                             AND jsonb_typeof(v) = 'string'
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

-- ─── B. memory_items.closes_ids ──────────────────────────────────────────────

ALTER TABLE public.memory_items ADD COLUMN closes_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.memory_items ADD CONSTRAINT memory_items_closes_ok CHECK (
  cardinality(closes_ids) <= 8
  AND (cardinality(closes_ids) = 0 OR array_ndims(closes_ids) = 1)
  AND array_position(closes_ids, NULL) IS NULL
  AND NOT (id = ANY (closes_ids))
  AND (supersedes_id IS NULL OR NOT (supersedes_id = ANY (closes_ids))));
CREATE INDEX memory_items_closes_idx ON public.memory_items USING gin (closes_ids);

COMMENT ON COLUMN public.memory_items.closes_ids IS
  'Other current items this superseding item closed (multi-item closure, brief §1 B); supersedes_id is the most specific one. Server-written.';

-- The app never sets it: the column is not in the UPDATE grant (granted per
-- column since 20261002210100), and a row the app creates has none.
ALTER POLICY "Owner can create" ON public.memory_items
  WITH CHECK ((select auth.uid()) = user_id AND extraction_confidence IS NULL AND origin <> 'extracted'
              AND resolves_id IS NULL AND cardinality(closes_ids) = 0);

-- ─── A. memory_item_facets ───────────────────────────────────────────────────

-- A place reference in the place data: "<level>:<id>", e.g. country:US,
-- region:US.CA, city:5322737 (places-2026.10).
CREATE OR REPLACE FUNCTION public.place_ref_ok(p_ref text, p_levels text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_ref IS NOT NULL AND p_ref ~ '^[a-z]{1,10}:[A-Za-z0-9._-]{1,40}$'
     AND split_part(p_ref, ':', 1) = ANY (p_levels)
$$;

-- Readings while unresolved: up to five {ref, level, ancestors[]}, distinct,
-- each ref of its own level, ancestors regions or countries. A reading (and
-- the usual reading) is one of them, so the phone, which has no place data,
-- knows its level and what contains it.
CREATE OR REPLACE FUNCTION public.facet_readings_ok(p_candidates jsonb, p_place_ref text, p_usual_ref text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(p_candidates) = 'array' AND jsonb_array_length(p_candidates) <= 5
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(p_candidates) e
        WHERE jsonb_typeof(e) <> 'object'
           OR EXISTS (SELECT 1 FROM jsonb_object_keys(e) k WHERE k NOT IN ('ref', 'level', 'ancestors'))
           OR jsonb_typeof(e -> 'ref') IS DISTINCT FROM 'string'
           OR jsonb_typeof(e -> 'level') IS DISTINCT FROM 'string'
           OR (e ->> 'level') NOT IN ('city', 'region', 'country')
           OR NOT public.place_ref_ok(e ->> 'ref', ARRAY[e ->> 'level'])
           OR jsonb_typeof(e -> 'ancestors') IS DISTINCT FROM 'array'
           OR jsonb_array_length(e -> 'ancestors') > 4
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(e -> 'ancestors') a
                       WHERE jsonb_typeof(a) <> 'string'
                          OR NOT public.place_ref_ok(a #>> '{}', ARRAY['region', 'country'])))
     AND (SELECT count(DISTINCT e ->> 'ref') = count(*) FROM jsonb_array_elements(p_candidates) e)
     AND (p_place_ref IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_candidates) e WHERE e ->> 'ref' = p_place_ref))
     AND (p_usual_ref IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_candidates) e WHERE e ->> 'ref' = p_usual_ref))
$$;

CREATE TABLE public.memory_item_facets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- The observation it reads.
  memory_item_id   uuid NOT NULL,
  -- v1 has one slot. Another needs a founder decision plus fixtures.
  slot             text NOT NULL CHECK (slot IN ('residence')),
  -- The note's own characters for the place ("Alameda, CA"), never the model's.
  value_text       text NOT NULL CHECK (char_length(value_text) BETWEEN 1 AND 100 AND btrim(value_text) <> ''),
  -- Case-, accent- and punctuation-folded, for SAME.
  value_norm       text NOT NULL CHECK (char_length(value_norm) BETWEEN 1 AND 200 AND btrim(value_norm) <> ''),
  -- Set only when resolved: one reading in the data, a qualifier in the same
  -- note ("Alameda, CA"), or the user's answer.
  place_ref        text CHECK (place_ref IS NULL OR public.place_ref_ok(place_ref, ARRAY['city', 'region', 'country'])),
  -- Readings while unresolved. Empty = not in the place data.
  candidates       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- The name's usual reading, when one clearly dominates (brief §7).
  usual_ref        text CHECK (usual_ref IS NULL OR public.place_ref_ok(usual_ref, ARRAY['city', 'region', 'country'])),
  decided_by       text NOT NULL CHECK (decided_by IN ('rule', 'user')),
  rule_version     text NOT NULL CHECK (rule_version ~ '^[a-z_]{1,40}/v[0-9]{1,4}$'),
  dataset_version  text CHECK (dataset_version IS NULL OR dataset_version ~ '^[a-z_]{1,40}-[0-9]{4}\.[0-9]{2}$'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  version          integer NOT NULL DEFAULT 1,
  FOREIGN KEY (memory_item_id, user_id) REFERENCES public.memory_items (id, user_id) ON DELETE CASCADE,
  CONSTRAINT memory_item_facets_readings CHECK (public.facet_readings_ok(candidates, place_ref, usual_ref)),
  -- Only the user's answer to a CONFLICT question pins a place by the user.
  CONSTRAINT memory_item_facets_user_pins CHECK (decided_by <> 'user' OR place_ref IS NOT NULL)
);

COMMENT ON TABLE public.memory_item_facets IS
  'Kinship 2.0: a derived, rebuildable reading of one memory item (slot residence in v1). Server-written, pulled by the phone, owner read-only. Never shown as ontology, ids or dataset names.';

CREATE INDEX memory_item_facets_sync_idx ON public.memory_item_facets (user_id, updated_at, id);
CREATE INDEX memory_item_facets_item_idx ON public.memory_item_facets (memory_item_id);
CREATE UNIQUE INDEX memory_item_facets_live_slot ON public.memory_item_facets (memory_item_id, slot)
  WHERE deleted_at IS NULL;

CREATE TRIGGER memory_item_facets_row_guard BEFORE INSERT OR UPDATE ON public.memory_item_facets
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- Owner may read only. Nobody writes it directly, not even the service role:
-- write_extraction and write_facets re-check every facet first.
ALTER TABLE public.memory_item_facets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.memory_item_facets FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.memory_item_facets TO authenticated, service_role;
CREATE POLICY "Owner can read" ON public.memory_item_facets FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Which lines may carry a residence facet (brief §5): a stated, non-sensitive
-- fact about the person or their related person, not shared with anyone.
CREATE OR REPLACE FUNCTION public.residence_facet_eligible(
  p_kind text, p_subject_type text, p_certainty text, p_sensitivity text, p_with uuid[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_kind = 'fact' AND p_subject_type IN ('person', 'related') AND p_certainty = 'stated'
     AND p_sensitivity = 'none' AND cardinality(coalesce(p_with, '{}'::uuid[])) = 0
$$;

-- A facet as the gateway sends it: exactly the table's rules, checked without
-- casting, so a doubtful facet is dropped rather than failing the write.
-- {slot, value_text, value_norm, place_ref?, candidates, usual_ref?,
--  decided_by, rule_version, dataset_version?}
CREATE OR REPLACE FUNCTION public.facet_input_ok(f jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(f) = 'object'
     AND NOT EXISTS (SELECT 1 FROM jsonb_object_keys(f) k
                      WHERE k NOT IN ('slot', 'value_text', 'value_norm', 'place_ref', 'candidates', 'usual_ref',
                                      'decided_by', 'rule_version', 'dataset_version'))
     AND f ->> 'slot' = 'residence' AND jsonb_typeof(f -> 'slot') = 'string'
     AND jsonb_typeof(f -> 'value_text') = 'string'
     AND char_length(f ->> 'value_text') BETWEEN 1 AND 100 AND btrim(f ->> 'value_text') <> ''
     AND jsonb_typeof(f -> 'value_norm') = 'string'
     AND char_length(f ->> 'value_norm') BETWEEN 1 AND 200 AND btrim(f ->> 'value_norm') <> ''
     AND coalesce(jsonb_typeof(f -> 'place_ref'), 'null') IN ('string', 'null')
     AND coalesce(jsonb_typeof(f -> 'usual_ref'), 'null') IN ('string', 'null')
     AND (f ->> 'place_ref' IS NULL OR public.place_ref_ok(f ->> 'place_ref', ARRAY['city', 'region', 'country']))
     AND (f ->> 'usual_ref' IS NULL OR public.place_ref_ok(f ->> 'usual_ref', ARRAY['city', 'region', 'country']))
     AND public.facet_readings_ok(coalesce(f -> 'candidates', '[]'::jsonb), f ->> 'place_ref', f ->> 'usual_ref')
     AND jsonb_typeof(f -> 'decided_by') = 'string' AND f ->> 'decided_by' IN ('rule', 'user')
     AND (f ->> 'decided_by' <> 'user' OR f ->> 'place_ref' IS NOT NULL)
     AND jsonb_typeof(f -> 'rule_version') = 'string' AND f ->> 'rule_version' ~ '^[a-z_]{1,40}/v[0-9]{1,4}$'
     AND coalesce(jsonb_typeof(f -> 'dataset_version'), 'null') IN ('string', 'null')
     AND (f ->> 'dataset_version' IS NULL OR f ->> 'dataset_version' ~ '^[a-z_]{1,40}-[0-9]{4}\.[0-9]{2}$')
$$;

-- ─── D. Closing: every closes_ids item, as supersedes_id ─────────────────────

-- True when, from any of `p_from`, following what each item replaced
-- (supersedes_id) or closed (closes_ids) reaches `p_target`. Each item is
-- visited once.
CREATE OR REPLACE FUNCTION public.memory_items_closure_reaches(p_user uuid, p_from uuid[], p_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH RECURSIVE walk(id) AS (
    SELECT x FROM unnest(p_from) x WHERE x IS NOT NULL
    UNION
    SELECT nxt FROM walk w
      JOIN public.memory_items i ON i.id = w.id AND i.user_id = p_user
      CROSS JOIN LATERAL (SELECT i.supersedes_id UNION ALL SELECT unnest(i.closes_ids)) e(nxt)
     WHERE nxt IS NOT NULL
  )
  SELECT EXISTS (SELECT 1 FROM walk WHERE id = p_target)
$$;

-- As 20261002220000; the loop check now also follows closes_ids (identical
-- for every row written before this migration, which have none).
CREATE OR REPLACE FUNCTION public.memory_items_apply_supersede()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  old_person uuid;
BEGIN
  IF NEW.supersedes_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.supersedes_id IS NOT DISTINCT FROM OLD.supersedes_id) THEN
    RETURN NULL;
  END IF;
  IF NEW.status = 'superseded' THEN
    RAISE EXCEPTION 'a superseded item cannot supersede another' USING ERRCODE = '23514';
  END IF;
  SELECT person_id INTO old_person FROM public.memory_items WHERE id = NEW.supersedes_id;
  IF old_person IS DISTINCT FROM NEW.person_id THEN
    RAISE EXCEPTION 'an item can only supersede an item about the same person' USING ERRCODE = '23514';
  END IF;
  -- Walk from the item being superseded; reaching NEW is a loop.
  IF public.memory_items_closure_reaches(NEW.user_id, ARRAY[NEW.supersedes_id], NEW.id) THEN
    RAISE EXCEPTION 'superseding would form a loop' USING ERRCODE = '23514';
  END IF;
  UPDATE public.memory_items
     SET status = 'superseded',
         valid_to = CASE WHEN kind = 'fact' THEN coalesce(valid_to, current_date) ELSE valid_to END
   WHERE id = NEW.supersedes_id AND status IN ('active', 'resolved');
  RETURN NULL;
END;
$$;

-- The same for each item a new closer adds to closes_ids. Runs as the caller,
-- like the supersede trigger (only the server's writes can set closes_ids).
CREATE OR REPLACE FUNCTION public.memory_items_apply_closes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  added uuid[];
  found int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    added := NEW.closes_ids;
  ELSE
    added := ARRAY(SELECT x FROM unnest(NEW.closes_ids) x WHERE NOT (x = ANY (OLD.closes_ids)));
  END IF;
  IF cardinality(added) = 0 THEN
    RETURN NULL;
  END IF;
  IF NEW.status = 'superseded' THEN
    RAISE EXCEPTION 'a superseded item cannot close another' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO found FROM public.memory_items WHERE id = ANY (added) AND user_id = NEW.user_id;
  IF found <> (SELECT count(DISTINCT x) FROM unnest(added) x) THEN
    RAISE EXCEPTION 'a closed item is not this user''s' USING ERRCODE = '23503';
  END IF;
  -- Same person, subject and related person: never across people or subjects.
  IF EXISTS (SELECT 1 FROM public.memory_items
              WHERE id = ANY (added) AND user_id = NEW.user_id
                AND (person_id <> NEW.person_id OR subject_type <> NEW.subject_type
                     OR subject_related_id IS DISTINCT FROM NEW.subject_related_id)) THEN
    RAISE EXCEPTION 'an item can only close an item about the same person and subject' USING ERRCODE = '23514';
  END IF;
  IF public.memory_items_closure_reaches(NEW.user_id, added, NEW.id) THEN
    RAISE EXCEPTION 'closing would form a loop' USING ERRCODE = '23514';
  END IF;

  -- Live and current only: anything else is left as it is.
  UPDATE public.memory_items
     SET status = 'superseded',
         valid_to = CASE WHEN kind = 'fact' THEN coalesce(valid_to, current_date) ELSE valid_to END
   WHERE id = ANY (added) AND user_id = NEW.user_id AND status IN ('active', 'resolved') AND deleted_at IS NULL;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_apply_closes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER memory_items_apply_closes AFTER INSERT OR UPDATE OF closes_ids ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_apply_closes();

-- ─── D. Undo and "Not this": every item it closed comes back ─────────────────

-- As 20261009090000, plus: every closes_ids item comes back too, and "still
-- replaced by something live" also looks in other items' closes_ids.
CREATE OR REPLACE FUNCTION public.memory_items_restore_superseded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  start uuid;
  target uuid;
  cur record;
  prior jsonb;
  hops int;
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

  -- What it replaced, and every other item it closed (brief §10): for each,
  -- the nearest item down that chain that still exists.
  FOREACH start IN ARRAY array_remove(ARRAY[NEW.supersedes_id] || NEW.closes_ids, NULL) LOOP
    target := start;
    hops := 0;
    <<walk>>
    LOOP
      SELECT id, status, deleted_at, supersedes_id INTO cur
        FROM public.memory_items WHERE id = target AND user_id = NEW.user_id;
      IF NOT FOUND THEN
        target := NULL;
        EXIT walk;
      END IF;
      EXIT walk WHEN cur.deleted_at IS NULL AND cur.status <> 'retracted';
      hops := hops + 1;
      IF cur.supersedes_id IS NULL OR hops > 50 THEN
        target := NULL;
        EXIT walk;
      END IF;
      target := cur.supersedes_id;
    END LOOP;

    CONTINUE WHEN target IS NULL;
    CONTINUE WHEN cur.status <> 'superseded';
    -- Still replaced by something else that is live.
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.memory_items o
                           WHERE o.user_id = NEW.user_id AND o.id <> NEW.id
                             AND (o.supersedes_id = target OR o.closes_ids @> ARRAY[target])
                             AND o.deleted_at IS NULL AND o.status <> 'retracted');

    SELECT h.snapshot INTO prior FROM public.memory_item_history h
     WHERE h.memory_item_id = target AND h.user_id = NEW.user_id
       AND h.snapshot ->> 'status' IN ('active', 'resolved')
     ORDER BY h.item_version DESC, h.created_at DESC
     LIMIT 1;

    UPDATE public.memory_items
       SET status = coalesce(prior ->> 'status', 'active'),
           valid_to = CASE WHEN prior IS NULL THEN valid_to ELSE (prior ->> 'valid_to')::date END
     WHERE id = target AND user_id = NEW.user_id AND status = 'superseded' AND deleted_at IS NULL;
    prior := NULL;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_restore_superseded() FROM PUBLIC, anon, authenticated;

-- ─── D. A changed line loses its facet at once ───────────────────────────────
-- The gateway derives it again when the app reports the edit (brief §5); in
-- between the line has no facet and shows as its own line (fail open).
-- Supersession leaves the facet alone: history needs it. SECURITY DEFINER:
-- the app's own edit tombstones a row it may not write.

CREATE OR REPLACE FUNCTION public.memory_items_facet_tombstone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
     OR (OLD.status <> 'retracted' AND NEW.status = 'retracted')
     OR (NEW.statement, NEW.person_id, NEW.subject_type, NEW.subject_related_id, NEW.kind,
         NEW.certainty, NEW.sensitivity, NEW.with_person_ids)
        IS DISTINCT FROM
        (OLD.statement, OLD.person_id, OLD.subject_type, OLD.subject_related_id, OLD.kind,
         OLD.certainty, OLD.sensitivity, OLD.with_person_ids) THEN
    UPDATE public.memory_item_facets SET deleted_at = coalesce(NEW.deleted_at, now())
     WHERE memory_item_id = NEW.id AND user_id = NEW.user_id AND deleted_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_facet_tombstone() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER memory_items_facet_tombstone
  AFTER UPDATE OF statement, person_id, subject_type, subject_related_id, kind, certainty, sensitivity,
                  with_person_ids, deleted_at, status ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_facet_tombstone();

-- ─── E. write_extraction: closes and facets, re-checked ──────────────────────
-- As 20261009090000, plus, per item:
--   closes: [uuid, …]  other current items this one closes (brief §8.2). Each
--     is re-checked as a supersede target is: the user's, live, not edited or
--     written by the user, same person, subject and related person, active or
--     resolved, not the supersede target itself. Only for an item that is
--     written as new (a "new" or "supersede"); at most 8, in the order sent.
--   facets: [{slot, value_text, …}]  the item's residence reading (§5, §7).
--     Kept only for an item written as new that may carry one (§5), when its
--     words are the note's own characters inside one of the item's spans and
--     it is well formed. One per slot.
-- Whatever is doubtful is dropped (fail open); none of it is an error. The
-- result says, per item, which closures and how many facets were kept (only
-- when the item sent any).

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
          OR t.user_state IN ('edited', 'user_authored')
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

-- ─── E. write_facets: re-derivation and the approved backfill ────────────────
-- Gateway only (service role). p_items: up to 100 of
--   {memory_item_id, version, facets: [{slot, value_text, …}]}
-- `version` is the item's version the facet was derived from; a line changed
-- since is left alone (the next Tell about that person derives it again).
-- Each facet is re-checked: the user's live item, one that may carry it
-- (§5), its words in the user's own words for the line (a live source's
-- quote, or the line itself when the user wrote or edited it), well formed.
-- A live facet in the slot is replaced in place, except that a reading the
-- user chose is never replaced by a rule's. Model-free: no AI consent needed
-- (no processor is involved). Returns, per item, written / unchanged / dropped
-- (content-free).

CREATE OR REPLACE FUNCTION public.write_facets(p_user_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  it jsonb;
  f jsonb;
  m record;
  cur record;
  v_id uuid;
  v_slots text[];
  v_result text;
  v_out jsonb := '[]'::jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user is required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'items must be an array of at most 100' USING ERRCODE = '22023';
  END IF;

  FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_result := 'dropped';
    v_id := NULL;
    IF jsonb_typeof(it) = 'object'
       AND jsonb_typeof(it -> 'memory_item_id') = 'string'
       AND (it ->> 'memory_item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_id := lower(it ->> 'memory_item_id')::uuid;
    END IF;

    IF v_id IS NOT NULL AND jsonb_typeof(it -> 'version') = 'number' AND (it ->> 'version') ~ '^[0-9]{1,9}$'
       AND jsonb_typeof(it -> 'facets') = 'array' THEN
      SELECT id, version, kind, subject_type, certainty, sensitivity, with_person_ids, statement, user_state INTO m
        FROM public.memory_items
       WHERE id = v_id AND user_id = p_user_id AND deleted_at IS NULL AND status <> 'retracted'
       FOR UPDATE;
      IF FOUND AND m.version = (it ->> 'version')::int
         AND public.residence_facet_eligible(m.kind, m.subject_type, m.certainty, m.sensitivity, m.with_person_ids) THEN
        v_slots := '{}'::text[];
        FOR f IN SELECT value FROM jsonb_array_elements(it -> 'facets') LOOP
          CONTINUE WHEN NOT public.facet_input_ok(f) OR (f ->> 'slot') = ANY (v_slots);
          -- The user's own words for this line.
          CONTINUE WHEN NOT (
            EXISTS (SELECT 1 FROM public.memory_item_sources s
                     WHERE s.memory_item_id = m.id AND s.user_id = p_user_id AND s.deleted_at IS NULL
                       AND position(f ->> 'value_text' IN coalesce(s.quote, '')) > 0)
            OR (m.user_state IN ('edited', 'user_authored') AND position(f ->> 'value_text' IN m.statement) > 0));
          v_slots := v_slots || (f ->> 'slot');

          SELECT id, decided_by, value_text, value_norm, place_ref, candidates, usual_ref, rule_version, dataset_version
            INTO cur FROM public.memory_item_facets
           WHERE memory_item_id = m.id AND user_id = p_user_id AND slot = f ->> 'slot' AND deleted_at IS NULL
           FOR UPDATE;
          IF NOT FOUND THEN
            INSERT INTO public.memory_item_facets (
              user_id, memory_item_id, slot, value_text, value_norm, place_ref, candidates, usual_ref,
              decided_by, rule_version, dataset_version)
            VALUES (
              p_user_id, m.id, f ->> 'slot', f ->> 'value_text', f ->> 'value_norm', f ->> 'place_ref',
              coalesce(f -> 'candidates', '[]'::jsonb), f ->> 'usual_ref', f ->> 'decided_by',
              f ->> 'rule_version', f ->> 'dataset_version');
            v_result := 'written';
          ELSIF cur.decided_by = 'user' AND f ->> 'decided_by' = 'rule' THEN
            -- The user's answer wins; re-derivation never overrides it.
            v_result := CASE WHEN v_result = 'written' THEN v_result ELSE 'unchanged' END;
          ELSIF (cur.value_text, cur.value_norm, cur.place_ref, cur.candidates, cur.usual_ref, cur.decided_by,
                 cur.rule_version, cur.dataset_version)
                IS NOT DISTINCT FROM
                (f ->> 'value_text', f ->> 'value_norm', f ->> 'place_ref', coalesce(f -> 'candidates', '[]'::jsonb),
                 f ->> 'usual_ref', f ->> 'decided_by', f ->> 'rule_version', f ->> 'dataset_version') THEN
            v_result := CASE WHEN v_result = 'written' THEN v_result ELSE 'unchanged' END;
          ELSE
            UPDATE public.memory_item_facets
               SET value_text = f ->> 'value_text', value_norm = f ->> 'value_norm', place_ref = f ->> 'place_ref',
                   candidates = coalesce(f -> 'candidates', '[]'::jsonb), usual_ref = f ->> 'usual_ref',
                   decided_by = f ->> 'decided_by', rule_version = f ->> 'rule_version',
                   dataset_version = f ->> 'dataset_version'
             WHERE id = cur.id;
            v_result := 'written';
          END IF;
        END LOOP;
      END IF;
    END IF;

    v_out := v_out || jsonb_build_object('id', v_id, 'result', v_result);
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.write_facets(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_facets(uuid, jsonb) TO service_role;

-- ─── F. Server-only tables (no content) ──────────────────────────────────────

-- The report-only dry run (brief §14, B6): an item id and a bucket, no words.
CREATE TABLE public.residence_backfill_report (
  memory_item_id  uuid NOT NULL REFERENCES public.memory_items (id) ON DELETE CASCADE,
  bucket          text NOT NULL CHECK (bucket IN (
                    'eligible', 'resolved', 'candidates', 'unknown_place', 'would_compose', 'contradiction',
                    'false_supersession_suspect', 'history_unknown', 'not_residence')),
  rule_version    text NOT NULL CHECK (rule_version ~ '^[a-z_]{1,40}/v[0-9]{1,4}$'),
  dataset_version text NOT NULL CHECK (dataset_version ~ '^[a-z_]{1,40}-[0-9]{4}\.[0-9]{2}$'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_item_id, bucket, rule_version, dataset_version)
);
COMMENT ON TABLE public.residence_backfill_report IS
  'The residence dry run (brief §14): an item id and a bucket per reading, never content. Service role only.';

-- Which account a semantic task has run over, in which mode, at which versions.
CREATE TABLE public.semantic_runs (
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  mode            text NOT NULL CHECK (mode IN ('report', 'apply')),
  rule_version    text NOT NULL CHECK (rule_version ~ '^[a-z_]{1,40}/v[0-9]{1,4}$'),
  dataset_version text NOT NULL CHECK (dataset_version ~ '^[a-z_]{1,40}-[0-9]{4}\.[0-9]{2}$'),
  ran_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mode, rule_version, dataset_version)
);
COMMENT ON TABLE public.semantic_runs IS
  'When a semantic task (report or apply) last ran over an account, at which rule and dataset versions. No content. Service role only.';

ALTER TABLE public.residence_backfill_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.residence_backfill_report FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.semantic_runs FROM PUBLIC, anon, authenticated;

-- ─── purge_tombstones: facet tombstones too ──────────────────────────────────
-- As 20261002230000, plus memory_item_facets (before memory_items).

CREATE OR REPLACE FUNCTION public.purge_tombstones(p_older_than interval DEFAULT interval '30 days')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t text;
  n bigint;
  counts jsonb := '{}'::jsonb;
  cutoff timestamptz := now() - p_older_than;
BEGIN
  IF p_older_than < interval '30 days' THEN
    RAISE EXCEPTION 'tombstones are kept for at least 30 days' USING ERRCODE = '22023';
  END IF;
  FOREACH t IN ARRAY ARRAY['memory_item_facets', 'memory_item_sources', 'contact_events', 'reasons', 'memory_items',
                           'person_identities', 'related_people', 'captures', 'devices', 'people'] LOOP
    EXECUTE format('DELETE FROM public.%I WHERE deleted_at < $1', t) USING cutoff;
    GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object(t, n);
  END LOOP;
  DELETE FROM public.memory_item_history WHERE created_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN counts || jsonb_build_object('memory_item_history', n);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_tombstones(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_tombstones(interval) TO service_role;
