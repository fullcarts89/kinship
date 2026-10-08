-- Founder N8 (CC-20: a trust invariant): Undo and "Not this" are exact. A
-- note that closed an open thread opens it again when it's taken back, and
-- a Today reason silenced because its memory was replaced speaks again once
-- the memory is back. Only the gateway's write records what a note closed.
BEGIN;
SELECT plan(15);

\set A '''aaaaaaaa-6666-6666-6666-666666666666'''
SELECT tests.create_user(:A);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

CREATE FUNCTION pg_temp.state(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT status || '/' || CASE WHEN deleted_at IS NULL THEN 'live' ELSE 'gone' END
    FROM public.memory_items WHERE id = item
$$;

-- "Ben got the job" closing the open thread, as the gateway writes it.
CREATE FUNCTION pg_temp.resolve(capture uuid) RETURNS void LANGUAGE sql AS $$
  SELECT pg_temp.at_commit(format($s$ SELECT public.write_extraction(
    'aaaaaaaa-6666-6666-6666-666666666666', %L, 'relationship_extract/v6+claude-opus-5-5', false,
    '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000006601", "subject_type": "person", "related": null,
       "statement": "Ben got the job", "certainty": "stated", "sensitivity": "none", "confidence": 0.9,
       "detail": {"category": "work"}, "spans": [{"start": 0, "end": 15}],
       "action": {"type": "resolves", "target_id": "00000000-0000-0000-0000-000000006620"}}]') $s$, capture));
$$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000006601', 'Ben');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000006610', 'text', 'Ben got the job!'),
  ('00000000-0000-0000-0000-000000006611', 'text', 'Ben got the job!!'),
  ('00000000-0000-0000-0000-000000006612', 'text', 'Ben runs Chicago Sunday.');
SELECT tests.reset_role();
-- The open thread a later note closes.
INSERT INTO public.memory_items (id, user_id, kind, person_id, statement, certainty, detail, origin, extraction_confidence) VALUES
  ('00000000-0000-0000-0000-000000006620', :A, 'thread', '00000000-0000-0000-0000-000000006601',
   'Ben is waiting to hear about the job', 'tentative', '{"topic": "the job", "followup_after_days": 42}', 'extracted', 0.9);
INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind)
  VALUES (:A, '00000000-0000-0000-0000-000000006620', 'user_edit');

-- ── A resolved thread opens again when the note is taken back ──
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006610'), 'claimed', 'claimed');
SELECT pg_temp.resolve('00000000-0000-0000-0000-000000006610');
SELECT is((SELECT resolves_id FROM public.memory_items WHERE statement = 'Ben got the job' AND deleted_at IS NULL),
  '00000000-0000-0000-0000-000000006620'::uuid, 'the new item records the thread it closed');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006620'), 'resolved/live', 'the thread is closed');
SELECT tests.reset_role();

-- Undo: the note goes, with what came from it.
SELECT tests.as_user(:A);
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006610';
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE statement = 'Ben got the job' AND deleted_at IS NULL), 0,
  'Undo takes the new item with its note');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006620'), 'active/live', 'and the thread is open again, as it was');
SELECT tests.reset_role();

-- "Not this" on the line that closed it: the same.
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006611'), 'claimed', 'claimed again');
SELECT pg_temp.resolve('00000000-0000-0000-0000-000000006611');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006620'), 'resolved/live', 'closed again');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE statement = 'Ben got the job' AND deleted_at IS NULL;
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006620'), 'active/live', '"Not this" opens the thread again');

-- ── Only the gateway records what a note closed ──
SELECT throws_ok($$ INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state, resolves_id)
                     VALUES ('00000000-0000-0000-0000-000000006630', 'fact', '00000000-0000-0000-0000-000000006601',
                             'Ben got the job', '{"category": "work"}', 'user', 'user_authored',
                             '00000000-0000-0000-0000-000000006620') $$,
  '42501', NULL, 'the app cannot write a line that closes a thread');
SELECT throws_ok($$ UPDATE public.memory_items SET resolves_id = '00000000-0000-0000-0000-000000006620', version = version + 1
                     WHERE id = '00000000-0000-0000-0000-000000006620' $$,
  '42501', NULL, 'nor set it on an existing one');
SELECT tests.reset_role();

-- ── A Today reason silenced by a replacement speaks again after Undo ──
CREATE FUNCTION pg_temp.remember(item uuid, statement text, detail jsonb, supersedes uuid DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  SELECT public.write_memory_item(
    jsonb_build_object('id', item, 'kind', 'event', 'person_id', '00000000-0000-0000-0000-000000006601',
                       'statement', statement, 'origin', 'user', 'user_state', 'user_authored', 'detail', detail,
                       'supersedes_id', supersedes),
    jsonb_build_array(jsonb_build_object('source_kind', 'capture', 'capture_id', '00000000-0000-0000-0000-000000006612',
                                         'span_start', 0, 'span_end', 4)));
$$;
SELECT tests.as_user(:A);
-- Ben's race Sunday Oct 11 (a follow-up Mon–Tue), and Josh-free: one reason.
SELECT pg_temp.remember('00000000-0000-0000-0000-000000006640', 'Ben runs Chicago Sunday',
  '{"date": "2026-10-11", "date_precision": "day", "event_type": "race", "followup_policy": "after"}');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.reasons_refresh(:A, '2026-10-08', 'America/Chicago'), 1, 'the race makes its follow-up');
SELECT tests.reset_role();
CREATE TEMP TABLE first_reason AS SELECT id FROM public.reasons WHERE user_id = :A;
GRANT SELECT ON first_reason TO PUBLIC;
-- Replaced (say, "the race moved to Saturday" told badly), then taken back.
SELECT tests.as_user(:A);
SELECT pg_temp.remember('00000000-0000-0000-0000-000000006641', 'Ben runs Chicago Saturday',
  '{"date": "2026-10-10", "date_precision": "day", "event_type": "race", "followup_policy": "after"}',
  '00000000-0000-0000-0000-000000006640');
SELECT is((SELECT state FROM public.reasons WHERE id = (SELECT id FROM first_reason)), 'suppressed',
  'replacing the race silences its reason');
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006641';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006640'), 'active/live', '"Not this" brings the race back');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT public.reasons_refresh(:A, '2026-10-08', 'America/Chicago');
SELECT is((SELECT state FROM public.reasons WHERE id = (SELECT id FROM first_reason)), 'candidate',
  'and the next refresh opens the same reason again');
SELECT tests.reset_role();

-- A reason the user put aside stays put aside.
SELECT tests.as_user(:A);
INSERT INTO public.reason_events (reason_id, event, surface)
  SELECT id, 'dismissed_not_now', 'today' FROM first_reason;
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT public.reasons_refresh(:A, '2026-10-08', 'America/Chicago');
SELECT is((SELECT state FROM public.reasons WHERE id = (SELECT id FROM first_reason)), 'dismissed',
  'a refresh never reopens what the user dismissed');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
