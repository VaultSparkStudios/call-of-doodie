# Current State

Public-safe summary:
- this repo remains deployable and the live game is publicly reachable
- the current focus is final launch execution — all code-side launch preparation is complete
- the live Edge Function health check is implemented in `scripts/health-check.mjs` and passed 5/5 against production this session
- the launch smoke path has automated coverage in `src/App.launch.test.jsx`
- repeatable live-site verification is implemented in `scripts/live-site-check.mjs`; `npm run launch:qa` passes against production
- `npm run launch:verify` combines launch smoke, live Edge Function checks, and live site shell verification in one command
- gameplay mechanics are tested in isolation via `src/gameHelpers.test.js` (26 tests: spawnEnemy wave 1–3, spawnBoss, mutation flags)
- `public/manifest.json` now includes 5 screenshots (4 wide/desktop, 1 narrow/mobile) — satisfies Chrome desktop PWA install prompt requirement
- `index.html` has `apple-mobile-web-app-title` set correctly for iOS home screen label
- PostHog (`VITE_POSTHOG_KEY`) and Sentry (`VITE_SENTRY_DSN`) are wired into the deploy.yml build env — secrets to be added via GitHub Settings → Secrets → Actions
- the Cloudflare security-header worker and Call of Doodie path-specific CSP override are source-controlled in `cloudflare/`
- the launch execution package is prepared in `docs/LAUNCH_EXECUTION.md`, including itch.io copy, launch channel order, and a ready-to-upload launch media pack in `public/launch-assets/`
- the remaining launch actions are now exclusively human-executable: real PWA install acceptance on a real device, one real gamepad/browser combo, and Itch.io publication
- local validation baseline: `npm test` passes with 110/110 tests; `npm run lint` passes with 13 warnings and 0 errors
- internal operational records were sanitized for public-repo safety on 2026-04-03
- detailed internal state now lives in the private Studio OS / ops repository
- last updated: 2026-04-13
