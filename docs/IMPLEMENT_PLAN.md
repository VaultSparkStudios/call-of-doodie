# Implement Plan - 2026-07-03 Session 120

Source: `docs/AUDIT_2026-07-03_5.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position | Outcome |
|---|---|---|---|---|---|
| 1 | restore-initiation-prompt-surface | L2 | 30m | Highest verified repo-local gate: `prompts/start.md` referenced a missing `prompts/initiate.md`, producing a STRONG CANON-003 conformance gap. | Shipped |
| 2 | protocol-drift-initiation-guard | L2 | 15m | Second-order guard so the restored prompt cannot disappear without the local protocol drift check failing. | Shipped |
| 3 | external-launch-gates-honest-deferral | L1 | 0m | Analytics/dashboard, physical PWA/gamepad QA, HomeV2 production data, community/publication, and founder approval remain non-code gates. | Deferred with evidence |

## Validation Plan

1. `node scripts/protocol-drift-check.mjs --json`
2. `node ../vaultspark-studio-ops/scripts/check-canon-conformance.mjs --project . --offline`
3. `node scripts/check-secrets.mjs --for analytics`
4. `npm run lint`
5. `npm test`
6. `npm run replay:state-stepper`
7. `npm run replay:edge-fixtures`
8. `npm run launch:media-check`
9. `npm run build`
10. `git diff --check`
