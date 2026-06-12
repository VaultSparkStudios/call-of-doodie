# Implement Plan — Session 86 follow-on (2026-06-12)

Audit: docs/AUDIT_2026-06-12_2.md | Items: 3 | Combined Priority: 83.8

## Wave 1 — replay trust honesty

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 1 | replay-resim-honesty-receipt | 🔥 | 1h | 45.4 | Shipped: explicit pressure-estimate method/gate/confidence fields in local and Edge resim output. |
| 2 | trust-copy-honesty-pass | ⚡ | 30m | 24.4 | Shipped: deterministic resim wording replaced with pilot pressure-estimate language plus regression guard. |

## Wave 2 — death recap coaching

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 3 | ghost-death-readout | ⚡ | 1h | 35.3 | Shipped: local final-path readout under the DeathScreen ghost replay with pinned/sprinting tests. |

## Validation Plan

- Focused: `npx vitest run src/utils/replayResim.test.js src/utils/ghostPath.test.js src/utils/studioEventOps.test.js`
- Full: `npm test`
- Static: `npm run lint`
- Build: `npm run build`

All validation passed on 2026-06-12.
