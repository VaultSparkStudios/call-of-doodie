# Implement Plan — 2026-07-03 Session 116

Source: `docs/AUDIT_2026-07-03.json`

## Sequenced Order

| Seq | Slug | Rung | Effort | Why this position |
|---|---|---|---|---|
| 1 | legacy-menu-shared-panel-routing | L2 | 1h | Highest repo-executable item from the current list; reduces duplicated legacy front-door panel behavior without retiring the v1 fallback before production evidence exists. |

## Validation Plan

Focused first: `npx vitest run src/components/MenuScreen.test.jsx` and touched-file ESLint. Before closeout: full `npm run lint`, `npm test`, `npm run build`, `npm run replay:state-stepper`, `npm run replay:edge-fixtures`, and `npm run launch:media-check`.