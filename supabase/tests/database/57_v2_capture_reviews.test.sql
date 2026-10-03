-- Checkpoint C, founder decision C-2: held items wait for the user without
-- becoming memory, and the question survives a restart. capture_reviews is
-- written only with the extraction, read only by its owner, and cleared on
-- answer, deletion, text purge or expiry.
BEGIN;
SELECT plan(25);

\set A '''aaaaaaaa-1717-1717-1717-171717171717'''
\set B '''bbbbbbbb-1717-1717-1717-171717171717'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, full_name) VALUES
  ('00000000-0000-0000-0000-000000001701', 'Sam', 'Sam Lee'),
  ('00000000-0000-0000-0000-000000001702', 'Sam', 'Sam Ortiz');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000001710', 'text', 'Sam is thinking about moving to Seattle.'),
  ('00000000-0000-0000-0000-000000001712', 'text', 'Sam got the job! 🎉'),
  ('00000000-0000-0000-0000-000000001713', 'text', 'Sam is moving.'),
  ('00000000-0000-0000-0000-000000001714', 'text', 'Sam is moving to Austin.');
INSERT INTO public.captures (id, source, raw_text, retention) VALUES
  ('00000000-0000-0000-0000-000000001711', 'text', 'Sam had a baby.', 'delete_after_extraction');
SELECT tests.reset_role();
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001731', 'B''s Sam');
SELECT tests.reset_role();

-- A held "which Sam?" item: the proposed interpretation, spans and the question.
CREATE FUNCTION pg_temp.review(person text, span_end int) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object(
      'kind', 'thread', 'person_id', person, 'new_person_name', NULL, 'subject_type', 'person', 'related', NULL,
      'statement', 'Sam is thinking about moving to Seattle', 'certainty', 'tentative', 'sensitivity', 'none',
      'confidence', 0.9, 'detail', jsonb_build_object('topic', 'moving to Seattle', 'followup_after_days', 42),
      'spans', jsonb_build_array(jsonb_build_object('start', 0, 'end', span_end)),
      'action', jsonb_build_object('type', 'new', 'target_id', NULL), 'flags', jsonb_build_array('person_ambiguous'))),
    'clarification', jsonb_build_object('about', 'person', 'question', 'Which Sam?',
                                        'options', jsonb_build_array('Sam Lee', 'Sam Ortiz')))
$$;

-- ── The app can read its own reviews, nothing else ──
SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT public.write_extraction_with_review('aaaaaaaa-1717-1717-1717-171717171717', '00000000-0000-0000-0000-000000001710',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', NULL) $$, '42501', NULL, 'the app cannot write a review');
SELECT throws_ok($$ INSERT INTO public.capture_reviews (capture_id, user_id, extraction_version, items)
  VALUES ('00000000-0000-0000-0000-000000001710', 'aaaaaaaa-1717-1717-1717-171717171717', 'relationship_extract/v1+claude-opus-5-5', '[{}]') $$,
  '42501', NULL, 'the app cannot insert a review directly');
SELECT throws_ok($$ SELECT public.purge_expired_capture_reviews() $$, '42501', NULL, 'the app cannot run the expiry purge');
SELECT tests.reset_role();

-- ── Written with the extraction, in one call ──
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001710'), 'claimed', 'claimed');
SELECT lives_ok(format($$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000001710',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', pg_temp.review(NULL, 39)) $$, :A),
  'a held item and its question are written with the extraction');
SELECT is((SELECT status FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001710'), 'needs_review',
  'the capture waits for the user');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE user_id = :A), 0, 'the held item is not memory');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001710'), 'done',
  'reopening the app does not run the model again');

-- Bad reviews are refused (and nothing is written).
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001714'), 'claimed', 'claimed');
SELECT throws_ok(format($$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000001714',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', pg_temp.review('00000000-0000-0000-0000-000000001731', 10)) $$, :A),
  '23503', NULL, 'a held item cannot point at another user''s person');
SELECT throws_ok(format($$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000001714',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', pg_temp.review(NULL, 99)) $$, :A),
  '23514', NULL, 'a held item''s span must lie inside the note');
SELECT throws_ok(format($$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000001714',
  'relationship_extract/v1+claude-opus-5-5', false, '[]', pg_temp.review(NULL, 10)) $$, :A),
  '22023', NULL, 'a review is never written for a capture that is not waiting on the user');
SELECT is((SELECT count(*)::int FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001714'), 0,
  'refused reviews leave nothing behind');
SELECT tests.reset_role();

-- ── Only the owner sees it; it survives until answered ──
SELECT tests.as_user(:A);
SELECT is((SELECT clarification ->> 'question' FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001710'),
  'Which Sam?', 'after a restart the user still sees the question');
SELECT is((SELECT items -> 0 ->> 'statement' FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001710'),
  'Sam is thinking about moving to Seattle', '…and the proposed interpretation, unchanged');
SELECT tests.reset_role();
SELECT tests.as_user(:B);
SELECT is((SELECT count(*)::int FROM public.capture_reviews), 0, 'another user sees nothing');
SELECT is(public.close_capture_review('00000000-0000-0000-0000-000000001710'), false, 'another user cannot close it');
SELECT tests.reset_role();

-- ── Answered (or dismissed): gone, and the capture is settled ──
SELECT tests.as_user(:A);
SELECT is(public.close_capture_review('00000000-0000-0000-0000-000000001710'), true, 'the owner closes it');
SELECT tests.reset_role();
SELECT is((SELECT row(status, (SELECT count(*) FROM public.capture_reviews WHERE capture_id = c.id))::text
             FROM public.captures c WHERE id = '00000000-0000-0000-0000-000000001710'),
  '(extracted,0)', 'closed: no review left, capture extracted');

-- delete_after_extraction: the text stays while the question is open, goes when it closes.
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001711'), 'claimed', 'claimed');
SELECT public.write_extraction_with_review(:A, '00000000-0000-0000-0000-000000001711',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', pg_temp.review(NULL, 15));
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT public.close_capture_review('00000000-0000-0000-0000-000000001711');
SELECT tests.reset_role();
SELECT is((SELECT raw_text FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001711'), NULL,
  'with delete_after_extraction the note''s text goes once nothing waits on the user');

-- ── Deleting the capture takes the question with it ──
SELECT tests.as_service();
SELECT public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001713');
SELECT public.write_extraction_with_review(:A, '00000000-0000-0000-0000-000000001713',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', pg_temp.review(NULL, 14));
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000001713';
SELECT tests.reset_role();
SELECT is((SELECT count(*)::int FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000001713'), 0,
  'a deleted capture leaves no pending review');

-- ── Unanswered for 30 days: expired and settled ──
SELECT tests.as_service();
SELECT public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001712');
SELECT public.write_extraction_with_review(:A, '00000000-0000-0000-0000-000000001712',
  'relationship_extract/v1+claude-opus-5-5', true, '[]', pg_temp.review(NULL, 16));
SELECT tests.reset_role();
UPDATE public.capture_reviews SET expires_at = now() - interval '1 minute'
 WHERE capture_id = '00000000-0000-0000-0000-000000001712';
SELECT tests.as_user(:A);
SELECT is((SELECT count(*)::int FROM public.capture_reviews), 0, 'an expired question is no longer shown');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.purge_expired_capture_reviews(), 1, 'the purge removes it');
SELECT tests.reset_role();

-- ── C-4: moments and milestones keep the user's date words ──
SELECT ok(public.memory_detail_ok('moment', '{"date": "2026-10-10", "date_hint": "Saturday"}')
      AND public.memory_detail_ok('milestone', '{"milestone_type": "new job", "anniversary": false, "date_hint": "last Friday"}'),
  'moment and milestone details accept date_hint');

SELECT * FROM finish();
ROLLBACK;
