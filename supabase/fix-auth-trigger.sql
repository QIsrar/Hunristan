-- ================================================================
-- FIX: Ensure auth trigger works correctly for profile creation
-- ================================================================
-- This script fixes the handle_new_user() trigger to ensure profiles
-- are created properly when users sign up via Supabase Auth

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate with improved error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role        TEXT;
  v_org_status  TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'participant');
  v_org_status := CASE WHEN v_role = 'organizer' THEN 'pending' ELSE 'approved' END;

  -- Insert profile with explicit error handling
  BEGIN
    INSERT INTO public.profiles (
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
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      organizer_status = EXCLUDED.organizer_status,
      university = COALESCE(EXCLUDED.university, profiles.university),
      degree_program = COALESCE(EXCLUDED.degree_program, profiles.degree_program),
      graduation_year = COALESCE(EXCLUDED.graduation_year, profiles.graduation_year),
      experience_level = COALESCE(EXCLUDED.experience_level, profiles.experience_level),
      organization = COALESCE(EXCLUDED.organization, profiles.organization),
      org_type = COALESCE(EXCLUDED.org_type, profiles.org_type),
      designation = COALESCE(EXCLUDED.designation, profiles.designation),
      org_website = COALESCE(EXCLUDED.org_website, profiles.org_website),
      why_organize = COALESCE(EXCLUDED.why_organize, profiles.why_organize),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled on profiles for consistent access control
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- Verify policies exist
-- ================================================================
-- These should exist, but we'll ensure they do:

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

CREATE POLICY "profiles_select_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR auth.jwt()->>'role' = 'service_role');
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (id = auth.uid() OR auth.jwt()->>'role' = 'service_role');
CREATE POLICY "profiles_delete_own"   ON profiles FOR DELETE USING (id = auth.uid() OR auth.jwt()->>'role' = 'service_role');

GRANT ALL ON public.profiles TO anon, authenticated, service_role;
