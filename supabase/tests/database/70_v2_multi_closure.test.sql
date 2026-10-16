-- Phase 4B step B4 (brief §8 rule 2, §10, §21; founder CC-20): a note closes
-- every current line it can't be true with, and Undo or "Not this" brings
-- each of them back exactly. The schema is B2's (closes_ids, the apply and
-- restore triggers, 68) with B3's edited-line rule (69); this suite proves
-- the rows of the §10 Undo matrix that B4 adds to them, through the paths the
-- gateway now takes:
--   * "Is Susan still in Alameda?" answered "Susan moved" also closes what
--     the question carried (closes), through resolve_capture_review; the
--     stored answer vouches only for the line the question named, so a second
--     edited line among the closures is dropped (fail open);
--   * an edited line among the closures closes on the user's own cue (§21),
--     and Undo returns the edited version, never a pre-edit one;
--   * "Not this" on the closer after its history snapshots are purged (30
--     days) still brings every closed line back to active;
--   * a Today reason silenced by a closure through closes_ids speaks again
--     after Undo (N8).
BEGIN;
SELECT plan(32);

\set A '''aaaaaaaa-7070-7070-7070-707070707070'''
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
    'kind', 'fact', 'person_id', '00000000-0000-0000-0000-000000007001', 'subject_type', 'person', 'related', null,
    'statement', statement, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.9,
    'detail', '{"category": "home"}'::jsonb,
    'spans', jsonb_build_array(jsonb_build_object(
      'start', strpos(pg_temp.raw(k), statement) - 1, 'end', strpos(pg_temp.raw(k), statement) - 1 + char_length(statement),
      'quote', statement)),
    'facets', jsonb_build_array(pg_temp.facet(words))) || extra
$$;

-- The same item replacing `target` and closing `closes` with it (B4), as a change or a correction, citing `cue`.
CREATE FUNCTION pg_temp.closer(k text, statement text, words text, target uuid, closes uuid[], transition text, cue text)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.item(k, statement, words, jsonb_build_object(
    'detail', jsonb_build_object('category', 'home') || CASE WHEN transition IS NULL THEN '{}'::jsonb
                                                             ELSE jsonb_build_object('transition', transition) END,
    'action', jsonb_build_object('type', 'supersede', 'target_id', target),
    'closes', to_jsonb(closes))
    || CASE WHEN cue IS NULL THEN '{}'::jsonb
            ELSE jsonb_build_object('cue', jsonb_build_object('start', strpos(pg_temp.raw(k), cue) - 1,
                                                              'end', strpos(pg_temp.raw(k), cue) - 1 + char_length(cue))) END)
$$;

-- The gateway's write of one note; the first item's result.
CREATE FUNCTION pg_temp.tell(k text, items jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE res jsonb;
BEGIN
  PERFORM tests.as_service();
  PERFORM public.claim_capture_extraction('aaaaaaaa-7070-7070-7070-707070707070', pg_temp.note(k));
  res := public.write_extraction('aaaaaaaa-7070-7070-7070-707070707070', pg_temp.note(k),
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
  PERFORM public.claim_capture_extraction('aaaaaaaa-7070-7070-7070-707070707070', pg_temp.note(k));
  PERFORM public.write_extraction_with_review('aaaaaaaa-7070-7070-7070-707070707070', pg_temp.note(k),
    'relationship_extract/v6+claude-test', true, '[]', jsonb_build_object('items', jsonb_build_array(held), 'clarification', null));
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  PERFORM tests.reset_role();
END $$;
CREATE FUNCTION pg_temp.answer(k text, resolved jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE res jsonb;
BEGIN
  PERFORM tests.as_service();
  res := public.resolve_capture_review('aaaaaaaa-7070-7070-7070-707070707070', pg_temp.note(k),
    (SELECT created_at FROM public.capture_reviews WHERE capture_id = pg_temp.note(k)), jsonb_build_array(resolved), NULL);
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  PERFORM tests.reset_role();
  RETURN res -> 'items' -> 0;
END $$;

-- The held item as the gateway stores it (B4): the residence question about `target`, carrying what else
-- "Susan moved" closes.
CREATE FUNCTION pg_temp.asked(k text, statement text, words text, target uuid, closes uuid[]) RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.item(k, statement, words, jsonb_build_object(
    'tier', 'hold', 'flags', '["residence_conflict"]'::jsonb,
    'still_in', jsonb_build_object('target_id', target, 'words', 'Alameda', 'stay', 'words', 'closes', to_jsonb(closes))))
$$;
-- "Susan moved", as the gateway writes the answer: a change of the line asked about, closing the rest with it.
CREATE FUNCTION pg_temp.moved(k text, statement text, words text, target uuid, closes uuid[]) RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.closer(k, statement, words, target, closes, 'changed', NULL)
$$;

-- The user's own edit of a line that keeps its words (the app's correct()): the line is theirs, "edited", with
-- a user_edit source; its reading stays (the tombstone trigger watches the words, not the state).
CREATE FUNCTION pg_temp.edit_keeping_words(item uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM tests.as_user('aaaaaaaa-7070-7070-7070-707070707070');
  UPDATE public.memory_items SET user_state = 'edited', version = version + 1 WHERE id = item;
  INSERT INTO public.memory_item_sources (memory_item_id, source_kind) VALUES (item, 'user_edit');
  PERFORM tests.reset_role();
END $$;

-- Undo: the note goes with its lines. "Not this": the line is retracted and removed.
CREATE FUNCTION pg_temp.undo(k text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM tests.as_user('aaaaaaaa-7070-7070-7070-707070707070');
  UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = pg_temp.note(k);
  PERFORM tests.reset_role();
END $$;
CREATE FUNCTION pg_temp.not_this(item uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM tests.as_user('aaaaaaaa-7070-7070-7070-707070707070');
  UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1 WHERE id = item;
  PERFORM tests.reset_role();
END $$;

CREATE TEMP TABLE out (k text PRIMARY KEY, v jsonb);
GRANT ALL ON out TO PUBLIC;
CREATE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql AS $$ SELECT (v ->> 'id')::uuid FROM out WHERE out.k = $1 $$;
CREATE FUNCTION pg_temp.action(k text) RETURNS text LANGUAGE sql AS $$ SELECT v ->> 'action' FROM out WHERE out.k = $1 $$;
CREATE FUNCTION pg_temp.closes(k text) RETURNS jsonb LANGUAGE sql AS $$ SELECT v -> 'closes' FROM out WHERE out.k = $1 $$;
-- A line as the user left it: its words, its state and its version.
CREATE FUNCTION pg_temp.as_left(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT row(statement, user_state, version)::text FROM public.memory_items WHERE id = item
$$;

-- ── People and notes ──
INSERT INTO notes (k, raw) VALUES
  ('cal', 'Susan lives in California.'),
  ('ala', 'Susan lives in Alameda.'),
  ('plain', 'Susan lives in Colorado.'),
  ('both', 'Susan lives in Colorado.'),
  ('den', 'Susan moved to Denver.'),
  ('reno', 'Susan moved to Reno.'),
  ('notthis', 'Susan moved to Reno.'),
  ('race', 'Susan runs Chicago Sunday.');
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000007001', 'Susan');
INSERT INTO public.captures (id, source, raw_text) SELECT id, 'text', raw FROM notes;
SELECT tests.reset_role();

-- Susan lives in California, then in Alameda (both read); the user edits Alameda, keeping its words.
INSERT INTO out VALUES ('cal', pg_temp.tell('cal', jsonb_build_array(pg_temp.item('cal', 'Susan lives in California', 'California'))));
INSERT INTO out VALUES ('ala', pg_temp.tell('ala', jsonb_build_array(pg_temp.item('ala', 'Susan lives in Alameda', 'Alameda'))));
SELECT pg_temp.edit_keeping_words(pg_temp.id('ala'));
SELECT is(pg_temp.facet_of(pg_temp.id('ala')) || ' ' || (SELECT user_state FROM public.memory_items WHERE id = pg_temp.id('ala')),
  'live:Alameda edited', 'an edit that keeps the words keeps the reading, and the line is the user''s');
CREATE TEMP TABLE left_ala AS SELECT pg_temp.as_left(pg_temp.id('ala')) AS v;

-- ── "Is Susan still in Alameda?" answered "Susan moved" closes what the question carried too ──
-- A plain "lives in Colorado" beside the edited Alameda asks (§21); California, incompatible as well, rides
-- with the question. The answer replaces Alameda (the stored question vouches for it) and closes California.
SELECT pg_temp.held('plain', pg_temp.asked('plain', 'Susan lives in Colorado', 'Colorado', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')]));
INSERT INTO out VALUES ('plain', pg_temp.answer('plain',
  pg_temp.moved('plain', 'Susan lives in Colorado', 'Colorado', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')])));
SELECT is(pg_temp.action('plain') || ' ' || pg_temp.closes('plain')::text, 'supersede ' || jsonb_build_array(pg_temp.id('cal'))::text,
  '"Susan moved" replaces the edited Alameda and closes California with it');
SELECT is((SELECT supersedes_id::text || ' ' || closes_ids::text FROM public.memory_items WHERE id = pg_temp.id('plain')),
  pg_temp.id('ala')::text || ' {' || pg_temp.id('cal')::text || '}', 'supersedes_id is the line asked about, closes_ids the rest');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'superseded/live superseded/live',
  'both leave current truth');
SELECT is((SELECT detail ->> 'transition' FROM public.memory_items WHERE id = pg_temp.id('plain')), 'changed',
  'as a change: the user''s answer is the evidence (history-eligible, §11)');
SELECT is((SELECT user_state FROM public.memory_items WHERE id = pg_temp.id('ala')), 'edited', 'the edit is kept on the closed line');
SELECT is(pg_temp.facet_of(pg_temp.id('ala')) || ' ' || pg_temp.facet_of(pg_temp.id('cal')), 'live:Alameda live:California',
  'closed lines keep their readings (history needs them)');

-- Undo: both come back as they were; Alameda still the user's, in the edited version.
SELECT pg_temp.undo('plain');
SELECT is(pg_temp.state(pg_temp.id('plain')), 'active/gone', 'Undo takes the closer with its note');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'active/live active/live',
  'Alameda and California are both current again');
SELECT is((SELECT row(statement, user_state)::text FROM public.memory_items WHERE id = pg_temp.id('ala')),
  '("Susan lives in Alameda",edited)', 'the edited line is back exactly as the user left it');
SELECT is((SELECT valid_to FROM public.memory_items WHERE id = pg_temp.id('cal')), NULL::date, 'no end date left behind');
SELECT is(pg_temp.facet_of(pg_temp.id('ala')) || ' ' || pg_temp.facet_of(pg_temp.id('cal')), 'live:Alameda live:California',
  'their readings were never touched');

-- ── The stored answer vouches only for the line the question named ──
-- The user edits California too. "Susan moved" answers "Is Susan still in Alameda?": Alameda closes; California,
-- the user's own words that no question named, is dropped from the closures (fail open) and stays current.
SELECT pg_temp.edit_keeping_words(pg_temp.id('cal'));
CREATE TEMP TABLE left_cal AS SELECT pg_temp.as_left(pg_temp.id('cal')) AS v;
SELECT pg_temp.held('both', pg_temp.asked('both', 'Susan lives in Colorado', 'Colorado', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')]));
INSERT INTO out VALUES ('both', pg_temp.answer('both',
  pg_temp.moved('both', 'Susan lives in Colorado', 'Colorado', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')])));
SELECT is(pg_temp.action('both') || ' ' || pg_temp.closes('both')::text, 'supersede []',
  'the answer closes the line it was asked about, never a second edited line it never named');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'superseded/live active/live',
  'Alameda is closed; the edited California stays current (fail open)');
SELECT pg_temp.undo('both');
SELECT is(pg_temp.state(pg_temp.id('ala')), 'active/live', 'and Undo brings Alameda back');

-- ── An edited line among the closures closes on the user's own cue (§21), and Undo returns the edited version ──
-- "Susan moved to Denver": the cue in the user's words lets it close the edited Alameda (its target) and the
-- edited California (in closes) alike. Each comes back exactly as the user left it.
INSERT INTO out VALUES ('den', pg_temp.tell('den', jsonb_build_array(
  pg_temp.closer('den', 'Susan moved to Denver', 'Denver', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')], 'changed', 'moved to'))));
SELECT is(pg_temp.action('den') || ' ' || pg_temp.closes('den')::text, 'supersede ' || jsonb_build_array(pg_temp.id('cal'))::text,
  'the user''s own "moved to" closes the edited California among the closures (§21 a)');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'superseded/live superseded/live',
  'both edited lines leave current truth');
SELECT is((SELECT user_state FROM public.memory_items WHERE id = pg_temp.id('cal')), 'edited', 'the edit is kept on the closed California');
SELECT pg_temp.undo('den');
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'active/live active/live',
  'Undo brings both back');
SELECT is((SELECT row(statement, user_state)::text FROM public.memory_items WHERE id = pg_temp.id('cal')),
  '("Susan lives in California",edited)', 'the edited California, exactly as the user left it, never a pre-edit version');
SELECT ok((SELECT version FROM public.memory_items WHERE id = pg_temp.id('cal')) > (SELECT (regexp_match(v, ',(\d+)\)$'))[1]::int FROM left_cal),
  'as a new version, so every phone syncs it back');
SELECT is(pg_temp.facet_of(pg_temp.id('cal')), 'live:California', 'its reading untouched');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources WHERE memory_item_id = pg_temp.id('cal') AND source_kind = 'user_edit'
             AND deleted_at IS NULL), 1, 'with the edit''s provenance');

-- A cue the user didn't write never reaches an edited line among the closures: dropped, never an error.
INSERT INTO out VALUES ('reno0', pg_temp.tell('reno', jsonb_build_array(
  pg_temp.closer('reno', 'Susan moved to Reno', 'Reno', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')], 'changed', NULL))));
SELECT is(pg_temp.action('reno0') || ' ' || pg_temp.closes('reno0')::text || ' ' || pg_temp.state(pg_temp.id('cal')), 'new [] active/live',
  'with no cue sent, neither edited line closes (fail open)');
SELECT pg_temp.undo('reno0');

-- ── "Not this" on the closer after its history snapshots are purged (30 days): back to active ──
INSERT INTO out VALUES ('reno', pg_temp.tell('notthis', jsonb_build_array(
  pg_temp.closer('notthis', 'Susan moved to Reno', 'Reno', pg_temp.id('ala'), ARRAY[pg_temp.id('cal')], 'changed', 'moved to'))));
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'superseded/live superseded/live',
  'closed again, through a note of its own');
-- What purge_tombstones does to history older than 30 days.
DELETE FROM public.memory_item_history WHERE memory_item_id IN (pg_temp.id('ala'), pg_temp.id('cal'));
SELECT pg_temp.not_this(pg_temp.id('reno'));
SELECT is(pg_temp.state(pg_temp.id('ala')) || ' ' || pg_temp.state(pg_temp.id('cal')), 'active/live active/live',
  '"Not this" on the closer brings both back to active without a snapshot (valid_to isn''t shown anywhere)');
SELECT is((SELECT row(statement, user_state)::text FROM public.memory_items WHERE id = pg_temp.id('cal')),
  '("Susan lives in California",edited)', 'still the user''s edited words');

-- ── A Today reason silenced by a closure through closes_ids speaks again after Undo (N8) ──
SELECT tests.as_user(:A);
SELECT public.write_memory_item(
  jsonb_build_object('id', '00000000-0000-0000-0000-000000007040', 'kind', 'event', 'person_id', '00000000-0000-0000-0000-000000007001',
                     'statement', 'Susan runs Chicago Sunday', 'origin', 'user', 'user_state', 'user_authored',
                     'detail', '{"date": "2026-10-11", "date_precision": "day", "event_type": "race", "followup_policy": "after"}'::jsonb),
  jsonb_build_array(jsonb_build_object('source_kind', 'capture', 'capture_id', pg_temp.note('race'), 'span_start', 0, 'span_end', 5)));
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is(public.reasons_refresh(:A, '2026-10-08', 'America/Chicago'), 1, 'the race makes its follow-up');
SELECT tests.reset_role();
CREATE TEMP TABLE race_reason AS SELECT id FROM public.reasons WHERE user_id = :A;
GRANT SELECT ON race_reason TO PUBLIC;
-- A line that closes the race through closes_ids (written directly, as the apply trigger sees it).
INSERT INTO public.memory_items (id, user_id, kind, person_id, subject_type, statement, detail, origin, user_state, status, closes_ids)
VALUES ('00000000-0000-0000-0000-000000007041', :A, 'fact', '00000000-0000-0000-0000-000000007001', 'person', 'Susan skipped the race',
        '{"category": "other"}', 'extracted', 'unreviewed', 'active', ARRAY['00000000-0000-0000-0000-000000007040'::uuid]);
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000007040'), 'superseded/live', 'the race is closed through closes_ids');
SELECT is((SELECT state FROM public.reasons WHERE id = (SELECT id FROM race_reason)), 'suppressed',
  'and closing it silences its reason');
SELECT pg_temp.not_this('00000000-0000-0000-0000-000000007041');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000007040'), 'active/live', '"Not this" on the closer brings the race back');
SELECT tests.as_service();
SELECT public.reasons_refresh(:A, '2026-10-08', 'America/Chicago');
SELECT is((SELECT state FROM public.reasons WHERE id = (SELECT id FROM race_reason)), 'candidate',
  'and the next refresh opens the same reason again (its Moment is back)');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
