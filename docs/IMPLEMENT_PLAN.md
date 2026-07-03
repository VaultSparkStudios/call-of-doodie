# Implement Plan - 2026-07-03 Session 119

Source: `docs/AUDIT_2026-07-03_4.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position |
|---|---|---|---|---|
| 1 | post-run-next-contracts | L2 | 45m | Highest repo-local retention improvement after external gates; turns existing debrief evidence into a measurable next-run proof condition. |
| 2 | screenshot-truth-surface-reconciliation | L1 | 15m | Removes stale Studio OS context after Session 118 already shipped the source media contract. |

## Validation Plan

Focused debrief tests first, then lint, full unit suite, launch media gate, replay gates, build, and `git diff --check` before closeout.
