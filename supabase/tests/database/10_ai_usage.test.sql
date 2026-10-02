-- P0-01: the per-user AI quota can't be bypassed or reset by its owner.
BEGIN;
SELECT plan(12);

SELECT tests.create_user('11111111-1111-1111-1111-111111111111');
SELECT tests.create_user('22222222-2222-2222-2222-222222222222');

-- Anonymous visitors (anon key, no user) can't spend or read quota.
SELECT tests.as_anon();
SELECT throws_ok($$ SELECT public.consume_ai_call(50) $$, '42501', NULL,
  'anon role cannot execute consume_ai_call');
SELECT throws_ok($$ SELECT * FROM public.ai_usage $$, '42501', NULL,
  'anon role cannot read ai_usage');
SELECT tests.reset_role();

-- Anonymous sign-ins are refused even with the authenticated role.
SELECT tests.as_user('22222222-2222-2222-2222-222222222222', true);
SELECT throws_ok($$ SELECT public.consume_ai_call(50) $$, '42501',
  'consume_ai_call requires a signed-in user', 'anonymous sign-ins are refused');
SELECT tests.reset_role();

-- A signed-in user gets exactly daily_limit calls.
SELECT tests.as_user('11111111-1111-1111-1111-111111111111');
SELECT ok(public.consume_ai_call(3), 'call 1 of 3 allowed');
SELECT ok(public.consume_ai_call(3), 'call 2 of 3 allowed');
SELECT ok(public.consume_ai_call(3), 'call 3 of 3 allowed');
SELECT is(public.consume_ai_call(3), false, 'call 4 of 3 refused');
SELECT is((SELECT calls FROM public.ai_usage), 3, 'counter stops at the limit');

-- The owner can't reset or forge their counter through the API.
SELECT throws_ok($$ UPDATE public.ai_usage SET calls = 0 $$, '42501', NULL,
  'user cannot reset their own counter');
SELECT throws_ok($$ DELETE FROM public.ai_usage $$, '42501', NULL,
  'user cannot delete their own counter');
SELECT throws_ok(
  $$ INSERT INTO public.ai_usage (user_id, day, calls)
     VALUES ('11111111-1111-1111-1111-111111111111', current_date + 1, 0) $$,
  '42501', NULL, 'user cannot insert counter rows');
SELECT tests.reset_role();

-- Another user can't see the first user's usage.
SELECT tests.as_user('22222222-2222-2222-2222-222222222222');
SELECT is((SELECT count(*)::int FROM public.ai_usage), 0, 'users only see their own usage');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
