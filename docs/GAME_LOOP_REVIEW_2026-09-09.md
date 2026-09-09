# Game Loop Review — Session 167

Date: 2026-09-09  
Scope: live repository state at `7d099ca2`; structural review only. No participant-fun, balance, retention, or physical-device claim is inferred.

| Axis | Score | Evidence-backed finding |
|---|---:|---|
| Loop tightness | 9.4/10 | Death → one verdict → run-the-fix remains tight and the deferred analysis panel keeps the beat light. The wave-start seam still hands modes viewport bounds, so SEWER EXTRACTION's per-wave crates cluster in the top-left window of the 1.5× arena after wave 1. |
| Progression curve | 9.3/10 | Career, mastery, doctrines, missions, and corrective-order evidence are coherent. Numeric retuning stays data-blocked. |
| Session engagement | 9.5/10 | Two scrolled modes now exist, but every centre-screen announcement (level-ups, DOCTRINE READY, objective ACTIVE, royale flood phases) is written in arena coordinates and is off-screen whenever the camera has moved. |
| Retention hooks | 9.0/10 | MOST WANTED killed-by counts, adaptive telegraphing, Run Coach "what killed you", nemesis boss tracking, and ghost killedByType all depend on a killer attribution that has never resolved: `_lastDamageBy` is never written and the nearest-enemy fallback reads a `.type` field enemies do not carry. The revenge loop's memory has been empty in production. |
| Soul fidelity | 9.5/10 | Readable chaos and proof-over-posture are the two pillars under pressure: announcements leave the screen, and the death verdict cannot name its killer. Comedy and improvised doctrine remain intact. The mode-specific stake (loot lost, thrones held, bosses down) is dropped from the death screen. |

Overall structural score: **9.3/10**.

## Prioritized findings

1. **Killer attribution is dead code.** `handlePlayerDeath` reads `gs._lastDamageBy` (never assigned) then `best.type` (enemies carry `typeIndex`). Every downstream memory of "what killed you" is empty. BOT ROYALE flood damage also bypasses the observed damage sequence.
2. **The death screen drops the mode's stake.** Only a label (and a royale placement) survives; extraction loot, thrones, and gauntlet progress vanish at the moment they should become the lesson.
3. **Announcements are world objects.** Twenty-eight `GW()/2, GH()/2` call sites plus the royale drop/flood callouts are invisible under a scrolled camera.
4. **Wave-start mode context is the viewport.** `onModeWaveStart` receives `GW()/GH()` while `createModeState`/`stepMode` receive the arena.

## Next three design moves

1. A pure death-attribution resolver over the observed damage sequence with a typeIndex fallback, routed through every death consumer; flood damage becomes an observed hazard.
2. Per-mode pure outcome receipts rendered on the death and victory screens.
3. Screen-anchored floating text for announcements, with modes announcing through the context instead of arena coordinates; arena-authoritative wave-start context.
