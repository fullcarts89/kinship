-- ============================================================================
-- Kinship — server-side AI consent (P0-07, founder decision D3)
-- ============================================================================
-- AI processing needs one explicit consent that is stored on the server,
-- versioned, revocable, and enforced by the AI gateway. Until the user says
-- yes, ai_consent is false and the gateway refuses every call (403).
--
-- The app records consent through set_ai_consent(), which stamps the version
-- and time. The gateway reads the caller's own row (RLS) and requires
-- ai_consent = true AND ai_consent_version >= the version it currently
-- requires, so a material change to what is sent can ask again.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id               UUID PRIMARY KEY DEFAULT auth.uid()
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_consent            BOOLEAN NOT NULL DEFAULT false,
  ai_consent_version    INTEGER CHECK (ai_consent_version IS NULL OR ai_consent_version > 0),
  ai_consent_updated_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own settings"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Settings are removed only with the account (ON DELETE CASCADE).
REVOKE ALL ON public.user_settings FROM anon;
REVOKE DELETE, TRUNCATE ON public.user_settings FROM authenticated;

-- ─── set_ai_consent ─────────────────────────────────────────────────────────
-- Grants or revokes AI consent for the caller only. SECURITY INVOKER: it runs
-- as the user, so RLS still applies. A grant must name the consent version
-- the user saw; a revocation keeps the version on record.

CREATE OR REPLACE FUNCTION public.set_ai_consent(p_granted BOOLEAN, p_version INTEGER)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY INVOKER
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
    (user_id, ai_consent, ai_consent_version, ai_consent_updated_at, updated_at)
  VALUES (caller, p_granted, CASE WHEN p_granted THEN p_version END, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET ai_consent = EXCLUDED.ai_consent,
        ai_consent_version = coalesce(EXCLUDED.ai_consent_version, s.ai_consent_version),
        ai_consent_updated_at = now(),
        updated_at = now()
  RETURNING s.* INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_consent(BOOLEAN, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_consent(BOOLEAN, INTEGER) TO authenticated;
