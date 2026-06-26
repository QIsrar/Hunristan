-- =============================================================
-- Migration 008: Teams Compulsory
-- Run in Supabase SQL Editor
-- =============================================================

ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS teams_compulsory BOOLEAN DEFAULT false;
