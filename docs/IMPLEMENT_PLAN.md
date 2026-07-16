# Implement Plan — 2026-07-16 Session 122 Recovery

Source: docs/AUDIT_2026-07-16.json

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position | Outcome |
|---|---|---|---|---|---|
| 1 | startup-brief-truth-and-resilience | L3 | 1.5h | Restore observability truth before trusting any later protocol output. | Shipped + verified |
| 2 | audit-sampler-diversity | L3 | 2.5h | Improve live-code premise coverage before completing the remaining audit. | Shipped + verified |
| 3 | return-loop-integrity | L2 | 2h | Close permanent-progression exploits before expanding deterministic competition. | Shipped + verified |
| 4 | competitive-rng-stream-contract | L3 | 8h | Make shared seeds an end-to-end gameplay contract with serializable evidence. | Shipped + verified |
| 5 | deathscreen-run-the-fix-hierarchy | L3 | 3h | Convert rich post-run evidence into one measurable immediate correction loop. | Shipped + verified |
| 6 | public-launch-contract-surface | L3 | 6h | Complete human/agent/legal/discovery/rollback surfaces and executable checks. | Shipped + verified |

## Validation Plan

1. Focused audit-item suites and source validators.
2. npm run lint
3. npm test
4. npm run replay:state-stepper
5. npm run replay:edge-fixtures
6. npm run launch:media-check
7. npm run launch:qa
8. npm run build
9. node scripts/ops.mjs doctor --json --quiet
10. git diff --check
