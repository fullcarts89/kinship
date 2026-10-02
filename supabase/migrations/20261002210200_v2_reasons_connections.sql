-- ============================================================================
-- Kinship 2.0 — reasons to connect and confirmed contact (Phase 1, Checkpoint A)
-- ============================================================================
-- reasons          derived and disposable: why Kinship might speak about a
--                  person now (plan §13, §14). Written by the server's
--                  reasons engine only.
-- reason_evidence  which memory items support a reason (plan §14 "what
--                  evidence supports this?"). A table rather than a uuid[]
--                  so evidence keeps referential integrity.
-- reason_events    what the user did with a reason (shown, acted, done,
--                  dismissed, feedback). Append-only; drives reasons.state.
-- connections      confirmed contact only (plan §15: 1.0's `interactions`
--                  keeps that name until 1.0 is retired). Opening a channel
--                  never writes here; the return check does.
--
-- Rules enforced here:
--   * D13: no reason can exist for a paused, remembered, archived or deleted
--     person, and open reasons are suppressed the moment the user sets one
--     of those states.
--   * Every reason except a birthday cites at least one memory item, and
--     open reasons are suppressed as soon as their evidence is retracted,
--     superseded, expired or deleted.
-- ============================================================================

-- ─── reasons ────────────────────────────────────────────────────────────────

CREATE TABLE public.reasons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id    uuid NOT NULL,
  type         text NOT NULL CHECK (type IN (
                 'hard_time', 'event_followup', 'upcoming_event', 'birthday', 'promise',
                 'thread', 'plan', 'tradition', 'reconnect', 'resurfacing', 'review')),
  window_start timestamptz NOT NULL,
  window_end   timestamptz NOT NULL,
  score        numeric(6,2) NOT NULL DEFAULT 0 CHECK (score >= 0),
  -- Phrasing only. The model never proposes a reason; it may only phrase
  -- one, and the grounding check rejects entities not in the evidence.
  copy         text CHECK (char_length(copy) <= 280),
  copy_version text CHECK (char_length(copy_version) <= 100),
  state        text NOT NULL DEFAULT 'candidate' CHECK (state IN (
                 'candidate', 'scheduled', 'surfaced', 'acted', 'done',
                 'dismissed', 'expired', 'suppressed')),
  dedupe_key   text NOT NULL CHECK (char_length(dedupe_key) BETWEEN 1 AND 200),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  version      integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id),
  UNIQUE (user_id, dedupe_key),
  FOREIGN KEY (person_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE,
  CHECK (window_end >= window_start)
);

COMMENT ON TABLE public.reasons IS 'Kinship 2.0: derived, disposable reasons to connect (plan §13–14). Server-written.';

CREATE INDEX reasons_sync_idx ON public.reasons (user_id, updated_at, id);
CREATE INDEX reasons_person_open_idx ON public.reasons (person_id)
  WHERE state IN ('candidate', 'scheduled', 'surfaced');

CREATE TRIGGER reasons_row_guard BEFORE INSERT OR UPDATE ON public.reasons
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- D13: only active, live people get reasons.
CREATE OR REPLACE FUNCTION public.reasons_person_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  p_state text;
  p_deleted timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.person_id = OLD.person_id
     AND NEW.state NOT IN ('candidate', 'scheduled', 'surfaced') THEN
    RETURN NEW;
  END IF;
  SELECT state, deleted_at INTO p_state, p_deleted FROM public.people WHERE id = NEW.person_id;
  IF FOUND AND (p_state <> 'active' OR p_deleted IS NOT NULL)
     AND NEW.state IN ('candidate', 'scheduled', 'surfaced') THEN
    RAISE EXCEPTION 'no reasons for a % person', CASE WHEN p_deleted IS NOT NULL THEN 'deleted' ELSE p_state END
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reasons_person_guard BEFORE INSERT OR UPDATE ON public.reasons
  FOR EACH ROW EXECUTE FUNCTION public.reasons_person_guard();

-- ─── reason_evidence ────────────────────────────────────────────────────────

CREATE TABLE public.reason_evidence (
  reason_id      uuid NOT NULL,
  memory_item_id uuid NOT NULL,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reason_id, memory_item_id),
  FOREIGN KEY (reason_id, user_id) REFERENCES public.reasons (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (memory_item_id, user_id) REFERENCES public.memory_items (id, user_id) ON DELETE CASCADE
);

CREATE INDEX reason_evidence_item_idx ON public.reason_evidence (memory_item_id);
CREATE INDEX reason_evidence_user_idx ON public.reason_evidence (user_id);

-- Every reason except a birthday (evidence: people.birthday) cites an item.
CREATE OR REPLACE FUNCTION public.reasons_require_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.reasons r WHERE r.id = NEW.id AND r.type <> 'birthday'
               AND r.deleted_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM public.reason_evidence e WHERE e.reason_id = NEW.id) THEN
    RAISE EXCEPTION 'reason % has no evidence', NEW.id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER reasons_evidence_required
  AFTER INSERT ON public.reasons
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.reasons_require_evidence();

-- Evidence gone or no longer true → open reasons built on it are suppressed.
CREATE OR REPLACE FUNCTION public.memory_items_suppress_reasons()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
     OR (NEW.status IN ('retracted', 'superseded', 'expired') AND OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.reasons r SET state = 'suppressed'
     WHERE r.state IN ('candidate', 'scheduled', 'surfaced')
       AND r.user_id = NEW.user_id
       AND EXISTS (SELECT 1 FROM public.reason_evidence e
                   WHERE e.reason_id = r.id AND e.memory_item_id = NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_suppress_reasons() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER memory_items_suppress_reasons AFTER UPDATE OF deleted_at, status ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_suppress_reasons();

-- D13 and deletion: a person leaving 'active' silences their open reasons.
CREATE OR REPLACE FUNCTION public.people_suppress_reasons()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.state <> 'active' AND OLD.state = 'active')
     OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
    UPDATE public.reasons SET state = 'suppressed',
           deleted_at = CASE WHEN NEW.deleted_at IS NOT NULL THEN NEW.deleted_at ELSE deleted_at END
     WHERE person_id = NEW.id AND user_id = NEW.user_id
       AND (state IN ('candidate', 'scheduled', 'surfaced') OR NEW.deleted_at IS NOT NULL)
       AND deleted_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.people_suppress_reasons() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER people_suppress_reasons AFTER UPDATE OF state, deleted_at ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_suppress_reasons();

-- ─── reason_events ──────────────────────────────────────────────────────────

CREATE TABLE public.reason_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason_id   uuid NOT NULL,
  event       text NOT NULL CHECK (event IN (
                'shown', 'acted', 'done', 'dismissed_not_now', 'dismissed_not_helpful',
                'feedback_useful', 'feedback_not_useful', 'return_yes', 'return_not_yet')),
  surface     text CHECK (surface IN ('today', 'push', 'brief')),
  channel     text CHECK (channel IN ('text', 'call', 'facetime', 'whatsapp', 'email', 'in_person', 'other')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (reason_id, user_id) REFERENCES public.reasons (id, user_id) ON DELETE CASCADE
);

CREATE INDEX reason_events_reason_idx ON public.reason_events (reason_id, occurred_at);
CREATE INDEX reason_events_user_idx ON public.reason_events (user_id, created_at);

-- The user's action moves the reason along. Opening a channel ("acted") is
-- not "done": only the return check's yes, or an explicit Done, is.
CREATE OR REPLACE FUNCTION public.reason_events_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_state text;
BEGIN
  NEW.created_at := clock_timestamp();
  next_state := CASE NEW.event
    WHEN 'shown' THEN 'surfaced'
    WHEN 'acted' THEN 'acted'
    WHEN 'done' THEN 'done'
    WHEN 'return_yes' THEN 'done'
    WHEN 'dismissed_not_now' THEN 'dismissed'
    WHEN 'dismissed_not_helpful' THEN 'dismissed'
    ELSE NULL
  END;
  IF next_state IS NOT NULL THEN
    UPDATE public.reasons SET state = next_state
     WHERE id = NEW.reason_id AND user_id = NEW.user_id
       AND state NOT IN ('done', 'expired', 'suppressed')
       AND NOT (next_state = 'surfaced' AND state IN ('acted', 'dismissed'));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reason_events_apply() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reason_events_apply BEFORE INSERT ON public.reason_events
  FOR EACH ROW EXECUTE FUNCTION public.reason_events_apply();

-- ─── connections (confirmed contact) ────────────────────────────────────────

CREATE TABLE public.connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL,
  channel     text NOT NULL CHECK (channel IN ('text', 'call', 'facetime', 'whatsapp', 'email', 'in_person', 'other')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL CHECK (source IN ('return_check', 'capture', 'manual', 'calendar_confirmed')),
  reason_id   uuid,
  capture_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  version     integer NOT NULL DEFAULT 1,
  FOREIGN KEY (person_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (reason_id, user_id) REFERENCES public.reasons (id, user_id) ON DELETE SET NULL (reason_id),
  FOREIGN KEY (capture_id, user_id) REFERENCES public.captures (id, user_id) ON DELETE SET NULL (capture_id),
  CHECK (source <> 'return_check' OR reason_id IS NOT NULL)
);

COMMENT ON TABLE public.connections IS
  'Kinship 2.0: confirmed contact only (plan §15). A hand-off alone never writes here.';

CREATE INDEX connections_sync_idx ON public.connections (user_id, updated_at, id);
CREATE INDEX connections_person_idx ON public.connections (person_id, occurred_at);
CREATE INDEX connections_reason_idx ON public.connections (reason_id) WHERE reason_id IS NOT NULL;
CREATE INDEX connections_capture_idx ON public.connections (capture_id) WHERE capture_id IS NOT NULL;

CREATE TRIGGER connections_row_guard BEFORE INSERT OR UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- Deleting a person removes their confirmed contacts too.
CREATE OR REPLACE FUNCTION public.people_cascade_delete_connections()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.connections SET deleted_at = NEW.deleted_at
     WHERE person_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER people_cascade_delete_connections AFTER UPDATE OF deleted_at ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_cascade_delete_connections();

-- ─── Access ─────────────────────────────────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reasons', 'reason_evidence', 'reason_events', 'connections'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE DELETE, TRUNCATE ON public.%I FROM authenticated', t);
    EXECUTE format($p$CREATE POLICY "Owner can read" ON public.%I FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id)$p$, t);
  END LOOP;
END
$$;

-- Reasons and their evidence are server-written (reasons engine).
REVOKE INSERT, UPDATE ON public.reasons, public.reason_evidence FROM authenticated;

-- Reason events: the user appends; never edits.
REVOKE UPDATE ON public.reason_events FROM authenticated;
CREATE POLICY "Owner can create" ON public.reason_events FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Confirmed contact: the user records and can correct or delete (tombstone).
CREATE POLICY "Owner can create" ON public.connections FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Owner can update" ON public.connections FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
