-- Native trust and memory stabilization (20261006090000): one memory on
-- several people with one source, relationships the note states, a
-- cancellation closing the plan it cancels whatever its kind, someone else's
-- promise to the user, and how a memory updated an older one.
BEGIN;
SELECT plan(16);

\set A '''aaaaaaaa-6262-6262-6262-626262626262'''
\set B '''bbbbbbbb-6262-6262-6262-626262626262'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, relationship_label) VALUES
  ('00000000-0000-0000-0000-000000006201', 'Ben', NULL),
  ('00000000-0000-0000-0000-000000006202', 'John', NULL),
  ('00000000-0000-0000-0000-000000006203', 'Susan', 'big sis'),
  ('00000000-0000-0000-0000-000000006204', 'Tyler', NULL);
INSERT INTO public.captures (id, source, raw_text, time_zone) VALUES
  ('00000000-0000-0000-0000-000000006210', 'text', 'Ben and John went to Tahoe. Ben and John are my brothers, and so is Susan.', 'America/Los_Angeles'),
  ('00000000-0000-0000-0000-000000006211', 'text', 'Susan is not moving to Alameda anymore.', 'America/Los_Angeles'),
  ('00000000-0000-0000-0000-000000006212', 'text', 'Tyler said he''d send me his contractor''s number Wednesday.', 'America/Los_Angeles');
SELECT tests.reset_role();
INSERT INTO public.memory_items (id, user_id, kind, person_id, statement, certainty, detail, origin, extraction_confidence) VALUES
  ('00000000-0000-0000-0000-000000006220', :A, 'event', '00000000-0000-0000-0000-000000006203', 'Susan is planning on moving to Alameda next summer', 'planned',
   '{"event_type": "move", "followup_policy": "after", "date_precision": "season", "date": "2027-06-01", "date_end": "2027-08-31"}', 'extracted', 0.9);
INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind) VALUES (:A, '00000000-0000-0000-0000-000000006220', 'user_edit');

SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006210'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-6262-6262-6262-626262626262', '00000000-0000-0000-0000-000000006210', 'relationship_extract/v6+claude-opus-5-5', false,
  '[{"kind": "moment", "person_id": "00000000-0000-0000-0000-000000006201", "subject_type": "person", "related": null,
     "statement": "Ben and John went to Tahoe", "certainty": "stated", "sensitivity": "none", "confidence": 0.95, "detail": {},
     "with_person_ids": ["00000000-0000-0000-0000-000000006202", "00000000-0000-0000-0000-000000006201"],
     "spans": [{"start": 0, "end": 26}], "action": {"type": "new", "target_id": null}},
    {"kind": "fact", "person_id": "00000000-0000-0000-0000-000000006201", "subject_type": "person", "related": null,
     "statement": "Ben and John are your brothers", "certainty": "stated", "sensitivity": "none", "confidence": 0.95,
     "detail": {"category": "family"}, "with_person_ids": ["00000000-0000-0000-0000-000000006202"],
     "self_relations": {"00000000-0000-0000-0000-000000006201": "brother", "00000000-0000-0000-0000-000000006202": "brother"},
     "spans": [{"start": 28, "end": 58}], "action": {"type": "new", "target_id": null}}]') $s$) $$,
  'a shared memory and a stated relationship are written');
SELECT is((SELECT with_person_ids FROM public.memory_items WHERE statement = 'Ben and John went to Tahoe'),
  ARRAY['00000000-0000-0000-0000-000000006202']::uuid[], 'one memory, on Ben and also John (never Ben twice)');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources s JOIN public.memory_items i ON i.id = s.memory_item_id
             WHERE i.statement = 'Ben and John went to Tahoe'), 1, 'with one source');
SELECT is((SELECT array_agg(relationship_label ORDER BY display_name) FROM public.people WHERE user_id = :A AND display_name IN ('Ben', 'John')),
  ARRAY['brother', 'brother'], 'the relationship the note states is kept on each');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006211'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-6262-6262-6262-626262626262', '00000000-0000-0000-0000-000000006211', 'relationship_extract/v6+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000006203", "subject_type": "person", "related": null,
     "statement": "Susan is not moving to Alameda anymore", "certainty": "stated", "sensitivity": "none", "confidence": 0.95,
     "detail": {"category": "home", "transition": "cancelled"}, "self_relations": {"00000000-0000-0000-0000-000000006203": "sister"},
     "spans": [{"start": 0, "end": 38}], "action": {"type": "supersede", "target_id": "00000000-0000-0000-0000-000000006220"}}]') $s$) $$,
  'a fact cancelling an event is written');
SELECT is((SELECT status FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006220'), 'superseded',
  'the plan it cancels is closed, whatever its kind');
SELECT is((SELECT row(supersedes_id, detail ->> 'transition')::text FROM public.memory_items WHERE statement = 'Susan is not moving to Alameda anymore'),
  '(00000000-0000-0000-0000-000000006220,cancelled)', 'and the history says how');
SELECT is((SELECT relationship_label FROM public.people WHERE id = '00000000-0000-0000-0000-000000006203'), 'big sis',
  'a relationship the user set is never written over');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006212'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-6262-6262-6262-626262626262', '00000000-0000-0000-0000-000000006212', 'relationship_extract/v6+claude-opus-5-5', false,
  '[{"kind": "promise", "person_id": "00000000-0000-0000-0000-000000006204", "subject_type": "person", "related": null,
     "statement": "Tyler said he''d send you his contractor''s number", "certainty": "stated", "sensitivity": "none", "confidence": 0.9,
     "detail": {"due_date": "2026-10-07", "due_hint": "Wednesday"},
     "spans": [{"start": 0, "end": 57}], "action": {"type": "new", "target_id": null}}]') $s$) $$,
  'someone else''s promise to the user is written as theirs');
SELECT is((SELECT row(kind, subject_type, detail ->> 'due_date')::text FROM public.memory_items WHERE person_id = '00000000-0000-0000-0000-000000006204'),
  '(promise,person,2026-10-07)', 'waiting on Tyler, with its day');

-- Another user's person can't be put on a memory.
SELECT tests.reset_role();
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000006231', 'B''s Ben');
SELECT tests.reset_role();
SELECT throws_ok($$ UPDATE public.memory_items SET with_person_ids = ARRAY['00000000-0000-0000-0000-000000006231']::uuid[]
                     WHERE statement = 'Ben and John went to Tahoe' $$,
  '23503', NULL, 'a shared person is always the user''s own');
SELECT throws_ok($$ UPDATE public.memory_items SET with_person_ids = ARRAY['00000000-0000-0000-0000-000000006201']::uuid[]
                     WHERE statement = 'Ben and John went to Tahoe' $$,
  '23514', NULL, 'never the person it is already filed on');
SELECT ok(NOT public.memory_detail_ok('fact', '{"category": "home", "transition": "maybe"}'), 'a transition is progress, completed or cancelled');

SELECT * FROM finish();
ROLLBACK;
