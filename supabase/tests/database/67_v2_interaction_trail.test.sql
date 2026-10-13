-- Phase 4A step 5 (founder I2, N6; migration 20261013090000): what a
-- confirmed conversation was about and which Moment led to it; a Yes to a
-- Moment made on the phone is a return check; "Video" is its own channel;
-- and "Not yet" lets an acted reason speak again while its window is open,
-- never one done, put aside, expired or past its window.
BEGIN;
SELECT plan(23);

\set A '''aaaaaaaa-6767-6767-6767-676767676767'''
\set B '''bbbbbbbb-6767-6767-6767-676767676767'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

SELECT has_column('public', 'contact_events', 'memory_item_id', 'a contact can say what it was about');
SELECT has_column('public', 'contact_events', 'moment_type', 'a contact can say which kind of Moment led to it');
SELECT col_is_null('public', 'contact_events', 'memory_item_id', 'what it was about is optional (a manual entry has none)');

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000006701', 'Tyler');
INSERT INTO public.people (id, display_name, birthday, birthday_source) VALUES
  ('00000000-0000-0000-0000-000000006702', 'Ben', '1990-10-14', 'contacts');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000006710', 'text', 'Tyler said he''d send me his contractor''s number Friday.');
SELECT public.write_memory_item(
  jsonb_build_object('id', '00000000-0000-0000-0000-000000006720', 'kind', 'promise', 'subject_type', 'person',
                     'person_id', '00000000-0000-0000-0000-000000006701',
                     'statement', 'Tyler promised to send you his contractor''s number', 'origin', 'user',
                     'user_state', 'user_authored', 'detail', '{"due_date": "2026-10-09"}'::jsonb),
  jsonb_build_array(jsonb_build_object('source_kind', 'capture', 'capture_id', '00000000-0000-0000-0000-000000006710',
                                       'span_start', 0, 'span_end', 5)));

-- ── The trail's rows ────────────────────────────────────────────────────
SELECT lives_ok($$ INSERT INTO public.contact_events (id, person_id, channel, source, memory_item_id, moment_type)
  VALUES ('00000000-0000-0000-0000-000000006730', '00000000-0000-0000-0000-000000006701', 'text', 'return_check',
          '00000000-0000-0000-0000-000000006720', 'waiting') $$,
  'Yes to "Waiting on Tyler" (a Moment made on the phone): a return check about the promise, with no server reason');
SELECT throws_ok($$ INSERT INTO public.contact_events (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-000000006701', 'text', 'return_check') $$,
  '23514', NULL, 'a return check still names what it answered: a reason or a Moment');
SELECT throws_ok($$ INSERT INTO public.contact_events (person_id, channel, source, moment_type)
  VALUES ('00000000-0000-0000-0000-000000006701', 'text', 'return_check', 'reconnect_nudge') $$,
  '23514', NULL, 'only the Moments Kinship has');
SELECT lives_ok($$ INSERT INTO public.contact_events (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-000000006702', 'video', 'manual') $$,
  'a manual "Video" is its own channel');
SELECT lives_ok($$ INSERT INTO public.contact_events (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-000000006702', 'in_person', 'manual') $$,
  'a manual "In person", with nothing it was about and no Moment');
SELECT throws_ok($$ INSERT INTO public.contact_events (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-000000006702', 'telepathy', 'manual') $$,
  '23514', NULL, 'channels stay a closed list');
SELECT is((SELECT memory_item_id::text || '/' || moment_type FROM public.contact_events WHERE id = '00000000-0000-0000-0000-000000006730'),
  '00000000-0000-0000-0000-000000006720/waiting', 'what it was about and which Moment, as written');
SELECT tests.reset_role();

-- Another account can never point a contact at someone else's memory.
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000006703', 'Tyler');
SELECT throws_ok($$ INSERT INTO public.contact_events (person_id, channel, source, memory_item_id)
  VALUES ('00000000-0000-0000-0000-000000006703', 'text', 'manual', '00000000-0000-0000-0000-000000006720') $$,
  '23503', NULL, 'a contact names only its own account''s memory');
SELECT tests.reset_role();

-- The memory gone for good (the tombstone purge): the contact stays, about nothing.
DELETE FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000006720';
DELETE FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006720';
SELECT is((SELECT count(*)::int FROM public.contact_events WHERE id = '00000000-0000-0000-0000-000000006730' AND memory_item_id IS NULL),
  1, 'hard-deleting the memory keeps the contact and forgets only what it was about');

-- ── N6: "Not yet" ───────────────────────────────────────────────────────
-- Server-written reasons (birthdays need no evidence): one open now, one whose window has closed.
INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key) VALUES
  ('00000000-0000-0000-0000-000000006740', :A, '00000000-0000-0000-0000-000000006702', 'birthday', now() - interval '1 hour', now() + interval '1 day', 'n6-open'),
  ('00000000-0000-0000-0000-000000006741', :A, '00000000-0000-0000-0000-000000006702', 'birthday', now() - interval '3 days', now() - interval '1 day', 'n6-closed'),
  ('00000000-0000-0000-0000-000000006742', :A, '00000000-0000-0000-0000-000000006702', 'birthday', now() - interval '1 hour', now() + interval '1 day', 'n6-dismissed'),
  ('00000000-0000-0000-0000-000000006743', :A, '00000000-0000-0000-0000-000000006702', 'birthday', now() - interval '1 hour', now() + interval '1 day', 'n6-done'),
  ('00000000-0000-0000-0000-000000006744', :A, '00000000-0000-0000-0000-000000006702', 'birthday', now() - interval '1 hour', now() + interval '1 day', 'n6-expired');
UPDATE public.reasons SET state = 'expired' WHERE id = '00000000-0000-0000-0000-000000006744';

SELECT tests.as_user(:A);
INSERT INTO public.reason_events (reason_id, event, surface) VALUES ('00000000-0000-0000-0000-000000006740', 'shown', 'today');
INSERT INTO public.reason_events (reason_id, event, channel) VALUES ('00000000-0000-0000-0000-000000006740', 'acted', 'text');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006740'), 'acted', 'the hand-off: acted');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006740', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006740'), 'surfaced',
  'N6: "Not yet" lets it speak again while its window lasts (the phone shows it after a sync)');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006740', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006740'), 'surfaced', '"Not yet" twice: still one open reason');
INSERT INTO public.reason_events (reason_id, event, channel) VALUES ('00000000-0000-0000-0000-000000006740', 'acted', 'call');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006740', 'return_yes');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006740'), 'done', 'a later Yes makes it done');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006740', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006740'), 'done', 'a done reason never reopens, even on "Not yet"');

INSERT INTO public.reason_events (reason_id, event, channel) VALUES ('00000000-0000-0000-0000-000000006741', 'acted', 'text');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006741', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006741'), 'acted',
  'past its window, "Not yet" brings nothing back');

INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006742', 'dismissed_not_now');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006742', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006742'), 'dismissed', 'put aside stays put aside');

INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006743', 'return_yes');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006743', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006743'), 'done', 'done stays done');

INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006744', 'return_not_yet');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006744'), 'expired', 'expired stays expired');
SELECT tests.reset_role();

-- Someone else's "Not yet" never touches this account's reason.
INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key, state) VALUES
  ('00000000-0000-0000-0000-000000006745', :A, '00000000-0000-0000-0000-000000006702', 'birthday', now() - interval '1 hour', now() + interval '1 day', 'n6-other', 'acted');
SELECT tests.as_user(:B);
SELECT throws_ok($$ INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000006745', 'return_not_yet') $$,
  NULL, NULL, 'another account cannot write an event on this reason');
SELECT tests.reset_role();
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000006745'), 'acted', 'and it stays as it was');

SELECT * FROM finish();
ROLLBACK;
