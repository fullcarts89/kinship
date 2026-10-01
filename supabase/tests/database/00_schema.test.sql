-- P0-11: the migrations build the production schema, and every public table
-- has row-level security on.
BEGIN;
SELECT plan(9);

SELECT has_table('public', t, t || ' exists')
FROM unnest(ARRAY['persons','memories','interactions','promises','seasons','season_commitments']) t;

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity),
  0, 'every public table has RLS enabled');

SELECT has_function('public', 'rls_auto_enable', 'rls_auto_enable() exists');

-- A table created later gets RLS automatically (the ensure_rls event trigger).
CREATE TABLE public._p0_11_probe (id int);
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public._p0_11_probe'::regclass),
  'new public tables get RLS enabled automatically');

SELECT * FROM finish();
ROLLBACK;
