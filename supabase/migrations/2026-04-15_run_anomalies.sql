-- Trust v2 support table for server-side anomaly logging.
-- Apply before deploying the updated submit-score Edge Function if you want
-- rejection/mismatch events persisted for review.

CREATE TABLE IF NOT EXISTS run_anomalies (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  token text,
  uid uuid,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_run_anomalies_created_at ON run_anomalies (created_at desc);
CREATE INDEX IF NOT EXISTS idx_run_anomalies_reason ON run_anomalies (reason);

ALTER TABLE run_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "run_anomalies_select_none" ON run_anomalies;
