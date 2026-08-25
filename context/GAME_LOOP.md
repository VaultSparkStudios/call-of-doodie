# Game Loop

Protocol-readable game-loop source for `/game-loop-review`. The public summary lives in `docs/GAME_LOOP.md`.

## Player promise

Drop into a browser arena in seconds, read the pressure, improvise a ridiculous build, and turn defeat into one evidence-ranked correction plus an immediate rematch. Guest play is the default; no power depends on payment or an account.

## Two run grammars

### Operations

- Choose one of three authored Operations and one of two disclosed routes.
- Execute BREACH → HOLD → ESCORT → HUNT → SABOTAGE → ESCAPE → BOSS.
- Reach the exact live target and perform its authored action; clearing enemies alone cannot advance the encounter.
- Carry bounded route consequences into later Operations without locking any mission.
- Finish with a local `operation-score-v2` breakdown for objectives, interactions, tempo, pressure, extraction, and route evidence.
- Continue, deterministic-rematch, compare local rival evidence, or return to the command deck.

### Arcade and rivals

- Choose a mode, difficulty, loadout, seed, and optional challenge constraints.
- Move, aim, shoot, dash, grenade, switch weapons, and survive escalating waves.
- Choose perks, routes, mutations, and free shop rewards that form named build doctrines.
- Resolve bosses, timers, or mode-specific goals while preserving replay and leaderboard eligibility labels.
- Die, read one observed verdict, run the fix, rematch, or share a bounded challenge.

## Feedback and progression

- Runtime feedback: redundant threat telegraphs, player-relative edge compass, objective state, reason-coded Mission Director guidance, performance state, and input-aware controls.
- Build feedback: prospective perk doctrine milestones, active capstones/doctrines, weapon mastery, and free reversible experimentation.
- Post-run feedback: observed run evidence is separated from coaching hypotheses; standard and Operation receipts keep separate authority.
- Meta loop: career points, achievements, daily missions, weapon mastery, Doctrine Archive, local ghosts, shared seeds, and bounded run history.

## Evidence boundaries

- Operation scores, campaign continuity, rivals, playtest receipts, and coaching are local/advisory unless explicitly labelled otherwise.
- Standard leaderboard submissions use their existing signed eligibility path; Operation score never mints that authority.
- Replay coverage remains advisory until enemy/projectile state and physics resimulation parity are proven.
- Real participant outcomes, physical-device behavior, provider delivery, and lifecycle readiness are never inferred from source or synthetic checks.

## Current evidence

- Runtime: `src/App.jsx`, `src/drawGame.js`, `src/systems/waveDirector.js`, `src/hooks/useOperationMode.js`.
- Operations: `src/systems/operationEncounterContract.js`, `operationProximity.js`, `operationScore.js`, `operationMissionSnapshot.js`, and `operationCampaign.js`.
- Build doctrine: `src/utils/buildArchetypes.js`, `src/components/PerkModal.jsx`, `src/components/PauseMenu.jsx`.
- Defeat/rematch: `src/components/DeathScreen.jsx`, `src/systems/deathFlow.js`, `src/utils/runBrain.js`, `src/utils/runDebrief.js`.
- Trust: `src/utils/replayCommandTrace.js`, `src/utils/replayResim.js`, `src/utils/studioEventOps.js`.

## Open risks

- Full deterministic replay physics parity is future work; current replay language remains advisory.
- Real-device Progressive Web App install, controller, and capture behavior remain physical checks.
- Participant fun, balance, comprehension, and retention conclusions require consented evidence.
