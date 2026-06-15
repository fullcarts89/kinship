-- ============================================================================
-- Kinship — Tending Seasons
-- ============================================================================
-- A bounded period (~3 months) of intentional tending: up to 5 people,
-- each with a soft rhythm. One active season at a time (app-enforced).
-- ============================================================================

CREATE TABLE IF NOT EXISTS seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS season_commitments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id  UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id  UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  rhythm     TEXT NOT NULL
    CHECK (rhythm IN ('often', 'regularly', 'now_and_then')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seasons_user_id ON seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_season_commitments_season ON season_commitments(season_id);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own seasons" ON seasons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own season commitments" ON season_commitments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
