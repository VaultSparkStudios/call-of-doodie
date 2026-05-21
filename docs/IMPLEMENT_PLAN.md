# Implement Plan — 2026-05-21 Session 72

Source audit: `docs/AUDIT_2026-05-21_3.md`

## Sequenced Order

1. `replay-trace-evidence-summary`
   - Build the pure trace-analysis vocabulary first so later work can depend on one local definition of weak/rich evidence.

2. `replay-input-signal-coverage`
   - Wire low-rate movement and aim samples into the existing command-trace recorder without expanding the trace cap.

3. `validate-replay-trace-quality-gate`
   - Mirror the evidence-quality threshold at the edge so `trace_contract` confidence means the trace is useful, not merely well-formed.

## Validation Plan

- `npx vitest run src/utils/replayCommandTrace.test.js src/utils/runSubmission.test.js`
- `npm run lint`
- `npm run build`
- `npm test`
