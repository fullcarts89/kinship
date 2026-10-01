-- ============================================================================
-- Kinship — real account deletion (P0-05)
-- ============================================================================
-- delete_user_account(target) removes everything Kinship holds for a user in
-- one transaction:
--   1. counts the user's rows in every public table that has a user_id column
--      (found at run time, so tables added later are covered automatically);
--   2. deletes the auth user, which cascades to every user_id foreign key and
--      to Supabase's own auth tables (identities, sessions, refresh tokens);
--   3. re-checks every table and auth.users; if anything is left, it raises
--      and the whole deletion rolls back, so a partial delete can never be
--      reported as complete.
-- Returns the per-table counts that were removed.
--
-- Only the service role may call it (the delete-account edge function does,
-- after verifying the caller is that user). Storage objects are removed by
-- the edge function through the Storage API before this runs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(target UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tbl RECORD;
  n BIGINT;
  counts JSONB := '{}'::jsonb;
  leftovers TEXT[] := '{}';
  had_user BOOLEAN;
BEGIN
  IF target IS NULL THEN
    RAISE EXCEPTION 'target is required' USING ERRCODE = '22004';
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = target) INTO had_user;

  FOR tbl IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', tbl.table_name)
      INTO n USING target;
    counts := counts || jsonb_build_object(tbl.table_name, n);
  END LOOP;

  -- Count everything before deleting anything: deleting a parent cascades to
  -- its children, which would otherwise be under-reported. The explicit
  -- delete (not just the cascade below) empties any table whose user_id
  -- lacks ON DELETE CASCADE instead of letting it block the deletion.
  FOR tbl IN SELECT key AS table_name FROM jsonb_each(counts) LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', tbl.table_name) USING target;
  END LOOP;

  DELETE FROM auth.users WHERE id = target;

  -- Verify nothing is left anywhere.
  FOR tbl IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', tbl.table_name)
      INTO n USING target;
    IF n > 0 THEN
      leftovers := leftovers || tbl.table_name;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = target) THEN
    leftovers := leftovers || 'auth.users'::text;
  END IF;
  IF array_length(leftovers, 1) > 0 THEN
    RAISE EXCEPTION 'account deletion incomplete: %', array_to_string(leftovers, ', ')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('auth_user', had_user, 'tables', counts);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;
