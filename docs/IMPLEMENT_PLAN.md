# Implement Plan — Session 104

Source audit: `docs/AUDIT_2026-06-29_2.json`

## Wave Plan

1. `death-coach-telemetry-truth` — shipped. Extract visible DeathScreen coaching telemetry into `buildDeathCoachTelemetry()` so weapon mismatch, precision, enemy lab, cross-run pattern, and choke-point coaching are measured from one tested system contract.
2. `score-submit-analytics-extraction` — shipped. Extract score-submit analytics payload shaping into `buildScoreSubmitAnalyticsPayload()` so rejection, digest, and trace-evidence fields are testable outside React/Supabase side effects.
3. `manual-launch-screenshot-replacement` — deferred honestly. Still valid, but requires verified browser scene capture and `launch:media-check`; no metadata/report refresh was used as a substitute.

## Verification

- `npx vitest run src/systems/deathFlow.test.js src/systems/runSession.test.js` — 9/9 passing.
- `node --check src/systems/deathFlow.js` — passing.
- `node --check src/systems/runSession.js` — passing.
- `npm run lint` — passing.

## Credential/Manual Deferrals

- `sync-studio-events-live-deploy` remains Supabase-token gated.
- PostHog/Sentry production analytics remain provider/GitHub-secret gated.

4. `deterministic-resim-contract-readiness` — shipped from the innovation pack. Added a tested `buildDeterministicResimInputContract()` and exposed `deterministicContract` from `runResim` while preserving the honest `heuristic_pressure_estimate` method. Verification: `npx vitest run src/utils/replayResim.test.js` — 6/6 passing.

5. `studio-event-coaching-normalizer` — shipped as compound refinement. Local `debrief_intelligence` Studio events now retain coaching flags, weapon mismatch copy, and choke-warning evidence instead of compacting them away. Verification: `npx vitest run src/utils/runIntelligence.test.js` included in focused affected test pass.
