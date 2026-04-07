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
