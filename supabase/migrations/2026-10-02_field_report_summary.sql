-- Public, aggregate-only view of consented post-run field reports.
-- Raw comments never enter studio_game_events; identities remain private.
CREATE OR REPLACE FUNCTION get_cod_field_report_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH reports AS (
    SELECT
      coalesce(uid::text, client_uid::text) AS reporter_key,
      payload->>'sentiment' AS sentiment,
      payload->>'reason' AS reason,
      payload->>'mode' AS mode,
      event_created_at
    FROM studio_game_events
    WHERE game_id = 'cod' AND type = 'field_report_v2' AND category = 'feedback'
      AND received_at >= now() - interval '90 days'
      AND payload->>'sentiment' IN ('too_easy', 'dialed_in', 'brutal')
  ), reporter_counts AS (
    SELECT reporter_key, count(*) AS n, min(event_created_at) AS first_at,
      max(event_created_at) AS last_at
    FROM reports WHERE reporter_key IS NOT NULL GROUP BY reporter_key
  ), reason_counts AS (
    SELECT coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) AS value
    FROM (SELECT reason, count(*)::integer AS n FROM reports
      WHERE reason IN ('controls','clarity','pacing','balance','bug','other')
      GROUP BY reason) grouped
  ), mode_counts AS (
    SELECT coalesce(jsonb_object_agg(mode, n), '{}'::jsonb) AS value
    FROM (SELECT mode, count(*)::integer AS n FROM reports
      WHERE mode ~ '^[a-z_]{1,40}$' GROUP BY mode) grouped
  )
  SELECT jsonb_build_object(
    'schemaVersion', 'field-report-summary-v1',
    'responses', (SELECT count(*) FROM reports),
    'reporters', (SELECT count(*) FROM reporter_counts),
    'returningReporters', (SELECT count(*) FROM reporter_counts
      WHERE n >= 2 AND last_at - first_at >= interval '24 hours'),
    'runnerSample', (SELECT count(DISTINCT player_key) FROM game_run_facts
      WHERE game_id = 'cod' AND practice = false AND is_synthetic = false),
    'sentiments', jsonb_build_object(
      'too_easy', (SELECT count(*) FROM reports WHERE sentiment = 'too_easy'),
      'dialed_in', (SELECT count(*) FROM reports WHERE sentiment = 'dialed_in'),
      'brutal', (SELECT count(*) FROM reports WHERE sentiment = 'brutal')
    ),
    'reasons', (SELECT value FROM reason_counts),
    'modes', (SELECT value FROM mode_counts),
    'latestAt', (SELECT max(event_created_at) FROM reports)
  );
$$;

REVOKE ALL ON FUNCTION get_cod_field_report_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_cod_field_report_summary() TO anon, authenticated, service_role;
COMMENT ON FUNCTION get_cod_field_report_summary() IS
  'Counts consented Call of Doodie field reports without exposing identities or comments. Returning reporter means two reports at least 24 hours apart; runner sample counts rich non-practice run facts separately.';
