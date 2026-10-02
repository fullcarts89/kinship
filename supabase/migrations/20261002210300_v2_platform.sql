-- ============================================================================
-- Kinship 2.0 — settings, consents, devices, notifications, feature flags,
-- tombstone purge (Phase 1, Checkpoint A)
-- ============================================================================

-- ─── user_settings (existing; P0-07) ────────────────────────────────────────
-- Extended for 2.0. The AI gateway keeps reading ai_consent/_version here.

ALTER TABLE public.user_settings
  ADD COLUMN time_zone                text CHECK (char_length(time_zone) <= 64),
  ADD COLUMN quiet_hours_start        time,
  ADD COLUMN quiet_hours_end          time,
  ADD COLUMN push_enabled             boolean NOT NULL DEFAULT false,
  ADD COLUMN capture_retention_default text NOT NULL DEFAULT 'keep'
    CHECK (capture_retention_default IN ('keep', 'delete_after_extraction')),
  ADD COLUMN version                  integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT user_settings_quiet_hours_pair
    CHECK ((quiet_hours_start IS NULL) = (quiet_hours_end IS NULL));

CREATE INDEX user_settings_sync_idx ON public.user_settings (user_id, updated_at);

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
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'version conflict on user_settings: based on %, current is %', NEW.version, OLD.version
      USING ERRCODE = '40001';
  END IF;
  NEW.created_at := OLD.created_at;
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_settings_row_guard BEFORE INSERT OR UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.user_settings_row_guard();

-- Consent is changed only through set_consent / set_ai_consent, which keep
-- the ledger below in step.
REVOKE INSERT, UPDATE ON public.user_settings FROM authenticated;
GRANT INSERT (user_id, time_zone, quiet_hours_start, quiet_hours_end, push_enabled,
              capture_retention_default)
  ON public.user_settings TO authenticated;
GRANT UPDATE (time_zone, quiet_hours_start, quiet_hours_end, push_enabled,
              capture_retention_default, version)
  ON public.user_settings TO authenticated;

-- ─── consents (append-only ledger) ──────────────────────────────────────────

CREATE TABLE public.consents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope      text NOT NULL CHECK (scope IN ('ai_processing', 'analytics', 'notifications')),
  granted    boolean NOT NULL,
  -- The version of the disclosure the user saw (required for a grant).
  version    integer CHECK (version IS NULL OR version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT granted OR version IS NOT NULL)
);

COMMENT ON TABLE public.consents IS 'Kinship 2.0: every consent grant and revocation, append-only.';

CREATE INDEX consents_user_idx ON public.consents (user_id, scope, created_at);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consents FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.consents FROM authenticated;
CREATE POLICY "Owner can read" ON public.consents FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- set_ai_consent (P0-07) now also records the ledger entry. Same signature
-- and behaviour for the app and the gateway.
CREATE OR REPLACE FUNCTION public.set_ai_consent(p_granted BOOLEAN, p_version INTEGER)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller UUID := auth.uid();
  result public.user_settings;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'set_ai_consent requires a signed-in user' USING ERRCODE = '42501';
  END IF;
  IF p_granted IS NULL THEN
    RAISE EXCEPTION 'p_granted is required' USING ERRCODE = '22004';
  END IF;
  IF p_granted AND (p_version IS NULL OR p_version < 1) THEN
    RAISE EXCEPTION 'a consent grant must name the version shown' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_settings AS s
    (user_id, ai_consent, ai_consent_version, ai_consent_updated_at)
  VALUES (caller, p_granted, CASE WHEN p_granted THEN p_version END, now())
  ON CONFLICT (user_id) DO UPDATE
    SET ai_consent = EXCLUDED.ai_consent,
        ai_consent_version = coalesce(EXCLUDED.ai_consent_version, s.ai_consent_version),
        ai_consent_updated_at = now()
  RETURNING s.* INTO result;

  INSERT INTO public.consents (user_id, scope, granted, version)
  VALUES (caller, 'ai_processing', p_granted, CASE WHEN p_granted THEN p_version END);
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_consent(BOOLEAN, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_consent(BOOLEAN, INTEGER) TO authenticated;

-- ─── devices (push tokens) ──────────────────────────────────────────────────

CREATE TABLE public.devices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  platform     text NOT NULL CHECK (platform IN ('ios', 'android')),
  push_token   text CHECK (char_length(push_token) <= 400),
  app_version  text CHECK (char_length(app_version) <= 50),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- Set on sign-out (the token is unregistered server-side).
  deleted_at   timestamptz,
  version      integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id)
);

-- One live registration per token: a phone handed to another account
-- re-registers under the new user.
CREATE UNIQUE INDEX devices_live_token_uniq ON public.devices (push_token)
  WHERE push_token IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX devices_user_idx ON public.devices (user_id, updated_at, id);

CREATE TRIGGER devices_row_guard BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.devices FROM anon;
REVOKE DELETE, TRUNCATE ON public.devices FROM authenticated;
CREATE POLICY "Owner can read" ON public.devices FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Owner can create" ON public.devices FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Owner can update" ON public.devices FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ─── notification_log (no content) ──────────────────────────────────────────

CREATE TABLE public.notification_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id  uuid,
  reason_id  uuid,
  tier       text NOT NULL CHECK (tier IN ('quiet', 'normal', 'important')),
  status     text NOT NULL CHECK (status IN ('sent', 'failed', 'suppressed')),
  sent_at    timestamptz NOT NULL DEFAULT now(),
  opened_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (device_id, user_id) REFERENCES public.devices (id, user_id) ON DELETE SET NULL (device_id),
  FOREIGN KEY (reason_id, user_id) REFERENCES public.reasons (id, user_id) ON DELETE SET NULL (reason_id)
);

COMMENT ON TABLE public.notification_log IS
  'Kinship 2.0: what was pushed, when and why (reason id). Never the notification text.';

CREATE INDEX notification_log_user_idx ON public.notification_log (user_id, sent_at);
CREATE INDEX notification_log_device_idx ON public.notification_log (device_id) WHERE device_id IS NOT NULL;
CREATE INDEX notification_log_reason_idx ON public.notification_log (reason_id) WHERE reason_id IS NOT NULL;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.notification_log FROM authenticated;
CREATE POLICY "Owner can read" ON public.notification_log FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- ─── Feature flags (first-party, plan §25) ──────────────────────────────────

CREATE TABLE public.feature_flags (
  key         text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,49}$'),
  description text NOT NULL CHECK (char_length(description) <= 300),
  default_on  boolean NOT NULL DEFAULT false,
  rollout_pct integer NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  -- Enforced by server functions as well as the app.
  server_enforced boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Per-user overrides (the allowlist). Never readable by other users.
CREATE TABLE public.user_flag_overrides (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_key   text NOT NULL REFERENCES public.feature_flags (key) ON DELETE CASCADE,
  enabled    boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flag_key)
);

CREATE INDEX user_flag_overrides_flag_idx ON public.user_flag_overrides (flag_key);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flag_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_flags, public.user_flag_overrides FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.feature_flags, public.user_flag_overrides FROM authenticated;
CREATE POLICY "Signed-in users can read flags" ON public.feature_flags FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Owner can read" ON public.user_flag_overrides FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Effective flags for the caller: override, else rollout bucket, else default.
-- The bucket is a stable hash of (flag, user), so a user stays in or out.
CREATE OR REPLACE FUNCTION public.my_flags()
RETURNS TABLE (key text, enabled boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT f.key,
         coalesce(o.enabled,
                  f.default_on
                  OR (f.rollout_pct > 0
                      AND ('x' || substr(md5(f.key || ':' || (select auth.uid())::text), 1, 8))::bit(32)::bigint
                          % 100 < f.rollout_pct))
  FROM public.feature_flags f
  LEFT JOIN public.user_flag_overrides o
    ON o.flag_key = f.key AND o.user_id = (select auth.uid())
  WHERE (select auth.uid()) IS NOT NULL
  ORDER BY f.key
$$;

REVOKE ALL ON FUNCTION public.my_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_flags() TO authenticated;

-- The plan §25 flag set. Everything starts OFF: beta defaults are switched
-- on when the 2.0 build ships, not by this migration.
INSERT INTO public.feature_flags (key, description, server_enforced) VALUES
  ('shell_v2',             'Entire 2.0 app shell vs 1.0', false),
  ('memory_v2',            'New schema read/write paths and gateway extraction writes', true),
  ('tell',                 'Tell entry points', false),
  ('ai_extraction',        'relationship_extract (else raw captures + deterministic dates)', true),
  ('relationship_page_v2', 'New person page (kill switch to a read-only item list)', false),
  ('today',                'Today candidates and UI', true),
  ('reasons_engine',       'Server candidate generation and copy', true),
  ('push_delivery',        'Server push sending (kill switch)', true),
  ('weekly_brief',         'Tier 2 push', true),
  ('voice_capture',        'Microphone in Tell', false),
  ('sprig_marks',          'Sprig marks (algorithm C). Off: the sprig is identity only', false),
  ('garden_view',          'Post-validation People visualization (plan §34)', false),
  ('calendar_briefs',      'Calendar permission, briefs and post-encounter prompt', true),
  ('reconnect',            'Reconnect candidates and openers', true),
  ('ask_kinship',          'retrieval_answer', true),
  ('monthly_letter',       'reflection_generate', true),
  ('native_siri',          'Siri capture target', false),
  ('native_share',         'Share-extension capture target', false),
  ('native_widget',        'Widget capture target', false);

-- ─── Tombstone purge (30 days) ──────────────────────────────────────────────
-- Hard-deletes tombstones older than 30 days and Undo history older than 30
-- days. A device offline longer than that does a full resync. Service role
-- only; scheduled (pg_cron) when the 2.0 sync engine ships.

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
  -- Children before parents, so nothing is removed by cascade uncounted.
  FOREACH t IN ARRAY ARRAY['memory_item_sources', 'connections', 'reasons', 'memory_items',
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
