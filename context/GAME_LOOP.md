# Game Loop

Protocol-readable game-loop source for `/game-loop-review`. The public-facing summary also lives in `docs/GAME_LOOP.md`; this context copy keeps Studio OS review tools from treating the game as under-documented.

## Core Loop

- Player action: move, shoot, dash, grenade, weapon-switch, and choose perks or shop rewards.
- System response: enemies spawn, pressure escalates, bosses rotate, pickups and shop choices alter survival strategy.
- Reward: bigger scores, deeper builds, challenge completion, leaderboard placement, funny emergent moments, and replay-proof receipts.
- Repeat hook: starter loadouts, cursed perks, daily seeds, challenge links, rivalry ghosts, and post-run coaching make each run worth another try.

## Session Rhythm

- Start run from the HomeV2 deploy surface.
- Survive escalating waves with readable telegraphs and route/shop/perk breaks.
- Hit perk thresholds and bank choices during unsafe combat.
- Clear non-boss waves, choose free shop rewards, and adapt to dynamic objectives.
- Beat boss waves and phase-two counters every fifth wave or through boss-rush pressure.
- Die, review tactical debrief/coaching, compare replay proof, and restart or share a challenge seed.

## Meta Loop

- Unlock and spend career points.
- Experiment with starter loadouts, build archetypes, and weekly gauntlet themes.
- Pursue achievements, daily missions, weapon mastery, and proof-quality improvement.
- Share challenge links and scorecards to create rivalry loops.

## Current Evidence

- Runtime loop: `src/App.jsx`, `src/systems/waveDirector.js`, `src/systems/progressionFlow.js`, `src/systems/combatResolution.js`.
- Post-run loop: `src/components/DeathScreen.jsx`, `src/systems/deathFlow.js`, `src/utils/runBrain.js`, `src/utils/runDebrief.js`.
- Trust loop: `src/utils/replayCommandTrace.js`, `src/utils/replayResim.js`, `src/utils/studioEventOps.js`.
- Launch checks: `npm test`, `npm run launch:media-check`, `npm run replay:edge-fixtures`, `npm run live:site-check`.

## Open Risks

- Full deterministic replay resimulation is still future work; current code must keep labeling the replay gate as advisory until physics parity exists.
- Real-device PWA install and controller QA remain manual/device checks.
- Launch screenshot truth is covered by five verified browser captures and `npm run launch:media-check`; keep physical-device QA separate from media provenance.
