-- =============================================================
-- Migration 004: Teams, Community & Submission Rules
-- Run in Supabase SQL Editor after Migration 003
-- =============================================================

-- -----------------------------------------------------------
-- 1. Extend competition_categories with submission rules
-- -----------------------------------------------------------
ALTER TABLE competition_categories
  ADD COLUMN IF NOT EXISTS max_submissions    INT     DEFAULT 1,      -- max attempts per participant
  ADD COLUMN IF NOT EXISTS allow_resubmit     BOOLEAN DEFAULT TRUE,   -- can participant update submission
  ADD COLUMN IF NOT EXISTS time_limit_required BOOLEAN DEFAULT FALSE; -- true for MCQ categories

-- MCQ categories should always enforce time limit
-- (validated in UI — this is a data hint for the frontend)
UPDATE competition_categories
  SET time_limit_required = TRUE
  WHERE type = 'MCQ' AND time_limit_required = FALSE;

-- -----------------------------------------------------------
-- 2. Add submission_count tracking to submissions_v2
-- -----------------------------------------------------------
ALTER TABLE submissions_v2
  ADD COLUMN IF NOT EXISTS submission_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS time_taken_secs  INT;   -- seconds actually used (for MCQ/CODE with timer)

-- -----------------------------------------------------------
-- 3. teams table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  invite_code  TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
  leader_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  max_members  INT  DEFAULT 4,
  is_open      BOOLEAN DEFAULT TRUE,    -- open to join requests
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 4. team_members junction table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id    UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role       TEXT DEFAULT 'member' CHECK (role IN ('leader','member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- -----------------------------------------------------------
-- 5. community_posts — platform-wide discussion board
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_posts (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE SET NULL,   -- NULL = platform-wide
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  post_type    TEXT DEFAULT 'discussion'
                 CHECK (post_type IN ('discussion','team_request','announcement','showcase')),
  upvotes      INT  DEFAULT 0,
  is_pinned    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 6. community_replies
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_replies (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id    UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  upvotes    INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 7. community_upvotes — prevent duplicate upvotes
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_upvotes (
  id       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id  UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES community_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id),
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- -----------------------------------------------------------
-- 8. Enable RLS
-- -----------------------------------------------------------
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_upvotes ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- 9. RLS Policies — teams
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (TRUE); -- public read

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (leader_id = auth.uid());

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (leader_id = auth.uid());

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (leader_id = auth.uid());

-- -----------------------------------------------------------
-- 10. RLS Policies — team_members
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "tm_select" ON team_members;
CREATE POLICY "tm_select" ON team_members FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "tm_insert" ON team_members;
CREATE POLICY "tm_insert" ON team_members FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tm_delete" ON team_members;
CREATE POLICY "tm_delete" ON team_members FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------------------
-- 11. RLS Policies — community
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "cp_select" ON community_posts;
CREATE POLICY "cp_select" ON community_posts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cp_insert" ON community_posts;
CREATE POLICY "cp_insert" ON community_posts FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "cp_update" ON community_posts;
CREATE POLICY "cp_update" ON community_posts FOR UPDATE USING (
  author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "cp_delete" ON community_posts;
CREATE POLICY "cp_delete" ON community_posts FOR DELETE USING (
  author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "cr_select" ON community_replies;
CREATE POLICY "cr_select" ON community_replies FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cr_insert" ON community_replies;
CREATE POLICY "cr_insert" ON community_replies FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "cr_delete" ON community_replies;
CREATE POLICY "cr_delete" ON community_replies FOR DELETE USING (
  author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "cu_select" ON community_upvotes;
CREATE POLICY "cu_select" ON community_upvotes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "cu_insert" ON community_upvotes;
CREATE POLICY "cu_insert" ON community_upvotes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cu_delete" ON community_upvotes;
CREATE POLICY "cu_delete" ON community_upvotes FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------------------
-- 12. Indexes
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teams_hackathon      ON teams(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader         ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_tm_team              ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tm_user              ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_author            ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_cp_hackathon         ON community_posts(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_cp_type              ON community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_cp_created           ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_post              ON community_replies(post_id);

-- -----------------------------------------------------------
-- 13. Realtime for community
-- -----------------------------------------------------------
ALTER TABLE community_posts   REPLICA IDENTITY FULL;
ALTER TABLE community_replies REPLICA IDENTITY FULL;
ALTER TABLE team_members      REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
    ALTER PUBLICATION supabase_realtime ADD TABLE community_replies;
    ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
  END IF;
END $$;

-- -----------------------------------------------------------
-- 14. API route for teams (helper function)
-- -----------------------------------------------------------
-- Function to join a team by invite code
CREATE OR REPLACE FUNCTION join_team_by_code(p_invite_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_team teams%ROWTYPE;
  v_member_count INT;
BEGIN
  SELECT * INTO v_team FROM teams WHERE invite_code = UPPER(TRIM(p_invite_code));
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid invite code');
  END IF;

  -- Check capacity
  SELECT COUNT(*) INTO v_member_count FROM team_members WHERE team_id = v_team.id;
  IF v_member_count >= v_team.max_members THEN
    RETURN json_build_object('error', 'Team is full');
  END IF;

  -- Check already member
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = v_team.id AND user_id = auth.uid()) THEN
    RETURN json_build_object('error', 'Already in this team');
  END IF;

  -- Insert
  INSERT INTO team_members(team_id, user_id, role) VALUES (v_team.id, auth.uid(), 'member');
  RETURN json_build_object('success', true, 'team_id', v_team.id, 'team_name', v_team.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- VERIFY: run these to confirm tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('teams','team_members','community_posts','community_replies');
-- -----------------------------------------------------------
