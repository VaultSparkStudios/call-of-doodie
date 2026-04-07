# Current State

Public-safe summary:
- this repo remains deployable and the live game is publicly reachable
- the current focus is launch preparation for end users, with terminal-verifiable Phase 1 validation complete
- the live Edge Function health check is now implemented in `scripts/health-check.mjs` and passed against production
- the launch smoke path now has automated coverage in `src/App.launch.test.jsx`
- repeatable live-site verification is now implemented in `scripts/live-site-check.mjs`; `npm run launch:qa` passes against production
- `npm run launch:verify` now combines launch smoke, live Edge Function checks, and live site shell verification in one command
- the Cloudflare security-header worker and Call of Doodie path-specific CSP override are now source-controlled in `cloudflare/`
- the launch execution package is prepared in `docs/LAUNCH_EXECUTION.md`, including itch.io copy, screenshot shot list, and launch channel order
- the remaining Phase 1 checks are physical-only: real PWA install acceptance and one real gamepad/browser combo
- local validation baseline: `npm test` passes with 84/84 tests; `npm run lint` passes with 13 warnings and 0 errors
- internal operational records were sanitized for public-repo safety on 2026-04-03
- detailed internal state now lives in the private Studio OS / ops repository
