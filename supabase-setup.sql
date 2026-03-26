-- IdeaDump — Supabase SQL Setup
-- Kör detta i Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yvfavybujwahukcxkfol/sql

-- 1. Skapa tabell
CREATE TABLE IF NOT EXISTS ideadump_user_data (
  user_id    UUID        PRIMARY KEY,
  data       JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Aktivera Row Level Security
ALTER TABLE ideadump_user_data ENABLE ROW LEVEL SECURITY;

-- 3. Policy: användaren kan bara läsa/skriva sin egen data
CREATE POLICY "Users can manage own data"
  ON ideadump_user_data
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
