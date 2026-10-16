-- Phase 4B step B2 (brief §1 A–G): residence facets and multi-item closure.
-- A facet is the server's reading of a line, in the note's own words; the
-- app may read its own and never write one. A superseding note may close
-- other current items too (closes_ids), and Undo or "Not this" brings every
-- one of them back exactly, unless another live note still closes it. What
-- the gateway sends is re-checked: a doubtful closure or facet is dropped,
-- never an error. A changed line loses its facet at once; a superseded one
-- keeps it.
BEGIN;
SELECT plan(112);

\set A '''aaaaaaaa-6868-6868-6868-686868686868'''
\set B '''bbbbbbbb-6868-6868-6868-686868686868'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

CREATE FUNCTION pg_temp.state(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT status || '/' || CASE WHEN deleted_at IS NULL THEN 'live' ELSE 'gone' END
    FROM public.memory_items WHERE id = item
$$;

-- The item's facet: live:<words>, gone (tombstoned), or none.
CREATE FUNCTION pg_temp.facet_of(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce((SELECT CASE WHEN deleted_at IS NULL THEN 'live:' || value_text ELSE 'gone' END
                     FROM public.memory_item_facets WHERE memory_item_id = item
                    ORDER BY (deleted_at IS NULL) DESC, created_at DESC LIMIT 1), 'none')
$$;

-- An item as the gateway sends it: a stated home fact about Susan whose span
-- is the note's opening words.
CREATE FUNCTION pg_temp.item(statement text, extra jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'kind', 'fact', 'person_id', '00000000-0000-0000-0000-000000006801', 'subject_type', 'person', 'related', null,
    'statement', statement, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.9,
    'detail', '{"category": "home"}'::jsonb,
    'spans', jsonb_build_array(jsonb_build_object('start', 0, 'end', char_length(statement)))) || extra
$$;

-- A residence reading as the gateway sends it.
CREATE FUNCTION pg_temp.facet(words text, cands jsonb DEFAULT '[]', place text DEFAULT NULL, usual text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('slot', 'residence', 'value_text', words, 'value_norm', lower(words),
                            'place_ref', place, 'candidates', cands, 'usual_ref', usual, 'decided_by', 'rule',
                            'rule_version', 'residence/v1', 'dataset_version', 'places-2026.10')
$$;

-- The gateway's write of one note.
CREATE FUNCTION pg_temp.tell(capture uuid, items jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE res jsonb;
BEGIN
  PERFORM public.claim_capture_extraction('aaaaaaaa-6868-6868-6868-686868686868', capture);
  res := public.write_extraction('aaaaaaaa-6868-6868-6868-686868686868', capture,
                                 'relationship_extract/v6+claude-test', false, items);
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  RETURN res;
END $$;

-- A line written directly (the app's own, or a fixture state), with a source.
CREATE FUNCTION pg_temp.fact(p_id uuid, p_person uuid, p_statement text, p_state text DEFAULT 'user_authored',
                             p_status text DEFAULT 'active', p_user uuid DEFAULT 'aaaaaaaa-6868-6868-6868-686868686868',
                             p_subject text DEFAULT 'person', p_related uuid DEFAULT NULL,
                             p_closes uuid[] DEFAULT '{}', p_supersedes uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.memory_items (id, user_id, kind, person_id, subject_type, subject_related_id, statement, detail,
                                   origin, user_state, status, deleted_at, closes_ids, supersedes_id)
  VALUES (p_id, p_user, 'fact', p_person, p_subject, p_related, p_statement, '{"category": "home"}',
          CASE WHEN p_state = 'user_authored' THEN 'user' ELSE 'extracted' END, p_state, p_status,
          CASE WHEN p_status = 'retracted' THEN now() END, p_closes, p_supersedes);
  INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind) VALUES (p_user, p_id, 'user_edit');
  RETURN p_id;
END $$;

CREATE TEMP TABLE out (k text PRIMARY KEY, v jsonb);
GRANT ALL ON out TO PUBLIC;

-- ── People, notes and lines ──
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000006801', 'Susan'),
  ('00000000-0000-0000-0000-000000006802', 'Mike'),
  ('00000000-0000-0000-0000-000000006803', 'Dana'),
  ('00000000-0000-0000-0000-000000006804', 'Eve');
INSERT INTO public.related_people (id, person_id, relation) VALUES
  ('00000000-0000-0000-0000-000000006805', '00000000-0000-0000-0000-000000006801', 'sister');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000006810', 'text', 'Susan lives in California.'),
  ('00000000-0000-0000-0000-000000006811', 'text', 'Susan lives in Alameda.'),
  ('00000000-0000-0000-0000-000000006812', 'text', 'Susan moved to Colorado.'),
  ('00000000-0000-0000-0000-000000006813', 'text', 'Susan moved to Denver.'),
  ('00000000-0000-0000-0000-000000006814', 'text', 'Dana moved to Reno.'),
  ('00000000-0000-0000-0000-000000006815', 'text', 'Dana lives in Reno.'),
  ('00000000-0000-0000-0000-000000006816', 'text', 'Susan lives in Oakland.'),
  ('00000000-0000-0000-0000-000000006817', 'text', 'Susan lives in Berkeley.'),
  ('00000000-0000-0000-0000-000000006818', 'text', 'Susan moved to Austin.'),
  ('00000000-0000-0000-0000-000000006819', 'text', 'Susan moved to Colorado!');
SELECT tests.reset_role();
INSERT INTO public.people (id, user_id, display_name) VALUES ('00000000-0000-0000-0000-000000006809', :B, 'Susan');
-- Lines a closure must never take: edited by the user, someone else's,
-- about Susan's sister, already gone, already replaced, another account's.
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006820', '00000000-0000-0000-0000-000000006801', 'Susan lives in Paris', 'edited');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006821', '00000000-0000-0000-0000-000000006802', 'Mike lives in Paris', 'confirmed');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006822', '00000000-0000-0000-0000-000000006801', 'Susan''s sister lives in Paris',
                    'confirmed', p_subject => 'related', p_related => '00000000-0000-0000-0000-000000006805');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006823', '00000000-0000-0000-0000-000000006801', 'Susan lives in Lyon', 'confirmed', 'retracted');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006824', '00000000-0000-0000-0000-000000006801', 'Susan lives in Nice', 'confirmed', 'superseded');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006825', '00000000-0000-0000-0000-000000006809', 'Susan lives in Rome', 'confirmed',
                    p_user => :B);
-- Dana: nine current lines, and one a later note is merged into.
SELECT pg_temp.fact(('00000000-0000-0000-0000-00000000683' || n)::uuid, '00000000-0000-0000-0000-000000006803',
                    'Dana lives in town ' || n, 'confirmed')
  FROM generate_series(0, 9) n;

-- ── C. The transition values ──
SELECT ok(public.memory_detail_ok('fact', '{"category": "home", "transition": "changed"}'), 'transition changed is accepted');
SELECT ok(public.memory_detail_ok('fact', '{"category": "home", "transition": "corrected"}'), 'transition corrected is accepted');
SELECT ok(public.memory_detail_ok('thread', '{"topic": "x", "followup_after_days": 7, "transition": "progress"}'),
  'the existing transitions keep working');
SELECT ok(NOT public.memory_detail_ok('fact', '{"category": "home", "transition": "moved"}'), 'anything else is refused');

-- ── California → Alameda → "moved to Colorado" → Undo (brief §10) ──
SELECT tests.as_service();
INSERT INTO out VALUES ('cal', pg_temp.tell('00000000-0000-0000-0000-000000006810', jsonb_build_array(
  pg_temp.item('Susan lives in California', jsonb_build_object('facets', jsonb_build_array(pg_temp.facet('California',
    '[{"ref": "region:US.CA", "level": "region", "ancestors": ["country:US"]}]', 'region:US.CA', 'region:US.CA')))))));
INSERT INTO out VALUES ('ala', pg_temp.tell('00000000-0000-0000-0000-000000006811', jsonb_build_array(
  pg_temp.item('Susan lives in Alameda', jsonb_build_object('facets', jsonb_build_array(pg_temp.facet('Alameda',
    '[{"ref": "city:9000001", "level": "city", "ancestors": ["region:US.CA", "country:US"]},
      {"ref": "city:9000002", "level": "city", "ancestors": ["region:US.NM", "country:US"]}]', NULL, 'city:9000001')))))));
SELECT tests.reset_role();
CREATE TEMP TABLE ids AS
  SELECT (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'cal') AS cal,
         (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'ala') AS ala;
GRANT ALL ON ids TO PUBLIC;

SELECT is((SELECT v -> 0 FROM out WHERE k = 'cal') - 'id', '{"action": "new", "facets": 1}'::jsonb,
  'the gateway learns that the facet was kept');
SELECT is((SELECT row(value_text, value_norm, place_ref, usual_ref, decided_by, rule_version, dataset_version)::text
             FROM public.memory_item_facets WHERE memory_item_id = (SELECT cal FROM ids)),
  '(California,california,region:US.CA,region:US.CA,rule,residence/v1,places-2026.10)',
  'a facet keeps the note''s words, their folded form and the reading');
SELECT is((SELECT jsonb_array_length(candidates) || ':' || coalesce(place_ref, '-') || ':' || usual_ref
             FROM public.memory_item_facets WHERE memory_item_id = (SELECT ala FROM ids)),
  '2:-:city:9000001', 'an unresolved name keeps its readings and its usual one, unpinned');

SELECT tests.as_service();
INSERT INTO out SELECT 'col', pg_temp.tell('00000000-0000-0000-0000-000000006812', jsonb_build_array(
  pg_temp.item('Susan moved to Colorado', jsonb_build_object(
    'detail', '{"category": "home", "transition": "changed"}'::jsonb,
    'action', jsonb_build_object('type', 'supersede', 'target_id', ala),
    'closes', jsonb_build_array(cal),
    'facets', jsonb_build_array(pg_temp.facet('Colorado',
      '[{"ref": "region:US.CO", "level": "region", "ancestors": ["country:US"]}]', 'region:US.CO', 'region:US.CO'))))))
  FROM ids;
SELECT tests.reset_role();
ALTER TABLE ids ADD COLUMN col uuid;
UPDATE ids SET col = (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'col');

SELECT is((SELECT v -> 0 -> 'closes' FROM out WHERE k = 'col'), (SELECT jsonb_build_array(cal) FROM ids),
  'the result names what it closed');
SELECT is((SELECT supersedes_id FROM public.memory_items WHERE id = (SELECT col FROM ids)), (SELECT ala FROM ids),
  'supersedes_id is the most specific item replaced');
SELECT is((SELECT closes_ids FROM public.memory_items WHERE id = (SELECT col FROM ids)), (SELECT ARRAY[cal] FROM ids),
  'and closes_ids the other one');
SELECT is(pg_temp.state((SELECT ala FROM ids)), 'superseded/live', 'Alameda is closed');
SELECT is(pg_temp.state((SELECT cal FROM ids)), 'superseded/live', 'California is closed too');
SELECT is((SELECT valid_to FROM public.memory_items WHERE id = (SELECT cal FROM ids)), current_date,
  'a closed fact is dated as a superseded one is');
SELECT is(pg_temp.facet_of((SELECT ala FROM ids)) || ' ' || pg_temp.facet_of((SELECT cal FROM ids)),
  'live:Alameda live:California', 'closed items keep their facets (history needs them)');
SELECT is((SELECT detail ->> 'transition' FROM public.memory_items WHERE id = (SELECT col FROM ids)), 'changed',
  'the closer records an explicit change');

-- Undo: the note goes, and both come back as they were.
SELECT tests.as_user(:A);
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006812';
SELECT tests.reset_role();
SELECT is(pg_temp.state((SELECT col FROM ids)), 'active/gone', 'Undo takes the closer with its note');
SELECT is(pg_temp.state((SELECT ala FROM ids)) || ' ' || pg_temp.state((SELECT cal FROM ids)), 'active/live active/live',
  'Alameda and California are both current again');
SELECT is((SELECT valid_to FROM public.memory_items WHERE id = (SELECT cal FROM ids)), NULL::date,
  'exactly as before: no end date left behind');
SELECT is(pg_temp.facet_of((SELECT col FROM ids)), 'gone', 'the closer''s facet goes with it');
SELECT is(pg_temp.facet_of((SELECT ala FROM ids)) || ' ' || pg_temp.facet_of((SELECT cal FROM ids)),
  'live:Alameda live:California', 'and the restored items'' facets were never touched');

-- "Not this" on a closer: the same.
SELECT tests.as_service();
INSERT INTO out SELECT 'col2', pg_temp.tell('00000000-0000-0000-0000-000000006819', jsonb_build_array(
  pg_temp.item('Susan moved to Colorado', jsonb_build_object(
    'action', jsonb_build_object('type', 'supersede', 'target_id', ala), 'closes', jsonb_build_array(cal)))))
  FROM ids;
SELECT tests.reset_role();
SELECT is(pg_temp.state((SELECT cal FROM ids)), 'superseded/live', 'closed again by another note');
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'col2');
SELECT tests.reset_role();
SELECT is(pg_temp.state((SELECT ala FROM ids)) || ' ' || pg_temp.state((SELECT cal FROM ids)), 'active/live active/live',
  '"Not this" on the closer brings back everything it closed');

-- ── E. A doubtful closure is dropped, never an error ──
SELECT tests.as_service();
INSERT INTO out SELECT 'den', pg_temp.tell('00000000-0000-0000-0000-000000006813', jsonb_build_array(
  pg_temp.item('Susan moved to Denver', jsonb_build_object(
    'action', jsonb_build_object('type', 'supersede', 'target_id', ala),
    'closes', jsonb_build_array(
      ala,                                       -- the supersede target itself
      '00000000-0000-0000-0000-000000006820',    -- edited by the user
      '00000000-0000-0000-0000-000000006821',    -- about Mike
      '00000000-0000-0000-0000-000000006822',    -- about Susan's sister
      '00000000-0000-0000-0000-000000006823',    -- already gone
      '00000000-0000-0000-0000-000000006824',    -- already replaced
      '00000000-0000-0000-0000-000000006825',    -- another account's
      'not-a-uuid', 42, null,
      cal, upper(cal::text))))))                 -- the one that counts, twice
  FROM ids;
SELECT tests.reset_role();
SELECT is((SELECT v -> 0 -> 'closes' FROM out WHERE k = 'den'), (SELECT jsonb_build_array(cal) FROM ids),
  'only the one current line about the same person and subject is closed, once');
SELECT is((SELECT closes_ids FROM public.memory_items WHERE id = (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'den')),
  (SELECT ARRAY[cal] FROM ids), 'and only it is recorded');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006820'), 'active/live', 'a line the user edited is never closed silently');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006821') || ' ' || pg_temp.state('00000000-0000-0000-0000-000000006822'),
  'active/live active/live', 'nor one about someone else, or about their sister');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006825'), 'active/live', 'nor another account''s');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006824') || ' ' || pg_temp.state('00000000-0000-0000-0000-000000006823'),
  'superseded/live retracted/gone', 'lines already replaced or gone are left as they were');
SELECT tests.as_user(:A);
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000006813';
SELECT tests.reset_role();

-- At most eight, in the order sent.
SELECT tests.as_service();
INSERT INTO out VALUES ('reno', pg_temp.tell('00000000-0000-0000-0000-000000006814', jsonb_build_array(
  pg_temp.item('Dana moved to Reno', jsonb_build_object('person_id', '00000000-0000-0000-0000-000000006803',
    'closes', (SELECT jsonb_agg(('00000000-0000-0000-0000-00000000683' || n) ORDER BY n) FROM generate_series(1, 9) n))))));
SELECT tests.reset_role();
SELECT is((SELECT cardinality(closes_ids) FROM public.memory_items WHERE id = (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'reno')),
  8, 'a note closes at most eight other lines');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006831') || ' ' || pg_temp.state('00000000-0000-0000-0000-000000006839'),
  'superseded/live active/live', 'the first eight, in the order sent');

-- A merge writes no new line, so it closes nothing and gets no facet.
SELECT tests.as_service();
INSERT INTO out VALUES ('merge', pg_temp.tell('00000000-0000-0000-0000-000000006815', jsonb_build_array(
  pg_temp.item('Dana lives in Reno', jsonb_build_object('person_id', '00000000-0000-0000-0000-000000006803',
    'action', '{"type": "merge", "target_id": "00000000-0000-0000-0000-000000006830"}'::jsonb,
    'closes', '["00000000-0000-0000-0000-000000006839"]'::jsonb,
    'facets', jsonb_build_array(pg_temp.facet('Reno')))))));
SELECT tests.reset_role();
SELECT is((SELECT v -> 0 FROM out WHERE k = 'merge') - 'id', '{"action": "merge", "closes": [], "facets": 0}'::jsonb,
  'a merge closes nothing and keeps no facet');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006839') || ' ' || pg_temp.facet_of('00000000-0000-0000-0000-000000006830'),
  'active/live none', 'the line it named stays current; the line merged into gets no facet');

-- ── E. A doubtful facet is dropped, never an error ──
SELECT tests.as_service();
INSERT INTO out VALUES ('oak', pg_temp.tell('00000000-0000-0000-0000-000000006816', jsonb_build_array(
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('certainty', 'tentative', 'facets', jsonb_build_array(pg_temp.facet('Oakland')))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('sensitivity', 'other_private', 'facets', jsonb_build_array(pg_temp.facet('Oakland')))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('with_person_ids', '["00000000-0000-0000-0000-000000006802"]'::jsonb,
                                                            'facets', jsonb_build_array(pg_temp.facet('Oakland')))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('kind', 'event',
    'detail', '{"date_precision": "unknown", "event_type": "move", "followup_policy": "none"}'::jsonb,
    'facets', jsonb_build_array(pg_temp.facet('Oakland')))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('spans', '[{"start": 0, "end": 11}]'::jsonb,
                                                            'facets', jsonb_build_array(pg_temp.facet('Oakland')))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('facets', jsonb_build_array(pg_temp.facet('Oakland',
    (SELECT jsonb_agg(jsonb_build_object('ref', 'city:900010' || n, 'level', 'city', 'ancestors', '[]'::jsonb)) FROM generate_series(1, 6) n))))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('facets', jsonb_build_array(pg_temp.facet('Oakland',
    '[{"ref": "city:9000010", "level": "city", "ancestors": ["region:US.CA"]}]', 'city:9000099')))),
  pg_temp.item('Susan lives in Oakland', jsonb_build_object('facets', jsonb_build_array(
    pg_temp.facet('Oakland') || '{"decided_by": "user"}'::jsonb))))));
SELECT tests.reset_role();
SELECT is((SELECT array_agg((e ->> 'facets')::int ORDER BY n) FROM out, jsonb_array_elements(v) WITH ORDINALITY x(e, n) WHERE k = 'oak'),
  '{0,0,0,0,0,0,0,0}'::int[],
  'no facet for a hedged, sensitive, shared or non-fact line, words outside its source, too many readings, a reading not among them, or a user pin without one');
SELECT is((SELECT count(*)::int FROM public.memory_items m, out, jsonb_array_elements(v) e
            WHERE k = 'oak' AND m.id = (e ->> 'id')::uuid AND m.deleted_at IS NULL), 8,
  'and every line is still kept (fail open)');

SELECT tests.as_service();
INSERT INTO out VALUES ('berk', pg_temp.tell('00000000-0000-0000-0000-000000006817', jsonb_build_array(
  pg_temp.item('Susan lives in Berkeley', jsonb_build_object('facets', jsonb_build_array(
    pg_temp.facet('berkeley'), pg_temp.facet('Berkeley, CA'), pg_temp.facet('Berkeley'),
    pg_temp.facet('Berkeley') || '{"value_norm": "second"}'::jsonb,
    pg_temp.facet('Berkeley') || '{"note": "unknown key"}'::jsonb))))));
SELECT tests.reset_role();
SELECT is((SELECT (v -> 0 ->> 'facets')::int FROM out WHERE k = 'berk'), 1, 'one facet per slot');
SELECT is((SELECT value_text || '/' || value_norm FROM public.memory_item_facets
            WHERE memory_item_id = (SELECT (v -> 0 ->> 'id')::uuid FROM out WHERE k = 'berk')),
  'Berkeley/berkeley', 'the first one in the note''s exact characters; other cases and missing words are not the note''s');

-- ── E. resolve_capture_review hands its items to the same re-checks ──
SELECT tests.as_service();
SELECT public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000006818');
SELECT pg_temp.at_commit(format($s$ SELECT public.write_extraction_with_review(%L, '00000000-0000-0000-0000-000000006818',
  'relationship_extract/v6+claude-test', true, '[]',
  '{"items": [{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000006801", "statement": "Susan moved to Austin",
               "spans": [{"start": 0, "end": 21}]}], "clarification": null}') $s$, :A));
INSERT INTO out SELECT 'aus', public.resolve_capture_review(:A, '00000000-0000-0000-0000-000000006818',
  (SELECT created_at FROM public.capture_reviews WHERE capture_id = '00000000-0000-0000-0000-000000006818'),
  jsonb_build_array(pg_temp.item('Susan moved to Austin', jsonb_build_object(
    'spans', '[{"start": 0, "end": 21, "quote": "Susan moved to Austin"}]'::jsonb,
    'detail', '{"category": "home", "transition": "changed"}'::jsonb,
    'action', jsonb_build_object('type', 'supersede', 'target_id', ala),
    'closes', jsonb_build_array(cal, '00000000-0000-0000-0000-000000006820'),
    'facets', jsonb_build_array(pg_temp.facet('Austin'))))), NULL)
  FROM ids;
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT tests.reset_role();
SELECT is((SELECT (v -> 'items' -> 0) - 'id' FROM out WHERE k = 'aus'),
  (SELECT jsonb_build_object('action', 'supersede', 'closes', jsonb_build_array(cal), 'facets', 1) FROM ids),
  'the answer''s closures and facet are re-checked as any other write (the edited line is dropped)');
SELECT is(pg_temp.state((SELECT ala FROM ids)) || ' ' || pg_temp.state((SELECT cal FROM ids)) || ' '
          || pg_temp.state('00000000-0000-0000-0000-000000006820'),
  'superseded/live superseded/live active/live', 'Alameda and California are closed; the edited line is not');

-- ── D. Undo is exact when two notes close one line ──
-- (Written directly: the gateway never closes a line that is already closed.)
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006840', '00000000-0000-0000-0000-000000006804', 'Eve lives in Leeds', 'confirmed');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006841', '00000000-0000-0000-0000-000000006804', 'Eve moved to York', 'confirmed',
                    p_closes => '{00000000-0000-0000-0000-000000006840}');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006842', '00000000-0000-0000-0000-000000006804', 'Eve moved to Hull', 'confirmed',
                    p_closes => '{00000000-0000-0000-0000-000000006840}');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006840'), 'superseded/live', 'closed by two notes');
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006841';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006840'), 'superseded/live',
  'taking back one leaves it closed while the other still closes it');
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006842';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006840'), 'active/live', 'taking back the other brings it back');
SELECT tests.reset_role();

-- Replaced by one note's supersedes_id and also in another's closes_ids:
-- "still replaced by something live" looks in closes_ids too.
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006843', '00000000-0000-0000-0000-000000006804', 'Eve lives in Bath', 'confirmed');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006844', '00000000-0000-0000-0000-000000006804', 'Eve lives in Wells', 'confirmed',
                    p_supersedes => '00000000-0000-0000-0000-000000006843');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006845', '00000000-0000-0000-0000-000000006804', 'Eve lives in Frome', 'confirmed',
                    p_closes => '{00000000-0000-0000-0000-000000006843}');
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006844';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006843'), 'superseded/live',
  'a line another live note closes stays closed when its superseder is taken back');
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006845';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006843'), 'active/live', 'and comes back when the last one goes');
SELECT tests.reset_role();

-- A closed line that is itself gone: the nearest live one down its chain comes back.
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006846', '00000000-0000-0000-0000-000000006804', 'Eve lives in Ely', 'confirmed');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006847', '00000000-0000-0000-0000-000000006804', 'Eve lives in Diss', 'confirmed',
                    p_supersedes => '00000000-0000-0000-0000-000000006846');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006848', '00000000-0000-0000-0000-000000006804', 'Eve lives in Cromer', 'confirmed',
                    p_closes => '{00000000-0000-0000-0000-000000006847}');
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006847';
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006848';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006846'), 'active/live',
  'Undo of a closer whose closed line is gone brings back what that line had replaced');
SELECT tests.reset_role();

-- A resolved line comes back resolved.
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006849', '00000000-0000-0000-0000-000000006804', 'Eve lives in Ripon', 'confirmed', 'resolved');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006850', '00000000-0000-0000-0000-000000006804', 'Eve lives in Selby', 'confirmed',
                    p_closes => '{00000000-0000-0000-0000-000000006849}');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006849'), 'superseded/live', 'a resolved line can be closed');
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006850';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006849'), 'resolved/live', 'and comes back exactly as it was');
SELECT tests.reset_role();

-- ── D. What closing checks, whoever writes ──
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole',
                      'confirmed', p_closes => '{00000000-0000-0000-0000-000000006821}') $$,
  '23514', NULL, 'never across people');
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006801', 'Susan lives in Goole',
                      'confirmed', p_closes => '{00000000-0000-0000-0000-000000006822}') $$,
  '23514', NULL, 'never across subjects');
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006801', 'Susan lives in Goole',
                      'confirmed', p_closes => '{00000000-0000-0000-0000-000000006825}') $$,
  '23503', NULL, 'never another account''s line');
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole',
                      'confirmed', 'superseded', p_closes => '{00000000-0000-0000-0000-000000006840}') $$,
  '23514', NULL, 'a superseded line closes nothing');
-- Loops: a line closed while it wasn't current (here expired) can't close
-- or replace its own closer.
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006851', '00000000-0000-0000-0000-000000006804', 'Eve lives in Hythe', 'confirmed', 'expired');
SELECT pg_temp.fact('00000000-0000-0000-0000-000000006852', '00000000-0000-0000-0000-000000006804', 'Eve lives in Deal', 'confirmed',
                    p_closes => '{00000000-0000-0000-0000-000000006851}');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000006851'), 'expired/live', 'closing leaves a line that isn''t current as it is');
SELECT throws_ok($$ UPDATE public.memory_items SET closes_ids = '{00000000-0000-0000-0000-000000006852}'
                     WHERE id = '00000000-0000-0000-0000-000000006851' $$,
  '23514', 'closing would form a loop', 'closing can''t form a loop');
SELECT throws_ok($$ UPDATE public.memory_items SET supersedes_id = '00000000-0000-0000-0000-000000006852'
                     WHERE id = '00000000-0000-0000-0000-000000006851' $$,
  '23514', 'superseding would form a loop', 'superseding can''t form a loop through a closure');

-- closes_ids rules.
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole',
                      'confirmed', p_closes => '{00000000-0000-0000-0000-000000006860}') $$,
  '23514', NULL, 'never its own id');
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole',
                      'confirmed', p_closes => '{00000000-0000-0000-0000-000000006840}',
                      p_supersedes => '00000000-0000-0000-0000-000000006840') $$,
  '23514', NULL, 'never its supersedes_id');
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole',
                      'confirmed', p_closes => ARRAY(SELECT gen_random_uuid() FROM generate_series(1, 9))) $$,
  '23514', NULL, 'never more than eight');
SELECT throws_ok($$ SELECT pg_temp.fact('00000000-0000-0000-0000-000000006860', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole',
                      'confirmed', p_closes => '{NULL}') $$,
  '23514', NULL, 'never an empty entry');

-- ── B. The app never writes closes_ids ──
SELECT tests.as_user(:A);
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, statement, detail, origin, user_state, closes_ids)
                     VALUES ('fact', '00000000-0000-0000-0000-000000006804', 'Eve lives in Goole', '{"category": "home"}',
                             'user', 'user_authored', '{00000000-0000-0000-0000-000000006843}') $$,
  '42501', NULL, 'the app cannot write a line that closes others');
SELECT throws_ok($$ UPDATE public.memory_items SET closes_ids = '{00000000-0000-0000-0000-000000006843}', version = version + 1
                     WHERE id = '00000000-0000-0000-0000-000000006840' $$,
  '42501', NULL, 'nor set it on an existing one');
SELECT lives_ok($$ INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state)
                    VALUES ('00000000-0000-0000-0000-000000006861', 'fact', '00000000-0000-0000-0000-000000006804',
                            'Eve likes tea', '{"category": "preference"}', 'user', 'user_authored') $$,
  'the app still writes its own lines');
SELECT tests.reset_role();
INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind)
  VALUES (:A, '00000000-0000-0000-0000-000000006861', 'user_edit');

-- ── A. Facets: the owner reads them, nobody writes them directly ──
SELECT tests.as_user(:A);
SELECT ok((SELECT count(*) FROM public.memory_item_facets) >= 4, 'the owner reads their facets');
SELECT throws_ok($$ INSERT INTO public.memory_item_facets (user_id, memory_item_id, slot, value_text, value_norm, decided_by, rule_version)
                     VALUES ('aaaaaaaa-6868-6868-6868-686868686868', '00000000-0000-0000-0000-000000006840', 'residence',
                             'Leeds', 'leeds', 'rule', 'residence/v1') $$,
  '42501', NULL, 'the app cannot write a facet');
SELECT throws_ok($$ UPDATE public.memory_item_facets SET value_text = 'Oakland' $$, '42501', NULL, 'nor change one');
SELECT throws_ok($$ DELETE FROM public.memory_item_facets $$, '42501', NULL, 'nor delete one');
SELECT tests.reset_role();
SELECT tests.as_user(:B);
SELECT is((SELECT count(*)::int FROM public.memory_item_facets), 0, 'another account sees none of them');
SELECT tests.reset_role();
SELECT tests.as_anon();
SELECT throws_ok($$ SELECT count(*) FROM public.memory_item_facets $$, '42501', NULL, 'anon sees nothing');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT throws_ok($$ INSERT INTO public.memory_item_facets (user_id, memory_item_id, slot, value_text, value_norm, decided_by, rule_version)
                     VALUES ('aaaaaaaa-6868-6868-6868-686868686868', '00000000-0000-0000-0000-000000006840', 'residence',
                             'Leeds', 'leeds', 'rule', 'residence/v1') $$,
  '42501', NULL, 'even the service role writes facets only through the re-checking functions');
SELECT tests.reset_role();

-- The table's own rules.
CREATE FUNCTION pg_temp.raw_facet(item uuid, slot text DEFAULT 'residence', words text DEFAULT 'Leeds',
                                  cands jsonb DEFAULT '[]', place text DEFAULT NULL, usual text DEFAULT NULL,
                                  decided text DEFAULT 'rule') RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.memory_item_facets (user_id, memory_item_id, slot, value_text, value_norm, candidates,
                                         place_ref, usual_ref, decided_by, rule_version)
  VALUES ('aaaaaaaa-6868-6868-6868-686868686868', item, slot, words, lower(words), cands, place, usual, decided, 'residence/v1')
$$;
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840', 'employer') $$, '23514', NULL,
  'one slot in v1: residence');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840', words => repeat('a', 101)) $$, '23514', NULL,
  'a place in at most 100 characters');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840', words => ' ') $$, '23514', NULL,
  'and never blank');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840',
                      cands => (SELECT jsonb_agg(jsonb_build_object('ref', 'city:' || n, 'level', 'city', 'ancestors', '[]'::jsonb))
                                  FROM generate_series(1, 6) n)) $$, '23514', NULL, 'at most five readings');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840',
                      cands => '[{"ref": "region:US.CA", "level": "city", "ancestors": []}]') $$, '23514', NULL,
  'a reading is of its own level');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840',
                      cands => '[{"ref": "city:1", "level": "city", "ancestors": ["city:2"]}]') $$, '23514', NULL,
  'what contains a place is a region or a country');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840',
                      cands => '[{"ref": "city:1", "level": "city", "ancestors": [], "population": 5}]') $$, '23514', NULL,
  'a reading carries nothing else');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840',
                      cands => '[{"ref": "city:1", "level": "city", "ancestors": []}]', place => 'city:2') $$, '23514', NULL,
  'the pinned reading is one of the readings');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840',
                      cands => '[{"ref": "city:1", "level": "city", "ancestors": []}]', usual => 'city:2') $$, '23514', NULL,
  'so is the usual one');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840', decided => 'user') $$, '23514', NULL,
  'a user''s decision pins a reading');
SELECT lives_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840') $$, 'a well-formed facet');
SELECT throws_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840') $$, '23505', NULL,
  'one live facet per line and slot');
UPDATE public.memory_item_facets SET deleted_at = now() WHERE memory_item_id = '00000000-0000-0000-0000-000000006840';
SELECT lives_ok($$ SELECT pg_temp.raw_facet('00000000-0000-0000-0000-000000006840') $$, 'a tombstoned one makes room for the next');

-- ── E. write_facets: the gateway's re-derivation ──
SELECT pg_temp.fact(('00000000-0000-0000-0000-00000000687' || n)::uuid, '00000000-0000-0000-0000-000000006804',
                    'Eve lives in Town' || n)
  FROM generate_series(1, 6) n;
CREATE FUNCTION pg_temp.derive(item uuid, words text, extra jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('memory_item_id', item, 'version', (SELECT version FROM public.memory_items WHERE id = item),
                            'facets', jsonb_build_array(pg_temp.facet(words) || extra))
$$;

SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT public.write_facets('aaaaaaaa-6868-6868-6868-686868686868', '[]') $$, '42501', NULL,
  'the app cannot call write_facets');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is((SELECT jsonb_agg(e ->> 'result') FROM jsonb_array_elements(public.write_facets(:A,
            (SELECT jsonb_agg(pg_temp.derive(('00000000-0000-0000-0000-00000000687' || n)::uuid, 'Town' || n)) FROM generate_series(1, 6) n))) e),
  '["written", "written", "written", "written", "written", "written"]'::jsonb, 'the gateway writes facets for lines that may carry them');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive('00000000-0000-0000-0000-000000006876', 'Town6'))) -> 0 ->> 'result'),
  'unchanged', 'deriving the same reading again changes nothing');
SELECT is((SELECT version FROM public.memory_item_facets WHERE memory_item_id = '00000000-0000-0000-0000-000000006876' AND deleted_at IS NULL),
  1, 'not even its version');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(
            pg_temp.derive('00000000-0000-0000-0000-000000006876', 'Town6') || '{"version": 99}'::jsonb)) -> 0 ->> 'result'),
  'dropped', 'a reading of an older version of the line is left alone');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive('00000000-0000-0000-0000-000000006876', 'Townsville'))) -> 0 ->> 'result'),
  'dropped', 'only words the user said for this line');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive('00000000-0000-0000-0000-000000006825', 'Rome'))) -> 0 ->> 'result'),
  'dropped', 'never another account''s line');
SELECT is(public.write_facets(:A, '[{"memory_item_id": "nope", "version": 1, "facets": []}]'),
  '[{"id": null, "result": "dropped"}]'::jsonb, 'a malformed entry is dropped, never an error');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive((v -> 2 ->> 'id')::uuid, 'Oakland'))) -> 0 ->> 'result'
             FROM out WHERE k = 'oak'),
  'dropped', 'a shared line gets none in v1');
-- From the note's quote, on a line the gateway wrote ("Susan lives in Oakland",
-- whose own facet was refused for its readings).
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive((v -> 6 ->> 'id')::uuid, 'Oakland'))) -> 0 ->> 'result'
             FROM out WHERE k = 'oak'),
  'written', 'a quote of the note counts as the user''s words');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive((v -> 4 ->> 'id')::uuid, 'Oakland'))) -> 0 ->> 'result'
             FROM out WHERE k = 'oak'),
  'dropped', 'a quote that doesn''t say it does not');
-- The user's answer pins a reading; re-derivation never undoes it.
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive('00000000-0000-0000-0000-000000006876', 'Town6',
            '{"decided_by": "user", "place_ref": "city:9000021", "candidates": [{"ref": "city:9000021", "level": "city", "ancestors": ["region:US.TX"]}]}'))) -> 0 ->> 'result'),
  'written', 'the user''s answer replaces the rule''s reading');
SELECT is((SELECT decided_by || ':' || place_ref || ':' || version FROM public.memory_item_facets
            WHERE memory_item_id = '00000000-0000-0000-0000-000000006876' AND deleted_at IS NULL),
  'user:city:9000021:2', 'in place, as a newer version');
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive('00000000-0000-0000-0000-000000006876', 'Town6'))) -> 0 ->> 'result'),
  'unchanged', 'a rule''s re-derivation leaves the user''s reading alone');
SELECT throws_ok($$ SELECT public.write_facets('aaaaaaaa-6868-6868-6868-686868686868', '{}') $$, '22023', NULL,
  'items must be an array');
SELECT tests.reset_role();

-- ── D. A changed line loses its facet at once; a superseded one keeps it ──
SELECT tests.as_user(:A);
UPDATE public.memory_items SET detail = '{"category": "home", "attribute": "town"}', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006871';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006871'), 'live:Town1', 'a change to detail alone keeps the facet');
UPDATE public.memory_items SET statement = 'Eve lives in Town1 now', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006871';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006871'), 'gone', 'the user''s edit to its words tombstones it');
UPDATE public.memory_items SET certainty = 'tentative', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006872';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006872'), 'gone', 'so does a change of certainty');
UPDATE public.memory_items SET person_id = '00000000-0000-0000-0000-000000006803', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006873';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006873'), 'gone', 'or of person (the line moved to someone else)');
UPDATE public.memory_items SET with_person_ids = '{00000000-0000-0000-0000-000000006802}', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006874';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006874'), 'gone', 'or of the people it is shared with');
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006875';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006875'), 'gone', '"Not this" takes the facet with the line');
UPDATE public.memory_items SET sensitivity = 'health', version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000006876';
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006876'), 'gone', 'a change of sensitivity too, even a user-pinned one');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT is((SELECT public.write_facets(:A, jsonb_build_array(pg_temp.derive('00000000-0000-0000-0000-000000006872', 'Town2'))) -> 0 ->> 'result'),
  'dropped', 'a line that became hedged gets no facet again');
SELECT tests.reset_role();
SELECT is(pg_temp.facet_of((SELECT ala FROM ids)), 'live:Alameda', 'a superseded line keeps its facet');

-- ── F. Server-only tables: no content, no app access ──
SELECT tests.as_user(:A);
SELECT throws_ok($$ SELECT count(*) FROM public.residence_backfill_report $$, '42501', NULL, 'the app cannot read the report');
SELECT throws_ok($$ SELECT count(*) FROM public.semantic_runs $$, '42501', NULL, 'nor the runs');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT lives_ok(format($$ INSERT INTO public.residence_backfill_report (memory_item_id, bucket, rule_version, dataset_version)
                          VALUES (%L, 'would_compose', 'residence/v1', 'places-2026.10') $$, (SELECT ala FROM ids)),
  'the gateway records a bucket for an item');
SELECT throws_ok(format($$ INSERT INTO public.residence_backfill_report (memory_item_id, bucket, rule_version, dataset_version)
                           VALUES (%L, 'Alameda', 'residence/v1', 'places-2026.10') $$, (SELECT ala FROM ids)),
  '23514', NULL, 'buckets are the brief''s, never words');
SELECT lives_ok($$ INSERT INTO public.semantic_runs (user_id, mode, rule_version, dataset_version)
                   VALUES ('aaaaaaaa-6868-6868-6868-686868686868', 'report', 'residence/v1', 'places-2026.10') $$,
  'and when it ran');
SELECT throws_ok($$ INSERT INTO public.semantic_runs (user_id, mode, rule_version, dataset_version)
                    VALUES ('aaaaaaaa-6868-6868-6868-686868686868', 'rewrite', 'residence/v1', 'places-2026.10') $$,
  '23514', NULL, 'in report or apply mode only');
SELECT tests.reset_role();

-- ── Tombstones are purged after 30 days, facets too ──
UPDATE public.memory_item_facets SET deleted_at = now() - interval '31 days'
 WHERE memory_item_id = '00000000-0000-0000-0000-000000006872';
SELECT tests.as_service();
SELECT ok((public.purge_tombstones() ->> 'memory_item_facets')::int >= 1, 'the purge removes facet tombstones older than 30 days');
SELECT tests.reset_role();
SELECT is(pg_temp.facet_of('00000000-0000-0000-0000-000000006872'), 'none', 'and that one is gone');

SELECT * FROM finish();
ROLLBACK;
