# Current State

Public-safe summary:
- this repo remains deployable and the live game is publicly reachable
- the current focus is launch preparation for end users, with terminal-verifiable Phase 1 validation complete
- the live Edge Function health check is now implemented in `scripts/health-check.mjs` and passed against production
- the launch smoke path now has automated coverage in `src/App.launch.test.jsx`
- repeatable live-site verification is now implemented in `scripts/live-site-check.mjs`; `npm run launch:qa` passes against production
- `npm run launch:verify` now combines launch smoke, live Edge Function checks, and live site shell verification in one command
- launch-surface visibility and shared-table leaderboard auditing are now scriptable via `scripts/launch-surface-check.mjs` and `scripts/shared-leaderboard-check.mjs`
- live launch-surface verification now passes: homepage, sitemap, live game page branding, and the `/games/` hub all reference Call of Doodie
- shared leaderboard audit now passes with no non-`cod` rows found in the latest 200 readable entries, so no shared-table collision is currently visible from the public read path
- the Cloudflare security-header worker and Call of Doodie path-specific CSP override are now source-controlled in `cloudflare/`
- the launch execution package is prepared in `docs/LAUNCH_EXECUTION.md`, including itch.io copy, launch channel order, and a ready-to-upload launch media pack in `public/launch-assets/`
- the remaining launch checks are now narrowed to physical-only validation: real PWA install acceptance, one real gamepad/browser combo, and Itch.io publication
- local validation baseline: `npm test` passes with 84/84 tests; `npm run lint` passes with 13 warnings and 0 errors
- internal operational records were sanitized for public-repo safety on 2026-04-03
- detailed internal state now lives in the private Studio OS / ops repository
