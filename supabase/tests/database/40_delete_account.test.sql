-- P0-05: account deletion removes every row in every table plus the auth
-- user, touches nobody else, can't be called by users, and is idempotent.
BEGIN;
SELECT plan(21);

\set A '''aaaaaaaa-5555-5555-5555-555555555555'''
\set B '''bbbbbbbb-6666-6666-6666-666666666666'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);
INSERT INTO auth.identities (user_id) VALUES (:A);
INSERT INTO auth.sessions (user_id) VALUES (:A);

-- Give both users data in every table, 1.0 and 2.0.
CREATE FUNCTION pg_temp.seed_v2(u uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE p uuid := gen_random_uuid(); c uuid := gen_random_uuid(); i uuid := gen_random_uuid();
        r uuid := gen_random_uuid(); d uuid := gen_random_uuid(); rp uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.people (id, user_id, display_name) VALUES (p, u, 'Ben');
  INSERT INTO public.related_people (id, user_id, person_id, relation) VALUES (rp, u, p, 'sister');
  INSERT INTO public.person_identities (user_id, person_id, kind, value_hash)
    VALUES (u, p, 'phone', repeat('a', 64));
  INSERT INTO public.captures (id, user_id, source, raw_text)
    VALUES (c, u, 'text', 'Ben runs Chicago Sunday.');
  INSERT INTO public.memory_items (id, user_id, kind, person_id, statement, detail, origin)
    VALUES (i, u, 'event', p, 'Ben runs Chicago Sunday',
            '{"date_precision": "day", "event_type": "race", "followup_policy": "after"}', 'extracted');
  INSERT INTO public.memory_item_sources (user_id, memory_item_id, capture_id, source_kind, span_start, span_end)
    VALUES (u, i, c, 'capture', 0, 23);
  UPDATE public.memory_items SET statement = 'Ben runs the Chicago Marathon Sunday' WHERE id = i;
  INSERT INTO public.capture_reviews (capture_id, user_id, extraction_version, items)
    VALUES (c, u, 'relationship_extract/v1+claude-opus-5-5',
            '[{"kind": "event", "person_id": null, "statement": "Ben runs Chicago Sunday", "spans": [{"start": 0, "end": 23}]}]');
  INSERT INTO public.reasons (id, user_id, person_id, type, window_start, window_end, dedupe_key)
    VALUES (r, u, p, 'event_followup', now(), now() + interval '1 day', 'followup:' || i);
  INSERT INTO public.reason_evidence (reason_id, memory_item_id, user_id) VALUES (r, i, u);
  INSERT INTO public.reason_events (user_id, reason_id, event) VALUES (u, r, 'shown');
  INSERT INTO public.contact_events (user_id, person_id, channel, source, reason_id)
    VALUES (u, p, 'text', 'return_check', r);
  INSERT INTO public.consents (user_id, scope, granted, version) VALUES (u, 'ai_processing', true, 1);
  INSERT INTO public.devices (id, user_id, platform, push_token) VALUES (d, u, 'ios', 'tok-' || u);
  INSERT INTO public.notification_log (user_id, device_id, reason_id, tier, status)
    VALUES (u, d, r, 'quiet', 'sent');
  INSERT INTO public.user_flag_overrides (user_id, flag_key, enabled) VALUES (u, 'shell_v2', true);
END $$;
CREATE FUNCTION pg_temp.seed(u uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE p uuid := gen_random_uuid(); s uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.persons (id, user_id, name, relationship_type) VALUES (p, u, 'Maya', 'friend');
  INSERT INTO public.memories (user_id, person_id, content) VALUES (u, p, 'Lisbon');
  INSERT INTO public.interactions (user_id, person_id, type) VALUES (u, p, 'call');
  INSERT INTO public.promises (user_id, person_id, text) VALUES (u, p, 'Send the link');
  INSERT INTO public.seasons (id, user_id, name, starts_at, ends_at) VALUES (s, u, 'Autumn', now(), now());
  INSERT INTO public.season_commitments (season_id, user_id, person_id, rhythm) VALUES (s, u, p, 'often');
  INSERT INTO public.ai_usage (user_id, day, calls) VALUES (u, current_date, 3);
  INSERT INTO public.user_settings (user_id, ai_consent, ai_consent_version) VALUES (u, true, 1);
  PERFORM pg_temp.seed_v2(u);
END $$;
SELECT pg_temp.seed(:A);
SELECT pg_temp.seed(:B);

-- Every public table with user_id is covered by the seed (guards the test).
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns c
   JOIN information_schema.tables t USING (table_schema, table_name)
   WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND t.table_type = 'BASE TABLE'),
  24, 'all 24 user-owned tables are seeded by this test');

-- Users and anon can't call it.
SELECT tests.as_user(:A);
SELECT throws_ok(format('SELECT public.delete_user_account(%L)', :B), '42501', NULL,
  'a user cannot delete accounts (not even their own) through the API');
SELECT tests.reset_role();
SELECT tests.as_anon();
SELECT throws_ok(format('SELECT public.delete_user_account(%L)', :A), '42501', NULL,
  'anon cannot delete accounts');
SELECT tests.reset_role();

-- The service role deletes A.
SELECT tests.as_service();
SELECT is(
  (public.delete_user_account(:A) -> 'tables')::jsonb,
  '{"ai_usage": 1, "interactions": 1, "memories": 1, "persons": 1, "promises": 1, "season_commitments": 1,
    "seasons": 1, "user_settings": 1, "captures": 1, "contact_events": 1, "consents": 1, "devices": 1,
    "memory_item_history": 1, "memory_item_sources": 1, "memory_items": 1, "notification_log": 1,
    "people": 1, "person_identities": 1, "reason_events": 1, "reason_evidence": 1, "reasons": 1,
    "related_people": 1, "user_flag_overrides": 1, "capture_reviews": 1}'::jsonb,
  'returns what it removed from every table');
SELECT tests.reset_role();

SELECT is((SELECT count(*)::int FROM public.persons WHERE user_id = :A), 0, 'persons gone');
SELECT is((SELECT count(*)::int FROM public.memories WHERE user_id = :A), 0, 'memories gone');
SELECT is((SELECT count(*)::int FROM public.interactions WHERE user_id = :A), 0, 'interactions gone');
SELECT is((SELECT count(*)::int FROM public.promises WHERE user_id = :A), 0, 'promises gone');
SELECT is((SELECT count(*)::int FROM public.seasons WHERE user_id = :A), 0, 'seasons gone');
SELECT is((SELECT count(*)::int FROM public.season_commitments WHERE user_id = :A), 0, 'commitments gone');
SELECT is((SELECT count(*)::int FROM public.ai_usage WHERE user_id = :A), 0, 'ai usage gone');
SELECT is((SELECT count(*)::int FROM public.user_settings WHERE user_id = :A), 0, 'settings gone');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = :A), 0, 'auth user gone');
-- Commit-time checks (provenance, reason evidence) also pass after deletion.
SELECT lives_ok($$ SET CONSTRAINTS ALL IMMEDIATE $$, 'deferred integrity checks pass after deletion');
SET CONSTRAINTS ALL DEFERRED;
SELECT is((SELECT count(*)::int FROM public.people WHERE user_id = :A)
        + (SELECT count(*)::int FROM public.memory_items WHERE user_id = :A)
        + (SELECT count(*)::int FROM public.captures WHERE user_id = :A), 0, '2.0 rows gone');
SELECT is((SELECT count(*)::int FROM auth.identities WHERE user_id = :A), 0, 'auth identities gone');
SELECT is((SELECT count(*)::int FROM auth.sessions WHERE user_id = :A), 0, 'auth sessions gone');

-- B is untouched.
SELECT is((SELECT count(*)::int FROM public.persons WHERE user_id = :B), 1, 'other user''s data untouched');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = :B), 1, 'other user''s account untouched');

-- Idempotent: deleting again finds nothing and doesn't fail.
SELECT tests.as_service();
SELECT is((public.delete_user_account(:A) ->> 'auth_user')::boolean, false, 'second deletion is a no-op');
SELECT tests.reset_role();

-- Structural: every user_id column references auth.users ON DELETE CASCADE.
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns c
   JOIN information_schema.tables t USING (table_schema, table_name)
   WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND t.table_type = 'BASE TABLE'
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint k
       WHERE k.conrelid = format('public.%I', c.table_name)::regclass
         AND k.contype = 'f' AND k.confrelid = 'auth.users'::regclass AND k.confdeltype = 'c')),
  0, 'every user_id column cascades from auth.users');

SELECT * FROM finish();
ROLLBACK;
