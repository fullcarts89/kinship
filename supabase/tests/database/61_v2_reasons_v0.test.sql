-- Phase 2: reasons v0. Upcoming-event and event-follow-up candidates come
-- only from the user's own exact-day, non-sensitive events about an active
-- person; windows follow plan §13; a refresh is idempotent, suppresses what
-- its evidence no longer supports, expires what has passed, and touches only
-- the caller's own reasons.
BEGIN;
SELECT plan(22);

\set A '''aaaaaaaa-6161-6161-6161-616161616161'''
\set B '''bbbbbbbb-6161-6161-6161-616161616161'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.event(item uuid, capture uuid, person uuid, statement text, detail jsonb,
                              sensitivity text DEFAULT 'none')
RETURNS void LANGUAGE sql AS $$
  SELECT public.write_memory_item(
    jsonb_build_object('id', item, 'kind', 'event', 'person_id', person, 'statement', statement, 'origin', 'user',
                       'user_state', 'user_authored', 'detail', detail, 'sensitivity', sensitivity),
    jsonb_build_array(jsonb_build_object('source_kind', 'capture', 'capture_id', capture, 'span_start', 0, 'span_end', 4)));
$$;

CREATE FUNCTION pg_temp.reasons(who uuid) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(type || '@' || (window_start AT TIME ZONE 'America/Chicago')::date || '..'
                              || ((window_end AT TIME ZONE 'America/Chicago')::date - 1) || '/' || state, ', '
                              ORDER BY type, window_start), '')
    FROM public.reasons WHERE user_id = who
$$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000006101', 'Ben'),
  ('00000000-0000-0000-0000-000000006102', 'Sarah'),
  ('00000000-0000-0000-0000-000000006103', 'Josh');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000006110', 'text', 'Ben runs Chicago Sunday.');
-- Ben's race, Sunday Oct 11: a follow-up the day after.
SELECT pg_temp.event('00000000-0000-0000-0000-000000006120', '00000000-0000-0000-0000-000000006110',
  '00000000-0000-0000-0000-000000006101', 'Ben runs Chicago Sunday',
  '{"date": "2026-10-11", "date_precision": "day", "event_type": "race", "followup_policy": "after"}');
-- Josh's interview, Tuesday Oct 13: before and after.
SELECT pg_temp.event('00000000-0000-0000-0000-000000006121', '00000000-0000-0000-0000-000000006110',
  '00000000-0000-0000-0000-000000006103', 'Josh has his interview Tuesday',
  '{"date": "2026-10-13", "date_precision": "day", "event_type": "interview", "followup_policy": "both"}');
-- Sarah's surgery: sensitive, never a v0 reason.
SELECT pg_temp.event('00000000-0000-0000-0000-000000006122', '00000000-0000-0000-0000-000000006110',
  '00000000-0000-0000-0000-000000006102', 'Sarah has surgery Thursday',
  '{"date": "2026-10-15", "date_precision": "day", "event_type": "surgery", "followup_policy": "both"}', 'health');
-- A coarse date: never a reason (it would have to guess the day).
SELECT pg_temp.event('00000000-0000-0000-0000-000000006123', '00000000-0000-0000-0000-000000006110',
  '00000000-0000-0000-0000-000000006102', 'Sarah moves sometime in October',
  '{"date": "2026-10-01", "date_precision": "month", "event_type": "move", "followup_policy": "after"}');
-- Josh's move Oct 20: follow-up 3–7 days after (outside the first week's horizon).
SELECT pg_temp.event('00000000-0000-0000-0000-000000006124', '00000000-0000-0000-0000-000000006110',
  '00000000-0000-0000-0000-000000006103', 'Josh moves to Denver on the 20th',
  '{"date": "2026-10-20", "date_precision": "day", "event_type": "move", "followup_policy": "after"}');
SELECT tests.reset_role();

-- Clients can't run the engine for anyone; only the service role and the caller's own wrapper.
SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT public.reasons_refresh('aaaaaaaa-6161-6161-6161-616161616161', '2026-10-08', 'UTC') $$,
  '42501', NULL, 'the engine itself is not callable by a signed-in user');
SELECT tests.reset_role();

SELECT tests.as_service();
SELECT is(public.reasons_refresh(:A, '2026-10-08', 'America/Chicago'), 3, 'Thursday Oct 8: three reasons open within the week');
SELECT is(pg_temp.reasons(:A),
  'event_followup@2026-10-12..2026-10-13/candidate, event_followup@2026-10-14..2026-10-15/candidate, upcoming_event@2026-10-12..2026-10-12/candidate',
  'Ben''s race: follow-up Mon–Tue; Josh''s interview: the day before, and Wed–Thu after (his move''s follow-up opens later)');
SELECT is((SELECT count(*)::int FROM public.reasons r JOIN public.reason_evidence e ON e.reason_id = r.id
            WHERE r.user_id = :A), 3, 'every reason cites its event');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = '00000000-0000-0000-0000-000000006102'),
  0, 'nothing for Sarah: the surgery is sensitive and the move has only a month');
SELECT is(public.reasons_refresh(:A, '2026-10-08', 'America/Chicago'), 3, 'a second refresh is idempotent');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A), 3, 'no duplicates');

-- Windows land on local days in the user's zone.
SELECT is((SELECT window_start FROM public.reasons WHERE user_id = :A AND dedupe_key LIKE 'event_followup:%:2026-10-11'),
  '2026-10-12 00:00:00-05'::timestamptz, 'the follow-up opens at local midnight on Monday');
SELECT is((SELECT window_end FROM public.reasons WHERE user_id = :A AND dedupe_key LIKE 'event_followup:%:2026-10-11'),
  '2026-10-14 00:00:00-05'::timestamptz, 'and closes at the end of Tuesday');

-- Monday Oct 12: the same three; Josh's move (follow-up from the 23rd) is still beyond the week.
SELECT is(public.reasons_refresh(:A, '2026-10-12', 'America/Chicago'), 3, 'Monday: three open');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND dedupe_key LIKE '%:2026-10-20'), 0,
  'a follow-up more than a week out isn''t created yet');
-- Wednesday Oct 14: the race follow-up and the day-before have passed.
SELECT is(public.reasons_refresh(:A, '2026-10-14', 'America/Chicago'), 1, 'Wednesday: only the interview follow-up is open');
SELECT is((SELECT string_agg(state, ',' ORDER BY state) FROM public.reasons WHERE user_id = :A), 'candidate,expired,expired',
  'passed windows expire');
SELECT tests.reset_role();

-- The user moves the interview: the old reason is suppressed, a new one appears.
SELECT tests.as_user(:A);
UPDATE public.memory_items SET detail = detail || '{"date": "2026-10-16"}', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006121';
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.reasons_refresh(:A, '2026-10-14', 'America/Chicago'), 2, 'a new date: the day-before and the follow-up for Friday');
SELECT is((SELECT state FROM public.reasons WHERE user_id = :A AND dedupe_key LIKE 'event_followup:%:2026-10-13'),
  'suppressed', 'the reason for the old date no longer speaks');
SELECT tests.reset_role();

-- "Not this" on the event: its open reasons are suppressed at once (existing trigger).
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006121';
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND state IN ('candidate', 'surfaced')), 0,
  'retracting the event suppresses its reasons');
SELECT tests.reset_role();

-- A paused person gets nothing.
SELECT tests.as_user(:A);
UPDATE public.people SET state = 'paused', version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006103';
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.reasons_refresh(:A, '2026-10-24', 'America/Chicago'), 0, 'no reason for a paused person''s move');
SELECT tests.reset_role();

-- The caller's wrapper: only their own reasons, today in their zone.
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000006131', 'Maya');
INSERT INTO public.captures (id, source, raw_text) VALUES ('00000000-0000-0000-0000-000000006132', 'text', 'Maya flies home tomorrow.');
SELECT pg_temp.event('00000000-0000-0000-0000-000000006133', '00000000-0000-0000-0000-000000006132',
  '00000000-0000-0000-0000-000000006131', 'Maya flies home tomorrow',
  jsonb_build_object('date', (now() AT TIME ZONE 'UTC')::date + 1, 'date_precision', 'day', 'event_type', 'trip',
                     'followup_policy', 'both'));
SELECT is(public.refresh_my_reasons('Not/AZone'), 2, 'an unknown zone falls back to UTC; the caller gets their own two');
SELECT is((SELECT count(*)::int FROM public.reasons), 2, 'RLS: the caller sees only their own reasons');
SELECT throws_ok($$ INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
                    VALUES ('bbbbbbbb-6161-6161-6161-616161616161', '00000000-0000-0000-0000-000000006131', 'promise', now(), now(), 'x') $$,
  '42501', NULL, 'and still can''t write reasons directly');
SELECT tests.reset_role();
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A), 5, 'the other user''s reasons are untouched');

SELECT tests.as_anon();
SELECT throws_ok($$ SELECT public.refresh_my_reasons('UTC') $$, '42501', NULL, 'anonymous callers can''t refresh');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
