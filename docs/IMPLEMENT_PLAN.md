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

---

# Implement Plan — AUDIT_2026-06-13_4 (Session 88)

Source: `docs/AUDIT_2026-06-13_4.json` · Items: 8 · Combined Priority: 319.4

Wave 1: wave-respite-breath [0.5h] → flow-state-time-dilation [1h] → boss-grudge-dialogue [1h]
Wave 2: enemy-combat-taunts [2h] → enemy-chain-fear-enrage-spawn [1h]
Wave 3: weapon-legend-milestones [2h] → run-dna-fingerprint [2h] → run-narrative-arc [3h]

---

# Implement Plan — AUDIT_2026-06-14 (Session 89)

Source: `docs/AUDIT_2026-06-14.json` · Items: 3 · Combined Priority: 97.8

## Wave Plan

1. `trace-fixture-harness` — L2 — add reusable rich/basic/weak/malformed replay trace fixtures and update focused trace tests.
2. `pressure-profile-parity` — L2 — extract advisory replay pressure math into `buildReplayPressureProfile()` and include its receipt in `runResim()`.
3. `replay-proof-receipt` — L2 — convert trace evidence into a player-facing proof receipt, attach it to submissions, and render it on DeathScreen.

## Verification

- `npx vitest run src/utils/replayCommandTrace.test.js src/utils/replayResim.test.js src/utils/runSubmission.test.js` — passed 21/21.
- `npm test` — passed 448/448.
- `npm run lint` — 0 errors; 8 existing warnings remain.
- `npm run build` — passed.

## L3 Ladder Climb

- `trace-fixture-harness` — L3 — exported `replayTraceFixtureTable()` for future browser/edge parity validation.
- `pressure-profile-parity` — L3 — added `scripts/validate-replay-trace-fixtures.mjs` to validate the fixture table against trace evidence classification and pressure profile parity.
- `replay-proof-receipt` — L3 — stores compact proof receipts in local run history, aggregates last-10 proof quality, and stamps the score share card plus DeathScreen proof receipt with the trend.

## L3 Verification

- `npx vitest run src/utils/replayCommandTrace.test.js src/utils/replayResim.test.js src/utils/runSubmission.test.js src/systems/runSession.test.js` — passed 28/28.
- `node scripts/validate-replay-trace-fixtures.mjs` — passed 4 fixtures.
- `npm test` — passed 450/450.
- `npm run lint` — 0 errors; 8 existing warnings remain.
- `npm run build` — passed.
