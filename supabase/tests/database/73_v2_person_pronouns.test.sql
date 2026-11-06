-- A person's pronouns: optional, the owner's alone to read and write, 1 to 40 characters.
BEGIN;
SELECT plan(7);

\set A '''aaaaaaaa-7373-7373-7373-737373737373'''
\set B '''bbbbbbbb-7373-7373-7373-737373737373'''
\set NAT '''00000000-0000-0000-0000-000000007301'''
SELECT tests.create_user(:A);
SELECT tests.create_user(:B);

SELECT tests.as_user(:A);
INSERT INTO public.people (id, display_name) VALUES (:NAT, 'Natalia');
SELECT is((SELECT pronouns FROM public.people WHERE id = :NAT), NULL, 'A person has no pronouns until the user gives them');

UPDATE public.people SET pronouns = 'she/her', version = version + 1 WHERE id = :NAT;
SELECT is((SELECT pronouns FROM public.people WHERE id = :NAT), 'she/her', 'The owner sets them');

UPDATE public.people SET pronouns = NULL, version = version + 1 WHERE id = :NAT;
SELECT is((SELECT pronouns FROM public.people WHERE id = :NAT), NULL, 'The owner clears them');

SELECT throws_ok($$ UPDATE public.people SET pronouns = '', version = version + 1 WHERE id = '00000000-0000-0000-0000-000000007301' $$,
  '23514', NULL, 'Empty is not a value: cleared means null');
SELECT throws_ok(format($$ UPDATE public.people SET pronouns = %L, version = version + 1 WHERE id = '00000000-0000-0000-0000-000000007301' $$, repeat('x', 41)),
  '23514', NULL, 'Longer than 40 characters is refused');
UPDATE public.people SET pronouns = 'ze/zir', version = version + 1 WHERE id = :NAT;

SELECT tests.as_user(:B);
SELECT is((SELECT count(*)::int FROM public.people WHERE id = :NAT), 0, 'Someone else can''t read them');
UPDATE public.people SET pronouns = 'he/him' WHERE id = :NAT;
SELECT tests.as_user(:A);
SELECT is((SELECT pronouns FROM public.people WHERE id = :NAT), 'ze/zir', 'Someone else can''t change them');

SELECT * FROM finish();
ROLLBACK;
