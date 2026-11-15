-- CMR-1 Workstream C (migration 20261114090000): what a note's understanding
-- came to is durable on the capture (understanding), written by the server
-- alone at every point the outcome changes, and pulled by the app with the
-- row (the row guard moves version and updated_at). Coverage may now say
-- which words were read but not understood; the usage log counts every drop
-- reason the gateway has.
BEGIN;
SELECT plan(64);

\set A '''aaaaaaaa-7474-7474-7474-747474747474'''
\set B '''bbbbbbbb-7474-7474-7474-747474747474'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

-- One kept line about Ben, as the gateway writes it ("Ben loves jazz." is code points 0–14).
CREATE FUNCTION pg_temp.jazz() RETURNS jsonb LANGUAGE sql AS $$
  SELECT '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000007401", "subject_type": "person", "related": null,
            "statement": "Ben loves jazz", "certainty": "stated", "sensitivity": "none", "confidence": 0.95,
            "detail": {"category": "interest"}, "spans": [{"start": 0, "end": 14, "quote": "Ben loves jazz"}],
            "action": {"type": "new", "target_id": null}}]'::jsonb
$$;
-- Held lines (one or two) and their question, as the gateway writes them.
CREATE FUNCTION pg_temp.held(statement text, span_start int, span_end int) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
      'kind', 'fact', 'person_id', NULL, 'new_person_name', NULL, 'subject_type', 'person', 'related', NULL,
      'statement', statement, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.7,
      'detail', jsonb_build_object('category', 'interest'),
      'spans', jsonb_build_array(jsonb_build_object('start', span_start, 'end', span_end)),
      'action', jsonb_build_object('type', 'new', 'target_id', NULL), 'flags', jsonb_build_array('person_ambiguous'))
$$;
CREATE FUNCTION pg_temp.review(two boolean DEFAULT false) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('items',
      CASE WHEN two THEN jsonb_build_array(pg_temp.held('Ben loves jazz', 0, 14), pg_temp.held('Ben bakes', 16, 25))
           ELSE jsonb_build_array(pg_temp.held('Ben loves jazz', 0, 14)) END,
    'clarification', jsonb_build_object('about', 'person', 'question', 'Who is this about?', 'options', jsonb_build_array('Ben', 'Someone else')))
$$;
-- Hold a note: claimed, nothing saved, the review written. Returns the review's version.
CREATE FUNCTION pg_temp.hold(capture uuid, two boolean DEFAULT false) RETURNS timestamptz LANGUAGE plpgsql AS $$
DECLARE t timestamptz;
BEGIN
  PERFORM public.claim_capture_extraction('aaaaaaaa-7474-7474-7474-747474747474', capture);
  PERFORM public.write_extraction_with_review('aaaaaaaa-7474-7474-7474-747474747474', capture,
    'relationship_extract/v7+claude-test', true, '[]', pg_temp.review(two));
  SELECT created_at INTO t FROM public.capture_reviews WHERE capture_id = capture;
  RETURN t;
END $$;
CREATE FUNCTION pg_temp.understanding(capture uuid) RETURNS text LANGUAGE sql AS $$
  SELECT understanding FROM public.captures WHERE id = capture
$$;
CREATE TEMP TABLE r (k text PRIMARY KEY, t timestamptz);
GRANT ALL ON r TO PUBLIC;

-- ── A's world: Ben, and notes as the app inserts them ───────────────────────
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000007401', 'Ben');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000007410', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007411', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007412', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007413', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007414', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007415', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007416', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007417', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007418', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007420', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007421', 'text', 'Ben loves jazz. Ben bakes.'),
  ('00000000-0000-0000-0000-000000007422', 'text', 'Ben loves jazz.'),
  ('00000000-0000-0000-0000-000000007423', 'text', 'Ben loves jazz.');

-- ── The column, and who may write it ────────────────────────────────────────
SELECT has_column('public', 'captures', 'understanding', 'captures.understanding exists');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007410'), NULL, 'a new note is not yet understood');
SELECT lives_ok($$ INSERT INTO public.captures (id, source, raw_text, understanding)
  VALUES ('00000000-0000-0000-0000-000000007419', 'text', 'Ben loves jazz.', 'kept') $$, 'an insert may name an understanding…');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007419'), NULL, '…and it is kept NULL: nothing has been understood yet');
SELECT throws_ok($$ UPDATE public.captures SET understanding = 'kept' WHERE id = '00000000-0000-0000-0000-000000007410' $$,
  '42501', NULL, 'the app never writes understanding (no column grant)');
SELECT throws_ok(format($$ SELECT public.capture_understanding_settle(%L, '00000000-0000-0000-0000-000000007410', false) $$, :A),
  '42501', NULL, 'nor calls the settle');
SELECT tests.reset_role();

SELECT tests.as_service();
SELECT lives_ok($$ DO $d$ DECLARE v text; BEGIN
  FOREACH v IN ARRAY ARRAY['kept', 'nothing', 'partial', 'held', 'declined', 'failed'] LOOP
    UPDATE public.captures SET understanding = v WHERE id = '00000000-0000-0000-0000-000000007419';
  END LOOP; END $d$ $$, 'the CHECK takes each of the six values');
SELECT throws_ok($$ UPDATE public.captures SET understanding = 'maybe' WHERE id = '00000000-0000-0000-0000-000000007419' $$,
  '23514', NULL, 'and nothing else');
UPDATE public.captures SET understanding = NULL WHERE id = '00000000-0000-0000-0000-000000007419';

-- ── failed → NULL → (nothing | kept): claim and release ─────────────────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007410'), 'claimed', 'claimed');
SELECT lives_ok(format($$ SELECT public.release_capture_extraction(%L, '00000000-0000-0000-0000-000000007410', 'failed') $$, :A), 'the model failed');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007410'), 'failed', 'failed: the phone may say so');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007410'), 'claimed', 'tried again');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007410'), NULL, 'a fresh understanding: not yet known');
SELECT lives_ok(format($$ SELECT public.release_capture_extraction(%L, '00000000-0000-0000-0000-000000007410', 'pending') $$, :A), 'the quota was spent');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007410'), NULL, 'pending: still not known');

-- ── kept, and the row moves for sync ────────────────────────────────────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007411'), 'claimed', 'claimed');
CREATE TEMP TABLE before_v AS SELECT version, updated_at FROM public.captures WHERE id = '00000000-0000-0000-0000-000000007411';
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(%L, '00000000-0000-0000-0000-000000007411',
  'relationship_extract/v7+claude-test', false, pg_temp.jazz()) $s$) $$, :A), 'one line written');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007411'), 'kept', 'kept');
SELECT ok((SELECT c.version > b.version AND c.updated_at > b.updated_at FROM public.captures c, before_v b WHERE c.id = '00000000-0000-0000-0000-000000007411'),
  'version and updated_at moved: the app''s pull of captures carries it');

-- ── partial: kept with coverage gaps ────────────────────────────────────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007412'), 'claimed', 'claimed');
SELECT lives_ok(format($$ SELECT public.set_capture_coverage(%L, '00000000-0000-0000-0000-000000007412',
  '{"v": 1, "unprocessed": [], "unlocated": 0, "not_understood": [{"start": 4, "end": 14}]}') $$, :A),
  'coverage may say which words were read but not understood');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(%L, '00000000-0000-0000-0000-000000007412',
  'relationship_extract/v7+claude-test', false, pg_temp.jazz()) $s$) $$, :A), 'one line written beside the gap');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007412'), 'partial', 'partial');

-- ── partial means "not taken whole": gaps with nothing kept are never "nothing" ──
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007420'), 'claimed', 'claimed');
SELECT lives_ok(format($$ SELECT public.set_capture_coverage(%L, '00000000-0000-0000-0000-000000007420',
  '{"v": 1, "unprocessed": [], "unlocated": 0, "not_understood": [{"start": 0, "end": 14}]}') $$, :A), 'every proposal undecidable');
SELECT lives_ok(format($$ SELECT public.write_extraction(%L, '00000000-0000-0000-0000-000000007420',
  'relationship_extract/v7+claude-test', false, '[]') $$, :A), 'nothing written');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007420'), 'partial', 'partial, not nothing: parts were not understood');

-- ── a mixed answer: some kept, some declined → kept ─────────────────────────
INSERT INTO r VALUES ('mixed', pg_temp.hold('00000000-0000-0000-0000-000000007421', true));
SELECT is((SELECT jsonb_array_length(items) FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000007421'), 2, 'two lines held');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000007421', %L, pg_temp.jazz(), '[]') $s$) $$,
  :A, (SELECT t FROM r WHERE k = 'mixed')), 'one kept, one declined');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007421'), 'kept', 'kept: a line of this note is live');

-- ── declined with gaps: not taken whole, so partial, not declined ────────────
SELECT lives_ok(format($$ SELECT public.set_capture_coverage(%L, '00000000-0000-0000-0000-000000007423',
  '{"v": 1, "unprocessed": [], "unlocated": 0, "not_understood": [{"start": 0, "end": 14}]}') $$, :A), 'part of the note was not understood');
INSERT INTO r VALUES ('gaps', pg_temp.hold('00000000-0000-0000-0000-000000007423'));
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007423'), 'held', 'held while the question waits');
SELECT lives_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000007423', %L, '[]', '[]') $$,
  :A, (SELECT t FROM r WHERE k = 'gaps')), 'every held line declined');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007423'), 'partial', 'partial: the gaps are still there to tell again');

-- ── a stale processing claim (a worker died mid-call) starts afresh ─────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007422'), 'claimed', 'claimed');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007422'), 'busy', 'busy while the worker lives');
SELECT tests.reset_role();
ALTER TABLE public.captures DISABLE TRIGGER captures_row_guard;
UPDATE public.captures SET updated_at = now() - interval '3 minutes', understanding = 'failed' WHERE id = '00000000-0000-0000-0000-000000007422';
ALTER TABLE public.captures ENABLE TRIGGER captures_row_guard;
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007422'), 'claimed', 'a worker that died does not hold it');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007422'), NULL, 'the fresh understanding is not yet known');

-- ── nothing: the understanding ran and kept nothing ─────────────────────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007413'), 'claimed', 'claimed');
SELECT lives_ok(format($$ SELECT public.write_extraction(%L, '00000000-0000-0000-0000-000000007413',
  'relationship_extract/v7+claude-test', false, '[]') $$, :A), 'nothing written');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007413'), 'nothing', 'nothing: the note stays as the user''s words');

-- ── held → kept: the user answers ───────────────────────────────────────────
INSERT INTO r VALUES ('answer', pg_temp.hold('00000000-0000-0000-0000-000000007414'));
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007414'), 'held', 'held: a question waits');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000007414', %L, pg_temp.jazz(), '[]') $s$) $$,
  :A, (SELECT t FROM r WHERE k = 'answer')), 'answered with the line');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007414'), 'kept', 'kept after the answer');

-- ── held → declined: "Don't keep this" for every held line ──────────────────
INSERT INTO r VALUES ('skip', pg_temp.hold('00000000-0000-0000-0000-000000007415'));
SELECT lives_ok(format($$ SELECT public.resolve_capture_review(%L, '00000000-0000-0000-0000-000000007415', %L, '[]', '[]') $$,
  :A, (SELECT t FROM r WHERE k = 'skip')), 'answered keeping nothing');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007415'), 'declined', 'declined: the Tell itself remains');

-- ── held → declined: "not now" by the owner; another account changes nothing ─
INSERT INTO r VALUES ('close', pg_temp.hold('00000000-0000-0000-0000-000000007416'));
SELECT tests.as_user(:B);
SELECT is(public.close_capture_review('00000000-0000-0000-0000-000000007416'), false, 'another user cannot close it');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007416'), 'held', 'still held');
SELECT is(public.close_capture_review('00000000-0000-0000-0000-000000007416'), true, 'the owner sets it aside');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007416'), 'declined', 'declined');
SELECT tests.reset_role();
SELECT tests.as_service();

-- ── held → nothing: nobody answered for 30 days ─────────────────────────────
INSERT INTO r VALUES ('expire', pg_temp.hold('00000000-0000-0000-0000-000000007417'));
UPDATE public.capture_reviews SET expires_at = now() - interval '1 minute' WHERE capture_id = '00000000-0000-0000-0000-000000007417';
SELECT is(public.purge_expired_capture_reviews(), 1, 'the purge settles it');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007417'), 'nothing', 'nothing: the user never declined it');

-- ── held with a line already saved → kept when the question goes ────────────
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000007418'), 'claimed', 'claimed');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000007418',
  'relationship_extract/v7+claude-test', true, pg_temp.jazz(), pg_temp.review()) $s$) $$, :A), 'a line saved and a question held');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007418'), 'held', 'held while the question waits');
SELECT is(public.settle_capture_review(:A, '00000000-0000-0000-0000-000000007418'), true, 'the question is set aside');
SELECT is(pg_temp.understanding('00000000-0000-0000-0000-000000007418'), 'kept', 'kept: a line of this note is live');

-- ── coverage: the shape, with and without not_understood ────────────────────
SELECT ok(public.capture_coverage_ok('{"v": 1, "unprocessed": [{"start": 3, "end": 9}], "unlocated": 0}'::jsonb), 'the older shape still holds');
SELECT ok(public.capture_coverage_ok('{"v": 1, "unprocessed": [], "unlocated": 1, "not_understood": [{"start": 0, "end": 14}, {"start": 0, "end": 14}]}'::jsonb),
  'not understood: spans, one per lost proposal per place');
SELECT ok(NOT public.capture_coverage_ok('{"v": 1, "unprocessed": [], "unlocated": 0, "not_understood": [{"start": 0, "end": 14, "quote": "Ben loves jazz"}]}'::jsonb),
  'never words');
SELECT ok(NOT public.capture_coverage_ok('{"v": 1, "unprocessed": [], "unlocated": 0, "missed": [{"start": 0, "end": 14}]}'::jsonb),
  'no other key');
SELECT ok(NOT public.capture_coverage_ok(('{"v": 1, "unprocessed": [], "unlocated": 0, "not_understood": ' ||
  (SELECT jsonb_agg(jsonb_build_object('start', 0, 'end', 1)) FROM generate_series(1, 65))::text || '}')::jsonb),
  'at most 64 places');

-- ── the usage log counts every drop reason the gateway has ──────────────────
SELECT lives_ok($$ INSERT INTO public.ai_calls (capability, model, prompt_version, eval_version, outcome, result, latency_ms, items_dropped, drop_reasons)
  VALUES ('relationship_extract', 'claude-test', 'relationship_extract/v7', 'extraction-v2.9', 'ok', 'auto', 1200, 4, '{"internal_reference": 1, "already_known": 1, "no_one_named": 1, "earlier_note": 1}') $$,
  'internal_reference, already_known, no_one_named and earlier_note are counted (the first two were refused before, and the row was lost)');
SELECT throws_ok($$ INSERT INTO public.ai_calls (capability, model, prompt_version, eval_version, outcome, latency_ms, drop_reasons)
  VALUES ('relationship_extract', 'claude-test', 'relationship_extract/v7', 'extraction-v2.9', 'ok', 1, '{"Ben loves jazz": 1}') $$,
  '23514', NULL, 'text smuggled into the drop reasons is still refused');

SELECT * FROM finish();
ROLLBACK;
