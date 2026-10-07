-- Gate 0, Final Trust Closure (founder round 4, CC-18): what the database
-- already allows the app to do, with no migration. Removing someone from
-- People is a soft archive the user can undo (I3), a shared memory can stay
-- with the others while still naming the removed person, a rename keeps the
-- earlier name (I12), and several people can share one memory (I11).
BEGIN;
SELECT plan(10);

\set A '''aaaaaaaa-6464-6464-6464-646464646464'''
SELECT tests.create_user(:A);

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, relationship_label) VALUES
  ('00000000-0000-0000-0000-000000006401', 'Kaiya', 'daughter'),
  ('00000000-0000-0000-0000-000000006402', 'Ben', NULL),
  ('00000000-0000-0000-0000-000000006403', 'Wifey Liu', 'wife');
INSERT INTO public.captures (id, source, raw_text, time_zone) VALUES
  ('00000000-0000-0000-0000-000000006410', 'text', 'Kaiya and Ben went to the zoo.', 'America/Los_Angeles');
SELECT tests.reset_role();
INSERT INTO public.memory_items (id, user_id, kind, person_id, statement, certainty, detail, origin, extraction_confidence, with_person_ids) VALUES
  ('00000000-0000-0000-0000-000000006420', :A, 'moment', '00000000-0000-0000-0000-000000006401', 'Kaiya and Ben went to the zoo', 'stated',
   '{}', 'extracted', 0.9, ARRAY['00000000-0000-0000-0000-000000006402']::uuid[]),
  ('00000000-0000-0000-0000-000000006421', :A, 'thread', '00000000-0000-0000-0000-000000006401', 'Kaiya is learning to swim', 'stated',
   '{"topic": "learning to swim", "followup_after_days": 42}', 'extracted', 0.9, '{}');
INSERT INTO public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end) VALUES
  (:A, '00000000-0000-0000-0000-000000006420', '00000000-0000-0000-0000-000000006410', 'capture', 0, 29);
INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key) VALUES
  ('00000000-0000-0000-0000-000000006430', :A, '00000000-0000-0000-0000-000000006401', 'thread', now(), now() + interval '7 days', 'gate0-kaiya');

-- I3: removing is the user's own soft archive, never a delete.
SELECT tests.as_user(:A);
SELECT lives_ok($$ UPDATE public.people SET state = 'archived', version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006401' $$,
  'the user can remove someone from People (archive)');
SELECT tests.reset_role();
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006430'), 'suppressed',
  'their open reasons are suppressed: nothing about them comes back on Today');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE person_id = '00000000-0000-0000-0000-000000006401' AND deleted_at IS NULL), 2,
  'nothing about them is deleted');

-- The shared memory stays with Ben, still naming Kaiya for when she comes back.
SELECT tests.as_user(:A);
SELECT lives_ok($$ UPDATE public.memory_items SET person_id = '00000000-0000-0000-0000-000000006402', version = version + 1,
    with_person_ids = ARRAY['00000000-0000-0000-0000-000000006401']::uuid[]
  WHERE id = '00000000-0000-0000-0000-000000006420' $$,
  'a shared memory can be filed on someone still here and stay shared with the removed person');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000006420'), 1,
  'its source is untouched');

-- Bring back: the same person.
SELECT lives_ok($$ UPDATE public.people SET state = 'active', version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006401' $$, 'Bring back');
SELECT is((SELECT relationship_label FROM public.people WHERE id = '00000000-0000-0000-0000-000000006401'), 'daughter',
  'the same person, relationship and all');

-- I12: a rename keeps the earlier name as another name they go by.
SELECT lives_ok($$ UPDATE public.people SET version = version + 1, display_name = 'Cutie Pie', full_name = 'Cutie Pie', nicknames = ARRAY['Wifey Liu', 'Wifey']
  WHERE id = '00000000-0000-0000-0000-000000006403' $$, 'a rename keeps the earlier names');
SELECT throws_ok($$ UPDATE public.people SET version = version + 1, nicknames = ARRAY['a','b','c','d','e','f','g','h','i','j','k']
  WHERE id = '00000000-0000-0000-0000-000000006403' $$, '23514', NULL, 'at most ten other names');

-- I11: several people on one memory, never the filed person twice.
SELECT throws_ok($$ UPDATE public.memory_items SET version = version + 1, with_person_ids = ARRAY['00000000-0000-0000-0000-000000006402']::uuid[]
  WHERE id = '00000000-0000-0000-0000-000000006420' $$, '23514', NULL, 'the person it is filed on is never also in with_person_ids');

SELECT * FROM finish();
ROLLBACK;
