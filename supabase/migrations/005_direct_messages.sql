-- ============================================================
-- 005_direct_messages.sql
-- Direct Messaging system for the SMART HUNRISTAN platform
-- Run via: Supabase SQL Editor or supabase db push
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- prevent messaging yourself
  CONSTRAINT no_self_message CHECK (from_id <> to_id)
);

-- ── Indexes ──────────────────────────────────────────────────
-- Efficiently fetch a conversation between two users
CREATE INDEX IF NOT EXISTS idx_dm_participants
  ON direct_messages (
    LEAST(from_id::text, to_id::text),
    GREATEST(from_id::text, to_id::text),
    created_at
  );

-- Fast unread count for a given recipient
CREATE INDEX IF NOT EXISTS idx_dm_unread
  ON direct_messages (to_id, read)
  WHERE read = FALSE;

-- ── Enable Realtime ──────────────────────────────────────────
ALTER TABLE direct_messages REPLICA IDENTITY FULL;

-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages they sent or received
CREATE POLICY "dm_select" ON direct_messages
  FOR SELECT USING (
    auth.uid() = from_id OR auth.uid() = to_id
  );

-- Users can only insert messages they are sending
CREATE POLICY "dm_insert" ON direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = from_id
  );

-- Recipients can mark their own received messages as read
CREATE POLICY "dm_update_read" ON direct_messages
  FOR UPDATE USING (
    auth.uid() = to_id
  ) WITH CHECK (
    auth.uid() = to_id
    AND read = TRUE       -- can only update to read=true
  );

-- ── Helper: unread count per sender, for a given recipient ────
-- Returns table rows so it works in .rpc() calls
CREATE OR REPLACE FUNCTION get_unread_dm_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM direct_messages
  WHERE to_id = p_user_id AND read = FALSE;
$$;

-- ── Helper: list conversations (one row per other party) ──────
-- Returns the latest message in each conversation the user is part of
CREATE OR REPLACE FUNCTION get_dm_conversations(p_user_id UUID)
RETURNS TABLE (
  other_id       UUID,
  other_name     TEXT,
  other_uni      TEXT,
  last_message   TEXT,
  last_at        TIMESTAMPTZ,
  unread_count   BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH convo_latest AS (
    SELECT DISTINCT ON (
      CASE WHEN from_id = p_user_id THEN to_id ELSE from_id END
    )
      CASE WHEN from_id = p_user_id THEN to_id ELSE from_id END AS other_id,
      content AS last_message,
      created_at AS last_at
    FROM direct_messages
    WHERE from_id = p_user_id OR to_id = p_user_id
    ORDER BY CASE WHEN from_id = p_user_id THEN to_id ELSE from_id END, created_at DESC
  ),
  convo_unread AS (
    SELECT 
      from_id AS other_id,
      COUNT(*) AS unread_count
    FROM direct_messages
    WHERE to_id = p_user_id AND read = FALSE
    GROUP BY from_id
  )
  SELECT 
    l.other_id,
    p.full_name AS other_name,
    p.university AS other_uni,
    l.last_message,
    l.last_at,
    COALESCE(u.unread_count, 0) AS unread_count
  FROM convo_latest l
  JOIN profiles p ON p.id = l.other_id
  LEFT JOIN convo_unread u ON u.other_id = l.other_id
  ORDER BY l.last_at DESC;
$$;
