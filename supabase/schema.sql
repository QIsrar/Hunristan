-- ================================================================
-- SMART HUNRISTAN HACKATHON PLATFORM — Database Schema v4
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- 1. PROFILES
-- ================================================================
CREATE TABLE profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'participant'
                          CHECK (role IN ('participant','organizer','admin')),
  organizer_status      TEXT DEFAULT 'approved'
                          CHECK (organizer_status IN ('pending','approved','rejected')),
  rejection_reason      TEXT,
  -- Participant fields
  university            TEXT,
  degree_program        TEXT,
  graduation_year       INTEGER,
  experience_level      TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  -- Organizer fields
  organization          TEXT,
  org_type              TEXT CHECK (org_type IN ('university','company','ngo','government','other')),
  designation           TEXT,
  org_website           TEXT,
  why_organize          TEXT,
  -- Shared
  phone                 TEXT,
  avatar_url            TEXT,
  bio                   TEXT,
  github_url            TEXT,
  linkedin_url          TEXT,
  -- Stats
  total_points          INTEGER DEFAULT 0,
  problems_solved       INTEGER DEFAULT 0,
  hackathons_participated INTEGER DEFAULT 0,
  best_rank             INTEGER,
  elo_rating            INTEGER DEFAULT 1200,
  -- Flags
  is_banned             BOOLEAN DEFAULT false,
  ban_reason            TEXT,
  email_verified        BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. EMAIL VERIFICATION TOKENS
-- ================================================================
CREATE TABLE email_verification_tokens (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
);

-- ================================================================
-- 3. HACKATHONS
-- ================================================================
CREATE TABLE hackathons (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title             TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  description       TEXT NOT NULL,
  banner_url        TEXT,
  tags              TEXT[] DEFAULT '{}',
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  max_participants  INTEGER,
  participant_count INTEGER DEFAULT 0,
  allowed_languages TEXT[] DEFAULT '{python,javascript,cpp,java}',
  scoring_method    TEXT DEFAULT 'best_score'
                      CHECK (scoring_method IN ('first_correct','best_score','last_submission')),
  penalty_per_wrong INTEGER DEFAULT 0,
  allow_teams       BOOLEAN DEFAULT false,
  max_team_size     INTEGER DEFAULT 1,
  prize_details     TEXT,
  registration_fee  INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'draft'
                      CHECK (status IN ('draft','active','upcoming','ended','suspended')),
  is_approved       BOOLEAN DEFAULT false,
  leaderboard_frozen BOOLEAN DEFAULT false,
  freeze_time       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. REGISTRATIONS
-- ================================================================
CREATE TABLE registrations (
  id                          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id                UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  user_id                     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id                     UUID,
  payment_status              TEXT DEFAULT 'not_required'
                                CHECK (payment_status IN ('not_required','pending','verified','rejected')),
  payment_screenshot_url      TEXT,
  payment_amount              INTEGER,
  payment_rejection_reason    TEXT,
  registered_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, user_id)
);

-- ================================================================
-- 5. TEAMS
-- ================================================================
CREATE TABLE teams (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  leader_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code  TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  max_size     INTEGER DEFAULT 3,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, name)
);

CREATE TABLE team_members (
  id        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id   UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ================================================================
-- 6. PROBLEMS
-- ================================================================
CREATE TABLE problems (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id     UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL,
  description      TEXT NOT NULL,
  difficulty       TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  time_limit_ms    INTEGER DEFAULT 2000,
  memory_limit_mb  INTEGER DEFAULT 256,
  points           INTEGER NOT NULL DEFAULT 100,
  input_format     TEXT,
  output_format    TEXT,
  constraints_text TEXT,
  sample_input     TEXT,
  sample_output    TEXT,
  explanation      TEXT,
  editorial        TEXT,
  order_index      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, slug)
);

-- ================================================================
-- 7. TEST CASES
-- NOTE: expected_output for hidden test cases is NEVER returned to
--       the client via RLS. All grading happens server-side in
--       /api/submit using the Supabase service-role client.
-- ================================================================
CREATE TABLE test_cases (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  problem_id      UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden       BOOLEAN DEFAULT false,
  order_index     INTEGER DEFAULT 0
);

-- ================================================================
-- 8. SUBMISSIONS
-- ================================================================
CREATE TABLE submissions (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id        UUID REFERENCES hackathons(id) ON DELETE SET NULL,
  problem_id          UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  language            TEXT NOT NULL,
  code                TEXT NOT NULL,
  verdict             TEXT DEFAULT 'pending'
                        CHECK (verdict IN ('accepted','wrong_answer','time_limit_exceeded',
                                           'runtime_error','compilation_error','pending')),
  score               INTEGER DEFAULT 0,
  max_score           INTEGER DEFAULT 0,
  execution_time_ms   INTEGER,
  memory_used_mb      REAL,
  test_cases_passed   INTEGER DEFAULT 0,
  test_cases_total    INTEGER DEFAULT 0,
  ai_feedback         TEXT,
  ai_score            INTEGER,
  ai_time_complexity  TEXT,
  ai_space_complexity TEXT,
  ai_quality_score    INTEGER,
  ai_suggestions      JSONB DEFAULT '[]',
  plagiarism_flag     BOOLEAN DEFAULT false,
  error_message       TEXT,
  submitted_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 9. LEADERBOARD
-- ================================================================
CREATE TABLE leaderboard (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id        UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rank                INTEGER DEFAULT 0,
  total_score         INTEGER DEFAULT 0,
  problems_solved     INTEGER DEFAULT 0,
  penalty_minutes     INTEGER DEFAULT 0,
  last_submission_at  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, user_id)
);

-- ================================================================
-- 10. NOTIFICATIONS
-- ================================================================
CREATE TABLE notifications (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 11. SECURITY LOGS
-- ================================================================
CREATE TABLE security_logs (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hackathon_id   UUID REFERENCES hackathons(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL,
  severity       TEXT DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 12. ANNOUNCEMENTS
-- ================================================================
CREATE TABLE announcements (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 13. MENTORS
-- ================================================================
CREATE TABLE mentors (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  bio          TEXT,
  expertise    TEXT[] DEFAULT '{}',
  avatar_url   TEXT,
  linkedin_url TEXT,
  github_url   TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 14. PROJECTS
-- ================================================================
CREATE TABLE projects (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id  UUID REFERENCES hackathons(id) ON DELETE SET NULL,
  team_name     TEXT NOT NULL,
  project_title TEXT NOT NULL,
  description   TEXT,
  demo_url      TEXT,
  github_url    TEXT,
  technologies  TEXT[] DEFAULT '{}',
  rank_achieved INTEGER,
  is_featured   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 15. ACHIEVEMENTS (definitions)
-- ================================================================
CREATE TABLE achievements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  points      INTEGER DEFAULT 0,
  icon        TEXT DEFAULT '🏅',
  gradient    TEXT DEFAULT 'from-gray-400 to-gray-600'
);

-- ================================================================
-- 16. USER_ACHIEVEMENTS (earned badges)
-- ================================================================
CREATE TABLE user_achievements (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ================================================================
-- 16. RATE LIMITS (for /api/submit)
-- ================================================================
CREATE TABLE rate_limits (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action        TEXT NOT NULL,
  window_start  TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,
  UNIQUE(user_id, action)
);

-- ================================================================
-- 17. DISCUSSION MESSAGES (Problem Q&A)
-- ================================================================
CREATE TABLE discussion_messages (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  problem_id   UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id    UUID REFERENCES discussion_messages(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_organizer BOOLEAN DEFAULT false,
  is_pinned    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems             ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages  ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Profiles
CREATE POLICY "profiles_select_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"    ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Hackathons: public read for approved, organizer manages own, admin all
CREATE POLICY "hackathons_select_approved" ON hackathons FOR SELECT
  USING (is_approved = true OR organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "hackathons_insert_organizer" ON hackathons FOR INSERT
  WITH CHECK (organizer_id = auth.uid() AND
              EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('organizer','admin')));
CREATE POLICY "hackathons_update_organizer" ON hackathons FOR UPDATE
  USING (organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "hackathons_delete_admin" ON hackathons FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Registrations
CREATE POLICY "registrations_select" ON registrations FOR SELECT
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "registrations_insert" ON registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "registrations_update" ON registrations FOR UPDATE
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Teams
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (leader_id = auth.uid());
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (leader_id = auth.uid());

-- Team members
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (true);
CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (user_id = auth.uid());

-- Problems: public read for approved hackathons
CREATE POLICY "problems_select" ON problems FOR SELECT
  USING (EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND
                 (h.is_approved = true OR h.organizer_id = auth.uid() OR
                  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));
CREATE POLICY "problems_insert" ON problems FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()));
CREATE POLICY "problems_update" ON problems FOR UPDATE
  USING (EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND
                 (h.organizer_id = auth.uid() OR
                  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));
CREATE POLICY "problems_delete" ON problems FOR DELETE
  USING (EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()));

-- Test cases: PUBLIC INPUT visible, but EXPECTED OUTPUT hidden for hidden cases
-- All actual grading is done server-side via service role, never exposing expected_output to client
CREATE POLICY "test_cases_select_sample" ON test_cases FOR SELECT
  USING (
    is_hidden = false OR
    EXISTS (
      SELECT 1 FROM problems p
      JOIN hackathons h ON h.id = p.hackathon_id
      WHERE p.id = problem_id AND (
        h.organizer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );
CREATE POLICY "test_cases_insert" ON test_cases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM problems p JOIN hackathons h ON h.id = p.hackathon_id
    WHERE p.id = problem_id AND h.organizer_id = auth.uid()
  ));
CREATE POLICY "test_cases_update" ON test_cases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM problems p JOIN hackathons h ON h.id = p.hackathon_id
    WHERE p.id = problem_id AND h.organizer_id = auth.uid()
  ));

-- Submissions: users see own; organizers see all in their events; admins see all
CREATE POLICY "submissions_select" ON submissions FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "submissions_insert" ON submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Leaderboard: public read
CREATE POLICY "leaderboard_select" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_upsert" ON leaderboard FOR ALL USING (true);

-- Notifications: own only
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Security logs
CREATE POLICY "security_logs_insert" ON security_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "security_logs_select_admin" ON security_logs FOR SELECT
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Announcements
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "announcements_admin" ON announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Mentors & Projects: public read
CREATE POLICY "mentors_select"  ON mentors  FOR SELECT USING (is_active = true);
CREATE POLICY "projects_select" ON projects FOR SELECT USING (true);

-- Achievements: public read
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);

-- User achievements
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT WITH CHECK (true);

-- Rate limits: user can insert/update own
CREATE POLICY "rate_limits_all" ON rate_limits FOR ALL USING (user_id = auth.uid());

-- Discussion messages
CREATE POLICY "discussion_select" ON discussion_messages FOR SELECT USING (true);
CREATE POLICY "discussion_insert" ON discussion_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "discussion_update" ON discussion_messages FOR UPDATE
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "discussion_delete" ON discussion_messages FOR DELETE
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ================================================================
-- INDEXES (for performance)
-- ================================================================
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_hackathon ON submissions(hackathon_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_leaderboard_hackathon ON leaderboard(hackathon_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_discussion_problem ON discussion_messages(problem_id);
CREATE INDEX idx_security_logs_user ON security_logs(user_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ================================================================
-- TRIGGER: Auto-create profile on auth.users INSERT
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role        TEXT;
  v_org_status  TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'participant');
  -- Organizers start pending; participants & admins auto-approved
  v_org_status := CASE WHEN v_role = 'organizer' THEN 'pending' ELSE 'approved' END;

  INSERT INTO profiles (
    id, email, full_name, role, organizer_status,
    university, degree_program, graduation_year, experience_level,
    organization, org_type, designation, org_website, why_organize, phone
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    v_org_status,
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'degree_program',
    NULLIF(NEW.raw_user_meta_data->>'graduation_year', '')::INTEGER,
    NULLIF(NEW.raw_user_meta_data->>'experience_level', ''),
    NEW.raw_user_meta_data->>'organization',
    NULLIF(NEW.raw_user_meta_data->>'org_type', ''),
    NEW.raw_user_meta_data->>'designation',
    NEW.raw_user_meta_data->>'org_website',
    NEW.raw_user_meta_data->>'why_organize',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- TRIGGER: Update leaderboard + profile stats on accepted submission
-- ================================================================
CREATE OR REPLACE FUNCTION update_on_accepted_submission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verdict = 'accepted' AND NEW.hackathon_id IS NOT NULL THEN
    -- Upsert leaderboard
    INSERT INTO leaderboard (hackathon_id, user_id, total_score, problems_solved, last_submission_at)
    VALUES (NEW.hackathon_id, NEW.user_id, NEW.score, 1, NEW.submitted_at)
    ON CONFLICT (hackathon_id, user_id) DO UPDATE SET
      total_score        = leaderboard.total_score + EXCLUDED.total_score,
      problems_solved    = leaderboard.problems_solved + 1,
      last_submission_at = EXCLUDED.last_submission_at,
      updated_at         = NOW();

    -- Refresh ranks within hackathon
    UPDATE leaderboard SET rank = ranked.new_rank
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY hackathon_id
               ORDER BY total_score DESC, last_submission_at ASC
             ) AS new_rank
      FROM leaderboard
      WHERE hackathon_id = NEW.hackathon_id
    ) ranked
    WHERE leaderboard.id = ranked.id;
  END IF;

  IF NEW.verdict = 'accepted' THEN
    -- Update profile stats
    UPDATE profiles SET
      total_points    = total_points + NEW.score,
      problems_solved = problems_solved + 1,
      updated_at      = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_submission_accepted
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_on_accepted_submission();

-- ================================================================
-- TRIGGER: Auto-award achievements on submission
-- ================================================================
CREATE OR REPLACE FUNCTION award_submission_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_solved INTEGER;
  v_total  INTEGER;
BEGIN
  SELECT problems_solved INTO v_solved FROM profiles WHERE id = NEW.user_id;
  SELECT COUNT(*) INTO v_total FROM submissions WHERE user_id = NEW.user_id;

  -- First submission ever
  IF v_total = 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'first_blood') ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.verdict = 'accepted' THEN
    INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'accepted_1') ON CONFLICT DO NOTHING;
    IF v_solved >= 5   THEN INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'solved_5')   ON CONFLICT DO NOTHING; END IF;
    IF v_solved >= 25  THEN INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'solved_25')  ON CONFLICT DO NOTHING; END IF;
    IF v_solved >= 100 THEN INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'solved_100') ON CONFLICT DO NOTHING; END IF;
    IF NEW.score = NEW.max_score AND NEW.max_score > 0 THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'perfectionist') ON CONFLICT DO NOTHING;
    END IF;
    IF NEW.problem_id IN (
      SELECT p.id FROM problems p
      WHERE p.difficulty = 'hard'
    ) THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (NEW.user_id, 'hard_first') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_submission_achievement
  AFTER INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION award_submission_achievements();

-- ================================================================
-- TRIGGER: Award "In the Arena" on first registration
-- ================================================================
CREATE OR REPLACE FUNCTION award_registration_achievement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (NEW.user_id, 'registered_1') ON CONFLICT DO NOTHING;

  UPDATE profiles SET
    hackathons_participated = hackathons_participated + 1,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  UPDATE hackathons SET
    participant_count = participant_count + 1,
    updated_at = NOW()
  WHERE id = NEW.hackathon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_registration_insert
  AFTER INSERT ON registrations
  FOR EACH ROW EXECUTE FUNCTION award_registration_achievement();

-- ================================================================
-- SUPABASE REALTIME — enable for leaderboard
-- ================================================================
ALTER TABLE leaderboard          REPLICA IDENTITY FULL;
ALTER TABLE notifications        REPLICA IDENTITY FULL;
ALTER TABLE discussion_messages  REPLICA IDENTITY FULL;

-- Add tables to realtime publication
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;
  ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE discussion_messages;
COMMIT;

-- ================================================================
-- SEED: Achievement definitions
-- ================================================================
INSERT INTO achievements (id, title, description, category, points, icon, gradient) VALUES
('first_blood',    'First Blood',       'Submit your first solution',               'Beginner',   50,   '🩸', 'from-red-400 to-rose-600'),
('accepted_1',     'Accepted!',         'Get your first Accepted verdict',          'Beginner',   100,  '✅', 'from-green-400 to-emerald-600'),
('registered_1',   'In the Arena',      'Register for your first hackathon',        'Beginner',   50,   '🎟️','from-blue-400 to-cyan-600'),
('solved_5',       'Spark',             'Solve 5 problems',                         'Solver',     200,  '⚡', 'from-yellow-400 to-amber-600'),
('solved_25',      'On Fire',           'Solve 25 problems',                        'Solver',     500,  '🔥', 'from-orange-400 to-red-600'),
('solved_100',     'Century',           'Solve 100 problems',                       'Solver',     2000, '💯', 'from-purple-400 to-pink-600'),
('perfectionist',  'Perfectionist',     'Get 100% score on a submission',           'Difficulty', 300,  '🏆', 'from-amber-300 to-yellow-600'),
('speed_demon',    'Speed Demon',       'Submit within 5 minutes of hackathon start','Speed',     300,  '🚀', 'from-cyan-400 to-blue-600'),
('first_solver',   'First Solver',      'Be the first to solve any problem',        'Speed',      500,  '🥇', 'from-amber-300 to-yellow-600'),
('hard_first',     'Diamond Coder',     'Solve your first Hard-difficulty problem', 'Difficulty', 400,  '💎', 'from-blue-300 to-indigo-700'),
('top_10',         'Top 10',            'Finish in top 10 of any hackathon',        'Community',  750,  '🌟', 'from-violet-400 to-purple-700'),
('clean_record',   'Clean Record',      'Complete 3 hackathons without violations', 'Security',   200,  '🛡️','from-green-500 to-teal-700'),
('mentor_connect', 'Connected',         'Connect with a mentor',                    'Community',  100,  '🤝', 'from-teal-400 to-cyan-600')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- SEED: Sample mentors
-- ================================================================
INSERT INTO mentors (name, bio, expertise, linkedin_url) VALUES
('Dr. Ahmed Khan',  'AI researcher with 10+ years at leading tech firms. Competitive programmer & coach.',   ARRAY['AI/ML','Python','Algorithms'],            'https://linkedin.com'),
('Sara Malik',      'Full-stack engineer, open source contributor. Loves teaching junior developers.',       ARRAY['Web Dev','React','Node.js'],               'https://linkedin.com'),
('Usman Tariq',     'Security expert, CTF champion. Trained 500+ students in cybersecurity.',                ARRAY['Cybersecurity','C++','Networks'],           'https://linkedin.com'),
('Zainab Hussain',  'Data scientist at Fortune 500. PhD. Specializes in NLP and computer vision.',          ARRAY['Data Science','Python','TensorFlow'],       'https://linkedin.com'),
('Kamran Aziz',     'Mobile development lead with apps in 40+ countries. React Native & Flutter expert.',   ARRAY['Mobile','React Native','Flutter'],          'https://linkedin.com'),
('Nadia Sheikh',    'DevOps architect at a top cloud company. Kubernetes expert, conference speaker.',       ARRAY['DevOps','Kubernetes','Go'],                 'https://linkedin.com')
ON CONFLICT DO NOTHING;

-- ================================================================
-- SUPABASE STORAGE SETUP
-- Create these buckets in Supabase Dashboard → Storage:
--   1. "payment-screenshots"  (private, authenticated upload)
--   2. "avatars"              (public, authenticated upload)
-- Then add these storage policies:
-- ================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('payment-screenshots', 'payment-screenshots', false),
--   ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;

-- ================================================================
-- ADMIN ACCOUNT SETUP
-- ================================================================
-- After running this schema, visit:
--   https://your-project.supabase.co/auth/v1/signup
-- OR call the /api/setup-admin endpoint ONCE to auto-create:
--   POST /api/setup-admin
--   Body: { "secret": "your SETUP_SECRET from .env" }
--
-- Default admin credentials:
--   Email:    qisrar951@gmail.com
--   Password: admiN@123
--
-- The /api/setup-admin route uses the Supabase Admin API to:
-- 1. Create auth user
-- 2. Set profile role = 'admin'
-- 3. Disable itself once admin exists
-- ================================================================
