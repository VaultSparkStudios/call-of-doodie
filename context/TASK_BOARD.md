# Task Board

Public-safe launch roadmap summary.

## Human Action Required
- [ ] Physical launch QA — verify PWA install prompt/accept flow on a real mobile/browser combination
- [ ] Physical launch QA — verify one real gamepad/browser combo end-to-end
- [ ] Capture 4-6 launch screenshots for store/distribution surfaces
- [ ] Create Itch.io listing and publish the existing launch copy package
- [ ] Spot-check any other app sharing the Supabase `leaderboard` table after the hardened submit rollout

## Next
- [ ] Source-control the Cloudflare Worker / CSP config used by the live deployment path
- [ ] Decide whether PostHog and Sentry are launch-critical or explicit post-launch follow-up
- [ ] Confirm website/game-hub visibility and final launch channel sequence

## Done
- [x] Phase 1 launch validation — live Edge Function health check added at `scripts/health-check.mjs` and passed against production (`issue-run-token` + `submit-score`)
- [x] Phase 1 launch validation — minimal launch smoke test added at `src/App.launch.test.jsx` and passing in the full suite
- [x] Phase 1 live QA (terminal-verifiable) — repeatable live site checks added at `scripts/live-site-check.mjs`
- [x] Phase 1 live QA (terminal-verifiable) — `npm run launch:qa` passes against the live backend and deployed site shell/PWA assets

## Deferred
- [ ] Discord invite/community link when the community entry point is ready
- [ ] Warning-debt cleanup beyond launch-critical issues
