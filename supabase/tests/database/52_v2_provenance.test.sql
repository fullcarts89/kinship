-- Checkpoint A: provenance (plan §6). A memory is durable only with a source;
-- a capture source points at real text; captured text is never rewritten;
-- deleting a capture removes exactly the memories it alone supported.
BEGIN;
SELECT plan(22);

\set A '''aaaaaaaa-1212-1212-1212-121212121212'''
SELECT tests.create_user(:A);

-- Runs a statement, then forces the commit-time (deferred) checks.
CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001201', 'Ben');
INSERT INTO public.captures (id, source, raw_text)
  VALUES ('00000000-0000-0000-0000-000000001202', 'text',
          'Ben runs Chicago Sunday. He''s hoping to break four hours.');

-- ── An item needs a source by commit time ──────────────────────────────
SELECT throws_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.memory_items (kind, person_id, statement, detail, origin, user_state)
  VALUES ('fact', '00000000-0000-0000-0000-000000001201', 'Ben runs', '{"category": "interest"}',
          'user', 'user_authored') $s$) $$,
  '23514', NULL, 'a memory item with no source is rejected at commit');

-- Item and source in either order within one transaction is fine.
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state)
  VALUES ('00000000-0000-0000-0000-000000001203', 'event', '00000000-0000-0000-0000-000000001201',
          'Ben runs the Chicago Marathon on Sunday',
          '{"date": "2026-10-11", "date_precision": "day", "event_type": "race",
            "followup_policy": "after", "goal": "under four hours"}', 'user', 'user_authored');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000001202', 'capture', 0, 23);
  $s$) $$, 'an item written with its source passes the commit check');

SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001203'),
  'Ben runs Chicago Sunday', 'the source quote is taken from the capture span by the server');

-- ── Spans must be real ──────────────────────────────────────────────────
SELECT throws_ok($$ INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000001202', 'capture', 10, 999) $$,
  '23514', NULL, 'a span outside the capture text is rejected');
SELECT throws_ok($$ INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000001202', 'capture', 5, 5) $$,
  '23514', NULL, 'an empty span is rejected');
SELECT throws_ok($$ INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind)
  VALUES ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000001202', 'capture') $$,
  '23514', NULL, 'a capture source without a span is rejected');
SELECT throws_ok($$ INSERT INTO public.memory_item_sources (memory_item_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-000000001203', 'capture', 0, 3) $$,
  '23514', NULL, 'a capture source must name its capture');

-- ── The last live source can't be removed from a live item ─────────────
SELECT throws_ok($$ SELECT pg_temp.at_commit($s$
  UPDATE public.memory_item_sources SET deleted_at = now()
  WHERE memory_item_id = '00000000-0000-0000-0000-000000001203' $s$) $$,
  '23514', NULL, 'removing an item''s only source is rejected at commit');

-- ── Captured text is never rewritten ────────────────────────────────────
SELECT throws_ok($$ UPDATE public.captures SET raw_text = 'Ben runs Boston Sunday.'
  WHERE id = '00000000-0000-0000-0000-000000001202' $$,
  '42501', NULL, 'captured text cannot be rewritten');

-- ── Server-derived fields are the server's ──────────────────────────────
SELECT throws_ok($$ INSERT INTO public.captures (source, raw_text, status) VALUES ('text', 'x', 'extracted') $$,
  '42501', NULL, 'the app cannot create a capture already marked extracted');
SELECT throws_ok($$ UPDATE public.captures SET status = 'extracted' $$,
  '42501', NULL, 'the app cannot set extraction status');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, statement, detail, origin)
  VALUES ('fact', '00000000-0000-0000-0000-000000001201', 'x', '{"category": "other"}', 'extracted') $$,
  '42501', NULL, 'the app cannot write items claiming to be AI extractions');
SELECT throws_ok($$ UPDATE public.memory_items SET extraction_confidence = 0.99 $$,
  '42501', NULL, 'the app cannot set an extraction confidence');

-- ── Two sources, then the capture is deleted ────────────────────────────
-- A second item backed only by the capture, and an edit adding a second
-- source (user_edit) to the first item.
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state)
  VALUES ('00000000-0000-0000-0000-000000001204', 'thread', '00000000-0000-0000-0000-000000001201',
          'Ben hopes to break four hours', '{"topic": "marathon goal", "followup_after_days": 3}',
          'user', 'user_authored');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-000000001204', '00000000-0000-0000-0000-000000001202', 'capture', 25, 56);
  INSERT INTO public.memory_item_sources (memory_item_id, source_kind)
  VALUES ('00000000-0000-0000-0000-000000001203', 'user_edit');
  UPDATE public.memory_items SET user_state = 'edited', statement = 'Ben runs the Chicago Marathon on Sunday, Oct 11'
  WHERE id = '00000000-0000-0000-0000-000000001203';
  $s$) $$, 'a second item and a user edit are recorded');

SELECT is((SELECT count(*)::int FROM public.memory_item_history WHERE memory_item_id = '00000000-0000-0000-0000-000000001203'),
  1, 'the edit kept the previous version for Undo');

-- Purge the capture text (retention "delete after extraction").
UPDATE public.captures SET raw_text = NULL WHERE id = '00000000-0000-0000-0000-000000001202';
SELECT ok((SELECT raw_text IS NULL AND raw_text_purged_at IS NOT NULL FROM public.captures),
  'capture text can be purged');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001204'),
  'He''s hoping to break four hours', 'quotes survive the purge, so the Source view still works');
SELECT throws_ok($$ UPDATE public.captures SET raw_text = 'restored' $$,
  '42501', NULL, 'purged text cannot be put back');

-- Delete the capture.
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  UPDATE public.captures SET deleted_at = now() WHERE id = '00000000-0000-0000-0000-000000001202' $s$) $$,
  'deleting the capture passes the commit check');
SELECT ok((SELECT deleted_at IS NOT NULL FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001204'),
  'an item whose only source was the capture is deleted with it');
SELECT ok((SELECT deleted_at IS NULL FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001203'),
  'an item with another source (the user''s edit) survives');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources
           WHERE memory_item_id = '00000000-0000-0000-0000-000000001203' AND deleted_at IS NULL),
  1, 'it keeps only the user-edit source');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
