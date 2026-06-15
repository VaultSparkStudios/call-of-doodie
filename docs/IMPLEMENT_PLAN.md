# Implement Plan — 2026-06-14_5

Source audit: `docs/AUDIT_2026-06-14_5.json`

## Wave 1

1. `mission-progress-key-truth` — L2
   - Add a pure mission progress helper that accepts either legacy index keys or mission id keys.
   - Wire HomeV2, MenuScreen, and shared MissionsPanel reads through the helper.
   - Add regression tests for index-keyed and id-keyed mission progress.

2. `death-telemetry-single-writer` — L2
   - Make `createDeathStudioEvents()` own only first-death facts.
   - Leave weekly contract progress to DeathScreen's contract-specific writer.
   - Remove DeathScreen's duplicate score-submit event writes on successful submit callback; keep the catch-path local event.
   - Update focused run session tests.

## Verification

- Focused unit tests for changed helpers/components.
- Full `npm test`.
- `npm run lint`.
- `npm run build`.
