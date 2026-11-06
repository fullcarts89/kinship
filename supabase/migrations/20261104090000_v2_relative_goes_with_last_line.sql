-- A relative goes with the last line about them (CC-20's trust invariant,
-- founder N8; founder 5 Nov 2026 for "Not this"). A note can add a relative
-- ("Sam's dad"), and when its line went, by Undo or by "Not this", that row
-- stayed behind with nothing saying it: a named one still asked "Is this Sam's
-- sister, Ana?" on a page, and later notes still found it.
--
-- A relative is known only from lines: write_extraction is the only thing that
-- adds one. So when a line goes, the relative it was about goes too if no line
-- about them is left. A replaced line still says them. One the user made a
-- person of stays. This is a trigger of its own on the line, which Undo also
-- takes through captures_cascade_delete, so neither that function nor
-- write_extraction changes.
--
-- Nothing runs over existing rows: one left behind earlier stays until the last
-- line about them goes.

CREATE OR REPLACE FUNCTION public.memory_items_relative_goes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.subject_related_id IS NULL OR NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NULL;
  END IF;
  UPDATE public.related_people r SET deleted_at = NEW.deleted_at
   WHERE r.id = NEW.subject_related_id
     AND r.user_id = NEW.user_id
     AND r.deleted_at IS NULL
     AND r.promoted_person_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.memory_items l
                     WHERE l.subject_related_id = r.id AND l.deleted_at IS NULL);
  RETURN NULL;
END;
$$;

CREATE TRIGGER memory_items_relative_goes AFTER UPDATE OF deleted_at ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_relative_goes();
