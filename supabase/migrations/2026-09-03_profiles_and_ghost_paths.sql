SET search_path TO public;
-- S163: Porcelain Passport cloud backups + top-ghost paths for live ghost races.

-- NOTE (S163): the cloud-backup table was first drafted as public.profiles, which
-- already exists on the shared production project for another product. The
-- backup table is public.cod_profiles (see 2026-09-03_cod_profiles.sql).

-- A downsampled ghost path (<= 8 KB JSON) lets the daily board race the leader.
ALTER TABLE public.leaderboard ADD COLUMN IF NOT EXISTS ghost_path text;
DO $$ BEGIN
  ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_ghost_path_len CHECK (ghost_path IS NULL OR length(ghost_path) <= 8192);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
