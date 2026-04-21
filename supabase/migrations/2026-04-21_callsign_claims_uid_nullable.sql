-- Allow callsign_claims.uid to be NULL so the Ko-fi webhook can flag supporters
-- for callsigns that have not yet been auth-claimed.
--
-- Context: `callsign_claims.uid` originally defaulted to `auth.uid()` with NOT NULL.
-- The kofi-webhook Edge Function runs as the service role, where `auth.uid()`
-- resolves to NULL. Any supporter whose callsign did not already exist in
-- callsign_claims hit a NOT NULL violation and the webhook returned 500.
--
-- After this change: when a supporter tips before they have ever logged in,
-- we create `{ name: <callsign>, supporter: true, uid: NULL }`. When they later
-- claim the callsign via the login flow, `uid` is filled in and the existing
-- supporter flag is preserved.

ALTER TABLE callsign_claims ALTER COLUMN uid DROP NOT NULL;
