-- "Got it right / Not quite" (20261007090000): on the owner's own note, a
-- fixed verdict and reason only, never content, never anyone else's note.
BEGIN;
SELECT plan(7);

\set A '''aaaaaaaa-6363-6363-6363-636363636363'''
\set B '''bbbbbbbb-6363-6363-6363-636363636363'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

SELECT tests.as_user(:A);
INSERT INTO public.captures (id, source, raw_text, time_zone) VALUES
  ('00000000-0000-0000-0000-000000006310', 'text', 'Tyler promised to send me his contractor''s number Friday.', 'America/Los_Angeles');

SELECT lives_ok($$ UPDATE public.captures SET feedback = '{"verdict": "right", "at": "2026-10-07T10:00:00Z"}', version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000006310' $$, 'the owner says it got it right');
SELECT lives_ok($$ UPDATE public.captures SET feedback = '{"verdict": "not_quite", "off": "wrong_person", "at": "2026-10-07T10:01:00Z"}', version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000006310' $$, 'or not quite, and what was off');
SELECT throws_ok($$ UPDATE public.captures SET feedback = '{"verdict": "not_quite", "off": "Tyler is my cousin", "at": "x"}', version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000006310' $$, '23514', NULL, 'never free text');
SELECT throws_ok($$ UPDATE public.captures SET feedback = '{"verdict": "right", "at": "x", "note": "anything"}', version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000006310' $$, '23514', NULL, 'never other fields');
SELECT throws_ok($$ UPDATE public.captures SET feedback = '{"verdict": "right", "off": "wrong_person", "at": "x"}', version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000006310' $$, '23514', NULL, 'a reason only with "not quite"');
SELECT tests.reset_role();

SELECT tests.as_user(:B);
UPDATE public.captures SET feedback = '{"verdict": "right", "at": "x"}', version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006310';
SELECT tests.reset_role();
SELECT is((SELECT feedback ->> 'off' FROM public.captures WHERE id = '00000000-0000-0000-0000-000000006310'), 'wrong_person',
  'nobody else can set it');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE user_id = :A), 0, 'feedback changes no memory');

SELECT * FROM finish();
ROLLBACK;
