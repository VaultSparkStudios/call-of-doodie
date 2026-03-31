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
