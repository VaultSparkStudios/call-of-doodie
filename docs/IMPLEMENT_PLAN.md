# Implement Plan — 2026-07-01 Session 112

Source: `docs/AUDIT_2026-07-01_6.json`

## Sequenced Order

Sequenced for optimal efficiency (foundations before façades, same-surface grouping), not raw priority order.

| Seq | Slug | Rung | Effort | Why this position |
|---|---|---|---|---|
| 1 | board-truth-stale-blockers | L2 | 0.5h | Quick win; workflow_dispatch verification runs in CI while later items are coded. |
| 2 | seeded-enemy-rng | L2 | 4h | Foundation — per-wave derived RNG streams unblock both the REMATCH drill fidelity and future replay parity. |
| 3 | rematch-death-wave-drill | L2 | 2h | Depends on seq 2 per-wave streams for honest "same wave, same enemies". Leaderboard-excluded practice run. |
| 4 | replay-contact-enemy-parity-slice | L2 | 3h | Same determinism surface as seq 2; derived contact-enemy slice + fixture gate, advisory label preserved. |
| 5 | balance-lab-player-surface | L2 | 1h | Isolated HomeV2 UI change; after core determinism work settles. |
| 6 | drawgame-hot-loop-perf | L2 | 2h | Perf/organization pass after feature edits so the hot loop is touched once. |
| 7 | dead-sound-exports | L2 | 0.5h | Hygiene last; single sweep + full-suite verify. |

## Validation plan

Per item: focused vitest surface + `npm run lint`. Before closeout: full `npm test`, `npm run build`, `npm run replay:state-stepper`, `npm run replay:edge-fixtures`, launch media check.
