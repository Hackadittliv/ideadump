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

-- 2. Aktivera RLS — anon/authenticated har INGEN access. All läsning/skrivning
-- går via service role key från Netlify Functions (beta-signup, check-beta-approved).
-- Detta hindrar email-enumeration via Supabase anon-key.
ALTER TABLE ideadump_beta_signups ENABLE ROW LEVEL SECURITY;
-- Inga policies = default deny för anon och authenticated. Service role bypassar RLS.

-- 3. Index för snabb e-postsökning
CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON ideadump_beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_approved ON ideadump_beta_signups(approved);
