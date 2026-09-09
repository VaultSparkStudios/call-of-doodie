# Game Loop Review — Session 166

Date: 2026-09-08  
Scope: live repository state at `03830d1a`; structural review only. No participant-fun, balance, retention, or physical-device claim is inferred.

| Axis | Score | Evidence-backed finding |
|---|---:|---|
| Loop tightness | 9.4/10 | The death → one verdict → run-the-fix path is unusually tight, but the new large-world capability currently changes only BOT ROYALE; ordinary wave spawns still enter on viewport bounds rather than arena bounds, so the next scaled wave mode would concentrate pressure in one quadrant. |
| Progression curve | 9.3/10 | Career, mastery, doctrines, missions, corrective-order evidence, and free reversible experimentation remain coherent. Numeric retuning stays data-blocked because no representative participant corpus exists. |
| Session engagement | 9.5/10 | Four authored modes, Operations, shared seeds, local rivals, and immediate corrective rematches create strong session texture. SEWER EXTRACTION is the clearest earned use of traversal, but it remains viewport-sized and its loot/exit objectives are absent from the whole-arena radar. |
| Retention hooks | 9.3/10 | Daily/weekly contracts, archive evidence, ghosts, duels, squads, and mastery are substantial without an engagement treadmill. Provider, mail, identity, and real cohort outcomes remain external gates rather than repository work. |
| Soul fidelity | 9.8/10 | Readable chaos, humiliation-to-revenge, improvised doctrine, comedy, and proof-over-posture all remain explicit runtime contracts. The most important next move is to make the larger sewer readable before adding more spectacle. |

Overall structural score: **9.5/10**.

## Prioritized findings

1. **Arena authority is incomplete at the spawn seam.** `App.jsx` sends `GW()/GH()` to ordinary enemy and boss spawning and clamps late-wave clusters to the viewport. BOT ROYALE hides the defect because it creates its bots itself; a second scaled wave mode would expose it immediately.
2. **SEWER EXTRACTION has the strongest traversal fantasy but no world to traverse.** Its crates, alarm, far-edge exit, and banking decision naturally fit a larger arena. Scaling it safely requires explicit density compensation and readable objective markers.
3. **The death beat still carries its full analysis payload up front.** `DeathScreen.jsx` is 1,611 lines / 96.6 KB source and its production chunk is 90.5 KB; the collapsed secondary-analysis panel should not compete with the immediate verdict/rematch controls.

## Next three design moves

1. Make enemy/boss perimeter spawning and cluster clamping arena-authoritative, with deterministic regression coverage for viewport identity and scaled arenas.
2. Turn SEWER EXTRACTION into the second scrolling mode: a 1.5× arena, area-aware wave density, and whole-arena radar markers for loot and the evac toilet.
3. Move collapsed secondary death analysis behind an on-demand chunk while leaving the one-verdict and run-the-fix controls immediate.

