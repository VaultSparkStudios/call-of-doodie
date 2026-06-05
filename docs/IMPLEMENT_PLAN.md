# Implement Plan — Session 79 (2026-06-05)

Source audit: `docs/AUDIT_2026-06-05.md` · 3 items · Combined Priority 89.7

## Optimal Execution Order (Wave Plan)

| Wave | Slug | Effort | Priority | Axis | Key files |
|---|---|---|---|---|---|
| 1 | runbrain-experiment-guardrail | 30m | 32.0 | AI | runBrain.js, runBrain.test.js |
| 2 | remembered-controller-glyphs | 1h | 26.0 | UX | gamepad.js, TutorialOverlay.jsx, MenuPanels.jsx, PauseMenu.jsx, HomeV2.jsx |
| 3 | recent-killer-revenge-drill | 1h | 31.7 | gamification | menuGuidance.js, menuGuidance.test.js |

## Execution Result

- Shipped: 3
- Deferred: 0
- Blocked: 0
- Validation: focused helper tests 29/29, full `npm test` 408/408 across 46 files, `npm run lint` clean, `npm run build` passing.

---

# Previous plan (S78 — 2026-06-03)

Source audit: `docs/AUDIT_2026-06-03_2.md` · 5 items · Combined Priority 170.5

## Optimal Execution Order (Wave Plan)

| Wave | Slug | Effort | Priority | Axis | Key files |
|---|---|---|---|---|---|
| 1 | formation-flavor-wave-preview | 30m | 27.3 | gamification | waveDirector.js, drawGame.js |
| 2 | aim-flow-state-ring | 2h | 32.0 | gamification | drawGame.js |
| 3 | mutation-difficulty-compound-brief | 1h | 31.0 | AI | runBrain.js, HomeV2.jsx |
| 4 | experiment-followthrough-loop | 2h | 39.8 | AI | storage.js, runBrain.js, App.jsx, HUD.jsx, DeathScreen.jsx |
| 5 | nemesis-boss-mechanic | 2h | 40.5 | gamification | storage.js, App.jsx, drawGame.js, constants.js |

---

# Previous plan (S77 — 2026-06-03)

Source audit: `docs/AUDIT_2026-06-03.md`

## Sequenced Order

1. `pointer-sweep-evidence-report` — foundational pure aim evidence before UI status.
2. `durable-input-calibration-memory` — uses the sweep result to save and surface local calibration.
3. `controller-profile-memory` — adjacent input QA work using the same HomeV2/debug surfaces.

## Execution Result

- Shipped: 3
- Deferred: 0
- Blocked: 0
- Validation: focused input/control tests 27/27, `npm run lint` clean, `npm test` 383/383 across 46 files, `npm run build` passing.
