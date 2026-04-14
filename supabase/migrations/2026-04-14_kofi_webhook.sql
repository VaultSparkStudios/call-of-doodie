-- Ko-fi webhook support for Call of Doodie.
-- Adds an audit log table consumed by the kofi-webhook Edge Function.

CREATE TABLE IF NOT EXISTS kofi_events (
  id bigserial PRIMARY KEY,
  message_id text UNIQUE,
  kofi_type text,
  email text,
  callsign text,
  amount text,
  currency text,
  supporter_updated boolean NOT NULL DEFAULT false,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kofi_events_callsign ON kofi_events (callsign);
CREATE INDEX IF NOT EXISTS idx_kofi_events_email ON kofi_events (email);

ALTER TABLE kofi_events ENABLE ROW LEVEL SECURITY;

-- No client policies. The Edge Function uses the service role.
DROP POLICY IF EXISTS "kofi_events_select_none" ON kofi_events;
