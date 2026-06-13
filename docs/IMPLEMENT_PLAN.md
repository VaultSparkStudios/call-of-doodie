# Implement Plan — Session 87 Continuation (2026-06-13)

Audit: docs/AUDIT_2026-06-13_2.md | Items: 3 | Combined Priority: 83.6

## Wave 1 — Executable Studio OS Loop

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 1 | studio-loop-executable-parity | 🔥 | 2h | 31.5 | Ship L2: add public-safe local compatibility helpers for code sampling, audit sidecars, audit Markdown rendering, session-floor gating, genius-list caching, and skill-cost snapshots; route `ops.mjs genius-list` through the cache helper. |
| 2 | protocol-drift-next-command-coverage | ⚡ | 45m | 25.6 | Ship L2: extend protocol drift coverage so green status includes next-command helper presence. |

## Wave 2 — Coaching Truth

| Seq | Slug | Tier | Effort | Priority | Plan |
|---:|---|:-:|---|---:|---|
| 3 | nemesis-counter-map-completeness | ⚡ | 1h | 26.5 | Ship L2: move nemesis weapon recommendations into `waveDirector.js`, cover every guided boss type, wire `App.jsx`, and add focused tests. |

## Validation Plan

- Script smokes: `node scripts/ops.mjs genius-list`, `node scripts/sample-codebase.mjs --max-tokens 1000 --json`, `node scripts/render-audit-md.mjs --date 2026-06-13_2`, `node scripts/session-floor.mjs --shipped 3 --json`, `node scripts/record-skill-cost.mjs --skill implement --phase step --step smoke`
- Protocol: `npm run protocol:drift -- --json`
- Focused gameplay: `npx vitest run src/systems/waveDirector.test.js`
- Full gates: `npm test`, `npm run lint`, `npm run build`
# Implement Plan — 2026-06-13 continuation 3

Source: `docs/AUDIT_2026-06-13_3.json`

## Wave Plan

1. `boss-phase-two-readable-counterplay` — L2 — add tested per-boss phase-two warnings and wire them into the transition.

## Verification

- `npx vitest run src/systems/bossPhases.test.js` — passed 4/4.
