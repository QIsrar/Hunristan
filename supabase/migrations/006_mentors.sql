-- 1. Create mentors table
DROP TABLE IF EXISTS mentors CASCADE;
CREATE TABLE IF NOT EXISTS mentors (
  id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  bio                 TEXT,
  expertise           TEXT[] DEFAULT '{}',
  linkedin_url        TEXT,
  github_url          TEXT,
  availability_hours  INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create mentor_stats table
DROP VIEW IF EXISTS mentor_stats CASCADE;
CREATE TABLE IF NOT EXISTS mentor_stats (
  mentor_id           UUID PRIMARY KEY REFERENCES mentors(id) ON DELETE CASCADE,
  total_sessions      INTEGER DEFAULT 0,
  avg_rating          NUMERIC(3, 2) DEFAULT 0.00,
  total_ratings       INTEGER DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for mentors
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active mentors"
  ON mentors FOR SELECT
  USING (is_active = true);

CREATE POLICY "Mentors can manage their own profile"
  ON mentors FOR ALL
  USING (auth.uid() = id);

-- RLS for mentor_stats
ALTER TABLE mentor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mentor stats"
  ON mentor_stats FOR SELECT
  USING (true);

-- 3. Trigger to auto-create mentor profile upon application approval
CREATE OR REPLACE FUNCTION approve_mentor_application()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Find the user profile by email
    SELECT id INTO v_user_id FROM profiles WHERE email = NEW.email;
    
    IF v_user_id IS NOT NULL THEN
      -- Update profile role (if currently participant)
      UPDATE profiles SET role = 'mentor' WHERE id = v_user_id AND role = 'participant';
      
      -- Insert into mentors table
      INSERT INTO mentors (id, name, bio, expertise, linkedin_url, github_url, availability_hours)
      VALUES (
        v_user_id,
        NEW.full_name,
        COALESCE(NEW.bio, ''),
        NEW.expertise,
        NEW.linkedin_url,
        NEW.github_url,
        NEW.availability_hours
      ) ON CONFLICT (id) DO NOTHING;
      
      -- Insert into mentor_stats
      INSERT INTO mentor_stats (mentor_id)
      VALUES (v_user_id) ON CONFLICT (mentor_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_mentor_approved ON mentor_applications;

CREATE TRIGGER on_mentor_approved
AFTER UPDATE ON mentor_applications
FOR EACH ROW EXECUTE FUNCTION approve_mentor_application();
