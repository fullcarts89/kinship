-- ============================================================================
-- Kinship — Promises
-- ============================================================================
-- One-shot commitments the user made TO a person ("send Tom the book
-- link"). Their own words held for them. Resolves once: kept or released.
-- ============================================================================

CREATE TABLE IF NOT EXISTS promises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  due_hint    TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'kept', 'released')),
  source      TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_suggested', 'post_reach_out')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_promises_user_id   ON promises(user_id);
CREATE INDEX IF NOT EXISTS idx_promises_person_id ON promises(person_id);
CREATE INDEX IF NOT EXISTS idx_promises_status    ON promises(status);

ALTER TABLE promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promises"
  ON promises FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promises"
  ON promises FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promises"
  ON promises FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own promises"
  ON promises FOR DELETE USING (auth.uid() = user_id);
