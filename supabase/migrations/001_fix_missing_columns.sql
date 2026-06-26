-- =============================================================
-- Migration 001: Fix Missing Columns & Tables
-- Run this once in your Supabase SQL Editor
-- =============================================================

-- 1. Add missing columns to hackathons table
ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS payment_details   TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;

-- 2. Add transaction_id to registrations table
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- 3. Create mentor_applications table (referenced by admin dashboard)
CREATE TABLE IF NOT EXISTS mentor_applications (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  applicant_role      TEXT,
  organization        TEXT,
  years_experience    INTEGER DEFAULT 0,
  availability_hours  INTEGER DEFAULT 0,
  expertise           TEXT[] DEFAULT '{}',
  bio                 TEXT,
  why_mentor          TEXT,
  linkedin_url        TEXT,
  github_url          TEXT,
  portfolio_url       TEXT,
  status              TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
  rejection_reason    TEXT,
  reviewed_by         UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for mentor_applications
ALTER TABLE mentor_applications ENABLE ROW LEVEL SECURITY;

-- Admins can read and update all applications
CREATE POLICY "Admins manage mentor applications"
  ON mentor_applications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone (authenticated) can insert their own application
CREATE POLICY "Anyone can apply to be a mentor"
  ON mentor_applications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Applicants can view their own application by email
CREATE POLICY "Applicants can view own application"
  ON mentor_applications FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
