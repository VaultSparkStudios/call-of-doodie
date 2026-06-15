# Implement Plan — 2026-06-15

Source: `docs/AUDIT_2026-06-15.json`

## Wave Plan

1. `startup-brief-canonical-boxes` — fix `scripts/render-startup-brief.mjs` so `/start` always emits canonical `GENIUS HIT LIST` and `HUMAN PRESSURE` boxes.
2. `startup-brief-regression-harness` — add focused regression coverage for plain genius-list output and the no-pressure empty state.

## Verification

- `npx vitest run tests/startup-brief-boxes.test.js`
- `node scripts/render-startup-brief.mjs`
- `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md`
- `npm test`
- `npm run lint`
- `npm run build`
