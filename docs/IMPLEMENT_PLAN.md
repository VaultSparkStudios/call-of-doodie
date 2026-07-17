# Implement Plan — 2026-07-16 Session 124

Source: `docs/AUDIT_2026-07-16_3.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position | Outcome |
|---|---|---|---|---|---|
| 1 | canonical-sil-history-truth | L3 | 2.5h | Repair the session's source-of-truth parser before relying on derived briefs or forecasts. | In progress |
| 2 | evidence-backed-aim-calibration | L3 | 3h | Close the fabricated launch receipt with an isolated pure capture contract and UI wiring. | Queued |
| 3 | zero-garbage-frame-index | L3 | 3h | Land the reusable simulation helpers before adding another live-run contract. | Queued |
| 4 | supporter-proof-not-self-attestation | L3 | 2.5h | Correct identity copy and verification without coupling it to gameplay work. | Queued |
| 5 | next-run-drill-mastery-loop | L3 | 4h | Build the largest cross-surface feedback loop after its runtime and truth foundations are stable. | Queued |

## Per-item Gate

1. Implement the L3 recipe with no partial/UI-only claim.
2. Run the focused test surface and direct behavior check.
3. Run `node scripts/lib/medium-quality-gates.mjs --medium game` where supported, otherwise verify the profile success bar explicitly.
4. Record the execution result in the audit sidecar only after verification.
5. Run `node scripts/session-floor.mjs --shipped <N>` and continue while it returns `CONTINUE`.

## Validation Plan

1. Focused audit-item suites and source validators.
2. `npm run lint`
3. `npm test`
4. `npm run public:contract`
5. `npm run protocol:drift`
6. `npm run security:release:audit`
7. `npm run replay:state-stepper`
8. `npm run replay:edge-fixtures`
9. `npm run launch:media-check`
10. `npm run launch:qa`
11. `npm run build`
12. `node scripts/ops.mjs doctor --json --quiet`
13. `git diff --check`
