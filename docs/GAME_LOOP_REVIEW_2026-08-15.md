# Game Loop Review — Session 155

Date: 2026-08-15
Scope: repository-grounded design maturity and route selection, not participant outcome evidence

No `docs/PLAYTESTS/` corpus exists. The scores below describe the shipped loop, its structural variety, and its reusable systems. They do not claim measured fun, retention, balance, or player satisfaction.

## Axis Scores

| Axis | Score | Evidence-backed assessment |
|---|---:|---|
| Loop tightness | 9.2/10 | Guest play, fast combat, safe reward breaks, bosses, evidence-ranked defeat coaching, and immediate rematches still create an excellent action-to-revenge loop. |
| Progression curve | 9.0/10 | Weapons, perks, doctrines, mastery, missions, cosmetics, prestige, and career guidance provide broad progression without pay-to-win power; numeric tuning remains participant-evidence gated. |
| Session engagement | 7.8/10 | Eight modes, five dynamic objective families, contracts, routes, hazards, formations, mutations, and bosses add content breadth, but almost all of it returns to the same flat-arena spawn/clear/shop/boss cadence. |
| Retention hooks | 8.3/10 | Daily and weekly seeds, ghosts, rivalry, replay receipts, challenges, and revenge drills are strong. Their long-term value is unproven, and they currently ask players to repeat substantially the same run grammar. |
| SOUL fidelity | 9.7/10 | Readable chaos, humiliation-to-revenge, improvised doctrine, comedy, guest-first play, and proof-over-posture remain unusually coherent. |

Overall design-maturity score: **8.8/10**.

## Prioritized Findings

1. **P0 — Content breadth is masking structural sameness.** `MODE_CATALOG` exposes eight choices, but `App.jsx` routes them through one game loop, one flat seeded arena model, and wave-number-driven progression. Most modes change timers, spawn composition, rewards, or constraints rather than the player's verbs and spatial goals.
2. **P0 — The correct overhaul is encounter grammar, not more wave modifiers.** The repository already has enough ingredients—wave phases, five objective families, routes, bosses, arena layouts, hazards, scenario cartridges, run narrative, and replay proof—but no encounter graph that composes them into missions with distinct beginnings, reversals, and endings.
3. **P1 — A compact campaign is a strong wrapper, but a full cinematic military campaign is the wrong first bet.** Authored operations can supply pacing, characters, jokes, checkpoints, and memorable set pieces while reusing the existing combat spine. A franchise-scale linear campaign would demand large content production before proving the new structure.
4. **P1 — Social competition is ready asynchronously, not synchronously.** Ghost paths, seeded challenges, leaderboards, cartridges, and replay receipts are reusable now. Realtime Presence is only an online counter; no authoritative gameplay simulation, lobby, reconciliation, or anti-cheat netcode exists.
5. **P2 — Battle royale solves the wrong problem at the highest cost.** It would replace the game's most mature advantages with new large-map, loot, inventory, matchmaking, authoritative simulation, shrinking-zone, spectating, population, and live-operations requirements. It also needs a concurrent audience before matchmaking can be fun.

## Recommended Next Three Design Moves

1. Prototype **Operation Mode**: a 12–18 minute encounter graph with three acts, five encounter verbs, persistent map changes, one branching route, and a named finale. Keep Endless Waves as a legacy mastery mode.
2. Turn the first three Operations into a **mini-campaign season** with concise briefings, recurring comic antagonists, checkpointed mission score, and optional side contracts—story as a force multiplier for the new structure, not a separate engine.
3. Add **async Operation Rivals** immediately after the solo prototype, then gate a two-player authoritative co-op vertical slice on participant evidence that Operation Mode materially reduces repetition and earns replay intent.

## Decision

The best immediate build is the solo-first Operation Mode wave overhaul. The best product destination is a staged hybrid: **Operations core → mini-campaign → async rivals → two-player co-op**. Conventional player-versus-player and battle royale should remain rejected until the authoritative co-op foundation and a real concurrent audience both exist.
