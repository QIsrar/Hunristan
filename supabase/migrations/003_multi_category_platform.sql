-- =============================================================
-- Migration 003: Multi-Category Competition Platform
-- Run once in Supabase SQL Editor → SQL Editor → New query
-- All changes are ADDITIVE — zero impact on existing tables.
-- =============================================================

-- -----------------------------------------------------------
-- 1. Extend hackathons with competition_type
-- -----------------------------------------------------------
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS competition_type TEXT DEFAULT 'CODING'
    CHECK (competition_type IN ('CODING', 'MULTI_TRACK'));

-- -----------------------------------------------------------
-- 2. competition_categories
--    One row per track/event within a hackathon.
--    type: CODE | TEXT | IMAGE | FILE | MCQ | URL
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS competition_categories (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id  UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL
                  CHECK (type IN ('CODE','TEXT','IMAGE','FILE','MCQ','URL')),
  description   TEXT,
  rubric_json   JSONB DEFAULT '[]',
  -- rubric_json shape: [{ name: text, weight: int, description: text }]
  max_score     INT  DEFAULT 100,
  time_limit    INT,            -- minutes; NULL = no limit
  order_index   INT  DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 3. mcq_questions
--    Belongs to a category of type MCQ.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcq_questions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id  UUID REFERENCES competition_categories(id) ON DELETE CASCADE NOT NULL,
  question     TEXT NOT NULL,
  options      JSONB NOT NULL,
  -- options shape: ["Option A", "Option B", "Option C", "Option D"]
  correct_ans  TEXT NOT NULL,   -- "A" | "B" | "C" | "D"
  marks        INT  DEFAULT 1,
  order_index  INT  DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 4. submissions_v2
--    Universal submissions table for all category types.
--    Existing `submissions` table is UNCHANGED.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions_v2 (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id       UUID REFERENCES competition_categories(id) ON DELETE CASCADE NOT NULL,
  hackathon_id      UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  participant_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id           UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Submission content (only the column matching the category type is filled)
  code_content      TEXT,         -- CODE
  text_content      TEXT,         -- TEXT
  file_url          TEXT,         -- IMAGE / FILE (Supabase Storage URL)
  file_name         TEXT,
  file_size         BIGINT,       -- bytes
  github_url        TEXT,         -- URL
  mcq_answers       JSONB,        -- MCQ: { "q_<uuid>": "A", ... }

  -- AI Judge output
  ai_score          INT,
  ai_feedback       TEXT,
  ai_breakdown      JSONB,        -- { "Creativity": 28, "Technical Depth": 35, ... }
  ai_status         TEXT DEFAULT 'PENDING'
                      CHECK (ai_status IN ('PENDING','PROCESSING','DONE','FAILED')),
  ai_error          TEXT,         -- reason if FAILED

  -- Human judge override
  human_score       INT,
  human_feedback    TEXT,
  human_judged_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  human_judged_at   TIMESTAMPTZ,

  -- Final computed score (AI 40 % + Human 60 % when human reviewed, else AI only)
  final_score       INT,

  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 5. Enable Row Level Security
-- -----------------------------------------------------------
ALTER TABLE competition_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions_v2          ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- 6. RLS Policies — competition_categories
-- -----------------------------------------------------------

-- Public read for active categories of approved hackathons
CREATE POLICY "cat_select_public"
  ON competition_categories FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
        AND (h.is_approved = true
             OR h.organizer_id = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Organiser of the hackathon can manage their own categories
CREATE POLICY "cat_insert_organizer"
  ON competition_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()
    )
  );

CREATE POLICY "cat_update_organizer"
  ON competition_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
        AND (h.organizer_id = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "cat_delete_organizer"
  ON competition_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- 7. RLS Policies — mcq_questions
-- -----------------------------------------------------------

-- Participants only see question + options (NOT correct_ans — enforced by view later)
-- For now: read is open for authenticated users of the hackathon
CREATE POLICY "mcq_select_participant"
  ON mcq_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competition_categories cc
      JOIN hackathons h ON h.id = cc.hackathon_id
      WHERE cc.id = category_id
        AND (h.is_approved = true
             OR h.organizer_id = auth.uid()
             OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "mcq_insert_organizer"
  ON mcq_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competition_categories cc
      JOIN hackathons h ON h.id = cc.hackathon_id
      WHERE cc.id = category_id AND h.organizer_id = auth.uid()
    )
  );

CREATE POLICY "mcq_update_organizer"
  ON mcq_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM competition_categories cc
      JOIN hackathons h ON h.id = cc.hackathon_id
      WHERE cc.id = category_id AND h.organizer_id = auth.uid()
    )
  );

CREATE POLICY "mcq_delete_organizer"
  ON mcq_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM competition_categories cc
      JOIN hackathons h ON h.id = cc.hackathon_id
      WHERE cc.id = category_id AND h.organizer_id = auth.uid()
    )
  );

-- -----------------------------------------------------------
-- 8. RLS Policies — submissions_v2
-- -----------------------------------------------------------

-- Participant sees own; organiser sees all in their hackathon; admin sees all
CREATE POLICY "sub2_select"
  ON submissions_v2 FOR SELECT
  USING (
    participant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated participant inserts own submission
CREATE POLICY "sub2_insert"
  ON submissions_v2 FOR INSERT
  WITH CHECK (participant_id = auth.uid());

-- Participant can update own (e.g. re-submit); organiser/admin can update for judging
CREATE POLICY "sub2_update"
  ON submissions_v2 FOR UPDATE
  USING (
    participant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------------
-- 9. Performance Indexes
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cat_hackathon    ON competition_categories(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_cat_type         ON competition_categories(type);
CREATE INDEX IF NOT EXISTS idx_mcq_category     ON mcq_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_sub2_participant ON submissions_v2(participant_id);
CREATE INDEX IF NOT EXISTS idx_sub2_category    ON submissions_v2(category_id);
CREATE INDEX IF NOT EXISTS idx_sub2_hackathon   ON submissions_v2(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_sub2_ai_status   ON submissions_v2(ai_status);

-- -----------------------------------------------------------
-- 10. Realtime — enable for live leaderboard updates
-- -----------------------------------------------------------
ALTER TABLE submissions_v2 REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add submissions_v2 to the existing realtime publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE submissions_v2;
  END IF;
END $$;

-- -----------------------------------------------------------
-- 11. Trigger: auto-compute final_score on AI or human update
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_final_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.human_score IS NOT NULL THEN
    -- Hybrid: AI 40% + Human 60%
    NEW.final_score := ROUND(COALESCE(NEW.ai_score, 0) * 0.4 + NEW.human_score * 0.6);
  ELSE
    -- AI only
    NEW.final_score := NEW.ai_score;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sub2_score_update
  BEFORE INSERT OR UPDATE OF ai_score, human_score
  ON submissions_v2
  FOR EACH ROW
  EXECUTE FUNCTION compute_final_score();

-- -----------------------------------------------------------
-- DONE — Run the following to verify:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('competition_categories','mcq_questions','submissions_v2');
-- -----------------------------------------------------------
