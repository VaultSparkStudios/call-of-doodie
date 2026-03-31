-- Launch security hardening for Call of Doodie
-- Apply in Supabase SQL editor or via Supabase migrations.

-- 1. Existing pending leaderboard/supporter columns
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS supporter boolean DEFAULT false;
ALTER TABLE callsign_claims ADD COLUMN IF NOT EXISTS supporter boolean DEFAULT false;

-- 2. Server-side run token table
CREATE TABLE IF NOT EXISTS run_tokens (
  token text PRIMARY KEY,
  uid uuid NOT NULL,
  mode text,
  difficulty text NOT NULL DEFAULT 'normal',
  seed integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_run_tokens_uid ON run_tokens (uid);
CREATE INDEX IF NOT EXISTS idx_run_tokens_expires_at ON run_tokens (expires_at);

ALTER TABLE run_tokens ENABLE ROW LEVEL SECURITY;

-- No client policies on run_tokens. Edge Functions use the service role.
DROP POLICY IF EXISTS "run_tokens_select_none" ON run_tokens;

-- 3. Block direct browser inserts to leaderboard. Server-side Edge Function becomes the only online write path.
DROP POLICY IF EXISTS "allow_insert" ON leaderboard;
DROP POLICY IF EXISTS "verified_insert" ON leaderboard;

-- Keep public read access if it already exists. Add it if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leaderboard'
      AND policyname = 'public_read_leaderboard'
  ) THEN
    CREATE POLICY "public_read_leaderboard"
      ON leaderboard
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- 4. Optional cleanup: delete expired/used run tokens periodically from SQL editor if desired.
-- Example:
-- DELETE FROM run_tokens
-- WHERE expires_at < now() OR used_at IS NOT NULL;
