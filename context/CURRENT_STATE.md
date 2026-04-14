# Current State

Public-safe summary:
- this repo remains deployable and the live game is publicly reachable
- the current focus is final launch execution — all code-side launch preparation is complete
- the live Edge Function health check is implemented in `scripts/health-check.mjs` and passed 5/5 against production this session
- the launch smoke path has automated coverage in `src/App.launch.test.jsx`
- repeatable live-site verification is implemented in `scripts/live-site-check.mjs`; `npm run launch:qa` passes against production
- `npm run launch:verify` combines launch smoke, live Edge Function checks, and live site shell verification in one command
- gameplay mechanics are tested in isolation via `src/gameHelpers.test.js` (26 tests: spawnEnemy wave 1–3, spawnBoss, mutation flags)
- `public/manifest.json` now includes 5 screenshots (4 wide/desktop, 1 narrow/mobile) plus PNG icon entries (192/512 any + 512 maskable) alongside the SVG fallback — satisfies Chrome desktop PWA install prompt requirement
- `public/icon-192.png` and `public/icon-512.png` are committed; `scripts/generate-icons.mjs` (sharp-based) regenerates them from `icon.svg` on `npm run build` via a `prebuild` hook
- `index.html` has `apple-mobile-web-app-title` set correctly for iOS home screen label and now links PNG icon + apple-touch-icon variants
- `public/sw.js` is at cache version `cod-v4` and precaches the new PNG icons
- PostHog (`VITE_POSTHOG_KEY`) and Sentry (`VITE_SENTRY_DSN`) are wired into the deploy.yml build env — secrets to be added via GitHub Settings → Secrets → Actions
- the Cloudflare security-header worker and Call of Doodie path-specific CSP override are source-controlled in `cloudflare/`
- the launch execution package is prepared in `docs/LAUNCH_EXECUTION.md`, including itch.io copy, launch channel order, and a ready-to-upload launch media pack in `public/launch-assets/`
- supporter purchases can now be automated: `supabase/functions/kofi-webhook/` validates Ko-fi's `verification_token`, extracts the callsign from the `message` field, flips `callsign_claims.supporter = true`, and logs to the new `kofi_events` audit table (migration `2026-04-14_kofi_webhook.sql`); GitHub Actions auto-deploys the function on push
- `vite.config.js` sets `testTimeout: 15000` so the launch smoke test is stable on slow CI runners (observed range 1.2s–5.5s)
- Session 42 added a ranked refinement roadmap in `docs/IMPROVEMENT_PLAN.md`; the highest-value in-repo focus is now leaderboard trust, stronger post-run coaching, and clearer mode/loadout guidance before deeper content expansion
- the score-submit Edge Function now performs plausibility checks across score, kills, damage, level, and time envelopes before writing leaderboard rows
- a build-identity layer now exists in-run: aligned perk compositions unlock archetype capstones (Vanguard, Gunslinger, Demolitionist, Tempo), and perk/shop/route screens expose build-fit recommendations so choices are more legible
- the death screen now acts as a tactical debrief instead of a pure stat dump, and the menu now frames the selected mode/loadout before deployment
- the remaining launch actions are now exclusively human-executable: real PWA install acceptance on a real device, one real gamepad/browser combo, and Itch.io publication
- local validation baseline: `npm test` passes with 116/116 tests; `npm run lint` passes with 13 warnings and 0 errors; `npm run launch:verify` last known passing baseline remains 14/14 live assertions
- internal operational records were sanitized for public-repo safety on 2026-04-03
- detailed internal state now lives in the private Studio OS / ops repository
- last updated: 2026-04-14
