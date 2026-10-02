-- ============================================================================
-- Kinship 2.0 — foundation: shared row rules, people, related people,
-- person identities (Phase 1, Checkpoint A)
-- ============================================================================
-- Additive only. The 1.0 tables (persons, memories, interactions, promises,
-- seasons, season_commitments) are untouched and keep serving the 1.0 app
-- until the 2.0 shell replaces it; moving 1.0 data across is a separate,
-- later migration.
--
-- Every 2.0 table that the device mirrors (plan §5, §11) has:
--   id          uuid, client-generated for offline creates
--   user_id     owner; defaults to the caller; can never change
--   created_at  server clock; can never change
--   updated_at  server clock on every write (the sync pull cursor)
--   deleted_at  tombstone; synced like any other change; hard-purged after
--               30 days by purge_tombstones()
--   version     optimistic concurrency: a write must carry the version it
--               was based on (or leave it out); the server then bumps it.
--               A stale version is rejected with SQLSTATE 40001.
--
-- Ownership of parents is enforced by composite foreign keys
-- (child.parent_id, child.user_id) → parent(id, user_id), so a row can only
-- point at its own user's rows. That holds for every role, including the
-- service role, not just for API callers under RLS.
--
-- Rows are never hard-deleted by users: there is no DELETE privilege. A
-- deletion is a tombstone (deleted_at), which the device mirror receives on
-- its next pull. Account deletion (delete_user_account) still removes
-- everything at once.
-- ============================================================================

-- ─── Shared row rules ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.v2_row_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp();
    NEW.updated_at := NEW.created_at;
    NEW.version := 1;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot change' USING ERRCODE = '42501';
  END IF;
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'version conflict on %.%: based on %, current is %',
      TG_TABLE_NAME, OLD.id, NEW.version, OLD.version
      USING ERRCODE = '40001';
  END IF;
  NEW.created_at := OLD.created_at;
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.v2_row_guard() IS
  'Kinship 2.0 sync columns: server-stamped created_at/updated_at, immutable user_id, optimistic version check (40001 on a stale write).';

-- ─── people ─────────────────────────────────────────────────────────────────

CREATE TABLE public.people (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100),
  full_name           text CHECK (char_length(full_name) <= 200),
  nicknames           text[] NOT NULL DEFAULT '{}' CHECK (cardinality(nicknames) <= 10),
  relationship_label  text CHECK (char_length(relationship_label) <= 100),
  birthday            date,
  birthday_year_known boolean NOT NULL DEFAULT true,
  -- D13: remembered (died) and paused (estranged / not now) are set by the
  -- user only. Neither gets proactive reasons (enforced on public.reasons).
  state               text NOT NULL DEFAULT 'active'
                        CHECK (state IN ('active', 'remembered', 'paused', 'archived')),
  -- The sprig's identity seed: fixed from id at creation, never recomputed.
  sprig_seed          bigint NOT NULL DEFAULT 0,
  -- Opaque device contact id. The address book itself is never uploaded.
  contact_ref         text CHECK (char_length(contact_ref) <= 200),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  version             integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id)
);
-- No group or circle column, by design: chapters/circles, if ever built, are
-- many-to-many (plan §34).

COMMENT ON TABLE public.people IS 'Kinship 2.0: the people a user keeps (plan §5).';

CREATE INDEX people_sync_idx ON public.people (user_id, updated_at, id);

CREATE OR REPLACE FUNCTION public.people_sprig_seed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 60 bits of md5(id): deterministic, stable, independent of anything
    -- the user can change.
    NEW.sprig_seed := ('x' || substr(md5(NEW.id::text), 1, 15))::bit(60)::bigint;
  ELSE
    NEW.sprig_seed := OLD.sprig_seed;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER people_row_guard BEFORE INSERT OR UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();
CREATE TRIGGER people_sprig_seed BEFORE INSERT OR UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_sprig_seed();

-- ─── related_people ─────────────────────────────────────────────────────────
-- Third parties ("Sarah's sister", "Leo, David's son"). They stay attached
-- to the relationship they came from and are never linked across users.

CREATE TABLE public.related_people (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id          uuid NOT NULL,
  relation           text NOT NULL CHECK (char_length(btrim(relation)) BETWEEN 1 AND 50),
  name               text CHECK (char_length(name) <= 100),
  -- Set if the user later adds this person to their own people.
  promoted_person_id uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  version            integer NOT NULL DEFAULT 1,
  UNIQUE (id, user_id),
  UNIQUE (id, person_id, user_id),
  FOREIGN KEY (person_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (promoted_person_id, user_id) REFERENCES public.people (id, user_id)
    ON DELETE SET NULL (promoted_person_id),
  CHECK (promoted_person_id IS NULL OR promoted_person_id <> person_id)
);

CREATE INDEX related_people_sync_idx ON public.related_people (user_id, updated_at, id);
CREATE INDEX related_people_person_idx ON public.related_people (person_id);
CREATE INDEX related_people_promoted_idx ON public.related_people (promoted_person_id)
  WHERE promoted_person_id IS NOT NULL;

CREATE TRIGGER related_people_row_guard BEFORE INSERT OR UPDATE ON public.related_people
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- ─── person_identities ──────────────────────────────────────────────────────
-- Hashed handles used only to match a person (e.g. a shared message to the
-- right person). Raw phone numbers and addresses are never stored.

CREATE TABLE public.person_identities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id   uuid NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('phone', 'email', 'handle')),
  -- Lowercase hex SHA-256 of the normalised value, computed on the device.
  value_hash  text NOT NULL CHECK (value_hash ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  version     integer NOT NULL DEFAULT 1,
  FOREIGN KEY (person_id, user_id) REFERENCES public.people (id, user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX person_identities_live_uniq
  ON public.person_identities (user_id, kind, value_hash) WHERE deleted_at IS NULL;
CREATE INDEX person_identities_sync_idx ON public.person_identities (user_id, updated_at, id);
CREATE INDEX person_identities_person_idx ON public.person_identities (person_id);

CREATE TRIGGER person_identities_row_guard BEFORE INSERT OR UPDATE ON public.person_identities
  FOR EACH ROW EXECUTE FUNCTION public.v2_row_guard();

-- ─── Access ─────────────────────────────────────────────────────────────────
-- Owner-only, authenticated only. No DELETE: deletion is a tombstone.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['people', 'related_people', 'person_identities'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE DELETE, TRUNCATE ON public.%I FROM authenticated', t);
    EXECUTE format($p$CREATE POLICY "Owner can read" ON public.%I FOR SELECT TO authenticated
      USING ((select auth.uid()) = user_id)$p$, t);
    EXECUTE format($p$CREATE POLICY "Owner can create" ON public.%I FOR INSERT TO authenticated
      WITH CHECK ((select auth.uid()) = user_id)$p$, t);
    EXECUTE format($p$CREATE POLICY "Owner can update" ON public.%I FOR UPDATE TO authenticated
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)$p$, t);
  END LOOP;
END
$$;
