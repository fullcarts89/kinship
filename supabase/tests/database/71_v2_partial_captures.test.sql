-- Option A, containment (founder, 19 Oct 2026; migration 20261019090000): a
-- note the understanding could not take whole carries what it did not get
-- to, as the note's own spans and a count, written by the gateway only; a
-- later note that tells the rest points back at it. Nothing here changes a
-- status, a tier, provenance or Undo.
BEGIN;
SELECT plan(22);

\set A '''aaaaaaaa-7171-7171-7171-717171717171'''
\set B '''bbbbbbbb-7171-7171-7171-717171717171'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

-- ── The columns and the shape they accept ───────────────────────────────
SELECT has_column('public', 'captures', 'coverage', 'captures.coverage exists');
SELECT has_column('public', 'captures', 'continues_capture_id', 'captures.continues_capture_id exists');

SELECT ok(public.capture_coverage_ok('{"v": 1, "unprocessed": [{"start": 3, "end": 9}], "unlocated": 0}'::jsonb), 'spans and a count');
SELECT ok(public.capture_coverage_ok('{"v": 1, "unprocessed": [], "unlocated": 2}'::jsonb), 'a count alone (nothing placed)');
SELECT ok(NOT public.capture_coverage_ok('{"v": 1, "unprocessed": [{"start": 9, "end": 3}], "unlocated": 0}'::jsonb), 'a span must run forwards');
SELECT ok(NOT public.capture_coverage_ok('{"v": 1, "unprocessed": [{"start": 0, "end": 5, "quote": "words"}], "unlocated": 0}'::jsonb), 'never words in a span');
SELECT ok(NOT public.capture_coverage_ok('{"v": 1, "unprocessed": [], "unlocated": 0, "note": "x"}'::jsonb), 'never anything but spans and a count');
SELECT ok(NOT public.capture_coverage_ok('{"v": 2, "unprocessed": [], "unlocated": 0}'::jsonb), 'one shape, versioned');
SELECT ok(NOT public.capture_coverage_ok('{"v": 1, "unprocessed": [{"start": 0, "end": 6000}], "unlocated": 0}'::jsonb), 'inside the note''s own length');

-- ── A note, as the app inserts it, then the gateway's coverage ──────────
CREATE TEMP TABLE ids (k text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
GRANT ALL ON ids TO PUBLIC;
INSERT INTO ids (k) VALUES ('long'), ('rest'), ('other');
SELECT tests.as_user(:A);
INSERT INTO public.captures (id, user_id, source, raw_text, status, time_zone)
  VALUES ((SELECT id FROM ids WHERE k = 'long'), :A, 'text', 'Ben loves jazz. Ben took up pottery. Ben grows tomatoes.', 'pending', 'America/Los_Angeles');

SELECT throws_ok(
  format($q$UPDATE public.captures SET coverage = '{"v": 1, "unprocessed": [], "unlocated": 1}' WHERE id = %L$q$, (SELECT id FROM ids WHERE k = 'long')),
  '42501', NULL, 'the app never writes coverage (no column grant)');
SELECT throws_ok(
  format($q$SELECT public.set_capture_coverage(%L, %L, '{"v": 1, "unprocessed": [], "unlocated": 1}')$q$, :A, (SELECT id FROM ids WHERE k = 'long')),
  '42501', NULL, 'the app cannot call the gateway''s write');

SELECT tests.as_service();
SELECT lives_ok(
  format($q$SELECT public.set_capture_coverage(%L, %L, '{"v": 1, "unprocessed": [{"start": 37, "end": 55}], "unlocated": 0}')$q$, :A, (SELECT id FROM ids WHERE k = 'long')),
  'the gateway records what it did not get to');
SELECT is((SELECT coverage FROM public.captures WHERE id = (SELECT id FROM ids WHERE k = 'long')),
  '{"v": 1, "unprocessed": [{"start": 37, "end": 55}], "unlocated": 0}'::jsonb, 'spans and a count, as given');
SELECT throws_ok(
  format($q$SELECT public.set_capture_coverage(%L, %L, '{"v": 1, "unprocessed": [{"start": 1, "end": 2, "quote": "no"}], "unlocated": 0}')$q$, :A, (SELECT id FROM ids WHERE k = 'long')),
  '22023', NULL, 'the gateway''s write holds to the shape too');
-- Another account's id with this capture: nothing written.
SELECT lives_ok(
  format($q$SELECT public.set_capture_coverage(%L, %L, NULL)$q$, :B, (SELECT id FROM ids WHERE k = 'long')),
  'a mismatched owner is a no-op, not an error');
SELECT is((SELECT coverage IS NOT NULL FROM public.captures WHERE id = (SELECT id FROM ids WHERE k = 'long')), true, 'and changes nothing');
-- Cleared when a later run takes the note whole.
SELECT lives_ok(format($q$SELECT public.set_capture_coverage(%L, %L, NULL)$q$, :A, (SELECT id FROM ids WHERE k = 'long')), 'cleared');
SELECT is((SELECT coverage FROM public.captures WHERE id = (SELECT id FROM ids WHERE k = 'long')), NULL, 'nothing left out any more');

-- ── "Tell the rest": the later note points back; the link is the app's at insert, then fixed ──
SELECT tests.as_user(:A);
SELECT lives_ok(
  format($q$INSERT INTO public.captures (id, user_id, source, raw_text, status, continues_capture_id)
            VALUES (%L, %L, 'text', 'Ben grows tomatoes.', 'pending', %L)$q$,
         (SELECT id FROM ids WHERE k = 'rest'), :A, (SELECT id FROM ids WHERE k = 'long')),
  'the app records which note this one tells the rest of');
SELECT throws_ok(
  format($q$UPDATE public.captures SET continues_capture_id = NULL WHERE id = %L$q$, (SELECT id FROM ids WHERE k = 'rest')),
  '42501', NULL, 'never changed afterwards (no update grant)');
SELECT throws_ok(
  format($q$INSERT INTO public.captures (id, user_id, source, raw_text, status, continues_capture_id)
            VALUES (%L, %L, 'text', 'x', 'pending', %L)$q$,
         (SELECT id FROM ids WHERE k = 'other'), :A, (SELECT id FROM ids WHERE k = 'other')),
  '23514', NULL, 'a note never continues itself');
-- Another account cannot point at this account's note (the pair FK).
SELECT tests.as_user(:B);
SELECT throws_ok(
  format($q$INSERT INTO public.captures (user_id, source, raw_text, status, continues_capture_id)
            VALUES (%L, 'text', 'x', 'pending', %L)$q$, :B, (SELECT id FROM ids WHERE k = 'long')),
  '23503', NULL, 'the link stays inside one account');
-- Deleting the first note (Undo) leaves the later one, unlinked.
SELECT tests.as_service();
DELETE FROM public.captures WHERE id = (SELECT id FROM ids WHERE k = 'long');
SELECT is((SELECT continues_capture_id FROM public.captures WHERE id = (SELECT id FROM ids WHERE k = 'rest')), NULL,
  'Undo on the first note leaves the rest as a note of its own');

SELECT * FROM finish();
ROLLBACK;
