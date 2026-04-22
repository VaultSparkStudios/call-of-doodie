# Supabase Functions

## `issue-run-token`

Server-side run token issuer for Call of Doodie.

Purpose:
- Verifies the caller has an authenticated Supabase session
- Creates a one-time run token bound to mode, difficulty, and seed
- Gives `submit-score` a server-minted token to validate against

Deploy:

```bash
supabase functions deploy issue-run-token --project-ref <project-ref>
```

## `submit-score`

Server-side score submission path for Call of Doodie.

Purpose:
- Verifies the caller has an authenticated Supabase session
- Requires a live server-issued run token
- Re-checks callsign ownership on the server
- Normalizes/clamps leaderboard payloads before insert
- Prevents the browser client from inserting leaderboard rows directly
- Awards Vault points server-side for real Vault Members

Required function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Set them in Supabase:

```bash
supabase secrets set \
  SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  SUPABASE_ANON_KEY=YOUR_ANON_KEY \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
  --project-ref <project-ref>
```

Deploy:

```bash
supabase functions deploy submit-score --project-ref <project-ref>
```

Required DB migration:
- `supabase/migrations/2026-03-30_launch_security.sql`

Optional GitHub Actions secrets for automatic deploy on push:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

If `callsign_claims.supporter` has been migrated, the function will use that field as the authoritative source of the leaderboard supporter badge.

## `kofi-webhook`

Receives Ko-fi purchase/donation webhooks and flips the `supporter` flag on a matching `callsign_claims` row.

Behaviour:
- Validates `verification_token` in the posted payload against `KOFI_VERIFICATION_TOKEN`
- Extracts the player's callsign from the Ko-fi `message` field (buyer pastes it at checkout); falls back to `from_name`
- Upserts `callsign_claims.supporter = true` for that name
- Logs the event to `kofi_events` keyed by `message_id` for idempotency

Required function secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KOFI_VERIFICATION_TOKEN` — paste the token from Ko-fi → More → Settings → API & Webhooks

```bash
supabase secrets set \
  KOFI_VERIFICATION_TOKEN=YOUR_KOFI_TOKEN \
  --project-ref <project-ref>
```

Deploy:

```bash
supabase functions deploy kofi-webhook --project-ref <project-ref>
```

Webhook URL to paste into Ko-fi:

```
https://<project-ref>.supabase.co/functions/v1/kofi-webhook
```

Required DB migration:
- `supabase/migrations/2026-04-14_kofi_webhook.sql`

## `sync-studio-events`

Server-side mirror for browser-local Studio event history.

Purpose:
- Accepts batched front-door, debrief, telemetry, rivalry, and trust events
- Preserves the game's local-first UX while making downstream analysis possible
- Deduplicates on `client_event_id` so retries are safe

Required function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy:

```bash
supabase functions deploy sync-studio-events --project-ref <project-ref>
```

Required DB migration:
- `supabase/migrations/2026-04-22_studio_game_events.sql`
