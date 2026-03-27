-- IdeaDump Beta — Kör i Supabase SQL Editor
-- https://supabase.com/dashboard/project/wmvxantcujnsathpeqyu/sql

-- 1. Beta-anmälningar
CREATE TABLE IF NOT EXISTS ideadump_beta_signups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL DEFAULT '',
  reason     TEXT        NOT NULL DEFAULT '',
  approved   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ingen RLS behövs — skrivs via service role key från Netlify Function
-- Läsning sker också via service role (admin-sidan)

-- 3. Index för snabb e-postsökning
CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON ideadump_beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_approved ON ideadump_beta_signups(approved);
