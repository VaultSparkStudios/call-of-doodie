# Task Board

Public-safe launch roadmap summary.

## Human Action Required
- [ ] Physical launch QA — verify PWA install prompt/accept flow on a real mobile/browser combination
- [ ] Physical launch QA — verify one real gamepad/browser combo end-to-end
- [ ] Create Itch.io listing and publish the prepared launch copy package from `docs/LAUNCH_EXECUTION.md`

## Next
- [ ] Optional: capture real gameplay screenshots later for marketing variants beyond the prepared launch media pack

## Done
- [x] Phase 1 launch validation — live Edge Function health check added at `scripts/health-check.mjs` and passed against production (`issue-run-token` + `submit-score`)
- [x] Phase 1 launch validation — minimal launch smoke test added at `src/App.launch.test.jsx` and passing in the full suite
- [x] Phase 1 live QA (terminal-verifiable) — repeatable live site checks added at `scripts/live-site-check.mjs`
- [x] Phase 1 live QA (terminal-verifiable) — `npm run launch:qa` passes against the live backend and deployed site shell/PWA assets
- [x] Source-controlled the Cloudflare Worker / CSP config used by the live deployment path in `cloudflare/`
- [x] Launch execution package prepared in `docs/LAUNCH_EXECUTION.md` with screenshot shot list, Itch.io copy, launch sequence, and telemetry decision
- [x] Added `npm run launch:verify` to combine launch smoke, live function checks, and live site verification
- [x] Added launch-surface visibility checks via `scripts/launch-surface-check.mjs`
- [x] Added shared leaderboard audit via `scripts/shared-leaderboard-check.mjs`
- [x] Prepared a ready-to-upload launch media pack in `public/launch-assets/`
- [x] Verified launch-surface visibility on production: homepage, sitemap, live page branding, and `/games/` all reference Call of Doodie
- [x] Verified readable shared-table state on production: no non-`cod` rows found in the latest 200 leaderboard entries

## Deferred
- [ ] Discord invite/community link when the community entry point is ready
- [ ] Warning-debt cleanup beyond launch-critical issues

## Deferred to Project Agents

- cross-repo item owned by another repo agent:
