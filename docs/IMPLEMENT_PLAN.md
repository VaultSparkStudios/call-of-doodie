# Implement Plan — Session 91 (2026-06-14)

Source: docs/AUDIT_2026-06-14_3.json · 10 items · Combined Priority: 914.5

## Wave Plan — Optimal Efficiency Order

| Order | Slug | Effort | P/h | Surface |
|---|---|---|---|---|
| 1 | adaptive-boss-dialogue-templates | 1h | 121.5 | constants.js → bossDialogue.js (new) |
| 2 | precision-streak-audio-ladder | 1h | 93.0 | sounds.js |
| 3 | social-proof-wave-death-aggregator | 1h | 121.5 | storage.js + App.jsx |
| 4 | multi-kill-combo-fullscreen-card | 1h | 79.7 | App.jsx + drawGame.js |
| 5 | beat-precision-vulnerability-window | 2h | 60.75 | drawGame.js + App.jsx |
| 6 | run-arc-gameplay-amplification | 2h | 39.4 | App.jsx |
| 7 | enemy-proximity-cluster-spawning | 2h | 36.75 | gameHelpers.js |
| 8 | weapon-evolution-on-legend | 3h | 27.6 | storage.js + constants.js |
| 9 | deathscreen-run-dna-share-card | 3h | 22.6 | DeathScreen.jsx + shareCard.worker.js |
| 10 | weekly-world-theme-event | 4h | 18.6 | constants.js + App.jsx |

---

# Previous Plan — Session 87 Continuation (2026-06-13)

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
## 2026-06-14 Session 90 — Replay Proof Presenter Extraction

Source audit: `docs/AUDIT_2026-06-14_2.json`

### Sequenced Order

1. `deathscreen-replay-proof-presenter` — L2 — add `buildReplayProofPresenter({ traceEvidence, runHistory })`, wire DeathScreen receipt/trend/share-card stamp to the pure helper, and cover no-evidence/rich/mixed-history cases.
2. `ops-innovation-pack-command` — L3 — repair the missing local `node scripts/ops.mjs innovation-pack` path exposed by session-floor saturation, generate `docs/INNOVATION_PACK.md`, and add drift visibility.

### Execution Log

- `deathscreen-replay-proof-presenter` — shipped L3. Added `src/utils/replayProofPresenter.js`, added `src/utils/replayProofPresenter.test.js`, replaced DeathScreen's inline proof trend/share-stamp composition with the helper, and routed online/rejected/local submission feedback proof readouts through the same presenter.
- `ops-innovation-pack-command` — shipped L3. Added a repo-local innovation-pack command to `scripts/ops.mjs`, generated `docs/INNOVATION_PACK.md`, and surfaced the artifact in protocol drift checks.

### Verification

- `npx vitest run src/utils/replayProofPresenter.test.js src/utils/replayCommandTrace.test.js src/utils/runSubmission.test.js src/systems/runSession.test.js` — passed 27/27.
- `npm test` — passed 453/453 across 50 files.
- `node scripts/validate-replay-trace-fixtures.mjs` — passed 4 fixtures.
- `npm run lint` — 0 errors; 8 existing warnings remain.
- `npm run build` — passed.
- Medium gate direct CLI attempt hit the local Windows sandbox decrypt error; the game/replay quality bar is covered by the focused replay/session tests and will be covered again by full gates before closeout.
