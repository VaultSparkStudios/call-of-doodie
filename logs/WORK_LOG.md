# Work Log

This public repo no longer carries the detailed internal work log. Internal session-by-session execution detail is maintained privately.

## 2026-04-06

- Public-safe summary: launch-prep session opened
- Added live Supabase Edge Function health check at `scripts/health-check.mjs`
- Added `npm run health:check`
- Validated production function behavior: missing token rejected, token issue succeeded, mode mismatch rejected, valid submit accepted, token replay rejected
- Added `src/App.launch.test.jsx` to cover username -> menu -> draft -> game startup flow and run-token request path
- Validation baseline after changes: `npm test` 84/84 passing, `npm run lint` passing with 13 warnings
- Added `scripts/live-site-check.mjs` and `npm run launch:qa`
- Verified deployed site shell, manifest, service worker registration, service worker file, and OG image against production
- Remaining Phase 1 checks are hardware/browser-specific and require a real device session

## 2026-04-07

- Source-controlled the Cloudflare security-header worker and Call of Doodie CSP override under `cloudflare/`
- Added `docs/LAUNCH_EXECUTION.md` so the Itch.io copy, screenshot shot list, launch sequence, and telemetry decision live in-repo
- Added `npm run launch:smoke` and `npm run launch:verify`
- Tightened `src/App.launch.test.jsx` to assert the startup run-token payload shape
- Reduced repo-side launch ambiguity so the remaining blockers are execution-only human/device checks
- Verified `npm run launch:verify` successfully against the live backend and live site after sandbox escalation
- Added `scripts/launch-surface-check.mjs` and confirmed homepage, sitemap, live game page branding, and `/games/` visibility on production
- Added `scripts/shared-leaderboard-check.mjs` and confirmed no non-`cod` rows are visible in the latest 200 readable leaderboard entries
- Added `public/launch-assets/` with a ready-to-upload launch media pack so listing publication is no longer blocked on manual screenshot capture

## 2026-04-13 (Session 40)

- Confirmed Edge Function redeploy: `deploy-supabase-function.yml` last ran 2026-04-02 with success
- Validated live leaderboard submit end-to-end: `npm run health:check` → 5/5 assertions passed against production
- Added `src/gameHelpers.test.js` — 26 tests covering spawnEnemy wave 1–3 logic, spawnBoss, BOSS_ROTATION, and mutation flag propagation; total suite now 110/110
- Wired `VITE_POSTHOG_KEY` and `VITE_SENTRY_DSN` into `deploy.yml` build env (secrets to be added via GitHub Settings)
- Populated `public/manifest.json` screenshots (5 entries: 4 wide/desktop, 1 narrow/mobile) to satisfy Chrome desktop PWA install prompt requirement
- Added `apple-mobile-web-app-title` to `index.html` for correct iOS home screen label
- Pushed 2 commits to main; CI confirmed in progress
