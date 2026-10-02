-- P0-07: AI consent is server-side, defaults to off, versioned, revocable,
-- and only ever written by its owner.
BEGIN;
SELECT plan(15);

SELECT tests.create_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT tests.create_user('bbbbbbbb-0000-0000-0000-000000000002');

-- Default: no row, so no consent.
SELECT tests.as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is((SELECT count(*)::int FROM public.user_settings), 0, 'new user has no consent row');

-- A row created without consent defaults to off.
INSERT INTO public.user_settings DEFAULT VALUES;
SELECT is((SELECT ai_consent FROM public.user_settings), false, 'ai_consent defaults to false');

-- A grant must name the version the user saw.
SELECT throws_ok($$ SELECT public.set_ai_consent(true, NULL) $$, '22023', NULL,
  'grant without a version is refused');

SELECT is((public.set_ai_consent(true, 1)).ai_consent, true, 'grant recorded');
SELECT is((SELECT ai_consent_version FROM public.user_settings), 1, 'version recorded');
SELECT isnt((SELECT ai_consent_updated_at FROM public.user_settings), NULL, 'grant time recorded');

-- Revocation turns it off and keeps the version on record.
SELECT is((public.set_ai_consent(false, NULL)).ai_consent, false, 'revocation recorded');
SELECT is((SELECT ai_consent_version FROM public.user_settings), 1, 'version kept after revocation');

-- The owner can't delete their row through the API (it goes with the account).
SELECT throws_ok($$ DELETE FROM public.user_settings $$, '42501', NULL,
  'settings cannot be deleted by the owner directly');
SELECT tests.reset_role();

-- Another user can neither see nor change the first user's consent.
SELECT tests.as_user('bbbbbbbb-0000-0000-0000-000000000002');
SELECT is((SELECT count(*)::int FROM public.user_settings), 0, 'other users see nothing');
SELECT throws_ok(
  $$ UPDATE public.user_settings SET ai_consent = true
     WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', NULL, 'consent columns cannot be written directly (only through set_ai_consent)');
SELECT throws_ok(
  $$ INSERT INTO public.user_settings (user_id, ai_consent)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001', true) $$,
  '42501', NULL, 'cannot create a row for someone else');
SELECT tests.reset_role();
SELECT is((SELECT ai_consent FROM public.user_settings
           WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), false,
  'cross-user update changed nothing');

-- Anonymous visitors can't touch consent at all.
SELECT tests.as_anon();
SELECT throws_ok($$ SELECT public.set_ai_consent(true, 1) $$, '42501', NULL,
  'anon cannot call set_ai_consent');
SELECT throws_ok($$ SELECT * FROM public.user_settings $$, '42501', NULL,
  'anon cannot read settings');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
