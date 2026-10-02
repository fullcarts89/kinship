-- ============================================================================
-- Kinship 2.0 — captures and relationship memory (Phase 1, Checkpoint A)
-- ============================================================================
-- captures             the raw thing the user told Kinship (never rewritten)
-- memory_items         anything Kinship believes, one table with a `kind`
--                      discriminator and a typed `detail` (plan §5)
-- memory_item_sources  provenance: which capture span (or contact, calendar
--                      entry, user edit, merge) supports each item (plan §6)
-- memory_item_history  previous versions of an item, for Undo (30 days)
--
-- Invariants enforced here, in the database:
--   * Provenance: a live memory item always has at least one live source.
--     Checked at commit (deferred), so an item and its first source can be
--     written in one transaction in either order.
--   * A capture source points at a real span of that capture's text.
--   * Captured text is never rewritten; it can only be purged (set to NULL)
--     when the user chose "delete after extraction". Each source keeps a
--     ≤200-character quote, so provenance survives the purge.
--   * Deleting a capture deletes the items it was the only source for;
--     items with other sources (including a user edit) keep them.
--   * Deleting a person deletes their items, related people, identities,
--     and the captures that were only about them.
--   * Superseding: the older item is marked superseded (history kept), and
--     only within the same person.
--   * Kind-specific detail is validated (memory_detail_ok).
-- ============================================================================

-- ─── captures ───────────────────────────────────────────────────────────────

CREATE TABLE public.captures (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source             text NOT NULL CHECK (source IN (
                       'text', 'voice', 'share', 'screenshot', 'siri', 'widget',
                       'post_handoff', 'post_encounter', 'photo', 'onboarding')),
  -- Exactly as typed or transcribed. NULL only after a retention purge.
  raw_text           text CHECK (char_length(raw_text) BETWEEN 1 AND 5000),
  raw_text_purged_at timestamptz,
  -- {on_device: true, locale, duration_s}. Audio is never stored.
  transcript_meta    jsonb CHECK (transcript_meta IS NULL OR jsonb_typeof(transcript_meta) = 'object'),
  -- Set when Tell was opened from a person's page.
  context_person_id  uuid,
  -- When the user says it happened ("tonight"); dates in the text resolve
  -- against this.
  occurred_at        timestamptz NOT NULL DEFAULT now(),
  -- The user's IANA time zone at capture time, so "Sunday" resolves to the
  -- right calendar day.
  time_zone          text CHECK (char_length(time_zone) <= 64),
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN (
                       'pending', 'processing', 'extracted', 'needs_review', 'failed', 'skipped')),
  -- Prompt + model id, so an extraction can be re-run later.
  extraction_version text CHECK (char_length(extraction_version) <= 100),
  retention          text NOT NULL DEFAULT 'keep' CHECK (retention IN ('keep', 'delete_after_extraction')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  version            integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id),
  FOREIGN KEY (context_person_id, user_id) REFERENCES public.people (id, user_id)
    ON DELETE SET NULL (context_person_id),
  CHECK ((raw_text IS NULL) = (raw_text_purged_at IS NOT NULL))
);

COMMENT ON TABLE public.captures IS 'Kinship 2.0: raw input the user gave Kinship, never rewritten (plan §5, §7).';

CREATE INDEX captures_sync_idx ON public.captures (user_id, updated_at, id);
CREATE INDEX captures_context_person_idx ON public.captures (context_person_id)
  WHERE context_person_id IS NOT NULL;
CREATE INDEX captures_pending_idx ON public.captures (status, created_at)
  WHERE status IN ('pending', 'processing') AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.captures_text_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.raw_text IS NULL THEN
      RAISE EXCEPTION 'a capture needs its text' USING ERRCODE = '23514';
    END IF;
    NEW.raw_text_purged_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.raw_text IS DISTINCT FROM OLD.raw_text THEN
    IF NEW.raw_text IS NOT NULL THEN
      RAISE EXCEPTION 'captured text is never rewritten; it can only be purged'
        USING ERRCODE = '42501';
    END IF;
    NEW.raw_text_purged_at := clock_timestamp();
  ELSE
    NEW.raw_text_purged_at := OLD.raw_text_purged_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER captures_row_guard BEFORE INSERT OR UPDATE ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();
CREATE TRIGGER captures_text_guard BEFORE INSERT OR UPDATE ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.captures_text_guard();

-- ─── Kind-specific detail ───────────────────────────────────────────────────
-- Mirrored by the shared zod schema used by the app and the AI gateway
-- (Checkpoint B/C). Unknown keys are rejected so nothing unvalidated hides
-- in detail.

CREATE OR REPLACE FUNCTION public.v2_is_iso_date(v jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF jsonb_typeof(v) <> 'string' OR NOT (v #>> '{}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') THEN
    RETURN false;
  END IF;
  -- Rejects impossible days such as 2026-02-30 and round-trips exactly.
  RETURN to_char((v #>> '{}')::date, 'YYYY-MM-DD') = v #>> '{}';
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

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
                       'event_type', 'followup_policy', 'goal'];
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
      -- dates: YYYY-MM-DD and a real calendar day
      WHEN 'date' THEN public.v2_is_iso_date(v)
      WHEN 'date_end' THEN public.v2_is_iso_date(v)
      WHEN 'due_date' THEN public.v2_is_iso_date(v)
      WHEN 'last_checked' THEN public.v2_is_iso_date(v)
      -- enums
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
      -- numbers and booleans
      WHEN 'followup_after_days' THEN jsonb_typeof(v) = 'number' AND (v::text ~ '^[0-9]+$')
                                      AND v::text::int BETWEEN 1 AND 365
      WHEN 'since_year' THEN jsonb_typeof(v) = 'number' AND (v::text ~ '^[0-9]{4}$')
      WHEN 'anniversary' THEN jsonb_typeof(v) = 'boolean'
      -- photo ids: an array of up to 20 uuids
      WHEN 'photo_ids' THEN jsonb_typeof(v) = 'array' AND jsonb_array_length(v) <= 20
                            AND NOT EXISTS (
                              SELECT 1 FROM jsonb_array_elements(v) e
                              WHERE jsonb_typeof(e) <> 'string'
                                 OR NOT (e #>> '{}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
      -- everything else is short free text
      ELSE jsonb_typeof(v) = 'string' AND char_length(v #>> '{}') BETWEEN 1 AND 200
    END) THEN
      RETURN false;
    END IF;
  END LOOP;

  -- Cross-field rule: a range ends on or after it starts.
  IF d ? 'date' AND d ? 'date_end' AND (d ->> 'date_end')::date < (d ->> 'date')::date THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;


-- ─── memory_items ───────────────────────────────────────────────────────────

CREATE TABLE public.memory_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind                  text NOT NULL CHECK (kind IN (
                          'fact', 'event', 'promise', 'plan', 'thread', 'moment',
                          'milestone', 'tradition', 'context')),
  -- The relationship this belongs to: whose page it shows on.
  person_id             uuid NOT NULL,
  -- Who the statement is about. "Sarah's sister has surgery" is on Sarah's
  -- page (person_id) but about her sister (subject_type 'related').
  subject_type          text NOT NULL DEFAULT 'person'
                          CHECK (subject_type IN ('person', 'related', 'user', 'shared')),
  subject_related_id    uuid,
  -- The canonical line: "Sarah's sister has surgery Thursday".
  statement             text NOT NULL CHECK (char_length(btrim(statement)) BETWEEN 1 AND 500),
  detail                jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- How sure the user was. Copy hedges to match; extraction may never
  -- upgrade it (e.g. tentative → stated).
  certainty             text NOT NULL DEFAULT 'stated'
                          CHECK (certainty IN ('stated', 'tentative', 'reported', 'planned', 'wished')),
  -- Model plus rules score, 0–1. Never shown to the user.
  extraction_confidence numeric(3,2) CHECK (extraction_confidence BETWEEN 0 AND 1),
  sensitivity           text NOT NULL DEFAULT 'none'
                          CHECK (sensitivity IN ('none', 'health', 'death_grief', 'conflict', 'money', 'other_private')),
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'resolved', 'superseded', 'expired', 'retracted')),
  user_state            text NOT NULL DEFAULT 'unreviewed'
                          CHECK (user_state IN ('unreviewed', 'confirmed', 'edited', 'user_authored')),
  valid_from            date,
  valid_to              date,
  supersedes_id         uuid,
  origin                text NOT NULL CHECK (origin IN ('extracted', 'user', 'contacts', 'calendar', 'merged')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  version               integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id),
  FOREIGN KEY (person_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE,
  -- The related person must hang off the same person this item is filed under.
  FOREIGN KEY (subject_related_id, person_id, user_id)
    REFERENCES public.related_people (id, person_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (supersedes_id, user_id) REFERENCES public.memory_items (id, user_id)
    ON DELETE SET NULL (supersedes_id),
  CHECK ((subject_type = 'related') = (subject_related_id IS NOT NULL)),
  -- A promise is something the user said they would do.
  CHECK (kind <> 'promise' OR subject_type = 'user'),
  CHECK (public.memory_detail_ok(kind, detail)),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CHECK (supersedes_id IS NULL OR supersedes_id <> id),
  -- "Not this" retracts and removes.
  CHECK (status <> 'retracted' OR deleted_at IS NOT NULL),
  CHECK (user_state <> 'user_authored' OR origin = 'user')
);

COMMENT ON TABLE public.memory_items IS
  'Kinship 2.0: anything Kinship believes about a relationship. Durable only with a source (memory_item_sources).';

CREATE INDEX memory_items_sync_idx ON public.memory_items (user_id, updated_at, id);
CREATE INDEX memory_items_person_idx ON public.memory_items (person_id) WHERE deleted_at IS NULL;
CREATE INDEX memory_items_related_idx ON public.memory_items (subject_related_id)
  WHERE subject_related_id IS NOT NULL;
CREATE INDEX memory_items_supersedes_idx ON public.memory_items (supersedes_id)
  WHERE supersedes_id IS NOT NULL;

CREATE TRIGGER memory_items_row_guard BEFORE INSERT OR UPDATE ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- ─── memory_item_sources ────────────────────────────────────────────────────

CREATE TABLE public.memory_item_sources (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_item_id uuid NOT NULL,
  capture_id     uuid,
  source_kind    text NOT NULL CHECK (source_kind IN ('capture', 'contacts', 'calendar_event', 'user_edit', 'merge')),
  -- Character offsets into captures.raw_text: [span_start, span_end).
  span_start     integer CHECK (span_start >= 0),
  span_end       integer,
  -- Up to 200 characters of the supporting text, filled from the span, so
  -- the Source view still works after the capture text is purged.
  quote          text CHECK (char_length(quote) <= 200),
  -- calendar_event: {title_hash, starts_at}; merge: {merged_item_ids: [...]}.
  -- Never event bodies or other content.
  meta           jsonb CHECK (meta IS NULL OR jsonb_typeof(meta) = 'object'),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  version        integer NOT NULL DEFAULT 1,
  FOREIGN KEY (memory_item_id, user_id) REFERENCES public.memory_items (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (capture_id, user_id) REFERENCES public.captures (id, user_id) ON DELETE CASCADE,
  CHECK ((source_kind = 'capture') = (capture_id IS NOT NULL)),
  CHECK (source_kind <> 'capture' OR (span_start IS NOT NULL AND span_end IS NOT NULL)),
  CHECK (span_end IS NULL OR (span_start IS NOT NULL AND span_end > span_start))
);

CREATE INDEX memory_item_sources_sync_idx ON public.memory_item_sources (user_id, updated_at, id);
CREATE INDEX memory_item_sources_item_idx ON public.memory_item_sources (memory_item_id);
CREATE INDEX memory_item_sources_capture_idx ON public.memory_item_sources (capture_id)
  WHERE capture_id IS NOT NULL;

CREATE TRIGGER memory_item_sources_row_guard BEFORE INSERT OR UPDATE ON public.memory_item_sources
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- A capture source must point at real text in a live capture.
CREATE OR REPLACE FUNCTION public.memory_item_sources_span_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  cap_text text;
  cap_deleted timestamptz;
BEGIN
  IF NEW.capture_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.capture_id = OLD.capture_id
     AND NEW.span_start = OLD.span_start AND NEW.span_end = OLD.span_end THEN
    NEW.quote := OLD.quote;
    RETURN NEW;
  END IF;

  SELECT raw_text, deleted_at INTO cap_text, cap_deleted
  FROM public.captures WHERE id = NEW.capture_id AND user_id = NEW.user_id;
  IF NOT FOUND THEN
    RETURN NEW; -- the foreign key reports it
  END IF;
  IF cap_deleted IS NOT NULL AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'cannot cite a deleted capture' USING ERRCODE = '23514';
  END IF;
  IF cap_text IS NULL THEN
    RAISE EXCEPTION 'cannot add a span to a capture whose text was purged' USING ERRCODE = '23514';
  END IF;
  IF NEW.span_end > char_length(cap_text) THEN
    RAISE EXCEPTION 'span [%, %) is outside the capture text (length %)',
      NEW.span_start, NEW.span_end, char_length(cap_text) USING ERRCODE = '23514';
  END IF;
  NEW.quote := left(substr(cap_text, NEW.span_start + 1, NEW.span_end - NEW.span_start), 200);
  RETURN NEW;
END;
$$;

CREATE TRIGGER memory_item_sources_span_guard BEFORE INSERT OR UPDATE ON public.memory_item_sources
  FOR EACH ROW EXECUTE FUNCTION public.memory_item_sources_span_guard();

-- ─── Provenance: a live item has a live source (checked at commit) ──────────

CREATE OR REPLACE FUNCTION public.memory_item_require_source(p_item uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.memory_items i WHERE i.id = p_item AND i.deleted_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM public.memory_item_sources s
                     WHERE s.memory_item_id = p_item AND s.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'memory item % has no source; every memory needs provenance', p_item
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.memory_items_provenance_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM public.memory_item_require_source(NEW.id);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.memory_item_sources_provenance_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.memory_item_require_source(OLD.memory_item_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER memory_items_provenance
  AFTER INSERT OR UPDATE OF deleted_at ON public.memory_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_provenance_check();

CREATE CONSTRAINT TRIGGER memory_item_sources_provenance
  AFTER UPDATE OF deleted_at, memory_item_id OR DELETE ON public.memory_item_sources
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.memory_item_sources_provenance_check();

-- ─── memory_item_history (Undo, 30 days) ────────────────────────────────────

CREATE TABLE public.memory_item_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_item_id uuid NOT NULL,
  -- The version this snapshot was, before the change.
  item_version   integer NOT NULL,
  snapshot       jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (memory_item_id, user_id) REFERENCES public.memory_items (id, user_id) ON DELETE CASCADE
);

CREATE INDEX memory_item_history_item_idx ON public.memory_item_history (memory_item_id, item_version);
CREATE INDEX memory_item_history_user_idx ON public.memory_item_history (user_id, created_at);

CREATE OR REPLACE FUNCTION public.memory_items_keep_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.kind, NEW.person_id, NEW.subject_type, NEW.subject_related_id, NEW.statement, NEW.detail,
      NEW.certainty, NEW.sensitivity, NEW.status, NEW.valid_from, NEW.valid_to)
     IS DISTINCT FROM
     (OLD.kind, OLD.person_id, OLD.subject_type, OLD.subject_related_id, OLD.statement, OLD.detail,
      OLD.certainty, OLD.sensitivity, OLD.status, OLD.valid_from, OLD.valid_to) THEN
    INSERT INTO public.memory_item_history (user_id, memory_item_id, item_version, snapshot)
    VALUES (OLD.user_id, OLD.id, OLD.version,
            to_jsonb(OLD) - ARRAY['user_id', 'created_at', 'updated_at']);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_keep_history() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER memory_items_keep_history AFTER UPDATE ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_keep_history();

-- ─── Superseding ────────────────────────────────────────────────────────────

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
  SELECT person_id INTO old_person FROM public.memory_items WHERE id = NEW.supersedes_id;
  IF old_person IS DISTINCT FROM NEW.person_id THEN
    RAISE EXCEPTION 'an item can only supersede an item about the same person' USING ERRCODE = '23514';
  END IF;
  UPDATE public.memory_items
     SET status = 'superseded',
         valid_to = CASE WHEN kind = 'fact' THEN coalesce(valid_to, current_date) ELSE valid_to END
   WHERE id = NEW.supersedes_id AND status IN ('active', 'resolved');
  RETURN NULL;
END;
$$;

CREATE TRIGGER memory_items_apply_supersede AFTER INSERT OR UPDATE OF supersedes_id ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_apply_supersede();

-- ─── Deletion cascades (tombstones) ─────────────────────────────────────────

-- Deleting a capture: its sources go; items left with no live source go.
CREATE OR REPLACE FUNCTION public.captures_cascade_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  affected uuid[];
BEGIN
  IF NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NULL;
  END IF;
  WITH gone AS (
    UPDATE public.memory_item_sources SET deleted_at = NEW.deleted_at
     WHERE capture_id = NEW.id AND deleted_at IS NULL
    RETURNING memory_item_id
  )
  SELECT array_agg(DISTINCT memory_item_id) INTO affected FROM gone;

  UPDATE public.memory_items i SET deleted_at = NEW.deleted_at
   WHERE i.id = ANY (coalesce(affected, '{}'))
     AND i.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.memory_item_sources s
                     WHERE s.memory_item_id = i.id AND s.deleted_at IS NULL);
  RETURN NULL;
END;
$$;

CREATE TRIGGER captures_cascade_delete AFTER UPDATE OF deleted_at ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.captures_cascade_delete();

-- Deleting a person: their items, related people, identities, and the
-- captures that were only about them. Captures that also support items about
-- other people stay. (Redacting this person's spans from those mixed
-- captures is a repository operation in Checkpoint B.)
CREATE OR REPLACE FUNCTION public.people_cascade_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  only_theirs uuid[];
BEGIN
  IF NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NULL;
  END IF;

  -- Captures linked to this person (by context or by a source) with no live
  -- source supporting anyone else.
  SELECT array_agg(c.id) INTO only_theirs
  FROM public.captures c
  WHERE c.user_id = NEW.user_id AND c.deleted_at IS NULL
    AND (c.context_person_id = NEW.id
         OR EXISTS (SELECT 1 FROM public.memory_item_sources s
                    JOIN public.memory_items i ON i.id = s.memory_item_id
                    WHERE s.capture_id = c.id AND i.person_id = NEW.id))
    AND NOT EXISTS (SELECT 1 FROM public.memory_item_sources s
                    JOIN public.memory_items i ON i.id = s.memory_item_id
                    WHERE s.capture_id = c.id AND s.deleted_at IS NULL
                      AND i.deleted_at IS NULL AND i.person_id <> NEW.id);

  UPDATE public.memory_items SET deleted_at = NEW.deleted_at
   WHERE person_id = NEW.id AND deleted_at IS NULL;
  UPDATE public.related_people SET deleted_at = NEW.deleted_at
   WHERE person_id = NEW.id AND deleted_at IS NULL;
  UPDATE public.person_identities SET deleted_at = NEW.deleted_at
   WHERE person_id = NEW.id AND deleted_at IS NULL;
  UPDATE public.captures SET deleted_at = NEW.deleted_at
   WHERE id = ANY (coalesce(only_theirs, '{}')) AND deleted_at IS NULL;
  RETURN NULL;
END;
$$;

CREATE TRIGGER people_cascade_delete AFTER UPDATE OF deleted_at ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_cascade_delete();

-- ─── Access ─────────────────────────────────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['captures', 'memory_items', 'memory_item_sources', 'memory_item_history'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE DELETE, TRUNCATE ON public.%I FROM authenticated', t);
    EXECUTE format($p$CREATE POLICY "Owner can read" ON public.%I FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id)$p$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['captures', 'memory_items', 'memory_item_sources'] LOOP
    EXECUTE format($p$CREATE POLICY "Owner can create" ON public.%I FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id)$p$, t);
    EXECUTE format($p$CREATE POLICY "Owner can update" ON public.%I FOR UPDATE TO authenticated
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)$p$, t);
  END LOOP;
END
$$;

-- History is written only by the trigger.
REVOKE INSERT, UPDATE ON public.memory_item_history FROM authenticated;

-- Server-derived capture fields (status, extraction_version) are written by
-- the AI gateway, not the app. A new capture starts pending (AI on) or
-- skipped (AI off).
REVOKE UPDATE ON public.captures FROM authenticated;
GRANT UPDATE (raw_text, context_person_id, occurred_at, time_zone, retention, deleted_at, version)
  ON public.captures TO authenticated;
ALTER POLICY "Owner can create" ON public.captures
  WITH CHECK ((select auth.uid()) = user_id AND status IN ('pending', 'skipped') AND extraction_version IS NULL);

-- The extraction score is the gateway's; the app never sets it.
REVOKE UPDATE ON public.memory_items FROM authenticated;
GRANT UPDATE (kind, person_id, subject_type, subject_related_id, statement, detail, certainty,
              sensitivity, status, user_state, valid_from, valid_to, supersedes_id, deleted_at, version)
  ON public.memory_items TO authenticated;
ALTER POLICY "Owner can create" ON public.memory_items
  WITH CHECK ((select auth.uid()) = user_id AND extraction_confidence IS NULL AND origin <> 'extracted');
