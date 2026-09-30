-- ============================================================================
-- Kinship — Self-service account deletion
-- ============================================================================
-- Lets a signed-in user permanently delete their own account from the app
-- (Settings → Privacy & Data → Delete Account). Removing the auth user
-- cascades to every Kinship table — each references auth.users
-- ON DELETE CASCADE — so the whole garden goes with it.
--
-- SECURITY DEFINER so it can reach auth.users. It only ever deletes the
-- caller (auth.uid()), and only signed-in users may execute it.
-- Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = caller;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
