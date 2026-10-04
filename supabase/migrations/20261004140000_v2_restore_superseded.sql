-- ============================================================================
-- Kinship 2.0 — Undo and "Not this" bring back what a memory replaced
-- (Checkpoint D1)
-- ============================================================================
-- "Mike works at Apple" supersedes "Mike works at Google": the older item is
-- kept, marked superseded, with its previous version in memory_item_history
-- (plan §6). Until now, taking the newer item back (Undo, which deletes its
-- note, or "Not this", which retracts it) left the older one superseded, so
-- Kinship forgot both. Plan §8 says Undo restores the prior state.
--
-- When an item that replaced another stops being current (it is deleted or
-- retracted while active or resolved), the item it replaced comes back as it
-- was before it was replaced (status and valid_to from its last history
-- snapshot), unless another live item still replaces it. If that item is
-- itself gone, the nearest live one further down the chain comes back.
--
-- Runs as the caller (like the supersede trigger it mirrors), so a user only
-- ever restores their own items; trigger-made updates skip the client
-- version check (v2_is_client_write). Forward-only: no stored row changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.memory_items_restore_superseded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target uuid := NEW.supersedes_id;
  cur record;
  prior jsonb;
  hops int := 0;
BEGIN
  IF target IS NULL OR OLD.status NOT IN ('active', 'resolved') THEN
    RETURN NULL;
  END IF;
  IF NOT ((OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
          OR (OLD.status <> 'retracted' AND NEW.status = 'retracted')) THEN
    RETURN NULL;
  END IF;

  -- The nearest item down the chain that still exists.
  LOOP
    SELECT id, status, deleted_at, supersedes_id INTO cur
      FROM public.memory_items WHERE id = target AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
    EXIT WHEN cur.deleted_at IS NULL AND cur.status <> 'retracted';
    hops := hops + 1;
    IF cur.supersedes_id IS NULL OR hops > 50 THEN
      RETURN NULL;
    END IF;
    target := cur.supersedes_id;
  END LOOP;

  IF cur.status <> 'superseded' THEN
    RETURN NULL;
  END IF;
  -- Still replaced by something else that is live.
  IF EXISTS (SELECT 1 FROM public.memory_items o
              WHERE o.supersedes_id = target AND o.user_id = NEW.user_id AND o.id <> NEW.id
                AND o.deleted_at IS NULL AND o.status <> 'retracted') THEN
    RETURN NULL;
  END IF;

  SELECT h.snapshot INTO prior FROM public.memory_item_history h
   WHERE h.memory_item_id = target AND h.user_id = NEW.user_id
     AND h.snapshot ->> 'status' IN ('active', 'resolved')
   ORDER BY h.item_version DESC, h.created_at DESC
   LIMIT 1;

  UPDATE public.memory_items
     SET status = coalesce(prior ->> 'status', 'active'),
         valid_to = CASE WHEN prior IS NULL THEN valid_to ELSE (prior ->> 'valid_to')::date END
   WHERE id = target AND user_id = NEW.user_id AND status = 'superseded' AND deleted_at IS NULL;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.memory_items_restore_superseded() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER memory_items_restore_superseded AFTER UPDATE OF deleted_at, status ON public.memory_items
  FOR EACH ROW EXECUTE FUNCTION public.memory_items_restore_superseded();
