-- CMR-1 Workstream C, compatibility evidence for the final review (migration 20261114090000): the gateway
-- in production before this migration (v17) keeps working on the new schema with its argument shapes and
-- its three-key coverage unchanged, and a row whose `understanding` is already set is never left stale by
-- its writes. The other direction (the new gateway on the old schema) is handler.test.ts.
BEGIN;
SELECT plan(27);

\set A '''aaaaaaaa-7575-7575-7575-757575757575'''
SELECT tests.create_user(:A);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;
-- v17's item, exactly as it sends it (no key this migration added).
CREATE FUNCTION pg_temp.v17_item() RETURNS jsonb LANGUAGE sql AS $$
  SELECT '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000007501", "subject_type": "person", "related": null,
            "statement": "Ben loves jazz", "certainty": "stated", "sensitivity": "none", "confidence": 0.95,
            "detail": {"category": "interest"}, "spans": [{"start": 0, "end": 14, "quote": "Ben loves jazz"}],
            "action": {"type": "new", "target_id": null}}]'::jsonb
$$;
-- v17's held line and question.
CREATE FUNCTION pg_temp.v17_review() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('items', jsonb_build_array(jsonb_build_object(
      'kind', 'fact', 'person_id', NULL, 'new_person_name', NULL, 'subject_type', 'person', 'related', NULL,
      'statement', 'Ben loves jazz', 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.7,
      'detail', jsonb_build_object('category', 'interest'),
      'spans', jsonb_build_array(jsonb_build_object('start', 0, 'end', 14)),
      'action', jsonb_build_object('type', 'new', 'target_id', NULL), 'flags', jsonb_build_array('person_ambiguous'))),
    'clarification', jsonb_build_object('about', 'person', 'question', 'Who is this about?', 'options', jsonb_build_array('Ben', 'Someone else')))
$$;
CREATE FUNCTION pg_temp.understanding(capture uuid) RETURNS text LANGUAGE sql AS $$
  SELECT understanding FROM public.captures WHERE id = capture
$$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000007501', 'Ben');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000007510', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007511', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007512', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007513', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007514', 'text', 'Ben loves jazz.');
SELECT tests.reset_role();
SELECT tests.as_service();

-- ── (a) v17's calls, their shapes unchanged ─────────────────────────────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007510'), 'claimed', 'v17 claim');
SELECT lives_ok(format($$ SELECT public.set_capture_coverage(%L, '00000000-0000-0000-0000-000000007510', '{"v": 1, "unprocessed": [{"start": 0, "end": 14}], "unlocated": 0}') $$, :A),
  'v17 three-key coverage is still the shape');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000007510',
  'relationship_extract/v7+claude-opus-5-5', false, pg_temp.v17_item(), NULL) $s$) $$, :A), 'v17 write_extraction_with_review, no review');
SELECT is((SELECT status FROM public.captures WHERE id = '00000000-0000-0000-0000-000000007510'), 'extracted', 'status as v17 expects');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007510'), 'partial', 'and the new column is settled for it (kept with a gap)');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007510'), 'done', 'v17 retry after success: done');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007511'), 'claimed', 'v17 claim');
SELECT lives_ok(format($$ SELECT public.write_extraction(%L, '00000000-0000-0000-0000-000000007511',
  'relationship_extract/v7+claude-opus-5-5', false, '[]') $$, :A), 'v17 write_extraction, nothing kept');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007511'), 'nothing', 'settled as nothing');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007512'), 'claimed', 'v17 claim');
SELECT lives_ok(format($$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000007512',
  'relationship_extract/v7+claude-opus-5-5', true, '[]', pg_temp.v17_review()) $$, :A), 'v17 held review');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007512'), 'held', 'held');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000007512',
  (SELECT created_at FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000007512'), pg_temp.v17_item(), '[]') $s$) $$, :A),
  'v17 resolve_capture_review with its item shape');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007512'), 'kept', 'kept after the answer');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007513'), 'claimed', 'v17 claim');
SELECT lives_ok(format($$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000007513',
  'relationship_extract/v7+claude-opus-5-5', true, '[]', pg_temp.v17_review()) $$, :A), 'v17 held review');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT is(public.close_capture_review('00000000-0000-0000-0000-000000007513'), true, 'v17 close_capture_review ("not now")');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007513'), 'declined', 'declined');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007514'), 'claimed', 'v17 claim');
SELECT lives_ok(format($$ SELECT public.release_capture_extraction(%L, '00000000-0000-0000-0000-000000007514', 'failed') $$, :A), 'v17 release failed');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007514'), 'failed', 'failed');

-- ── (c) a row with understanding set is never left stale, and a write that changes nothing leaves it ──
UPDATE public.captures SET understanding = 'partial' WHERE id = '00000000-0000-0000-0000-000000007514';
SELECT is(public.settle_capture_review(:A, '00000000-0000-0000-0000-000000007514'), false, 'settle on a note that is not waiting: no change…');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007514'), 'partial', '…and the column is exactly as it was');
SELECT lives_ok(format($$ SELECT public.release_capture_extraction(%L, '00000000-0000-0000-0000-000000007514', 'failed') $$, :A), 'release on a note not processing: no change…');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007514'), 'partial', '…and the column is exactly as it was');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007514'), 'claimed', 'a fresh v17 understanding…');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007514'), NULL, '…starts from not yet known, never from a stale value');

SELECT * FROM finish();
ROLLBACK;
