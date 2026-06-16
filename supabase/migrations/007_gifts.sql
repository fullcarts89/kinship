-- ============================================================================
-- Kinship — Gifts
-- ============================================================================
-- Gifts the user gave to, or received from, a person ("wedding gift: stand
-- mixer"). A structured record on the person's timeline — helps remember what
-- was exchanged and reciprocate thoughtfully.
-- ============================================================================

CREATE TABLE IF NOT EXISTS gifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  direction   TEXT NOT NULL DEFAULT 'given'
    CHECK (direction IN ('given', 'received')),
  occasion    TEXT,
  note        TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gifts_user_id     ON gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_person_id   ON gifts(person_id);
CREATE INDEX IF NOT EXISTS idx_gifts_occurred_at ON gifts(occurred_at DESC);

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gifts"
  ON gifts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gifts"
  ON gifts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gifts"
  ON gifts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gifts"
  ON gifts FOR DELETE USING (auth.uid() = user_id);
