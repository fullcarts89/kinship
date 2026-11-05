-- Undo is exact for a relative too (CC-20's trust invariant, founder N8). A note
-- can add a relative ("Sam's dad"), and Undo left that row behind with nothing
-- saying it: a named one still asked "Is this Sam's sister, Ana?" on a page, and
-- later notes still found it.
--
-- A relative is known only from lines: write_extraction is the only thing that
-- adds one. So when a note goes, a relative one of its lines was about goes too
-- if no line about them is left. One the user made a person of stays. This is a
-- trigger of its own, named to run after captures_cascade_delete has taken the
-- note's lines, so neither that function nor write_extraction changes.
--
-- Nothing runs over existing rows: one left by an earlier Undo stays until a
-- note about them is taken back.

CREATE OR REPLACE FUNCTION public.captures_cascade_relatives()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NULL;
  END IF;
  UPDATE public.related_people r SET deleted_at = NEW.deleted_at
   WHERE r.user_id = NEW.user_id
     AND r.deleted_at IS NULL
     AND r.promoted_person_id IS NULL
     AND r.id IN (SELECT i.subject_related_id
                    FROM public.memory_item_sources s
                    JOIN public.memory_items i ON i.id = s.memory_item_id
                   WHERE s.capture_id = NEW.id AND i.subject_related_id IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM public.memory_items l
                     WHERE l.subject_related_id = r.id AND l.deleted_at IS NULL);
  RETURN NULL;
END;
$$;

CREATE TRIGGER captures_cascade_relatives AFTER UPDATE OF deleted_at ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.captures_cascade_relatives();
