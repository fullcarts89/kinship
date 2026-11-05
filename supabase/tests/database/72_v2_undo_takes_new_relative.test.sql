-- Undo is exact for a relative: when a note goes, a relative one of its lines
-- was about goes too, unless a line about them is left or the user made a
-- person of them.
BEGIN;
SELECT plan(14);

\set A '''aaaaaaaa-7272-7272-7272-727272727272'''
SELECT tests.create_user(:A);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

-- A line about a relative of Sam's, as the gateway writes it: a new relative, or `id`.
CREATE FUNCTION pg_temp.tell(capture uuid, statement text, relation text, id uuid DEFAULT NULL, rname text DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
  SELECT public.claim_capture_extraction('aaaaaaaa-7272-7272-7272-727272727272', capture);
  SELECT pg_temp.at_commit(format($s$ SELECT public.write_extraction(
    'aaaaaaaa-7272-7272-7272-727272727272', %L, 'relationship_extract/v6+claude-test', false, %L) $s$, capture,
    jsonb_build_array(jsonb_build_object(
      'kind', 'fact', 'person_id', '00000000-0000-0000-0000-000000007201', 'subject_type', 'related',
      'related', jsonb_build_object('id', id, 'relation', relation, 'name', rname),
      'statement', statement, 'certainty', 'stated', 'sensitivity', 'none', 'confidence', 0.9,
      'detail', '{"category": "other"}'::jsonb, 'spans', '[{"start": 0, "end": 3}]'::jsonb,
      'action', '{"type": "new", "target_id": null}'::jsonb))));
$$;

CREATE FUNCTION pg_temp.undo(capture uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = capture;
$$;

CREATE FUNCTION pg_temp.relative(rel text) RETURNS uuid LANGUAGE sql AS $$
  SELECT id FROM public.related_people WHERE relation = rel ORDER BY created_at DESC LIMIT 1
$$;

CREATE FUNCTION pg_temp.state(rel text) RETURNS text LANGUAGE sql AS $$
  SELECT CASE WHEN deleted_at IS NULL THEN 'live' ELSE 'gone' END
    FROM public.related_people WHERE relation = rel ORDER BY created_at DESC LIMIT 1
$$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000007201', 'Sam'),
  ('00000000-0000-0000-0000-000000007202', 'Ana');
INSERT INTO public.captures (id, source, raw_text)
  SELECT ('00000000-0000-0000-0000-0000000072' || n)::uuid, 'text', 'Note ' || n
    FROM generate_series(10, 21) n;
SELECT tests.reset_role();

-- ── The note added them, and nothing else says them ──
SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007210', 'Sam''s dad has surgery', 'dad');
SELECT tests.reset_role();
SELECT is(pg_temp.state('dad'), 'live', 'the note adds a relative');
SELECT tests.as_user(:A);
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007210');
SELECT is(pg_temp.state('dad'), 'gone', 'Undo takes them');
SELECT tests.reset_role();
SELECT is((SELECT version FROM public.related_people WHERE relation = 'dad'), 2,
  'and the row moved on, so the going reaches the phone');

-- As the app undoes: the note's lines first, then the note.
SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007211', 'Sam''s mom is visiting', 'mom');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE statement = 'Sam''s mom is visiting' AND deleted_at IS NULL;
SELECT is(pg_temp.state('mom'), 'live', '"Not this" alone takes a line, not the relative');
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007211');
SELECT is(pg_temp.state('mom'), 'gone', 'Undo after it does');
SELECT tests.reset_role();

-- ── Another line still says them, in either order ──
SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007212', 'Sam''s sister is moving', 'sister');
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007213', 'Sam''s sister got the job', 'sister', pg_temp.relative('sister'));
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007213');
SELECT is(pg_temp.state('sister'), 'live', 'undoing the later note: the earlier line still says her');
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007212');
SELECT is(pg_temp.state('sister'), 'gone', 'then the note that added her: nothing does');
SELECT tests.reset_role();

SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007214', 'Sam''s brother is moving', 'brother');
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007215', 'Sam''s brother got the job', 'brother', pg_temp.relative('brother'));
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007214');
SELECT is(pg_temp.state('brother'), 'live', 'undoing the note that added him: the later line still says him');
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE statement = 'Sam''s brother got the job' AND deleted_at IS NULL), 1,
  'and that line is still there, about him');
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007215');
SELECT is(pg_temp.state('brother'), 'gone', 'then the later note: nothing does');
SELECT tests.reset_role();

-- ── A line another note also supports stays, and so do they ──
SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007216', 'Sam''s aunt is moving', 'aunt');
SELECT tests.reset_role();
INSERT INTO public.memory_item_sources (user_id, memory_item_id, source_kind, capture_id, span_start, span_end)
  SELECT :A, id, 'capture', '00000000-0000-0000-0000-000000007217', 0, 3
    FROM public.memory_items WHERE statement = 'Sam''s aunt is moving';
SELECT tests.as_user(:A);
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007216');
SELECT is(pg_temp.state('aunt'), 'live', 'a line told twice is still there after one note goes');
SELECT tests.reset_role();

-- ── The user made a person of them ──
SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007218', 'Sam''s cousin Ana is moving', 'cousin', NULL, 'Ana');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.related_people SET promoted_person_id = '00000000-0000-0000-0000-000000007202', version = version + 1
 WHERE id = pg_temp.relative('cousin');
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007218');
SELECT is(pg_temp.state('cousin'), 'live', 'the user''s yes to who they are stays');
SELECT tests.reset_role();

-- ── A note about someone else touches no one else's ──
SELECT tests.as_service();
SELECT pg_temp.tell('00000000-0000-0000-0000-000000007219', 'Sam''s uncle is moving', 'uncle');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007220');
SELECT is(pg_temp.state('uncle'), 'live', 'a note with no line about them leaves them');
SELECT pg_temp.undo('00000000-0000-0000-0000-000000007219');
SELECT is(pg_temp.state('uncle'), 'gone', 'the note that was about them takes them');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
