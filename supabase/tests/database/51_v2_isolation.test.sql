-- Checkpoint A: adversarial cross-user isolation for every 2.0 table.
-- User A owns data; user B and anonymous visitors try to read it, change it,
-- forge rows for A, and attach their own rows to A's people and captures.
BEGIN;
SELECT plan(27);

\set A '''aaaaaaaa-8888-8888-8888-888888888888'''
\set B '''bbbbbbbb-9999-9999-9999-999999999999'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

-- A's data, created as A through the policies.
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-0000000008a1', 'Sarah');
INSERT INTO public.related_people (id, person_id, relation)
  VALUES ('00000000-0000-0000-0000-0000000008a2', '00000000-0000-0000-0000-0000000008a1', 'sister');
INSERT INTO public.person_identities (person_id, kind, value_hash)
  VALUES ('00000000-0000-0000-0000-0000000008a1', 'phone', repeat('b', 64));
INSERT INTO public.captures (id, source, raw_text)
  VALUES ('00000000-0000-0000-0000-0000000008a3', 'text', 'Sarah''s sister has surgery Thursday.');
INSERT INTO public.memory_items (id, kind, person_id, subject_type, subject_related_id, statement,
                                 detail, sensitivity, origin, user_state)
  VALUES ('00000000-0000-0000-0000-0000000008a4', 'event', '00000000-0000-0000-0000-0000000008a1',
          'related', '00000000-0000-0000-0000-0000000008a2', 'Sarah''s sister has surgery Thursday',
          '{"date_precision": "day", "event_type": "surgery", "followup_policy": "both"}',
          'health', 'user', 'user_authored');
INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-0000000008a4', '00000000-0000-0000-0000-0000000008a3', 'capture', 0, 35);
INSERT INTO public.contact_events (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-0000000008a1', 'call', 'manual');
INSERT INTO public.devices (platform, push_token) VALUES ('ios', 'token-a');
SELECT tests.reset_role();
-- Server-written rows for A.
INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES ('00000000-0000-0000-0000-0000000008a5', :A, '00000000-0000-0000-0000-0000000008a1',
          'upcoming_event', now(), now() + interval '1 day', 'x');
INSERT INTO public.reason_evidence (reason_id, memory_item_id, user_id)
  VALUES ('00000000-0000-0000-0000-0000000008a5', '00000000-0000-0000-0000-0000000008a4', :A);
INSERT INTO public.consents (user_id, scope, granted, version) VALUES (:A, 'ai_processing', true, 1);
INSERT INTO public.notification_log (user_id, tier, status) VALUES (:A, 'quiet', 'sent');
INSERT INTO public.user_flag_overrides (user_id, flag_key, enabled) VALUES (:A, 'shell_v2', true);
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

-- ── B sees none of it ───────────────────────────────────────────────────
SELECT tests.as_user(:B);
SELECT is(
  (SELECT count(*)::int FROM public.people) + (SELECT count(*)::int FROM public.related_people)
  + (SELECT count(*)::int FROM public.person_identities) + (SELECT count(*)::int FROM public.captures)
  + (SELECT count(*)::int FROM public.memory_items) + (SELECT count(*)::int FROM public.memory_item_sources)
  + (SELECT count(*)::int FROM public.memory_item_history) + (SELECT count(*)::int FROM public.reasons)
  + (SELECT count(*)::int FROM public.reason_evidence) + (SELECT count(*)::int FROM public.reason_events)
  + (SELECT count(*)::int FROM public.contact_events) + (SELECT count(*)::int FROM public.consents)
  + (SELECT count(*)::int FROM public.devices) + (SELECT count(*)::int FROM public.notification_log)
  + (SELECT count(*)::int FROM public.user_flag_overrides),
  0, 'B sees no 2.0 row of A in any table');
SELECT is((SELECT count(*)::int FROM public.feature_flags), 19, 'flags (no user data) are readable');

-- ── B can't change A's rows (0 rows affected) ──────────────────────────
UPDATE public.people SET display_name = 'pwned';
UPDATE public.captures SET retention = 'delete_after_extraction';
UPDATE public.memory_items SET statement = 'pwned';
UPDATE public.memory_item_sources SET deleted_at = now();
UPDATE public.contact_events SET channel = 'other';
UPDATE public.devices SET push_token = 'stolen';
SELECT tests.reset_role();
SELECT is((SELECT display_name FROM public.people WHERE user_id = :A), 'Sarah', 'person unchanged');
SELECT is((SELECT retention FROM public.captures WHERE user_id = :A), 'keep', 'capture unchanged');
SELECT is((SELECT statement FROM public.memory_items WHERE user_id = :A),
  'Sarah''s sister has surgery Thursday', 'memory item unchanged');
SELECT is((SELECT count(*)::int FROM public.memory_item_sources WHERE user_id = :A AND deleted_at IS NULL),
  1, 'source unchanged');
SELECT is((SELECT channel FROM public.contact_events WHERE user_id = :A), 'call', 'connection unchanged');
SELECT is((SELECT push_token FROM public.devices WHERE user_id = :A), 'token-a', 'device unchanged');

-- ── B can't forge rows owned by A ───────────────────────────────────────
SELECT tests.as_user(:B);
SELECT throws_ok(format($$ INSERT INTO public.people (user_id, display_name) VALUES (%L, 'x') $$, :A),
  '42501', NULL, 'B cannot create a person owned by A');
SELECT throws_ok(format($$ INSERT INTO public.captures (user_id, source, raw_text) VALUES (%L, 'text', 'x') $$, :A),
  '42501', NULL, 'B cannot create a capture owned by A');
SELECT throws_ok(format($$ INSERT INTO public.reason_events (user_id, reason_id, event)
  VALUES (%L, '00000000-0000-0000-0000-0000000008a5', 'done') $$, :A),
  '42501', NULL, 'B cannot record events on A''s reasons as A');

-- ── B can't attach own rows to A's people, captures, items or reasons ──
SELECT throws_ok($$ INSERT INTO public.related_people (person_id, relation)
  VALUES ('00000000-0000-0000-0000-0000000008a1', 'brother') $$,
  '23503', NULL, 'B cannot add a related person under A''s person');
SELECT throws_ok($$ INSERT INTO public.person_identities (person_id, kind, value_hash)
  VALUES ('00000000-0000-0000-0000-0000000008a1', 'email', repeat('c', 64)) $$,
  '23503', NULL, 'B cannot add an identity to A''s person');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, statement, detail, origin)
  VALUES ('fact', '00000000-0000-0000-0000-0000000008a1', 'x', '{"category": "other"}', 'user') $$,
  '23503', NULL, 'B cannot file a memory under A''s person');
SELECT throws_ok($$ INSERT INTO public.captures (source, raw_text, context_person_id)
  VALUES ('text', 'x', '00000000-0000-0000-0000-0000000008a1') $$,
  '23503', NULL, 'B cannot point a capture at A''s person');
SELECT throws_ok($$ INSERT INTO public.contact_events (person_id, channel, source)
  VALUES ('00000000-0000-0000-0000-0000000008a1', 'call', 'manual') $$,
  '23503', NULL, 'B cannot log contact with A''s person');
SELECT throws_ok($$ INSERT INTO public.reason_events (reason_id, event)
  VALUES ('00000000-0000-0000-0000-0000000008a5', 'done') $$,
  '23503', NULL, 'B cannot act on A''s reason');

INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-0000000009b1', 'Mine');
INSERT INTO public.memory_items (id, kind, person_id, statement, detail, origin, user_state)
  VALUES ('00000000-0000-0000-0000-0000000009b2', 'fact', '00000000-0000-0000-0000-0000000009b1',
          'x', '{"category": "other"}', 'user', 'user_authored');
SELECT throws_ok($$ INSERT INTO public.memory_item_sources (memory_item_id, capture_id, source_kind, span_start, span_end)
  VALUES ('00000000-0000-0000-0000-0000000009b2', '00000000-0000-0000-0000-0000000008a3', 'capture', 0, 5) $$,
  '23503', NULL, 'B cannot cite A''s capture as a source');
SELECT throws_ok($$ INSERT INTO public.memory_items (kind, person_id, subject_type, subject_related_id, statement, detail, origin)
  VALUES ('fact', '00000000-0000-0000-0000-0000000009b1', 'related', '00000000-0000-0000-0000-0000000008a2',
          'x', '{"category": "other"}', 'user') $$,
  '23503', NULL, 'B cannot use A''s related person as a subject');
SELECT throws_ok($$ UPDATE public.memory_items SET supersedes_id = '00000000-0000-0000-0000-0000000008a4', version = version + 1
  WHERE id = '00000000-0000-0000-0000-0000000009b2' $$,
  '23503', NULL, 'B cannot supersede A''s memory');
-- Re-parenting B's own memory under A's person fails the same way.
SELECT throws_ok($$ UPDATE public.memory_items SET person_id = '00000000-0000-0000-0000-0000000008a1', version = version + 1
  WHERE id = '00000000-0000-0000-0000-0000000009b2' $$,
  '23503', NULL, 'B cannot move a memory under A''s person');
-- A push token already live for A can't be registered by B.
SELECT throws_ok($$ INSERT INTO public.devices (platform, push_token) VALUES ('ios', 'token-a') $$,
  '23505', NULL, 'a live push token belongs to one account at a time');
SELECT tests.reset_role();

-- ── Server-written tables stay server-written ──────────────────────────
SELECT tests.as_user(:A);
SELECT throws_ok($$ INSERT INTO public.reasons (user_id, person_id, type, window_start, window_end, dedupe_key)
  VALUES ('aaaaaaaa-8888-8888-8888-888888888888', '00000000-0000-0000-0000-0000000008a1', 'promise', now(), now(), 'y') $$,
  '42501', NULL, 'users cannot create reasons (server-derived)');
SELECT throws_ok($$ UPDATE public.reasons SET state = 'done' $$,
  '42501', NULL, 'users cannot change reasons directly');
SELECT throws_ok($$ INSERT INTO public.consents (user_id, scope, granted, version)
  VALUES ('aaaaaaaa-8888-8888-8888-888888888888', 'analytics', true, 1) $$,
  '42501', NULL, 'users cannot write the consent ledger directly');
SELECT tests.reset_role();

-- ── Anonymous visitors get nothing ──────────────────────────────────────
SELECT tests.as_anon();
SELECT throws_ok($$ SELECT * FROM public.memory_items $$, '42501', NULL, 'anon cannot read memory');
SELECT throws_ok($$ SELECT public.my_flags() $$, '42501', NULL, 'anon cannot read flags');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
