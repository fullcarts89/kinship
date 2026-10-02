-- ============================================================================
-- Kinship 2.0 — Checkpoint A review amendments (founder, 2 Oct 2026)
-- ============================================================================
-- Forward-only: the first 2.0 migrations are already in production and are
-- not edited. There is no 2.0 data yet, so the renames are free.
--
--  1. connections → contact_events: confirmed instances of human contact, not
--     relationships between entities (keeps the name clear of any future
--     Landscape / group / social-graph concept).
--  2. Event detail `goal` → `event_goal` (`goal` would be overloaded once
--     user-directed Intentions exist).
--  3. Strict optimistic versioning for client updates. An app update must
--     state the version it writes: the version it read + 1 (the repository
--     layer does this). Leaving it out, or a stale version, is rejected with
--     40001 (version conflict). Inserts start at 1. Server-side writes (SECURITY
--     DEFINER functions, the service role, and cascades run by triggers) own
--     their concurrency and just bump the version.
--  4. Provenance offsets: Unicode code points, end-exclusive, into captured
--     text stored in NFC. Postgres text functions already count code points;
--     the NFC check makes "the same text" mean the same code points on every
--     device, so offsets computed anywhere agree.
--  5. Birthday provenance: people.birthday_source (contacts · capture ·
--     user_edit) and the capture it came from. A birthday reason requires a
--     birthday with a known source.
-- ============================================================================

-- ─── 1. connections → contact_events ────────────────────────────────────────

ALTER TABLE public.connections RENAME TO contact_events;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.contact_events'::regclass AND conname LIKE 'connections\_%' LOOP
    EXECUTE format('ALTER TABLE public.contact_events RENAME CONSTRAINT %I TO %I',
                   r.conname, 'contact_events_' || substr(r.conname, length('connections_') + 1));
  END LOOP;
  FOR r IN SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
           WHERE i.indrelid = 'public.contact_events'::regclass AND c.relname LIKE 'connections\_%' LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I',
                   r.relname, 'contact_events_' || substr(r.relname, length('connections_') + 1));
  END LOOP;
END
$$;

ALTER TRIGGER connections_row_guard ON public.contact_events RENAME TO contact_events_row_guard;

COMMENT ON TABLE public.contact_events IS
  'Kinship 2.0: confirmed instances of human contact (plan §15). A hand-off alone never writes here.';

DROP TRIGGER people_cascade_delete_connections ON public.people;
DROP FUNCTION public.people_cascade_delete_connections();

CREATE OR REPLACE FUNCTION public.people_cascade_delete_contact_events()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.contact_events SET deleted_at = NEW.deleted_at
     WHERE person_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER people_cascade_delete_contact_events AFTER UPDATE OF deleted_at ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_cascade_delete_contact_events();

-- ─── 2. Event detail: goal → event_goal ─────────────────────────────────────

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
      allowed := ARRAY['date', 'place', 'photo_ids'];
      required := ARRAY[]::text[];
    WHEN 'milestone' THEN
      allowed := ARRAY['date', 'milestone_type', 'anniversary'];
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

-- ─── 3. Strict optimistic versioning for client updates ─────────────────────

-- True when the current write comes straight from an app session: the API
-- roles at the top level of a statement. Writes made inside a trigger
-- (cascades), inside a SECURITY DEFINER function (current_user is then the
-- function's owner), or by the service role are server-owned.
CREATE OR REPLACE FUNCTION public.v2_is_client_write()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT current_user IN ('authenticated', 'anon') AND pg_trigger_depth() <= 1
$$;

CREATE OR REPLACE FUNCTION public.v2_row_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp();
    NEW.updated_at := NEW.created_at;
    NEW.version := 1;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot change' USING ERRCODE = '42501';
  END IF;
  IF public.v2_is_client_write() THEN
    -- One code for "missing" and "stale": a client exactly one write behind
    -- sends the same number as one that sent none, and either way the
    -- repository must re-read before writing again.
    IF NEW.version IS DISTINCT FROM OLD.version + 1 THEN
      RAISE EXCEPTION 'version conflict on %.%: an update must carry the version it read + 1 (current is %, got %)',
        TG_TABLE_NAME, OLD.id, OLD.version, NEW.version USING ERRCODE = '40001';
    END IF;
  END IF;
  NEW.created_at := OLD.created_at;
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_settings_row_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp();
    NEW.updated_at := NEW.created_at;
    NEW.version := 1;
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot change' USING ERRCODE = '42501';
  END IF;
  IF public.v2_is_client_write() THEN
    IF NEW.version IS DISTINCT FROM OLD.version + 1 THEN
      RAISE EXCEPTION 'version conflict on user_settings: an update must carry the version it read + 1 (current is %, got %)',
        OLD.version, NEW.version USING ERRCODE = '40001';
    END IF;
  END IF;
  NEW.created_at := OLD.created_at;
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

-- ─── 4. Provenance offsets: NFC text, code-point spans ──────────────────────

ALTER TABLE public.captures
  ADD CONSTRAINT captures_raw_text_nfc CHECK (raw_text IS NULL OR raw_text IS NFC NORMALIZED);

COMMENT ON COLUMN public.memory_item_sources.span_start IS
  'Unicode code-point offset into captures.raw_text (NFC), inclusive. Same unit in Postgres, TypeScript (spans.ts) and the AI gateway.';
COMMENT ON COLUMN public.memory_item_sources.span_end IS
  'Unicode code-point offset into captures.raw_text (NFC), exclusive.';

-- ─── 5. Birthday provenance ─────────────────────────────────────────────────

ALTER TABLE public.people
  ADD COLUMN birthday_source     text CHECK (birthday_source IN ('contacts', 'capture', 'user_edit')),
  ADD COLUMN birthday_capture_id uuid,
  ADD CONSTRAINT people_birthday_capture_fkey FOREIGN KEY (birthday_capture_id, user_id)
    REFERENCES public.captures (id, user_id) ON DELETE SET NULL (birthday_capture_id),
  ADD CONSTRAINT people_birthday_has_source CHECK ((birthday IS NULL) = (birthday_source IS NULL)),
  ADD CONSTRAINT people_birthday_capture_matches
    CHECK ((birthday_source = 'capture') = (birthday_capture_id IS NOT NULL));

CREATE INDEX people_birthday_capture_idx ON public.people (birthday_capture_id)
  WHERE birthday_capture_id IS NOT NULL;

COMMENT ON COLUMN public.people.birthday_source IS
  'Where the birthday came from, so Kinship can always explain it: Contacts, a capture (birthday_capture_id), or the user''s own edit.';

-- A birthday changed by the app without naming a new source is the user's
-- own edit; a cleared birthday clears its source.
CREATE OR REPLACE FUNCTION public.people_birthday_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.birthday IS NULL THEN
    NEW.birthday_source := NULL;
    NEW.birthday_capture_id := NULL;
  ELSIF TG_OP = 'UPDATE' AND NEW.birthday IS DISTINCT FROM OLD.birthday
        AND NEW.birthday_source IS NOT DISTINCT FROM OLD.birthday_source
        AND NEW.birthday_capture_id IS NOT DISTINCT FROM OLD.birthday_capture_id THEN
    NEW.birthday_source := 'user_edit';
    NEW.birthday_capture_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER people_birthday_source BEFORE INSERT OR UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_birthday_source();

-- Deleting the capture a birthday came from removes the birthday, like any
-- memory whose only source is gone.
CREATE OR REPLACE FUNCTION public.captures_cascade_birthdays()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.people SET birthday = NULL
     WHERE birthday_capture_id = NEW.id AND user_id = NEW.user_id AND birthday_source = 'capture';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER captures_cascade_birthdays AFTER UPDATE OF deleted_at ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.captures_cascade_birthdays();

-- A birthday reason needs a birthday with a known source.
CREATE OR REPLACE FUNCTION public.reasons_person_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  p record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.person_id = OLD.person_id
     AND NEW.state NOT IN ('candidate', 'scheduled', 'surfaced') THEN
    RETURN NEW;
  END IF;
  SELECT state, deleted_at, birthday, birthday_source INTO p FROM public.people WHERE id = NEW.person_id;
  IF NOT FOUND THEN
    RETURN NEW; -- the foreign key reports it
  END IF;
  IF NEW.state IN ('candidate', 'scheduled', 'surfaced') THEN
    IF p.state <> 'active' OR p.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'no reasons for a % person', CASE WHEN p.deleted_at IS NOT NULL THEN 'deleted' ELSE p.state END
        USING ERRCODE = '23514';
    END IF;
    IF NEW.type = 'birthday' AND (p.birthday IS NULL OR p.birthday_source IS NULL) THEN
      RAISE EXCEPTION 'a birthday reason needs a birthday with a known source' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── purge_tombstones: renamed table ────────────────────────────────────────

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
  FOREACH t IN ARRAY ARRAY['memory_item_sources', 'contact_events', 'reasons', 'memory_items',
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
