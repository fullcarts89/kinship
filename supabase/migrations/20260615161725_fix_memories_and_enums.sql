-- ============================================================================
-- Kinship — Fix memories.occurred_at and enum CHECK constraints
-- ============================================================================
-- 1. memories.occurred_at: the app (services, hooks, types) reads and sorts
--    by occurred_at, but 001 never created the column. Without it every
--    memory query fails. Backfills from created_at for existing rows.
-- 2. persons.relationship_type: app allows 'neighbor' but the CHECK in 001
--    omitted it, so planting a neighbor would be rejected.
-- 3. interactions.type: the CHECK in 001 allowed a spurious 'neighbor' type
--    that the app never writes; realign with the app's InteractionType.
-- Idempotent: safe to run on a fresh or already-patched database.
-- ============================================================================

-- ─── 1. memories.occurred_at ────────────────────────────────────────────────

ALTER TABLE memories ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

UPDATE memories SET occurred_at = created_at WHERE occurred_at IS NULL;

ALTER TABLE memories ALTER COLUMN occurred_at SET DEFAULT now();
ALTER TABLE memories ALTER COLUMN occurred_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memories_occurred_at ON memories(occurred_at DESC);

-- ─── 2. persons.relationship_type: allow 'neighbor' ─────────────────────────

ALTER TABLE persons DROP CONSTRAINT IF EXISTS persons_relationship_type_check;

ALTER TABLE persons ADD CONSTRAINT persons_relationship_type_check
  CHECK (relationship_type IN (
    'friend', 'family', 'partner', 'colleague',
    'mentor', 'acquaintance', 'neighbor', 'other'
  ));

-- ─── 3. interactions.type: realign with app enum ────────────────────────────

-- 'neighbor' was never a valid interaction type in the app; fold any stray
-- rows into 'other' before tightening the constraint.
UPDATE interactions SET type = 'other' WHERE type = 'neighbor';

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;

ALTER TABLE interactions ADD CONSTRAINT interactions_type_check
  CHECK (type IN (
    'message', 'call', 'video', 'in_person',
    'gift', 'letter', 'social_media', 'check_in', 'other'
  ));
