-- P0-13: adversarial cross-user isolation for every 1.0 table.
-- User A owns data; user B and anonymous visitors try to read, change,
-- forge and re-parent it.
BEGIN;
SELECT plan(37);

\set A '''aaaaaaaa-1111-1111-1111-111111111111'''
\set B '''bbbbbbbb-2222-2222-2222-222222222222'''

SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

-- A's data, created as A through the policies.
SELECT tests.as_user(:A);
INSERT INTO public.persons (id, user_id, name, relationship_type)
  VALUES ('00000000-0000-0000-0000-0000000000a1', :A, 'Maya', 'friend');
INSERT INTO public.memories (id, user_id, person_id, content)
  VALUES ('00000000-0000-0000-0000-0000000000a2', :A, '00000000-0000-0000-0000-0000000000a1', 'Lisbon');
INSERT INTO public.interactions (id, user_id, person_id, type)
  VALUES ('00000000-0000-0000-0000-0000000000a3', :A, '00000000-0000-0000-0000-0000000000a1', 'call');
INSERT INTO public.promises (id, user_id, person_id, text)
  VALUES ('00000000-0000-0000-0000-0000000000a4', :A, '00000000-0000-0000-0000-0000000000a1', 'Send the link');
INSERT INTO public.seasons (id, user_id, name, starts_at, ends_at)
  VALUES ('00000000-0000-0000-0000-0000000000a5', :A, 'Autumn', now(), now() + interval '30 days');
INSERT INTO public.season_commitments (id, season_id, user_id, person_id, rhythm)
  VALUES ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a5', :A,
          '00000000-0000-0000-0000-0000000000a1', 'often');
SELECT tests.reset_role();

-- ── B can't see any of A's rows ──────────────────────────────────────────
SELECT tests.as_user(:B);
SELECT is((SELECT count(*)::int FROM public.persons), 0, 'B sees no persons of A');
SELECT is((SELECT count(*)::int FROM public.memories), 0, 'B sees no memories of A');
SELECT is((SELECT count(*)::int FROM public.interactions), 0, 'B sees no interactions of A');
SELECT is((SELECT count(*)::int FROM public.promises), 0, 'B sees no promises of A');
SELECT is((SELECT count(*)::int FROM public.seasons), 0, 'B sees no seasons of A');
SELECT is((SELECT count(*)::int FROM public.season_commitments), 0, 'B sees no commitments of A');

-- ── B can't change or delete A's rows (0 rows affected) ─────────────────
UPDATE public.persons SET name = 'pwned';
UPDATE public.memories SET content = 'pwned';
UPDATE public.interactions SET note = 'pwned';
UPDATE public.promises SET text = 'pwned';
UPDATE public.seasons SET name = 'pwned';
UPDATE public.season_commitments SET rhythm = 'regularly';
DELETE FROM public.persons;
DELETE FROM public.memories;
DELETE FROM public.interactions;
DELETE FROM public.promises;
DELETE FROM public.seasons;
DELETE FROM public.season_commitments;

-- ── B can't forge rows owned by A ───────────────────────────────────────
SELECT throws_ok($$ INSERT INTO public.persons (user_id, name, relationship_type)
  VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'x', 'friend') $$, '42501', NULL,
  'B cannot create a person owned by A');
SELECT throws_ok($$ INSERT INTO public.seasons (user_id, name, starts_at, ends_at)
  VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'x', now(), now()) $$, '42501', NULL,
  'B cannot create a season owned by A');

-- ── Parent ownership: B can't attach own rows to A's person/season ──────
SELECT throws_ok($$ INSERT INTO public.memories (user_id, person_id, content)
  VALUES ('bbbbbbbb-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000a1', 'x') $$,
  '42501', NULL, 'B cannot attach a memory to A''s person');
SELECT throws_ok($$ INSERT INTO public.interactions (user_id, person_id, type)
  VALUES ('bbbbbbbb-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000a1', 'call') $$,
  '42501', NULL, 'B cannot attach an interaction to A''s person');
SELECT throws_ok($$ INSERT INTO public.promises (user_id, person_id, text)
  VALUES ('bbbbbbbb-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000a1', 'x') $$,
  '42501', NULL, 'B cannot attach a promise to A''s person');

-- B's own person and season, to test re-parenting and commitments.
INSERT INTO public.persons (id, user_id, name, relationship_type)
  VALUES ('00000000-0000-0000-0000-0000000000b1', :B, 'Ben', 'friend');
INSERT INTO public.seasons (id, user_id, name, starts_at, ends_at)
  VALUES ('00000000-0000-0000-0000-0000000000b5', :B, 'Mine', now(), now() + interval '1 day');
INSERT INTO public.memories (id, user_id, person_id, content)
  VALUES ('00000000-0000-0000-0000-0000000000b2', :B, '00000000-0000-0000-0000-0000000000b1', 'mine');
SELECT pass('B can still create rows attached to B''s own person');

SELECT throws_ok($$ UPDATE public.memories SET person_id = '00000000-0000-0000-0000-0000000000a1'
  WHERE id = '00000000-0000-0000-0000-0000000000b2' $$, '42501', NULL,
  'B cannot re-parent own memory onto A''s person');
SELECT throws_ok($$ INSERT INTO public.season_commitments (season_id, user_id, person_id, rhythm)
  VALUES ('00000000-0000-0000-0000-0000000000a5', 'bbbbbbbb-2222-2222-2222-222222222222',
          '00000000-0000-0000-0000-0000000000b1', 'often') $$, '42501', NULL,
  'B cannot commit to A''s season');
SELECT throws_ok($$ INSERT INTO public.season_commitments (season_id, user_id, person_id, rhythm)
  VALUES ('00000000-0000-0000-0000-0000000000b5', 'bbbbbbbb-2222-2222-2222-222222222222',
          '00000000-0000-0000-0000-0000000000a1', 'often') $$, '42501', NULL,
  'B cannot commit A''s person to B''s season');

-- ── B can't give own rows away by rewriting user_id ─────────────────────
SELECT throws_ok($$ UPDATE public.persons SET user_id = 'aaaaaaaa-1111-1111-1111-111111111111'
  WHERE id = '00000000-0000-0000-0000-0000000000b1' $$, '42501', NULL,
  'B cannot hand a person to A');
SELECT tests.reset_role();

-- ── A's data is untouched ───────────────────────────────────────────────
SELECT is((SELECT name FROM public.persons WHERE id = '00000000-0000-0000-0000-0000000000a1'), 'Maya', 'A''s person unchanged');
SELECT is((SELECT content FROM public.memories WHERE id = '00000000-0000-0000-0000-0000000000a2'), 'Lisbon', 'A''s memory unchanged');
SELECT is((SELECT note FROM public.interactions WHERE id = '00000000-0000-0000-0000-0000000000a3'), NULL, 'A''s interaction unchanged');
SELECT is((SELECT text FROM public.promises WHERE id = '00000000-0000-0000-0000-0000000000a4'), 'Send the link', 'A''s promise unchanged');
SELECT is((SELECT name FROM public.seasons WHERE id = '00000000-0000-0000-0000-0000000000a5'), 'Autumn', 'A''s season unchanged');
SELECT is((SELECT rhythm FROM public.season_commitments WHERE id = '00000000-0000-0000-0000-0000000000a6'), 'often', 'A''s commitment unchanged');
SELECT is((SELECT count(*)::int FROM public.persons WHERE user_id = :A), 1, 'A''s person not deleted');
SELECT is((SELECT count(*)::int FROM public.memories WHERE user_id = :A), 1, 'A''s memory not deleted');

-- ── Anonymous visitors see nothing ───────────────────────────────────────
SELECT tests.as_anon();
SELECT is((SELECT count(*)::int FROM public.persons), 0, 'anon sees no persons');
SELECT is((SELECT count(*)::int FROM public.memories), 0, 'anon sees no memories');
SELECT is((SELECT count(*)::int FROM public.interactions), 0, 'anon sees no interactions');
SELECT is((SELECT count(*)::int FROM public.promises), 0, 'anon sees no promises');
SELECT is((SELECT count(*)::int FROM public.seasons), 0, 'anon sees no seasons');
SELECT is((SELECT count(*)::int FROM public.season_commitments), 0, 'anon sees no commitments');
SELECT throws_ok($$ INSERT INTO public.persons (user_id, name, relationship_type)
  VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'x', 'friend') $$, '42501', NULL,
  'anon cannot insert');
SELECT tests.reset_role();

-- ── Structural guarantees (so new tables can't silently regress) ─────────
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND 'public' = ANY (roles)),
  0, 'no policy applies to the PUBLIC role (anon included)');
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public'
     AND (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.uid\(\)'
     AND (coalesce(qual, '') || coalesce(with_check, '')) !~ 'SELECT auth\.uid\(\)'),
  0, 'every policy evaluates auth.uid() once per statement');
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public'
     AND cmd IN ('UPDATE', 'ALL') AND with_check IS NULL),
  0, 'every UPDATE/ALL policy has an explicit WITH CHECK');
SELECT is(has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE'), false,
  'anon cannot execute rls_auto_enable');
SELECT is(has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE'), false,
  'authenticated cannot execute rls_auto_enable');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity),
  0, 'every public table has RLS enabled');

SELECT * FROM finish();
ROLLBACK;
