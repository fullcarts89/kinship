-- Checkpoint C: the AI gateway's server-side writes. Claim, write and log
-- are service-role only; write_extraction re-checks every target, so a
-- user-written item is never superseded, and nothing crosses users.
BEGIN;
SELECT plan(40);

\set A '''aaaaaaaa-1616-1616-1616-161616161616'''
\set B '''bbbbbbbb-1616-1616-1616-161616161616'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

-- A's world: Ben, Sarah (with a sister), a user-written fact, an open thread.
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000001601', 'Ben'),
  ('00000000-0000-0000-0000-000000001602', 'Sarah');
INSERT INTO public.related_people (id, person_id, relation)
  VALUES ('00000000-0000-0000-0000-000000001603', '00000000-0000-0000-0000-000000001602', 'sister');
INSERT INTO public.captures (id, source, raw_text, time_zone) VALUES
  ('00000000-0000-0000-0000-000000001610', 'text', 'Ben runs Chicago Sunday. He''s hoping to break four hours.', 'America/Chicago'),
  ('00000000-0000-0000-0000-000000001611', 'text', 'Ben left Google.', 'America/Chicago'),
  ('00000000-0000-0000-0000-000000001612', 'text', 'Ben got the job! 🎉', 'America/Chicago');
INSERT INTO public.captures (id, source, raw_text, retention) VALUES
  ('00000000-0000-0000-0000-000000001613', 'text', 'Ben hates cilantro.', 'delete_after_extraction');
SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001620", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601",
    "statement": "Ben works at Google", "origin": "user", "user_state": "user_authored", "detail": {"category": "work"}}',
  '[{"source_kind": "user_edit"}]');
SELECT tests.reset_role();
-- An open thread and a plain fact the gateway may resolve or supersede.
INSERT INTO public.memory_items (id, user_id, kind, person_id, statement, certainty, detail, origin, extraction_confidence) VALUES
  ('00000000-0000-0000-0000-000000001621', :A, 'thread', '00000000-0000-0000-0000-000000001601', 'Ben is waiting to hear about the job', 'tentative',
   '{"topic": "the job", "followup_after_days": 42}', 'extracted', 0.9),
  ('00000000-0000-0000-0000-000000001622', :A, 'fact', '00000000-0000-0000-0000-000000001601', 'Ben works at Stripe', 'stated',
   '{"category": "work"}', 'extracted', 0.9);
INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind) VALUES
  (:A, '00000000-0000-0000-0000-000000001621', 'user_edit'), (:A, '00000000-0000-0000-0000-000000001622', 'user_edit');

-- ── Only the service role can call any of it ──
SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT public.claim_capture_extraction('aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001610') $$,
  '42501', NULL, 'the app cannot claim a capture');
SELECT throws_ok($$ SELECT public.write_extraction('aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001610', 'relationship_extract/v1+claude-opus-5-5', false, '[]') $$,
  '42501', NULL, 'the app cannot write extracted items');
SELECT throws_ok($$ SELECT * FROM public.ai_calls $$, '42501', NULL, 'the app cannot read the usage log');
SELECT tests.reset_role();
SELECT tests.as_anon();
SELECT throws_ok($$ SELECT public.release_capture_extraction('aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001610', 'failed') $$,
  '42501', NULL, 'anon cannot release a capture');
SELECT tests.reset_role();

SELECT tests.as_service();
-- ── Claim ──
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001610'), 'claimed', 'a pending capture is claimed');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001610'), 'busy', 'a second request finds it in progress');
SELECT is(public.claim_capture_extraction(:B, '00000000-0000-0000-0000-000000001610'), 'missing', 'another user''s capture is invisible');
SELECT throws_ok($$ SELECT public.write_extraction('aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001611', 'relationship_extract/v1+claude-opus-5-5', false, '[]') $$,
  '55000', NULL, 'an unclaimed capture cannot be written');

-- ── The vertical slice ──
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001610', 'relationship_extract/v1+claude-opus-5-5', false,
  '[{"kind": "event", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null,
     "statement": "Ben runs Chicago Sunday", "certainty": "stated", "sensitivity": "none", "confidence": 0.95,
     "detail": {"event_type": "race", "followup_policy": "after", "date_precision": "day", "date": "2026-10-11", "date_hint": "Sunday", "event_goal": "break four hours"},
     "spans": [{"start": 0, "end": 23}, {"start": 25, "end": 56}], "action": {"type": "new", "target_id": null}}]') $s$) $$,
  'the race is written with both spans and passes the commit-time provenance check');
SELECT is((SELECT row(kind, origin, user_state, certainty, extraction_confidence::text, detail ->> 'date', detail ->> 'event_goal')::text
             FROM public.memory_items WHERE person_id = '00000000-0000-0000-0000-000000001601' AND kind = 'event'),
  '(event,extracted,unreviewed,stated,0.95,2026-10-11,"break four hours")', 'stored as an unreviewed extracted event');
SELECT is((SELECT array_agg(quote ORDER BY span_start) FROM public.memory_item_sources s
             JOIN public.memory_items i ON i.id = s.memory_item_id WHERE i.kind = 'event' AND i.person_id = '00000000-0000-0000-0000-000000001601'),
  ARRAY['Ben runs Chicago Sunday', 'He''s hoping to break four hours'], 'quotes come from the stored text, not the model');
SELECT is((SELECT row(status, extraction_version)::text FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001610'),
  '(extracted,relationship_extract/v1+claude-opus-5-5)', 'the capture records what extracted it');
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001610'), 'done', 'a retry after a lost reply is answered without a second run');

-- ── A user-written item is never superseded; a plain one is ──
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001611'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001611', 'relationship_extract/v1+claude-opus-5-5', true,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null,
     "statement": "Ben left Google", "certainty": "stated", "sensitivity": "none", "confidence": 0.9, "detail": {"category": "work"},
     "spans": [{"start": 0, "end": 15}], "action": {"type": "supersede", "target_id": "00000000-0000-0000-0000-000000001620"}},
    {"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null,
     "statement": "Ben left", "certainty": "stated", "sensitivity": "none", "confidence": 0.9, "detail": {"category": "work"},
     "spans": [{"start": 0, "end": 8}], "action": {"type": "supersede", "target_id": "00000000-0000-0000-0000-000000001622"}}]') $s$) $$,
  'two supersede proposals are written');
SELECT is((SELECT row(status, user_state)::text FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001620'),
  '(active,user_authored)', 'the user''s own item is untouched');
SELECT is((SELECT supersedes_id FROM public.memory_items WHERE statement = 'Ben left Google'), NULL::uuid,
  '…and the new item does not claim to replace it');
SELECT is((SELECT status FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001622'), 'superseded',
  'an unreviewed extracted fact is superseded');
SELECT is((SELECT status FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001611'), 'needs_review',
  'a capture with something to confirm is marked needs_review');

-- ── Merge and resolve ──
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001612'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001612', 'relationship_extract/v1+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null,
     "statement": "Ben got the job", "certainty": "stated", "sensitivity": "none", "confidence": 0.9, "detail": {"category": "work"},
     "spans": [{"start": 0, "end": 15}], "action": {"type": "resolves", "target_id": "00000000-0000-0000-0000-000000001621"}},
    {"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null,
     "statement": "Ben left", "certainty": "stated", "sensitivity": "none", "confidence": 0.9, "detail": {"category": "work"},
     "spans": [{"start": 0, "end": 3}], "action": {"type": "merge", "target_id": "00000000-0000-0000-0000-000000001622"}}]') $s$) $$,
  'resolve and merge are written');
SELECT is((SELECT status FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001621'), 'resolved', 'the open thread is resolved');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.memory_item_sources
                       WHERE memory_item_id = '00000000-0000-0000-0000-000000001622' AND capture_id = '00000000-0000-0000-0000-000000001612')
      AND (SELECT count(*)::int FROM public.memory_items WHERE statement = 'Ben left') = 2,
  'a merge onto a superseded item becomes a new item (only active items take merges)');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE capture_id = '00000000-0000-0000-0000-000000001612' AND span_end = 15),
  'Ben got the job', 'the span is counted in code points even with an emoji in the note');

-- ── Release: back to pending (never reached the model) or failed ──
SELECT tests.reset_role();
SELECT tests.as_user(:A);
INSERT INTO public.captures (id, source, raw_text) VALUES ('00000000-0000-0000-0000-000000001614', 'text', 'Ben is moving.');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001614'), 'claimed', 'claimed');
SELECT public.release_capture_extraction(:A, '00000000-0000-0000-0000-000000001614', 'pending');
SELECT is((SELECT status FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001614'), 'pending', 'a quota refusal hands the capture back untouched');
SELECT throws_ok($$ SELECT public.release_capture_extraction('aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001614', 'extracted') $$,
  '22023', NULL, 'release cannot mark a capture extracted');

-- ── Cross-user and malformed writes are refused ──
SELECT tests.reset_role();
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001631', 'B''s Ben');
INSERT INTO public.captures (id, source, raw_text) VALUES ('00000000-0000-0000-0000-000000001632', 'text', 'Ben moved to Denver.');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:B, '00000000-0000-0000-0000-000000001632'), 'claimed', 'B''s capture claimed');
SELECT throws_ok($$ SELECT public.write_extraction('bbbbbbbb-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001632', 'relationship_extract/v1+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null, "statement": "x", "certainty": "stated",
     "sensitivity": "none", "confidence": 0.9, "detail": {"category": "home"}, "spans": [{"start": 0, "end": 3}], "action": {"type": "new", "target_id": null}}]') $$,
  '23503', NULL, 'B''s capture cannot be filed under A''s person');
SELECT throws_ok($$ SELECT public.write_extraction('bbbbbbbb-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001632', 'relationship_extract/v1+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001631", "subject_type": "related", "related": {"id": "00000000-0000-0000-0000-000000001603", "relation": "sister"},
     "statement": "x", "certainty": "stated", "sensitivity": "none", "confidence": 0.9, "detail": {"category": "home"}, "spans": [{"start": 0, "end": 3}], "action": {"type": "new", "target_id": null}}]') $$,
  '23503', NULL, 'nor attached to A''s related person');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction('bbbbbbbb-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001632', 'relationship_extract/v1+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001631", "subject_type": "person", "related": null, "statement": "Ben moved to Denver", "certainty": "stated",
     "sensitivity": "none", "confidence": 0.9, "detail": {"category": "home"}, "spans": [{"start": 0, "end": 19}],
     "action": {"type": "supersede", "target_id": "00000000-0000-0000-0000-000000001622"}}]') $s$) $$,
  'a target from another user is ignored, not followed');
SELECT is((SELECT supersedes_id FROM public.memory_items WHERE statement = 'Ben moved to Denver'), NULL::uuid, '…the new item supersedes nothing');
SELECT is((SELECT user_id FROM public.memory_items WHERE statement = 'Ben moved to Denver'), :B::uuid, '…and belongs to B');

-- ── Retention: delete the note once understood ──
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001613'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction('aaaaaaaa-1616-1616-1616-161616161616', '00000000-0000-0000-0000-000000001613', 'relationship_extract/v1+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001601", "subject_type": "person", "related": null, "statement": "Ben hates cilantro", "certainty": "stated",
     "sensitivity": "none", "confidence": 0.95, "detail": {"category": "preference"}, "spans": [{"start": 0, "end": 18}], "action": {"type": "new", "target_id": null}}]') $s$) $$,
  'written');
SELECT is((SELECT row(raw_text IS NULL, raw_text_purged_at IS NOT NULL)::text FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001613'),
  '(t,t)', 'the note''s text is purged after extraction when the user chose that');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE capture_id = '00000000-0000-0000-0000-000000001613'), 'Ben hates cilantro',
  '…and the quote stays for the Source view');

-- ── The usage log holds no content ──
SELECT lives_ok($$ INSERT INTO public.ai_calls (capability, model, prompt_version, eval_version, outcome, result, input_tokens, output_tokens, latency_ms, items_saved, drop_reasons)
  VALUES ('relationship_extract', 'claude-opus-5-5', 'relationship_extract/v1', 'extraction-v1', 'ok', 'auto', 2100, 640, 3120, 1, '{"invented_name": 1}') $$,
  'a content-free row is accepted');
SELECT throws_ok($$ INSERT INTO public.ai_calls (capability, model, prompt_version, eval_version, outcome, latency_ms, drop_reasons)
  VALUES ('relationship_extract', 'claude-opus-5-5', 'relationship_extract/v1', 'extraction-v1', 'ok', 1, '{"Ben runs Chicago": 1}') $$,
  '23514', NULL, 'text smuggled into the drop reasons is refused');
SELECT tests.reset_role();

SELECT ok((SELECT bool_and('search_path=""' = ANY (proconfig) AND prosecdef) FROM pg_proc
           WHERE proname IN ('claim_capture_extraction', 'release_capture_extraction', 'write_extraction') AND pronamespace = 'public'::regnamespace)
      AND NOT has_function_privilege('authenticated', 'public.write_extraction(uuid, uuid, text, boolean, jsonb)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.claim_capture_extraction(uuid, uuid)', 'EXECUTE'),
  'DEFINER functions pin an empty search_path and are not executable by the app');

SELECT * FROM finish();
ROLLBACK;
