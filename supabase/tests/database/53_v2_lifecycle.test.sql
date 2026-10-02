-- Checkpoint A: domain rules. Typed detail per kind, subject semantics and
-- uncertainty, superseding, person deletion, reasons (D13, evidence),
-- reason events (opening a channel is not contact), flags, the consent
-- ledger, and the tombstone purge.
BEGIN;
SELECT plan(49);

\set A '''aaaaaaaa-1313-1313-1313-131313131313'''
SELECT tests.create_user(:A);

CREATE FUNCTION pg_temp.at_commit(stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
END $$;

-- ── Typed detail per kind ───────────────────────────────────────────────
SELECT ok(public.memory_detail_ok('event',
  '{"date": "2026-10-11", "date_precision": "day", "event_type": "race", "followup_policy": "after", "goal": "under four hours"}'),
  'event: Ben runs Chicago Sunday, goal under four hours');
SELECT ok(NOT public.memory_detail_ok('event', '{"date_precision": "day", "event_type": "race"}'),
  'event: followup_policy is required');
SELECT ok(NOT public.memory_detail_ok('event',
  '{"date": "2026-02-30", "date_precision": "day", "event_type": "race", "followup_policy": "after"}'),
  'event: an impossible date is rejected');
SELECT ok(NOT public.memory_detail_ok('event',
  '{"date": "2026-10-11", "date_end": "2026-10-10", "date_precision": "day", "event_type": "trip", "followup_policy": "after"}'),
  'event: a range cannot end before it starts');
SELECT ok(NOT public.memory_detail_ok('event',
  '{"date_precision": "day", "event_type": "race", "followup_policy": "after", "notes": "anything"}'),
  'unknown detail keys are rejected');
SELECT ok(NOT public.memory_detail_ok('fact', '{"category": "gossip"}'), 'fact: category must be known');
SELECT ok(public.memory_detail_ok('fact', '{"category": "preference", "attribute": "food", "value": "hates cilantro"}'),
  'fact: Tom hates cilantro');
SELECT ok(public.memory_detail_ok('thread', '{"topic": "leaving Google", "followup_after_days": 42}'),
  'thread: Mike may leave Google');
SELECT ok(NOT public.memory_detail_ok('thread', '{"topic": "x", "followup_after_days": 0}'),
  'thread: follow-up days must be 1–365');
SELECT ok(NOT public.memory_detail_ok('thread', '{"topic": "x", "followup_after_days": 4.5}'),
  'thread: follow-up days must be whole');
SELECT ok(public.memory_detail_ok('plan', '{"firmness": "idea", "season": "winter"}'),
  'plan: skiing sometime this winter');
SELECT ok(public.memory_detail_ok('promise', '{"due_hint": "after the wedding"}'), 'promise: due hint');
SELECT ok(NOT public.memory_detail_ok('promise', '{"outcome": "forgotten"}'), 'promise: outcome kept/released only');
SELECT ok(public.memory_detail_ok('moment', '{"place": "Lisbon", "photo_ids": ["5b8f8395-12cd-4747-a429-c1c9780ab8b0"]}'),
  'moment: place and photos');
SELECT ok(NOT public.memory_detail_ok('moment', '{"photo_ids": ["not-a-uuid"]}'), 'moment: photo ids must be uuids');
SELECT ok(NOT public.memory_detail_ok('tradition', '{"recurrence": "yearly"}'), 'tradition: anchor is required');
SELECT ok(NOT public.memory_detail_ok('context', '{"aspect": "how_met", "extra": 1}'), 'context: no extra keys');
SELECT ok(NOT public.memory_detail_ok('rhythm', '{}'), 'rhythm is not a stored kind');

-- ── Subject semantics and uncertainty ───────────────────────────────────
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000001301', 'Sarah'),
  ('00000000-0000-0000-0000-000000001302', 'Mike');
INSERT INTO public.related_people (id, person_id, relation)
  VALUES ('00000000-0000-0000-0000-000000001303', '00000000-0000-0000-0000-000000001301', 'sister');

SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, subject_type, statement, detail, origin)
  VALUES ('event', '00000000-0000-0000-0000-000000001301', 'related', 'x',
          '{"date_precision": "day", "event_type": "surgery", "followup_policy": "both"}', 'user') $$,
  '23514', NULL, 'a related subject must name the related person');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, subject_type, subject_related_id, statement, detail, origin)
  VALUES ('event', '00000000-0000-0000-0000-000000001302', 'related', '00000000-0000-0000-0000-000000001303', 'x',
          '{"date_precision": "day", "event_type": "surgery", "followup_policy": "both"}', 'user') $$,
  '23503', NULL, 'Sarah''s sister cannot be the subject of an item filed under Mike');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, subject_type, statement, detail, origin)
  VALUES ('promise', '00000000-0000-0000-0000-000000001301', 'person', 'Send Sarah the link', '{}', 'user') $$,
  '23514', NULL, 'a promise is always the user''s own');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, statement, detail, certainty, origin)
  VALUES ('fact', '00000000-0000-0000-0000-000000001302', 'x', '{"category": "work"}', 'certain', 'user') $$,
  '23514', NULL, 'certainty is one of the five known values');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, statement, detail, origin, user_state)
  VALUES ('fact', '00000000-0000-0000-0000-000000001302', 'x', '{"category": "work"}', 'contacts', 'user_authored') $$,
  '23514', NULL, 'only user-origin items can be user_authored');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, statement, detail, origin, status)
  VALUES ('fact', '00000000-0000-0000-0000-000000001302', 'x', '{"category": "work"}', 'user', 'retracted') $$,
  '23514', NULL, 'a retracted item is also removed (tombstoned)');

-- "Mike may leave Google" → a tentative thread; later "Mike left Google".
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.captures (id, source, raw_text) VALUES
    ('00000000-0000-0000-0000-000000001304', 'text', 'Mike works at Google.'),
    ('00000000-0000-0000-0000-000000001305', 'text', 'Mike left Google.');
  INSERT INTO public.memory_items (id, kind, person_id, statement, detail, certainty, origin, user_state) VALUES
    ('00000000-0000-0000-0000-000000001306', 'fact', '00000000-0000-0000-0000-000000001302', 'Mike works at Google',
     '{"category": "work", "attribute": "employer", "value": "Google"}', 'stated', 'user', 'user_authored');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end) VALUES
    ('00000000-0000-0000-0000-000000001306', '00000000-0000-0000-0000-000000001304', 'capture', 0, 20);
  INSERT INTO public.memory_items (id, kind, person_id, statement, detail, certainty, origin, user_state, supersedes_id) VALUES
    ('00000000-0000-0000-0000-000000001307', 'fact', '00000000-0000-0000-0000-000000001302', 'Mike left Google',
     '{"category": "work", "attribute": "employer", "value": "left Google"}', 'stated', 'user', 'user_authored',
     '00000000-0000-0000-0000-000000001306');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end) VALUES
    ('00000000-0000-0000-0000-000000001307', '00000000-0000-0000-0000-000000001305', 'capture', 0, 16);
  $s$) $$, 'a newer statement supersedes an older one');
SELECT ok((SELECT status = 'superseded' AND valid_to IS NOT NULL AND deleted_at IS NULL
           FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001306'),
  'the older fact is superseded, dated, and kept as history');
SELECT throws_ok($$ UPDATE public.memory_items SET supersedes_id = '00000000-0000-0000-0000-000000001307'
  WHERE id = '00000000-0000-0000-0000-000000001306' $$,
  '23514', NULL, 'superseding cannot form a loop (the old fact cannot supersede its replacement)');
SELECT tests.reset_role();

-- ── Reasons: D13 and evidence ───────────────────────────────────────────
-- Server-written. One for Sarah's sister's surgery.
SELECT tests.as_user(:A);
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.captures (id, source, raw_text) VALUES
    ('00000000-0000-0000-0000-000000001308', 'text', 'Sarah''s sister has surgery Thursday.');
  INSERT INTO public.memory_items (id, kind, person_id, subject_type, subject_related_id, statement, detail,
                                   sensitivity, origin, user_state) VALUES
    ('00000000-0000-0000-0000-000000001309', 'event', '00000000-0000-0000-0000-000000001301', 'related',
     '00000000-0000-0000-0000-000000001303', 'Sarah''s sister has surgery Thursday',
     '{"date": "2026-10-08", "date_precision": "day", "event_type": "surgery", "followup_policy": "both"}',
     'health', 'user', 'user_authored');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end) VALUES
    ('00000000-0000-0000-0000-000000001309', '00000000-0000-0000-0000-000000001308', 'capture', 0, 35);
  $s$) $$, 'Sarah''s sister''s surgery is remembered under Sarah, about her sister');
SELECT tests.reset_role();

SELECT throws_ok(format($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES (%L, '00000000-0000-0000-0000-000000001301', 'hard_time', now(), now() + interval '2 days', 'no-evidence') $s$) $$, :A),
  '23514', NULL, 'a reason without evidence is rejected at commit (except birthdays)');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES (%L, '00000000-0000-0000-0000-000000001301', 'birthday', now(), now() + interval '1 day', 'bday') $s$) $$, :A),
  'a birthday reason needs no memory evidence');
SELECT lives_ok(format($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES ('00000000-0000-0000-0000-000000001310', %1$L, '00000000-0000-0000-0000-000000001301', 'hard_time',
          now(), now() + interval '2 days', 'surgery');
  INSERT INTO public.reason_evidence (reason_id, memory_item_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000001310', '00000000-0000-0000-0000-000000001309', %1$L) $s$) $$, :A),
  'a reason with evidence is accepted');

-- Reason events: opening the channel is "acted", not done.
SELECT tests.as_user(:A);
INSERT INTO public.reason_events (reason_id, event, surface) VALUES ('00000000-0000-0000-0000-000000001310', 'shown', 'today');
INSERT INTO public.reason_events (reason_id, event, channel) VALUES ('00000000-0000-0000-0000-000000001310', 'acted', 'text');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000001310'), 'acted',
  'opening a channel marks the reason acted, not done');
SELECT throws_ok($$ INSERT INTO public.connections (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-000000001301', 'text', 'return_check') $$,
  '23514', NULL, 'a return-check contact must name its reason');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000001310', 'return_yes');
INSERT INTO public.connections (person_id, channel, source, reason_id)
  VALUES ('00000000-0000-0000-0000-000000001301', 'text', 'return_check', '00000000-0000-0000-0000-000000001310');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000001310'), 'done',
  'only the return check''s yes makes it done');
INSERT INTO public.reason_events (reason_id, event) VALUES ('00000000-0000-0000-0000-000000001310', 'shown');
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000001310'), 'done',
  'a done reason does not reopen');
SELECT tests.reset_role();

-- Evidence retracted → open reasons suppressed.
INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES ('00000000-0000-0000-0000-000000001311', :A, '00000000-0000-0000-0000-000000001302', 'thread',
          now(), now() + interval '3 days', 'mike-google');
INSERT INTO public.reason_evidence (reason_id, memory_item_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000001311', '00000000-0000-0000-0000-000000001307', :A);
SELECT tests.as_user(:A);
UPDATE public.memory_items SET status = 'retracted', deleted_at = now()
  WHERE id = '00000000-0000-0000-0000-000000001307';
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000001311'), 'suppressed',
  '"Not this" on the evidence suppresses the reason');

-- D13: pausing a person silences them; no new reasons while paused.
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001312', 'Dad');
SELECT tests.reset_role();
INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES ('00000000-0000-0000-0000-000000001313', :A, '00000000-0000-0000-0000-000000001312', 'birthday',
          now(), now() + interval '1 day', 'dad-bday');
SELECT tests.as_user(:A);
UPDATE public.people SET state = 'remembered' WHERE id = '00000000-0000-0000-0000-000000001312';
SELECT tests.reset_role();
SELECT is((SELECT state FROM public.reasons WHERE id = '00000000-0000-0000-0000-000000001313'), 'suppressed',
  'marking a person remembered suppresses their open reasons (even birthdays)');
SELECT throws_ok(format($$ INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES (%L, '00000000-0000-0000-0000-000000001312', 'birthday', now(), now(), 'dad-bday-2') $$, :A),
  '23514', NULL, 'no reasons can be created for a remembered person');

-- ── Deleting a person ───────────────────────────────────────────────────
-- A mixed capture mentions Sarah and Mike; a capture only about Sarah.
SELECT tests.as_user(:A);
SELECT lives_ok($$ SELECT pg_temp.at_commit($s$
  INSERT INTO public.captures (id, source, raw_text) VALUES
    ('00000000-0000-0000-0000-000000001314', 'text', 'Sarah and Mike both love jazz.');
  INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state) VALUES
    ('00000000-0000-0000-0000-000000001315', 'fact', '00000000-0000-0000-0000-000000001301', 'Sarah loves jazz',
     '{"category": "interest"}', 'user', 'user_authored'),
    ('00000000-0000-0000-0000-000000001316', 'fact', '00000000-0000-0000-0000-000000001302', 'Mike loves jazz',
     '{"category": "interest"}', 'user', 'user_authored');
  INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end) VALUES
    ('00000000-0000-0000-0000-000000001315', '00000000-0000-0000-0000-000000001314', 'capture', 0, 29),
    ('00000000-0000-0000-0000-000000001316', '00000000-0000-0000-0000-000000001314', 'capture', 0, 29);
  UPDATE public.people SET deleted_at = now() WHERE id = '00000000-0000-0000-0000-000000001301';
  $s$) $$, 'deleting Sarah passes the commit checks');
SELECT ok((SELECT bool_and(deleted_at IS NOT NULL) FROM public.memory_items
           WHERE person_id = '00000000-0000-0000-0000-000000001301'), 'all of Sarah''s memories are deleted');
SELECT ok((SELECT deleted_at IS NOT NULL FROM public.related_people WHERE id = '00000000-0000-0000-0000-000000001303'),
  'Sarah''s related people are deleted');
SELECT ok((SELECT deleted_at IS NOT NULL FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001308'),
  'a capture only about Sarah is deleted');
SELECT ok((SELECT deleted_at IS NULL FROM public.captures WHERE id = '00000000-0000-0000-0000-000000001314')
      AND (SELECT deleted_at IS NULL FROM public.memory_items WHERE id = '00000000-0000-0000-0000-000000001316'),
  'a mixed capture and Mike''s memory from it remain');
SELECT ok((SELECT bool_and(deleted_at IS NOT NULL) FROM public.connections
           WHERE person_id = '00000000-0000-0000-0000-000000001301'), 'contacts logged with Sarah are deleted');
SELECT tests.reset_role();

-- ── Flags, consent ledger, purge ────────────────────────────────────────
INSERT INTO public.user_flag_overrides (user_id, flag_key, enabled) VALUES (:A, 'tell', true);
SELECT tests.as_user(:A);
SELECT is((SELECT array_agg(key ORDER BY key) FROM public.my_flags() WHERE enabled), ARRAY['tell'],
  'effective flags: everything off except the user''s override');
SELECT public.set_ai_consent(true, 1);
SELECT public.set_ai_consent(false, NULL);
SELECT is((SELECT array_agg(granted ORDER BY created_at, granted DESC) FROM public.consents WHERE scope = 'ai_processing'),
  ARRAY[true, false], 'every consent change is in the ledger');
SELECT throws_ok($$ SELECT public.purge_tombstones() $$, '42501', NULL, 'users cannot run the purge');
SELECT tests.reset_role();

UPDATE public.people SET deleted_at = now() - interval '31 days' WHERE id = '00000000-0000-0000-0000-000000001301';
SELECT tests.as_service();
SELECT ok((public.purge_tombstones() ->> 'people')::int >= 1, 'the purge removes tombstones older than 30 days');
SELECT tests.reset_role();
SELECT is((SELECT count(*)::int FROM public.people WHERE id = '00000000-0000-0000-0000-000000001301'), 0,
  'Sarah is gone for good after 30 days');

SELECT * FROM finish();
ROLLBACK;
