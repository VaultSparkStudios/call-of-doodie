# Implement Plan — 2026-07-03 Session 117

Source: `docs/AUDIT_2026-07-03_2.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position |
|---|---|---|---|---|
| 1 | mid-run-wave-challenge-contracts | L2 | 1.5h | Highest repo-executable item from the current genius list; adds replay-safe engagement without touching credential, dashboard, device, or production-data gates. |

## Validation Plan

Focused first: `npx vitest run src\systems\objectiveDirector.test.js` and touched-file ESLint. Before closeout: full `npm run lint`, `npm test`, `npm run replay:state-stepper`, `npm run replay:edge-fixtures`, `npm run launch:media-check`, `npm run build`, and `git diff --check`.
