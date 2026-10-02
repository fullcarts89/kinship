-- ============================================================================
-- Kinship 2.0 — write a memory item and its sources atomically (Checkpoint B)
-- ============================================================================
-- Provenance is checked at commit (a live item needs a live source). Over the
-- REST API each request is its own transaction, so an item and its first
-- source must arrive in one call. write_memory_item does exactly that.
--
--   * SECURITY INVOKER: it runs as the caller, so RLS, column privileges, the
--     "app cannot write origin=extracted" policy, span checks and every
--     other rule apply unchanged.
--   * Idempotent by the client-generated item id: a retry after a lost reply
--     returns the existing item and writes nothing twice.
--   * Insert only. Later changes are ordinary versioned updates (CA-3).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.write_memory_item(p_item jsonb, p_sources jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  existing public.memory_items;
  created public.memory_items;
  s jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'write_memory_item requires a signed-in user' USING ERRCODE = '42501';
  END IF;
  IF p_item IS NULL OR jsonb_typeof(p_item) <> 'object' OR NOT (p_item ? 'id') THEN
    RAISE EXCEPTION 'p_item must be an object with a client-generated id' USING ERRCODE = '22023';
  END IF;
  IF p_sources IS NULL OR jsonb_typeof(p_sources) <> 'array' OR jsonb_array_length(p_sources) = 0 THEN
    RAISE EXCEPTION 'a memory item needs at least one source' USING ERRCODE = '23514';
  END IF;
  v_id := (p_item ->> 'id')::uuid;

  SELECT * INTO existing FROM public.memory_items WHERE id = v_id;
  IF FOUND THEN
    RETURN to_jsonb(existing);
  END IF;

  INSERT INTO public.memory_items (id, kind, person_id, subject_type, subject_related_id, statement, detail,
                                   certainty, sensitivity, status, user_state, valid_from, valid_to,
                                   supersedes_id, origin)
  VALUES (v_id,
          p_item ->> 'kind',
          (p_item ->> 'person_id')::uuid,
          coalesce(p_item ->> 'subject_type', 'person'),
          (p_item ->> 'subject_related_id')::uuid,
          p_item ->> 'statement',
          coalesce(p_item -> 'detail', '{}'::jsonb),
          coalesce(p_item ->> 'certainty', 'stated'),
          coalesce(p_item ->> 'sensitivity', 'none'),
          coalesce(p_item ->> 'status', 'active'),
          coalesce(p_item ->> 'user_state', 'unreviewed'),
          (p_item ->> 'valid_from')::date,
          (p_item ->> 'valid_to')::date,
          (p_item ->> 'supersedes_id')::uuid,
          p_item ->> 'origin')
  RETURNING * INTO created;

  FOR s IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
    INSERT INTO public.memory_item_sources (id, memory_item_id, capture_id, source_kind,
                                            span_start, span_end, meta)
    VALUES (coalesce((s ->> 'id')::uuid, gen_random_uuid()), v_id, (s ->> 'capture_id')::uuid,
            s ->> 'source_kind', (s ->> 'span_start')::int, (s ->> 'span_end')::int, s -> 'meta');
  END LOOP;

  RETURN to_jsonb(created);
END;
$$;

REVOKE ALL ON FUNCTION public.write_memory_item(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_memory_item(jsonb, jsonb) TO authenticated;
