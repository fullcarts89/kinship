-- ============================================================================
-- Kinship 2.0 — the alpha trust floor (FD-30e; CC-25 "Commit next"; PER-05)
-- ============================================================================
-- Additive and forward-only. Three things:
--
--   person_proactive(person, user)
--       One answer, for every server reader, to "may Kinship bring this
--       person up on its own?" (D13): active, not removed, not deleted.
--       Paused and remembered people never get a reason, a birthday line or a
--       notification; only the user sets and clears those states.
--
--   people_merges + merge_people(target, source) + undo_merge_people(merge)
--       Two People who are the same person ("Anthony" added by name, "Anthony
--       Lopez" from Contacts) become one. Every memory item moves with every
--       one of its sources untouched; what names the merged person in a
--       shared line or a mention is re-pointed; related people, conversations,
--       notes told from their page, hashed identities and reasons follow. The
--       merged person is archived (never deleted) so Bring back still works,
--       and the merge writes a journal row with exactly what it changed, so
--       Undo (30 days, PER-05) reverses the re-pointing precisely. Both run as
--       the signed-in owner: the people must be theirs or nothing happens.
--
--   memory_items_facet_tombstone, re-checked
--       A line that merely moves to the survivor keeps its residence reading
--       (the reading is of the words, not of whose page they are on). Every
--       other change still drops the reading at once, as before.
-- ============================================================================

-- ─── D13 for server readers ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.person_proactive(p_person_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.people p
                  WHERE p.id = p_person_id AND p.user_id = p_user_id
                    AND p.state = 'active' AND p.deleted_at IS NULL)
$$;

REVOKE ALL ON FUNCTION public.person_proactive(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.person_proactive(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.person_proactive(uuid, uuid) IS
  'Kinship 2.0 D13: whether Kinship may bring this person up on its own (active, not removed, not deleted). Candidate engines call this; paused and remembered people never produce a reason.';

-- ─── A moved line keeps its reading ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.memory_items_facet_tombstone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- A merge re-points lines to the survivor; their words are the same, so
  -- their readings stand (merge_people sets this for its own transaction).
  IF coalesce(current_setting('kinship.merging', true), '') = 'on'
     AND (NEW.statement, NEW.subject_type, NEW.kind, NEW.certainty, NEW.sensitivity, NEW.status, NEW.deleted_at)
         IS NOT DISTINCT FROM
         (OLD.statement, OLD.subject_type, OLD.kind, OLD.certainty, OLD.sensitivity, OLD.status, OLD.deleted_at) THEN
    RETURN NULL;
  END IF;
  IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
     OR (OLD.status <> 'retracted' AND NEW.status = 'retracted')
     OR (NEW.statement, NEW.person_id, NEW.subject_type, NEW.subject_related_id, NEW.kind,
         NEW.certainty, NEW.sensitivity, NEW.with_person_ids)
        IS DISTINCT FROM
        (OLD.statement, OLD.person_id, OLD.subject_type, OLD.subject_related_id, OLD.kind,
         OLD.certainty, OLD.sensitivity, OLD.with_person_ids) THEN
    UPDATE public.memory_item_facets SET deleted_at = coalesce(NEW.deleted_at, now())
     WHERE memory_item_id = NEW.id AND user_id = NEW.user_id AND deleted_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── A related person may follow their person within one transaction ───────
-- memory_items (subject_related_id, person_id) → related_people (id, person_id):
-- a merge moves both sides; the check waits for the end of the transaction.

DO $$
DECLARE n text;
BEGIN
  SELECT conname INTO n FROM pg_constraint
   WHERE conrelid = 'public.memory_items'::regclass AND contype = 'f'
     AND confrelid = 'public.related_people'::regclass;
  IF n IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.memory_items ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE', n);
  END IF;
END
$$;

-- ─── people_merges: the journal ─────────────────────────────────────────────

CREATE TABLE public.people_merges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The one who stays, and the one folded into them (archived, never deleted).
  target_id  uuid NOT NULL,
  source_id  uuid NOT NULL,
  -- Exactly what moved, row by row, with each row's earlier value, so Undo
  -- puts back precisely what the merge changed and nothing the user did since.
  journal    jsonb NOT NULL CHECK (jsonb_typeof(journal) = 'object'),
  undone_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  version    integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id),
  FOREIGN KEY (target_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE,
  CHECK (target_id <> source_id)
);

COMMENT ON TABLE public.people_merges IS
  'Kinship 2.0 PER-05: one row per duplicate-person merge, with the exact journal Undo reverses. Server-written (merge_people), pulled by the phone, owner read-only.';

CREATE INDEX people_merges_sync_idx ON public.people_merges (user_id, updated_at, id);
CREATE INDEX people_merges_open_idx ON public.people_merges (user_id, target_id) WHERE undone_at IS NULL;

CREATE TRIGGER people_merges_row_guard BEFORE INSERT OR UPDATE ON public.people_merges
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

ALTER TABLE public.people_merges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.people_merges FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.people_merges FROM authenticated;
CREATE POLICY "Owner can read" ON public.people_merges FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- The words of a line that named the merged person now name the survivor.
CREATE OR REPLACE FUNCTION public.merge_repoint_mentions(p_mentions jsonb, p_from uuid, p_to uuid)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN jsonb_typeof(p_mentions) <> 'array' THEN p_mentions
         ELSE coalesce((SELECT jsonb_agg(CASE WHEN lower(coalesce(e ->> 'person_id', '')) = p_from::text
                                              THEN e || jsonb_build_object('person_id', p_to::text) ELSE e END)
                          FROM jsonb_array_elements(p_mentions) e), '[]'::jsonb) END
$$;

REVOKE ALL ON FUNCTION public.merge_repoint_mentions(jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ─── merge_people ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.merge_people(p_target uuid, p_source uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  t public.people;
  s public.people;
  r record;
  v_now timestamptz := clock_timestamp();
  j_items jsonb := '[]'::jsonb;
  j_related jsonb := '[]'::jsonb;
  j_promoted jsonb := '[]'::jsonb;
  j_captures jsonb := '[]'::jsonb;
  j_contacts jsonb := '[]'::jsonb;
  j_identities jsonb := '[]'::jsonb;
  j_reasons jsonb := '[]'::jsonb;
  t_before jsonb;
  t_after jsonb;
  v_names text[];
  v_with uuid[];
  v_mentions jsonb;
  v_name text;
  merged public.people_merges;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'merge_people requires a signed-in user' USING ERRCODE = '42501';
  END IF;
  IF p_target IS NULL OR p_source IS NULL THEN
    RAISE EXCEPTION 'both people are required' USING ERRCODE = '22023';
  END IF;
  IF p_target = p_source THEN
    RAISE EXCEPTION 'a person cannot be merged with themself' USING ERRCODE = '22023';
  END IF;

  -- The owner's own two people, locked for the merge. Anyone else's: not found.
  SELECT * INTO t FROM public.people WHERE id = p_target AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'the person to keep is not here' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO s FROM public.people WHERE id = p_source AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'the person to merge is not here' USING ERRCODE = 'P0002';
  END IF;
  IF t.state = 'archived' THEN
    RAISE EXCEPTION 'bring the person back to People before merging into them' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('kinship.merging', 'on', true);
  SET CONSTRAINTS ALL DEFERRED;

  -- Memory items filed on the merged person: filed on the survivor, with the
  -- survivor taken out of "with" (never both filed on and shared with), and
  -- every mention of the merged person naming the survivor. Sources untouched.
  FOR r IN SELECT m.id, m.person_id, m.with_person_ids, m.person_mentions
             FROM public.memory_items m WHERE m.user_id = v_user AND m.person_id = p_source
  LOOP
    v_with := array_remove(r.with_person_ids, p_target);
    v_mentions := public.merge_repoint_mentions(r.person_mentions, p_source, p_target);
    j_items := j_items || jsonb_build_object('id', r.id, 'person_id', r.person_id, 'with_person_ids', to_jsonb(r.with_person_ids), 'person_mentions', r.person_mentions);
    UPDATE public.memory_items SET person_id = p_target, with_person_ids = v_with, person_mentions = v_mentions WHERE id = r.id;
  END LOOP;

  -- Memory items shared with the merged person: shared with the survivor
  -- instead (once), or no longer shared when they are the survivor's own.
  FOR r IN SELECT m.id, m.person_id, m.with_person_ids, m.person_mentions
             FROM public.memory_items m
            WHERE m.user_id = v_user AND m.person_id <> p_source AND p_source = ANY (m.with_person_ids)
  LOOP
    v_with := array_remove(r.with_person_ids, p_source);
    IF r.person_id <> p_target AND NOT (p_target = ANY (v_with)) THEN v_with := v_with || p_target; END IF;
    v_mentions := public.merge_repoint_mentions(r.person_mentions, p_source, p_target);
    j_items := j_items || jsonb_build_object('id', r.id, 'with_person_ids', to_jsonb(r.with_person_ids), 'person_mentions', r.person_mentions);
    UPDATE public.memory_items SET with_person_ids = v_with, person_mentions = v_mentions WHERE id = r.id;
  END LOOP;

  -- Lines on other pages whose words name the merged person.
  FOR r IN SELECT m.id, m.person_mentions FROM public.memory_items m
            WHERE m.user_id = v_user AND m.person_id <> p_source AND NOT (p_source = ANY (m.with_person_ids))
              AND m.person_mentions @> jsonb_build_array(jsonb_build_object('person_id', p_source::text))
  LOOP
    j_items := j_items || jsonb_build_object('id', r.id, 'person_mentions', r.person_mentions);
    UPDATE public.memory_items SET person_mentions = public.merge_repoint_mentions(r.person_mentions, p_source, p_target) WHERE id = r.id;
  END LOOP;

  -- Their people ("Anthony's sister Maria") become the survivor's.
  FOR r IN SELECT rp.id FROM public.related_people rp WHERE rp.user_id = v_user AND rp.person_id = p_source LOOP
    j_related := j_related || jsonb_build_object('id', r.id, 'person_id', p_source);
    UPDATE public.related_people SET person_id = p_target WHERE id = r.id;
  END LOOP;
  -- A relative elsewhere linked to the merged person is linked to the survivor
  -- (and unlinked where that would make them their own relative).
  FOR r IN SELECT rp.id, rp.person_id FROM public.related_people rp WHERE rp.user_id = v_user AND rp.promoted_person_id = p_source LOOP
    j_promoted := j_promoted || jsonb_build_object('id', r.id, 'promoted_person_id', p_source);
    UPDATE public.related_people SET promoted_person_id = CASE WHEN r.person_id = p_target THEN NULL ELSE p_target END WHERE id = r.id;
  END LOOP;

  -- Notes told from their page, and the conversations the user confirmed.
  FOR r IN SELECT c.id FROM public.captures c WHERE c.user_id = v_user AND c.context_person_id = p_source LOOP
    j_captures := j_captures || jsonb_build_object('id', r.id, 'context_person_id', p_source);
    UPDATE public.captures SET context_person_id = p_target WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT e.id FROM public.contact_events e WHERE e.user_id = v_user AND e.person_id = p_source LOOP
    j_contacts := j_contacts || jsonb_build_object('id', r.id, 'person_id', p_source);
    UPDATE public.contact_events SET person_id = p_target WHERE id = r.id;
  END LOOP;

  -- Hashed identities: the survivor's, unless they already have that one.
  FOR r IN SELECT i.id, i.kind, i.value_hash, i.deleted_at FROM public.person_identities i WHERE i.user_id = v_user AND i.person_id = p_source LOOP
    j_identities := j_identities || jsonb_build_object('id', r.id, 'person_id', p_source, 'deleted_at', r.deleted_at);
    IF r.deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.person_identities x
                                         WHERE x.user_id = v_user AND x.person_id = p_target AND x.kind = r.kind
                                           AND x.value_hash = r.value_hash AND x.deleted_at IS NULL) THEN
      UPDATE public.person_identities SET person_id = p_target, deleted_at = v_now WHERE id = r.id;
    ELSE
      UPDATE public.person_identities SET person_id = p_target WHERE id = r.id;
    END IF;
  END LOOP;

  -- Reasons: the merged person's go quiet; they belong to the survivor now,
  -- and the next refresh speaks again for the survivor where its evidence
  -- still produces them (dedupe by item, never by person).
  FOR r IN SELECT x.id, x.state FROM public.reasons x WHERE x.user_id = v_user AND x.person_id = p_source LOOP
    j_reasons := j_reasons || jsonb_build_object('id', r.id, 'person_id', p_source, 'state', r.state);
    UPDATE public.reasons SET person_id = p_target,
           state = CASE WHEN state IN ('candidate', 'scheduled', 'surfaced') THEN 'suppressed' ELSE state END
     WHERE id = r.id;
  END LOOP;

  -- The survivor keeps their own record and takes what they lacked: a
  -- birthday, a contact link, a full name, a relationship; the merged
  -- person's names become names the survivor goes by, so a later note that
  -- says "Anthony" still finds Anthony Lopez.
  t_before := jsonb_build_object('full_name', t.full_name, 'nicknames', to_jsonb(t.nicknames), 'relationship_label', t.relationship_label,
                                 'birthday', t.birthday, 'birthday_year_known', t.birthday_year_known, 'birthday_source', t.birthday_source,
                                 'birthday_capture_id', t.birthday_capture_id, 'contact_ref', t.contact_ref);
  v_names := t.nicknames;
  FOREACH v_name IN ARRAY ARRAY[s.display_name, coalesce(s.full_name, ''), split_part(btrim(s.display_name), ' ', 1)] || s.nicknames LOOP
    v_name := btrim(v_name);
    IF v_name <> '' AND lower(v_name) <> lower(t.display_name)
       AND lower(v_name) <> lower(coalesce(t.full_name, ''))
       AND NOT (lower(v_name) = ANY (SELECT lower(n) FROM unnest(v_names) n))
       AND cardinality(v_names) < 10 THEN
      v_names := v_names || v_name;
    END IF;
  END LOOP;
  UPDATE public.people SET
    full_name = coalesce(t.full_name, s.full_name),
    nicknames = v_names,
    relationship_label = coalesce(t.relationship_label, s.relationship_label),
    birthday = coalesce(t.birthday, s.birthday),
    birthday_year_known = CASE WHEN t.birthday IS NULL AND s.birthday IS NOT NULL THEN s.birthday_year_known ELSE t.birthday_year_known END,
    birthday_source = CASE WHEN t.birthday IS NULL THEN s.birthday_source ELSE t.birthday_source END,
    birthday_capture_id = CASE WHEN t.birthday IS NULL THEN s.birthday_capture_id ELSE t.birthday_capture_id END,
    contact_ref = coalesce(t.contact_ref, s.contact_ref)
   WHERE id = p_target
   RETURNING jsonb_build_object('full_name', full_name, 'nicknames', to_jsonb(nicknames), 'relationship_label', relationship_label,
                                'birthday', birthday, 'birthday_year_known', birthday_year_known, 'birthday_source', birthday_source,
                                'birthday_capture_id', birthday_capture_id, 'contact_ref', contact_ref) INTO t_after;

  -- The merged person leaves People (archived, never deleted) and gives up
  -- the contact link, so a contact chosen later finds the survivor.
  UPDATE public.people SET state = 'archived', contact_ref = NULL WHERE id = p_source;

  INSERT INTO public.people_merges (user_id, target_id, source_id, journal)
  VALUES (v_user, p_target, p_source, jsonb_build_object(
    'v', 1,
    'target_before', t_before, 'target_after', t_after,
    'source_before', jsonb_build_object('state', s.state, 'contact_ref', s.contact_ref),
    'memory_items', j_items, 'related_people', j_related, 'promoted', j_promoted,
    'captures', j_captures, 'contact_events', j_contacts, 'person_identities', j_identities, 'reasons', j_reasons))
  RETURNING * INTO merged;
  RETURN to_jsonb(merged);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_people(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_people(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.merge_people(uuid, uuid) IS
  'Kinship 2.0 PER-05: fold one of the caller''s people into another. Every memory and source kept; the merged person archived; a journal row for Undo.';

-- ─── undo_merge_people ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.undo_merge_people(p_merge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  m public.people_merges;
  j jsonb;
  e jsonb;
  cur jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'undo_merge_people requires a signed-in user' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO m FROM public.people_merges WHERE id = p_merge_id AND user_id = v_user AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'that merge is not here' USING ERRCODE = 'P0002';
  END IF;
  IF m.undone_at IS NOT NULL THEN
    RETURN to_jsonb(m);
  END IF;
  IF m.created_at < clock_timestamp() - interval '30 days' THEN
    RAISE EXCEPTION 'this merge can no longer be undone' USING ERRCODE = '22023';
  END IF;
  j := m.journal;

  PERFORM set_config('kinship.merging', 'on', true);
  SET CONSTRAINTS ALL DEFERRED;

  -- The merged person comes back as they were; the survivor gives back only
  -- what the merge gave them and the user has not changed since.
  UPDATE public.people SET state = coalesce(j #>> '{source_before,state}', 'active'),
         contact_ref = j #>> '{source_before,contact_ref}'
   WHERE id = m.source_id AND user_id = v_user;
  SELECT jsonb_build_object('full_name', full_name, 'nicknames', to_jsonb(nicknames), 'relationship_label', relationship_label,
                            'birthday', birthday, 'birthday_year_known', birthday_year_known, 'birthday_source', birthday_source,
                            'birthday_capture_id', birthday_capture_id, 'contact_ref', contact_ref)
    INTO cur FROM public.people WHERE id = m.target_id AND user_id = v_user;
  UPDATE public.people SET
    full_name = CASE WHEN cur -> 'full_name' = j #> '{target_after,full_name}' THEN j #>> '{target_before,full_name}' ELSE full_name END,
    nicknames = CASE WHEN cur -> 'nicknames' = j #> '{target_after,nicknames}'
                     THEN coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(j #> '{target_before,nicknames}') x), '{}'::text[]) ELSE nicknames END,
    relationship_label = CASE WHEN cur -> 'relationship_label' = j #> '{target_after,relationship_label}' THEN j #>> '{target_before,relationship_label}' ELSE relationship_label END,
    birthday = CASE WHEN cur -> 'birthday' = j #> '{target_after,birthday}' THEN (j #>> '{target_before,birthday}')::date ELSE birthday END,
    birthday_year_known = CASE WHEN cur -> 'birthday' = j #> '{target_after,birthday}' THEN coalesce((j #>> '{target_before,birthday_year_known}')::boolean, true) ELSE birthday_year_known END,
    birthday_source = CASE WHEN cur -> 'birthday' = j #> '{target_after,birthday}' THEN j #>> '{target_before,birthday_source}' ELSE birthday_source END,
    birthday_capture_id = CASE WHEN cur -> 'birthday' = j #> '{target_after,birthday}' THEN (j #>> '{target_before,birthday_capture_id}')::uuid ELSE birthday_capture_id END,
    contact_ref = CASE WHEN cur -> 'contact_ref' = j #> '{target_after,contact_ref}' THEN j #>> '{target_before,contact_ref}' ELSE contact_ref END
   WHERE id = m.target_id AND user_id = v_user;

  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'related_people', '[]'::jsonb)) LOOP
    UPDATE public.related_people SET person_id = (e ->> 'person_id')::uuid WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'promoted', '[]'::jsonb)) LOOP
    UPDATE public.related_people SET promoted_person_id = (e ->> 'promoted_person_id')::uuid WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'memory_items', '[]'::jsonb)) LOOP
    UPDATE public.memory_items SET
      person_id = CASE WHEN e ? 'person_id' THEN (e ->> 'person_id')::uuid ELSE person_id END,
      with_person_ids = CASE WHEN e ? 'with_person_ids'
                             THEN coalesce((SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(e -> 'with_person_ids') x), '{}'::uuid[])
                             ELSE with_person_ids END,
      person_mentions = CASE WHEN e ? 'person_mentions' THEN e -> 'person_mentions' ELSE person_mentions END
     WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'captures', '[]'::jsonb)) LOOP
    UPDATE public.captures SET context_person_id = (e ->> 'context_person_id')::uuid WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'contact_events', '[]'::jsonb)) LOOP
    UPDATE public.contact_events SET person_id = (e ->> 'person_id')::uuid WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'person_identities', '[]'::jsonb)) LOOP
    UPDATE public.person_identities SET person_id = (e ->> 'person_id')::uuid, deleted_at = (e ->> 'deleted_at')::timestamptz
     WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;
  -- Reasons go back quiet; a refresh speaks again where the evidence still does.
  FOR e IN SELECT value FROM jsonb_array_elements(coalesce(j -> 'reasons', '[]'::jsonb)) LOOP
    UPDATE public.reasons SET person_id = (e ->> 'person_id')::uuid WHERE id = (e ->> 'id')::uuid AND user_id = v_user;
  END LOOP;

  UPDATE public.people_merges SET undone_at = clock_timestamp() WHERE id = m.id RETURNING * INTO m;
  RETURN to_jsonb(m);
END;
$$;

REVOKE ALL ON FUNCTION public.undo_merge_people(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_merge_people(uuid) TO authenticated;

COMMENT ON FUNCTION public.undo_merge_people(uuid) IS
  'Kinship 2.0 PER-05: reverse one of the caller''s merges exactly, within 30 days; the merged person returns to People as they were.';
