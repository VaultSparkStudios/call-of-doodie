# Implement Plan — 2026-06-18 Visual Asset Pipeline

Source audit: `docs/AUDIT_2026-06-18.json`

## Sequence

1. `visual-asset-provenance-pipeline`
   - Add proprietary per-game visual asset library contract.
   - Add manifest and validator.
   - Verify with `npm run assets:check`.

2. `pseudo-3d-runtime-asset-primitives`
   - Extract reusable pseudo-3D canvas primitives.
   - Wire player/enemy material rendering through the helper.
   - Verify with focused tests, full tests, build, and e2e canvas smoke.

3. `launch-media-asset-gate`
   - Add manifest/launch screenshot parity gate.
   - Verify with `npm run launch:media-check`.

## Verification

- `npm run assets:check`
- `npm run launch:media-check`
- `npx vitest run src/utils/visualPrimitives.test.js`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run protocol:drift -- --json`
- `npm run test:e2e`
