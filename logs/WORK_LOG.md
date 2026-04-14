# Work Log

This public repo no longer carries the detailed internal work log. Internal session-by-session execution detail is maintained privately.

## 2026-04-14 (Session 42)

- Audited the project surface and converted the findings into a durable roadmap in `docs/IMPROVEMENT_PLAN.md`
- Hardened `supabase/functions/submit-score/index.ts` with plausibility gates for kills, damage, score, level, and rate-based envelopes
- Fixed claimed-callsign validation in the score submit path to compare against the resolved caller uid
- Added `src/utils/runDebrief.js` + tests and upgraded the death screen into a tactical debrief with verdict, identity, strengths, and next-step guidance
- Added a command briefing to the main menu so mode/loadout selection is framed before the player deploys
- Added `src/utils/buildArchetypes.js` + tests and wired archetype capstone unlocks into the perk flow
- Surfaced current build identity in the HUD and tagged build-fit recommendations in the perk, shop, and route modals
- Re-verified the client suite: `npm test` 116/116 and `npm run lint` 0 errors / 13 baseline warnings

## 2026-04-13 (Session 41)

- Launch-readiness audit: ran `npm test` (110/110), `npm run lint` (0 errors), `npm run launch:verify` (14/14 live assertions) — baseline clean
- Identified in-repo fixable gaps: PNG icons missing, Ko-fi webhook absent, flaky launch smoke near 5s timeout
- Shipped `scripts/generate-icons.mjs` using sharp; generated `public/icon-192.png` + `public/icon-512.png`
- Wired PNG icons into `public/manifest.json` (any + maskable), `index.html` (icon + apple-touch-icon links), `public/sw.js` (cache version bumped to cod-v4)
- Added `prebuild` npm script so icons regenerate on every `npm run build`; added manual `icons:generate` script
- Added sharp to devDependencies
- Shipped `supabase/functions/kofi-webhook/index.ts`: Ko-fi verification-token validation, callsign extraction from `message`/`from_name`, idempotent via `kofi_events.message_id`
- Added `supabase/migrations/2026-04-14_kofi_webhook.sql` with `kofi_events` audit table + RLS
- Extended `.github/workflows/deploy-supabase-function.yml` to auto-deploy the kofi-webhook function on push
- Updated `supabase/functions/README.md` with kofi-webhook deploy instructions
- Raised Vitest `testTimeout` to 15000ms in `vite.config.js` after observing launch-smoke variance of 1.2s–5.5s
- Re-verified end-to-end: `npm test` 110/110, `npm run build` produces working dist/ including generated PNGs, `npm run launch:verify` 14/14 live assertions

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
