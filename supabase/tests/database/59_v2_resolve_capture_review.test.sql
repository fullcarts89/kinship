-- Checkpoint D1 (C-2 resolve): the user's answer to a held extraction
-- becomes memory in one transaction, through the same write path as any
-- extraction, without a second model run; nothing is written twice, and
-- nothing is written for the wrong user, person, review or words.
BEGIN;
SELECT plan(31);

\set A '''aaaaaaaa-1919-1919-1919-191919191919'''
\set B '''bbbbbbbb-1919-1919-1919-191919191919'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, full_name) VALUES
  ('00000000-0000-0000-0000-000000001901', 'Sam', 'Sam Lee'),
  ('00000000-0000-0000-0000-000000001902', 'Sam', 'Samantha Diaz'),
  ('00000000-0000-0000-0000-000000001903', 'Sarah', 'Sarah Kim');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000001910', 'text', 'Sam is redoing his kitchen.'),
  ('00000000-0000-0000-0000-000000001912', 'text', 'Sam got the job!'),
  ('00000000-0000-0000-0000-000000001913', 'text', 'Sam is moving.'),
  ('00000000-0000-0000-0000-000000001914', 'text', 'Sarah left Google.'),
  ('00000000-0000-0000-0000-000000001915', 'text', 'Sam is learning to sail.'),
  ('00000000-0000-0000-0000-000000001916', 'text', 'Sam lost his keys.');
INSERT INTO public.captures (id, source, raw_text, retention) VALUES
  ('00000000-0000-0000-0000-000000001911', 'text', 'Maya graduated in 2024.', 'delete_after_extraction');
-- Sarah's job, written by the user themself: an answer never changes it.
SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001920", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001903",
    "statement": "Sarah works at Google", "origin": "user", "user_state": "user_authored", "detail": {"category": "work"}}',
  '[{"source_kind": "user_edit"}]');
SELECT tests.reset_role();
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001931', 'B''s Sam');
SELECT tests.reset_role();

-- A held item with its question, written with the extraction (as the gateway does).
CREATE FUNCTION pg_temp.hold(capture uuid, statement text, span_end int) RETURNS timestamptz LANGUAGE plpgsql AS $$
DECLARE t timestamptz;
BEGIN
  PERFORM public.claim_capture_extraction('aaaaaaaa-1919-1919-1919-191919191919', capture);
  PERFORM public.write_extraction_with_review('aaaaaaaa-1919-1919-1919-191919191919', capture,
    'relationship_extract/v5+claude-opus-5-5', true, '[]',
    jsonb_build_object('items', jsonb_build_array(jsonb_build_object(
      'kind', 'thread', 'person_id', NULL, 'new_person_name', NULL, 'subject_type', 'person', 'related', NULL,
      'statement', statement, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.7,
      'detail', jsonb_build_object('topic', statement, 'followup_after_days', 42),
      'spans', jsonb_build_array(jsonb_build_object('start', 0, 'end', span_end)),
      'action', jsonb_build_object('type', 'new', 'target_id', NULL), 'flags', jsonb_build_array('person_ambiguous'))),
      'clarification', jsonb_build_object('about', 'person', 'question', 'Which Sam do you mean?', 'options', jsonb_build_array('Sam', 'Sam', 'Someone else'))));
  SELECT created_at INTO t FROM public.capture_reviews WHERE capture_id = capture;
  RETURN t;
END $$;

-- The answered item, as the gateway's resolve.ts hands it over.
CREATE FUNCTION pg_temp.item(person text, kind text, statement text, quote text, detail jsonb,
                             action jsonb DEFAULT '{"type": "new", "target_id": null}') RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_array(jsonb_build_object(
    'kind', kind, 'person_id', person, 'subject_type', 'person', 'related', NULL, 'statement', statement,
    'detail', detail, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.7,
    'spans', jsonb_build_array(jsonb_build_object('start', 0, 'end', char_length(quote), 'quote', quote)),
    'action', action))
$$;

SELECT tests.as_service();
CREATE TEMP TABLE r (k text PRIMARY KEY, t timestamptz);
INSERT INTO r VALUES
  ('kitchen', pg_temp.hold('00000000-0000-0000-0000-000000001910', 'Sam is redoing his kitchen', 26)),
  ('maya', NULL),
  ('job', pg_temp.hold('00000000-0000-0000-0000-000000001912', 'Sam got the job', 15)),
  ('moving', pg_temp.hold('00000000-0000-0000-0000-000000001913', 'Sam is moving', 13)),
  ('sarah', pg_temp.hold('00000000-0000-0000-0000-000000001914', 'Sarah left Google', 17)),
  ('sail', pg_temp.hold('00000000-0000-0000-0000-000000001915', 'Sam is learning to sail', 23)),
  ('keys', pg_temp.hold('00000000-0000-0000-0000-000000001916', 'Sam lost his keys', 17));
SELECT tests.reset_role();

-- ── Only the gateway (service role) can resolve ──
SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT public.resolve_capture_review('aaaaaaaa-1919-1919-1919-191919191919',
  '00000000-0000-0000-0000-000000001910', now(), '[]', NULL) $$, '42501', NULL, 'the app cannot resolve a review itself');
SELECT tests.reset_role();

SELECT tests.as_service();

-- ── Which Sam? Sam Lee. ──
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001910', (SELECT t FROM r WHERE k = 'kitchen'),
  pg_temp.item('00000000-0000-0000-0000-000000001901', 'thread', 'Sam is redoing his kitchen', 'Sam is redoing his kitchen',
               '{"topic": "redoing his kitchen", "followup_after_days": 42}'), NULL) ->> 'status',
  'resolved', 'the answer is written');
SELECT is((SELECT row(person_id, kind, origin, user_state, extraction_confidence::text)::text FROM public.memory_items
             WHERE statement = 'Sam is redoing his kitchen'),
  '(00000000-0000-0000-0000-000000001901,thread,extracted,unreviewed,0.70)',
  'filed under the chosen Sam, as an unreviewed extraction like any other');
SELECT is((SELECT array_agg(s.quote) FROM public.memory_item_sources s JOIN public.memory_items i ON i.id = s.memory_item_id
             WHERE i.statement = 'Sam is redoing his kitchen'),
  ARRAY['Sam is redoing his kitchen'], 'with its source quote from the stored note');
SELECT is((SELECT row(status, extraction_version)::text FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001910'),
  '(extracted,relationship_extract/v5+claude-opus-5-5)', 'the capture is settled and still records what understood it');
SELECT is((SELECT count(*)::int FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001910'), 0,
  'the question is gone');

-- ── A retry after the reply was lost writes nothing twice ──
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001910', (SELECT t FROM r WHERE k = 'kitchen'),
  pg_temp.item('00000000-0000-0000-0000-000000001901', 'thread', 'Sam is redoing his kitchen', 'Sam is redoing his kitchen',
               '{"topic": "redoing his kitchen", "followup_after_days": 42}'), NULL) ->> 'status',
  'already_resolved', 'the same answer again is acknowledged');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE statement = 'Sam is redoing his kitchen'), 1, 'one memory, not two');

-- ── Never for another user ──
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001912', %L,
  pg_temp.item('00000000-0000-0000-0000-000000001931', 'thread', 'Sam got the job', 'Sam got the job', '{"topic": "the job", "followup_after_days": 42}'), NULL) $$,
  :B, (SELECT t FROM r WHERE k = 'job')),
  'P0002', NULL, 'another user cannot resolve A''s review');
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001912', %L,
  pg_temp.item('00000000-0000-0000-0000-000000001931', 'thread', 'Sam got the job', 'Sam got the job', '{"topic": "the job", "followup_after_days": 42}'), NULL) $$,
  :A, (SELECT t FROM r WHERE k = 'job')),
  '23503', NULL, 'an answer naming another user''s person is refused');
SELECT is((SELECT row((SELECT count(*) FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001912'),
                      (SELECT count(*) FROM public.memory_items WHERE statement = 'Sam got the job'))::text),
  '(1,0)', 'a refused answer leaves the question waiting and writes nothing');

-- ── Stale: the review changed since the user saw it ──
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001912', now() - interval '1 day',
  pg_temp.item('00000000-0000-0000-0000-000000001902', 'thread', 'Sam got the job', 'Sam got the job', '{"topic": "the job", "followup_after_days": 42}'), NULL) $$, :A),
  '40001', NULL, 'an answer to an older version of the review is refused');

-- ── The words must still be the note's words ──
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001912', %L,
  pg_temp.item('00000000-0000-0000-0000-000000001902', 'thread', 'Sam got the job', 'Sam got the JOB', '{"topic": "the job", "followup_after_days": 42}'), NULL) $$,
  :A, (SELECT t FROM r WHERE k = 'job')),
  '40001', NULL, 'a quote that no longer reads the same is asked again, never written');
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001912', %L,
  jsonb_set(pg_temp.item('00000000-0000-0000-0000-000000001902', 'thread', 'Sam got the job', 'Sam got the job', '{"topic": "the job", "followup_after_days": 42}'),
            '{0,spans}', '[{"start": 0, "end": 99, "quote": "Sam got the job"}]'), NULL) $$,
  :A, (SELECT t FROM r WHERE k = 'job')),
  '23514', NULL, 'a span outside the note is refused');

-- The same capture, answered properly: Samantha.
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001912', (SELECT t FROM r WHERE k = 'job'),
  pg_temp.item('00000000-0000-0000-0000-000000001902', 'thread', 'Sam got the job', 'Sam got the job', '{"topic": "the job", "followup_after_days": 42}'), NULL) ->> 'status',
  'resolved', 'after the refusals, a good answer still works');

-- ── A deleted note takes its question with it ──
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000001913';
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001913', %L,
  pg_temp.item('00000000-0000-0000-0000-000000001901', 'event', 'Sam is moving', 'Sam is moving',
               '{"event_type": "move", "followup_policy": "after", "date_precision": "unknown"}'), NULL) $$,
  :A, (SELECT t FROM r WHERE k = 'moving')),
  'P0002', NULL, 'a deleted capture cannot be resolved');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE statement = 'Sam is moving'), 0, '…and nothing is written for it');

-- ── A user-written item is never superseded through an answer ──
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001914', (SELECT t FROM r WHERE k = 'sarah'),
  pg_temp.item('00000000-0000-0000-0000-000000001903', 'fact', 'Sarah left Google', 'Sarah left Google', '{"category": "work"}',
               '{"type": "supersede", "target_id": "00000000-0000-0000-0000-000000001920"}'), NULL) -> 'items' -> 0 ->> 'action',
  'new', 'a supersede onto the user''s own words becomes a new item');
SELECT is((SELECT row(status, user_state)::text FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001920'),
  '(active,user_authored)', 'the user''s own item is untouched');
SELECT is((SELECT supersedes_id FROM public.memory_items WHERE statement = 'Sarah left Google'), NULL, 'nothing points at it');

-- ── Someone new, explicitly added; delete-after-extraction honoured ──
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001911');
SELECT public.write_extraction_with_review(:A, '00000000-0000-0000-0000-000000001911', 'relationship_extract/v5+claude-opus-5-5', true, '[]',
  '{"items": [{"kind": "milestone", "person_id": null, "new_person_name": "Maya", "subject_type": "person", "related": null,
     "statement": "Maya graduated in 2024", "certainty": "stated", "sensitivity": "none", "confidence": 0.9,
     "detail": {"milestone_type": "other", "anniversary": false, "date": "2024-01-01", "date_end": "2024-12-31", "date_precision": "year", "date_hint": "in 2024"},
     "spans": [{"start": 0, "end": 22}], "action": {"type": "new", "target_id": null}, "flags": ["new_person"]}],
    "clarification": {"about": "new_person", "question": "Is Maya someone new?", "options": ["Add Maya", "Someone already here"]}}');
UPDATE r SET t = (SELECT created_at FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001911') WHERE k = 'maya';
SELECT throws_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000001911', %L,
  pg_temp.item('new:0', 'milestone', 'Maya graduated in 2024', 'Maya graduated in 2024',
               '{"milestone_type": "other", "anniversary": false, "date": "2024-01-01", "date_end": "2024-12-31", "date_precision": "year", "date_hint": "in 2024"}'),
  '[{"ref": "new:0", "display_name": "Mallory"}]') $$, :A, (SELECT t FROM r WHERE k = 'maya')),
  '22023', NULL, 'a new person must be someone the note names');
SELECT is((SELECT count(*)::int FROM public.people WHERE display_name = 'Mallory'), 0, '…and no such person is created');
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001911', (SELECT t FROM r WHERE k = 'maya'),
  pg_temp.item('new:0', 'milestone', 'Maya graduated in 2024', 'Maya graduated in 2024',
               '{"milestone_type": "other", "anniversary": false, "date": "2024-01-01", "date_end": "2024-12-31", "date_precision": "year", "date_hint": "in 2024"}'),
  '[{"ref": "new:0", "display_name": "Maya"}]') ->> 'status', 'resolved', 'Maya is added and remembered');
SELECT is((SELECT p.user_id::text || ' ' || p.display_name FROM public.memory_items i JOIN public.people p ON p.id = i.person_id
             WHERE i.statement = 'Maya graduated in 2024'),
  'aaaaaaaa-1919-1919-1919-191919191919 Maya', 'filed under the new person, who belongs to the user');
SELECT is((SELECT detail ->> 'date_precision' FROM public.memory_items WHERE statement = 'Maya graduated in 2024'), 'year',
  'the year is kept as the user gave it');
SELECT is((SELECT raw_text FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001911'), NULL,
  'delete-after-extraction: the note''s text goes once nothing waits on the user');
SELECT is((SELECT s.quote FROM public.memory_item_sources s JOIN public.memory_items i ON i.id = s.memory_item_id
             WHERE i.statement = 'Maya graduated in 2024'), 'Maya graduated in 2024', '…and the quote stays on the source');

-- ── "Don't remember this" for every held item settles the note ──
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001915', (SELECT t FROM r WHERE k = 'sail'), '[]', NULL) ->> 'status',
  'resolved', 'skipping everything is an answer too');
SELECT is((SELECT row(c.status, (SELECT count(*) FROM public.memory_items WHERE statement = 'Sam is learning to sail'),
                      (SELECT count(*) FROM public.capture_reviews WHERE capture_id = c.id))::text
             FROM public.captures c WHERE c.id = '00000000-0000-0000-0000-000000001915'),
  '(extracted,0,0)', 'nothing remembered, nothing waiting');

-- ── An expired question can no longer be answered ──
UPDATE public.capture_reviews SET expires_at = now() - interval '1 minute' WHERE capture_id = '00000000-0000-0000-0000-000000001916';
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000001916', (SELECT t FROM r WHERE k = 'keys'),
  pg_temp.item('00000000-0000-0000-0000-000000001901', 'thread', 'Sam lost his keys', 'Sam lost his keys', '{"topic": "his keys", "followup_after_days": 42}'), NULL) ->> 'status',
  'already_resolved', 'an expired question is treated as gone');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE statement = 'Sam lost his keys'), 0, '…and nothing is written');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
