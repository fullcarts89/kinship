-- ============================================================================
-- Kinship — Person notes
-- ============================================================================
-- Quick notes are profile facts about a person ("sister's wedding in June"),
-- not history events. Stored as a JSONB array of { text, created_at }.
-- Idempotent.
-- ============================================================================

ALTER TABLE persons ADD COLUMN IF NOT EXISTS notes JSONB;
