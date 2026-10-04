-- Checkpoint D1: Undo and "Not this" on a memory that replaced another bring
-- the older one back as it was, only for its owner, and never while
-- something else still replaces it.
BEGIN;
SELECT plan(12);

\set A '''aaaaaaaa-2020-2020-2020-202020202020'''
\set B '''bbbbbbbb-2020-2020-2020-202020202020'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

-- One item from one note, written as the app writes it (item + source together).
CREATE FUNCTION pg_temp.remember(item uuid, capture uuid, person uuid, statement text, supersedes uuid DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  SELECT public.write_memory_item(
    jsonb_build_object('id', item, 'kind', 'fact', 'person_id', person, 'statement', statement, 'origin', 'user',
                       'user_state', 'user_authored', 'detail', jsonb_build_object('category', 'work'),
                       'supersedes_id', supersedes),
    jsonb_build_array(jsonb_build_object('source_kind', 'capture', 'capture_id', capture, 'span_start', 0, 'span_end', 4)));
$$;

CREATE FUNCTION pg_temp.state(item uuid) RETURNS text LANGUAGE sql AS $$
  SELECT status || '/' || coalesce(valid_to::text, '-') || '/' || CASE WHEN deleted_at IS NULL THEN 'live' ELSE 'gone' END
    FROM public.memory_items WHERE id = item
$$;

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000002001', 'Mike');
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000002010', 'text', 'Mike works at Google.'),
  ('00000000-0000-0000-0000-000000002011', 'text', 'Mike works at Apple now.'),
  ('00000000-0000-0000-0000-000000002012', 'text', 'Mike moved to Stripe.'),
  ('00000000-0000-0000-0000-000000002013', 'text', 'Mike joined Figma.'),
  ('00000000-0000-0000-0000-000000002014', 'text', 'Mike went to Notion.');
SELECT pg_temp.remember('00000000-0000-0000-0000-000000002020', '00000000-0000-0000-0000-000000002010',
  '00000000-0000-0000-0000-000000002001', 'Mike works at Google');
SELECT pg_temp.remember('00000000-0000-0000-0000-000000002021', '00000000-0000-0000-0000-000000002011',
  '00000000-0000-0000-0000-000000002001', 'Mike works at Apple', '00000000-0000-0000-0000-000000002020');

SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'superseded/' || current_date || '/live',
  'the older fact is replaced, and dated');

-- "Not this" on the newer one.
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000002021';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'active/-/live',
  '"Not this" on what replaced it brings the older fact back exactly as it was');

-- Undo: deleting the note that replaced it.
SELECT pg_temp.remember('00000000-0000-0000-0000-000000002022', '00000000-0000-0000-0000-000000002012',
  '00000000-0000-0000-0000-000000002001', 'Mike works at Stripe', '00000000-0000-0000-0000-000000002020');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'superseded/' || current_date || '/live', 'replaced again');
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000002012';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002022'), 'active/-/gone', 'Undo takes the newer item with its note');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'active/-/live', 'and the older fact comes back');

-- A chain: Google ← Figma ← Notion.
SELECT pg_temp.remember('00000000-0000-0000-0000-000000002023', '00000000-0000-0000-0000-000000002013',
  '00000000-0000-0000-0000-000000002001', 'Mike works at Figma', '00000000-0000-0000-0000-000000002020');
SELECT pg_temp.remember('00000000-0000-0000-0000-000000002024', '00000000-0000-0000-0000-000000002014',
  '00000000-0000-0000-0000-000000002001', 'Mike works at Notion', '00000000-0000-0000-0000-000000002023');
-- Removing the middle one (already replaced) changes nothing current.
UPDATE public.captures SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000002013';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'superseded/' || current_date || '/live',
  'removing an item that was already replaced restores nothing: Notion is still current');
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002024'), 'active/-/live', 'the newest stays current');
-- Removing the newest: the nearest live one down the chain comes back.
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000002024';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'active/-/live',
  'with Notion and Figma gone, Google is current again');
SELECT tests.reset_role();

-- Two live replacements: taking one back leaves it replaced by the other.
SELECT tests.as_user(:A);
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000002015', 'text', 'Mike is at Apple.'),
  ('00000000-0000-0000-0000-000000002016', 'text', 'Mike is at Apple (again).');
SELECT pg_temp.remember('00000000-0000-0000-0000-000000002025', '00000000-0000-0000-0000-000000002015',
  '00000000-0000-0000-0000-000000002001', 'Mike works at Apple', '00000000-0000-0000-0000-000000002020');
-- A second item replacing the same fact, written by the service (as a merge path might).
SELECT tests.reset_role();
SELECT tests.as_service();
INSERT INTO public.memory_items (id, user_id, kind, person_id, statement, detail, origin, user_state, supersedes_id)
VALUES ('00000000-0000-0000-0000-000000002026', :A, 'fact', '00000000-0000-0000-0000-000000002001', 'Mike is at Apple',
        '{"category": "work"}', 'extracted', 'unreviewed', '00000000-0000-0000-0000-000000002020');
INSERT INTO public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end)
VALUES (:A, '00000000-0000-0000-0000-000000002026', '00000000-0000-0000-0000-000000002016', 'capture', 0, 4);
SELECT tests.reset_role();
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now(), version = version + 1
 WHERE id = '00000000-0000-0000-0000-000000002025';
SELECT is(pg_temp.state('00000000-0000-0000-0000-000000002020'), 'superseded/' || current_date || '/live',
  'still replaced by another live item: it stays replaced');
SELECT tests.reset_role();

-- Deleting the person: everything goes, nothing is brought back.
SELECT tests.as_user(:A);
UPDATE public.people SET deleted_at = now(), version = version + 1 WHERE id = '00000000-0000-0000-0000-000000002001';
SELECT is((SELECT count(*)::int FROM public.memory_items WHERE person_id = '00000000-0000-0000-0000-000000002001' AND deleted_at IS NULL), 0,
  'deleting the person removes every item, restoring none');
SELECT tests.reset_role();

-- Only ever the owner's items.
SELECT tests.as_user(:B);
SELECT is((SELECT count(*)::int FROM public.memory_items), 0, 'another user sees none of it');
SELECT tests.reset_role();
SELECT is((SELECT count(*)::int FROM public.memory_item_history WHERE user_id <> :A), 0,
  'no history was written for anyone else');

SELECT * FROM finish();
ROLLBACK;
