-- ============================================================================
-- Kinship 2.0 — superseding cannot form a loop (Checkpoint A test finding)
-- ============================================================================
-- 53_v2_lifecycle found that an older item could be set to supersede the
-- newer item that had superseded it, a loop that leaves neither item current.
-- Now an item can only supersede an item about the same person, never
-- itself, never an item further along its own chain, and a superseded item
-- can't supersede anything.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.memory_items_apply_supersede()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  old_person uuid;
BEGIN
  IF NEW.supersedes_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.supersedes_id IS NOT DISTINCT FROM OLD.supersedes_id) THEN
    RETURN NULL;
  END IF;
  IF NEW.status = 'superseded' THEN
    RAISE EXCEPTION 'a superseded item cannot supersede another' USING ERRCODE = '23514';
  END IF;
  SELECT person_id INTO old_person FROM public.memory_items WHERE id = NEW.supersedes_id;
  IF old_person IS DISTINCT FROM NEW.person_id THEN
    RAISE EXCEPTION 'an item can only supersede an item about the same person' USING ERRCODE = '23514';
  END IF;
  -- Walk the chain from the item being superseded; reaching NEW is a loop.
  IF EXISTS (
    WITH RECURSIVE chain(id, depth) AS (
      SELECT i.supersedes_id, 1 FROM public.memory_items i WHERE i.id = NEW.supersedes_id
      UNION ALL
      SELECT i.supersedes_id, c.depth + 1
      FROM chain c JOIN public.memory_items i ON i.id = c.id
      WHERE c.id IS NOT NULL AND c.depth < 1000
    )
    SELECT 1 FROM chain WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'superseding would form a loop' USING ERRCODE = '23514';
  END IF;
  UPDATE public.memory_items
     SET status = 'superseded',
         valid_to = CASE WHEN kind = 'fact' THEN coalesce(valid_to, current_date) ELSE valid_to END
   WHERE id = NEW.supersedes_id AND status IN ('active', 'resolved');
  RETURN NULL;
END;
$$;
