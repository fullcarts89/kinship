-- The alpha trust floor (FD-30e, CC-25; D13, PER-05, SET-05): a paused or
-- remembered person gets no reason, however their evidence reads; two People
-- who are one person merge with every memory and its source kept and the
-- merged person archived, not deleted; Undo reverses exactly what the merge
-- changed; only the owner can merge their own people; and account deletion
-- leaves no row for the user in any table, the merge journal included.
BEGIN;
SELECT plan(49);

\set A '''aaaaaaaa-7272-7272-7272-727272727272'''
\set B '''bbbbbbbb-7272-7272-7272-727272727272'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000007299', 'Maya');
SELECT tests.reset_role();

\set ANTHONY '''00000000-0000-0000-0000-000000007201'''
\set LOPEZ   '''00000000-0000-0000-0000-000000007202'''
\set SAM     '''00000000-0000-0000-0000-000000007203'''
\set CHRIS   '''00000000-0000-0000-0000-000000007204'''
\set NOTE1   '''00000000-0000-0000-0000-000000007210'''
\set NOTE2   '''00000000-0000-0000-0000-000000007211'''
\set NOTE3   '''00000000-0000-0000-0000-000000007212'''
\set M_SKATE '''00000000-0000-0000-0000-000000007220'''
\set M_JOB   '''00000000-0000-0000-0000-000000007221'''
\set M_TAHOE '''00000000-0000-0000-0000-000000007222'''
\set M_SIS   '''00000000-0000-0000-0000-000000007223'''
\set M_RACE  '''00000000-0000-0000-0000-000000007224'''
\set REL_SIS '''00000000-0000-0000-0000-000000007230'''

CREATE FUNCTION pg_temp.line(item uuid, capture uuid, person uuid, kind text, statement text, detail jsonb,
                             with_ids uuid[] DEFAULT '{}', mentions jsonb DEFAULT '[]', related uuid DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  SELECT public.write_memory_item(
    jsonb_build_object('id', item, 'kind', kind, 'person_id', person, 'statement', statement, 'origin', 'user',
                       'user_state', 'user_authored', 'detail', detail,
                       'subject_type', CASE WHEN related IS NULL THEN 'person' ELSE 'related' END, 'subject_related_id', related),
    jsonb_build_array(jsonb_build_object('source_kind', 'capture', 'capture_id', capture, 'span_start', 0, 'span_end', 4)));
  UPDATE public.memory_items SET with_person_ids = with_ids, person_mentions = mentions, version = version + 1 WHERE id = item;
$$;

-- ─── The founder's People: Anthony (by name) and Anthony Lopez (from Contacts) ─
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, full_name, contact_ref, birthday, birthday_source, nicknames) VALUES
  (:ANTHONY, 'Anthony', NULL, NULL, NULL, NULL, '{}'),
  (:LOPEZ, 'Anthony Lopez', 'Anthony Lopez', 'contact-lopez', '1990-03-14', 'contacts', '{}'),
  (:SAM, 'Sam Eden', 'Sam Eden', NULL, NULL, NULL, '{}'),
  (:CHRIS, 'Chris', NULL, NULL, '1988-11-02', 'user_edit', '{}');
INSERT INTO public.captures (id, source, raw_text, context_person_id) VALUES
  (:NOTE1, 'text', 'Anthony and Sam love ice skating with Chris', :ANTHONY),
  (:NOTE2, 'text', 'Anthony starts his new job Monday', NULL),
  (:NOTE3, 'text', 'Chris runs Chicago Sunday', NULL);
INSERT INTO public.related_people (id, person_id, relation, name) VALUES (:REL_SIS, :ANTHONY, 'sister', 'Maria');
SELECT pg_temp.line(:M_SKATE, :NOTE1, :ANTHONY, 'fact', 'Anthony and Sam love ice skating with Chris', '{"category": "interest"}',
  ARRAY[:SAM, :CHRIS]::uuid[], jsonb_build_array(jsonb_build_object('person_id', :ANTHONY, 'text', 'Anthony', 'name', 'Anthony'),
                                                   jsonb_build_object('person_id', :SAM, 'text', 'Sam', 'name', 'Sam Eden')));
SELECT pg_temp.line(:M_JOB, :NOTE2, :ANTHONY, 'event', 'Anthony starts his new job Monday',
  jsonb_build_object('date', (current_date + 3)::text, 'date_precision', 'day', 'event_type', 'job_start', 'followup_policy', 'before'));
SELECT pg_temp.line(:M_TAHOE, :NOTE1, :SAM, 'moment', 'Sam and Anthony went to Tahoe', '{}', ARRAY[:ANTHONY]::uuid[],
  jsonb_build_array(jsonb_build_object('person_id', :SAM, 'text', 'Sam', 'name', 'Sam Eden'), jsonb_build_object('person_id', :ANTHONY, 'text', 'Anthony', 'name', 'Anthony')));
SELECT pg_temp.line(:M_SIS, :NOTE1, :ANTHONY, 'fact', 'Anthony''s sister Maria lives in Reno', '{"category": "other"}', '{}', '[]', :REL_SIS);
SELECT pg_temp.line(:M_RACE, :NOTE3, :CHRIS, 'event', 'Chris runs Chicago Sunday',
  jsonb_build_object('date', (current_date + 2)::text, 'date_precision', 'day', 'event_type', 'race', 'followup_policy', 'before'));
INSERT INTO public.contact_events (id, person_id, channel, source) VALUES ('00000000-0000-0000-0000-000000007240', :ANTHONY, 'text', 'manual');
INSERT INTO public.person_identities (id, person_id, kind, value_hash) VALUES
  ('00000000-0000-0000-0000-000000007250', :ANTHONY, 'phone', repeat('a', 64)),
  ('00000000-0000-0000-0000-000000007251', :LOPEZ, 'phone', repeat('b', 64));
SELECT tests.reset_role();

-- ─── D13: paused and remembered people get nothing proactive ─────────────────
SELECT tests.as_service();
SELECT ok(public.reasons_refresh(:A, current_date, 'UTC') >= 2, 'Anthony''s job start and Chris''s race each open a reason');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = :CHRIS AND state = 'candidate'), 1, 'Chris has an open reason');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.people SET state = 'paused', version = version + 1 WHERE id = :CHRIS;
SELECT is(public.person_proactive(:CHRIS, :A), false, 'person_proactive: a paused person is not proactive');
SELECT is(public.person_proactive(:ANTHONY, :A), true, 'person_proactive: an active person is');
SELECT is(public.person_proactive(:CHRIS, :B), false, 'person_proactive: never for someone else''s id');
SELECT tests.reset_role();
SELECT is((SELECT string_agg(DISTINCT state, ',') FROM public.reasons WHERE user_id = :A AND person_id = :CHRIS), 'suppressed', 'pausing Chris silences his open reason at once');
SELECT tests.as_service();
SELECT lives_ok(format('SELECT public.reasons_refresh(%L, current_date, ''UTC'')', 'aaaaaaaa-7272-7272-7272-727272727272'), 'a refresh with a paused person runs');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = :CHRIS AND state IN ('candidate', 'scheduled', 'surfaced')), 0,
  'and produces nothing for him while paused, though his race is still ahead');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.people SET state = 'remembered', version = version + 1 WHERE id = :CHRIS;
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT lives_ok(format('SELECT public.reasons_refresh(%L, current_date, ''UTC'')', 'aaaaaaaa-7272-7272-7272-727272727272'), 'a refresh with a remembered person runs');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = :CHRIS AND state IN ('candidate', 'scheduled', 'surfaced')), 0,
  'nothing for someone remembered either');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.people SET state = 'active', version = version + 1 WHERE id = :CHRIS;
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT ok(public.reasons_refresh(:A, current_date, 'UTC') >= 1, 'Resume: the next refresh may speak of Chris again');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = :CHRIS AND state = 'candidate'), 1,
  'his race''s reason is back (the suppressed row revived, N8), not duplicated');
SELECT tests.reset_role();

-- ─── PER-05: merge Anthony into Anthony Lopez ─────────────────────────────────
-- Not for anyone else's people.
SELECT tests.as_user(:B);
SELECT throws_ok(format('SELECT public.merge_people(%L, %L)', '00000000-0000-0000-0000-000000007202', '00000000-0000-0000-0000-000000007201'),
  'P0002', NULL, 'another user cannot merge my people (they are not there for them)');
SELECT tests.reset_role();
SELECT tests.as_anon();
SELECT throws_ok(format('SELECT public.merge_people(%L, %L)', '00000000-0000-0000-0000-000000007202', '00000000-0000-0000-0000-000000007201'),
  '42501', NULL, 'anon cannot merge');
SELECT tests.reset_role();

SELECT tests.as_user(:A);
SELECT throws_ok(format('SELECT public.merge_people(%L, %L)', '00000000-0000-0000-0000-000000007201', '00000000-0000-0000-0000-000000007201'),
  '22023', NULL, 'a person is never merged with themself');
CREATE TEMP TABLE merged AS SELECT public.merge_people(:LOPEZ, :ANTHONY) AS row;
SELECT is((SELECT row ->> 'target_id' FROM merged), '00000000-0000-0000-0000-000000007202', 'the merge returns its journal row');

SELECT is((SELECT array_agg(statement ORDER BY statement) FROM public.memory_items WHERE person_id = :LOPEZ AND deleted_at IS NULL),
  ARRAY['Anthony and Sam love ice skating with Chris', 'Anthony starts his new job Monday', 'Anthony''s sister Maria lives in Reno'],
  'every memory filed on Anthony is filed on Anthony Lopez');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE person_id = :ANTHONY AND deleted_at IS NULL), 0, 'nothing is left filed on the merged person');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources s JOIN public.memory_items m ON m.id = s.memory_item_id
            WHERE m.person_id = :LOPEZ AND s.deleted_at IS NULL), 3, 'each moved memory keeps its source, untouched');
SELECT is((SELECT with_person_ids FROM public.memory_items WHERE id = :M_TAHOE), ARRAY[:LOPEZ]::uuid[],
  'a memory shared with Anthony is shared with Anthony Lopez');
SELECT is((SELECT person_mentions -> 1 ->> 'person_id' FROM public.memory_items WHERE id = :M_TAHOE), '00000000-0000-0000-0000-000000007202',
  'the words that named Anthony now name Anthony Lopez');
SELECT is((SELECT person_mentions -> 1 ->> 'text' FROM public.memory_items WHERE id = :M_TAHOE), 'Anthony', 'the note''s own word for him is unchanged');
SELECT is((SELECT person_id FROM public.related_people WHERE id = :REL_SIS), :LOPEZ::uuid, 'his sister is Anthony Lopez''s sister now');
SELECT is((SELECT context_person_id FROM public.captures WHERE id = :NOTE1), :LOPEZ::uuid, 'a note told from his page is told from the survivor''s');
SELECT is((SELECT person_id FROM public.contact_events WHERE id = '00000000-0000-0000-0000-000000007240'), :LOPEZ::uuid, 'the conversation follows');
SELECT is((SELECT count(*)::int FROM public.person_identities WHERE person_id = :LOPEZ AND deleted_at IS NULL), 2,
  'his hashed phone is the survivor''s too');
SELECT is((SELECT state FROM public.people WHERE id = :ANTHONY), 'archived', 'the merged person is archived, not deleted');
SELECT is((SELECT count(*)::int FROM public.people WHERE id = :ANTHONY AND deleted_at IS NULL), 1, 'their record is still there');
SELECT is((SELECT nicknames FROM public.people WHERE id = :LOPEZ), ARRAY['Anthony']::text[],
  'the survivor goes by the merged name too, so a later "Anthony" finds them');
SELECT is((SELECT birthday FROM public.people WHERE id = :LOPEZ), '1990-03-14'::date, 'the survivor''s own birthday stands');
SELECT tests.reset_role();
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = :ANTHONY), 0, 'no reason points at the merged person');
SELECT is((SELECT state FROM public.reasons WHERE user_id = :A AND dedupe_key LIKE '%' || :M_JOB || '%' LIMIT 1), 'suppressed',
  'his open reason went quiet with the merge');
SELECT tests.as_service();
SELECT lives_ok(format('SELECT public.reasons_refresh(%L, current_date, ''UTC'')', 'aaaaaaaa-7272-7272-7272-727272727272'), 'a refresh after the merge runs');
SELECT is((SELECT count(*)::int FROM public.reasons WHERE user_id = :A AND person_id = :LOPEZ AND state = 'candidate'
            AND dedupe_key LIKE '%' || :M_JOB || '%'), 1,
  'the next refresh speaks of the job start for Anthony Lopez (one reason, not two)');
SELECT tests.reset_role();

-- Removed, then merged into: refused until brought back.
SELECT tests.as_user(:A);
UPDATE public.people SET state = 'archived', version = version + 1 WHERE id = :SAM;
SELECT throws_ok(format('SELECT public.merge_people(%L, %L)', '00000000-0000-0000-0000-000000007203', '00000000-0000-0000-0000-000000007204'),
  '22023', NULL, 'no merging into someone removed from People');
UPDATE public.people SET state = 'active', version = version + 1 WHERE id = :SAM;

-- ─── Undo: exactly what the merge changed, and nothing since ─────────────────
UPDATE public.people SET display_name = 'Tony Lopez', version = version + 1 WHERE id = :LOPEZ;
SELECT lives_ok(format('SELECT public.undo_merge_people(%L)', (SELECT row ->> 'id' FROM merged)), 'the owner undoes the merge');
SELECT is((SELECT array_agg(statement ORDER BY statement) FROM public.memory_items WHERE person_id = :ANTHONY AND deleted_at IS NULL),
  ARRAY['Anthony and Sam love ice skating with Chris', 'Anthony starts his new job Monday', 'Anthony''s sister Maria lives in Reno'],
  'every memory is back on Anthony');
SELECT is((SELECT with_person_ids FROM public.memory_items WHERE id = :M_TAHOE), ARRAY[:ANTHONY]::uuid[], 'the shared memory is shared with Anthony again');
SELECT is((SELECT person_mentions -> 1 ->> 'person_id' FROM public.memory_items WHERE id = :M_TAHOE), '00000000-0000-0000-0000-000000007201', 'its mention names him again');
SELECT is((SELECT state FROM public.people WHERE id = :ANTHONY), 'active', 'Anthony is back in People');
SELECT is((SELECT display_name FROM public.people WHERE id = :LOPEZ), 'Tony Lopez', 'a rename made since the merge is kept');
SELECT is((SELECT nicknames FROM public.people WHERE id = :LOPEZ), '{}'::text[], 'the name the merge added is taken back');
SELECT is((SELECT count(*)::int FROM public.person_identities WHERE person_id = :ANTHONY AND deleted_at IS NULL), 1, 'his hashed phone is his again');
SELECT is((SELECT undone_at IS NOT NULL FROM public.people_merges WHERE id = (SELECT (row ->> 'id')::uuid FROM merged)), true, 'the journal says undone');
SELECT tests.reset_role();

-- ─── SET-05: deletion leaves no row anywhere, the journal included ───────────
SELECT tests.as_user(:A);
SELECT lives_ok(format('SELECT public.merge_people(%L, %L)', '00000000-0000-0000-0000-000000007202', '00000000-0000-0000-0000-000000007201'), 'merged again before deleting');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT lives_ok(format('SELECT public.delete_user_account(%L)', 'aaaaaaaa-7272-7272-7272-727272727272'), 'the account is deleted');
SELECT tests.reset_role();
SELECT is((
  WITH owned AS MATERIALIZED (
    SELECT c.table_name FROM information_schema.columns c
      JOIN information_schema.tables t USING (table_schema, table_name)
     WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND t.table_type = 'BASE TABLE')
  SELECT count(*)::int FROM owned x
   WHERE (xpath('/row/n/text()', query_to_xml(format('select count(*) n from public.%I where user_id = %L', x.table_name,
                 'aaaaaaaa-7272-7272-7272-727272727272'), false, true, '')))[1]::text::int > 0), 0,
  'no table with a user_id column holds a row for the deleted user');
SELECT is((SELECT count(*)::int FROM public.people_merges WHERE user_id = :A), 0, 'the merge journal is gone with them');
SELECT is((SELECT count(*)::int FROM public.people WHERE user_id = :B), 1, 'the other user''s people are untouched');

SELECT * FROM finish();
ROLLBACK;
