-- =============================================================
-- Migration 002: Add missing 'rules' column to hackathons
-- Run this once in your Supabase SQL Editor
-- =============================================================

ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS rules TEXT;
