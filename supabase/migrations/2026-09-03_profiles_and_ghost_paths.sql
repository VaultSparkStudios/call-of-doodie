-- S163: Porcelain Passport cloud backups + top-ghost paths for live ghost races.

CREATE TABLE IF NOT EXISTS profiles (
  subject text PRIMARY KEY,
  backup jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- No anon policies on purpose: only the service-role Pages Function reads or
-- writes a row, after verifying the subject against the Obelisk upstream.

-- A downsampled ghost path (<= 8 KB JSON) lets the daily board race the leader.
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS ghost_path text;
DO $$ BEGIN
  ALTER TABLE leaderboard ADD CONSTRAINT leaderboard_ghost_path_len CHECK (ghost_path IS NULL OR length(ghost_path) <= 8192);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
