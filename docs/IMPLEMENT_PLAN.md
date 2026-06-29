# Implement Plan - Session 105

Source audit: `docs/AUDIT_2026-06-29_3.json`

## Wave Plan

1. `deterministic-replay-state-stepper` - shipped. Added `runDeterministicReplayStateStepper()` in `src/utils/replayResim.js`, movement/aim-only by design, exposed as `deterministicStepper` only when the deterministic input contract is ready. The existing replay gate remains `heuristic_pressure_estimate` / advisory.
2. `game-loop-protocol-source-bridge` - shipped. Added `context/GAME_LOOP.md` so `/game-loop-review` reads a real context source instead of failing while the public `docs/GAME_LOOP.md` exists.
3. `launch-media-verified-capture-contract` - shipped. Updated `public/manifest.json` to use verified browser-capture PNGs for combat and mobile screenshots, while keeping uncaptured boss/build/leaderboard scenes as explicit SVG fallbacks. Strengthened `scripts/validate-launch-media.mjs` so any manifest PNG screenshot must have a production-ready browser-capture asset record.

## Verification

- `npx vitest run src/utils/replayResim.test.js` - 8/8 passing.
- `npm run launch:media-check` - passing; 5 manifest screenshots checked, 2 verified captures.

## Honest Deferrals

- Supabase `sync-studio-events` live deploy remains credential-gated.
- PostHog/Sentry production analytics remain provider/GitHub-secret gated.
- Real-device PWA install and gamepad QA remain manual/device checks.
- Three launch scenes still need verified browser captures before they can replace fallback art: boss, build/debrief, and leaderboard.

## Innovation Pack Follow-through

- `validate-replay Phase 2B` - shipped a bounded second-order slice. Added `scripts/validate-replay-state-stepper-fixtures.mjs` plus `npm run replay:state-stepper` so the new deterministic movement/aim state-stepper is validated against the shared replay fixture table. This does not claim full physics parity; it establishes a reusable gate for the next combat-resimulation slice.

## Innovation Verification

- `npm run replay:state-stepper` - passing; 4 replay fixtures validated against deterministic movement/aim stepping.
