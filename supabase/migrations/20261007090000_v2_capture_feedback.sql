-- Core trust closure (founder H6/H7): "Got it right / Not quite" on what
-- Kinship understood from a note. Kept on the note itself, so it is tied to
-- that Tell and its result for debugging and eval review.
--
-- It never changes a memory, never becomes training or eval data by itself
-- (a person reviews it first; docs/product/dogfood-feedback-to-evals.md),
-- and holds no content: a verdict, at most one fixed reason, and when.

CREATE OR REPLACE FUNCTION public.capture_feedback_ok(f jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT f IS NULL OR (
    jsonb_typeof(f) = 'object'
    AND f ->> 'verdict' IN ('right', 'not_quite')
    AND jsonb_typeof(f -> 'at') = 'string'
    AND (NOT f ? 'off' OR (f ->> 'verdict' = 'not_quite'
      AND f ->> 'off' IN ('wrong_person', 'missed_something', 'wrong_relationship', 'wrong_wording', 'other')))
    AND NOT EXISTS (SELECT 1 FROM jsonb_object_keys(f) k WHERE k NOT IN ('verdict', 'off', 'at'))
  );
$$;

REVOKE ALL ON FUNCTION public.capture_feedback_ok(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_feedback_ok(jsonb) TO authenticated, service_role;

ALTER TABLE public.captures ADD COLUMN feedback jsonb;
ALTER TABLE public.captures ADD CONSTRAINT captures_feedback_ok CHECK (public.capture_feedback_ok(feedback));

COMMENT ON COLUMN public.captures.feedback IS
  'The owner''s "Got it right / Not quite" on what was understood: {verdict, off?, at}. No content; never alters memory.';

-- The owner may set it on their own note (row-level security already
-- limits updates to the owner); nothing else about the grant changes.
GRANT UPDATE (feedback) ON public.captures TO authenticated;
