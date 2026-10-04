-- Checkpoint C.1: timing that matters is kept on facts, milestones, moments
-- and threads, not only on events, and only in the shapes the resolver
-- produces (a date, a range with its precision, the user's own words).
BEGIN;
SELECT plan(14);

\set A '''aaaaaaaa-1818-1818-1818-181818181818'''
SELECT tests.create_user(:A);

-- ── What each kind may hold ──
SELECT ok(public.memory_detail_ok('fact', '{"category": "work", "attribute": "employer", "value": "Google",
  "date": "2018-01-01", "date_end": "2018-12-31", "date_precision": "year", "date_hint": "since 2018"}'),
  'a fact keeps when it became true: "since 2018" as a year');
SELECT ok(public.memory_detail_ok('fact', '{"category": "home", "date_hint": "for three years"}'),
  'a fact keeps a duration in the user''s words, with no computed date');
SELECT ok(public.memory_detail_ok('fact', '{"category": "home"}'), 'a fact without time is still valid');
SELECT ok(public.memory_detail_ok('milestone', '{"milestone_type": "graduated", "anniversary": false,
  "date": "2024-01-01", "date_end": "2024-12-31", "date_precision": "year", "date_hint": "in 2024"}'),
  'a milestone keeps a year, not only a day');
SELECT ok(public.memory_detail_ok('milestone', '{"milestone_type": "first ultra", "anniversary": false, "date": "2026-10-10"}'),
  'a milestone written before C.1 (a day, no precision) is still valid');
SELECT ok(public.memory_detail_ok('moment', '{"date": "2026-10-03", "date_end": "2026-10-04", "date_precision": "day", "date_hint": "last weekend"}'),
  'a moment keeps a weekend as a range');
SELECT ok(public.memory_detail_ok('thread', '{"topic": "his trip", "followup_after_days": 42, "date_hint": "next Friday"}'),
  'a thread keeps the user''s date words for confirmation (C-4)');

-- ── What none of them may hold ──
SELECT ok(NOT public.memory_detail_ok('fact', '{"category": "home", "date_end": "2026-09-30"}'), 'a range needs its start');
SELECT ok(NOT public.memory_detail_ok('fact', '{"category": "home", "date": "2026-09-30", "date_end": "2026-09-01"}'), 'a range cannot run backwards');
SELECT ok(NOT public.memory_detail_ok('fact', '{"category": "home", "date": "last month"}'), 'a date is a calendar date, never words');
SELECT ok(NOT public.memory_detail_ok('milestone', '{"milestone_type": "x", "anniversary": false, "date_precision": "decade"}'), 'precision is one the resolver produces');
SELECT ok(NOT public.memory_detail_ok('thread', '{"topic": "t", "followup_after_days": 42, "date": "2026-10-16"}'), 'a thread keeps words, not a date');
SELECT ok(NOT public.memory_detail_ok('context', '{"aspect": "place", "date_hint": "since college"}'), 'context holds no time');

-- ── End to end: the gateway writes a dated fact ──
SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES ('00000000-0000-0000-0000-000000001801', 'Mike');
INSERT INTO public.captures (id, source, raw_text, time_zone) VALUES
  ('00000000-0000-0000-0000-000000001810', 'text', 'Mike has worked at Google since 2018.', 'America/Chicago');
SELECT tests.reset_role();
SELECT tests.as_service();
SELECT public.claim_capture_extraction(:A, '00000000-0000-0000-0000-000000001810');
SELECT public.write_extraction(:A, '00000000-0000-0000-0000-000000001810', 'relationship_extract/v5+claude-opus-5-5', false,
  '[{"kind": "fact", "person_id": "00000000-0000-0000-0000-000000001801", "subject_type": "person", "related": null,
     "statement": "Mike has worked at Google since 2018", "certainty": "stated", "sensitivity": "none", "confidence": 0.95,
     "detail": {"category": "work", "attribute": "employer", "value": "Google", "date": "2018-01-01", "date_end": "2018-12-31",
                "date_precision": "year", "date_hint": "since 2018"},
     "spans": [{"start": 0, "end": 36}], "action": {"type": "new", "target_id": null}}]');
SELECT is((SELECT row(kind, detail ->> 'date', detail ->> 'date_precision', detail ->> 'date_hint')::text
             FROM public.memory_items WHERE person_id = '00000000-0000-0000-0000-000000001801'),
  '(fact,2018-01-01,year,"since 2018")', 'stored as a fact with its year and the user''s words');
SELECT tests.reset_role();

SELECT * FROM finish();
ROLLBACK;
