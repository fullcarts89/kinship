-- Phase 4B step B3 (brief §21; founder CC-24): a later explicit change may
-- close a line the user edited. write_extraction closes an edited or
-- user-written residence line only on the user's own evidence: a change or
-- correction cue the database finds, in the note's characters, inside the
-- item's own span; or the stored residence question about that very line,
-- answered "Susan moved", through resolve_capture_review. A model target
-- alone is still dropped. Provenance and the edit are kept, and Undo
-- returns the edited version.
BEGIN;
SELECT plan(52);

\set A '''aaaaaaaa-6969-6969-6969-696969696969'''
SELECT tests.create_user(:A);

CREATE FUNCTION pg_temp.state(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT status || '/' || CASE WHEN deleted_at IS NULL THEN 'live' ELSE 'gone' END
    FROM public.memory_items WHERE id = item
$$;

CREATE FUNCTION pg_temp.facet_of(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce((SELECT CASE WHEN deleted_at IS NULL THEN 'live:' || value_text ELSE 'gone' END
                     FROM public.memory_item_facets WHERE memory_item_id = item
                    ORDER BY (deleted_at IS NULL) DESC, created_at DESC LIMIT 1), 'none')
$$;

-- Notes, by name: each attempt has its own.
CREATE TEMP TABLE notes (k text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid(), raw text NOT NULL);
GRANT ALL ON notes TO PUBLIC;
CREATE FUNCTION pg_temp.note(k text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM notes WHERE notes.k = $1 $$;
CREATE FUNCTION pg_temp.raw(k text) RETURNS text LANGUAGE sql AS $$ SELECT raw FROM notes WHERE notes.k = $1 $$;

-- A residence reading as the gateway sends it.
CREATE FUNCTION pg_temp.facet(words text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('slot', 'residence', 'value_text', words, 'value_norm', lower(words), 'candidates', '[]'::jsonb,
                            'decided_by', 'rule', 'rule_version', 'residence/v1', 'dataset_version', 'places-2026.10')
$$;

-- A stated home fact about Susan in note `k`: its words where the note says them, and its reading of `words`.
CREATE FUNCTION pg_temp.item(k text, statement text, words text, extra jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'kind', 'fact', 'person_id', '00000000-0000-0000-0000-000000006901', 'subject_type', 'person', 'related', null,
    'statement', statement, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.9,
    'detail', '{"category": "home"}'::jsonb,
    'spans', jsonb_build_array(jsonb_build_object(
      'start', strpos(pg_temp.raw(k), statement) - 1, 'end', strpos(pg_temp.raw(k), statement) - 1 + char_length(statement),
      'quote', statement)),
    'facets', jsonb_build_array(pg_temp.facet(words))) || extra
$$;

-- The same item replacing `target` as a change or a correction, citing `cue` (the first place the note says it).
CREATE FUNCTION pg_temp.closer(k text, statement text, words text, target uuid, transition text, cue text,
                               extra jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.item(k, statement, words, jsonb_build_object(
    'detail', jsonb_build_object('category', 'home') || CASE WHEN transition IS NULL THEN '{}'::jsonb
                                                             ELSE jsonb_build_object('transition', transition) END,
    'action', jsonb_build_object('type', 'supersede', 'target_id', target))
    || CASE WHEN cue IS NULL THEN '{}'::jsonb
            ELSE jsonb_build_object('cue', jsonb_build_object('start', strpos(pg_temp.raw(k), cue) - 1,
                                                              'end', strpos(pg_temp.raw(k), cue) - 1 + char_length(cue))) END
    || extra)
$$;

-- The gateway's write of one note; the first item's result.
CREATE FUNCTION pg_temp.tell(k text, items jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE res jsonb;
BEGIN
  PERFORM tests.as_service();
  PERFORM public.claim_capture_extraction('aaaaaaaa-6969-6969-6969-696969696969', pg_temp.note(k));
  res := public.write_extraction('aaaaaaaa-6969-6969-6969-696969696969', pg_temp.note(k),
                                 'relationship_extract/v6+claude-test', false, items);
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  PERFORM tests.reset_role();
  RETURN res -> 0;
END $$;

-- A note held for one question (the gateway's first write), then answered (resolve_capture_review).
CREATE FUNCTION pg_temp.held(k text, held jsonb) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM tests.as_service();
  PERFORM public.claim_capture_extraction('aaaaaaaa-6969-6969-6969-696969696969', pg_temp.note(k));
  PERFORM public.write_extraction_with_review('aaaaaaaa-6969-6969-6969-696969696969', pg_temp.note(k),
    'relationship_extract/v6+claude-test', true, '[]', jsonb_build_object('items', jsonb_build_array(held), 'clarification', null));
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  PERFORM tests.reset_role();
END $$;
CREATE FUNCTION pg_temp.answer(k text, resolved jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE res jsonb;
BEGIN
  PERFORM tests.as_service();
  res := public.resolve_capture_review('aaaaaaaa-6969-6969-6969-696969696969', pg_temp.note(k),
    (SELECT created_at FROM public.capture_reviews WHERE capture_id = pg_temp.note(k)), jsonb_build_array(resolved), NULL);
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  PERFORM tests.reset_role();
  RETURN res -> 'items' -> 0;
END $$;

-- The held item as the gateway stores it: the residence question about `target`.
CREATE FUNCTION pg_temp.asked(k text, statement text, words text, target uuid, flags jsonb DEFAULT '["residence_conflict"]')
RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.item(k, statement, words, jsonb_build_object(
    'tier', 'hold', 'flags', flags, 'still_in', jsonb_build_object('target_id', target, 'words', 'Alameda', 'stay', 'words')))
$$;
-- "Susan moved", as the gateway writes the answer: a change of the line asked about.
CREATE FUNCTION pg_temp.moved(k text, statement text, words text, target uuid) RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.closer(k, statement, words, target, 'changed', NULL)
$$;

-- The user edits a line (the app's correct()): new words, "edited", a user_edit source.
CREATE FUNCTION pg_temp.edit(item uuid, words text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM tests.as_user('aaaaaaaa-6969-6969-6969-696969696969');
  UPDATE public.memory_items SET statement = words, user_state = 'edited', version = version + 1 WHERE id = item;
  INSERT INTO public.memory_item_sources (memory_item_id, source_kind) VALUES (item, 'user_edit');
  PERFORM tests.reset_role();
END $$;

-- The gateway reads a line's words again (write_facets, B2).
CREATE FUNCTION pg_temp.derive(item uuid, words text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE res text;
BEGIN
  PERFORM tests.as_service();
  res := public.write_facets('aaaaaaaa-6969-6969-6969-696969696969', jsonb_build_array(jsonb_build_object(
    'memory_item_id', item, 'version', (SELECT version FROM public.memory_items WHERE id = item),
    'facets', jsonb_build_array(pg_temp.facet(words))))) -> 0 ->> 'result';
  PERFORM tests.reset_role();
  RETURN res;
END $$;

-- A line the user wrote themself (or another fixture state), with its source.
CREATE FUNCTION pg_temp.wrote(p_id uuid, p_person uuid, p_statement text) RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.memory_items (id, user_id, kind, person_id, subject_type, statement, detail, origin, user_state)
  VALUES (p_id, 'aaaaaaaa-6969-6969-6969-696969696969', 'fact', p_person, 'person', p_statement, '{"category": "home"}',
          'user', 'user_authored');
  INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind)
  VALUES ('aaaaaaaa-6969-6969-6969-696969696969', p_id, 'user_edit');
  RETURN p_id;
END $$;

-- Undo: the note goes with its lines.
CREATE FUNCTION pg_temp.undo(k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM tests.as_user('aaaaaaaa-6969-6969-6969-696969696969');
  UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = pg_temp.note(k);
  PERFORM tests.reset_role();
END $$;

CREATE TEMP TABLE out (k text PRIMARY KEY, v jsonb);
GRANT ALL ON out TO PUBLIC;
CREATE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql AS $$ SELECT (v ->> 'id')::uuid FROM out WHERE out.k = $1 $$;
CREATE FUNCTION pg_temp.action(k text) RETURNS text LANGUAGE sql AS $$ SELECT v ->> 'action' FROM out WHERE out.k = $1 $$;

-- ── People and notes ──
INSERT INTO notes (k, raw) VALUES
  ('ala', 'Susan lives in Alameda.'),
  ('col', 'Susan moved to Colorado.'),
  ('outside', 'Susan moved to Reno, I think. Susan lives in Colorado.'),
  ('model', 'Susan lives in Colorado.'),
  ('nocue', 'Susan lives in Colorado now.'),
  ('notcue', 'Susan lives in Colorado now.'),
  ('now', 'Susan lives in Colorado now.'),
  ('mismatch', 'Susan moved to Colorado!'),
  ('oak', 'Actually Susan lives in Oakland, not Alameda.'),
  ('actually', 'Actually Susan lives in Oakland.'),
  ('berk', 'Susan lives in Oakland, not Berkeley.'),
  ('denver', 'Susan lives in Denver.'),
  ('boise', 'Susan lives in Boise.'),
  ('tulsa', 'Susan lives in Tulsa.'),
  ('omaha', 'Susan lives in Omaha.'),
  ('fresno', 'Susan lives in Fresno.'),
  ('miami', 'Susan has moved to Miami.'),
  ('austin', 'Susan moved to Austin.'),
  ('dallas', 'Susan moved to Dallas.'),
  ('mike', 'Susan relocated to Tampa.'),
  ('shared', 'Susan relocated to Tampa.'),
  ('loves', 'Susan relocated to Tampa.'),
  ('together', 'Susan and Mike moved to Phoenix.'),
  ('plain', 'Susan lives in Colorado.');
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000006901', 'Susan'),
  ('00000000-0000-0000-0000-000000006902', 'Mike');
INSERT INTO public.captures (id, source, raw_text) SELECT id, 'text', raw FROM notes;
SELECT tests.reset_role();

-- Susan lives in Alameda (told and read), then the user edits it.
INSERT INTO out VALUES ('ala', pg_temp.tell('ala', jsonb_build_array(pg_temp.item('ala', 'Susan lives in Alameda', 'Alameda'))));
SELECT pg_temp.edit(pg_temp.id('ala'), 'Susan lives in Alameda with Jo');
SELECT is(pg_temp.facet_of(pg_temp.id('ala')), 'gone', 'an edit of the words tombstones the line''s reading (B2)');
SELECT is(pg_temp.derive(pg_temp.id('ala'), 'Alameda'), 'written', 'and the gateway can read the edited words again');
CREATE TEMP TABLE edited AS SELECT statement, version, user_state FROM public.memory_items WHERE id = pg_temp.id('ala');

-- ── (a) A change cue in the user's words, inside the item's span ──
INSERT INTO out VALUES ('col', pg_temp.tell('col', jsonb_build_array(
  pg_temp.closer('col', 'Susan moved to Colorado', 'Colorado', pg_temp.id('ala'), 'changed', 'moved to'))));
SELECT is(pg_temp.action('col'), 'supersede', '"Susan moved to Colorado" replaces the edited line');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'superseded/live', 'the edited Alameda is closed');
SELECT is((SELECT detail ->> 'transition' FROM public.memory_items WHERE id = pg_temp.id('col')), 'changed',
  'as a change: history-eligible (§11)');
SELECT is((SELECT row(statement, user_state)::text FROM public.memory_items WHERE id = pg_temp.id('ala')),
  '("Susan lives in Alameda with Jo",edited)', 'its words and its edit are kept ("Edited by you")');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources WHERE memory_item_id = pg_temp.id('ala') AND source_kind = 'user_edit'
             AND deleted_at IS NULL), 1, 'with the edit''s provenance');
SELECT is(pg_temp.facet_of(pg_temp.id('ala')), 'live:Alameda', 'and its reading (history needs it)');

-- Undo: the edited version comes back, never a pre-edit one.
SELECT pg_temp.undo('col');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'active/live', 'Undo brings the edited line back');
SELECT is((SELECT row(statement, user_state)::text FROM public.memory_items WHERE id = pg_temp.id('ala')),
  (SELECT row(statement, user_state)::text FROM edited), 'exactly as the user left it: the edited words, still "edited"');
SELECT is((SELECT valid_to FROM public.memory_items WHERE id = pg_temp.id('ala')), NULL::date, 'with no end date left behind');
SELECT ok((SELECT version FROM public.memory_items WHERE id = pg_temp.id('ala')) > (SELECT version FROM edited),
  'as a new version, so every phone syncs the change back');
SELECT is((SELECT array_agg(DISTINCT snapshot ->> 'statement' ORDER BY snapshot ->> 'statement')::text FROM public.memory_item_history
            WHERE memory_item_id = pg_temp.id('ala')),
  '{"Susan lives in Alameda","Susan lives in Alameda with Jo"}', 'its history keeps the words before and after the edit');
SELECT is(pg_temp.facet_of(pg_temp.id('ala')), 'live:Alameda', 'its reading untouched');

-- ── A model target, or a cue the user didn't write, is still dropped ──
INSERT INTO out VALUES ('outside', pg_temp.tell('outside', jsonb_build_array(
  pg_temp.closer('outside', 'Susan lives in Colorado', 'Colorado', pg_temp.id('ala'), 'changed', 'moved to'))));
INSERT INTO out VALUES ('model', pg_temp.tell('model', jsonb_build_array(
  pg_temp.closer('model', 'Susan lives in Colorado', 'Colorado', pg_temp.id('ala'), NULL, NULL))));
INSERT INTO out VALUES ('nocue', pg_temp.tell('nocue', jsonb_build_array(
  pg_temp.closer('nocue', 'Susan lives in Colorado now', 'Colorado', pg_temp.id('ala'), 'changed', NULL))));
INSERT INTO out VALUES ('notcue', pg_temp.tell('notcue', jsonb_build_array(
  pg_temp.closer('notcue', 'Susan lives in Colorado now', 'Colorado', pg_temp.id('ala'), 'changed', 'lives in'))));
INSERT INTO out VALUES ('mismatch', pg_temp.tell('mismatch', jsonb_build_array(
  pg_temp.closer('mismatch', 'Susan moved to Colorado', 'Colorado', pg_temp.id('ala'), 'corrected', 'moved to'))));
SELECT is(pg_temp.action('outside'), 'new', 'the same cue claimed outside the item''s span: dropped');
SELECT is(pg_temp.action('model'), 'new', 'the model''s target with no cue: dropped');
SELECT is(pg_temp.action('nocue'), 'new', 'a change with no cue sent: dropped');
SELECT is(pg_temp.action('notcue'), 'new', 'words inside the span that aren''t a cue ("lives in"): dropped');
SELECT is(pg_temp.action('mismatch'), 'new', 'a change cue offered for a correction: dropped');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'active/live', 'the edited line stays current');
SELECT is(pg_temp.facet_of(pg_temp.id('model')), 'live:Colorado', 'the new line is kept, as a line of its own (fail open)');
SELECT pg_temp.undo(k) FROM unnest(ARRAY['outside', 'model', 'nocue', 'notcue', 'mismatch']) k;

INSERT INTO out VALUES ('now', pg_temp.tell('now', jsonb_build_array(
  pg_temp.closer('now', 'Susan lives in Colorado now', 'Colorado', pg_temp.id('ala'), 'changed', 'lives in Colorado now'))));
SELECT is(pg_temp.action('now'), 'supersede', '"lives in Colorado now" is a change cue (§8)');
SELECT pg_temp.undo('now');

-- ── A correction: closes, never history ──
INSERT INTO out VALUES ('oak', pg_temp.tell('oak', jsonb_build_array(
  pg_temp.closer('oak', 'Susan lives in Oakland, not Alameda', 'Oakland', pg_temp.id('ala'), 'corrected', 'not Alameda'))));
SELECT is(pg_temp.action('oak'), 'supersede', '"…, not Alameda" corrects the edited line');
SELECT is((SELECT detail ->> 'transition' FROM public.memory_items WHERE id = pg_temp.id('oak')), 'corrected',
  'as a correction: never history (§11)');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'superseded/live', 'Alameda is closed');
SELECT pg_temp.undo('oak');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'active/live', 'and back on Undo');
INSERT INTO out VALUES ('actually', pg_temp.tell('actually', jsonb_build_array(
  pg_temp.closer('actually', 'Actually Susan lives in Oakland', 'Oakland', pg_temp.id('ala'), 'corrected', 'Actually'))));
SELECT is(pg_temp.action('actually'), 'supersede', '"Actually" is a correction cue');
SELECT pg_temp.undo('actually');
INSERT INTO out VALUES ('berk', pg_temp.tell('berk', jsonb_build_array(
  pg_temp.closer('berk', 'Susan lives in Oakland, not Berkeley', 'Oakland', pg_temp.id('ala'), 'corrected', 'not Berkeley'))));
SELECT is(pg_temp.action('berk'), 'new', '"not Berkeley" corrects another place, not this line: dropped');
SELECT pg_temp.undo('berk');

-- ── (b) "Is Susan still in Alameda?" answered through resolve_capture_review ──
SELECT pg_temp.held('denver', pg_temp.asked('denver', 'Susan lives in Denver', 'Denver', pg_temp.id('ala')));
INSERT INTO out VALUES ('denver', pg_temp.answer('denver', pg_temp.moved('denver', 'Susan lives in Denver', 'Denver', pg_temp.id('ala'))));
SELECT is(coalesce(current_setting('kinship.residence_answers', true), ''), '', 'what the answer allowed ends with the answer''s write');
SELECT is(pg_temp.action('denver'), 'supersede', '"Susan moved" closes the line the question was about');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'superseded/live', 'the edited Alameda is closed');
SELECT is((SELECT detail ->> 'transition' FROM public.memory_items WHERE id = pg_temp.id('denver')), 'changed',
  'as a change: the user''s answer is the evidence');
SELECT is((SELECT user_state FROM public.memory_items WHERE id = pg_temp.id('ala')), 'edited', 'and the edit is kept');
SELECT pg_temp.undo('denver');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || (SELECT statement FROM public.memory_items WHERE id = pg_temp.id('ala')),
  'active/live Susan lives in Alameda with Jo', 'Undo returns the edited version');

-- The answer may close only what the stored question asked about.
SELECT pg_temp.held('boise', pg_temp.asked('boise', 'Susan lives in Boise', 'Boise', pg_temp.id('ala'), '[]'));
INSERT INTO out VALUES ('boise', pg_temp.answer('boise', pg_temp.moved('boise', 'Susan lives in Boise', 'Boise', pg_temp.id('ala'))));
SELECT pg_temp.held('tulsa', pg_temp.asked('tulsa', 'Susan lives in Tulsa', 'Tulsa', pg_temp.id('col')));
INSERT INTO out VALUES ('tulsa', pg_temp.answer('tulsa', pg_temp.moved('tulsa', 'Susan lives in Tulsa', 'Tulsa', pg_temp.id('ala'))));
SELECT pg_temp.held('omaha', pg_temp.asked('omaha', 'Susan lives in Omaha', 'Omaha', pg_temp.id('ala')));
INSERT INTO out VALUES ('omaha', pg_temp.answer('omaha', pg_temp.moved('omaha', 'Susan lives', 'Omaha', pg_temp.id('ala'))));
SELECT is(pg_temp.action('boise'), 'new', 'a held line that wasn''t asked the residence question: dropped');
SELECT is(pg_temp.action('tulsa'), 'new', 'a question about another line: dropped');
SELECT is(pg_temp.action('omaha'), 'new', 'an answered item that isn''t the one asked about: dropped');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'active/live', 'the edited line stays current');

-- "Still there": nothing closes, and the new words keep no reading (§8 rule 1, a protected DISJOINT line).
SELECT pg_temp.held('fresno', pg_temp.asked('fresno', 'Susan lives in Fresno', 'Fresno', pg_temp.id('ala')));
INSERT INTO out VALUES ('fresno', pg_temp.answer('fresno', pg_temp.item('fresno', 'Susan lives in Fresno', 'Fresno') - 'facets'));
SELECT is(pg_temp.action('fresno'), 'new', '"Still there" keeps the new words as a new line');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.facet_of(pg_temp.id('fresno')), 'active/live none',
  'and the edited line stays the one current residence');

-- ── user_authored behaves as edited ──
SELECT pg_temp.wrote('00000000-0000-0000-0000-000000006950', '00000000-0000-0000-0000-000000006901', 'Susan lives in Reno');
SELECT is(pg_temp.derive('00000000-0000-0000-0000-000000006950', 'Reno'), 'written', 'a line the user wrote is read from its own words');
INSERT INTO out VALUES ('miami', pg_temp.tell('miami', jsonb_build_array(
  pg_temp.closer('miami', 'Susan has moved to Miami', 'Miami', '00000000-0000-0000-0000-000000006950', 'changed', 'has moved to'))));
SELECT is(pg_temp.action('miami') || ' ' || pg_temp.state('00000000-0000-0000-0000-000000006950'),
  'supersede superseded/live', 'a change in the user''s words closes a line the user wrote, as an edited one');
SELECT pg_temp.undo('miami');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006950'), 'active/live', 'and Undo brings it back');

-- ── closes: the same rule for every other line a note closes ──
INSERT INTO out VALUES ('austin', pg_temp.tell('austin', jsonb_build_array(
  pg_temp.closer('austin', 'Susan moved to Austin', 'Austin', pg_temp.id('ala'), 'changed', 'moved to',
    jsonb_build_object('closes', jsonb_build_array('00000000-0000-0000-0000-000000006950'))))));
SELECT is((SELECT v -> 'closes' FROM out WHERE k = 'austin'), '["00000000-0000-0000-0000-000000006950"]'::jsonb,
  'an edited or written line in closes is closed on the same cue');
SELECT pg_temp.undo('austin');
INSERT INTO out VALUES ('dallas', pg_temp.tell('dallas', jsonb_build_array(
  pg_temp.item('dallas', 'Susan moved to Dallas', 'Dallas', jsonb_build_object(
    'closes', jsonb_build_array(pg_temp.id('ala'), '00000000-0000-0000-0000-000000006950'))))));
SELECT is((SELECT v -> 'closes' FROM out WHERE k = 'dallas'), '[]'::jsonb, 'and dropped without one');
SELECT pg_temp.undo('dallas');

-- ── Never across people, never a shared line, never a line that isn't a residence ──
SELECT pg_temp.wrote('00000000-0000-0000-0000-000000006951', '00000000-0000-0000-0000-000000006902', 'Mike lives in Reno');
SELECT pg_temp.wrote('00000000-0000-0000-0000-000000006952', '00000000-0000-0000-0000-000000006901', 'Susan lives in Elko');
SELECT pg_temp.wrote('00000000-0000-0000-0000-000000006953', '00000000-0000-0000-0000-000000006901', 'Susan loves Tampa');
SELECT pg_temp.derive('00000000-0000-0000-0000-000000006951', 'Reno');
SELECT pg_temp.derive('00000000-0000-0000-0000-000000006952', 'Elko');
UPDATE public.memory_items SET with_person_ids = '{00000000-0000-0000-0000-000000006902}', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006952';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006952'), 'gone', 'a line shared since loses its reading (B2)');
-- Even with a reading left on it (written here directly, past every guard), a shared line is never closed.
INSERT INTO public.memory_item_facets (user_id, memory_item_id, slot, value_text, value_norm, decided_by, rule_version)
VALUES (:A, '00000000-0000-0000-0000-000000006952', 'residence', 'Elko', 'elko', 'rule', 'residence/v1');
INSERT INTO out VALUES ('mike', pg_temp.tell('mike', jsonb_build_array(
  pg_temp.closer('mike', 'Susan relocated to Tampa', 'Tampa', '00000000-0000-0000-0000-000000006951', 'changed', 'relocated to'))));
INSERT INTO out VALUES ('shared', pg_temp.tell('shared', jsonb_build_array(
  pg_temp.closer('shared', 'Susan relocated to Tampa', 'Tampa', '00000000-0000-0000-0000-000000006952', 'changed', 'relocated to'))));
INSERT INTO out VALUES ('loves', pg_temp.tell('loves', jsonb_build_array(
  pg_temp.closer('loves', 'Susan relocated to Tampa', 'Tampa', '00000000-0000-0000-0000-000000006953', 'changed', 'relocated to'))));
INSERT INTO out VALUES ('together', pg_temp.tell('together', jsonb_build_array(
  pg_temp.closer('together', 'Susan and Mike moved to Phoenix', 'Phoenix', pg_temp.id('ala'), 'changed', 'moved to',
    jsonb_build_object('with_person_ids', jsonb_build_array('00000000-0000-0000-0000-000000006902'))))));
SELECT is(pg_temp.action('mike'), 'new', 'never someone else''s line');
SELECT is(pg_temp.action('shared'), 'new', 'never a line shared with someone else');
SELECT is(pg_temp.action('loves'), 'new', 'never a line with no residence reading');
SELECT is(pg_temp.action('together'), 'new', 'and never by a line about two people');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state('00000000-0000-0000-0000-000000006951') || ' '
          || pg_temp.state('00000000-0000-0000-0000-000000006952') || ' ' || pg_temp.state('00000000-0000-0000-0000-000000006953'),
  'active/live active/live active/live active/live', 'every protected line is still current');

-- ── Unchanged: a line nobody edited is replaced as before ──
INSERT INTO out VALUES ('plain', pg_temp.tell('plain', jsonb_build_array(
  pg_temp.closer('plain', 'Susan lives in Colorado', 'Colorado', pg_temp.id('fresno'), NULL, NULL))));
SELECT is(pg_temp.action('plain') || ' ' || pg_temp.state(pg_temp.id('fresno')), 'supersede superseded/live',
  'a line nobody edited is replaced with no cue, as before');

SELECT * FROM finish();
ROLLBACK;
