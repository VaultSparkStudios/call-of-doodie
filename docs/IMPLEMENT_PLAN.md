# Implementation Plan — Session 109

Source audit: `docs/AUDIT_2026-07-01_3.json` / `.md`

## Sequenced Order

1. `input-qa-receipt-surface` — shipped. Added `buildInputQaReceipt()` in `src/utils/inputCalibration.js`, wired HomeV2's visible input chip to the deterministic receipt, and covered ready/partial/missing states plus component rendering.
2. `launch-confidence-verification` — shipped. Synced `main`, wrote session lock, ran context-meter, secrets audit, blocker preflight, genius-list cache check, and verified the primary list only contained launch-confidence preservation.
3. `honest-replay-and-media-deferrals` — recorded as honest deferral. Replay enemy/physics parity and full five-scene screenshot replacement remain real but evidence-gated; no replay trust labels or launch media provenance were changed without the required inputs.

## Validation

- `npx vitest run src/utils/inputCalibration.test.js src/components/HomeV2.test.jsx` — 15/15 passing.

## Remaining Evidence-Gated Items

- Full deterministic enemy/physics resimulation requires stored trace payload design and narrowed enemy archetype parity before any product or Edge gate claims it.
- Full five-scene screenshot replacement requires verified browser captures for boss, build/debrief, and leaderboard scenes.
- Physical PWA install and real gamepad/browser QA remain manual/device checks, now aided by the local input QA receipt.