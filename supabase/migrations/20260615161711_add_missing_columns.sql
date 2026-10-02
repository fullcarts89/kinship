-- ============================================================================
-- Kinship — Add Missing Columns
-- ============================================================================
-- Safe additive migration for projects that already ran 001_initial_schema.
-- Uses IF NOT EXISTS so it's idempotent.
-- ============================================================================

-- Persons: phone and email (from device contacts import)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS email TEXT;

-- Memories: photo_url (photo memories)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS photo_url TEXT;
