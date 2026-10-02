-- Checkpoint A: 2.0 tables exist with RLS, privileges are owner-only with no
-- hard deletes, and every synced row follows the shared row rules
-- (server timestamps, immutable owner, optimistic versioning, fixed sprig seed).
BEGIN;
SELECT plan(29);

\set A '''aaaaaaaa-7777-7777-7777-777777777777'''
SELECT tests.create_user(:A);

-- ── Structure ───────────────────────────────────────────────────────────
SELECT has_table('public', t, t || ' exists')
FROM unnest(ARRAY['people', 'related_people', 'person_identities', 'captures', 'memory_items',
                  'memory_item_sources', 'memory_item_history', 'reasons', 'reason_evidence',
                  'reason_events', 'connections', 'consents', 'devices', 'notification_log',
                  'feature_flags', 'user_flag_overrides']) t;

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity),
  0, 'every public table has RLS enabled');

SELECT is(
  (SELECT array_agg(t ORDER BY t) FROM unnest(ARRAY['people', 'related_people', 'person_identities',
     'captures', 'memory_items', 'memory_item_sources', 'memory_item_history', 'reasons',
     'reason_evidence', 'reason_events', 'connections', 'consents', 'devices', 'notification_log',
     'feature_flags', 'user_flag_overrides']) t
   WHERE has_table_privilege('authenticated', 'public.' || t, 'DELETE')),
  NULL, 'signed-in users can hard-delete no 2.0 table (deletion is a tombstone)');

SELECT is(
  (SELECT array_agg(t ORDER BY t) FROM unnest(ARRAY['people', 'related_people', 'person_identities',
     'captures', 'memory_items', 'memory_item_sources', 'memory_item_history', 'reasons',
     'reason_evidence', 'reason_events', 'connections', 'consents', 'devices', 'notification_log',
     'feature_flags', 'user_flag_overrides']) t
   WHERE has_table_privilege('anon', 'public.' || t, 'SELECT')
      OR has_table_privilege('anon', 'public.' || t, 'INSERT')),
  NULL, 'anon has no access to any 2.0 table');

-- No single-valued group column on people (plan §34).
SELECT hasnt_column('public', 'people', 'circle', 'people has no circle/group column');

-- ── Row rules ───────────────────────────────────────────────────────────
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name, created_at, updated_at, version, sprig_seed)
  VALUES ('00000000-0000-0000-0000-0000000007a1', 'Ben', '2000-01-01', '2000-01-01', 42, 7);

SELECT is((SELECT user_id FROM public.people), :A::uuid, 'user_id defaults to the caller');
SELECT is((SELECT version FROM public.people), 1, 'a new row starts at version 1 whatever the client sent');
SELECT ok((SELECT created_at > '2001-01-01' AND updated_at = created_at FROM public.people),
  'created_at/updated_at come from the server clock');
SELECT is((SELECT sprig_seed FROM public.people),
  ('x' || substr(md5('00000000-0000-0000-0000-0000000007a1'), 1, 15))::bit(60)::bigint,
  'sprig_seed is derived from the id, not the client');

-- A write based on the current version succeeds and bumps it.
UPDATE public.people SET display_name = 'Benjamin', version = 1;
SELECT is((SELECT version FROM public.people), 2, 'a write based on the current version bumps it');
-- A write that leaves version out also succeeds (last write wins).
UPDATE public.people SET relationship_label = 'running buddy';
SELECT is((SELECT version FROM public.people), 3, 'a write without a version still bumps it');
-- A stale write is rejected.
SELECT throws_ok($$ UPDATE public.people SET display_name = 'stale', version = 2 $$,
  '40001', NULL, 'a write based on a stale version is rejected (40001)');
SELECT throws_ok(format($$ UPDATE public.people SET user_id = %L $$, gen_random_uuid()),
  '42501', NULL, 'user_id can never change');
UPDATE public.people SET sprig_seed = 1, created_at = '2000-01-01';
SELECT ok((SELECT sprig_seed <> 1 AND created_at > '2001-01-01' FROM public.people),
  'sprig_seed and created_at are immutable');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
