-- Reversible public leaderboard quarantine + bounded public Edge Function usage.

ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS quarantined boolean NOT NULL DEFAULT false;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS quarantine_reason text;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS quarantined_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leaderboard_public_rank
  ON leaderboard (game_id, score DESC)
  WHERE quarantined = false;

DROP POLICY IF EXISTS "public_read_leaderboard" ON leaderboard;
CREATE POLICY "public_read_leaderboard"
  ON leaderboard
  FOR SELECT
  USING (quarantined = false);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_rate_limits_select_none" ON api_rate_limits;

CREATE OR REPLACE FUNCTION consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_hits integer;
BEGIN
  IF p_key IS NULL OR length(p_key) < 12 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO api_rate_limits AS limits (bucket_key, window_start, hits, updated_at)
  VALUES (p_key, now(), 1, now())
  ON CONFLICT (bucket_key) DO UPDATE SET
    window_start = CASE
      WHEN limits.window_start <= now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE limits.window_start
    END,
    hits = CASE
      WHEN limits.window_start <= now() - make_interval(secs => p_window_seconds) THEN 1
      ELSE limits.hits + 1
    END,
    updated_at = now()
  RETURNING hits INTO current_hits;

  RETURN current_hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION consume_api_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_api_rate_limit(text, integer, integer) TO service_role;

COMMENT ON TABLE api_rate_limits IS 'Hashed, non-identifying abuse buckets for public Edge Function quotas.';
COMMENT ON COLUMN leaderboard.quarantined IS 'Operator-reviewed trust state; quarantined rows remain recoverable but are hidden by Row Level Security.';
