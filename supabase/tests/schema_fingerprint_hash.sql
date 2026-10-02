-- md5 of schema_fingerprint.sql's output (same as `md5sum` of the local
-- fingerprint). Run against production to compare without copying output.
SELECT count(*) AS lines, md5(string_agg(line, E'\n' ORDER BY line COLLATE "C") || E'\n') AS hash FROM (
  SELECT 'column ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || CASE WHEN a.attnotnull THEN ' not null' ELSE '' END
         || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '') AS line
  FROM pg_class c
  JOIN pg_namespace s ON s.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE s.nspname = 'public' AND c.relkind = 'r'
  UNION ALL
  SELECT 'rls ' || c.relname || ' ' || c.relrowsecurity
  FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
  WHERE s.nspname = 'public' AND c.relkind = 'r'
  UNION ALL
  SELECT 'constraint ' || conrelid::regclass::text || ' ' || conname || ' ' || pg_get_constraintdef(oid)
  FROM pg_constraint WHERE connamespace = 'public'::regnamespace
  UNION ALL
  SELECT 'index ' || indexdef FROM pg_indexes WHERE schemaname = 'public'
  UNION ALL
  SELECT 'policy ' || tablename || ' "' || policyname || '" ' || cmd || ' to ' || array_to_string(roles, ',')
         || ' using ' || coalesce(qual, '-') || ' check ' || coalesce(with_check, '-')
  FROM pg_policies WHERE schemaname = 'public'
  UNION ALL
  SELECT 'function ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
         || CASE WHEN p.prosecdef THEN ' definer' ELSE ' invoker' END
         || ' md5=' || md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g'))
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
    AND NOT EXISTS (SELECT 1 FROM pg_depend dep WHERE dep.objid = p.oid AND dep.deptype = 'e')
  UNION ALL
  SELECT 'grant execute ' || p.proname || ' ' || r.rolname || ' ' || has_function_privilege(r.oid, p.oid, 'EXECUTE')
  FROM pg_proc p CROSS JOIN pg_roles r
  WHERE p.pronamespace = 'public'::regnamespace AND NOT EXISTS (SELECT 1 FROM pg_depend dep WHERE dep.objid = p.oid AND dep.deptype = 'e')
    AND r.rolname IN ('anon', 'authenticated', 'service_role')
  UNION ALL
  SELECT 'event_trigger ' || evtname || ' ' || evtevent || ' ' || evtfoid::regproc::text
         || ' tags=' || coalesce(array_to_string(evttags, ','), '')
  FROM pg_event_trigger WHERE evtfoid::regproc::text LIKE 'rls_auto_enable'
     OR evtfoid::regproc::text LIKE 'public.%'
) x;
