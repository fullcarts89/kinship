-- Per-line person mentions (20261008090000; founder I12/I13, Gate 0
-- remediation decision 1b): which words in a line name which person, kept by
-- the server's writes, guarded, and filled once for older lines by rules that
-- never guess. The words, the note and the sources never change.
BEGIN;
SELECT plan(37);

\set A '''aaaaaaaa-6565-6565-6565-656565656565'''
\set B '''bbbbbbbb-6565-6565-6565-656565656565'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, full_name, nicknames) VALUES
  ('00000000-0000-0000-0000-000000006501', 'Loo Loo', 'Loo Loo', ARRAY['Cutie Pie', 'Boo Boo']),
  ('00000000-0000-0000-0000-000000006502', 'Kaiya', NULL, '{}'),
  ('00000000-0000-0000-0000-000000006503', 'Michelle Lee', 'Michelle Lee', '{}'),
  ('00000000-0000-0000-0000-000000006504', 'Sam Eden', 'Sam Eden', '{}'),
  ('00000000-0000-0000-0000-000000006505', 'Sam Doughty', 'Sam Doughty', '{}'),
  ('00000000-0000-0000-0000-000000006506', 'Chris', NULL, '{}'),
  ('00000000-0000-0000-0000-000000006507', 'Elizabeth Chen', 'Elizabeth Chen', '{}'),
  ('00000000-0000-0000-0000-000000006508', 'Benny', 'Benny', ARRAY['Ben Oxnard', 'Ben']);
INSERT INTO public.captures (id, source, raw_text, time_zone) VALUES
  ('00000000-0000-0000-0000-000000006510', 'text', 'Michelle and Sam might be moving to Australia.', 'America/Los_Angeles'),
  ('00000000-0000-0000-0000-000000006511', 'text', 'Sam and Michelle might be moving to Australia.', 'America/Los_Angeles'),
  ('00000000-0000-0000-0000-000000006512', 'text', 'Zed got a raise.', 'America/Los_Angeles');
SELECT tests.reset_role();
SELECT tests.as_user(:B);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000006599', 'B''s Zed');
SELECT tests.reset_role();

-- Lines told before this migration (the founder's, in shape).
INSERT INTO public.memory_items (id, user_id, kind, person_id, subject_type, statement, certainty, detail, origin, extraction_confidence, user_state, with_person_ids) VALUES
  ('00000000-0000-0000-0000-000000006521', :A, 'moment', '00000000-0000-0000-0000-000000006501', 'person', 'Wifey got promoted', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006522', :A, 'moment', '00000000-0000-0000-0000-000000006501', 'person', 'Wifey said she might be moving to Seattle with her friend from work', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006523', :A, 'moment', '00000000-0000-0000-0000-000000006501', 'person', 'Wifey is thinking about moving to Marin next summer', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006524', :A, 'moment', '00000000-0000-0000-0000-000000006502', 'person', 'Wifey has a new job she''s really excited about', 'stated', '{}', 'extracted', 0.9, 'edited', '{}'),
  ('00000000-0000-0000-0000-000000006525', :A, 'moment', '00000000-0000-0000-0000-000000006503', 'person', 'Michelle Lee and Sam went to Disneyland', 'stated', '{}', 'extracted', 0.9, 'unreviewed', ARRAY['00000000-0000-0000-0000-000000006504']::uuid[]),
  ('00000000-0000-0000-0000-000000006526', :A, 'moment', '00000000-0000-0000-0000-000000006506', 'person', 'Sam loves watching Dragonball Z', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006527', :A, 'moment', '00000000-0000-0000-0000-000000006507', 'person', 'Liz got promoted', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006528', :A, 'moment', '00000000-0000-0000-0000-000000006507', 'person', 'Liz is moving to Denver', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006529', :A, 'moment', '00000000-0000-0000-0000-000000006508', 'person', 'Dinner was great', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006530', :A, 'moment', '00000000-0000-0000-0000-000000006508', 'person', 'Dinner plans on Friday', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006531', :A, 'moment', '00000000-0000-0000-0000-000000006508', 'person', 'Ben''s birthday dinner is Saturday', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006532', :A, 'moment', '00000000-0000-0000-0000-000000006501', 'person', 'Cutie Pie got a raise', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006533', :A, 'moment', '00000000-0000-0000-0000-000000006502', 'person', 'She has a new job', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006534', :A, 'moment', '00000000-0000-0000-0000-000000006506', 'person', 'Chris took Chris''s mom to the park', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006535', :A, 'promise', '00000000-0000-0000-0000-000000006503', 'user', 'Send Michelle that restaurant', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}'),
  ('00000000-0000-0000-0000-000000006536', :A, 'moment', '00000000-0000-0000-0000-000000006501', 'person', 'Loo Loo got a raise', 'stated', '{}', 'extracted', 0.9, 'unreviewed', '{}');
INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind)
  SELECT :A, id, 'user_edit' FROM public.memory_items WHERE user_id = :A;

-- ─── The column and its guards ───────────────────────────────────────────────

SELECT col_default_is('public', 'memory_items', 'person_mentions', '[]', 'a line names no one until told');
SELECT throws_ok($$ UPDATE public.memory_items SET person_mentions = '[{"person_id": "not-a-uuid", "text": "Wifey", "name": null}]'
                    WHERE id = '00000000-0000-0000-0000-000000006533' $$, '23514', NULL, 'a person id is a uuid');
SELECT throws_ok($$ UPDATE public.memory_items SET person_mentions = '[{"person_id": "00000000-0000-0000-0000-000000006502", "text": "She"}]'
                    WHERE id = '00000000-0000-0000-0000-000000006533' $$, '23514', NULL, 'every mention says the name it was recorded under (or null)');
SELECT throws_ok($$ UPDATE public.memory_items SET person_mentions = '[{"person_id": "00000000-0000-0000-0000-000000006502", "text": " ", "name": null}]'
                    WHERE id = '00000000-0000-0000-0000-000000006533' $$, '23514', NULL, 'and some words');
SELECT throws_ok($$ UPDATE public.memory_items SET person_mentions = '[{"person_id": "00000000-0000-0000-0000-000000006502", "text": "Kaiya", "name": null, "score": 1}]'
                    WHERE id = '00000000-0000-0000-0000-000000006533' $$, '23514', NULL, 'and nothing else');
SELECT throws_ok($$ UPDATE public.memory_items SET person_mentions = '[{"person_id": "00000000-0000-0000-0000-000000006599", "text": "Zed", "name": "B''s Zed"}]'
                    WHERE id = '00000000-0000-0000-0000-000000006533' $$, '23503', NULL, 'never someone else''s person');

SELECT tests.as_user(:A);
SELECT lives_ok($$ UPDATE public.memory_items SET version = version + 1,
                    person_mentions = '[{"person_id": "00000000-0000-0000-0000-000000006502", "text": "Kaiya", "name": "Kaiya"}]'
                    WHERE id = '00000000-0000-0000-0000-000000006533' $$, 'the user''s own correction keeps them');
UPDATE public.memory_items SET version = version + 1, person_mentions = '[]' WHERE id = '00000000-0000-0000-0000-000000006533';
SELECT tests.reset_role();

-- ─── write_extraction ────────────────────────────────────────────────────────

SELECT tests.as_service();
SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006510'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-6565-6565-6565-656565656565', '00000000-0000-0000-0000-000000006510', 'relationship_extract/v6+claude-opus-5-5', false,
  '[{"kind": "moment", "person_id": "00000000-0000-0000-0000-000000006503", "subject_type": "person", "related": null,
     "statement": "Michelle and Sam might be moving to Australia", "certainty": "stated", "sensitivity": "none", "confidence": 0.9, "detail": {},
     "with_person_ids": ["00000000-0000-0000-0000-000000006504"],
     "person_mentions": [{"person_id": "00000000-0000-0000-0000-000000006503", "text": "Michelle", "name": "Michelle Lee"},
                         {"person_id": "00000000-0000-0000-0000-000000006505", "text": "Sam", "name": "Sam Doughty"},
                         {"person_id": "00000000-0000-0000-0000-000000006504", "text": "Sam", "name": "Sam Eden", "extra": 1}],
     "spans": [{"start": 0, "end": 46}], "action": {"type": "new", "target_id": null}}]') $s$) $$,
  'a line is written with which words name whom');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE statement = 'Michelle and Sam might be moving to Australia'),
  '[{"name": "Michelle Lee", "text": "Michelle", "person_id": "00000000-0000-0000-0000-000000006503"},
    {"name": "Sam Eden", "text": "Sam", "person_id": "00000000-0000-0000-0000-000000006504"}]'::jsonb,
  'only for the people it is about, only the three fields; never a guess at someone it is not about');

SELECT is(public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006511'), 'claimed', 'claimed');
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$ SELECT public.write_extraction(
  'aaaaaaaa-6565-6565-6565-656565656565', '00000000-0000-0000-0000-000000006511', 'relationship_extract/v6+claude-opus-5-5', false,
  jsonb_build_array(jsonb_build_object('kind', 'moment', 'person_id', '00000000-0000-0000-0000-000000006503', 'subject_type', 'person', 'related', NULL,
     'statement', 'Sam and Michelle might be moving to Australia', 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.9, 'detail', '{}'::jsonb,
     'with_person_ids', '["00000000-0000-0000-0000-000000006504"]'::jsonb,
     'person_mentions', '[{"person_id": "00000000-0000-0000-0000-000000006503", "text": "Michelle", "name": "Michelle Lee"}]'::jsonb,
     'spans', '[{"start": 0, "end": 46}]'::jsonb,
     'action', jsonb_build_object('type', 'merge', 'target_id', (SELECT id FROM public.memory_items WHERE statement = 'Michelle and Sam might be moving to Australia'))))) $s$) $$,
  'the mirror of a kept line merges into it');
SELECT is((SELECT jsonb_array_length(person_mentions) FROM public.memory_items WHERE statement = 'Michelle and Sam might be moving to Australia'), 2,
  'a merge never adds a second set of words for someone already named');
SELECT tests.reset_role();

-- ─── resolve_capture_review: "Add Zed" ───────────────────────────────────────

SELECT tests.as_service();
SELECT public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006512');
SELECT public.write_extraction_with_review(:A, '00000000-0000-0000-0000-000000006512', 'relationship_extract/v6+claude-opus-5-5', true, '[]',
  jsonb_build_object('items', jsonb_build_array(jsonb_build_object(
    'kind', 'moment', 'person_id', NULL, 'new_person_name', 'Zed', 'subject_type', 'person', 'related', NULL,
    'statement', 'Zed got a raise', 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.8, 'detail', '{}'::jsonb,
    'spans', jsonb_build_array(jsonb_build_object('start', 0, 'end', 15, 'quote', 'Zed got a raise')),
    'action', jsonb_build_object('type', 'new', 'target_id', NULL), 'flags', jsonb_build_array('new_person'))),
    'clarification', jsonb_build_object('about', 'new_person', 'question', 'Who is Zed?', 'options', jsonb_build_array('Add Zed'))));
SELECT is(public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000006512',
  (SELECT created_at FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000006512'),
  '[{"kind": "moment", "person_id": "new:0", "subject_type": "person", "related": null, "statement": "Zed got a raise",
     "certainty": "stated", "sensitivity": "none", "confidence": 0.8, "detail": {},
     "person_mentions": [{"person_id": "new:0", "text": "Zed", "name": "Zed"}],
     "spans": [{"start": 0, "end": 15, "quote": "Zed got a raise"}], "action": {"type": "new", "target_id": null}}]',
  '[{"ref": "new:0", "display_name": "Zed"}]') ->> 'status', 'resolved',
  'the answer "Add Zed" is written');
SELECT is((SELECT person_mentions -> 0 ->> 'person_id' FROM public.memory_items WHERE statement = 'Zed got a raise'),
  (SELECT id::text FROM public.people WHERE user_id = :A AND display_name = 'Zed'),
  'the words for someone added in the answer name them by their new id');
SELECT tests.reset_role();

-- ─── The backfill ───────────────────────────────────────────────────────────

CREATE TEMP TABLE before_words AS SELECT id, statement FROM public.memory_items WHERE user_id = :A;
CREATE TEMP TABLE before_history AS SELECT count(*)::int AS n FROM public.memory_item_history WHERE user_id = :A;

SELECT is(public.backfill_person_mentions() ->> 'filled', '8', 'eight older lines are filled');

SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006521'),
  '[{"name": null, "text": "Wifey", "person_id": "00000000-0000-0000-0000-000000006501"}]'::jsonb,
  'I12: "Wifey" opens three of Loo Loo''s own lines and no one else''s: her earlier name, so the line reads "Loo Loo got promoted"');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE id IN ('00000000-0000-0000-0000-000000006522', '00000000-0000-0000-0000-000000006523')
             AND person_mentions = '[{"name": null, "text": "Wifey", "person_id": "00000000-0000-0000-0000-000000006501"}]'::jsonb), 2,
  'all three');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006532'),
  '[{"name": null, "text": "Cutie Pie", "person_id": "00000000-0000-0000-0000-000000006501"}]'::jsonb,
  'a name kept at a rename is an earlier name');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006525'),
  '[{"name": "Michelle Lee", "text": "Michelle Lee", "person_id": "00000000-0000-0000-0000-000000006503"},
    {"name": "Sam Eden", "text": "Sam", "person_id": "00000000-0000-0000-0000-000000006504"}]'::jsonb,
  'names they go by now, anywhere in a shared line, recorded under their current names (the words stay)');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006535'),
  '[{"name": "Michelle Lee", "text": "Michelle", "person_id": "00000000-0000-0000-0000-000000006503"}]'::jsonb,
  'a promise naming them too');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006536'),
  '[{"name": "Loo Loo", "text": "Loo Loo", "person_id": "00000000-0000-0000-0000-000000006501"}]'::jsonb,
  'her name now, even one whose first word repeats ("Loo" inside "Loo Loo" is the same name)');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006531'),
  '[{"name": null, "text": "Ben", "person_id": "00000000-0000-0000-0000-000000006508"}]'::jsonb,
  'a possessive earlier name');

SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006524'), '[]'::jsonb,
  'the line moved to Kaiya before I13 still says "Wifey": never recorded as Kaiya''s');
SELECT is((SELECT reason FROM public.person_mentions_backfill_report WHERE memory_item_id = '00000000-0000-0000-0000-000000006524'), 'used_for_others',
  'and listed: its opening name is someone else''s');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006526'), '[]'::jsonb,
  'never another person''s name: "Sam loves…" on Chris');
SELECT is((SELECT reason FROM public.person_mentions_backfill_report WHERE memory_item_id = '00000000-0000-0000-0000-000000006526'), 'names_someone_else',
  'listed');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE id IN ('00000000-0000-0000-0000-000000006527', '00000000-0000-0000-0000-000000006528')
             AND person_mentions = '[]'::jsonb), 2,
  '1b: "Liz" for someone never renamed is left as the user wrote it');
SELECT is((SELECT count(*)::int FROM public.person_mentions_backfill_report WHERE memory_item_id IN ('00000000-0000-0000-0000-000000006527', '00000000-0000-0000-0000-000000006528')), 0,
  'and not listed: nothing needs filling');
SELECT is((SELECT array_agg(reason ORDER BY memory_item_id) FROM public.person_mentions_backfill_report
            WHERE memory_item_id IN ('00000000-0000-0000-0000-000000006529', '00000000-0000-0000-0000-000000006530')),
  ARRAY['common_word', 'common_word'], 'a word the user also writes in lowercase ("dinner") is never taken for a name');
SELECT is((SELECT person_mentions FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000006533'), '[]'::jsonb,
  'never he/she/you');
SELECT is((SELECT count(*)::int FROM public.person_mentions_backfill_report WHERE memory_item_id = '00000000-0000-0000-0000-000000006533'), 0,
  'and a line that names no one isn''t listed');
SELECT is((SELECT reason FROM public.person_mentions_backfill_report WHERE memory_item_id = '00000000-0000-0000-0000-000000006534'), 'repeated_in_line',
  'never ambiguous words: a name written twice is listed, not guessed');

SELECT is((SELECT count(*)::int FROM public.memory_items m JOIN before_words b USING (id) WHERE m.statement IS DISTINCT FROM b.statement), 0,
  'no line''s words change');
SELECT is((SELECT count(*)::int FROM public.memory_item_history WHERE user_id = :A), (SELECT n FROM before_history),
  'and no line gains an edit history');
SELECT is(public.backfill_person_mentions() ->> 'filled', '0', 'running it again fills nothing new');

SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT count(*) FROM public.person_mentions_backfill_report $$, '42501', NULL, 'the report is the service''s, not the app''s');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
