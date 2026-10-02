-- Checkpoint B: write_memory_item creates an item and its sources in one
-- transaction (the REST API can't), idempotently, as the caller.
BEGIN;
SELECT plan(20);

\set A '''aaaaaaaa-1515-1515-1515-151515151515'''
\set B '''bbbbbbbb-1515-1515-1515-151515151515'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001501', 'Ben');
INSERT INTO public.captures (id, source, raw_text)
  VALUES ('00000000-0000-0000-0000-000000001502', 'text', 'Ben runs Chicago Sunday.');

SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001503", "kind": "event", "person_id": "00000000-0000-0000-0000-000000001501",
    "statement": "Ben runs Chicago Sunday", "origin": "user", "user_state": "user_authored",
    "detail": {"date_precision": "day", "event_type": "race", "followup_policy": "after"}}',
  '[{"capture_id": "00000000-0000-0000-0000-000000001502", "source_kind": "capture", "span_start": 0, "span_end": 23}]') $s$) $$,
  'an item and its source are written together and pass the commit-time provenance check');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001503'),
  1, 'the source was written');
SELECT is((SELECT user_id FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001503'),
  :A::uuid, 'the item belongs to the caller');

-- A retry after a lost reply writes nothing twice.
SELECT is((public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001503", "kind": "event", "person_id": "00000000-0000-0000-0000-000000001501",
    "statement": "changed?", "origin": "user", "detail": {}}',
  '[{"capture_id": "00000000-0000-0000-0000-000000001502", "source_kind": "capture", "span_start": 0, "span_end": 3}]')
  ->> 'statement'), 'Ben runs Chicago Sunday', 'a retry returns the existing item unchanged');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001503'),
  1, '…and adds no duplicate source');

SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001504", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001501",
    "statement": "x", "origin": "user", "detail": {"category": "other"}}', '[]') $$,
  '23514', NULL, 'an item without a source is refused');
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001505", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001501",
    "statement": "x", "origin": "extracted", "detail": {"category": "other"}}',
  '[{"source_kind": "user_edit"}]') $$,
  '42501', NULL, 'the app still cannot write AI-extracted items through it (RLS applies)');
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001506", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001501",
    "statement": "x", "origin": "user", "detail": {"category": "other"}}',
  '[{"capture_id": "00000000-0000-0000-0000-000000001502", "source_kind": "capture", "span_start": 0, "span_end": 99}]') $$,
  '23514', NULL, 'span checks still apply');
SELECT tests.reset_role();

SELECT tests.as_user(:B);
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001507", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001501",
    "statement": "x", "origin": "user", "detail": {"category": "other"}}',
  '[{"source_kind": "user_edit"}]') $$,
  '23503', NULL, 'B cannot file an item under A''s person through it');
SELECT tests.reset_role();

SELECT tests.as_anon();
SELECT throws_ok($$ SELECT public.write_memory_item('{}', '[]') $$, '42501', NULL, 'anon cannot call it');
SELECT tests.reset_role();

-- ── Founder review (Checkpoint B): ownership and cross-user attachment ──
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001511', 'B''s Ben');
-- Smuggling A as the owner in the payload: ignored; the caller owns it.
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001512", "user_id": "aaaaaaaa-1515-1515-1515-151515151515",
    "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001511", "statement": "x", "origin": "user",
    "detail": {"category": "other"}}',
  '[{"source_kind": "user_edit", "user_id": "aaaaaaaa-1515-1515-1515-151515151515"}]') $s$) $$,
  'a user_id in the payload is ignored');
SELECT tests.reset_role();
SELECT is((SELECT user_id FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001512'),
  :B::uuid, 'the item belongs to the caller (from auth.uid()), never to a user named in the payload');
SELECT is((SELECT array_agg(DISTINCT user_id) FROM public.memory_item_sources
           WHERE memory_item_id = '00000000-0000-0000-0000-000000001512'),
  ARRAY[:B::uuid], 'its sources belong to the caller too');

SELECT tests.as_user(:B);
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001513", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001511",
    "statement": "x", "origin": "user", "detail": {"category": "other"}}',
  '[{"capture_id": "00000000-0000-0000-0000-000000001502", "source_kind": "capture", "span_start": 0, "span_end": 3}]') $$,
  '23503', NULL, 'B cannot cite A''s capture as the source');
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001503", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001511",
    "statement": "hijack", "origin": "user", "detail": {"category": "other"}}',
  '[{"source_kind": "user_edit"}]') $$,
  '23505', NULL, 'reusing A''s item id neither returns A''s item nor overwrites it');
SELECT tests.reset_role();
SELECT is((SELECT statement FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001503'),
  'Ben runs Chicago Sunday', 'A''s item is untouched');

SELECT tests.as_user(:A);
INSERT INTO public.related_people (id, person_id, relation)
  VALUES ('00000000-0000-0000-0000-000000001514', '00000000-0000-0000-0000-000000001501', 'sister');
SELECT tests.reset_role();
SELECT tests.as_user(:B);
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001515", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001511",
    "subject_type": "related", "subject_related_id": "00000000-0000-0000-0000-000000001514",
    "statement": "x", "origin": "user", "detail": {"category": "other"}}',
  '[{"source_kind": "user_edit"}]') $$,
  '23503', NULL, 'B cannot use A''s related person as the subject');
SELECT throws_ok($$ SELECT public.write_memory_item(
  '{"id": "00000000-0000-0000-0000-000000001516", "kind": "fact", "person_id": "00000000-0000-0000-0000-000000001511",
    "statement": "x", "origin": "user", "detail": {"category": "other"}}',
  '[{"source_kind": "capture", "span_start": 0, "span_end": 3}]') $$,
  '23514', NULL, 'a capture source without a capture is refused');
SELECT tests.reset_role();

-- Security posture.
SELECT ok(NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.write_memory_item(jsonb, jsonb)'::regprocedure),
  'it runs as the caller (SECURITY INVOKER), so RLS and column privileges apply');
SELECT ok((SELECT 'search_path=""' = ANY (proconfig) FROM pg_proc
           WHERE oid = 'public.write_memory_item(jsonb, jsonb)'::regprocedure)
      AND NOT has_function_privilege('anon', 'public.write_memory_item(jsonb, jsonb)', 'EXECUTE')
      AND NOT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
                      WHERE p.oid = 'public.write_memory_item(jsonb, jsonb)'::regprocedure
                        AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'),
  'it pins an empty search_path and is not executable by anon or PUBLIC');

SELECT * FROM finish();
ROLLBACK;
