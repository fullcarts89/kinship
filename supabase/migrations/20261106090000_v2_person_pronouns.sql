-- A person's pronouns, as the user gives them on the person's Edit sheet ("she/her", or their own words).
-- Forward-only and additive: a nullable column, read by the app alone. An app without it never writes it,
-- and nothing on the server or in a prompt reads it.
ALTER TABLE public.people
  ADD COLUMN pronouns text CONSTRAINT people_pronouns_length CHECK (char_length(pronouns) BETWEEN 1 AND 40);

COMMENT ON COLUMN public.people.pronouns IS
  'Kinship 2.0: how the user says this person would like to be spoken of, in the user''s own words. Set only by the user.';
