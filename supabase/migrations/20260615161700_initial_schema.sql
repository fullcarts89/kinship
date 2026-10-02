-- ============================================================================
-- Kinship — Initial Schema
-- ============================================================================
-- Tables: persons, memories, interactions
-- All tables use RLS with auth.uid() = user_id policies.
-- Suggestions table intentionally omitted (stays mock for now).
-- ============================================================================

-- ─── Persons ────────────────────────────────────────────────────────────────

CREATE TABLE persons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  photo_url  TEXT,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN (
      'friend', 'family', 'partner', 'colleague',
      'mentor', 'acquaintance', 'other'
    )),
  birthday   TEXT,
  phone      TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_persons_user_id    ON persons(user_id);
CREATE INDEX idx_persons_created_at ON persons(created_at DESC);

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own persons"
  ON persons FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persons"
  ON persons FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persons"
  ON persons FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own persons"
  ON persons FOR DELETE USING (auth.uid() = user_id);


-- ─── Memories ───────────────────────────────────────────────────────────────

CREATE TABLE memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id  UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  emotion    TEXT
    CHECK (emotion IN (
      'grateful', 'connected', 'curious', 'joyful', 'nostalgic',
      'proud', 'peaceful', 'inspired', 'hopeful', 'loved'
    )),
  photo_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_user_id    ON memories(user_id);
CREATE INDEX idx_memories_person_id  ON memories(person_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE USING (auth.uid() = user_id);


-- ─── Interactions ───────────────────────────────────────────────────────────

CREATE TABLE interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id  UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  type       TEXT NOT NULL
    CHECK (type IN (
      'message', 'call', 'video', 'in_person',
      'gift', 'letter', 'social_media', 'check_in', 'neighbor', 'other'
    )),
  note       TEXT,
  emotion    TEXT
    CHECK (emotion IN (
      'grateful', 'connected', 'curious', 'joyful', 'nostalgic',
      'proud', 'peaceful', 'inspired', 'hopeful', 'loved'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_user_id    ON interactions(user_id);
CREATE INDEX idx_interactions_person_id  ON interactions(person_id);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
  ON interactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON interactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions"
  ON interactions FOR DELETE USING (auth.uid() = user_id);
