-- ============================================================================
-- Kinship — Person interests
-- ============================================================================
-- The add-person flow collects interest tags, but no column existed to
-- store them. Idempotent.
-- ============================================================================

ALTER TABLE persons ADD COLUMN IF NOT EXISTS interests TEXT[];
