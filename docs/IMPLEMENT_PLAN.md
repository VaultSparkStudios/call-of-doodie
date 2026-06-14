# Implement Plan — 2026-06-14_4

Source: `docs/AUDIT_2026-06-14_4.json`

## Wave Plan

1. `run-dna-share-payload-truth` — extract a pure Run DNA share-card payload helper, wire DeathScreen to it, and propagate replay proof tier into the worker card.
2. `weekly-contract-progress-event` — add a weekly contract progress payload helper and persist `weekly_contract_progress` from the DeathScreen debrief path.
3. `replay-pressure-fixture-contract` — pin replay pressure fixture expectations and enforce them in the validator/test suite.

## Verification

- Focused utility tests for share payloads, social retention, and replay resim fixtures.
- `node scripts/validate-replay-trace-fixtures.mjs`
- Full `npm test`
- `npm run lint`
- `npm run build`
