-- Option A, containment (founder, 19 Oct 2026; PR #52 `06` §9): no silent
-- capacity-based loss and no false completion reporting. When a note holds
-- more than one understanding can take (the pipeline's item limit), the
-- gateway records what it did not get to on the capture itself, as the
-- note's own spans and a count, so every phone shows the note as partial
-- and offers "Tell the rest". A later note the user tells for the rest
-- points back at the one it continues, so the partial state is resolved on
-- every device without a status change.
--
-- Nothing here changes a tier, a threshold, provenance, identity, dates or
-- Undo. The capture's status values are unchanged (needs_review keeps its
-- meaning for resolve_capture_review); partiality is the coverage column.
-- Forward-only.

-- ─── coverage: offsets and a count, never words ───────────────────────────

CREATE OR REPLACE FUNCTION public.capture_coverage_ok(c jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(c) = 'object'
     AND (c ? 'v') AND (c ? 'unprocessed') AND (c ? 'unlocated')
     AND c->>'v' = '1'
     AND jsonb_typeof(c->'unlocated') = 'number'
     AND (c->>'unlocated')::numeric >= 0 AND (c->>'unlocated')::numeric = floor((c->>'unlocated')::numeric)
     AND jsonb_typeof(c->'unprocessed') = 'array'
     AND jsonb_array_length(c->'unprocessed') <= 64
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(c->'unprocessed') s
        WHERE jsonb_typeof(s) <> 'object'
           OR NOT (s ? 'start') OR NOT (s ? 'end')
           OR jsonb_typeof(s->'start') <> 'number' OR jsonb_typeof(s->'end') <> 'number'
           OR (s->>'start')::numeric < 0
           OR (s->>'end')::numeric <= (s->>'start')::numeric
           OR (s->>'end')::numeric > 5000
           OR (s->>'start')::numeric <> floor((s->>'start')::numeric)
           OR (s->>'end')::numeric <> floor((s->>'end')::numeric)
           OR (SELECT count(*) FROM jsonb_object_keys(s)) <> 2
     )
     AND (SELECT count(*) FROM jsonb_object_keys(c)) = 3
$$;

ALTER TABLE public.captures
  ADD COLUMN coverage jsonb CHECK (coverage IS NULL OR public.capture_coverage_ok(coverage));

COMMENT ON COLUMN public.captures.coverage IS
  'Kinship 2.0 Option A: what the understanding did not get to, as the note''s own spans (code points into raw_text) and a count of unplaced ones; NULL when the note was taken whole. Written by the gateway only.';

-- ─── continues_capture_id: "Tell the rest" ──────────────────────────────────

ALTER TABLE public.captures
  ADD COLUMN continues_capture_id uuid,
  ADD CONSTRAINT captures_continues_fk FOREIGN KEY (continues_capture_id, user_id)
    REFERENCES public.captures (id, user_id) ON DELETE SET NULL (continues_capture_id),
  ADD CONSTRAINT captures_continues_self CHECK (continues_capture_id IS NULL OR continues_capture_id <> id);

CREATE INDEX captures_continues_idx ON public.captures (continues_capture_id)
  WHERE continues_capture_id IS NOT NULL;

COMMENT ON COLUMN public.captures.continues_capture_id IS
  'Kinship 2.0 Option A: the partial note this one tells the rest of; set by the app at insert, never updated.';

-- The app sets it at insert only (the "Owner can create" policy already
-- allows any column of a pending/skipped row); it stays outside the update
-- grant, like status, so a note never changes what it continues.

-- ─── set_capture_coverage: the gateway's write ──────────────────────────────

CREATE OR REPLACE FUNCTION public.set_capture_coverage(p_user_id uuid, p_capture_id uuid, p_coverage jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_coverage IS NOT NULL AND NOT public.capture_coverage_ok(p_coverage) THEN
    RAISE EXCEPTION 'coverage is spans and a count' USING ERRCODE = '22023';
  END IF;
  UPDATE public.captures SET coverage = p_coverage
   WHERE id = p_capture_id AND user_id = p_user_id AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.set_capture_coverage(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_capture_coverage(uuid, uuid, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.capture_coverage_ok(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_coverage_ok(jsonb) TO authenticated, service_role;
