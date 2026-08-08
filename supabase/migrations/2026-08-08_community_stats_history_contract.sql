-- Community Stats history contract.
-- Aggregates every supported server-side run without a date window or row cap,
-- while separating rich run facts from legacy leaderboard-only evidence.

CREATE OR REPLACE FUNCTION get_cod_community_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH trusted_facts AS (
    SELECT
      player_key::text AS runner_key,
      mode,
      score,
      kills,
      wave,
      duration_s,
      total_damage,
      total_shots,
      total_hits,
      total_crits,
      boss_kills,
      feedback_difficulty,
      completed_at,
      'rich'::text AS source_kind
    FROM game_run_facts
    WHERE game_id = 'cod'
      AND practice = false
      AND is_synthetic = false
  ), legacy_rows AS (
    SELECT
      'legacy:' || lower(coalesce(name, 'anonymous')) AS runner_key,
      coalesce(nullif(mode, ''), 'standard') AS mode,
      coalesce(score, 0) AS score,
      coalesce(kills, 0) AS kills,
      greatest(1, coalesce(wave, 1)) AS wave,
      CASE WHEN time ~ '^\d+:[0-5]\d$'
        THEN split_part(time, ':', 1)::integer * 60 + split_part(time, ':', 2)::integer
        ELSE 0
      END AS duration_s,
      coalesce("totalDamage", 0) AS total_damage,
      coalesce(total_shots, 0) AS total_shots,
      coalesce(total_hits, 0) AS total_hits,
      coalesce(total_crits, 0) AS total_crits,
      coalesce(boss_kills, 0) AS boss_kills,
      feedback_difficulty,
      coalesce(created_at, to_timestamp(coalesce(ts, 0) / 1000.0), now()) AS completed_at,
      'legacy'::text AS source_kind
    FROM leaderboard l
    WHERE coalesce(quarantined, false) = false
      AND coalesce(is_synthetic, false) = false
      AND coalesce(game_id, 'cod') = 'cod'
      AND NOT EXISTS (
        SELECT 1
        FROM game_run_facts f
        WHERE f.run_key = l.source_run_token
      )
  ), all_runs AS (
    SELECT * FROM trusted_facts
    UNION ALL
    SELECT * FROM legacy_rows
  ), mode_counts AS (
    SELECT coalesce(jsonb_object_agg(mode, run_count), '{}'::jsonb) AS value
    FROM (
      SELECT mode, count(*)::integer AS run_count
      FROM all_runs
      GROUP BY mode
    ) grouped
  )
  SELECT jsonb_build_object(
    'scope', 'all_available_server_history',
    'runs', count(*),
    'runners', count(DISTINCT runner_key),
    'hours', round(coalesce(sum(duration_s), 0)::numeric / 3600, 1),
    'kills', coalesce(sum(kills), 0),
    'score', coalesce(sum(score), 0),
    'damage', coalesce(sum(total_damage), 0),
    'shots', coalesce(sum(total_shots), 0),
    'hits', coalesce(sum(total_hits), 0),
    'bosses', coalesce(sum(boss_kills), 0),
    'bestScore', coalesce(max(score), 0),
    'bestKills', coalesce(max(kills), 0),
    'bestWave', coalesce(max(wave), 0),
    'runs24h', count(*) FILTER (WHERE completed_at >= now() - interval '24 hours'),
    'kills24h', coalesce(sum(kills) FILTER (WHERE completed_at >= now() - interval '24 hours'), 0),
    'feedback', jsonb_build_object(
      'too_easy', count(*) FILTER (WHERE feedback_difficulty = 'too_easy'),
      'dialed_in', count(*) FILTER (WHERE feedback_difficulty = 'dialed_in'),
      'brutal', count(*) FILTER (WHERE feedback_difficulty = 'brutal')
    ),
    'modes', (SELECT value FROM mode_counts),
    'coverage', jsonb_build_object(
      'history', 'all_available_server_history',
      'richRuns', count(*) FILTER (WHERE source_kind = 'rich'),
      'legacyRuns', count(*) FILTER (WHERE source_kind = 'legacy'),
      'oldestSupportedAt', min(completed_at),
      'richCoverageStartsAt', min(completed_at) FILTER (WHERE source_kind = 'rich'),
      'durationRuns', count(*) FILTER (WHERE duration_s > 0),
      'damageRuns', count(*) FILTER (WHERE total_damage > 0),
      'accuracyRuns', count(*) FILTER (WHERE total_shots > 0),
      'feedbackRuns', count(*) FILTER (WHERE feedback_difficulty IS NOT NULL),
      'unrecoverablePreTelemetryRuns', 'not_measurable',
      'unknownLegacyMetrics', jsonb_build_array('shots', 'hits', 'criticals', 'bosses', 'feedback')
    ),
    'updatedAt', max(completed_at)
  )
  FROM all_runs;
$$;

REVOKE ALL ON FUNCTION get_cod_community_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cod_community_stats() TO anon, authenticated, service_role;

COMMENT ON FUNCTION get_cod_community_stats() IS
  'All supported Call of Doodie server history: rich completed-run facts plus deduplicated legacy public scores, excluding practice, quarantine, and synthetic automation.';
