# Implement Plan - 2026-07-06 Session 121

Source: `docs/AUDIT_2026-07-06.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position | Outcome |
|---|---|---|---|---|---|
| 1 | repo-local-doctor-route | L2 | 30m | Highest verified repo-local protocol gap: startup and closeout surfaces require `node scripts/ops.mjs doctor`, but the local router rejected the command. | Shipped |
| 2 | stale-doctor-truth-notes | L1 | 10m | Source-of-truth records still said the local doctor route was absent; leaving that contradiction would violate observability honesty. | Shipped |
| 3 | innovation-pack-external-gates | L1 | 0m | Regenerated candidates are analytics/dashboard, physical-device QA, HomeV2 production data, community/publication, or founder-decision gated; no fabricated repo work. | Deferred with evidence |
| 4 | maintain-launch-confidence | L2 | 60m | Verify the repaired protocol path and current launch baseline instead of inventing product churn. | Shipped |

## Validation Plan

1. `node scripts/ops.mjs help`
2. `node scripts/ops.mjs doctor --update-json --quiet`
3. `node scripts/ops.mjs doctor --json --quiet`
4. `node scripts/render-startup-brief.mjs`
5. `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md`
6. `npm run protocol:drift -- --json`
7. `npm run lint`
8. `npm test`
9. `npm run replay:state-stepper`
10. `npm run replay:edge-fixtures`
11. `npm run launch:media-check`
12. `npm run build`
13. `git diff --check`