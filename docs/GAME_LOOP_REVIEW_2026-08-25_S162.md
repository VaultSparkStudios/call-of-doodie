# Game Loop Review — Session 162

No consented participant corpus exists under `docs/PLAYTESTS/`. These scores describe executable design structure, not measured fun, balance, satisfaction, or retention.

| Axis | Score | Evidence-bound assessment |
|---|---:|---|
| Loop tightness | 9.2/10 | Standard and Operation runs now reach a concrete death → coaching → accepted-order → live-progress loop, but the practice HUD resets its evidence claim on every launch. |
| Progression curve | 8.9/10 | Perk doctrines, mastery, missions, and campaign routes are deep; corrective practice has repeatability evidence but does not yet carry that progression truth through the run. |
| Session engagement | 8.9/10 | The player can immediately run a same-seed correction and see baseline progress; the HUD's fixed `0/2` label weakens the revenge payoff on later attempts. |
| Retention hooks | 8.7/10 | Drill outcomes are persisted and locally mirrored, but ordinary players cannot revisit the accumulated evidence outside the current death screen. |
| Soul fidelity | 9.4/10 | The observed-outcome-only contract strongly honors proof over posture; a reset-only mastery badge contradicts that otherwise careful truth boundary. |

Overall structural score: **9.0/10**.

## Prioritized findings

1. **The practice HUD reports a reset, not the saved evidence.** `App.jsx` initializes `practiceMastery` to one attempt and zero wins for every rematch, even though `run_drill_outcome` receipts are already stored and deduplicated.
2. **Saved corrective-order evidence disappears after the death screen.** Run History receives the Studio-event ledger but exposes drill outcomes only indirectly through operator-only telemetry.
3. **The loop source understates the repeatability contract.** Both Game Loop files describe the drill/rematch path without naming the local multi-attempt evidence ledger or its non-causal ceiling.

## Next three design moves

1. Derive the active run's practice evidence from persisted, drill-specific receipts and render the same honest label on desktop and mobile HUDs.
2. Aggregate recent drill receipts into a bounded player-facing Order Evidence section in Run History, including the latest observed delta and repeatability state.
3. Synchronize the protocol and public Game Loop sources around the persisted evidence path and its explicit local/advisory boundary.
