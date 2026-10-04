-- Checkpoint A amendments (founder review, 2 Oct 2026): contact_events,
-- event_goal, strict client versioning, code-point spans over NFC text,
-- birthday provenance, SECURITY DEFINER hygiene, flags off by default.
BEGIN;
SELECT plan(41);

\set A '''aaaaaaaa-1414-1414-1414-141414141414'''
SELECT tests.create_user(:A);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

-- ── 1. contact_events ───────────────────────────────────────────────────
SELECT has_table('public', 'contact_events', 'confirmed contact lives in contact_events');
SELECT hasnt_table('public', 'connections', 'the broad name "connections" is gone');
SELECT is((SELECT count(*)::int FROM pg_constraint WHERE conrelid = 'public.contact_events'::regclass
           AND conname LIKE 'connections%'), 0, 'no constraint keeps the old name');
SELECT has_trigger('public', 'people', 'people_cascade_delete_contact_events',
  'deleting a person still deletes their contact events');

-- ── 2. event_goal ───────────────────────────────────────────────────────
SELECT ok(public.memory_detail_ok('event',
  '{"date_precision": "day", "event_type": "race", "followup_policy": "after", "event_goal": "under four hours"}'),
  'event detail accepts event_goal');
SELECT ok(NOT public.memory_detail_ok('event',
  '{"date_precision": "day", "event_type": "race", "followup_policy": "after", "goal": "under four hours"}'),
  'the overloaded key "goal" is rejected');

-- ── 3. Strict versioning: client vs server-owned writes ─────────────────
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001401', 'Ben');
INSERT INTO public.user_settings (time_zone) VALUES ('America/Chicago');
SELECT throws_ok($$ UPDATE public.user_settings SET push_enabled = true $$,
  '40001', NULL, 'settings updates need a version too');
SELECT lives_ok($$ UPDATE public.user_settings SET push_enabled = true, version = 2 $$,
  'a settings update with the version read + 1 is accepted');
-- A SECURITY DEFINER function owns its own concurrency.
SELECT lives_ok($$ SELECT public.set_ai_consent(true, 1) $$, 'set_ai_consent works without a client version');
SELECT is((SELECT version FROM public.user_settings), 3, '…and still bumps the row version');
SELECT tests.reset_role();
-- The service role (server jobs) owns its concurrency.
SELECT tests.as_service();
SELECT lives_ok($$ UPDATE public.people SET relationship_label = 'running buddy'
  WHERE id = '00000000-0000-0000-0000-000000001401' $$, 'a server job may update without a client version');
SELECT tests.reset_role();
SELECT is((SELECT version FROM public.people WHERE id = '00000000-0000-0000-0000-000000001401'), 2,
  'server writes still bump the version, so clients see the change as newer');

-- ── 4. Spans: Unicode code points, end-exclusive, over NFC text ─────────
SELECT tests.as_user(:A);
INSERT INTO public.captures (id, source, raw_text) VALUES
  ('00000000-0000-0000-0000-000000001411', 'text', 'Ben 🏃‍♂️ ran Chicago 🎉 in 3:58!'),
  ('00000000-0000-0000-0000-000000001412', 'text', 'Zoë''s café in São Paulo opens Friday.'),
  ('00000000-0000-0000-0000-000000001413', 'text', '陈伟下周日跑芝加哥马拉松，目标四小时内。'),
  ('00000000-0000-0000-0000-000000001414', 'text', 'Ben said “I’ll break four hours” — fingers crossed.'),
  ('00000000-0000-0000-0000-000000001415', 'text', E'Dinner notes:\nBen runs Chicago Sunday.\r\nHe''s nervous.');

SELECT is(char_length(raw_text), 31, 'emoji capture is 31 code points (a ZWJ sequence counts each code point)')
FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001411';

SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state) VALUES
    ('00000000-0000-0000-0000-000000001421', 'moment', '00000000-0000-0000-0000-000000001401', 'emoji', '{}', 'user', 'user_authored'),
    ('00000000-0000-0000-0000-000000001422', 'moment', '00000000-0000-0000-0000-000000001401', 'accents', '{}', 'user', 'user_authored'),
    ('00000000-0000-0000-0000-000000001423', 'moment', '00000000-0000-0000-0000-000000001401', 'cjk', '{}', 'user', 'user_authored'),
    ('00000000-0000-0000-0000-000000001424', 'moment', '00000000-0000-0000-0000-000000001401', 'curly', '{}', 'user', 'user_authored'),
    ('00000000-0000-0000-0000-000000001425', 'moment', '00000000-0000-0000-0000-000000001401', 'multiline', '{}', 'user', 'user_authored');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end) VALUES
    ('00000000-0000-0000-0000-000000001421', '00000000-0000-0000-0000-000000001411', 'capture', 9, 22),
    ('00000000-0000-0000-0000-000000001422', '00000000-0000-0000-0000-000000001412', 'capture', 14, 23),
    ('00000000-0000-0000-0000-000000001423', '00000000-0000-0000-0000-000000001413', 'capture', 6, 12),
    ('00000000-0000-0000-0000-000000001424', '00000000-0000-0000-0000-000000001414', 'capture', 9, 32),
    ('00000000-0000-0000-0000-000000001425', '00000000-0000-0000-0000-000000001415', 'capture', 14, 38);
  $s$) $$, 'code-point spans over emoji, accents, CJK, curly punctuation and multiline text are accepted');

SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001421'),
  'ran Chicago 🎉', 'emoji: span [9, 22) is exactly "ran Chicago 🎉"');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001422'),
  'São Paulo', 'accents: span [14, 23) is exactly "São Paulo"');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001423'),
  '芝加哥马拉松', 'CJK: span [6, 12) is exactly "芝加哥马拉松"');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001424'),
  '“I’ll break four hours”', 'curly punctuation: span [9, 32) keeps the curly quotes');
SELECT is((SELECT quote FROM public.memory_item_sources WHERE memory_item_id = '00000000-0000-0000-0000-000000001425'),
  'Ben runs Chicago Sunday.', 'multiline: span [14, 38) is the second line, without the CRLF');
SELECT throws_ok($$ INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-000000001421', '00000000-0000-0000-0000-000000001411', 'capture', 20, 33) $$,
  '23514', NULL, 'a span measured in UTF-16 units (33) overshoots the 31 code points and is rejected');

-- NFC: the decomposed spelling of "Zoë" (e + combining diaeresis) is refused.
SELECT throws_ok(format($$ INSERT INTO public.captures (source, raw_text) VALUES ('text', %L) $$,
                        'Zo' || 'e' || chr(776) || '''s café'),
  '23514', NULL, 'captured text must be NFC, so offsets mean the same code points everywhere');

-- ── 5. Birthday provenance ──────────────────────────────────────────────
SELECT throws_ok($$ INSERT INTO public.people (display_name, birthday) VALUES ('Ana', '1990-01-01') $$,
  '23514', NULL, 'a birthday needs a source');
SELECT throws_ok($$ INSERT INTO public.people (display_name, birthday, birthday_source)
  VALUES ('Ana', '1990-01-01', 'capture') $$,
  '23514', NULL, 'a birthday from a capture names the capture');
SELECT throws_ok($$ INSERT INTO public.people (display_name, birthday, birthday_source)
  VALUES ('Ana', '1990-01-01', 'astrology') $$,
  '23514', NULL, 'the source is contacts, capture or user_edit');

INSERT INTO public.captures (id, source, raw_text)
  VALUES ('00000000-0000-0000-0000-000000001431', 'text', 'Ana''s birthday is March 3.');
INSERT INTO public.people (id, display_name, birthday, birthday_year_known, birthday_source, birthday_capture_id)
  VALUES ('00000000-0000-0000-0000-000000001432', 'Ana', '2000-03-03', false, 'capture',
          '00000000-0000-0000-0000-000000001431');
SELECT is((SELECT birthday_source || ':' || birthday_capture_id FROM public.people
           WHERE id = '00000000-0000-0000-0000-000000001432'),
  'capture:00000000-0000-0000-0000-000000001431', 'Kinship can say which note a birthday came from');

UPDATE public.people SET birthday = '2000-03-04', version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000001432';
SELECT is((SELECT coalesce(birthday_source, '?') || ':' || coalesce(birthday_capture_id::text, 'none')
           FROM public.people WHERE id = '00000000-0000-0000-0000-000000001432'),
  'user_edit:none', 'changing the birthday makes it the user''s own edit');

INSERT INTO public.people (id, display_name, birthday, birthday_source, birthday_capture_id)
  VALUES ('00000000-0000-0000-0000-000000001433', 'Leo', '2019-05-05', 'capture',
          '00000000-0000-0000-0000-000000001431');
UPDATE public.captures SET deleted_at = now(), version = version + 1
  WHERE id = '00000000-0000-0000-0000-000000001431';
SELECT ok((SELECT birthday IS NULL AND birthday_source IS NULL FROM public.people
           WHERE id = '00000000-0000-0000-0000-000000001433'),
  'deleting the note a birthday came from removes that birthday');
SELECT ok((SELECT birthday IS NOT NULL FROM public.people WHERE id = '00000000-0000-0000-0000-000000001432'),
  'a birthday the user edited survives the note''s deletion');
SELECT tests.reset_role();

SELECT throws_ok(format($$ INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES (%L, '00000000-0000-0000-0000-000000001433', 'birthday', now(), now(), 'leo') $$, :A),
  '23514', NULL, 'no birthday reason without a birthday that has a source');
SELECT lives_ok(format($$ INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES (%L, '00000000-0000-0000-0000-000000001432', 'birthday', now(), now(), 'ana') $$, :A),
  'a birthday reason for a birthday with a known source is accepted');

-- ── 7. SECURITY DEFINER hygiene ─────────────────────────────────────────
-- Every SECURITY DEFINER function Kinship owns: a fixed empty search_path,
-- and not executable by anon or PUBLIC.
SELECT is(
  (SELECT array_agg(p.proname::text ORDER BY p.proname) FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef
     AND NOT coalesce(('search_path=""' = ANY (p.proconfig)) OR ('search_path=pg_catalog' = ANY (p.proconfig)), false)),
  NULL, 'every SECURITY DEFINER function pins a safe search_path (empty, or pg_catalog for the platform''s rls_auto_enable)');
SELECT is(
  (SELECT array_agg(p.proname::text ORDER BY p.proname) FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                     WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))),
  NULL, 'no SECURITY DEFINER function is executable by anon or PUBLIC');
SELECT is(
  (SELECT array_agg(p.proname::text ORDER BY p.proname) FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  -- close_capture_review (C-2) acts only on auth.uid()'s own capture.
  ARRAY['close_capture_review', 'consume_ai_call', 'set_ai_consent'],
  'signed-in users can call exactly three SECURITY DEFINER functions');
-- Those two take no user id: identity comes only from auth.uid().
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('consume_ai_call', 'set_ai_consent')
             AND 'uuid'::regtype = ANY (p.proargtypes::regtype[])), 0,
  'the user-callable SECURITY DEFINER functions take no user id argument');
SELECT ok((SELECT pg_get_functiondef('public.set_ai_consent(boolean, integer)'::regprocedure) ~ 'auth\.uid\(\)'),
  'set_ai_consent derives the caller from auth.uid()');
-- Behaviourally: B calling it changes only B.
\set B '''bbbbbbbb-1414-1414-1414-141414141414'''
SELECT tests.create_user(:B);
SELECT tests.as_user(:B);
SELECT public.set_ai_consent(false, NULL);
SELECT tests.reset_role();
SELECT is((SELECT ai_consent FROM public.user_settings WHERE user_id = :A), true,
  'another user''s set_ai_consent never touches A');
SELECT is((SELECT count(*)::int FROM public.consents WHERE user_id = :B), 1, 'B''s change is in B''s ledger only');

-- ── 8. Flags off by default ─────────────────────────────────────────────
SELECT is((SELECT count(*)::int FROM public.feature_flags WHERE default_on OR rollout_pct > 0), 0,
  'every 2.0 flag is off by default');
SELECT tests.as_user(:B);
SELECT is((SELECT count(*)::int FROM public.my_flags() WHERE enabled), 0, 'a user with no overrides gets nothing on');
SELECT tests.reset_role();
INSERT INTO public.user_flag_overrides (user_id, flag_key, enabled) VALUES (:B, 'memory_v2', true);
SELECT tests.as_user(:B);
SELECT is((SELECT array_agg(key) FROM public.my_flags() WHERE enabled), ARRAY['memory_v2'],
  'a developer override turns on just that flag for just that user');
SELECT tests.reset_role();
SELECT tests.as_user(:A);
SELECT is((SELECT count(*)::int FROM public.my_flags() WHERE enabled), 0, '…and nobody else');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
