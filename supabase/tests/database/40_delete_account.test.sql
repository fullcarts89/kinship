-- P0-05: account deletion removes every row in every table plus the auth
-- user, touches nobody else, can't be called by users, and is idempotent.
BEGIN;
SELECT plan(19);

\set A '''aaaaaaaa-5555-5555-5555-555555555555'''
\set B '''bbbbbbbb-6666-6666-6666-666666666666'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);
INSERT INTO auth.identities (user_id) VALUES (:A);
INSERT INTO auth.sessions (user_id) VALUES (:A);

-- Give both users data in every table.
CREATE FUNCTION pg_temp.seed(u uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE p uuid := gen_random_uuid(); s uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.persons (id, user_id, name, relationship_type) VALUES (p, u, 'Maya', 'friend');
  INSERT INTO public.memories (user_id, person_id, content) VALUES (u, p, 'Lisbon');
  INSERT INTO public.interactions (user_id, person_id, type) VALUES (u, p, 'call');
  INSERT INTO public.promises (user_id, person_id, text) VALUES (u, p, 'Send the link');
  INSERT INTO public.seasons (id, user_id, name, starts_at, ends_at) VALUES (s, u, 'Autumn', now(), now());
  INSERT INTO public.season_commitments (season_id, user_id, person_id, rhythm) VALUES (s, u, p, 'often');
  INSERT INTO public.ai_usage (user_id, day, calls) VALUES (u, current_date, 3);
  INSERT INTO public.user_settings (user_id, ai_consent, ai_consent_version) VALUES (u, true, 1);
END $$;
SELECT pg_temp.seed(:A);
SELECT pg_temp.seed(:B);

-- Every public table with user_id is covered by the seed (guards the test).
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns c
   JOIN information_schema.tables t USING (table_schema, table_name)
   WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND t.table_type = 'BASE TABLE'),
  8, 'all 8 user-owned tables are seeded by this test');

-- Users and anon can't call it.
SELECT tests.as_user(:A);
SELECT throws_ok(format('SELECT public.delete_user_account(%L)', :B), '42501', NULL,
  'a user cannot delete accounts (not even their own) through the API');
SELECT tests.reset_role();
SELECT tests.as_anon();
SELECT throws_ok(format('SELECT public.delete_user_account(%L)', :A), '42501', NULL,
  'anon cannot delete accounts');
SELECT tests.reset_role();

-- The service role deletes A.
SELECT tests.as_service();
SELECT is(
  (public.delete_user_account(:A) -> 'tables')::jsonb,
  '{"ai_usage": 1, "interactions": 1, "memories": 1, "persons": 1, "promises": 1, "season_commitments": 1, "seasons": 1, "user_settings": 1}'::jsonb,
  'returns what it removed from every table');
SELECT tests.reset_role();

SELECT is((SELECT count(*)::int FROM public.persons WHERE user_id = :A), 0, 'persons gone');
SELECT is((SELECT count(*)::int FROM public.memories WHERE user_id = :A), 0, 'memories gone');
SELECT is((SELECT count(*)::int FROM public.interactions WHERE user_id = :A), 0, 'interactions gone');
SELECT is((SELECT count(*)::int FROM public.promises WHERE user_id = :A), 0, 'promises gone');
SELECT is((SELECT count(*)::int FROM public.seasons WHERE user_id = :A), 0, 'seasons gone');
SELECT is((SELECT count(*)::int FROM public.season_commitments WHERE user_id = :A), 0, 'commitments gone');
SELECT is((SELECT count(*)::int FROM public.ai_usage WHERE user_id = :A), 0, 'ai usage gone');
SELECT is((SELECT count(*)::int FROM public.user_settings WHERE user_id = :A), 0, 'settings gone');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = :A), 0, 'auth user gone');
SELECT is((SELECT count(*)::int FROM auth.identities WHERE user_id = :A), 0, 'auth identities gone');
SELECT is((SELECT count(*)::int FROM auth.sessions WHERE user_id = :A), 0, 'auth sessions gone');

-- B is untouched.
SELECT is((SELECT count(*)::int FROM public.persons WHERE user_id = :B), 1, 'other user''s data untouched');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = :B), 1, 'other user''s account untouched');

-- Idempotent: deleting again finds nothing and doesn't fail.
SELECT tests.as_service();
SELECT is((public.delete_user_account(:A) ->> 'auth_user')::boolean, false, 'second deletion is a no-op');
SELECT tests.reset_role();

-- Structural: every user_id column references auth.users ON DELETE CASCADE.
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns c
   JOIN information_schema.tables t USING (table_schema, table_name)
   WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND t.table_type = 'BASE TABLE'
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint k
       WHERE k.conrelid = format('public.%I', c.table_name)::regclass
         AND k.contype = 'f' AND k.confrelid = 'auth.users'::regclass AND k.confdeltype = 'c')),
  0, 'every user_id column cascades from auth.users');

SELECT * FROM finish();
ROLLBACK;
