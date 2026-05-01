# Supabase Auth Integration Plan

**Status:** drafted Session 55 · not yet implemented · ~1 session of work

## Why
Identity today is `cod-callsign-v1` (string) + `cod-client-uid-v1` (anon UUID),
both `localStorage`. Clear browser data → all progress lost. No cross-device.
`callsign_claims` joins on callsign string, so a user can't "log in" to their
own supporter status from a new device.

Blocks any future monetization beyond Ko-fi tips and is a pre-launch hygiene
issue if the game gains real traction.

## Recommended approach
**Magic-link email + optional Google OAuth.** No passwords, low friction.
Keep anon UUID flow as a guest tier — players can optionally upgrade.

## Phases

### Phase 1 — Server schema (~1h)
1. Add `auth.users`-backed `profiles` table:
   ```sql
   create table public.profiles (
     id           uuid primary key references auth.users(id) on delete cascade,
     callsign     text unique not null,
     legacy_uid   uuid,           -- old anon UUID, for backfill match
     created_at   timestamptz default now()
   );
   ```
2. Migration: backfill `profiles.legacy_uid` from `callsign_claims.uid` where
   already populated.
3. Add `user_id` column to `leaderboard` (nullable for now). Backfill where
   `client_uid` matches a `profiles.legacy_uid`.

### Phase 2 — Client wiring (~2h)
1. `src/auth.js` — new module wrapping `supabase.auth.signInWithOtp()` and
   `supabase.auth.onAuthStateChange()`.
2. `src/storage.js` — `getAuthUid()` already exists; promote it to first-class.
   Add `getOrCreateUserId()` that prefers session uid, falls back to anon UUID.
3. UI: small "Sign in" chip in HomeV2 top bar. New `<AuthModal>` with email
   input + Google button. On success, call upsert on `profiles` with current
   callsign.

### Phase 3 — Migration UX (~1h)
1. First sign-in: show "Claim your existing progress?" dialog if local UUID
   matches a `legacy_uid` row.
2. On confirm, server-side: copy leaderboard rows from anon UUID → user_id,
   merge career stats, claim callsign in `callsign_claims`.

### Phase 4 — Hardening (~1h)
1. RLS policies on `profiles` (own-row read/write only).
2. Edge Function `submit-score` accepts both legacy anon-UUID submits AND
   authenticated submits during grace period (~30 days).
3. Remove anon-only path after telemetry confirms ≥80% of active users have
   migrated.

## Dependencies
- Supabase project `fjnpzjjyhnpmunfoycrp` is already live with Edge Functions
  + the kofi-webhook flow. This plan plugs into the same project.
- No new external services. Email delivery uses Supabase's built-in SMTP.

## Out of scope for this plan
- Mobile push notifications (separate doc).
- Social features beyond leaderboard (rivalries, friends, parties).
- Cross-game accounts (Studio-wide auth) — flagged for a portfolio-level
  decision, not Call of Doodie alone.

## Trigger to start
Either:
- Game reaches >500 lifetime players (telemetry signal we have something to
  protect), OR
- We decide to ship a paid tier (cosmetic skins, etc.).
