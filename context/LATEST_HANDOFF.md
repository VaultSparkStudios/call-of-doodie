# Latest Handoff — Session 31 Closeout

This is the authoritative active handoff file for this repo.

**Session Intent:** Implement the remaining needed security updates, reduce the launch task list to real blockers, and refresh all Studio OS memory/handoff files.
**Date:** 2026-03-30
**Branch:** `main`, dirty (Session 31 changes not yet committed)
**Build:** ✅ `npm run build` passes (768.25KB bundle) · ✅ `npm test` passes (70/70) · ✅ `npm run lint` passes (67 warnings, 0 errors)

---

## Where We Left Off (Session 31)
- Fixed speedrun leaderboard ordering so speedrun runs rank by time instead of score
- Added Speedrun/Gauntlet achievement coverage
- Hardened leaderboard entry normalization and restored supporter badge persistence
- Moved online score submission to a Supabase Edge Function contract
- Added one-time run-token verification, a checked-in launch-security migration, and a dedicated OG preview image
- Aligned lint/CI behavior and fixed the broken callsign claim import

---

## Human Action Required

- [ ] **Run launch security migration** — Apply `supabase/migrations/2026-03-30_launch_security.sql` in Supabase
- [ ] **Supabase function deploy secrets** — Add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` to GitHub Actions secrets so `deploy-supabase-function.yml` can deploy `issue-run-token` + `submit-score`
- [ ] **Supabase function env secrets** — Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for the new Edge Functions

---

## What was done this session (Session 31)

### Audit-driven launch-readiness fixes
- **Speedrun correctness:** `LeaderboardPanel.jsx` now sorts speedrun runs by `time` ascending, and `getPlayerGlobalRank(...)` in `storage.js` now handles speedrun ranking by time instead of raw score.
- **Security / integrity hardening:** `storage.js` now normalizes leaderboard payloads before save/read (text sanitization, numeric clamps, allowlisted mode/device values). This does not solve authoritative anti-cheat, but it removes a chunk of client-side garbage input risk.
- **Supporter persistence fix:** leaderboard save/read paths now preserve `supporter`, so the cosmetic supporter badge actually survives submission/display.
- **Mode content parity:** `constants.js` now includes four new achievements covering Speedrun and Gauntlet runs; tests updated accordingly.
- **Server-side submit path:** `src/storage.js` now invokes the Supabase Edge Function `submit-score`, and `supabase/functions/submit-score/index.ts` verifies auth/callsign ownership server-side before insert.
- **Run-token hardening:** `issue-run-token` mints one-time tokens at run start; `submit-score` now requires a matching unused token bound to the same mode/difficulty/seed before it will insert.
- **DB security migration:** `supabase/migrations/2026-03-30_launch_security.sql` adds the run-token table, pending supporter/prestige columns, and removes direct client leaderboard insert policies.
- **Marketing prep:** `index.html`, `public/manifest.json`, `public/og-image.svg`, `README.md`, and menu share copy now describe the live feature set accurately and expose better SEO/social metadata.
- **Lint alignment:** local and CI lint commands now use ESLint 9 flat-config compatible invocations, so `npm run lint` passes again while preserving warning visibility.
- **Bug fix:** `claimCallsign()` in `storage.js` now imports `getAuthUid()` correctly.

## Files modified (session 31)
- `src/storage.js` — leaderboard normalization, supporter persistence, run-token submit hook, fixed callsign auth import
- `src/components/LeaderboardPanel.jsx` — speedrun-aware sorting in the UI
- `src/App.jsx` — speedrun/gauntlet achievement state + mode-aware rank lookup
- `src/constants.js` — 4 new achievements
- `src/storage.test.js` — new helper coverage
- `src/constants.test.js` — achievement count updated
- `supabase/functions/issue-run-token/index.ts` — one-time run token issuer
- `supabase/functions/submit-score/index.ts` — verified server-side online submit path
- `supabase/migrations/2026-03-30_launch_security.sql` — launch security DB migration
- `.github/workflows/deploy-supabase-function.yml` — auto-deploy workflow for the Edge Function
- `index.html` — SEO/share metadata refresh
- `public/og-image.svg` — dedicated OG/Twitter preview asset
- `public/manifest.json` — description refresh
- `public/sw.js` — OG asset added to shell cache
- `README.md` — marketing + feature-count refresh
- `src/components/MenuScreen.jsx` — updated share copy
- `package.json`, `.github/workflows/deploy.yml` — ESLint 9-compatible lint command alignment

---

## Suggested next session priorities

1. Run the checked-in launch-security migration in Supabase
2. Add the remaining Supabase function deploy/env secrets so the new verified submit path can go live without manual deploy steps
3. Push/deploy so the hardened path lands in production
4. Reduce warning debt so `npm run lint:strict` becomes a viable gate again
5. Add a campaign-oriented menu hero for "Play Today's Seed / Beat This Score"

## Optional follow-up after launch blockers

1. Turn on PostHog by setting `VITE_POSTHOG_KEY`
2. Turn on Sentry by setting `VITE_SENTRY_DSN`
3. Reduce warning debt so `npm run lint:strict` can become a hard gate
4. Add a menu hero for daily/seeded challenge traffic

---

## Game Modes (all mutually exclusive, leaderboard mode field)

| Mode | Ref | mode string |
|------|-----|-------------|
| Normal | — | null |
| Score Attack | `scoreAttackRef` | `"score_attack"` |
| Daily Challenge | `dailyChallengeRef` | `"daily_challenge"` |
| Cursed Run | `cursedRunRef` | `"cursed"` |
| Boss Rush | `bossRushRef` | `"boss_rush"` |
| Speedrun | `speedrunRef` | `"speedrun"` |
| Gauntlet | `gauntletRef` | `"gauntlet"` |

---

## Key env vars (GitHub Actions secrets)

| Var | Purpose |
|-----|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_POSTHOG_KEY` | PostHog analytics (optional — silent no-op if absent) |
| `VITE_SENTRY_DSN` | Sentry error tracking (optional — silent no-op if absent) |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions secret for auto-deploying Edge Functions |
| `SUPABASE_PROJECT_REF` | GitHub Actions secret for targeting the Supabase project |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Edge Function runtime secrets for `issue-run-token` and `submit-score` |
